import Link from "next/link";
import LectureCard from "@/components/LectureCard";
import type { CourseLessonRow, CourseViewProps } from "./types";

type Flat = { lesson: CourseLessonRow; moduleId: string; moduleTitle: string };

function matches(f: Flat, filter: string, query: string) {
  if (query && !f.lesson.title.toLowerCase().includes(query.toLowerCase())) {
    return false;
  }
  switch (filter) {
    case "all":
      return true;
    case "in-progress":
      return f.lesson.percent > 0 && !f.lesson.completed;
    case "completed":
      return f.lesson.completed;
    case "not-started":
      return f.lesson.percent === 0;
    case "homework":
      return f.lesson.homeworkTotal > 0;
    default:
      return f.moduleId === filter;
  }
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
  query = "",
  filter = "all",
}: CourseViewProps) {
  const flat: Flat[] = modules.flatMap((m) =>
    m.lessons.map((lesson) => ({
      lesson,
      moduleId: m.id,
      moduleTitle: m.title,
    })),
  );

  const visible = flat.filter((f) => matches(f, filter, query));

  const chips = [
    { id: "all", label: "All" },
    ...modules.map((m) => ({ id: m.id, label: m.title })),
    { id: "in-progress", label: "Continue watching" },
    { id: "completed", label: "Watched" },
    { id: "not-started", label: "Not started" },
    { id: "homework", label: "Has homework" },
  ];

  const home = basePath || "/";
  const chipHref = (id: string) => {
    const parts = [id === "all" ? null : `f=${id}`, query ? `q=${encodeURIComponent(query)}` : null]
      .filter(Boolean)
      .join("&");
    return parts ? `${home}?${parts}` : home;
  };

  return (
    <div>
      {/* Chip rail — scrolls sideways on narrow screens, like YouTube's. */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {chips.map((c) => {
          const active = filter === c.id;
          return (
            <Link
              key={c.id}
              href={chipHref(c.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-foreground font-medium text-background"
                  : "bg-surface-2 text-foreground hover:bg-border"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && !query && (
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          )}
          {query && (
            <p className="mt-0.5 text-sm text-muted">
              {visible.length} result{visible.length === 1 ? "" : "s"} for “{query}”
            </p>
          )}
        </div>

        <div className="flex gap-6 font-mono text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-dim">
              lectures
            </div>
            <div>
              {lecturesDone}
              <span className="text-muted-dim">/{lecturesTotal}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-dim">
              homework
            </div>
            <div>
              {homeworkDone}
              <span className="text-muted-dim">/{homeworkTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          {query
            ? `No lectures match “${query}”.`
            : "Nothing here yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((f) => (
            <LectureCard
              key={f.lesson.id}
              lesson={f.lesson}
              moduleTitle={f.moduleTitle}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
