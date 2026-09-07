"use client";

import { useState, useTransition } from "react";
import { changeRole } from "@/app/(app)/settings/actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/types";
import type { MemberRow } from "@/components/views/types";

export default function MemberRoleSelect({
  member,
  isSelf,
  demo = false,
}: {
  member: MemberRow;
  isSelf: boolean;
  demo?: boolean;
}) {
  const [role, setRole] = useState<Role>(member.role);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  function pick(next: Role) {
    const previous = role;
    setRole(next);
    setMsg(null);
    setErr(false);

    if (demo) {
      setMsg("preview — nothing saved");
      return;
    }

    start(async () => {
      const res = await changeRole(member.id, next);
      if (res.error) {
        setRole(previous);
        setErr(true);
        setMsg(res.error);
        return;
      }
      setMsg(`now ${ROLE_LABELS[next].toLowerCase()}`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={role}
        disabled={isSelf || pending}
        onChange={(e) => pick(e.target.value as Role)}
        title={isSelf ? "You cannot change your own role." : undefined}
        className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-foreground transition hover:border-border-strong disabled:opacity-40"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {msg && (
        <span className={`text-xs ${err ? "text-danger" : "text-muted-dim"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
