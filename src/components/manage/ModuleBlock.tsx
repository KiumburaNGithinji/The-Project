"use client";

import { useRef, useState, useTransition } from "react";
import LessonRow, { type RowDrag } from "./LessonRow";
import {
  addLesson,
  addModule,
  deleteModule,
  moveModule,
  reorderLesson,
  renameModule,
} from "@/app/(app)/manage/actions";
import { hasVideo } from "@/lib/youtube";
import type { ManageModule, MoveTarget } from "@/components/views/types";

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-30";

function countLinked(m: ManageModule): [number, number] {
  const own = m.lessons;
  const kids = m.children.map(countLinked);
  return [
    own.filter((l) => hasVideo(l.youtubeId)).length +
      kids.reduce((n, [a]) => n + a, 0),
    own.length + kids.reduce((n, [, b]) => n + b, 0),
  ];
}

export default function ModuleBlock({
  module,
  courseId,
  ordinalBase,
  moveTargets,
  isFirst,
  isLast,
  depth = 0,
  demo = false,
  onDemoReorderLesson,
  onDemoMoveModule,
}: {
  module: ManageModule;
  courseId: string;
  ordinalBase: number;
  moveTargets: MoveTarget[];
  isFirst: boolean;
  isLast: boolean;
  depth?: number;
  demo?: boolean;
  onDemoReorderLesson?: (id: string, toIndex: number) => void;
  onDemoMoveModule?: (id: string, direction: "up" | "down") => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [newLesson, setNewLesson] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();

  // Drag and drop over the lecture list. Native HTML5 dragging rather than a
  // library: it is one vertical list, and a dependency here would outweigh it.
  const grippedRef = useRef(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overSide, setOverSide] = useState<"above" | "below">("below");

  function clearDrag() {
    grippedRef.current = false;
    setDragId(null);
    setOverId(null);
  }

  /** Drop `id` where the indicator is showing, then persist the new order. */
  function commit(id: string, targetId: string, side: "above" | "below") {
    const ids = module.lessons.map((l) => l.id);
    const from = ids.indexOf(id);
    let to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    if (side === "below") to += 1;
    if (from < to) to -= 1;
    if (to === from) return;

    move(id, to);
  }

  function move(id: string, toIndex: number) {
    if (toIndex < 0 || toIndex >= module.lessons.length) return;

    if (demo) {
      onDemoReorderLesson?.(id, toIndex);
      return;
    }
    start(async () => {
      const r = await reorderLesson(id, toIndex);
      if (r.error) {
        setErr(true);
        setMsg(r.error);
      }
    });
  }

  const rowDrag = (id: string, index: number): RowDrag => ({
    isDragging: dragId === id,
    dropSide: dragId && overId === id && dragId !== id ? overSide : null,
    onGripDown: () => {
      grippedRef.current = true;
    },
    onKeyMove: (direction) =>
      move(id, direction === "up" ? index - 1 : index + 1),
    handlers: {
      onDragStart: (e) => {
        // A drag that did not begin on the grip is someone selecting text in
        // one of the inputs. Let them.
        if (!grippedRef.current) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        setDragId(id);
      },
      onDragOver: (e) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const box = e.currentTarget.getBoundingClientRect();
        setOverId(id);
        setOverSide(e.clientY < box.top + box.height / 2 ? "above" : "below");
      },
      onDrop: (e) => {
        e.preventDefault();
        const dragged = dragId ?? e.dataTransfer.getData("text/plain");
        if (dragged && dragged !== id) commit(dragged, id, overSide);
        clearDrag();
      },
      onDragEnd: clearDrag,
    },
  });

  const [linked, total] = countLinked(module);
  const isTopic = depth > 0;

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
    <section
      className={
        isTopic
          ? "rounded-lg border border-border bg-background"
          : "rounded-lg border border-border bg-surface"
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        {isTopic && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-dim">
            topic
          </span>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== module.title) {
              run(() => renameModule(module.id, title), "Renamed.");
            }
          }}
          aria-label="Title"
          className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 outline-none hover:border-border focus:border-border-strong focus:bg-background ${
            isTopic ? "text-sm font-medium" : "text-sm font-semibold"
          }`}
        />

        <span className="font-mono text-[11px] text-muted-dim">
          {linked}/{total} linked
        </span>

        <button
          type="button"
          aria-label="Move up"
          disabled={isFirst || pending}
          onClick={() =>
            demo && onDemoMoveModule
              ? onDemoMoveModule(module.id, "up")
              : run(() => moveModule(module.id, "up"), "Moved.")
          }
          className={iconBtn}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={isLast || pending}
          onClick={() =>
            demo && onDemoMoveModule
              ? onDemoMoveModule(module.id, "down")
              : run(() => moveModule(module.id, "down"), "Moved.")
          }
          className={iconBtn}
        >
          ↓
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirmed) {
              run(() => deleteModule(module.id), "Deleted.");
            } else {
              setConfirmed(true);
              setErr(true);
              setMsg("Click again to delete.");
            }
          }}
          className={`rounded-md border px-2 py-1 text-xs transition ${
            confirmed
              ? "border-danger text-danger"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Delete
        </button>
      </div>

      {module.lessons.length > 0 && (
        <ul className="divide-y divide-border">
          {module.lessons.map((l, i) => (
            <LessonRow
              key={l.id}
              lesson={l}
              ordinal={ordinalBase + i + 1}
              moduleId={module.id}
              moveTargets={moveTargets}
              demo={demo}
              drag={rowDrag(l.id, i)}
            />
          ))}
        </ul>
      )}

      {module.children.length > 0 && (
        <div className="space-y-3 border-t border-border p-3">
          {module.children.map((child, i) => (
            <ModuleBlock
              key={child.id}
              module={child}
              courseId={courseId}
              ordinalBase={
                ordinalBase +
                module.lessons.length +
                module.children
                  .slice(0, i)
                  .reduce((n, c) => n + c.lessons.length, 0)
              }
              moveTargets={moveTargets}
              isFirst={i === 0}
              isLast={i === module.children.length - 1}
              depth={depth + 1}
              demo={demo}
              onDemoReorderLesson={onDemoReorderLesson}
              onDemoMoveModule={onDemoMoveModule}
            />
          ))}
        </div>
      )}

      {module.lessons.length === 0 && module.children.length === 0 && (
        <p className="px-4 py-5 text-center text-sm text-muted">
          Nothing in here yet.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
        <input
          value={newLesson}
          onChange={(e) => setNewLesson(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLesson.trim()) {
              run(() => addLesson(module.id, newLesson), "Lecture added.");
              setNewLesson("");
            }
          }}
          placeholder="New lecture title…"
          aria-label="New lecture title"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
        />
        <button
          type="button"
          disabled={pending || !newLesson.trim()}
          onClick={() => {
            run(() => addLesson(module.id, newLesson), "Lecture added.");
            setNewLesson("");
          }}
          className="shrink-0 rounded-md border border-border-strong px-3 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
        >
          Add lecture
        </button>

        {/* Only sections can hold topics — two levels, no deeper. */}
        {!isTopic && (
          <>
            <input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTopic.trim()) {
                  run(
                    () => addModule(courseId, newTopic, module.id),
                    "Topic added.",
                  );
                  setNewTopic("");
                }
              }}
              placeholder="New topic, e.g. Manipulation…"
              aria-label="New topic title"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
            />
            <button
              type="button"
              disabled={pending || !newTopic.trim()}
              onClick={() => {
                run(() => addModule(courseId, newTopic, module.id), "Topic added.");
                setNewTopic("");
              }}
              className="shrink-0 rounded-md border border-border-strong px-3 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
            >
              Add topic
            </button>
          </>
        )}
      </div>

      {msg && (
        <p className={`px-4 pb-2.5 text-[11px] ${err ? "text-danger" : "text-muted"}`}>
          {msg}
        </p>
      )}
    </section>
  );
}
