"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuizResult } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function saveJournal(assignmentId: string, text: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: assignmentId,
      user_id: user.id,
      journal_text: text,
      status: text.trim() ? "submitted" : "draft",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCheckbox(assignmentId: string, checked: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: assignmentId,
      user_id: user.id,
      is_checked: checked,
      status: checked ? "submitted" : "draft",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function attachScreenshots(assignmentId: string, paths: string[]) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: assignmentId,
      user_id: user.id,
      screenshot_paths: paths,
      status: paths.length ? "submitted" : "draft",
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Grading happens in Postgres — the answer key never reaches the browser. */
export async function gradeQuiz(
  assignmentId: string,
  answers: Record<string, number>,
) {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("submit_quiz", {
    p_assignment_id: assignmentId,
    p_answers: answers,
  });

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, result: data as QuizResult };
}

export async function saveFeedback(submissionId: string, feedback: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("submissions")
    .update({
      mentor_feedback: feedback,
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
