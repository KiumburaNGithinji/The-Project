import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseView from "@/components/views/CourseView";
import type { CourseModuleRow } from "@/components/views/types";
import type { Assignment, Lesson, LessonProgress } from "@/lib/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type RawModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
};

export default async function CoursePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, description, modules(id, title, description, position, lessons(*))",
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

  const modules: CourseModuleRow[] = ((course.modules ?? []) as RawModule[])
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      lessons: [...(m.lessons ?? [])]
        .filter((l) => l.is_published)
        .sort((a, b) => a.position - b.position)
        .map((l) => {
          const hw = assignmentsByLesson.get(l.id) ?? [];
          return {
            id: l.id,
            title: l.title,
            durationSeconds: l.duration_seconds,
            percent: Number(progress.get(l.id)?.percent_watched ?? 0),
            completed: Boolean(progress.get(l.id)?.completed_at),
            homeworkTotal: hw.length,
            homeworkDone: hw.filter((a) => doneAssignments.has(a.id)).length,
          };
        }),
    }));

  const allLessons = modules.flatMap((m) => m.lessons);

  return (
    <CourseView
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
