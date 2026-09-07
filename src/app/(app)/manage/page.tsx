import { redirect } from "next/navigation";
import { canManage } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import ManageView from "@/components/views/ManageView";
import type { ManageModule, MoveTarget } from "@/components/views/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type RawModule = {
  id: string;
  title: string;
  position: number;
  parent_id: string | null;
  lessons: {
    id: string;
    title: string;
    youtube_id: string;
    thumbnail_path: string | null;
    is_published: boolean;
    duration_seconds: number | null;
    position: number;
  }[];
};

function toManage(
  m: RawModule,
  children: ManageModule[],
  homework: Map<string, number>,
): ManageModule {
  return {
    id: m.id,
    title: m.title,
    children,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        title: l.title,
        youtubeId: l.youtube_id,
        thumbnailPath: l.thumbnail_path,
        isPublished: l.is_published,
        durationSeconds: l.duration_seconds,
        homeworkCount: homework.get(l.id) ?? 0,
      })),
  };
}

export default async function ManagePage() {
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

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, modules(id, title, position, parent_id, lessons(id, title, youtube_id, thumbnail_path, is_published, duration_seconds, position))",
    )
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (!course) redirect("/pending?reason=no_course");

  const raw = ((course.modules ?? []) as RawModule[]).sort(
    (a, b) => a.position - b.position,
  );

  // One row per assignment, tallied per lecture for the row badges.
  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("lesson_id")
    .eq("course_id", course.id);

  const homework = new Map<string, number>();
  for (const a of (assignmentRows ?? []) as { lesson_id: string | null }[]) {
    if (!a.lesson_id) continue;
    homework.set(a.lesson_id, (homework.get(a.lesson_id) ?? 0) + 1);
  }

  const modules: ManageModule[] = raw
    .filter((m) => !m.parent_id)
    .map((section) =>
      toManage(
        section,
        raw
          .filter((c) => c.parent_id === section.id)
          .map((c) => toManage(c, [], homework)),
        homework,
      ),
    );

  // Flat list for the "move lecture to" picker, topics indented under sections.
  const moveTargets: MoveTarget[] = modules.flatMap((section) => [
    { id: section.id, label: section.title },
    ...section.children.map((t) => ({ id: t.id, label: `  ${section.title} › ${t.title}` })),
  ]);

  return (
    <ManageView
      courseId={course.id}
      courseTitle={course.title}
      modules={modules}
      moveTargets={moveTargets}
    />
  );
}
