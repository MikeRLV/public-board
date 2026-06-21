import { NextRequest, NextResponse } from 'next/server';

// PunchUp (comedy) only covers Las Vegas for now.
const LV_SLUGS = ['las-vegas', 'las-vegas-nv'];

// Fetch with one retry on 502 (cloudflared burst saturation).
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 502) {
    const jitter = 1000 + Math.random() * 2000; // 1–3 s
    await new Promise(r => setTimeout(r, jitter));
    return fetch(url, options);
  }
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const { citySlug, month } = await request.json();

    // PunchUp only covers Las Vegas — skip other cities immediately
    if (!LV_SLUGS.includes(citySlug)) {
      return NextResponse.json({ status: 'not_applicable', citySlug });
    }

    if (!month) {
      return NextResponse.json({ error: 'month required' }, { status: 400 });
    }

    console.log(`[PUNCHUP] Triggering scrape: ${month}`);

    // The Python scraper does the full PunchUp scrape + Supabase upsert as a
    // background asyncio task, returning {"status":"started"} immediately so the
    // Cloudflare tunnel never hits its 30-second origin-response timeout.
    const scraperBase = process.env.DICE_SCRAPER_URL ?? 'http://localhost:8081';
    const scrapeRes = await fetchWithRetry(`${scraperBase}/scrape-punchup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'las vegas', month }),
    });

    if (!scrapeRes.ok) {
      console.error(`[PUNCHUP] Scraper HTTP error: ${scrapeRes.status}`);
      return NextResponse.json({ status: 'scrape_error', code: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    console.log(`[PUNCHUP] Scraper response: ${JSON.stringify(scrapeData)}`);

    if (scrapeData.status === 'started' || scrapeData.status === 'already_running') {
      return NextResponse.json({ status: 'syncing', citySlug, month });
    }

    if (scrapeData.status === 'error') {
      return NextResponse.json({ status: 'scrape_error', message: scrapeData.message });
    }

    return NextResponse.json({ status: scrapeData.status ?? 'unknown', citySlug, month });

  } catch (err: any) {
    console.error('[PUNCHUP] Sync error:', err.message, err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
