import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Map Eventbrite category/subcategory/format strings → our normalized tag names.
// null = drop the tag (too generic to be useful).
// Eventbrite sends these as slugified display names, e.g. "Hip Hop / Rap" → "hip-hop-rap".
const EB_TAG_MAP: Record<string, string | null> = {
  // Top-level categories
  'music':                        'live-music',
  'nightlife':                    'nightlife',
  'arts':                         'arts',
  'comedy':                       'comedy',
  'food-drink':                   'food-and-drink',
  'food-and-drink':               'food-and-drink',
  'sports-fitness':               'sports',
  'health-wellness':              'wellness',
  'hobbies-special-interest':     null,
  'business-professional':        null,
  'community-culture':            null,
  'family-education':             'family',
  'science-technology':           'tech',
  'travel-outdoor':               'outdoor',
  'charity-causes':               null,
  'religion-spirituality':        null,
  'government-politics':          null,
  'fashion-beauty':               null,
  'film-media':                   'film',
  'home-lifestyle':               null,
  'auto-boat-air':                null,
  'school-activities':            null,
  'heritage':                     null,

  // Music subcategories
  'alternative':                  'rock',
  'blues-jazz':                   'jazz',
  'classical':                    'classical',
  'country':                      'country',
  'cultural':                     'world',
  'edm-electronic':               'electronic',
  'folk':                         'folk',
  'hip-hop-rap':                  'hip-hop',
  'indie':                        'indie',
  'latin':                        'latin',
  'metal':                        'metal',
  'opera':                        'opera',
  'pop':                          'pop',
  'r&b':                          'r&b',
  'rb':                           'r&b',
  'reggae':                       'reggae',
  'religious-spiritual':          null,
  'rock':                         'rock',
  'soul':                         'soul',
  'top-40':                       'pop',

  // Formats
  'concert-or-performance':       'live-music',
  'festival-or-fair':             'festival',
  'party-or-social-gathering':    'party',
  'class-or-workshop':            'workshop',
  'exhibit-or-experience':        'arts',
  'screening':                    'film',
  'seminar-or-talk':              'talk',
  'game-or-competition':          'sports',
  'meeting-or-networking-event':  'networking',
  'attraction-or-theme-park':     null,
  'convention':                   null,
  'gala-or-formal-event':         null,
  'outdoor-adventure':            'outdoor',
  'race-or-endurance-event':      'sports',
  'rally':                        null,
  'retreat':                      'wellness',
  'tour':                         null,
  'tournament':                   'sports',
  'performance-or-concert':       'live-music',
};

function mapEbTags(rawTags: string[]): string[] {
  const out: string[] = [];
  for (const raw of rawTags) {
    const key = raw.toLowerCase().trim();
    if (key in EB_TAG_MAP) {
      const mapped = EB_TAG_MAP[key];
      if (mapped) out.push(mapped);
    } else {
      // Unknown tag — pass through as-is (might be useful)
      out.push(key);
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    if (!citySlug || !month) {
      return NextResponse.json({ error: 'citySlug and month required' }, { status: 400 });
    }

    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');

    // Supabase IS the cache — fetch already-stored external_ids for this city/month.
    const { data: cachedRows } = await supabase
      .from('flyers')
      .select('external_id')
      .eq('source', 'eventbrite')
      .eq('is_cached', true)
      .contains('city_slug', [citySlug])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`);

    const cachedIds = new Set(
      (cachedRows || []).map((r: any) => r.external_id).filter(Boolean)
    );

    // Scrape via Python service
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-eventbrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: citySlug.replace(/-/g, ' '), month }),
    });

    if (!scrapeRes.ok) {
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    if (scrapeData.status === 'error') {
      // Dynamic place ID lookup failed (e.g. no events found for probe search)
      // Treat as not_applicable rather than a hard error
      if (scrapeData.message?.includes('Could not resolve Eventbrite place ID')) {
        return NextResponse.json({ status: 'not_applicable', citySlug });
      }
      return NextResponse.json({ status: 'scrape_error', message: scrapeData.message });
    }

    const allEvents: any[] = scrapeData.events || [];

    if (allEvents.length === 0) {
      return NextResponse.json({ status: 'no_events', citySlug, month });
    }

    // Only process events not already cached
    const newEvents = allEvents.filter((e: any) => !cachedIds.has(e.external_id));

    if (newEvents.length === 0) {
      return NextResponse.json({ status: 'no_new_events', citySlug, month, cached: cachedIds.size });
    }

    // Map to flyer schema
    const flyers = newEvents.map((e: any) => {
      // Layer 1: normalize Eventbrite category tags via EB_TAG_MAP
      const categoryTags = mapEbTags(e._tags || []);

      // Layer 2: extract genre/age tags from description + title text
      const extracted = extractTags(e.description, e.name);

      // Combine: source tag first, then categories, then text-extracted tags
      const tags: string[] = [
        'eventbrite',
        ...categoryTags,
        ...extracted,
      ];

      return {
        title: e.name,
        location_name: e.location_name || 'Unknown Venue',
        city_slug: [citySlug],
        event_start: e.startDate || null,
        event_end: e.endDate || null,
        price: e.price || null,
        description: e.description || '',
        image_url: e.image || null,
        ticket_url: e.url || 'https://www.eventbrite.com',
        source: 'eventbrite',
        external_id: e.external_id,
        is_cached: false,
        _tags: [...new Set(tags)],
      };
    }).filter((f: any) => f.event_start);

    if (flyers.length === 0) {
      return NextResponse.json({ status: 'no_valid_dates', citySlug, month });
    }

    // Build tags map then batch upsert
    const tagsMap: Record<string, string[]> = {};
    const flyerDatas = flyers.map(({ _tags, ...flyerData }: any) => {
      tagsMap[flyerData.external_id] = _tags || [];
      return { ...flyerData, is_cached: false };
    });

    const { data: batchData, error: batchError } = await supabase
      .from('flyers')
      .upsert(flyerDatas, { onConflict: 'external_id' })
      .select('id, external_id');

    if (batchError) {
      console.error('Eventbrite batch upsert failed:', batchError.message);
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
              voter_id: 'eventbrite-import',
            })
          )
        )
      );

      await supabase
        .from('flyers')
        .update({ is_cached: true, cached_at: new Date().toISOString() })
        .in('id', upserted.map((r) => r.id));
    }

    console.log(`EB ${citySlug} ${month}: ${newEvents.length} new, ${upserted.length} upserted`);

    return NextResponse.json({
      status: 'synced',
      citySlug,
      month,
      count: upserted.length,
      cached: cachedIds.size,
    });

  } catch (err: any) {
    console.error('Eventbrite sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
