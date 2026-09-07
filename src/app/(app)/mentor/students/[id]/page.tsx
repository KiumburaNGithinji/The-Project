import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackForm from "@/components/FeedbackForm";
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
  if (me?.role !== "mentor") redirect("/");

  const { data: student } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (!student) notFound();

  const [{ data: progressRows }, { data: submissionRows }, { data: assignmentRows }] =
    await Promise.all([
      supabase
        .from("lesson_progress")
        .select("lesson_id, percent_watched, completed_at, updated_at, lessons(title)")
        .eq("user_id", id),
      supabase.from("submissions").select("*").eq("user_id", id),
      supabase.from("assignments").select("*"),
    ]);

  const assignments = new Map(
    ((assignmentRows ?? []) as Assignment[]).map((a) => [a.id, a]),
  );
  const submissions = (submissionRows ?? []) as Submission[];

  // Sign every uploaded chart so the mentor can actually see them.
  const signed = new Map<string, string[]>();
  await Promise.all(
    submissions
      .filter((s) => s.screenshot_paths.length)
      .map(async (s) => {
        const urls = await Promise.all(
          s.screenshot_paths.map(async (p) => {
            const { data } = await supabase.storage
              .from("submissions")
              .createSignedUrl(p, 3600);
            return data?.signedUrl ?? "";
          }),
        );
        signed.set(s.id, urls.filter(Boolean));
      }),
  );

  return (
    <div>
      <Link href="/mentor" className="text-xs text-muted hover:text-foreground">
        ← Students
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        {student.full_name ?? student.username ?? "Unnamed"}
      </h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          Lectures watched
        </h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {(progressRows ?? []).map((p) => (
            <li
              key={p.lesson_id}
              className="flex items-center gap-4 px-4 py-2.5 text-sm"
            >
              <span className="flex-1 truncate">
                {lessonTitle(p.lessons)}
              </span>
              <span className="w-28">
                <span className="block h-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, Number(p.percent_watched))}%` }}
                  />
                </span>
              </span>
              <span className="w-20 text-right font-mono text-xs text-muted">
                {p.completed_at ? "complete" : `${Math.floor(Number(p.percent_watched))}%`}
              </span>
            </li>
          ))}
          {(progressRows ?? []).length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted">
              Hasn&apos;t started any lectures.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          Homework
        </h2>
        <div className="mt-3 space-y-3">
          {submissions.map((s) => {
            const a = assignments.get(s.assignment_id);
            const urls = signed.get(s.id) ?? [];
            return (
              <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{a?.title ?? "Assignment"}</h3>
                  <span className="font-mono text-xs text-muted">
                    {new Date(s.submitted_at).toLocaleDateString()}
                  </span>
                </div>

                {s.journal_text && (
                  <p className="mt-2 whitespace-pre-line rounded-md bg-background p-3 text-sm">
                    {s.journal_text}
                  </p>
                )}

                {s.quiz_score !== null && (
                  <p className="mt-2 font-mono text-sm text-accent">
                    {s.quiz_score}% ({s.quiz_total} questions)
                  </p>
                )}

                {a?.kind === "checkbox" && (
                  <p className="mt-2 text-sm text-muted">
                    {s.is_checked ? "Marked complete" : "Not marked"}
                  </p>
                )}

                {urls.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {urls.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer">
                        <Image
                          src={u}
                          alt="Chart"
                          width={320}
                          height={180}
                          unoptimized
                          className="h-24 w-full rounded-md border border-border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <FeedbackForm submissionId={s.id} initial={s.mentor_feedback} />
              </div>
            );
          })}
          {submissions.length === 0 && (
            <p className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              No homework submitted yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
