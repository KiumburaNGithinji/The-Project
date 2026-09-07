import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MentorRosterView from "@/components/views/MentorRosterView";
import type { RosterRow } from "@/components/views/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

export default async function MentorPage() {
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
    .select("id")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();
  if (!course) redirect("/pending?reason=no_course");

  const { data } = await supabase
    .from("student_overview")
    .select("*")
    .eq("course_id", course.id);

  const students = ((data ?? []) as RosterRow[]).sort((a, b) =>
    (a.full_name ?? a.username ?? "").localeCompare(b.full_name ?? b.username ?? ""),
  );

  return <MentorRosterView students={students} />;
}
