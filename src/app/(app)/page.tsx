import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseView from "@/components/views/CourseView";
import type { CourseLessonRow, CourseModuleRow } from "@/components/views/types";
import type { Assignment, Lesson, LessonProgress } from "@/lib/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

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

  const [{ data: progressRows }, { data: assignmentRows }, { data: submissionRows }] =
    await Promise.all([
      supabase
        .from("lesson_progress")
        .select("lesson_id, last_position_seconds, percent_watched, completed_at")
        .eq("user_id", user.id),
      supabase.from("assignments").select("*").eq("course_id", course.id),
      supabase.from("submissions").select("assignment_id, status"),
    ]);

  const progress = new Map<string, LessonProgress>(
    (progressRows ?? []).map((p) => [p.lesson_id, p as LessonProgress]),
  );

  const assignmentsByLesson = new Map<string, Assignment[]>();
  for (const a of (assignmentRows ?? []) as Assignment[]) {
    if (!a.lesson_id) continue;
    assignmentsByLesson.set(a.lesson_id, [
      ...(assignmentsByLesson.get(a.lesson_id) ?? []),
      a,
    ]);
  }

  const doneAssignments = new Set(
    (submissionRows ?? [])
      .filter((s) => s.status !== "draft")
      .map((s) => s.assignment_id as string),
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
    const hw = assignmentsByLesson.get(l.id) ?? [];
    return {
      id: l.id,
      title: l.title,
      youtubeId: l.youtube_id,
      thumbnailPath: l.thumbnail_path,
      ordinal: ordinalOf.get(l.id) ?? 0,
      durationSeconds: l.duration_seconds,
      percent: Number(progress.get(l.id)?.percent_watched ?? 0),
      completed: Boolean(progress.get(l.id)?.completed_at),
      homeworkTotal: hw.length,
      homeworkDone: hw.filter((a) => doneAssignments.has(a.id)).length,
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
      homeworkDone={doneAssignments.size}
      homeworkTotal={(assignmentRows ?? []).length}
    />
  );
}
