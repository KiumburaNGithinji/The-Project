"use client";

import { useState, useTransition } from "react";
import { reviewSubmission, saveFeedback } from "@/app/(app)/actions";
import type { SubmissionStatus } from "@/lib/types";

/**
 * The mentor's verdict on one piece of homework. Approving is what unlocks the
 * next lecture for that student, so it is a deliberate button rather than a
 * side effect of leaving a comment.
 */
export default function FeedbackForm({
  submissionId,
  initial,
  status,
  demo = false,
}: {
  submissionId: string;
  initial: string | null;
  status: SubmissionStatus;
  demo?: boolean;
}) {
  const [text, setText] = useState(initial ?? "");
  const [state, setState] = useState<SubmissionStatus>(status);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  function run(
    fn: () => Promise<{ ok?: boolean; error?: string }>,
    good: string,
    next?: SubmissionStatus,
  ) {
    setMsg(null);
    setErr(false);

    if (demo) {
      if (next) setState(next);
      setMsg(`${good} (preview — nothing was written)`);
      return;
    }

    start(async () => {
      const r = await fn();
      if (r.error) {
        setErr(true);
        setMsg(r.error);
        return;
      }
      if (next) setState(next);
      setMsg(good);
    });
  }

  const btn =
    "rounded-md px-2.5 py-1 text-xs transition disabled:opacity-40";

  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Feedback for this student…"
        className="w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm outline-none placeholder:text-muted-dim focus:border-border-strong"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          disabled={pending || state === "approved"}
          onClick={() =>
            run(
              () => reviewSubmission(submissionId, "approved", text),
              "Approved — their next lecture is open.",
              "approved",
            )
          }
          className={`${btn} bg-accent font-medium text-accent-ink hover:bg-accent-hover`}
        >
          {state === "approved" ? "Approved" : "Approve"}
        </button>

        <button
          disabled={pending}
          onClick={() =>
            run(
              () => reviewSubmission(submissionId, "returned", text),
              "Sent back for changes.",
              "returned",
            )
          }
          className={`${btn} border border-border-strong hover:bg-surface-2`}
        >
          Send back
        </button>

        <button
          disabled={pending}
          onClick={() =>
            run(() => saveFeedback(submissionId, text), "Feedback saved.")
          }
          className={`${btn} border border-border text-muted hover:text-foreground`}
        >
          Save note only
        </button>

        {msg && (
          <span className={`text-xs ${err ? "text-danger" : "text-muted-dim"}`}>
            {msg}
          </span>
        )}
      </div>

      {state === "submitted" && (
        <p className="mt-1.5 text-xs text-muted-dim">
          They cannot start the next lecture until this is approved.
        </p>
      )}
    </div>
  );
}
