"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/roles";
import { hasVideo, parseYouTubeId } from "@/lib/youtube";
import { planMove, planReorder, type SwapPlan } from "@/lib/reorder";

type Result = { ok?: true; error?: string };

/**
 * RLS already restricts every write here to mentors. This check exists so a
 * student who reaches the page gets a sentence instead of a silent no-op.
 */
async function requireMentor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canManage(profile?.role))
    return { error: "Mentors and engineers only." as const };
  return { supabase };
}

function done(): Result {
  revalidatePath("/", "layout");
  return { ok: true };
}

type Client = NonNullable<Awaited<ReturnType<typeof requireMentor>>["supabase"]>;

/** Write out a reorder plan. Usually two rows; a renumber only on repair. */
async function applyPlan(
  supabase: Client,
  table: "lessons" | "modules",
  plan: SwapPlan,
): Promise<Result> {
  if (plan.kind === "none") return { ok: true };

  const rows =
    plan.kind === "swap" ? [plan.a, plan.b] : plan.rows;

  const results = await Promise.all(
    rows.map((r) =>
      supabase.from(table).update({ position: r.position }).eq("id", r.id),
    ),
  );

  const err = results.find((r) => r.error)?.error;
  return err ? { error: err.message } : done();
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

export async function setLessonVideo(
  lessonId: string,
  urlOrId: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const trimmed = urlOrId.trim();
  if (!trimmed) return { error: "Paste a YouTube link." };

  const youtubeId = parseYouTubeId(trimmed);
  if (!youtubeId) {
    return { error: "That doesn't look like a YouTube link or video ID." };
  }

  const { error } = await gate.supabase!
    .from("lessons")
    // Duration is cleared so it gets re-measured from the new video on the
    // first watch, rather than reporting the old lecture's runtime.
    .update({ youtube_id: youtubeId, duration_seconds: null })
    .eq("id", lessonId);

  return error ? { error: error.message } : done();
}

export async function renameLesson(
  lessonId: string,
  title: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Title can't be empty." };

  const { error } = await gate.supabase!
    .from("lessons")
    .update({ title: title.trim() })
    .eq("id", lessonId);

  return error ? { error: error.message } : done();
}

export async function setLessonPublished(
  lessonId: string,
  isPublished: boolean,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  // Going live without a video would show students a lecture they cannot
  // watch, so the link has to come first.
  if (isPublished) {
    const { data: lesson } = await gate.supabase!
      .from("lessons")
      .select("youtube_id")
      .eq("id", lessonId)
      .maybeSingle();

    if (!hasVideo(lesson?.youtube_id)) {
      return { error: "Add the YouTube link before going live." };
    }
  }

  const { error } = await gate.supabase!
    .from("lessons")
    .update({ is_published: isPublished })
    .eq("id", lessonId);

  return error ? { error: error.message } : done();
}

/** Flip every linked-but-hidden lecture live in one go. */
export async function publishAllLinked(courseId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: modules } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  const moduleIds = (modules ?? []).map((m) => m.id as string);
  if (moduleIds.length === 0) return { ok: true };

  const { data: candidates } = await supabase
    .from("lessons")
    .select("id, youtube_id")
    .in("module_id", moduleIds)
    .eq("is_published", false);

  const ids = (candidates ?? [])
    .filter((l) => hasVideo(l.youtube_id as string))
    .map((l) => l.id as string);

  if (ids.length === 0) {
    return { error: "Nothing to publish — link some lectures first." };
  }

  const { error } = await supabase
    .from("lessons")
    .update({ is_published: true })
    .in("id", ids);

  return error ? { error: error.message } : done();
}

export async function addLesson(
  moduleId: string,
  title: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Give the lecture a title." };

  const { data: last } = await gate.supabase!
    .from("lessons")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await gate.supabase!.from("lessons").insert({
    module_id: moduleId,
    title: title.trim(),
    youtube_id: "REPLACE_ME",
    position: (last?.position ?? 0) + 1,
    is_published: false,
  });

  return error ? { error: error.message } : done();
}

