import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import SearchBar from "@/components/SearchBar";
import { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/types";

type NavModule = {
  id: string;
  title: string;
  count: number;
  children?: NavModule[];
};

export default function AppShell({
  basePath = "",
  isStaff,
  role,
  displayName,
  modules,
  banner,
  right,
  children,
}: {
  basePath?: string;
  isStaff: boolean;
  /** Drives the badge only — access is decided by isStaff. */
  role?: Role;
  displayName: string;
  modules: NavModule[];
  banner?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  const home = basePath || "/";

  const navLink =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-surface-2";
  const subLink =
    "flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground";

  return (
    <div className="flex min-h-full flex-col">
      {banner}

      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-2">
          <Link
            href={home}
            className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-xs text-accent-ink">
              TP
            </span>
            <span className="hidden sm:inline">The Project</span>
          </Link>

          <Suspense fallback={<div className="flex-1" />}>
            <SearchBar basePath={basePath} />
          </Suspense>

          <div className="flex shrink-0 items-center gap-3">
            {isStaff && role && (
              <span className="hidden rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted sm:inline">
                {ROLE_LABELS[role].toLowerCase()}
              </span>
            )}
            <span className="hidden text-sm text-muted md:inline">{displayName}</span>
            {right}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border p-3 lg:block">
          <nav className="space-y-1">
            <Link href={home} className={navLink}>
              <span aria-hidden="true">▦</span> Course
            </Link>
          </nav>

          {isStaff && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 pb-1 text-xs font-medium text-muted">Staff</p>
              <nav className="space-y-0.5">
                <Link href={`${basePath}/mentor`} className={subLink}>
                  <span>Students</span>
                </Link>
                <Link href={`${basePath}/manage`} className={subLink}>
                  <span>Content</span>
                </Link>
                <Link href={`${basePath}/settings`} className={subLink}>
                  <span>Settings</span>
                </Link>
              </nav>
            </>
          )}

          <div className="my-3 border-t border-border" />

          <p className="px-3 pb-1 text-xs font-medium text-muted">Modules</p>
          <nav className="space-y-0.5">
            {modules.map((m) => (
              <div key={m.id}>
                <Link href={`${home}?f=${m.id}`} className={subLink}>
                  <span className="truncate">{m.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-dim">
                    {m.count}
                  </span>
                </Link>
                {(m.children ?? []).map((t) => (
                  <Link
                    key={t.id}
                    href={`${home}?f=${t.id}`}
                    className={`${subLink} pl-6 text-xs`}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-dim">
                      {t.count}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="my-3 border-t border-border" />

          <p className="px-3 pb-1 text-xs font-medium text-muted">You</p>
          <nav className="space-y-0.5">
            <Link href={`${home}?f=in-progress`} className={subLink}>
              <span>Continue watching</span>
            </Link>
            <Link href={`${home}?f=completed`} className={subLink}>
              <span>Watched</span>
            </Link>
            <Link href={`${home}?f=homework`} className={subLink}>
              <span>Homework</span>
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
