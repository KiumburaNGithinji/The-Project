import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, Lesson, LessonProgress } from "@/lib/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export default async function CoursePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, modules(id, title, description, position, lessons(*))")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (!course) redirect("/pending?reason=no_course");

  const modules = ((course.modules ?? []) as ModuleRow[])
    .map((m) => ({
      ...m,
      lessons: [...(m.lessons ?? [])]
        .filter((l) => l.is_published)
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);

  const [{ data: progressRows }, { data: assignmentRows }, { data: submissionRows }] =
    await Promise.all([
      supabase
        .from("lesson_progress")
        .select("lesson_id, last_position_seconds, percent_watched, completed_at")
        .eq("user_id", user.id),
      supabase
        .from("assignments")
        .select("id, course_id, lesson_id, kind, title, instructions, position, due_at, pass_score")
        .eq("course_id", course.id),
      supabase.from("submissions").select("assignment_id, status, is_checked"),
    ]);

  const progress = new Map<string, LessonProgress>(
    (progressRows ?? []).map((p) => [p.lesson_id, p as LessonProgress]),
  );
  const assignmentsByLesson = new Map<string, Assignment[]>();
  for (const a of (assignmentRows ?? []) as Assignment[]) {
    if (!a.lesson_id) continue;
    const list = assignmentsByLesson.get(a.lesson_id) ?? [];
    list.push(a);
    assignmentsByLesson.set(a.lesson_id, list);
  }
  const doneAssignments = new Set(
    (submissionRows ?? [])
      .filter((s) => s.status !== "draft")
      .map((s) => s.assignment_id as string),
  );

  const allLessons = modules.flatMap((m) => m.lessons);
  const watched = allLessons.filter((l) => progress.get(l.id)?.completed_at).length;
  const totalAssignments = (assignmentRows ?? []).length;
  const submitted = doneAssignments.size;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          {course.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{course.description}</p>
          )}
        </div>

        <div className="flex gap-6 font-mono text-sm">
          <div>
            <div className="text-xs text-muted">lectures</div>
            <div className="text-accent">
              {watched}
              <span className="text-muted">/{allLessons.length}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">homework</div>
            <div className="text-accent">
              {submitted}
              <span className="text-muted">/{totalAssignments}</span>
            </div>
          </div>
        </div>
      </div>

      {modules.length === 0 && (
        <p className="mt-10 rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          No lectures have been added yet.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {modules.map((m) => (
          <section key={m.id}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
              {m.title}
            </h2>
            {m.description && (
              <p className="mt-1 text-sm text-muted">{m.description}</p>
            )}

            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {m.lessons.map((l) => {
                const p = progress.get(l.id);
                const pct = p?.percent_watched ?? 0;
                const done = Boolean(p?.completed_at);
                const hw = assignmentsByLesson.get(l.id) ?? [];
                const hwDone = hw.filter((a) => doneAssignments.has(a.id)).length;

                return (
                  <li key={l.id}>
                    <Link
                      href={`/lessons/${l.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] ${
                          done
                            ? "border-accent bg-accent-dim text-accent"
                            : "border-border text-muted"
                        }`}
                      >
                        {done ? "✓" : ""}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{l.title}</span>
                        <span className="mt-1 flex items-center gap-3 text-xs text-muted">
                          {formatDuration(l.duration_seconds) && (
                            <span className="font-mono">
                              {formatDuration(l.duration_seconds)}
                            </span>
                          )}
                          {hw.length > 0 && (
                            <span
                              className={hwDone === hw.length ? "text-accent" : undefined}
                            >
                              homework {hwDone}/{hw.length}
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="hidden w-32 sm:block">
                        <span className="block h-1 overflow-hidden rounded-full bg-surface-2">
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
