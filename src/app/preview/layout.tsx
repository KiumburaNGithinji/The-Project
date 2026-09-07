import AppShell from "@/components/AppShell";
import { ADVANCED, CORE } from "@/lib/fixtures";

export default function PreviewLayout({ children }: LayoutProps<"/preview">) {
  return (
    <AppShell
      basePath="/preview"
      isMentor
      displayName="Preview User"
      modules={[
        { id: "core", title: "The Project", count: CORE.length },
        { id: "advanced", title: "Advanced", count: ADVANCED.length },
      ]}
      banner={
        <div className="border-b border-border-strong bg-surface-2 px-6 py-1.5 text-center text-[11px] tracking-wide text-muted">
          PREVIEW — fixture data, no database. Nothing you type here is saved.
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
