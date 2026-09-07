import ManageView from "@/components/views/ManageView";
import { ADVANCED, CORE } from "@/lib/fixtures";

/**
 * Preview shows the state the real course is in today: titles seeded, no
 * links yet. Thumbnails appear on the real page as soon as a link is pasted.
 */
export default function PreviewManagePage() {
  const modules = [
    {
      id: "core",
      title: "The Project",
      lessons: CORE.map((s) => ({
        id: s.slug,
        title: s.title,
        youtubeId: "REPLACE_ME",
        isPublished: false,
        durationSeconds: null,
      })),
    },
    {
      id: "advanced",
      title: "Advanced",
      lessons: ADVANCED.map((s) => ({
        id: s.slug,
        title: s.title,
        youtubeId: "REPLACE_ME",
        isPublished: false,
        durationSeconds: null,
      })),
    },
  ];

  return (
    <ManageView
      demo
      courseId="preview"
      courseTitle="The Project"
      modules={modules}
    />
  );
}
