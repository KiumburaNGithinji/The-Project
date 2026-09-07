import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManageView from "@/components/views/ManageView";
import type { ManageModule } from "@/components/views/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type RawModule = {
  id: string;
  title: string;
  position: number;
  lessons: {
    id: string;
    title: string;
    youtube_id: string;
    is_published: boolean;
    duration_seconds: number | null;
    position: number;
  }[];
};

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
  if (profile?.role !== "mentor") redirect("/");

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, modules(id, title, position, lessons(id, title, youtube_id, is_published, duration_seconds, position))",
    )
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (!course) redirect("/pending?reason=no_course");

  const modules: ManageModule[] = ((course.modules ?? []) as RawModule[])
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      id: m.id,
      title: m.title,
      lessons: [...(m.lessons ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          title: l.title,
          youtubeId: l.youtube_id,
          isPublished: l.is_published,
          durationSeconds: l.duration_seconds,
        })),
    }));

  return (
    <ManageView
      courseId={course.id}
      courseTitle={course.title}
      modules={modules}
    />
  );
}
