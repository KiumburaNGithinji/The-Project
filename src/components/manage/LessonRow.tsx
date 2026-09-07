"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  deleteLesson,
  moveLesson,
  renameLesson,
  setLessonPublished,
  setLessonVideo,
} from "@/app/(app)/manage/actions";
import { hasVideo, parseYouTubeId, watchUrl } from "@/lib/youtube";
import type { ManageLesson } from "@/components/views/types";

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-30";

export default function LessonRow({
  lesson,
  ordinal,
  isFirst,
  isLast,
  demo = false,
}: {
  lesson: ManageLesson;
  ordinal: number;
  isFirst: boolean;
  isLast: boolean;
  demo?: boolean;
}) {
  const linked = hasVideo(lesson.youtubeId);

  const [title, setTitle] = useState(lesson.title);
  const [url, setUrl] = useState(linked ? watchUrl(lesson.youtubeId) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  // Delete is two-click rather than a modal — a browser confirm() would block
  // the page, and this is a destructive action on someone else's course.
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();

  // Live feedback while typing, before anything is saved.
  const typedId = parseYouTubeId(url);
  const dirty = url.trim() !== (linked ? watchUrl(lesson.youtubeId) : "");

  function report(r: { ok?: true; error?: string }, good: string) {
    setErr(Boolean(r.error));
    setMsg(r.error ?? good);
  }

  function run(fn: () => Promise<{ ok?: true; error?: string }>, good: string) {
    if (demo) {
      setErr(false);
      setMsg(`${good} (preview — nothing saved)`);
      return;
    }
    start(async () => report(await fn(), good));
  }

  return (
    <li className="flex gap-3 px-3 py-3">
      <div className="relative mt-0.5 h-[54px] w-24 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {typedId ? (
          <Image
            src={`https://i.ytimg.com/vi/${typedId}/mqdefault.jpg`}
            alt=""
            fill
            unoptimized
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-mono text-xs text-border-strong">
            {String(ordinal).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== lesson.title) {
                run(() => renameLesson(lesson.id, title), "Renamed.");
              }
            }}
            aria-label="Lecture title"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-border focus:border-border-strong focus:bg-background"
          />

          <button
            type="button"
            aria-label="Move up"
            disabled={isFirst || pending}
            onClick={() => run(() => moveLesson(lesson.id, "up"), "Moved.")}
            className={iconBtn}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={isLast || pending}
            onClick={() => run(() => moveLesson(lesson.id, "down"), "Moved.")}
            className={iconBtn}
          >
            ↓
          </button>

          <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted">
            <input
              type="checkbox"
              defaultChecked={lesson.isPublished}
              onChange={(e) =>
                run(
                  () => setLessonPublished(lesson.id, e.target.checked),
                  e.target.checked ? "Published." : "Hidden from students.",
                )
              }
              className="h-3.5 w-3.5 accent-[#2962ff]"
            />
            Live
          </label>

          <button
            type="button"
            aria-label="Delete lecture"
            disabled={pending}
            onClick={() => {
              if (confirmed) {
                run(() => deleteLesson(lesson.id), "Deleted.");
              } else {
                setConfirmed(true);
                setErr(true);
                setMsg("Click again to delete this lecture.");
              }
            }}
            className={`${iconBtn} ${confirmed ? "border-danger text-danger" : ""}`}
          >
            ✕
          </button>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setMsg(null);
            }}
            placeholder="Paste the YouTube link…"
            aria-label="YouTube link"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs outline-none placeholder:text-muted-dim focus:border-accent"
          />
          <button
            type="button"
            disabled={pending || !dirty || !typedId}
            onClick={() => run(() => setLessonVideo(lesson.id, url), "Link saved.")}
            className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-30"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>

        <p className="mt-1 text-[11px]">
          {msg ? (
            <span className={err ? "text-danger" : "text-muted"}>{msg}</span>
          ) : url && !typedId ? (
            <span className="text-danger">Not a YouTube link.</span>
          ) : linked && !dirty ? (
            <span className="text-muted-dim">
              Linked · {lesson.youtubeId}
              {lesson.durationSeconds
                ? ` · ${Math.round(lesson.durationSeconds / 60)}m`
                : " · runtime fills in on first watch"}
            </span>
          ) : (
            <span className="text-muted-dim">No video linked yet.</span>
          )}
        </p>
      </div>
    </li>
  );
}
