import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonView from "@/components/views/LessonView";
import type { Assignment, QuizQuestion, Submission } from "@/lib/types";

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, modules(id, title, course_id)")
    .eq("id", id)
    .maybeSingle();

  if (!lesson) notFound();

  const [{ data: progress }, { data: assignmentRows }, { data: siblings }] =
    await Promise.all([
      supabase
        .from("lesson_progress")
        .select("last_position_seconds, percent_watched, completed_at")
        .eq("user_id", user.id)
        .eq("lesson_id", id)
        .maybeSingle(),
      supabase.from("assignments").select("*").eq("lesson_id", id).order("position"),
      supabase
        .from("lessons")
        .select("id, title, position")
        .eq("module_id", lesson.module_id)
        .eq("is_published", true)
        .order("position"),
    ]);

  const assignments = (assignmentRows ?? []) as Assignment[];

  const { data: submissionRows } = assignments.length
    ? await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .in(
          "assignment_id",
          assignments.map((a) => a.id),
        )
    : { data: [] as Submission[] };

  const submissions: Record<string, Submission | null> = {};
  for (const s of (submissionRows ?? []) as Submission[]) {
    submissions[s.assignment_id] = s;
  }

  // Quiz questions come back through an RPC so the answer key stays server-side.
  const questions: Record<string, QuizQuestion[]> = {};
  await Promise.all(
    assignments
      .filter((a) => a.kind === "quiz")
      .map(async (a) => {
        const { data } = await supabase.rpc("get_quiz", { p_assignment_id: a.id });
        questions[a.id] = (data ?? []) as QuizQuestion[];
      }),
  );

  const screenshotUrls: Record<string, string[]> = {};
  await Promise.all(
    assignments
      .filter((a) => a.kind === "screenshot")
      .map(async (a) => {
        const paths = submissions[a.id]?.screenshot_paths ?? [];
        const signed = await Promise.all(
          paths.map(async (p) => {
            const { data } = await supabase.storage
              .from("submissions")
              .createSignedUrl(p, 3600);
            return data?.signedUrl ?? "";
          }),
        );
        screenshotUrls[a.id] = signed.filter(Boolean);
      }),
  );

  const list = siblings ?? [];
  const idx = list.findIndex((l) => l.id === id);

  return (
    <LessonView
      moduleTitle={(lesson.modules as { title: string } | null)?.title ?? "Course"}
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        youtubeId: lesson.youtube_id,
      }}
      startAt={progress?.last_position_seconds ?? 0}
      percent={Number(progress?.percent_watched ?? 0)}
      complete={Boolean(progress?.completed_at)}
      assignments={assignments}
      submissions={submissions}
      questions={questions}
      screenshotUrls={screenshotUrls}
      userId={user.id}
      prev={idx > 0 ? list[idx - 1] : null}
      next={idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null}
    />
  );
}
