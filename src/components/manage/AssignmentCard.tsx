"use client";

import { useState, useTransition } from "react";
import QuestionEditor from "./QuestionEditor";
import {
  addQuestion,
  deleteAssignment,
  moveAssignment,
  updateAssignment,
} from "@/app/(app)/manage/homework-actions";
import type { AdminAssignment } from "@/components/views/types";

const KIND_LABEL: Record<AdminAssignment["kind"], string> = {
  screenshot: "Chart screenshots",
  journal: "Trade journal",
  quiz: "Auto-graded quiz",
  checkbox: "Completion checkbox",
};

const KIND_HINT: Record<AdminAssignment["kind"], string> = {
  screenshot: "Students upload marked-up charts. Only you and they can see them.",
  journal: "Students write an entry. You can leave feedback on it.",
  quiz: "Graded in the database — students never receive the answer key.",
  checkbox: "Students tick it off themselves. You can't verify the work.",
};

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition hover:border-border-strong hover:text-foreground disabled:opacity-30";

/** <input type="datetime-local"> wants local time with no zone suffix. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssignmentCard({
  assignment,
  isFirst,
  isLast,
  demo = false,
  onDemoMoveAssignment,
  onDemoMoveQuestion,
}: {
  assignment: AdminAssignment;
  isFirst: boolean;
  isLast: boolean;
  demo?: boolean;
  onDemoMoveAssignment?: (id: string, direction: "up" | "down") => void;
  onDemoMoveQuestion?: (id: string, direction: "up" | "down") => void;
}) {
  const [title, setTitle] = useState(assignment.title);
  const [instructions, setInstructions] = useState(assignment.instructions ?? "");
  const [dueAt, setDueAt] = useState(toLocalInput(assignment.dueAt));
  const [passScore, setPassScore] = useState(
    assignment.passScore === null ? "" : String(assignment.passScore),
  );
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

  const hasSubmissions = assignment.submissionCount > 0;

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
          {assignment.kind}
        </span>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== assignment.title) {
              run(() => updateAssignment(assignment.id, { title }), "Renamed.");
            }
          }}
          aria-label="Homework title"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-border focus:border-border-strong focus:bg-background"
        />

        {hasSubmissions && (
          <span className="font-mono text-[11px] text-muted-dim">
            {assignment.submissionCount} submitted
          </span>
        )}

        <button
          type="button"
          aria-label="Move up"
          disabled={isFirst || pending}
          onClick={() =>
            demo && onDemoMoveAssignment
              ? onDemoMoveAssignment(assignment.id, "up")
              : run(() => moveAssignment(assignment.id, "up"), "Moved.")
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
            demo && onDemoMoveAssignment
              ? onDemoMoveAssignment(assignment.id, "down")
              : run(() => moveAssignment(assignment.id, "down"), "Moved.")
          }
          className={iconBtn}
        >
          ↓
        </button>

        <button
          type="button"
          aria-label="Delete homework"
          disabled={pending}
          onClick={() => {
            if (confirmed) {
              run(() => deleteAssignment(assignment.id), "Deleted.");
            } else {
              setConfirmed(true);
              setErr(true);
              setMsg(
                hasSubmissions
                  ? `Click again — this also deletes ${assignment.submissionCount} student submission(s).`
                  : "Click again to delete this homework.",
              );
            }
          }}
          className={`${iconBtn} ${confirmed ? "border-danger text-danger" : ""}`}
        >
          ✕
        </button>
      </div>

      <p className="mt-1 px-2 text-[11px] text-muted-dim">
        {KIND_LABEL[assignment.kind]} — {KIND_HINT[assignment.kind]}
      </p>

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        onBlur={() => {
          if (instructions !== (assignment.instructions ?? "")) {
            run(
              () => updateAssignment(assignment.id, { instructions }),
              "Instructions saved.",
            );
          }
        }}
        rows={2}
        placeholder="What should they do? (optional)"
        aria-label="Instructions"
        className="mt-2 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
      />

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          Due
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            onBlur={() => {
              if (dueAt !== toLocalInput(assignment.dueAt)) {
                run(
                  () => updateAssignment(assignment.id, { dueAt: dueAt || null }),
                  dueAt ? "Due date set." : "Due date cleared.",
                );
              }
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
        </label>

        {assignment.kind === "quiz" && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Pass mark
            <input
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(e) => setPassScore(e.target.value)}
              onBlur={() => {
                const next =
                  passScore.trim() === "" ? null : Number(passScore);
                const current = assignment.passScore;
                if (next !== current) {
                  run(
                    () => updateAssignment(assignment.id, { passScore: next }),
                    "Pass mark saved.",
                  );
                }
              }}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
            />
            %
          </label>
        )}
      </div>

      {assignment.kind === "quiz" && (
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Questions
          </p>

          {assignment.questions.length === 0 ? (
            <p className="mt-2 rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
              No questions yet — students would see an empty quiz.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {assignment.questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === assignment.questions.length - 1}
                  demo={demo}
                  onDemoMove={onDemoMoveQuestion}
                />
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => addQuestion(assignment.id), "Question added.")}
            className="mt-2 rounded-md border border-border-strong px-3 py-1 text-xs transition hover:bg-surface-2 disabled:opacity-30"
          >
            Add question
          </button>
        </div>
      )}

      {msg && (
        <p className={`mt-2 text-[11px] ${err ? "text-danger" : "text-muted"}`}>
          {msg}
        </p>
      )}
    </section>
  );
}
