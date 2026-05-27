import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    if (!citySlug || !month) {
      return NextResponse.json({ error: 'citySlug and month required' }, { status: 400 });
    }

    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');

    // Supabase IS the cache — no time-based TTL.
    // Fetch external_ids already stored for this city/month.
    const { data: cachedRows } = await supabase
      .from('flyers')
      .select('external_id')
      .eq('source', 'bandsintown')
      .eq('is_cached', true)
      .contains('city_slug', [citySlug])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`);

    const cachedIds = new Set(
      (cachedRows || []).map((r: any) => r.external_id).filter(Boolean)
    );

    // Scrape Bandsintown (returns upcoming ~36 events; date filter causes 403)
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-bandsintown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: citySlug.replace(/-/g, ' ') }),
    });

    if (!scrapeRes.ok) {
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    const allEvents: any[] = scrapeData.events || [];

    if (allEvents.length === 0) {
      return NextResponse.json({ status: 'no_events', citySlug, month });
    }

    // Compute external_id for each event before filtering
    const withIds = allEvents.map((e: any) => {
      const idMatch = e.url?.match(/\/e\/(\d+)-/);
      const externalId = idMatch ? `bit_${idMatch[1]}` : `bit_${e.name}_${e.startDate}`;
      return { ...e, _externalId: externalId };
    });

    // Filter to events in the requested month that aren't already cached
    const newEvents = withIds.filter((e: any) => {
      const eventMonth = (e.startDate || '').substring(0, 7);
      return eventMonth === month && !cachedIds.has(e._externalId);
    });

    if (newEvents.length === 0) {
      return NextResponse.json({
        status: 'no_new_events',
        citySlug,
        month,
        cached: cachedIds.size,
      });
    }

    // Deduplicate against existing Ticketmaster events (same artist, same day)
    const { data: tmEvents } = await supabase
      .from('flyers')
      .select('title, event_start')
      .eq('source', 'ticketmaster')
      .contains('city_slug', [citySlug]);

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const performer = (title: string) => norm(title.split(/[@\-–]/)[0].trim());

    const isDuplicate = (bitTitle: string, bitDate: string) => {
      const perf = performer(bitTitle);
      if (perf.length < 4) return false;
      const day = bitDate.substring(0, 10);
      return (tmEvents || []).some(
        (tm: any) =>
          tm.event_start?.substring(0, 10) === day && norm(tm.title).includes(perf)
      );
    };

    const deduped = newEvents.filter(
      (e: any) => !isDuplicate(e.name, e.startDate)
    );
    console.log(
      `BIT ${citySlug} ${month}: ${newEvents.length} new, ${deduped.length} after TM dedup`
    );

    if (deduped.length === 0) {
      return NextResponse.json({ status: 'all_duplicates', citySlug, month });
    }

    // Map to flyer schema
    const flyers = deduped.map((e: any) => {
      const extracted = extractTags(e.description, e.name);
      const tags: string[] = ['bandsintown', ...extracted];

      return {
        title: e.name,
        location_name: e.location?.name || 'Unknown Venue',
        city_slug: [citySlug],
        event_start: e.startDate,
        description: e.description || '',
        image_url: e.image || null,
        ticket_url: e.offers?.url || e.url || 'https://bandsintown.com',
        source: 'bandsintown',
        external_id: e._externalId,
        is_cached: false,
        _tags: tags,
      };
    });

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

    if (batchError) {
      console.error('BIT batch upsert failed:', batchError.message);
      return NextResponse.json({ status: 'upsert_error', error: batchError.message, citySlug, month }, { status: 500 });
    }

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
              voter_id: 'bandsintown-import',
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
    console.error('Bandsintown sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
