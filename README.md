# The Project

Course platform for a day-trading mentorship. Replaces "unlisted YouTube links
dropped in Discord" with lectures the mentor can actually track: who watched
what, how far they got, and whether the homework came in.

**Setup lives in [SETUP.md](SETUP.md).** Nothing has been run against a real
Supabase project yet.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **Supabase** — Postgres, Discord OAuth, row-level security, file storage
- Lectures stay on **unlisted YouTube**; the site embeds them and tracks watch
  coverage through the YouTube iframe API

## Try it without a database

```bash
pnpm install && pnpm dev
```

Then open <http://localhost:3000/preview> — a fixture-backed walkthrough of
every screen. No Supabase, no login, nothing saved.

`/preview`, `/preview/lessons/liquidity`, `/preview/mentor`, `/preview/manage`.

## How the pieces fit

**Access.** Students sign in with Discord. If `DISCORD_GUILD_ID` is set, the
callback checks the student is a member of the mentor's server before enrolling
them; if they aren't, they land on `/pending`. Everyone starts as a `student`.

**Structure.** Course → sections → topics → lectures. `modules` nests one level
via a nullable `parent_id`, so "Manipulation" can hold "Pt 1" and "Pt 2" while
still sitting under "The Project". Child modules keep their `course_id`, which
is why every RLS policy and the rollup view work unchanged across the nesting.

**Watch tracking.** The player records which 5-second slices of a lecture were
actually played, not elapsed time, so scrubbing to the end doesn't mark a
lecture complete. A lesson flips to complete at 90% coverage. Progress saves
every 15s, on pause, and on tab hide. Lecture runtime is measured on first watch
and backfilled, so nobody types durations.

**Homework.** Four kinds, one row per student per assignment:

| kind | what the student does |
|---|---|
| `screenshot` | uploads marked-up charts to private storage |
| `journal` | writes a trade journal entry |
| `quiz` | answers multiple choice, graded in Postgres |
| `checkbox` | self-reports completion |

Quiz answer keys never reach the browser. `quiz_questions` has no student-facing
select policy; students read questions through `get_quiz()` and are graded by
`submit_quiz()`, both `SECURITY DEFINER`.

**Oversight.** `/mentor` lists every enrolled student with lecture and homework
progress and flags anyone inactive 7+ days. `/mentor/students/[id]` shows their
per-lecture progress and every submission, with a feedback box.

**Editing.** `/manage` is the mentor's console: paste a YouTube link per lecture
(any URL form), upload a custom thumbnail, rename, reorder, move between topics,
publish/unpublish, add and delete lectures, topics and sections. No SQL.

## Layout

```
src/
  app/
    (app)/          signed-in pages: course, lesson, mentor, manage
    preview/        fixture-backed copies of the same screens
    auth/callback/  Discord OAuth exchange + guild gate + enrolment
    api/progress/   watch-progress writes, duration backfill
  components/
    views/          presentational screens, shared by (app) and preview
    manage/         mentor editor rows
  lib/
    supabase/       browser, server, admin, and proxy clients
supabase/
  migrations/       four files, run in filename order
  seed.sql          course, sections, 28 lecture titles (re-runnable)
```

The `views/` split is deliberate: the real pages fetch from Supabase and the
preview pages hand in fixtures, but both render one copy of the markup, so the
preview can't drift from the real thing.

## Known gaps

- **Nothing has run against a real database.** The SQL is statically checked
  only.
- Assignments and quiz questions are still SQL-only; the editor covers lectures,
  topics and sections.
- Unlisted YouTube URLs are still shareable outside the site. Playback is
  isolated in `LessonPlayer`, so swapping to signed-URL hosting (Cloudflare
  Stream, Mux) is a contained change.
- No notifications when homework is submitted or reviewed.
- No payments.
- The Advanced section only has the two lectures visible in the Discord
  screenshot; the list was cut off.
