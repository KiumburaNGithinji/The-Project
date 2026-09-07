"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteLesson,
  moveLessonToModule,
  renameLesson,
  setLessonPublished,
  setLessonThumbnail,
  setLessonVideo,
} from "@/app/(app)/manage/actions";
import { hasVideo, parseYouTubeId, watchUrl } from "@/lib/youtube";
import { thumbnailUrl } from "@/lib/thumbnails";
import type { ManageLesson, MoveTarget } from "@/components/views/types";

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-30";

/** Everything the parent list needs to make this row draggable. */
export type RowDrag = {
  isDragging: boolean;
  dropSide: "above" | "below" | null;
  /** Arms the drag: a drag that did not start on the grip is cancelled. */
  onGripDown: () => void;
  /** Keyboard equivalent, so reordering does not require a pointer. */
  onKeyMove: (direction: "up" | "down") => void;
  handlers: React.DOMAttributes<HTMLLIElement>;
};

export default function LessonRow({
  lesson,
  ordinal,
  moduleId,
  moveTargets,
  drag,
  demo = false,
}: {
  lesson: ManageLesson;
  ordinal: number;
  moduleId: string;
  moveTargets: MoveTarget[];
  drag?: RowDrag;
  demo?: boolean;
}) {
  const linked = hasVideo(lesson.youtubeId);

  const [title, setTitle] = useState(lesson.title);
  const [url, setUrl] = useState(linked ? watchUrl(lesson.youtubeId) : "");
  const [thumbPath, setThumbPath] = useState(lesson.thumbnailPath);
  const [localThumb, setLocalThumb] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  // Delete is two-click rather than a modal — a browser confirm() would block
  // the page, and this is a destructive action on someone else's course.
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const typedId = parseYouTubeId(url);
  const dirty = url.trim() !== (linked ? watchUrl(lesson.youtubeId) : "");

  const preview =
    localThumb ??
    thumbnailUrl({
      youtubeId: typedId ?? lesson.youtubeId,
      thumbnailPath: thumbPath,
    });

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

  async function uploadThumb(file: File | undefined) {
    if (!file) return;

    if (demo) {
      setLocalThumb(URL.createObjectURL(file));
      setErr(false);
      setMsg("Thumbnail set. (preview — nothing saved)");
      return;
    }

    setBusy(true);
    setMsg(null);

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${lesson.id}/${Date.now()}-${safe}`;

    const { error } = await createClient()
      .storage.from("thumbnails")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) {
      setErr(true);
      setMsg(error.message);
      setBusy(false);
      return;
    }

    const r = await setLessonThumbnail(lesson.id, path);
    setErr(Boolean(r.error));
    setMsg(r.error ?? "Thumbnail updated.");
    if (!r.error) setThumbPath(path);
    setBusy(false);
  }

  return (
    <li
      draggable={Boolean(drag)}
      {...(drag?.handlers ?? {})}
      className={`flex gap-3 px-3 py-3 transition ${
        drag?.isDragging ? "opacity-40" : ""
      } ${drag?.dropSide === "above" ? "border-t-2 border-t-accent" : ""} ${
        drag?.dropSide === "below" ? "border-b-2 border-b-accent" : ""
      }`}
    >
      {drag && (
        <button
          type="button"
          aria-label={`Reorder ${lesson.title}. Use the arrow keys to move it.`}
          onPointerDown={drag.onGripDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              drag.onKeyMove(e.key === "ArrowUp" ? "up" : "down");
            }
          }}
          className="mt-1 h-7 w-5 shrink-0 cursor-grab select-none rounded text-center font-mono text-sm leading-7 text-muted-dim transition hover:text-foreground active:cursor-grabbing"
        >
          ⠿
        </button>
      )}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || pending}
          title="Upload a custom thumbnail"
          className="group relative block h-[54px] w-24 overflow-hidden rounded-md bg-surface-2"
        >
          {preview ? (
            <Image
              src={preview}
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
          <span className="absolute inset-0 grid place-items-center bg-black/70 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
            {busy ? "…" : "Change"}
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void uploadThumb(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {(thumbPath || localThumb) && (
          <button
            type="button"
            onClick={() => {
              setLocalThumb(null);
              setThumbPath(null);
              run(() => setLessonThumbnail(lesson.id, null), "Back to YouTube's.");
            }}
            className="mt-1 w-24 text-[10px] text-muted-dim underline underline-offset-2 hover:text-foreground"
          >
            use YouTube&apos;s
          </button>
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

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`${demo ? "/preview/manage" : "/manage"}/lessons/${lesson.id}`}
            className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted transition hover:border-border-strong hover:text-foreground"
          >
            Homework
            {lesson.homeworkCount > 0 && (
              <span className="ml-1 font-mono text-muted-dim">
                {lesson.homeworkCount}
              </span>
            )}
          </Link>

          <p className="text-[11px]">
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
                {thumbPath ? " · custom thumbnail" : ""}
              </span>
            ) : (
              <span className="text-muted-dim">No video linked yet.</span>
            )}
          </p>

          {moveTargets.length > 1 && (
            <select
              value={moduleId}
              aria-label="Move lecture to"
              onChange={(e) => {
                const target = e.target.value;
                if (target !== moduleId) {
                  run(
                    () => moveLessonToModule(lesson.id, target),
                    "Moved.",
                  );
                }
              }}
              className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted outline-none focus:border-accent"
            >
              {moveTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </li>
  );
}
