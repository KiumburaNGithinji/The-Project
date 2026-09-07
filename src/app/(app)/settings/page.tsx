import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/roles";
import SettingsView from "@/components/views/SettingsView";
import type { MemberRow, SettingsTab } from "@/components/views/types";
import type { Role } from "@/lib/types";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type RawProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  discord_id: string | null;
  role: Role;
  created_at: string;
};

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const sp = await searchParams;
  const tab: SettingsTab = sp.tab === "course" ? "course" : "members";

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
  if (!canManage(profile?.role as Role | undefined)) redirect("/");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, is_published")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();
  if (!course) redirect("/pending?reason=no_course");

  const [{ data: profiles }, { data: enrollments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, discord_id, role, created_at"),
    supabase
      .from("enrollments")
      .select("user_id")
      .eq("course_id", course.id)
      .eq("status", "active"),
  ]);

  const active = new Set((enrollments ?? []).map((e) => e.user_id));

  // Staff first, then alphabetical — the list exists to answer "who can touch
  // what", and that reads badly if Osman is buried among thirty students.
  const rank: Record<Role, number> = { mentor: 0, engineer: 1, student: 2 };
  const members: MemberRow[] = ((profiles ?? []) as RawProfile[])
    .map((p) => ({
      id: p.id,
      username: p.username,
      fullName: p.full_name,
      discordId: p.discord_id,
      role: p.role,
      enrolled: active.has(p.id),
      joinedAt: p.created_at,
    }))
    .sort(
      (a, b) =>
        rank[a.role] - rank[b.role] ||
        (a.fullName ?? a.username ?? "").localeCompare(
          b.fullName ?? b.username ?? "",
        ),
    );

  return (
    <SettingsView
      tab={tab}
      viewerId={user.id}
      members={members}
      course={{
        id: course.id,
        title: course.title,
        description: course.description,
        isPublished: course.is_published,
      }}
    />
  );
}
