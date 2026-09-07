import Link from "next/link";

export default function PreviewLayout({ children }: LayoutProps<"/preview">) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border-strong bg-surface-2 px-6 py-1.5 text-center text-[11px] tracking-wide text-muted">
        PREVIEW — fixture data, no database. Nothing you type here is saved.
      </div>

      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/preview" className="text-sm font-semibold tracking-tight">
            The Project
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/preview" className="hover:text-foreground">
              Course
            </Link>
            <Link href="/preview/mentor" className="hover:text-foreground">
              Students
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
              mentor
            </span>
            <span className="text-sm text-muted">Preview User</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
