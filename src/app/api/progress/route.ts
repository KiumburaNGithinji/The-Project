import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Matches COMPLETE_AT in the player. */
const COMPLETE_AT_PERCENT = 90;

/**
 * How much coverage a first write may claim. The player saves every 15s, so a
 * genuine first report is small; this is generous enough for a slow start and
 * far short of a whole lecture.
 */
const FIRST_WRITE_ALLOWANCE_SECONDS = 120;

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

  // A locked lecture records nothing. Without this, the pathway is a UI
  // suggestion: anyone can POST completion for lecture 20 and walk straight in.
  const { data: open } = await supabase.rpc("lesson_open", {
    p_lesson_id: lessonId,
  });
  if (!open) {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  const reportedPercent = Math.max(0, Math.min(100, percentWatched));
  const reportedSeconds = Math.max(0, Math.floor(body.watchedSeconds ?? 0));

  // Only stamp completed_at the first time, so re-watching never clears it.
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed_at, percent_watched, watched_seconds, updated_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Coverage cannot grow faster than the clock does. The client reports what
  // it played; this decides what was plausible. 2.5x leaves room for YouTube's
  // 2x playback speed plus a late save, and nothing beyond that is honest —
  // a forged payload claiming a whole lecture arrives all at once.
  const previous = existing?.watched_seconds ?? 0;
  const sinceLastWrite = existing?.updated_at
    ? (Date.now() - new Date(existing.updated_at).getTime()) / 1000
    : 0;
  const ceiling = existing
    ? previous + sinceLastWrite * 2.5 + 15
    : FIRST_WRITE_ALLOWANCE_SECONDS;

  const watchedSeconds = Math.min(reportedSeconds, Math.floor(Math.max(previous, ceiling)));

  // Scale the percentage by however much of the claim survived, so the bar and
  // the seconds always tell the same story.
  const scale = reportedSeconds > 0 ? watchedSeconds / reportedSeconds : 1;
  const percent = Math.max(0, Math.min(100, reportedPercent * scale));
  const done = percent >= COMPLETE_AT_PERCENT;

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      last_position_seconds: Math.max(0, Math.floor(body.lastPositionSeconds ?? 0)),
      watched_seconds: watchedSeconds,
      // Never let a fresh session walk the bar backwards.
      percent_watched: Math.max(percent, existing?.percent_watched ?? 0),
      completed_at:
        existing?.completed_at ?? (done ? new Date().toISOString() : null),
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
