"use client";

import { useState, useTransition } from "react";
import LessonRow from "./LessonRow";
import { addLesson, deleteModule, renameModule } from "@/app/(app)/manage/actions";
import { hasVideo } from "@/lib/youtube";
import type { ManageModule } from "@/components/views/types";

export default function ModuleBlock({
  module,
  ordinalBase,
  demo = false,
}: {
  module: ManageModule;
  ordinalBase: number;
  demo?: boolean;
}) {
  const [title, setTitle] = useState(module.title);
  const [newTitle, setNewTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();

  const linked = module.lessons.filter((l) => hasVideo(l.youtubeId)).length;

  function run(fn: () => Promise<{ ok?: true; error?: string }>, good: string) {
    if (demo) {
      setErr(false);
      setMsg(`${good} (preview — nothing saved)`);
      return;
    }
    start(async () => {
      const r = await fn();
      setErr(Boolean(r.error));
      setMsg(r.error ?? good);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== module.title) {
              run(() => renameModule(module.id, title), "Section renamed.");
            }
          }}
          aria-label="Section title"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-border focus:border-border-strong focus:bg-background"
        />

        <span className="font-mono text-[11px] text-muted-dim">
          {linked}/{module.lessons.length} linked
        </span>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirmed) {
              run(() => deleteModule(module.id), "Section deleted.");
            } else {
              setConfirmed(true);
              setErr(true);
              setMsg("Click again to delete this section.");
            }
          }}
          className={`rounded-md border px-2 py-1 text-xs transition ${
            confirmed
              ? "border-danger text-danger"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Delete section
        </button>
      </div>

      {module.lessons.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">
          No lectures in this section yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {module.lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              lesson={l}
              ordinal={ordinalBase + i + 1}
              isFirst={i === 0}
              isLast={i === module.lessons.length - 1}
              demo={demo}
            />
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim()) {
              run(() => addLesson(module.id, newTitle), "Lecture added.");
              setNewTitle("");
            }
          }}
          placeholder="New lecture title…"
          aria-label="New lecture title"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
        />
        <button
          type="button"
          disabled={pending || !newTitle.trim()}
          onClick={() => {
            run(() => addLesson(module.id, newTitle), "Lecture added.");
            setNewTitle("");
          }}
          className="shrink-0 rounded-md border border-border-strong px-3 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
        >
          Add lecture
        </button>
      </div>

      {msg && (
        <p
          className={`px-4 pb-2.5 text-[11px] ${err ? "text-danger" : "text-muted"}`}
        >
          {msg}
        </p>
      )}
    </section>
  );
}
