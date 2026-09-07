# The Project

Course platform for a day-trading mentorship. Replaces "unlisted YouTube links
dropped in Discord" with lectures the mentor can actually track: who watched
what, how far they got, and whether the homework came in.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **Supabase** — Postgres, Discord OAuth, row-level security, file storage
- Lectures stay on **unlisted YouTube**; the site embeds them and tracks watch
  coverage through the YouTube iframe API

## How the pieces fit

**Access.** Students sign in with Discord. If `DISCORD_GUILD_ID` is set, the
callback checks the student is a member of the mentor's server before enrolling
them; if they aren't, they land on `/pending`. Everyone starts as a `student`.

**Watch tracking.** The player records which 5-second slices of a lecture were
actually played, not elapsed time, so scrubbing to the end doesn't mark a
lecture complete. A lesson flips to complete at 90% coverage. Progress saves
every 15s, on pause, and on tab hide.

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

## Setup

1. Create a Supabase project.

2. Run the migrations in order (Supabase SQL editor, or `supabase db push`):

   ```
   supabase/migrations/20260907000000_init.sql
   supabase/migrations/20260907000100_rls.sql
   supabase/migrations/20260907000200_quiz_and_storage.sql
   ```

3. Seed a course: run `supabase/seed.sql`, then replace the `REPLACE_ME`
   `youtube_id` with a real video ID.

4. **Discord OAuth.** Create an app at
   <https://discord.com/developers/applications>, add the redirect URL Supabase
   gives you under Authentication → Providers → Discord, and paste the client ID
   and secret into Supabase. The app requests `identify email guilds`.

5. Copy `.env.example` to `.env.local` and fill it in.

6. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

7. **Promote the mentor.** Sign in once with his Discord account, then in the
   SQL editor:

   ```sql
   update public.profiles set role = 'mentor' where discord_id = 'HIS_DISCORD_ID';
   ```

## Adding lectures

There's no admin UI yet — content goes in through SQL. A lecture needs a
`module_id`, a `title`, and the `youtube_id` (the part after `?v=`). Set
`duration_seconds` if you want the runtime shown on the course page.

## Known gaps

- No admin UI for creating modules, lectures, or assignments — SQL only.
- Unlisted YouTube URLs are still shareable outside the site. Playback is
  isolated in `LessonPlayer`, so swapping to signed-URL hosting (Cloudflare
  Stream, Mux) is a contained change if that becomes a problem.
- No email or Discord notifications when homework is submitted or reviewed.
- No payments.
