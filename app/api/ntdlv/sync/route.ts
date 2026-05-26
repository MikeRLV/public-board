import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NTDLV_CITY_SLUG = 'las-vegas';
// Accept both slugs in case users saved either variant
const LV_SLUGS = ['las-vegas', 'las-vegas-nv'];

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    // NTDLV only covers Las Vegas
    if (!LV_SLUGS.includes(citySlug)) {
      return NextResponse.json({ status: 'not_applicable', citySlug });
    }

    if (!month) {
      return NextResponse.json({ error: 'month required' }, { status: 400 });
    }

    // Supabase IS the cache — no time-based TTL.
    // Fetch external_ids already stored for this city/month.
    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');

    const { data: cachedRows } = await supabase
      .from('flyers')
      .select('external_id')
      .eq('source', 'ntdlv')
      .eq('is_cached', true)
      .contains('city_slug', [NTDLV_CITY_SLUG])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`);

    const cachedIds = new Set(
      (cachedRows || []).map((r: any) => r.external_id).filter(Boolean)
    );

    // Scrape via Python service
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-ntdlv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'las vegas', month }),
    });

    if (!scrapeRes.ok) {
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    const events: any[] = scrapeData.events || [];

    if (events.length === 0) {
      return NextResponse.json({ status: 'no_events', citySlug, month });
    }

    // Compute external_id first so we can filter already-cached events
    const withIds = events.map((e: any) => {
      const slug = (e.url || '').split('/events/').pop() || '';
      const externalId = `ntdlv_${slug || e.name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      return { ...e, _externalId: externalId };
    });

    const newEvents = withIds.filter((e: any) => !cachedIds.has(e._externalId));

    if (newEvents.length === 0) {
      return NextResponse.json({ status: 'no_new_events', citySlug, month, cached: cachedIds.size });
    }

    // Map to flyer schema
    const flyers = newEvents.map((e: any) => {
      const externalId = e._externalId;

      // Build tag corpus: description + title + price string for "free" detection
      const tagText = [e.description, e.name, e.price].filter(Boolean).join(' ');
      const extracted = extractTags(tagText, e.name);
      // If price is explicitly "Free" or $0, add free tag
      if (e.price === 'Free' || e.price === '$0') {
        if (!extracted.includes('free')) extracted.push('free');
      }
      const tags: string[] = ['ntdlv', 'nothing-to-do-las-vegas', 'local', ...extracted];

      return {
        title: e.name,
        location_name: [e.location, e.address].filter(Boolean).join(' — ') || 'Las Vegas',
        city_slug: [NTDLV_CITY_SLUG],
        event_start: e.startDate || null,
        event_end: e.endDate || null,
        price: e.price || null,
        description: e.description || '',
        image_url: e.image || null,
        ticket_url: e.url || 'https://www.ntdlv.com/events',
        source: 'ntdlv',
        external_id: externalId,
        is_cached: false,
        _tags: tags,
      };
    }).filter((f: any) => f.event_start); // drop anything with no parseable date

    if (flyers.length === 0) {
      return NextResponse.json({ status: 'no_valid_dates', citySlug, month });
    }

    // Build tags map then batch upsert all new events in one DB call
    const tagsMap: Record<string, string[]> = {};
    const flyerDatas = flyers.map(({ _tags, ...flyerData }) => {
      tagsMap[flyerData.external_id] = _tags || [];
      return { ...flyerData, is_cached: false };
    });

    const { data: batchData, error: batchError } = await supabase
      .from('flyers')
      .upsert(flyerDatas, { onConflict: 'external_id' })
      .select('id, external_id');

    if (batchError) console.error('NTDLV batch upsert failed:', batchError.message);

    const upserted = (batchData || []).map((row: any) => ({
      id: row.id,
      external_id: row.external_id,
      _tags: tagsMap[row.external_id] || [],
    }));

    if (upserted.length > 0) {
      await Promise.allSettled(
        upserted.flatMap(({ id, _tags }) =>
          (_tags || []).map((tagName: string) =>
            supabase.rpc('vote_on_tag', {
              target_flyer_id: id,
              target_tag_name: tagName,
              vote_val: 1,
              voter_id: 'ntdlv-import',
            })
          )
        )
      );

      await supabase
        .from('flyers')
        .update({ is_cached: true, cached_at: new Date().toISOString() })
        .in('id', upserted.map((r) => r.id));
    }

    return NextResponse.json({ status: 'synced', citySlug, month, count: upserted.length, cached: cachedIds.size });

  } catch (err: any) {
    console.error('NTDLV sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
