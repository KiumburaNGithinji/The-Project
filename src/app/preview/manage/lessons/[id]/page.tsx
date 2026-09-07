import { notFound } from "next/navigation";
import HomeworkAdminView from "@/components/views/HomeworkAdminView";
import { ALL, TOPICS, ADVANCED, previewAssignments, PREVIEW_QUESTIONS } from "@/lib/fixtures";
import type { AdminAssignment } from "@/components/views/types";

export default async function PreviewLessonHomeworkPage({
  params,
}: PageProps<"/preview/manage/lessons/[id]">) {
  const { id } = await params;
  const seed = ALL.find((s) => s.slug === id);
  if (!seed) notFound();

  const topic = TOPICS.find((t) => t.parts.some((p) => p.slug === id));
  const inAdvanced = ADVANCED.some((s) => s.slug === id);

  const assignments: AdminAssignment[] = previewAssignments(id).map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    instructions: a.instructions,
    dueAt: a.due_at,
    passScore: a.pass_score,
    questions:
      a.kind === "quiz"
        ? PREVIEW_QUESTIONS.map((q, i) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            correctIndex: 0,
            explanation:
              i === 0
                ? "Stops cluster beyond equal highs and lows — that is the pool price reaches for."
                : "Displacement back through the level is the tell.",
          }))
        : [],
    submissionCount: a.kind === "journal" ? 4 : 0,
  }));

  return (
    <HomeworkAdminView
      demo
      lessonId={seed.slug}
      lessonTitle={seed.title}
      moduleTitle={
        topic
          ? `The Project › ${topic.title}`
          : inAdvanced
            ? "Advanced"
            : "The Project"
      }
      assignments={assignments}
    />
  );
}
