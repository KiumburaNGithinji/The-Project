"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Marks first-run done. The "update own profile" policy covers this, and the
 * role-change trigger stays out of the way because role is untouched.
 */
export async function completeOnboarding(): Promise<{
  ok?: true;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}
