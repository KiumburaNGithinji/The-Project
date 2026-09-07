"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBar({ basePath = "" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("q") ?? "";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(q ? `${basePath || "/"}?q=${encodeURIComponent(q)}` : basePath || "/");
  }

  return (
    <form onSubmit={submit} className="flex flex-1 justify-center">
      <div className="flex w-full max-w-xl">
        {/* Uncontrolled, keyed on the URL: navigating re-seeds the box without
            an effect syncing state back and forth. */}
        <input
          key={current}
          name="q"
          defaultValue={current}
          placeholder="Search lectures"
          aria-label="Search lectures"
          className="w-full rounded-l-full border border-border bg-background px-4 py-1.5 text-sm outline-none placeholder:text-muted-dim focus:border-accent"
        />
        <button
          type="submit"
          aria-label="Search"
          className="rounded-r-full border border-l-0 border-border bg-surface-2 px-5 text-muted transition hover:bg-border hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
