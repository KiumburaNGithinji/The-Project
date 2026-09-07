export type Role = "student" | "mentor";
export type AssignmentKind = "screenshot" | "journal" | "quiz" | "checkbox";
export type SubmissionStatus = "draft" | "submitted" | "reviewed";

export type Profile = {
  id: string;
  discord_id: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  duration_seconds: number | null;
  position: number;
  is_published: boolean;
};

export type LessonProgress = {
  lesson_id: string;
  last_position_seconds: number;
  percent_watched: number;
  completed_at: string | null;
};

export type Assignment = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  kind: AssignmentKind;
  title: string;
  instructions: string | null;
  position: number;
  due_at: string | null;
  pass_score: number | null;
};

export type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  status: SubmissionStatus;
  journal_text: string | null;
  screenshot_paths: string[];
  quiz_score: number | null;
  quiz_total: number | null;
  is_checked: boolean;
  mentor_feedback: string | null;
  submitted_at: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
};

export type QuizResult = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  results: Array<{
    question_id: string;
    selected: number | null;
    correct: boolean;
    correct_index: number;
    explanation: string | null;
  }>;
};
