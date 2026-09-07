import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseView from "@/components/views/CourseView";
import type { CourseLessonRow, CourseModuleRow } from "@/components/views/types";
import type { Lesson, LessonProgress } from "@/lib/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type PathRow = {
  lesson_id: string;
  state: "done" | "current" | "locked";
  homework_total: number;
  homework_approved: number;
  homework_pending: number;
  homework_returned: number;
  due_at: string | null;
  overdue: boolean;
};

type RawModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  parent_id: string | null;
  lessons: (Lesson & { thumbnail_path: string | null })[];
};

export default async function CoursePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, description, modules(id, title, description, position, parent_id, lessons(*))",
    )
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (!course) redirect("/pending?reason=no_course");

  const [{ data: progressRows }, { data: pathRows }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("lesson_id, last_position_seconds, percent_watched, completed_at")
      .eq("user_id", user.id),
    // The gate is resolved in Postgres, not here — the same function the
    // lesson page and the progress endpoint ask before letting anyone in.
    supabase.rpc("course_path", { p_course_id: course.id }),
  ]);

  const progress = new Map<string, LessonProgress>(
    (progressRows ?? []).map((p) => [p.lesson_id, p as LessonProgress]),
  );

  const gate = new Map<string, PathRow>(
    ((pathRows ?? []) as PathRow[]).map((r) => [r.lesson_id, r]),
  );

  const raw = ((course.modules ?? []) as RawModule[]).sort(
    (a, b) => a.position - b.position,
  );

  const publishedOf = (m: RawModule) =>
    [...(m.lessons ?? [])]
      .filter((l) => l.is_published)
      .sort((a, b) => a.position - b.position);

  const sections = raw.filter((m) => !m.parent_id);
  const childrenOf = (id: string) => raw.filter((m) => m.parent_id === id);

  // Cards are numbered across the whole course: a section's own lectures, then
  // its topics' lectures, then on to the next section.
  const order: string[] = sections.flatMap((s) => [
    ...publishedOf(s).map((l) => l.id),
    ...childrenOf(s.id).flatMap((t) => publishedOf(t).map((l) => l.id)),
  ]);
  const ordinalOf = new Map(order.map((id, i) => [id, i + 1]));

  const toRow = (l: RawModule["lessons"][number]): CourseLessonRow => {
    const g = gate.get(l.id);
    return {
      id: l.id,
      title: l.title,
      youtubeId: l.youtube_id,
      thumbnailPath: l.thumbnail_path,
      ordinal: ordinalOf.get(l.id) ?? 0,
      durationSeconds: l.duration_seconds,
      percent: Number(progress.get(l.id)?.percent_watched ?? 0),
      completed: Boolean(progress.get(l.id)?.completed_at),
      homeworkTotal: g?.homework_total ?? 0,
      homeworkDone: g?.homework_approved ?? 0,
      state: g?.state ?? "locked",
      homeworkPending: g?.homework_pending ?? 0,
      homeworkReturned: g?.homework_returned ?? 0,
      dueAt: g?.due_at ?? null,
      overdue: Boolean(g?.overdue),
    };
  };

  const modules: CourseModuleRow[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    lessons: publishedOf(s).map(toRow),
    children: childrenOf(s.id).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      lessons: publishedOf(t).map(toRow),
      children: [],
    })),
  }));

  const allLessons = modules.flatMap((m) => [
    ...m.lessons,
    ...m.children.flatMap((c) => c.lessons),
  ]);

  return (
    <CourseView
      query={query}
      filter={filter}
      title={course.title}
      description={course.description}
      modules={modules}
      lecturesDone={allLessons.filter((l) => l.completed).length}
      lecturesTotal={allLessons.length}
      homeworkDone={allLessons.reduce((n, l) => n + l.homeworkDone, 0)}
      homeworkTotal={allLessons.reduce((n, l) => n + l.homeworkTotal, 0)}
    />
  );
}
