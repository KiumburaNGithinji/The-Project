"use client";

import { useState, useTransition } from "react";
import ModuleBlock from "@/components/manage/ModuleBlock";
import { addModule, publishAllLinked } from "@/app/(app)/manage/actions";
import { hasVideo } from "@/lib/youtube";
import type { ManageViewProps } from "./types";

export default function ManageView({
  courseId,
  courseTitle,
  modules,
  moveTargets,
  demo = false,
}: ManageViewProps) {
  const [newModule, setNewModule] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const flatten = (list: typeof modules): typeof modules =>
    list.flatMap((m) => [m, ...flatten(m.children)]);
  const all = flatten(modules).flatMap((m) => m.lessons);
  const readyToPublish = all.filter(
    (l) => hasVideo(l.youtubeId) && !l.isPublished,
  ).length;

  function publishAll() {
    if (demo) {
      setMsg(`${readyToPublish} lectures published. (preview — nothing saved)`);
      return;
    }
    start(async () => {
      const r = await publishAllLinked(courseId);
      setMsg(r.error ?? "Published everything that has a link.");
    });
  }
  const linked = all.filter((l) => hasVideo(l.youtubeId)).length;
  const live = all.filter((l) => l.isPublished).length;

  function create() {
    if (!newModule.trim()) return;
    if (demo) {
      setMsg("Section added. (preview — nothing saved)");
      setNewModule("");
      return;
    }
    start(async () => {
      const r = await addModule(courseId, newModule);
      setMsg(r.error ?? "Section added.");
      if (!r.error) setNewModule("");
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Course content</h1>
          <p className="mt-0.5 text-sm text-muted">
            Paste each lecture&apos;s YouTube link. Students only see lectures
            marked <span className="text-foreground">Live</span>.
          </p>
        </div>

        <div className="flex gap-6 font-mono text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-dim">
              linked
            </div>
            <div>
              {linked}
              <span className="text-muted-dim">/{all.length}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-dim">
              live
            </div>
            <div>
              {live}
              <span className="text-muted-dim">/{all.length}</span>
            </div>
          </div>
        </div>
      </div>

      {linked < all.length && (
        <p className="mt-4 rounded-md border-l-2 border-accent bg-surface-2 px-3 py-2 text-sm">
          {all.length - linked} lecture{all.length - linked === 1 ? "" : "s"} still
          need a link. Runtime fills in automatically the first time someone
          watches — you don&apos;t need to enter it.
        </p>
      )}

      {readyToPublish > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
          <span className="text-sm">
            {readyToPublish} linked lecture{readyToPublish === 1 ? " is" : "s are"}{" "}
            still hidden from students.
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={publishAll}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
          >
            {pending ? "Publishing…" : "Publish all linked"}
          </button>
        </div>
      )}

      <p className="sr-only">{courseTitle}</p>

      <div className="mt-6 space-y-5">
        {modules.map((m, i) => (
          <ModuleBlock
            key={m.id}
            module={m}
            courseId={courseId}
            moveTargets={moveTargets}
            isFirst={i === 0}
            isLast={i === modules.length - 1}
            ordinalBase={modules
              .slice(0, i)
              .reduce(
                (n, prev) =>
                  n +
                  prev.lessons.length +
                  prev.children.reduce((k, c) => k + c.lessons.length, 0),
                0,
              )}
            demo={demo}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <input
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New section title…"
          aria-label="New section title"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
        />
        <button
          type="button"
          disabled={pending || !newModule.trim()}
          onClick={create}
          className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs transition hover:bg-surface-2 disabled:opacity-30"
        >
          Add section
        </button>
      </div>

      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
