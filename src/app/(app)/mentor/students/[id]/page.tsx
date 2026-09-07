import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/roles";
import StudentDetailView from "@/components/views/StudentDetailView";
import type {
  StudentLectureRow,
  StudentSubmissionRow,
} from "@/components/views/types";
import type { Assignment, Submission } from "@/lib/types";

/** PostgREST types a many-to-one embed as an array; unwrap it either way. */
function lessonTitle(rel: unknown): string {
  const row = Array.isArray(rel) ? rel[0] : rel;
  return (row as { title?: string } | null)?.title ?? "Lecture";
}

export default async function StudentDetailPage({
  params,
}: PageProps<"/mentor/students/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!canManage(me?.role)) redirect("/");

  const { data: student } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("id", id)
    .maybeSingle();
  if (!student) notFound();

  const [{ data: progressRows }, { data: submissionRows }, { data: assignmentRows }] =
    await Promise.all([
      supabase
        .from("lesson_progress")
        .select("lesson_id, percent_watched, completed_at, lessons(title)")
        .eq("user_id", id),
      supabase.from("submissions").select("*").eq("user_id", id),
      supabase.from("assignments").select("*"),
    ]);

  const assignments = new Map(
    ((assignmentRows ?? []) as Assignment[]).map((a) => [a.id, a]),
  );

  const lectures: StudentLectureRow[] = (progressRows ?? []).map((p) => ({
    lessonId: p.lesson_id as string,
    title: lessonTitle(p.lessons),
    percent: Number(p.percent_watched),
    completed: Boolean(p.completed_at),
  }));

  // Sign every uploaded chart so the mentor can actually see them.
  const submissions: StudentSubmissionRow[] = await Promise.all(
    ((submissionRows ?? []) as Submission[]).map(async (s) => {
      const urls = await Promise.all(
        s.screenshot_paths.map(async (p) => {
          const { data } = await supabase.storage
            .from("submissions")
            .createSignedUrl(p, 3600);
          return data?.signedUrl ?? "";
        }),
      );
      const a = assignments.get(s.assignment_id);
      return {
        id: s.id,
        assignmentTitle: a?.title ?? "Assignment",
        kind: a?.kind ?? "journal",
        submittedAt: s.submitted_at,
        journalText: s.journal_text,
        quizScore: s.quiz_score,
        quizTotal: s.quiz_total,
        isChecked: s.is_checked,
        mentorFeedback: s.mentor_feedback,
        screenshotUrls: urls.filter(Boolean),
      };
    }),
  );

  return (
    <StudentDetailView
      name={student.full_name ?? student.username ?? "Unnamed"}
      lectures={lectures}
      submissions={submissions}
    />
  );
}
