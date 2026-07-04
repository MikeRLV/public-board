-- available_locals: the canonical list of LoCALs offered in the UI.
--
-- Unions the curated `weighted_locals` with every distinct city_slug that has
-- events in `flyers`, so any city present in the data shows up automatically,
-- ordered by how much is going on there.
--
-- A `canon` map folds slug variants under one umbrella (e.g. las-vegas-nv ->
-- las-vegas) so a stray variant never appears as a separate selectable local.
-- Keep this list in sync with sql/merge_city_slugs.sql. Add variant->canonical
-- pairs as needed; do NOT add genuinely distinct cities.
--
-- 'test' is excluded as obvious noise — extend the NOT IN list to hide others.

create or replace view public.available_locals as
with canon(variant, canonical) as (
  values
    ('las-vegas-nv', 'las-vegas')
),
from_flyers as (
  select coalesce(c.canonical, s) as name, count(*)::int as weight
  from public.flyers f
  cross join lateral unnest(f.city_slug) as s
  left join canon c on c.variant = s
  where s is not null and s <> '' and s not in ('test')
  group by coalesce(c.canonical, s)
),
unioned as (
  select name, weight from from_flyers
  union all
  select coalesce(c.canonical, wl.name) as name, coalesce(wl.weight, 0)::int
  from public.weighted_locals wl
  left join canon c on c.variant = wl.name
)
select name, sum(weight)::int as weight
from unioned
group by name;

grant select on public.available_locals to anon, authenticated;
notify pgrst, 'reload schema';
