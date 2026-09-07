import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

type Overview = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  lessons_total: number;
  lessons_completed: number;
  assignments_total: number;
  assignments_submitted: number;
  last_active_at: string | null;
};

function relative(iso: string | null) {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isStalled(iso: string | null) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 7 * 86_400_000;
}

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted">
        {done}/{total}
      </span>
    </div>
  );
}

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
    .select("id, title")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();
  if (!course) redirect("/pending?reason=no_course");

  const { data } = await supabase
    .from("student_overview")
    .select("*")
    .eq("course_id", course.id);

  const students = ((data ?? []) as Overview[]).sort((a, b) =>
    (a.full_name ?? a.username ?? "").localeCompare(b.full_name ?? b.username ?? ""),
  );

  const stalled = students.filter((s) => isStalled(s.last_active_at));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
      <p className="mt-1 text-sm text-muted">
        {students.length} enrolled
        {stalled.length > 0 && (
          <>
            {" · "}
            <span className="text-warn">{stalled.length} inactive 7+ days</span>
          </>
        )}
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Lectures</th>
              <th className="px-4 py-2.5 font-medium">Homework</th>
              <th className="px-4 py-2.5 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => (
              <tr key={s.user_id} className="transition hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/mentor/students/${s.user_id}`}
                    className="hover:text-accent"
                  >
                    {s.full_name ?? s.username ?? "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Bar done={s.lessons_completed} total={s.lessons_total} />
                </td>
                <td className="px-4 py-2.5">
                  <Bar done={s.assignments_submitted} total={s.assignments_total} />
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted">
                  {relative(s.last_active_at)}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Nobody has signed in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
