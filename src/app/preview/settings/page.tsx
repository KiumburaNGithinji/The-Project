import SettingsView from "@/components/views/SettingsView";
import { MEMBERS, PREVIEW_VIEWER_ID } from "@/lib/fixtures";
import type { SettingsTab } from "@/components/views/types";

export default async function PreviewSettingsPage({
  searchParams,
}: PageProps<"/preview/settings">) {
  const sp = await searchParams;
  const tab: SettingsTab = sp.tab === "course" ? "course" : "members";

  return (
    <SettingsView
      basePath="/preview"
      demo
      tab={tab}
      viewerId={PREVIEW_VIEWER_ID}
      members={MEMBERS}
      course={{
        id: "preview-course",
        title: "The Project",
        description: "The full day-trading system, lecture by lecture.",
        isPublished: true,
      }}
    />
  );
}
