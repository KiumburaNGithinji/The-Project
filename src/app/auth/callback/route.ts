import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "day-trading";

/** Is this user in the mentor's Discord server? */
async function isGuildMember(providerToken: string): Promise<boolean> {
  if (!GUILD_ID) return true; // gate disabled — enroll everyone who signs in

  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
  });
  if (!res.ok) return false;

  const guilds = (await res.json()) as Array<{ id: string }>;
  return guilds.some((g) => g.id === GUILD_ID);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Supabase redirects here with ?error=... when the provider exchange fails —
  // a bad client secret, an unverified Discord email, a rejected redirect.
  // Pass the reason through; guessing from "no code" wastes an afternoon.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    const detail = encodeURIComponent(providerError.slice(0, 300));
    return NextResponse.redirect(
      `${origin}/login?error=provider_error&detail=${detail}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    const detail = encodeURIComponent((error?.message ?? "no session").slice(0, 300));
    return NextResponse.redirect(
      `${origin}/login?error=exchange_failed&detail=${detail}`,
    );
  }

  const userId = data.session.user.id;
  const providerToken = data.session.provider_token;

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (!course) {
    return NextResponse.redirect(`${origin}/pending?reason=no_course`);
  }

  // Mentors are always in; students must be in the Discord server.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const allowed =
    profile?.role === "mentor" ||
    (providerToken ? await isGuildMember(providerToken) : !GUILD_ID);

  if (!allowed) {
    return NextResponse.redirect(`${origin}/pending?reason=not_in_guild`);
  }

  await admin
    .from("enrollments")
    .upsert(
      { user_id: userId, course_id: course.id, status: "active" },
      { onConflict: "user_id,course_id" },
    );

  return NextResponse.redirect(`${origin}${next}`);
}
