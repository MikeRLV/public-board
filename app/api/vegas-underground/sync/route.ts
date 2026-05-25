import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CACHE_HOURS = 24;
const VU_CITY_SLUG = 'las-vegas-nv';

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    // Vegas Underground only covers Las Vegas
    if (citySlug !== VU_CITY_SLUG) {
      return NextResponse.json({ status: 'not_applicable', citySlug });
    }

    if (!month) {
      return NextResponse.json({ error: 'month required' }, { status: 400 });
    }

    // Check cache — skip scrape if fresh data exists
    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');
    const cacheThreshold = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('flyers')
      .select('cached_at')
      .eq('source', 'vegas-underground')
      .eq('is_cached', true)
      .contains('city_slug', [VU_CITY_SLUG])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`)
      .limit(1);

    const isFresh = existing?.[0]?.cached_at && existing[0].cached_at > cacheThreshold;
    if (isFresh) {
      return NextResponse.json({ status: 'cache_hit', citySlug, month });
    }

    // Scrape via Python service
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-vegas-underground`, {
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

    // Map to flyer schema
    const flyers = events.map((e: any) => {
      const slug = (e.url || '').split('/vegasunderground/').pop() || '';
      const externalId = `vu_${slug || e.name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const tagText = [e.description, e.name, e.price].filter(Boolean).join(' ');
      const extracted = extractTags(tagText, e.name);
      if (e.price === 'Free' || e.price === '$0') {
        if (!extracted.includes('free')) extracted.push('free');
      }
      const tags: string[] = ['vegas-underground', 'local', ...extracted];

      return {
        title: e.name,
        location_name: [e.location, e.address].filter(Boolean).join(' — ') || 'Las Vegas',
        city_slug: [VU_CITY_SLUG],
        event_start: e.startDate || null,
        event_end: e.endDate || null,
        price: e.price || null,
        description: e.description || '',
        image_url: e.image || null,
        ticket_url: e.url || 'https://www.tickettailor.com/events/vegasunderground',
        source: 'vegas-underground',
        external_id: externalId,
        is_cached: false,
        _tags: tags,
      };
    }).filter((f: any) => f.event_start);

    if (flyers.length === 0) {
      return NextResponse.json({ status: 'no_valid_dates', citySlug, month });
    }

    // Upsert flyers then apply tags
    const upserted: any[] = [];
    for (const flyer of flyers) {
      const { _tags, ...flyerData } = flyer;
      const { data, error } = await supabase
        .from('flyers')
        .upsert({ ...flyerData, is_cached: false }, { onConflict: 'external_id' })
        .select('id, external_id')
        .single();
      if (error) console.error('VU upsert failed:', error.message, flyerData.title);
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
              voter_id: 'vegas-underground-import',
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
    console.error('Vegas Underground sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
