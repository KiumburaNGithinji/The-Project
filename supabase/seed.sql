-- Minimal starting content. Replace the youtube_id values with the real
-- unlisted video IDs (the part after ?v= in the URL).

insert into public.courses (slug, title, description, is_published)
values (
  'day-trading',
  'The Strategy',
  'The full day-trading system, lecture by lecture.',
  true
)
on conflict (slug) do nothing;

with c as (select id from public.courses where slug = 'day-trading')
insert into public.modules (course_id, title, description, position)
select c.id, m.title, m.description, m.position
from c, (values
  ('Foundations',     'Market structure, sessions, and the vocabulary.', 1),
  ('The Setup',        'Identifying the pattern in real time.',           2),
  ('Risk & Execution', 'Sizing, stops, and staying alive.',               3)
) as m(title, description, position)
on conflict do nothing;

-- Example lecture + one assignment of each kind, hung off it.
with m as (
  select id from public.modules where title = 'Foundations' limit 1
)
insert into public.lessons (module_id, title, description, youtube_id, duration_seconds, position)
select m.id, 'Session opens and why they matter', null, 'REPLACE_ME', 1800, 1
from m
on conflict do nothing;
