"use client";

import { useState, useTransition } from "react";
import { saveFeedback } from "@/app/(app)/actions";

export default function FeedbackForm({
  submissionId,
  initial,
  demo = false,
}: {
  submissionId: string;
  initial: string | null;
  demo?: boolean;
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
        className="w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm outline-none placeholder:text-muted-dim focus:border-border-strong"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          disabled={pending}
          onClick={() => {
            if (demo) {
              setMsg("Sent. (preview — nothing was written)");
              return;
            }
            start(async () => {
              const r = await saveFeedback(submissionId, text);
              setMsg(r.error ?? "Sent.");
            });
          }}
          className="rounded-md border border-border-strong px-2.5 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save feedback"}
        </button>
        {msg && <span className="text-xs text-muted-dim">{msg}</span>}
      </div>
    </div>
  );
}
