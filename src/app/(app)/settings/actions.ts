"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManage, ROLES } from "@/lib/roles";
import type { Role } from "@/lib/types";

type Result = { ok?: true; error?: string };

/**
 * The database enforces every rule that matters — set_member_role checks the
 * caller, and a trigger on profiles blocks self-promotion and the demotion of
 * the last mentor. This check exists so someone who reaches the page anyway
 * gets a sentence instead of a raw Postgres error.
 */
async function requireStaff() {
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

  if (!canManage(profile?.role as Role | undefined))
    return { error: "Mentors and engineers only." as const };

  return { supabase, userId: user.id };
}

export async function changeRole(userId: string, role: Role): Promise<Result> {
  if (!ROLES.includes(role)) return { error: `Unknown role: ${role}` };

  const gate = await requireStaff();
  if (!gate.supabase) return { error: gate.error };

  if (userId === gate.userId) return { error: "You cannot change your own role." };

  const { error } = await gate.supabase.rpc("set_member_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCourse(
  courseId: string,
  fields: { title: string; description: string | null; isPublished: boolean },
): Promise<Result> {
  const gate = await requireStaff();
  if (!gate.supabase) return { error: gate.error };

  const title = fields.title.trim();
  if (!title) return { error: "The course needs a title." };

  const { error } = await gate.supabase
    .from("courses")
    .update({
      title,
      description: fields.description?.trim() || null,
      is_published: fields.isPublished,
    })
    .eq("id", courseId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
