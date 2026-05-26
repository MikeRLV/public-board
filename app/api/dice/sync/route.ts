import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Dice category tag remapping
const DICE_TAG_MAP: Record<string, string> = {
  'gig': 'live-music',
};

function pickBestImage(images: any): string {
  if (!images) return '';
  const raw = images.portrait || images.square || images.landscape || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.searchParams.delete('rect');
    return u.toString();
  } catch {
    return raw;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    if (!citySlug || !month) {
      return NextResponse.json({ error: 'citySlug and month required' }, { status: 400 });
    }

    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');

    // Supabase IS the cache — no time-based TTL.
    // Fetch the external_ids of events already stored for this city/month.
    // Any event already here is permanently cached and never re-processed.
    const { data: cachedRows } = await supabase
      .from('flyers')
      .select('external_id')
      .eq('source', 'dice')
      .eq('is_cached', true)
      .contains('city_slug', [citySlug])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`);

    const cachedIds = new Set(
      (cachedRows || []).map((r: any) => r.external_id).filter(Boolean)
    );

    // Scrape DICE (paginated weekly chunks — handles dense cities like NYC)
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-dice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: citySlug.replace(/-/g, ' '), month }),
    });

    if (!scrapeRes.ok) {
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    const allEvents: any[] = scrapeData.events || [];

    // Only process events we haven't seen before
    const newEvents = allEvents.filter((e: any) => !cachedIds.has(e.id));

    if (newEvents.length === 0) {
      return NextResponse.json({
        status: 'no_new_events',
        citySlug,
        month,
        cached: cachedIds.size,
      });
    }

    // Map new events to flyer schema
    const flyers = newEvents.map((e: any) => {
      const venue = e.venues?.[0];
      const highlights = e.about?.highlights || [];
      const ageHighlight =
        highlights.find((h: any) => h.type === 'age_restriction')?.title || '';

      const extracted = extractTags(e.about?.description, e.name, ageHighlight);
      const tags: string[] = ['dice', ...extracted];

      e.tags_types?.forEach((t: any) => {
        if (!t.name) return;
        const mapped = DICE_TAG_MAP[t.name] ?? t.name;
        if (!tags.includes(mapped)) tags.push(mapped);
      });

      const price = (() => {
        const p = e.price;
        if (!p) return 'See site';
        const min = p.amount_from ?? p.amount;
        if (!min) return 'Free';
        return `$${(min / 100).toFixed(2)}+`;
      })();

      return {
        title: e.name,
        location_name: venue?.name || 'Unknown Venue',
        city_slug: [citySlug],
        event_start: e.dates?.event_start_date,
        price,
        description: e.about?.description || '',
        image_url: pickBestImage(e.images),
        ticket_url: e.social_links?.event_share || 'https://dice.fm',
        source: 'dice',
        external_id: e.id,
        is_cached: false,
        _tags: tags,
      };
    });

    // Upsert new events then apply tags
    const upserted: any[] = [];
    for (const flyer of flyers) {
      const { _tags, ...flyerData } = flyer;
      const { data, error } = await supabase
        .from('flyers')
        .upsert({ ...flyerData, is_cached: false }, { onConflict: 'external_id' })
        .select('id, external_id')
        .single();
      if (error) console.error('Upsert failed:', error.message, flyerData.title);
      if (!error && data) upserted.push({ ...data, _tags });
    }

    if (upserted.length > 0) {
      await Promise.allSettled(
        upserted.flatMap(({ id, _tags }) =>
          (_tags || []).map((tagName: string) =>
            supabase.rpc('vote_on_tag', {
              target_flyer_id: id,
              target_tag_name: tagName,
              vote_val: 1,
              voter_id: 'dice-import',
            })
          )
        )
      );

      await supabase
        .from('flyers')
        .update({ is_cached: true, cached_at: new Date().toISOString() })
        .in('id', upserted.map((r) => r.id));
    }

    return NextResponse.json({
      status: 'synced',
      citySlug,
      month,
      count: upserted.length,
      cached: cachedIds.size,
    });

  } catch (err: any) {
    console.error('Dice sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
