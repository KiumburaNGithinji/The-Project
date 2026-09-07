import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Server-only — never import this into a client component.
 * Used for the one thing a student cannot do under RLS: enroll themselves.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
