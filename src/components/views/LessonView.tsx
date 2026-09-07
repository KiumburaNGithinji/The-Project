import Link from "next/link";
import LessonPlayer from "@/components/LessonPlayer";
import Homework from "@/components/Homework";
import type { LessonViewProps } from "./types";

export default function LessonView({
  basePath = "",
  demo = false,
  moduleTitle,
  lesson,
  startAt,
  percent,
  complete,
  assignments,
  submissions,
  questions,
  screenshotUrls,
  userId,
  prev,
  next,
  nextLocked = false,
}: LessonViewProps) {
  return (
    <div>
      <Link
        href={basePath || "/"}
        className="text-xs text-muted hover:text-foreground"
      >
        ← {moduleTitle}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">{lesson.title}</h1>
      {lesson.description && (
        <p className="mt-1 max-w-3xl text-sm text-muted">{lesson.description}</p>
      )}

      <div className="mt-5">
        <LessonPlayer
          lessonId={lesson.id}
          youtubeId={lesson.youtubeId}
          startAt={startAt}
          initialPercent={percent}
          initiallyComplete={complete}
          demo={demo}
        />
      </div>

      {assignments.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Homework
          </h2>
          {assignments.map((a) => (
            <Homework
              key={a.id}
              assignment={a}
              submission={submissions[a.id] ?? null}
              questions={questions[a.id] ?? []}
              screenshotUrls={screenshotUrls[a.id] ?? []}
              userId={userId}
              demo={demo}
            />
          ))}
        </div>
      )}

      <nav className="mt-10 flex items-center justify-between border-t border-border pt-4 text-sm">
        {prev ? (
          <Link
            href={`${basePath}/lessons/${prev.id}`}
            className="text-muted hover:text-foreground"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          nextLocked ? (
            <span
              title="Finish this lecture and get its homework approved."
              className="cursor-not-allowed text-muted-dim"
            >
              {next.title} · locked
            </span>
          ) : (
            <Link
              href={`${basePath}/lessons/${next.id}`}
              className="text-muted hover:text-foreground"
            >
              {next.title} →
            </Link>
          )
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
