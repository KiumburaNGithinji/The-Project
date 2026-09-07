import type {
  Assignment,
  QuizQuestion,
  Role,
  Submission,
  SubmissionStatus,
} from "@/lib/types";

/**
 * Where a lecture sits on the pathway. "current" is the one lecture a student
 * is allowed to work on; everything before it is replayable, everything after
 * is shut until its homework is approved.
 */
export type LessonState = "done" | "current" | "locked";

export type CourseLessonRow = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailPath: string | null;
  /** 1-based position across the whole course, shown on the card. */
  ordinal: number;
  durationSeconds: number | null;
  percent: number;
  completed: boolean;
  homeworkTotal: number;
  /** Approved by the mentor — not merely handed in. */
  homeworkDone: number;
  state: LessonState;
  homeworkPending: number;
  homeworkReturned: number;
  /** 24h after the lecture was finished, while homework is outstanding. */
  dueAt: string | null;
  overdue: boolean;
};

export type CourseModuleRow = {
  id: string;
  title: string;
  description: string | null;
  lessons: CourseLessonRow[];
  /** Topics nested inside this section, e.g. "Manipulation" -> Pt 1, Pt 2. */
  children: CourseModuleRow[];
};

export type CourseViewProps = {
  title: string;
  description: string | null;
  modules: CourseModuleRow[];
  lecturesDone: number;
  lecturesTotal: number;
  homeworkDone: number;
  homeworkTotal: number;
  /** "" for the real app, "/preview" for the fixture walkthrough. */
  basePath?: string;
  /** Free-text search from the top bar. */
  query?: string;
  /** Active filter chip: "all", a module id, or a progress state. */
  filter?: string;
};

export type LessonViewProps = {
  basePath?: string;
  demo?: boolean;
  moduleTitle: string;
  lesson: {
    id: string;
    title: string;
    description: string | null;
    youtubeId: string;
  };
  startAt: number;
  percent: number;
  complete: boolean;
  assignments: Assignment[];
  submissions: Record<string, Submission | null>;
  questions: Record<string, QuizQuestion[]>;
  screenshotUrls: Record<string, string[]>;
  userId: string;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  /** The pathway has not opened it yet — shown, but not a link. */
  nextLocked?: boolean;
};

export type RosterRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  lessons_total: number;
  lessons_completed: number;
  assignments_total: number;
  assignments_submitted: number;
  /** Handed in and waiting on the mentor. Nobody advances until it clears. */
  awaiting_review: number;
  last_active_at: string | null;
};

export type MentorRosterViewProps = {
  students: RosterRow[];
  basePath?: string;
};

export type StudentLectureRow = {
  lessonId: string;
  title: string;
  percent: number;
  completed: boolean;
};

export type StudentSubmissionRow = {
  id: string;
  status: SubmissionStatus;
  assignmentTitle: string;
  kind: Assignment["kind"];
  submittedAt: string;
  journalText: string | null;
  quizScore: number | null;
  quizTotal: number | null;
  isChecked: boolean;
  mentorFeedback: string | null;
  screenshotUrls: string[];
};

export type StudentDetailViewProps = {
  basePath?: string;
  demo?: boolean;
  name: string;
  lectures: StudentLectureRow[];
  submissions: StudentSubmissionRow[];
};

export type ManageLesson = {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailPath: string | null;
  isPublished: boolean;
  durationSeconds: number | null;
  homeworkCount: number;
};

export type ManageModule = {
  id: string;
  title: string;
  lessons: ManageLesson[];
  children: ManageModule[];
};

/** Flat list of every section and topic, for the "move to" picker. */
export type MoveTarget = { id: string; label: string };

export type ManageViewProps = {
  courseId: string;
  courseTitle: string;
  modules: ManageModule[];
  moveTargets: MoveTarget[];
  demo?: boolean;
};

export type AdminQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
};

export type AdminAssignment = {
  id: string;
  kind: import("@/lib/types").AssignmentKind;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  passScore: number | null;
  questions: AdminQuestion[];
  submissionCount: number;
};

export type HomeworkAdminViewProps = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  assignments: AdminAssignment[];
  demo?: boolean;
};

export type MemberRow = {
  id: string;
  username: string | null;
  fullName: string | null;
  discordId: string | null;
  role: Role;
  enrolled: boolean;
  joinedAt: string;
};

export type SettingsTab = "members" | "course";

export type SettingsViewProps = {
  basePath?: string;
  demo?: boolean;
  tab: SettingsTab;
  /** Whoever is looking — they cannot change their own role. */
  viewerId: string;
  members: MemberRow[];
  course: {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
  };
};
