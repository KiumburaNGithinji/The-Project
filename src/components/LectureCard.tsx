import Image from "next/image";
import Link from "next/link";
import type { CourseLessonRow } from "@/components/views/types";

function timecode(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusLine(l: CourseLessonRow) {
  if (l.completed) return "Watched";
  if (l.percent > 0) return `${Math.floor(l.percent)}% watched`;
  return "Not started";
}

export default function LectureCard({
  lesson,
  moduleTitle,
  basePath = "",
}: {
  lesson: CourseLessonRow;
  moduleTitle: string;
  basePath?: string;
}) {
  const duration = timecode(lesson.durationSeconds);
  const isPreview = !lesson.youtubeId || lesson.youtubeId === "PREVIEW";

  return (
    <Link href={`${basePath}/lessons/${lesson.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2">
        {isPreview ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
            <span className="font-mono text-3xl text-border-strong">
              {String(lesson.ordinal).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <Image
            src={`https://i.ytimg.com/vi/${lesson.youtubeId}/mqdefault.jpg`}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        )}

        {duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
            {duration}
          </span>
        )}

        {/* The watched bar, exactly where YouTube puts it. */}
        {lesson.percent > 0 && (
          <span className="absolute inset-x-0 bottom-0 block h-1 bg-white/25">
            <span
              className="block h-full bg-progress"
              style={{ width: `${Math.min(100, lesson.percent)}%` }}
            />
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
            lesson.completed
              ? "bg-progress text-progress-ink"
              : "bg-surface-2 text-muted"
          }`}
        >
          {lesson.completed ? "✓" : String(lesson.ordinal).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {lesson.title}
          </h3>
          <p className="mt-1 text-xs text-muted">{moduleTitle}</p>
          <p className="text-xs text-muted-dim">
            {statusLine(lesson)}
            {lesson.homeworkTotal > 0 && (
              <>
                {" · "}
                <span
                  className={
                    lesson.homeworkDone === lesson.homeworkTotal
                      ? "text-muted"
                      : undefined
                  }
                >
                  homework {lesson.homeworkDone}/{lesson.homeworkTotal}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
