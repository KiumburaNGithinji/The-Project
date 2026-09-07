"use client";

import { useState, useTransition } from "react";
import { saveFeedback } from "@/app/(app)/actions";

export default function FeedbackForm({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: string | null;
}) {
  const [text, setText] = useState(initial ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Feedback for this student…"
        className="w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:border-accent/50"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveFeedback(submissionId, text);
              setMsg(r.error ?? "Sent.");
            })
          }
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save feedback"}
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
