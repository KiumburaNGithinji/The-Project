import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
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
      .select("id, modules(id, title, position, lessons(id))")
      .eq("slug", COURSE_SLUG)
      .maybeSingle(),
  ]);

  type NavModule = {
    id: string;
    title: string;
    position: number;
    lessons: { id: string }[];
  };

  const modules = ((course?.modules ?? []) as NavModule[])
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ id: m.id, title: m.title, count: (m.lessons ?? []).length }));

  return (
    <AppShell
      isMentor={profile?.role === "mentor"}
      displayName={profile?.full_name ?? profile?.username ?? "student"}
      modules={modules}
      right={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
