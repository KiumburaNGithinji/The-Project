import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonPlayer from "@/components/LessonPlayer";
import Homework from "@/components/Homework";
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
      supabase
        .from("assignments")
        .select("*")
        .eq("lesson_id", id)
        .order("position"),
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

  const submissions = new Map(
    (submissionRows ?? []).map((s) => [s.assignment_id as string, s as Submission]),
  );

  // Quiz questions come back through an RPC so the answer key stays server-side.
  const quizQuestions = new Map<string, QuizQuestion[]>();
  await Promise.all(
    assignments
      .filter((a) => a.kind === "quiz")
      .map(async (a) => {
        const { data } = await supabase.rpc("get_quiz", { p_assignment_id: a.id });
        quizQuestions.set(a.id, (data ?? []) as QuizQuestion[]);
      }),
  );

  // Signed URLs for any charts already uploaded.
  const screenshotUrls = new Map<string, string[]>();
  await Promise.all(
    assignments
      .filter((a) => a.kind === "screenshot")
      .map(async (a) => {
        const paths = submissions.get(a.id)?.screenshot_paths ?? [];
        const signed = await Promise.all(
          paths.map(async (p) => {
            const { data } = await supabase.storage
              .from("submissions")
              .createSignedUrl(p, 3600);
            return data?.signedUrl ?? "";
          }),
        );
        screenshotUrls.set(a.id, signed.filter(Boolean));
      }),
  );

  const list = siblings ?? [];
  const idx = list.findIndex((l) => l.id === id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  return (
    <div>
      <Link href="/" className="text-xs text-muted hover:text-foreground">
        ← {(lesson.modules as { title: string } | null)?.title ?? "Course"}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">{lesson.title}</h1>
      {lesson.description && (
        <p className="mt-1 max-w-3xl text-sm text-muted">{lesson.description}</p>
      )}

      <div className="mt-5">
        <LessonPlayer
          lessonId={lesson.id}
          youtubeId={lesson.youtube_id}
          startAt={progress?.last_position_seconds ?? 0}
          initialPercent={Number(progress?.percent_watched ?? 0)}
          initiallyComplete={Boolean(progress?.completed_at)}
        />
      </div>

      {assignments.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Homework
          </h2>
          {assignments.map((a) => (
            <Homework
              key={a.id}
              assignment={a}
              submission={submissions.get(a.id) ?? null}
              questions={quizQuestions.get(a.id) ?? []}
              screenshotUrls={screenshotUrls.get(a.id) ?? []}
              userId={user.id}
            />
          ))}
        </div>
      )}

      <nav className="mt-10 flex items-center justify-between border-t border-border pt-4 text-sm">
        {prev ? (
          <Link href={`/lessons/${prev.id}`} className="text-muted hover:text-foreground">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/lessons/${next.id}`} className="text-muted hover:text-foreground">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
