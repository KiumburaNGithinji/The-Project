"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  attachScreenshots,
  gradeQuiz,
  saveJournal,
  setCheckbox,
} from "@/app/(app)/actions";
import type { Assignment, QuizQuestion, QuizResult, Submission } from "@/lib/types";

type Props = {
  assignment: Assignment;
  submission: Submission | null;
  questions: QuizQuestion[];
  screenshotUrls: string[];
  userId: string;
};

export default function Homework(props: Props) {
  const { assignment, submission } = props;
  const done = submission && submission.status !== "draft";

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">{assignment.title}</h3>
          {assignment.instructions && (
            <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-muted">
              {assignment.instructions}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
            done
              ? "border-accent/30 bg-accent-dim text-accent"
              : "border-border text-muted"
          }`}
        >
          {done ? "submitted" : assignment.kind}
        </span>
      </div>

      <div className="mt-4">
        {assignment.kind === "journal" && <JournalForm {...props} />}
        {assignment.kind === "checkbox" && <CheckboxForm {...props} />}
        {assignment.kind === "screenshot" && <ScreenshotForm {...props} />}
        {assignment.kind === "quiz" && <QuizForm {...props} />}
      </div>

      {submission?.mentor_feedback && (
        <div className="mt-4 rounded-md border border-warn/30 bg-warn/10 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-warn">
            Mentor feedback
          </div>
          <p className="mt-1 whitespace-pre-line text-sm">{submission.mentor_feedback}</p>
        </div>
      )}
    </section>
  );
}

function Status({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="mt-2 text-xs text-muted">{msg}</p>;
}

function JournalForm({ assignment, submission }: Props) {
  const [text, setText] = useState(submission?.journal_text ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Thesis, entry, exit, size, what you'd do differently…"
        className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent/50"
      />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveJournal(assignment.id, text);
            setMsg(r.error ? r.error : "Saved.");
          })
        }
        className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-[#06210f] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Submit journal"}
      </button>
      <Status msg={msg} />
    </div>
  );
}

function CheckboxForm({ assignment, submission }: Props) {
  const [checked, setChecked] = useState(submission?.is_checked ?? false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const next = e.target.checked;
            setChecked(next);
            start(async () => {
              const r = await setCheckbox(assignment.id, next);
              setMsg(r.error ? r.error : next ? "Marked done." : "Unmarked.");
            });
          }}
          className="h-4 w-4 accent-[#4ade80]"
        />
        I completed this
      </label>
      <Status msg={msg} />
    </div>
  );
}

function ScreenshotForm({ assignment, submission, screenshotUrls, userId }: Props) {
  const [urls, setUrls] = useState(screenshotUrls);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMsg(null);

    const supabase = createClient();
    const paths = [...(submission?.screenshot_paths ?? [])];

    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${assignment.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("submissions")
        .upload(path, file, { upsert: false });
      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }
      paths.push(path);
    }

    const r = await attachScreenshots(assignment.id, paths);
    if (r.error) {
      setMsg(r.error);
    } else {
      const signed = await Promise.all(
        paths.map(async (p) => {
          const { data } = await supabase.storage
            .from("submissions")
            .createSignedUrl(p, 3600);
          return data?.signedUrl ?? "";
        }),
      );
      setUrls(signed.filter(Boolean));
      setMsg("Uploaded.");
    }
    setBusy(false);
  }

  return (
    <div>
      {urls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {urls.map((u) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border border-border"
            >
              <Image
                src={u}
                alt="Submitted chart"
                width={320}
                height={180}
                unoptimized
                className="h-24 w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={(e) => upload(e.target.files)}
        className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
      />
      <Status msg={busy ? "Uploading…" : msg} />
    </div>
  );
}

function QuizForm({ assignment, questions }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (questions.length === 0) {
    return <p className="text-sm text-muted">No questions have been added yet.</p>;
  }

  const byId = new Map(result?.results.map((r) => [r.question_id, r]) ?? []);

  return (
    <div>
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const r = byId.get(q.id);
          return (
            <li key={q.id}>
              <p className="text-sm">
                <span className="mr-2 font-mono text-xs text-muted">{i + 1}.</span>
                {q.prompt}
              </p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((opt, idx) => {
                  const isRight = r && idx === r.correct_index;
                  const isWrongPick = r && r.selected === idx && !r.correct;
                  return (
                    <label
                      key={idx}
                      className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-1.5 text-sm ${
                        isRight
                          ? "border-accent/40 bg-accent-dim"
                          : isWrongPick
                            ? "border-danger/40 bg-danger/10"
                            : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === idx}
                        disabled={Boolean(result)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                        className="mt-0.5 accent-[#4ade80]"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {r?.explanation && (
                <p className="mt-1.5 text-xs text-muted">{r.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      {!result && (
        <button
          disabled={pending || Object.keys(answers).length < questions.length}
          onClick={() =>
            start(async () => {
              const res = await gradeQuiz(assignment.id, answers);
              if (res.error) setMsg(res.error);
              else if (res.result) setResult(res.result);
            })
          }
          className="mt-4 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-[#06210f] disabled:opacity-60"
        >
          {pending ? "Grading…" : "Submit answers"}
        </button>
      )}

      {result && (
        <p className="mt-4 font-mono text-sm">
          <span className={result.passed ? "text-accent" : "text-danger"}>
            {result.score}/{result.total} — {result.percent}%
          </span>
          <button
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
            className="ml-3 text-xs text-muted underline hover:text-foreground"
          >
            retake
          </button>
        </p>
      )}
      <Status msg={msg} />
    </div>
  );
}
