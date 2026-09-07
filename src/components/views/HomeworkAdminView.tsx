"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import AssignmentCard from "@/components/manage/AssignmentCard";
import { addAssignment } from "@/app/(app)/manage/homework-actions";
import { shiftById } from "@/lib/reorder";
import type { HomeworkAdminViewProps } from "./types";
import type { AssignmentKind } from "@/lib/types";

const KINDS: { id: AssignmentKind; label: string }[] = [
  { id: "screenshot", label: "Chart screenshots" },
  { id: "journal", label: "Trade journal" },
  { id: "quiz", label: "Auto-graded quiz" },
  { id: "checkbox", label: "Completion checkbox" },
];

export default function HomeworkAdminView({
  lessonId,
  lessonTitle,
  moduleTitle,
  assignments,
  demo = false,
}: HomeworkAdminViewProps) {
  // Preview has no database, so reordering runs against a local copy.
  const [local, setLocal] = useState(assignments);
  const list = demo ? local : assignments;

  const [kind, setKind] = useState<AssignmentKind>("journal");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  function demoMoveAssignment(id: string, direction: "up" | "down") {
    setLocal((prev) => shiftById(prev, id, direction) ?? prev);
  }

  function demoMoveQuestion(id: string, direction: "up" | "down") {
    setLocal((prev) =>
      prev.map((a) => {
        const moved = shiftById(a.questions, id, direction);
        return moved ? { ...a, questions: moved } : a;
      }),
    );
  }

  function create() {
    if (!title.trim()) return;
    if (demo) {
      setErr(false);
      setMsg("Homework added. (preview — nothing saved)");
      setTitle("");
      return;
    }
    start(async () => {
      const r = await addAssignment(lessonId, kind, title);
      setErr(Boolean(r.error));
      setMsg(r.error ?? "Homework added.");
      if (!r.error) setTitle("");
    });
  }

  const base = demo ? "/preview/manage" : "/manage";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={base} className="text-xs text-muted hover:text-foreground">
        ← Course content
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">{lessonTitle}</h1>
      <p className="mt-0.5 text-sm text-muted">
        {moduleTitle} · homework for this lecture
      </p>

      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No homework on this lecture yet.
          </p>
        ) : (
          list.map((a, i) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              isFirst={i === 0}
              isLast={i === list.length - 1}
              demo={demo}
              onDemoMoveAssignment={demoMoveAssignment}
              onDemoMoveQuestion={demoMoveQuestion}
            />
          ))
        )}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-border p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Add homework
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AssignmentKind)}
            aria-label="Homework type"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Title, e.g. Mark up three sweeps…"
            aria-label="Homework title"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
          />

          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={create}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-30"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>

        {msg && (
          <p className={`mt-2 text-[11px] ${err ? "text-danger" : "text-muted"}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
