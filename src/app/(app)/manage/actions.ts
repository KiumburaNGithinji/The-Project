"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseYouTubeId } from "@/lib/youtube";

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

  if (profile?.role !== "mentor") return { error: "Mentors only." as const };
  return { supabase };
}

function done(): Result {
  revalidatePath("/", "layout");
  return { ok: true };
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

  const { error } = await gate.supabase!
    .from("lessons")
    .update({ is_published: isPublished })
    .eq("id", lessonId);

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

/** Swap positions with the neighbour above or below, within the module. */
export async function moveLesson(
  lessonId: string,
  direction: "up" | "down",
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  const supabase = gate.supabase!;

  const { data: self } = await supabase
    .from("lessons")
    .select("id, module_id, position")
    .eq("id", lessonId)
    .maybeSingle();

  if (!self) return { error: "Lecture not found." };

  const { data: neighbour } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("module_id", self.module_id)
    [direction === "up" ? "lt" : "gt"]("position", self.position)
    .order("position", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();

  if (!neighbour) return { ok: true }; // already at the end

  const [a, b] = await Promise.all([
    supabase.from("lessons").update({ position: neighbour.position }).eq("id", self.id),
    supabase.from("lessons").update({ position: self.position }).eq("id", neighbour.id),
  ]);

  const err = a.error ?? b.error;
  return err ? { error: err.message } : done();
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export async function addModule(
  courseId: string,
  title: string,
): Promise<Result> {
  const gate = await requireMentor();
  if (gate.error) return { error: gate.error };
  if (!title.trim()) return { error: "Give the section a title." };

  const { data: last } = await gate.supabase!
    .from("modules")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await gate.supabase!.from("modules").insert({
    course_id: courseId,
    title: title.trim(),
    position: (last?.position ?? 0) + 1,
  });

  return error ? { error: error.message } : done();
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

  const { error } = await gate.supabase!
    .from("modules")
    .delete()
    .eq("id", moduleId);

  return error ? { error: error.message } : done();
}
