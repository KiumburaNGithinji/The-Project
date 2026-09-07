import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/roles";
import HomeworkAdminView from "@/components/views/HomeworkAdminView";
import type { AdminAssignment, AdminQuestion } from "@/components/views/types";
import type { AssignmentKind } from "@/lib/types";

type RawQuestion = {
  id: string;
  assignment_id: string;
  prompt: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  position: number;
};

type RawAssignment = {
  id: string;
  kind: AssignmentKind;
  title: string;
  instructions: string | null;
  due_at: string | null;
  pass_score: number | null;
  position: number;
};

/** PostgREST types a many-to-one embed as an array; unwrap it either way. */
function one<T>(rel: unknown): T | null {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return (row as T | undefined) ?? null;
}

export default async function LessonHomeworkPage({
  params,
}: PageProps<"/manage/lessons/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!canManage(profile?.role)) redirect("/");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, modules(title)")
    .eq("id", id)
    .maybeSingle();

  if (!lesson) notFound();

  const { data: rawAssignments } = await supabase
    .from("assignments")
    .select("id, kind, title, instructions, due_at, pass_score, position")
    .eq("lesson_id", id)
    .order("position");

  const assignmentRows = (rawAssignments ?? []) as RawAssignment[];
  const ids = assignmentRows.map((a) => a.id);

  const [{ data: questionRows }, { data: submissionRows }] = await Promise.all([
    ids.length
      ? supabase
          .from("quiz_questions")
          .select("id, assignment_id, prompt, options, correct_index, explanation, position")
          .in("assignment_id", ids)
          .order("position")
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("submissions").select("assignment_id").in("assignment_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const questionsBy = new Map<string, AdminQuestion[]>();
  for (const q of (questionRows ?? []) as RawQuestion[]) {
    questionsBy.set(q.assignment_id, [
      ...(questionsBy.get(q.assignment_id) ?? []),
      {
        id: q.id,
        prompt: q.prompt,
        options: (q.options ?? []) as string[],
        correctIndex: q.correct_index,
        explanation: q.explanation,
      },
    ]);
  }

  const counts = new Map<string, number>();
  for (const s of (submissionRows ?? []) as { assignment_id: string }[]) {
    counts.set(s.assignment_id, (counts.get(s.assignment_id) ?? 0) + 1);
  }

  const assignments: AdminAssignment[] = assignmentRows.map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    instructions: a.instructions,
    dueAt: a.due_at,
    passScore: a.pass_score,
    questions: questionsBy.get(a.id) ?? [],
    submissionCount: counts.get(a.id) ?? 0,
  }));

  return (
    <HomeworkAdminView
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      moduleTitle={one<{ title: string }>(lesson.modules)?.title ?? "Course"}
      assignments={assignments}
    />
  );
}
