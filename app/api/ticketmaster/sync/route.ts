import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';
import { extractTags } from '@/lib/extractTags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TM_KEY = process.env.TICKETMASTER_API_KEY!;
const CACHE_HOURS = 24;

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-+]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

const CATEGORIES = ['KZFzniwnSyZfZ7v7nJ', 'KZFzniwnSyZfZ7v7nE', 'KZFzniwnSyZfZ7v7na'];
// Music: KZFzniwnSyZfZ7v7nJ
// Arts & Theatre: KZFzniwnSyZfZ7v7na  
// Family: KZFzniwnSyZfZ7v7n1
// Sports: KZFzniwnSyZfZ7v7nE (excluded by default)

// City slug → TM state code for disambiguation (e.g. Las Vegas, NV not NM)
const TM_STATE_CODES: Record<string, string> = {
  'las-vegas':    'NV',
  'las-vegas-nv': 'NV',
  'new-york':     'NY',
  'new-york-city':'NY',
  'los-angeles':  'CA',
  'chicago':      'IL',
  'nashville':    'TN',
  'miami':        'FL',
  'austin':       'TX',
  'seattle':      'WA',
  'denver':       'CO',
  'portland':     'OR',
  'boston':       'MA',
  'atlanta':      'GA',
  'philadelphia': 'PA',
};

async function fetchTicketmasterEvents(citySlug: string, month: string) {
  const [year, monthNum] = month.split('-');
  const startDate = `${year}-${monthNum}-01T00:00:00Z`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;

  const cityName = citySlug.replace(/-/g, ' ');
  const stateCode = TM_STATE_CODES[citySlug];
  const allEvents: any[] = [];
  const seenIds = new Set<string>();

  for (const segmentId of CATEGORIES) {
    let page = 0;
    const pageSize = 200;

    while (true) {
      const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
      url.searchParams.set('apikey', TM_KEY);
      url.searchParams.set('city', cityName);
      if (stateCode) url.searchParams.set('stateCode', stateCode);
      url.searchParams.set('segmentId', segmentId);
      url.searchParams.set('startDateTime', startDate);
      url.searchParams.set('endDateTime', endDate);
      url.searchParams.set('size', String(pageSize));
      url.searchParams.set('page', String(page));
      url.searchParams.set('sort', 'date,asc');

      const res = await fetch(url.toString());
      if (!res.ok) break;

      const data = await res.json();
      const events: any[] = data._embedded?.events || [];

      for (const e of events) {
        if (!seenIds.has(e.id)) {
          seenIds.add(e.id);
          allEvents.push(e);
        }
      }

      const totalPages = data.page?.totalPages ?? 1;
      if (page + 1 >= totalPages || events.length === 0) break;
      page++;
    }
  }

  return allEvents;
}

