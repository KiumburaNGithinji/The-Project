import ManageView from "@/components/views/ManageView";
import { ADVANCED, CORE, TOPICS, previewAssignments } from "@/lib/fixtures";
import type { ManageModule, MoveTarget } from "@/components/views/types";

/**
 * Preview shows the state the real course is in today: titles seeded, no
 * links yet. Thumbnails appear on the real page as soon as a link is pasted.
 */
export default function PreviewManagePage() {
  const blank = (s: { slug: string; title: string }) => ({
    id: s.slug,
    title: s.title,
    youtubeId: "REPLACE_ME",
    thumbnailPath: null,
    isPublished: false,
    durationSeconds: null,
    homeworkCount: previewAssignments(s.slug).length,
  });

  const modules: ManageModule[] = [
    {
      id: "core",
      title: "The Project",
      lessons: CORE.map(blank),
      children: TOPICS.map((t) => ({
        id: t.id,
        title: t.title,
        lessons: t.parts.map(blank),
        children: [],
      })),
    },
    {
      id: "advanced",
      title: "Advanced",
      lessons: ADVANCED.map(blank),
      children: [],
    },
  ];

  const moveTargets: MoveTarget[] = modules.flatMap((section) => [
    { id: section.id, label: section.title },
    ...section.children.map((t) => ({
      id: t.id,
      label: `${section.title} \u203a ${t.title}`,
    })),
  ]);

  return (
    <ManageView
      demo
      courseId="preview"
      courseTitle="The Project"
      modules={modules}
      moveTargets={moveTargets}
    />
  );
}
