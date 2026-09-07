import CourseView from "@/components/views/CourseView";
import { previewModules } from "@/lib/fixtures";

export default async function PreviewCoursePage({
  searchParams,
}: PageProps<"/preview">) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";

  const modules = previewModules();
  const lessons = modules.flatMap((m) => m.lessons);

  return (
    <CourseView
      basePath="/preview"
      query={query}
      filter={filter}
      title="The Project"
      description="The full day-trading system, lecture by lecture."
      modules={modules}
      lecturesDone={lessons.filter((l) => l.completed).length}
      lecturesTotal={lessons.length}
      homeworkDone={lessons.reduce((n, l) => n + l.homeworkDone, 0)}
      homeworkTotal={lessons.reduce((n, l) => n + l.homeworkTotal, 0)}
    />
  );
}