function mapTMEventToFlyer(event: any, citySlug: string) {
  const venue = event._embedded?.venues?.[0];
  const startDate = event.dates?.start?.localDate;
  const startTime = event.dates?.start?.localTime || '00:00:00';
  const endDate = event.dates?.end?.localDate || startDate;

  // Price range
  let price = 'See site';
  if (event.priceRanges?.length) {
    const pr = event.priceRanges[0];
    price = pr.min === pr.max
      ? `$${pr.min}`
      : `$${pr.min}–$${pr.max}`;
  }

  // Best image — prefer real event images over Ticketmaster fallback stock photos
  const realImages = event.images?.filter((img: any) => !img.fallback) || [];
  const fallbackImages = event.images?.filter((img: any) => img.fallback) || [];
  const imagePool = realImages.length > 0 ? realImages : fallbackImages;

  const image = imagePool
    ?.filter((img: any) => img.ratio === '16_9')
    ?.sort((a: any, b: any) => b.width - a.width)?.[0]?.url
    || imagePool?.sort((a: any, b: any) => b.width - a.width)?.[0]?.url
    || null;

  // extractTags handles age detection (catches what TM misses) + genre keyword scanning
  const extracted = extractTags(event.info || event.pleaseNote, event.name);
  const tags: string[] = ['ticketmaster', ...extracted];

  // Classifications — structured genre data from TM's API, added on top of extracted tags
  const classification = event.classifications?.[0];
  if (classification?.segment?.name) {
    const seg = slugify(classification.segment.name);
    if (!tags.includes(seg)) tags.push(seg);
  }
  if (classification?.genre?.name && classification.genre.name !== 'Undefined') {
    const genre = slugify(classification.genre.name);
    if (!tags.includes(genre)) tags.push(genre);
  }
  if (classification?.subGenre?.name && classification.subGenre.name !== 'Undefined') {
    const subGenre = slugify(classification.subGenre.name);
    if (!tags.includes(subGenre)) tags.push(subGenre);
  }

  return {
    title: event.name,
    location_name: venue?.name || 'TBD',
    city_slug: [citySlug],
    event_start: `${startDate}T${startTime}`,
    event_end: endDate !== startDate ? `${endDate}T23:59:59` : null,
    price,
    description: event.info || event.pleaseNote || '',
    image_url: image || null,
    ticket_url: event.url || null,
    source: 'ticketmaster',
    external_id: event.id,
    cached_at: new Date().toISOString(),
    _tags: tags,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    if (!citySlug || !month) {
      return NextResponse.json({ error: 'citySlug and month required' }, { status: 400 });
    }

    const nextMonth = dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM');

    // Cache check: skip only if we have a recent sync AND a healthy event count.
    // A single-event check is too weak — a prior truncated sync (hit the 200 cap)
    // would mark the month as "done" and miss the rest of the month for 24 hours.
    const cacheThreshold = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
    const { count: cachedCount, data: latestCached } = await supabase
      .from('flyers')
      .select('cached_at', { count: 'exact', head: false })
      .eq('source', 'ticketmaster')
      .eq('is_cached', true)
      .contains('city_slug', [citySlug])
      .gte('event_start', `${month}-01`)
      .lt('event_start', `${nextMonth}-01`)
      .order('cached_at', { ascending: false })
      .limit(1);

    const lastCachedAt = latestCached?.[0]?.cached_at;
    // Consider cache fresh only if: synced recently AND we have ≥10 events cached
    // (guards against a prior empty/truncated run locking out a real sync)
    const isFresh = lastCachedAt && lastCachedAt > cacheThreshold && (cachedCount ?? 0) >= 10;
    if (isFresh) {
      return NextResponse.json({ status: 'cache_hit', citySlug, month, cached: cachedCount });
    }

    // Fetch from Ticketmaster
    const tmEvents = await fetchTicketmasterEvents(citySlug, month);

    if (tmEvents.length === 0) {
      return NextResponse.json({ status: 'no_events', citySlug, month, count: 0 });
    }

    // Map and upsert — strip _tags before sending to DB
    const flyers = tmEvents.map(e => mapTMEventToFlyer(e, citySlug));
    const flyersForDB = flyers.map(({ _tags, ...f }) => f);

    const upserted: any[] = [];
    for (const flyer of flyersForDB) {
      const { data, error } = await supabase
        .from('flyers')
        .upsert({ ...flyer, is_cached: false }, { onConflict: 'external_id' })
        .select('id, external_id')
        .single();
      if (!error && data) upserted.push(data);
    }

    // Insert tags via vote_on_tag RPC for each event
    if (upserted.length > 0) {
      const tagInserts = upserted.flatMap((row: any) => {
        const original = flyers.find(f => f.external_id === row.external_id);
        return (original?._tags || []).map((tagName: string) => ({
          flyerId: row.id,
          tagName,
        }));
      });

      await Promise.allSettled(
        tagInserts.map(({ flyerId, tagName }: any) =>
          supabase.rpc('vote_on_tag', {
            target_flyer_id: flyerId,
            target_tag_name: tagName,
            vote_val: 1,
            voter_id: 'ticketmaster-import',
          })
        )
      );

      await supabase
        .from('flyers')
        .update({ is_cached: true, cached_at: new Date().toISOString() })
        .in('id', upserted.map((r: any) => r.id));
    }

    return NextResponse.json({ status: 'synced', citySlug, month, count: flyers.length });

  } catch (err: any) {
    console.error('Ticketmaster sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}