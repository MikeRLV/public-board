-- Merge city_slug variants into one canonical slug across every event row.
-- city_slug is a text[]; this rewrites any variant element to its canonical form
-- and de-dups the array. Only rows that actually contain a variant are touched.
--
-- To umbrella more duplicates later, add rows to the `canon` list, e.g.
--   ('new-york-ny', 'new-york'), ('new-york-city', 'new-york').
-- Don't add genuinely distinct cities here (e.g. henderson-nv is its own city,
-- NOT a variant of las-vegas).

with canon(variant, canonical) as (
  values
    ('las-vegas-nv', 'las-vegas')
)
update public.flyers f
set city_slug = (
  select array_agg(distinct coalesce(c.canonical, s))
  from unnest(f.city_slug) as s
  left join canon c on c.variant = s
)
where exists (
  select 1
  from unnest(f.city_slug) as s
  join canon c on c.variant = s
);
