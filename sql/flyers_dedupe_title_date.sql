-- Duplicate events = same title (ignoring case/extra spaces) on the same date.
--
-- Replaces the old "title must be unique across all dates" rule, which made a
-- recurring event (e.g. a weekly "Open Mic Night") overwrite itself each week and
-- silently dropped multi-date shows from imports.
--
-- BEFORE RUNNING: make sure nothing still upserts with on_conflict=title (the
-- Python scraper is not in this repo). Those upserts would start failing once the
-- old title constraint is gone. The site itself no longer relies on it.
--
-- Run in the Supabase SQL editor. Safe to run more than once.

-- 1. Drop any unique constraint / unique index that covers title alone.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.flyers'::regclass
      and c.contype = 'u'
      and c.conkey = array[(select attnum from pg_attribute
                            where attrelid = 'public.flyers'::regclass and attname = 'title')]
  loop
    execute format('alter table public.flyers drop constraint %I', r.conname);
  end loop;

  for r in
    select i.indexrelid::regclass::text as idx
    from pg_index i
    where i.indrelid = 'public.flyers'::regclass
      and i.indisunique and not i.indisprimary
      and i.indkey::text = (select attnum::text from pg_attribute
                            where attrelid = 'public.flyers'::regclass and attname = 'title')
  loop
    execute format('drop index %s', r.idx);
  end loop;
end $$;

-- 2. Check for existing duplicates. If this returns rows, remove or rename them
--    before step 3, or step 3 will fail.
select lower(regexp_replace(trim(title), '\s+', ' ', 'g')) as norm_title, event_date, count(*)
from public.flyers
group by 1, 2
having count(*) > 1;

-- 3. One event per (title, date).
create unique index if not exists flyers_title_date_unique
  on public.flyers (lower(regexp_replace(trim(title), '\s+', ' ', 'g')), event_date);
