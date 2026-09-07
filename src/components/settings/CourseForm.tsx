"use client";

import { useState, useTransition } from "react";
import { updateCourse } from "@/app/(app)/settings/actions";
import type { SettingsViewProps } from "@/components/views/types";

export default function CourseForm({
  course,
  demo = false,
}: {
  course: SettingsViewProps["course"];
  demo?: boolean;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  const field =
    "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition focus:border-border-strong focus:outline-none";

  function save() {
    setMsg(null);
    setErr(false);

    if (demo) {
      setMsg("Saved (preview — nothing saved)");
      return;
    }

    start(async () => {
      const res = await updateCourse(course.id, {
        title,
        description,
        isPublished,
      });
      if (res.error) {
        setErr(true);
        setMsg(res.error);
        return;
      }
      setMsg("Saved");
    });
  }

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-border bg-surface p-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
        <span className="mt-1 block text-xs text-muted-dim">
          Shown in the header, the course page, and on the Discord consent
          screen students already agreed to.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Description
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={field}
        />
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm">
          Published
          <span className="mt-0.5 block text-xs text-muted-dim">
            Unpublishing hides the whole course from students at once.
            Individual lectures still have their own Live switch under Content.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg && (
          <span className={`text-xs ${err ? "text-danger" : "text-muted-dim"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
