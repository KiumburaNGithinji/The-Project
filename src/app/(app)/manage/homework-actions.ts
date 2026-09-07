"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/roles";
import { planMove, type SwapPlan } from "@/lib/reorder";
import type { AssignmentKind } from "@/lib/types";

type Result = { ok?: true; error?: string };

const KINDS: AssignmentKind[] = ["screenshot", "journal", "quiz", "checkbox"];

async function requireMentor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canManage(profile?.role))
    return { error: "Mentors and engineers only." as const };
  return { supabase };
}

function done(): Result {
  revalidatePath("/", "layout");
  return { ok: true };
}

type Client = NonNullable<Awaited<ReturnType<typeof requireMentor>>["supabase"]>;

async function applyPlan(
  supabase: Client,
  table: "assignments" | "quiz_questions",
  plan: SwapPlan,
): Promise<Result> {
  if (plan.kind === "none") return { ok: true };

  const rows = plan.kind === "swap" ? [plan.a, plan.b] : plan.rows;
  const results = await Promise.all(
    rows.map((r) =>
      supabase.from(table).update({ position: r.position }).eq("id", r.id),
    ),
  );

  const err = results.find((r) => r.error)?.error;
  return err ? { error: err.message } : done();
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function addAssignment(
  lessonId: string,
  kind: AssignmentKind,
  title: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Give the homework a title." };
  if (!KINDS.includes(kind)) return { error: "Unknown homework type." };

  const supabase = gate.supabase!;

  // course_id is denormalised onto assignments, so resolve it via the lecture.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, modules(course_id)")
    .eq("id", lessonId)
    .maybeSingle();

  const rel = (lesson as { modules?: unknown } | null)?.modules;
  const courseId = (
    Array.isArray(rel) ? rel[0] : rel
  ) as { course_id?: string } | undefined;

  if (!courseId?.course_id) return { error: "Lecture not found." };

  const { data: last } = await supabase
    .from("assignments")
    .select("position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("assignments").insert({
    course_id: courseId.course_id,
    lesson_id: lessonId,
    kind,
    title: title.trim(),
    position: (last?.position ?? 0) + 1,
    // A quiz with no threshold counts as complete on any score.
    pass_score: kind === "quiz" ? 70 : null,
  });

  return error ? { error: error.message } : done();
}

export async function updateAssignment(
  assignmentId: string,
  patch: {
    title?: string;
    instructions?: string | null;
    dueAt?: string | null;
    passScore?: number | null;
  },
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const fields: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    if (!patch.title.trim()) return { error: "Title can't be empty." };
    fields.title = patch.title.trim();
  }

  if (patch.instructions !== undefined) {
    fields.instructions = patch.instructions?.trim() || null;
  }

  if (patch.dueAt !== undefined) {
    if (patch.dueAt) {
      const when = new Date(patch.dueAt);
      if (Number.isNaN(when.getTime())) return { error: "That date isn't valid." };
      fields.due_at = when.toISOString();
    } else {
      fields.due_at = null;
    }
  }

  if (patch.passScore !== undefined) {
    if (patch.passScore === null) {
      fields.pass_score = null;
    } else if (
      Number.isNaN(patch.passScore) ||
      patch.passScore < 0 ||
      patch.passScore > 100
    ) {
      return { error: "Pass mark must be between 0 and 100." };
    } else {
      fields.pass_score = patch.passScore;
    }
  }

  if (Object.keys(fields).length === 0) return { ok: true };

  const { error } = await gate
    .supabase!.from("assignments")
    .update(fields)
    .eq("id", assignmentId);

  return error ? { error: error.message } : done();
}

export async function deleteAssignment(assignmentId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const { error } = await gate
    .supabase!.from("assignments")
    .delete()
    .eq("id", assignmentId);

  return error ? { error: error.message } : done();
}

export async function moveAssignment(
  assignmentId: string,
  direction: "up" | "down",
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: self } = await supabase
    .from("assignments")
    .select("lesson_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!self?.lesson_id) return { error: "Not found." };

  const { data: siblings } = await supabase
    .from("assignments")
    .select("id, position")
    .eq("lesson_id", self.lesson_id);

  return applyPlan(
    supabase,
    "assignments",
    planMove(siblings ?? [], assignmentId, direction),
  );
}

// ---------------------------------------------------------------------------
// Quiz questions
// ---------------------------------------------------------------------------

export async function addQuestion(assignmentId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: last } = await supabase
    .from("quiz_questions")
    .select("position")
    .eq("assignment_id", assignmentId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("quiz_questions").insert({
    assignment_id: assignmentId,
    prompt: "New question",
    options: ["", ""],
    correct_index: 0,
    position: (last?.position ?? 0) + 1,
  });

  return error ? { error: error.message } : done();
}

export async function updateQuestion(
  questionId: string,
  patch: {
    prompt?: string;
    options?: string[];
    correctIndex?: number;
    explanation?: string | null;
  },
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const fields: Record<string, unknown> = {};

  if (patch.prompt !== undefined) {
    if (!patch.prompt.trim()) return { error: "The question can't be empty." };
    fields.prompt = patch.prompt.trim();
  }

  if (patch.options !== undefined) {
    const cleaned = patch.options.map((o) => o.trim());
    if (cleaned.length < 2) return { error: "A question needs at least two answers." };
    if (cleaned.some((o) => !o)) return { error: "Every answer needs text." };
    fields.options = cleaned;
  }

  if (patch.explanation !== undefined) {
    fields.explanation = patch.explanation?.trim() || null;
  }

  if (patch.correctIndex !== undefined) {
    // Validate against whatever the option list will be after this update,
    // so a shrink and a correct-answer change can't leave a dangling index.
    const options =
      (fields.options as string[] | undefined) ??
      (
        await gate
          .supabase!.from("quiz_questions")
          .select("options")
          .eq("id", questionId)
          .maybeSingle()
      ).data?.options ??
      [];

    if (patch.correctIndex < 0 || patch.correctIndex >= (options as string[]).length) {
      return { error: "Pick which answer is correct." };
    }
    fields.correct_index = patch.correctIndex;
  }

  if (Object.keys(fields).length === 0) return { ok: true };

  const { error } = await gate
    .supabase!.from("quiz_questions")
    .update(fields)
    .eq("id", questionId);

  return error ? { error: error.message } : done();
}

export async function deleteQuestion(questionId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const { error } = await gate
    .supabase!.from("quiz_questions")
    .delete()
    .eq("id", questionId);

  return error ? { error: error.message } : done();
}

export async function moveQuestion(
  questionId: string,
  direction: "up" | "down",
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: self } = await supabase
    .from("quiz_questions")
    .select("assignment_id")
    .eq("id", questionId)
    .maybeSingle();

  if (!self) return { error: "Not found." };

  const { data: siblings } = await supabase
    .from("quiz_questions")
    .select("id, position")
    .eq("assignment_id", self.assignment_id);

  return applyPlan(
    supabase,
    "quiz_questions",
    planMove(siblings ?? [], questionId, direction),
  );
}
