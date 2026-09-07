/**
 * Fixture data for the /preview walkthrough — real lecture names from the
 * Discord, invented progress. Nothing here touches Supabase.
 */
import type { Assignment, QuizQuestion, Submission } from "@/lib/types";
import type {
  CourseModuleRow,
  RosterRow,
  StudentLectureRow,
  StudentSubmissionRow,
} from "@/components/views/types";

export const PREVIEW_VIDEO = "PREVIEW";

type Seed = { slug: string; title: string; minutes: number };

export const CORE: Seed[] = [
  { slug: "before-you-begin", title: "Before You Begin", minutes: 9 },
  { slug: "the-beginning", title: "The Beginning", minutes: 14 },
  { slug: "candles-timeframes", title: "Candles & Timeframes", minutes: 22 },
  { slug: "trends", title: "Trends", minutes: 18 },
  { slug: "displacement", title: "Displacement", minutes: 26 },
  { slug: "accumulation", title: "Accumulation", minutes: 31 },
  { slug: "liquidity", title: "Liquidity", minutes: 38 },
  { slug: "manipulation", title: "Manipulation", minutes: 29 },
  { slug: "ranges", title: "Ranges", minutes: 24 },
  { slug: "internal-manipulation", title: "Internal Manipulation", minutes: 33 },
  { slug: "confirmation", title: "Confirmation", minutes: 21 },
  { slug: "continuations", title: "Continuations", minutes: 27 },
  { slug: "entries-sl-tp", title: "Entries, SL & TP", minutes: 42 },
  { slug: "sessions", title: "Sessions", minutes: 19 },
  { slug: "checklist", title: "Checklist", minutes: 12 },
  { slug: "order-blocks", title: "Order Blocks", minutes: 35 },
  { slug: "start-of-many", title: "Start of Many", minutes: 23 },
  { slug: "amd", title: "AMD", minutes: 40 },
  { slug: "news", title: "News", minutes: 16 },
  { slug: "structure", title: "Structure", minutes: 28 },
  { slug: "entry-triggers", title: "Entry Triggers", minutes: 31 },
  { slug: "htf", title: "HTF", minutes: 25 },
  { slug: "narrative", title: "Narrative", minutes: 34 },
  { slug: "protection", title: "Protection", minutes: 20 },
  { slug: "identification", title: "Identification", minutes: 26 },
  { slug: "conclusion", title: "Conclusion", minutes: 11 },
];

export const ADVANCED: Seed[] = [
  { slug: "amd-v2", title: "AMD v2", minutes: 44 },
  { slug: "entry-models", title: "Entry Models", minutes: 51 },
];

/** Deterministic pretend progress: the first stretch done, one mid-lecture. */
function fakeProgress(index: number): { percent: number; completed: boolean } {
  if (index < 9) return { percent: 100, completed: true };
  if (index === 9) return { percent: 41, completed: false };
  if (index === 10) return { percent: 8, completed: false };
  return { percent: 0, completed: false };
}

const HOMEWORK_ON = new Set([
  "candles-timeframes",
  "liquidity",
  "entries-sl-tp",
  "checklist",
  "amd",
]);

export const ALL: Seed[] = [...CORE, ...ADVANCED];

export function previewModules(): CourseModuleRow[] {
  const build = (seeds: Seed[], offset: number, ordinalBase: number) =>
    seeds.map((s, i) => {
      const p = fakeProgress(i + offset);
      const hasHw = HOMEWORK_ON.has(s.slug);
      return {
        id: s.slug,
        title: s.title,
        youtubeId: PREVIEW_VIDEO,
        ordinal: ordinalBase + i + 1,
        durationSeconds: s.minutes * 60,
        percent: p.percent,
        completed: p.completed,
        homeworkTotal: hasHw ? (s.slug === "liquidity" ? 4 : 1) : 0,
        homeworkDone: hasHw && p.completed ? (s.slug === "liquidity" ? 2 : 1) : 0,
      };
    });

  return [
    {
      id: "core",
      title: "The Project",
      description: "The full system, in order.",
      lessons: build(CORE, 0, 0),
    },
    {
      id: "advanced",
      title: "Advanced",
      description: "Refinements once the core is second nature.",
      lessons: build(ADVANCED, 99, CORE.length),
    },
  ];
}

/** The liquidity lecture carries one of each homework kind, to show all four. */
export function previewAssignments(lessonSlug: string): Assignment[] {
  if (lessonSlug !== "liquidity") {
    if (!HOMEWORK_ON.has(lessonSlug)) return [];
    return [
      {
        id: `${lessonSlug}-hw`,
        course_id: "preview",
        lesson_id: lessonSlug,
        kind: "checkbox",
        title: "Watch and take notes",
        instructions: "Mark this off once you've been through the lecture twice.",
        position: 1,
        due_at: null,
        pass_score: null,
      },
    ];
  }

  return [
    {
      id: "liq-screens",
      course_id: "preview",
      lesson_id: "liquidity",
      kind: "screenshot",
      title: "Mark up three liquidity sweeps",
      instructions:
        "Find three sweeps on the 5m from last week. Mark the pool that got taken and where price went after. Upload the charts.",
      position: 1,
      due_at: null,
      pass_score: null,
    },
    {
      id: "liq-journal",
      course_id: "preview",
      lesson_id: "liquidity",
      kind: "journal",
      title: "Trade journal — one liquidity setup",
      instructions:
        "Write up one setup you took or passed on. Thesis, entry, stop, target, and what you'd do differently.",
      position: 2,
      due_at: null,
      pass_score: null,
    },
    {
      id: "liq-quiz",
      course_id: "preview",
      lesson_id: "liquidity",
      kind: "quiz",
      title: "Liquidity concepts check",
      instructions: null,
      position: 3,
      due_at: null,
      pass_score: 70,
    },
    {
      id: "liq-check",
      course_id: "preview",
      lesson_id: "liquidity",
      kind: "checkbox",
      title: "Re-watch before the next lecture",
      instructions: null,
      position: 4,
      due_at: null,
      pass_score: null,
    },
  ];
}

