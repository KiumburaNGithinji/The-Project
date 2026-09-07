import Link from "next/link";
import type { MentorRosterViewProps } from "./types";

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
      <div className="h-[3px] w-24 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-progress" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-dim">
        {done}/{total}
      </span>
    </div>
  );
}

export default function MentorRosterView({
  students,
  basePath = "",
}: MentorRosterViewProps) {
  const stalledCount = students.filter((s) => isStalled(s.last_active_at)).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
      <p className="mt-1 text-sm text-muted">
        {students.length} enrolled
        {stalledCount > 0 && (
          <>
            {" · "}
            <span className="text-danger">
              {stalledCount} inactive 7+ days
            </span>
          </>
        )}
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-dim">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Lectures</th>
              <th className="px-4 py-2.5 font-medium">Homework</th>
              <th className="px-4 py-2.5 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const stalled = isStalled(s.last_active_at);
              return (
                <tr key={s.user_id} className="transition hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`${basePath}/mentor/students/${s.user_id}`}
                      className="underline decoration-transparent underline-offset-4 transition hover:decoration-border-strong"
                    >
                      {s.full_name ?? s.username ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Bar done={s.lessons_completed} total={s.lessons_total} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Bar
                      done={s.assignments_submitted}
                      total={s.assignments_total}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <span className={stalled ? "text-danger" : "text-muted-dim"}>
                      {stalled && "! "}
                      {relative(s.last_active_at)}
                    </span>
                  </td>
                </tr>
              );
            })}
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
