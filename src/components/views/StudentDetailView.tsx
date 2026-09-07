import Image from "next/image";
import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";
import type { StudentDetailViewProps } from "./types";

export default function StudentDetailView({
  basePath = "",
  demo = false,
  name,
  lectures,
  submissions,
}: StudentDetailViewProps) {
  return (
    <div>
      <Link
        href={`${basePath}/mentor`}
        className="text-xs text-muted hover:text-foreground"
      >
        ← Students
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">{name}</h1>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Lectures watched
        </h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {lectures.map((l) => (
            <li key={l.lessonId} className="flex items-center gap-4 px-4 py-2.5 text-sm">
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] ${
                  l.completed
                    ? "border-progress bg-progress text-progress-ink"
                    : "border-border-strong text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="flex-1 truncate">{l.title}</span>
              <span className="w-28">
                <span className="block h-[3px] overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-progress"
                    style={{ width: `${Math.min(100, l.percent)}%` }}
                  />
                </span>
              </span>
              <span className="w-20 text-right font-mono text-xs text-muted-dim">
                {l.completed ? "complete" : `${Math.floor(l.percent)}%`}
              </span>
            </li>
          ))}
          {lectures.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted">
              Hasn&apos;t started any lectures.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Homework
        </h2>
        <div className="mt-3 space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">{s.assignmentTitle}</h3>
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted-dim">
                  <span
                    className={
                      s.status === "approved"
                        ? "text-progress"
                        : s.status === "returned"
                          ? "text-danger"
                          : "text-accent"
                    }
                  >
                    {s.status === "submitted" ? "awaiting review" : s.status}
                  </span>
                  <span>
                    {s.kind} · {new Date(s.submittedAt).toLocaleDateString()}
                  </span>
                </span>
              </div>

              {s.journalText && (
                <p className="mt-2 whitespace-pre-line rounded-md border border-border bg-background p-3 text-sm text-muted">
                  {s.journalText}
                </p>
              )}

              {s.quizScore !== null && (
                <p className="mt-2 font-mono text-sm">
                  {s.quizScore}%{" "}
                  <span className="text-muted-dim">({s.quizTotal} questions)</span>
                </p>
              )}

              {s.kind === "checkbox" && (
                <p className="mt-2 text-sm text-muted">
                  {s.isChecked ? "✓ Marked complete" : "✕ Not marked"}
                </p>
              )}

              {s.screenshotUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {s.screenshotUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <Image
                        src={u}
                        alt="Submitted chart"
                        width={320}
                        height={180}
                        unoptimized
                        className="h-24 w-full rounded-md border border-border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              <FeedbackForm
                submissionId={s.id}
                initial={s.mentorFeedback}
                status={s.status}
                demo={demo}
              />
            </div>
          ))}
          {submissions.length === 0 && (
            <p className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              No homework submitted yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
