import MentorRosterView from "@/components/views/MentorRosterView";
import { previewRoster } from "@/lib/fixtures";

export default function PreviewMentorPage() {
  return <MentorRosterView basePath="/preview" students={previewRoster()} />;
}
