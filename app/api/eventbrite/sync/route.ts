import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log(`[EB] Triggering scrape: ${citySlug} ${month}`);

    // The Python scraper runs the full Eventbrite scrape + Supabase upsert as a
    // background asyncio task.  It returns {"status":"started"} in < 1 second so
    // the Cloudflare tunnel never hits its 30-second origin-response timeout.
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetch(`${scraperBase}/scrape-eventbrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: citySlug.replace(/-/g, ' '), month }),
    });

    if (!scrapeRes.ok) {
      console.error(`[EB] Scraper HTTP error: ${scrapeRes.status}`);
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    console.log(`[EB] Scraper response: ${JSON.stringify(scrapeData)}`);

    // Happy-path: scraper acknowledged the job
    if (scrapeData.status === 'started' || scrapeData.status === 'already_running') {
      return NextResponse.json({ status: 'syncing', citySlug, month });
    }

    // Error responses from the scraper
    if (scrapeData.status === 'error') {
      if (scrapeData.message?.includes('Could not resolve Eventbrite place ID')) {
        return NextResponse.json({ status: 'not_applicable', citySlug });
      }
      return NextResponse.json({ status: 'scrape_error', message: scrapeData.message });
    }

    // Fallback (should not normally be reached)
    return NextResponse.json({ status: scrapeData.status ?? 'unknown', citySlug, month });

  } catch (err: any) {
    console.error('[EB] Sync error:', err.message, err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
