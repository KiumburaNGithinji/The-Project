import type { Role } from "@/lib/types";

export const ROLES: Role[] = ["student", "mentor", "engineer"];

/**
 * Mentor and engineer hold identical power over the course; only the label
 * differs. Every guard in the app asks this rather than comparing to "mentor",
 * so the two stay interchangeable in access and distinct in what students see.
 */
export function canManage(role: Role | null | undefined): boolean {
  return role === "mentor" || role === "engineer";
}

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  mentor: "Mentor",
  engineer: "Engineer",
};

export const ROLE_BLURBS: Record<Role, string> = {
  student: "Watches lectures, submits homework.",
  mentor: "Runs the course. Shown to students as the mentor.",
  engineer: "Same access as a mentor. Not presented to students as one.",
};
