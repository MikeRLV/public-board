import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CACHE_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    if (!citySlug || !month) {
      return NextResponse.json({ error: 'citySlug and month required' }, { status: 400 });
    }

    // Check cache
    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');
    const cacheThreshold = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('flyers')
      .select('cached_at')
      .eq('source', 'bandsintown')
      .eq('is_cached', true)
      .contains('city_slug', [citySlug])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`)
      .limit(1);

    const isFresh = existing?.[0]?.cached_at && existing[0].cached_at > cacheThreshold;
    if (isFresh) {
      return NextResponse.json({ status: 'cache_hit', citySlug, month });
    }

    // Scrape Bandsintown
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
    const events = scrapeData.events || [];

    if (events.length === 0) {
      return NextResponse.json({ status: 'no_events', citySlug, month });
    }

    // Fetch existing Ticketmaster events for this city to deduplicate against
    const { data: tmEvents } = await supabase
      .from('flyers')
      .select('title, event_start')
      .eq('source', 'ticketmaster')
      .contains('city_slug', [citySlug]);

    // Normalize a string to bare alphanumeric for fuzzy comparison
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Extract performer name from BIT titles like "Artist @ Venue" or "Artist - Venue"
    const performer = (title: string) => norm(title.split(/[@\-–]/)[0].trim());

    const isDuplicate = (bitTitle: string, bitDate: string) => {
      const perf = performer(bitTitle);
      if (perf.length < 4) return false; // too short to match reliably
      const day = bitDate.substring(0, 10);
      return (tmEvents || []).some((tm: any) =>
        tm.event_start?.substring(0, 10) === day &&
        norm(tm.title).includes(perf)
      );
    };

    const deduped = events.filter((e: any) => !isDuplicate(e.name, e.startDate));
    console.log(`BIT ${citySlug}: ${events.length} raw, ${deduped.length} after TM dedup`);

    if (deduped.length === 0) {
      return NextResponse.json({ status: 'all_duplicates', citySlug, month });
    }

    // Map MusicEvent JSON-LD to flyer schema
    const flyers = deduped.map((e: any) => {
      const externalIdMatch = e.url?.match(/\/e\/(\d+)-/);
      const externalId = externalIdMatch ? `bit_${externalIdMatch[1]}` : `bit_${e.name}_${e.startDate}`;

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
        external_id: externalId,
        is_cached: false,
        _tags: tags,
      };
    });

    const upserted: any[] = [];
    for (const flyer of flyers) {
      const { _tags, ...flyerData } = flyer;
      const { data, error } = await supabase
        .from('flyers')
        .upsert({ ...flyerData, is_cached: false }, { onConflict: 'external_id' })
        .select('id, external_id')
        .single();
      if (error) console.error('BIT upsert failed:', error.message, flyerData.title);
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

    return NextResponse.json({ status: 'synced', citySlug, month, count: upserted.length });

  } catch (err: any) {
    console.error('Bandsintown sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
