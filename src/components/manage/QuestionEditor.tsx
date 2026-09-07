"use client";

import { useState, useTransition } from "react";
import {
  deleteQuestion,
  moveQuestion,
  updateQuestion,
} from "@/app/(app)/manage/homework-actions";
import type { AdminQuestion } from "@/components/views/types";

const iconBtn =
  "grid h-6 w-6 place-items-center rounded border border-border text-xs text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-30";

export default function QuestionEditor({
  question,
  index,
  isFirst,
  isLast,
  demo = false,
  onDemoMove,
}: {
  question: AdminQuestion;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  demo?: boolean;
  onDemoMove?: (id: string, direction: "up" | "down") => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correct, setCorrect] = useState(question.correctIndex);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();

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

  function save() {
    run(
      () =>
        updateQuestion(question.id, {
          prompt,
          options,
          correctIndex: correct,
          explanation,
        }),
      "Question saved.",
    );
  }

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)));
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, j) => j !== i));
    // Keep the correct answer pointing at the same option where possible.
    setCorrect((c) => (i === c ? 0 : i < c ? c - 1 : c));
  }

  return (
    <li className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 font-mono text-xs text-muted-dim">{index + 1}.</span>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="Question"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          aria-label="Move question up"
          disabled={isFirst || pending}
          onClick={() =>
            demo && onDemoMove
              ? onDemoMove(question.id, "up")
              : run(() => moveQuestion(question.id, "up"), "Moved.")
          }
          className={iconBtn}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move question down"
          disabled={isLast || pending}
          onClick={() =>
            demo && onDemoMove
              ? onDemoMove(question.id, "down")
              : run(() => moveQuestion(question.id, "down"), "Moved.")
          }
          className={iconBtn}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Delete question"
          disabled={pending}
          onClick={() => {
            if (confirmed) {
              run(() => deleteQuestion(question.id), "Deleted.");
            } else {
              setConfirmed(true);
              setErr(true);
              setMsg("Click again to delete this question.");
            }
          }}
          className={`${iconBtn} ${confirmed ? "border-danger text-danger" : ""}`}
        >
          ✕
        </button>
      </div>

      <p className="mt-2.5 text-[11px] uppercase tracking-wide text-muted-dim">
        Answers — select the correct one
      </p>

      <ul className="mt-1.5 space-y-1.5">
        {options.map((opt, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              aria-label={`Answer ${i + 1} is correct`}
              className="accent-[#2962ff]"
            />
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Answer ${i + 1}`}
              aria-label={`Answer ${i + 1}`}
              className={`min-w-0 flex-1 rounded-md border bg-surface px-2.5 py-1 text-sm outline-none focus:border-accent ${
                correct === i ? "border-accent" : "border-border"
              }`}
            />
            <button
              type="button"
              aria-label={`Remove answer ${i + 1}`}
              disabled={options.length <= 2}
              onClick={() => removeOption(i)}
              className={iconBtn}
              title={options.length <= 2 ? "A question needs at least two answers" : "Remove"}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={options.length >= 6}
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-muted transition hover:text-foreground disabled:opacity-30"
        >
          Add answer
        </button>
      </div>

      <input
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        placeholder="Why that's the answer (shown after grading, optional)…"
        aria-label="Explanation"
        className="mt-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save question"}
        </button>
        {msg && (
          <span className={`text-[11px] ${err ? "text-danger" : "text-muted"}`}>
            {msg}
          </span>
        )}
      </div>
    </li>
  );
}
