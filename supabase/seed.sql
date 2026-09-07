-- Starting content, mirroring the Discord channel structure.
--
-- Safe to run more than once. Every insert is guarded by a NOT EXISTS check
-- rather than ON CONFLICT, because there is no unique constraint on module or
-- lesson titles — ON CONFLICT would silently duplicate the whole course on a
-- second run.
--
-- Lectures land unpublished with youtube_id = 'REPLACE_ME'. Paste the links in
-- the app at /manage and flip each one Live; nothing reaches students until
-- you do. To see what is still outstanding:
--   select title from public.lessons where youtube_id = 'REPLACE_ME';

-- ---------------------------------------------------------------------------
-- Course
-- ---------------------------------------------------------------------------
insert into public.courses (slug, title, description, is_published)
values (
  'day-trading',
  'The Project',
  'The full day-trading system, lecture by lecture.',
  true
)
on conflict (slug) do nothing;   -- courses.slug is unique, so this one is safe

-- ---------------------------------------------------------------------------
-- Sections
-- ---------------------------------------------------------------------------
insert into public.modules (course_id, title, description, position)
select c.id, m.title, m.description, m.position
from (select id from public.courses where slug = 'day-trading') c
cross join (values
  ('The Project', 'The full system, in order.',                  1),
  ('Advanced',    'Refinements once the core is second nature.', 2)
) as m(title, description, position)
where not exists (
  select 1 from public.modules x
  where x.course_id = c.id and x.title = m.title and x.parent_id is null
);

-- ---------------------------------------------------------------------------
-- Core lectures — the #the-project channels, in Discord order
-- ---------------------------------------------------------------------------
insert into public.lessons (module_id, title, youtube_id, position, is_published)
select m.id, l.title, 'REPLACE_ME', l.position, false
from (
  select mo.id
  from public.modules mo
  join public.courses co on co.id = mo.course_id
  where co.slug = 'day-trading' and mo.title = 'The Project' and mo.parent_id is null
  limit 1
) m
cross join (values
  ('Before You Begin',       1),
  ('The Beginning',          2),
  ('Candles & Timeframes',   3),
  ('Trends',                 4),
  ('Displacement',           5),
  ('Accumulation',           6),
  ('Liquidity',              7),
  ('Manipulation',           8),
  ('Ranges',                 9),
  ('Internal Manipulation', 10),
  ('Confirmation',          11),
  ('Continuations',         12),
  ('Entries, SL & TP',      13),
  ('Sessions',              14),
  ('Checklist',             15),
  ('Order Blocks',          16),
  ('Start of Many',         17),
  ('AMD',                   18),
  ('News',                  19),
  ('Structure',             20),
  ('Entry Triggers',        21),
  ('HTF',                   22),
  ('Narrative',             23),
  ('Protection',            24),
  ('Identification',        25),
  ('Conclusion',            26)
) as l(title, position)
where not exists (
  select 1 from public.lessons x where x.module_id = m.id and x.title = l.title
);

-- ---------------------------------------------------------------------------
-- Advanced lectures
-- NOTE: the Discord channel list was cut off below #entry-models — add the
-- rest here, or just create them at /manage.
-- ---------------------------------------------------------------------------
insert into public.lessons (module_id, title, youtube_id, position, is_published)
select m.id, l.title, 'REPLACE_ME', l.position, false
from (
  select mo.id
  from public.modules mo
  join public.courses co on co.id = mo.course_id
  where co.slug = 'day-trading' and mo.title = 'Advanced' and mo.parent_id is null
  limit 1
) m
cross join (values
  ('AMD v2',       1),
  ('Entry Models', 2)
) as l(title, position)
where not exists (
  select 1 from public.lessons x where x.module_id = m.id and x.title = l.title
);

-- ---------------------------------------------------------------------------
-- Example homework: one of each kind, hung off the Liquidity lecture
-- ---------------------------------------------------------------------------
insert into public.assignments
  (course_id, lesson_id, kind, title, instructions, position, pass_score)
select c.id, l.id, a.kind, a.title, a.instructions, a.position, a.pass_score
from (select id from public.courses where slug = 'day-trading') c
cross join (
  select le.id
  from public.lessons le
  join public.modules mo on mo.id = le.module_id
  join public.courses co on co.id = mo.course_id
  where co.slug = 'day-trading' and le.title = 'Liquidity'
  limit 1
) l
cross join (values
  ('screenshot', 'Mark up three liquidity sweeps',
   'Find three sweeps on the 5m from last week. Mark the pool that got taken and where price went after. Upload the charts.',
   1, null::numeric),
  ('journal', 'Trade journal — one liquidity setup',
   'Write up one setup you took or passed on. Thesis, entry, stop, target, and what you''d do differently.',
   2, null),
  ('quiz', 'Liquidity concepts check', null, 3, 70),
  ('checkbox', 'Re-watch before the next lecture', null, 4, null)
) as a(kind, title, instructions, position, pass_score)
where not exists (
  select 1 from public.assignments x
  where x.course_id = c.id and x.lesson_id = l.id and x.title = a.title
);

insert into public.quiz_questions
  (assignment_id, prompt, options, correct_index, explanation, position)
select a.id, q.prompt, q.options::jsonb, q.correct_index, q.explanation, q.position
from (
  select id from public.assignments
  where title = 'Liquidity concepts check'
  limit 1
) a
cross join (values
  ('Where does resting liquidity most often sit?',
   '["Above equal highs and below equal lows","At the midpoint of the daily range","Wherever volume is thinnest","At the open of the London session"]',
   0,
   'Stops cluster beyond equal highs and lows — that is the pool price reaches for.',
   1),
  ('A sweep that immediately reverses with displacement suggests…',
   '["The move was engineered to take liquidity, not to continue","The trend has confirmed and will continue","Nothing — sweeps are random","A news release is imminent"]',
   0,
   'Displacement back through the level is the tell that the sweep was the point of the move.',
   2)
) as q(prompt, options, correct_index, explanation, position)
where not exists (
  select 1 from public.quiz_questions x
  where x.assignment_id = a.id and x.prompt = q.prompt
);
