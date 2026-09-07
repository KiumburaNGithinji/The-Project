import Link from "next/link";
import MemberRoleSelect from "@/components/settings/MemberRoleSelect";
import CourseForm from "@/components/settings/CourseForm";
import { ROLE_BLURBS, ROLE_LABELS, ROLES } from "@/lib/roles";
import type { SettingsViewProps } from "./types";

function joined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function SettingsView({
  basePath = "",
  demo = false,
  tab,
  viewerId,
  members,
  course,
}: SettingsViewProps) {
  const tabs = [
    { id: "members" as const, label: "Members", count: members.length },
    { id: "course" as const, label: "Course", count: null },
  ];

  const staffCount = members.filter((m) => m.role !== "student").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        {members.length} {members.length === 1 ? "member" : "members"} ·{" "}
        {staffCount} staff
      </p>

      <nav className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`${basePath}/settings?tab=${t.id}`}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span className="ml-1.5 font-mono text-[11px] text-muted-dim">
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "members" ? (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-dim">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Discord ID</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Enrolled</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => {
                  const isSelf = m.id === viewerId;
                  return (
                    <tr key={m.id} className="transition hover:bg-surface-2">
                      <td className="px-4 py-2.5">
                        {m.fullName ?? m.username ?? "Unnamed"}
                        {isSelf && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-muted-dim">
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-dim">
                        {m.discordId ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <MemberRoleSelect
                          member={m}
                          isSelf={isSelf}
                          demo={demo}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {m.enrolled ? (
                          <span className="text-muted-dim">active</span>
                        ) : (
                          <span className="text-danger">not enrolled</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-dim">
                        {joined(m.joinedAt)}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Nobody has signed in yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 space-y-1 text-xs text-muted-dim">
            {ROLES.map((r) => (
              <div key={r} className="flex gap-2">
                <dt className="w-20 shrink-0 font-medium text-muted">
                  {ROLE_LABELS[r]}
                </dt>
                <dd>{ROLE_BLURBS[r]}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-xs text-muted-dim">
            You cannot change your own role, and the last remaining mentor
            cannot be demoted — both are enforced by the database, not just
            this page.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <CourseForm course={course} demo={demo} />
        </div>
      )}
    </div>
  );
}
