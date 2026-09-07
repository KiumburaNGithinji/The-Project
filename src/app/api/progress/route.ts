import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    lessonId?: string;
    lastPositionSeconds?: number;
    watchedSeconds?: number;
    percentWatched?: number;
    completed?: boolean;
    durationSeconds?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { lessonId, percentWatched } = body;
  if (!lessonId || typeof percentWatched !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const percent = Math.max(0, Math.min(100, percentWatched));

  // Only stamp completed_at the first time, so re-watching never clears it.
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed_at, percent_watched")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      last_position_seconds: Math.max(0, Math.floor(body.lastPositionSeconds ?? 0)),
      watched_seconds: Math.max(0, Math.floor(body.watchedSeconds ?? 0)),
      // Never let a fresh session walk the bar backwards.
      percent_watched: Math.max(percent, existing?.percent_watched ?? 0),
      completed_at:
        existing?.completed_at ?? (body.completed ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Record the lecture's runtime the first time anyone watches it. Students
  // cannot write to `lessons` under RLS, so this one field goes through the
  // service role — and only when the column is still empty.
  const duration = Math.round(body.durationSeconds ?? 0);
  if (duration > 0) {
    const admin = createAdminClient();
    await admin
      .from("lessons")
      .update({ duration_seconds: duration })
      .eq("id", lessonId)
      .is("duration_seconds", null);
  }

  return NextResponse.json({ ok: true });
}
