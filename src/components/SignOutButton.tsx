"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
    >
      Sign out
    </button>
  );
}