export async function deleteLesson(lessonId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const { error } = await gate.supabase!
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  return error ? { error: error.message } : done();
}

/** Drop a lecture at `toIndex` within its section or topic. */
export async function reorderLesson(
  lessonId: string,
  toIndex: number,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: self } = await supabase
    .from("lessons")
    .select("module_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (!self) return { error: "Lecture not found." };

  const { data: siblings } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("module_id", self.module_id);

  return applyPlan(
    supabase,
    "lessons",
    planReorder(siblings ?? [], lessonId, toIndex),
  );
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export async function addModule(
  courseId: string,
  title: string,
  parentId: string | null = null,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Give it a title." };

  const supabase = gate.supabase!;

  // Only two levels are offered, so a topic can never be nested in a topic.
  if (parentId) {
    const { data: parent } = await supabase
      .from("modules")
      .select("parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parent?.parent_id) {
      return { error: "Topics can't be nested inside other topics." };
    }
  }

  const query = supabase.from("modules").select("position").eq("course_id", courseId);
  const { data: last } = await (parentId
    ? query.eq("parent_id", parentId)
    : query.is("parent_id", null)
  )
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("modules").insert({
    course_id: courseId,
    parent_id: parentId,
    title: title.trim(),
    position: (last?.position ?? 0) + 1,
  });

  return error ? { error: error.message } : done();
}

/** Move a section or topic one slot among its same-level siblings. */
export async function moveModule(
  moduleId: string,
  direction: "up" | "down",
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: self } = await supabase
    .from("modules")
    .select("course_id, parent_id")
    .eq("id", moduleId)
    .maybeSingle();

  if (!self) return { error: "Not found." };

  const base = supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", self.course_id);

  const { data: siblings } = await (self.parent_id
    ? base.eq("parent_id", self.parent_id)
    : base.is("parent_id", null));

  return applyPlan(
    supabase,
    "modules",
    planMove(siblings ?? [], moduleId, direction),
  );
}

export async function renameModule(
  moduleId: string,
  title: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Title can't be empty." };

  const { error } = await gate.supabase!
    .from("modules")
    .update({ title: title.trim() })
    .eq("id", moduleId);

  return error ? { error: error.message } : done();
}

export async function deleteModule(moduleId: string): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const { count } = await gate.supabase!
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  if ((count ?? 0) > 0) {
    return { error: `Move or delete its ${count} lecture(s) first.` };
  }

  const { count: kids } = await gate.supabase!
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", moduleId);

  if ((kids ?? 0) > 0) {
    return { error: `Delete its ${kids} topic(s) first.` };
  }

  const { error } = await gate.supabase!
    .from("modules")
    .delete()
    .eq("id", moduleId);

  return error ? { error: error.message } : done();
}

/** Move a lecture into a different section or topic, at the end. */
export async function moveLessonToModule(
  lessonId: string,
  moduleId: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("lessons")
    .update({ module_id: moduleId, position: (last?.position ?? 0) + 1 })
    .eq("id", lessonId);

  return error ? { error: error.message } : done();
}

export async function setLessonThumbnail(
  lessonId: string,
  path: string | null,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };

  const supabase = gate.supabase!;

  // Clean up the file being replaced so the bucket doesn't accumulate orphans.
  const { data: existing } = await supabase
    .from("lessons")
    .select("thumbnail_path")
    .eq("id", lessonId)
    .maybeSingle();

  const { error } = await supabase
    .from("lessons")
    .update({ thumbnail_path: path })
    .eq("id", lessonId);

  if (error) return { error: error.message };

  if (existing?.thumbnail_path && existing.thumbnail_path !== path) {
    await supabase.storage.from("thumbnails").remove([existing.thumbnail_path]);
  }

  return done();
}
