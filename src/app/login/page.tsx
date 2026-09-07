"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  missing_code: "Discord did not send us back a login code. Try again.",
  exchange_failed: "We could not complete that sign-in. Try again.",
};

function LoginForm() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const error = params.get("error");
  const next = params.get("next") ?? "/";

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        // `guilds` lets us confirm the student is in the mentor's server.
        scopes: "identify email guilds",
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">The Project</h1>
        <p className="mt-2 text-sm text-muted">
          Lectures, homework, and your progress through the strategy.
        </p>

        {error && (
          <p className="mt-6 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm">
            {ERRORS[error] ?? "Something went wrong signing you in."}
          </p>
        )}

        <button
          onClick={signIn}
          disabled={busy}
          className="mt-8 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? "Redirecting…" : "Continue with Discord"}
        </button>

        <p className="mt-4 text-xs text-muted-dim">
          Use the same Discord account you use in the server.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
