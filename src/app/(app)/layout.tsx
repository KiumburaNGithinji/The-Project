import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { canManage } from "@/lib/roles";
import type { Role } from "@/lib/types";
import SignOutButton from "@/components/SignOutButton";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: course }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("id, modules(id, title, position, parent_id, lessons(id))")
      .eq("slug", COURSE_SLUG)
      .maybeSingle(),
  ]);

  type RawNav = {
    id: string;
    title: string;
    position: number;
    parent_id: string | null;
    lessons: { id: string }[];
  };

  const raw = ((course?.modules ?? []) as RawNav[]).sort(
    (a, b) => a.position - b.position,
  );

  const modules = raw
    .filter((m) => !m.parent_id)
    .map((section) => {
      const children = raw
        .filter((c) => c.parent_id === section.id)
        .map((c) => ({ id: c.id, title: c.title, count: (c.lessons ?? []).length }));
      return {
        id: section.id,
        title: section.title,
        // Section count includes its topics, so the sidebar totals add up.
        count:
          (section.lessons ?? []).length +
          children.reduce((n, c) => n + c.count, 0),
        children,
      };
    });

  return (
    <AppShell
      isStaff={canManage(profile?.role)}
      role={profile?.role as Role | undefined}
      displayName={profile?.full_name ?? profile?.username ?? "student"}
      modules={modules}
      right={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
