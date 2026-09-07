"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/types";

export default function ProfileMenu({
  name,
  username,
  avatarUrl,
  role,
  basePath = "",
  demo = false,
}: {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role?: Role;
  basePath?: string;
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || username || "?").trim().charAt(0).toUpperCase();
  const home = basePath || "/";

  const item =
    "block rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground";

  async function signOut() {
    if (demo) return;
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        className="flex items-center gap-2 rounded-full border border-border p-0.5 pr-2 transition hover:border-border-strong"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 font-mono text-[11px] text-muted">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-sm text-muted sm:inline">
          {name}
        </span>
        <span aria-hidden="true" className="text-[10px] text-muted-dim">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-60 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="border-b border-border px-2 pb-2 pt-1">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {username && (
              <p className="truncate font-mono text-xs text-muted-dim">
                @{username}
              </p>
            )}
            {role && (
              <span className="mt-1.5 inline-block rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                {ROLE_LABELS[role].toLowerCase()}
              </span>
            )}
          </div>

          <nav className="mt-1.5 space-y-0.5">
            <Link href={`${home}?f=in-progress`} className={item} onClick={() => setOpen(false)}>
              Continue watching
            </Link>
            <Link href={`${home}?f=completed`} className={item} onClick={() => setOpen(false)}>
              Watched
            </Link>
            <Link href={`${home}?f=homework`} className={item} onClick={() => setOpen(false)}>
              Homework
            </Link>
          </nav>

          {/*
            Deliberately empty. Account settings, notification preferences and
            whatever else belongs to a student's own profile go here once Osman
            says what he wants — inventing them now would mean guessing at his
            course, and a menu of dead links reads worse than an honest gap.
          */}
          <div className="mt-1.5 border-t border-border px-2 py-2">
            <p className="text-xs text-muted-dim">
              Profile settings land here.
            </p>
          </div>

          <div className="border-t border-border pt-1.5">
            <button
              onClick={signOut}
              disabled={demo || busy}
              title={demo ? "Preview — nobody is signed in." : undefined}
              className={`w-full text-left ${item} disabled:opacity-40`}
              role="menuitem"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
