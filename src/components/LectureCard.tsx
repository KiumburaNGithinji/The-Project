import Image from "next/image";
import Link from "next/link";
import { thumbnailUrl } from "@/lib/thumbnails";
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
  if (l.state === "locked") return "Locked";
  if (l.completed) return "Watched";
  if (l.percent > 0) return `${Math.floor(l.percent)}% watched`;
  return "Not started";
}

/** What the homework is doing, and whether it needs attention. */
function homeworkLine(l: CourseLessonRow): { text: string; urgent?: boolean } | null {
  if (l.homeworkTotal === 0) return null;
  if (l.homeworkDone === l.homeworkTotal) return { text: "homework approved" };
  if (l.homeworkReturned > 0) return { text: "changes requested", urgent: true };
  if (l.overdue) return { text: "homework overdue", urgent: true };
  if (l.homeworkPending > 0) return { text: "waiting on your mentor" };

  if (l.dueAt) {
    const hours = Math.max(
      0,
      Math.round((new Date(l.dueAt).getTime() - Date.now()) / 3_600_000),
    );
    return { text: hours >= 1 ? `homework due in ${hours}h` : "homework due within the hour" };
  }

  return { text: `homework ${l.homeworkDone}/${l.homeworkTotal}` };
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
      <path
        d="M8.5 10.5V7.75a3.5 3.5 0 1 1 7 0v2.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
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
  const thumb = thumbnailUrl(lesson);
  const locked = lesson.state === "locked";
  const hw = homeworkLine(lesson);

  const body = (
    <>
      <div
        className={`relative aspect-video overflow-hidden rounded-xl bg-surface-2 ${
          lesson.state === "current" ? "ring-1 ring-accent" : ""
        }`}
      >
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={`object-cover transition ${
              locked ? "opacity-30 grayscale" : "group-hover:scale-[1.02]"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
            <span className="font-mono text-3xl text-border-strong">
              {String(lesson.ordinal).padStart(2, "0")}
            </span>
          </div>
        )}

        {locked && (
          <span className="absolute inset-0 grid place-items-center text-muted">
            <Lock />
          </span>
        )}

        {duration && !locked && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
            {duration}
          </span>
        )}

        {/* The watched bar, exactly where YouTube puts it. */}
        {lesson.percent > 0 && !locked && (
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
            lesson.completed && !locked
              ? "bg-progress text-progress-ink"
              : "bg-surface-2 text-muted"
          }`}
        >
          {lesson.completed && !locked ? "✓" : String(lesson.ordinal).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <h3
            className={`line-clamp-2 text-sm font-medium leading-snug ${
              locked ? "text-muted" : ""
            }`}
          >
            {lesson.title}
          </h3>
          <p className="mt-1 text-xs text-muted">{moduleTitle}</p>
          <p className="text-xs text-muted-dim">
            {statusLine(lesson)}
            {hw && (
              <>
                {" · "}
                <span className={hw.urgent ? "text-danger" : undefined}>
                  {hw.text}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );

  if (locked) {
    return (
      <div
        aria-disabled="true"
        title="Finish the lecture before this one and get its homework approved."
        className="block cursor-not-allowed select-none opacity-70"
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={`${basePath}/lessons/${lesson.id}`} className="group block">
      {body}
    </Link>
  );
}
