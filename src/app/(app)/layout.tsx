import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  const isMentor = profile?.role === "mentor";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            The Project
          </Link>

          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">
              Course
            </Link>
            {isMentor && (
              <Link href="/mentor" className="hover:text-foreground">
                Students
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {isMentor && (
              <span className="rounded-full border border-accent/30 bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent">
                mentor
              </span>
            )}
            <span className="text-sm text-muted">
              {profile?.full_name ?? profile?.username ?? "student"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
