import Link from "next/link";
import type { CourseViewProps } from "./types";

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function Stat({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-dim">{label}</div>
      <div className="font-mono text-sm">
        {done}
        <span className="text-muted-dim">/{total}</span>
      </div>
    </div>
  );
}

export default function CourseView({
  title,
  description,
  modules,
  lecturesDone,
  lecturesTotal,
  homeworkDone,
  homeworkTotal,
  basePath = "",
}: CourseViewProps) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          )}
        </div>
        <div className="flex gap-8">
          <Stat done={lecturesDone} total={lecturesTotal} label="lectures" />
          <Stat done={homeworkDone} total={homeworkTotal} label="homework" />
        </div>
      </div>

      {modules.length === 0 && (
        <p className="mt-10 rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          No lectures have been added yet.
        </p>
      )}

      <div className="mt-8 space-y-8">
        {modules.map((m) => (
          <section key={m.id}>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
              {m.title}
            </h2>
            {m.description && (
              <p className="mt-1 text-sm text-muted-dim">{m.description}</p>
            )}

            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`${basePath}/lessons/${l.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
                  >
                    {/* Filled = complete, hollow = not. No color involved. */}
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                        l.completed
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-border-strong text-transparent"
                      }`}
                    >
                      ✓
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{l.title}</span>
                      <span className="mt-0.5 flex items-center gap-3 text-xs text-muted-dim">
                        {formatDuration(l.durationSeconds) && (
                          <span className="font-mono">
                            {formatDuration(l.durationSeconds)}
                          </span>
                        )}
                        {l.homeworkTotal > 0 && (
                          <span
                            className={
                              l.homeworkDone === l.homeworkTotal
                                ? "text-foreground"
                                : undefined
                            }
                          >
                            homework {l.homeworkDone}/{l.homeworkTotal}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="hidden w-32 items-center gap-2 sm:flex">
                      <span className="block h-[3px] flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${Math.min(100, l.percent)}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-dim">
                        {Math.floor(l.percent)}%
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