export const PREVIEW_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Where does resting liquidity most often sit?",
    options: [
      "Above equal highs and below equal lows",
      "At the midpoint of the daily range",
      "Wherever volume is thinnest",
      "At the open of the London session",
    ],
    position: 1,
  },
  {
    id: "q2",
    prompt: "A sweep that immediately reverses with displacement suggests…",
    options: [
      "The move was engineered to take liquidity, not to continue",
      "The trend has confirmed and will continue",
      "Nothing — sweeps are random",
      "A news release is imminent",
    ],
    position: 2,
  },
];

export const PREVIEW_SUBMISSIONS: Record<string, Submission | null> = {
  "liq-journal": {
    id: "sub-journal",
    assignment_id: "liq-journal",
    user_id: "preview-student",
    status: "reviewed",
    journal_text:
      "NQ, Tuesday London. Equal highs sat just above the Asia range so I waited for the sweep rather than chasing the break. Took the entry on the 1m displacement back inside, stop above the wick, first target at the opposing low.\n\nSized too small — I was still second-guessing the read, so a good call only paid a third of what it should have.",
    screenshot_paths: [],
    quiz_score: null,
    quiz_total: null,
    is_checked: false,
    mentor_feedback:
      "Read was right and the patience was right. The size is the whole lesson here — if the thesis is clear enough to write up this cleanly, it's clear enough to size properly. Do the same setup at full size next week and journal how it felt.",
    submitted_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  "liq-check": {
    id: "sub-check",
    assignment_id: "liq-check",
    user_id: "preview-student",
    status: "submitted",
    journal_text: null,
    screenshot_paths: [],
    quiz_score: null,
    quiz_total: null,
    is_checked: true,
    mentor_feedback: null,
    submitted_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
};

const NAMES = [
  "Andre Whitfield",
  "Bianca Ortiz",
  "Curtis Nwosu",
  "Dara Halvorsen",
  "Emeka Boateng",
  "Priya Raman",
  "Tomas Lindqvist",
];

export function previewRoster(): RosterRow[] {
  const days = [0, 1, 2, 5, 9, 21, 44];
  return NAMES.map((name, i) => ({
    user_id: `student-${i + 1}`,
    username: name.toLowerCase().replace(/\s+/g, ""),
    full_name: name,
    lessons_total: ALL.length,
    lessons_completed: [26, 19, 14, 11, 9, 4, 1][i],
    assignments_total: 8,
    assignments_submitted: [8, 6, 5, 3, 3, 1, 0][i],
    last_active_at: new Date(Date.now() - days[i] * 86_400_000).toISOString(),
  }));
}

export function previewStudent(id: string) {
  const idx = Math.max(0, NAMES.findIndex((_, i) => `student-${i + 1}` === id));
  const done = [26, 19, 14, 11, 9, 4, 1][idx] ?? 5;

  const lectures: StudentLectureRow[] = ALL.slice(0, done + 2).map((s, i) => ({
    lessonId: s.slug,
    title: s.title,
    percent: i < done ? 100 : i === done ? 47 : 6,
    completed: i < done,
  }));

  const submissions: StudentSubmissionRow[] = [
    {
      id: "sub-journal",
      assignmentTitle: "Trade journal — one liquidity setup",
      kind: "journal",
      submittedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      journalText: PREVIEW_SUBMISSIONS["liq-journal"]!.journal_text,
      quizScore: null,
      quizTotal: null,
      isChecked: false,
      mentorFeedback: PREVIEW_SUBMISSIONS["liq-journal"]!.mentor_feedback,
      screenshotUrls: [],
    },
    {
      id: "sub-quiz",
      assignmentTitle: "Liquidity concepts check",
      kind: "quiz",
      submittedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      journalText: null,
      quizScore: 100,
      quizTotal: 2,
      isChecked: false,
      mentorFeedback: null,
      screenshotUrls: [],
    },
    {
      id: "sub-check2",
      assignmentTitle: "Re-watch before the next lecture",
      kind: "checkbox",
      submittedAt: new Date(Date.now() - 86_400_000).toISOString(),
      journalText: null,
      quizScore: null,
      quizTotal: null,
      isChecked: true,
      mentorFeedback: null,
      screenshotUrls: [],
    },
  ];

  return { name: NAMES[idx] ?? "Student", lectures, submissions };
}
