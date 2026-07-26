-- Read-path indexes for the calendar query, which filters every month view by
--   event_date (range)  +  city_slug (array contains)  and embeds flyer_tags.
-- Without these, each month view seq-scans the whole flyers table and re-joins
-- tags row by row. These make "events already in the DB" load fast, and keep it
-- fast as the table grows. Safe to run repeatedly (IF NOT EXISTS).

-- Month-window filter: WHERE event_date >= … AND event_date < …
create index if not exists idx_flyers_event_date
  on public.flyers (event_date);

-- LoCAL filter: WHERE city_slug @> '{new-york}' (array containment needs GIN)
create index if not exists idx_flyers_city_slug_gin
  on public.flyers using gin (city_slug);

-- The flyer_tags(vote_count, tags(name)) embed joins on flyer_id per row.
create index if not exists idx_flyer_tags_flyer_id
  on public.flyer_tags (flyer_id);
