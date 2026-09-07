# Supabase setup

Do these in order. The whole thing is about 20 minutes, most of it waiting for
the project to provision.

Nothing here has been executed yet — the SQL is written and statically checked
but has never run against a real Postgres. Expect to hit at least one thing;
the verification queries at the end are there to catch it early.

---

## 1. Create the Supabase project

<https://supabase.com/dashboard> → **New project**. Save the database password
somewhere; you won't be shown it again.

Once it finishes provisioning, go to **Project Settings → API** and copy:

| Value | Used as |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key bypasses every row-level security rule. It goes in
`.env.local` only — never in a `NEXT_PUBLIC_` variable, never committed.

The project ref is the subdomain of the Project URL
(`https://abcdefgh.supabase.co` → `abcdefgh`). You'll need it in step 4.

---

## 2. Create the Discord OAuth app

<https://discord.com/developers/applications> → **New Application**.

Under **OAuth2**:

1. Add a redirect URI, exactly:
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. Copy the **Client ID** and **Client Secret**.

The app requests the `identify email guilds` scope. `guilds` is what lets the
site check a student is in your Discord server — without it the membership gate
silently passes everyone.

---

## 3. Point Supabase at Discord

In the Supabase dashboard:

**Authentication → Providers → Discord** — enable it, paste the client ID and
secret from step 2.

**Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/auth/callback`

When you deploy, add the production origin here too. A redirect URL that isn't
on this list fails with a generic error and no explanation.

---

## 4. Run the migrations

Four files, **in filename order**. They're written so a repeated or partial run
replaces rather than errors, so it's safe to re-run one if you're unsure.

```
supabase/migrations/20260907000000_init.sql            tables, profile trigger
supabase/migrations/20260907000100_rls.sql             row-level security
supabase/migrations/20260907000200_quiz_and_storage.sql quiz RPCs, submissions bucket
supabase/migrations/20260907000300_groups_and_thumbnails.sql topics, thumbnails bucket
```

**Option A — CLI (preferred, tracks what has run):**

```bash
supabase link --project-ref <project-ref>
supabase db push
```

**Option B — dashboard:** SQL Editor → paste each file's contents → Run, one at
a time, in order. Don't run them all in one paste; if something fails you want
to know which file.

---

## 5. Seed the course

Run `supabase/seed.sql` the same way (`supabase db reset` runs it automatically
on a local stack; on a hosted project, paste it into the SQL Editor).

This creates the course, the two sections, and all 28 lecture titles from your
Discord. Every lecture lands **unpublished** with `youtube_id = 'REPLACE_ME'` —
nothing is visible to students until you add a link and flip it live.

The seed is safe to run more than once; every insert is guarded by a
`NOT EXISTS` check.

> **Order matters.** Seed before you first sign in. The login callback needs a
> course row to enrol you against — sign in first and you'll land on
> `/pending?reason=no_course`. Not fatal, just seed and sign in again.

---

## 6. Fill in the environment

```bash
cp .env.example .env.local
```

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From step 1. Also read at **build time** for thumbnail hosts — a build without it can't display custom thumbnails. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From step 1. |
| `SUPABASE_SERVICE_ROLE_KEY` | From step 1. Server-only. |
| `DISCORD_GUILD_ID` | **Leave blank for now** — see step 8. |
| `DEFAULT_COURSE_SLUG` | `day-trading`. Must match the seed. |

Next.js reads `.env.local` at startup, so restart `pnpm dev` after any change.

---

## 7. First sign-in, and promote the mentor

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>, sign in with Discord. You'll be created as a
`student`. To make yourself (or him) a mentor, in the SQL Editor:

```sql
-- see who exists
select id, username, discord_id, role from public.profiles;

-- promote
update public.profiles set role = 'mentor' where discord_id = 'PASTE_ID_HERE';
```

Sign out and back in. **Manage content** and **Students** appear in the sidebar.

---

## 8. Lock it to the Discord server

While `DISCORD_GUILD_ID` is blank, **anyone with a Discord account who finds the
URL can enrol themselves.** Fine while you're setting up, not fine once it's
public.

To get the ID: Discord → Settings → Advanced → enable **Developer Mode**, then
right-click your server → **Copy Server ID**. Put it in `.env.local` and restart.

Non-members now land on `/pending` instead of enrolling. Mentors bypass the
check, so you can't lock yourself out.

---

## 9. Add the lecture links

Go to **/manage**. For each lecture, paste the YouTube URL and hit Save — any
form works (`watch?v=`, `youtu.be/`, with or without tracking params). The
thumbnail previews as you type so you can confirm it's the right video.

Runtimes fill in by themselves the first time someone watches; you never type
one.

When you've linked a batch, **Publish all linked** flips them live in one go. A
lecture can't go live without a link.

---

## Verifying it worked

```sql
-- 1. every table present (expect 9)
select count(*) from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','courses','modules','lessons','enrollments',
                     'lesson_progress','assignments','quiz_questions','submissions');

-- 2. RLS on everywhere (expect 0 rows)
select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- 3. both buckets exist
select id, public from storage.buckets where id in ('submissions','thumbnails');

-- 4. seed landed (expect 2 sections, 28 lectures)
select
  (select count(*) from public.modules) as sections,
  (select count(*) from public.lessons) as lectures,
  (select count(*) from public.lessons where youtube_id = 'REPLACE_ME') as unlinked;

-- 5. the profile trigger fired for you
select id, username, role from public.profiles;

-- 6. answer keys are not student-readable (expect 1 policy, mentor-only)
select policyname, cmd from pg_policies
where tablename = 'quiz_questions';
```

If (5) is empty after signing in, the `auth.users` trigger didn't install —
re-run `20260907000000_init.sql`.

---

## Things that will bite you

- **`/pending?reason=no_course`** — the seed hasn't run, or `DEFAULT_COURSE_SLUG`
  doesn't match the seeded slug (`day-trading`).
- **Login bounces back to `/login`** — the redirect URL in step 3 doesn't match
  exactly, including scheme and port.
- **Everyone can sign up** — `DISCORD_GUILD_ID` is blank. See step 8.
- **Custom thumbnails don't render** — `NEXT_PUBLIC_SUPABASE_URL` wasn't set when
  the app was built. Rebuild with it present.
- **A student sees no lectures** — they're seeded unpublished. Link them, then
  Publish all linked.
- **Storage policy errors on run** — you're running as a role without rights on
  `storage.objects`. Use the SQL Editor (runs as `postgres`) or `supabase db push`.
