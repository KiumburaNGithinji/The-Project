import { notFound } from "next/navigation";
import LessonView from "@/components/views/LessonView";
import {
  ADVANCED,
  ALL,
  CORE,
  PREVIEW_QUESTIONS,
  PREVIEW_SUBMISSIONS,
  PREVIEW_VIDEO,
  previewAssignments,
  previewModules,
} from "@/lib/fixtures";

export default async function PreviewLessonPage({
  params,
}: PageProps<"/preview/lessons/[id]">) {
  const { id } = await params;
  const seed = ALL.find((s) => s.slug === id);
  if (!seed) notFound();

  const inAdvanced = ADVANCED.some((s) => s.slug === id);
  const siblings = inAdvanced ? ADVANCED : CORE;
  const idx = siblings.findIndex((s) => s.slug === id);

  const row = previewModules()
    .flatMap((m) => m.lessons)
    .find((l) => l.id === id);

  const assignments = previewAssignments(id);
  const questions = Object.fromEntries(
    assignments.filter((a) => a.kind === "quiz").map((a) => [a.id, PREVIEW_QUESTIONS]),
  );

  return (
    <LessonView
      basePath="/preview"
      demo
      moduleTitle={inAdvanced ? "Advanced" : "The Project"}
      lesson={{
        id: seed.slug,
        title: seed.title,
        description: null,
        youtubeId: PREVIEW_VIDEO,
      }}
      startAt={0}
      percent={row?.percent ?? 0}
      complete={row?.completed ?? false}
      assignments={assignments}
      submissions={PREVIEW_SUBMISSIONS}
      questions={questions}
      screenshotUrls={{}}
      userId="preview-student"
      prev={
        idx > 0
          ? { id: siblings[idx - 1].slug, title: siblings[idx - 1].title }
          : null
      }
      next={
        idx < siblings.length - 1
          ? { id: siblings[idx + 1].slug, title: siblings[idx + 1].title }
          : null
      }
    />
  );
}
