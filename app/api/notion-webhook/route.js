import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
)

// Helper to extract age tags matching your Ticketmaster / Dice schema
function extractDiceTags(description, title) {
  const tags = ['dice']; // Base source tag
  const fullText = `${description} ${title}`.toLowerCase();

  if (
    fullText.includes('21+') || fullText.includes('21 and over') || 
    fullText.includes('must be 21') || /\b21\+/.test(fullText)
  ) {
    tags.push('21+');
  } else if (
    fullText.includes('18+') || fullText.includes('18 and over') || 
    fullText.includes('must be 18') || /\b18\+/.test(fullText)
  ) {
    tags.push('18+');
  } else if (
    fullText.includes('all ages') || fullText.includes('all-ages') || 
    fullText.includes('family friendly')
  ) {
    tags.push('all-ages');
  }
  return tags;
}

export async function POST(request) {
  try {
    const payload = await request.json();

    // ---> TEMPORARY LOGGING FOR VERIFICATION TOKEN <---
    console.log("\n====== LOOK HERE FOR THE TOKEN ======");
    console.log(payload);
    console.log("=====================================\n");

    // If Notion sends the token payload, return 200 OK so it registers
    if (payload.token) {
       return new Response('Token received', { status: 200 });
    }

    // 1. Handle Notion's Webhook Verification Handshake (Challenge fallback)
    if (payload.type === 'webhook_verification') {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Ignore anything that isn't a new or updated page
    if (payload.type !== 'page.created' && payload.type !== 'page.updated') {
      return new Response('Ignored - Not a page update', { status: 200 });
    }

    const page = payload.data;
    const props = page.properties;

    // 3. Extract properties from Notion
    const externalId = props['Event ID']?.rich_text[0]?.plain_text || null;
    const title = props['Name']?.title[0]?.plain_text || "Untitled";
    const rawCity = props['City']?.select?.name || "Unknown";
    const venue = props['Venue']?.rich_text[0]?.plain_text || "Unknown";
    const eventUrl = props['Event Link']?.url || null;
    const imageUrl = props['Image Link']?.url || null;
    const startDate = props['Start Date']?.date?.start || null;
    const description = props['Description']?.rich_text[0]?.plain_text || "";

    // We need an external_id to avoid duplicates in Supabase
    if (!externalId) {
      return new Response('No Event ID found', { status: 400 });
    }

    // Slugify the city name (e.g., "Las Vegas" -> "las-vegas") to match standard schema
    const citySlug = rawCity.toLowerCase().trim().replace(/[\s_]+/g, '-');
    const tags = extractDiceTags(description, title);

    // 4. Upsert the flattened data into the modern 'flyers' table
    const { data: upsertedRow, error: upsertError } = await supabase
      .from('flyers')
      .upsert({
        external_id: externalId,
        title: title,
        location_name: venue,
        city_slug: [citySlug], // Must be structured as an array
        event_start: startDate,
        event_end: null,
        price: 'See site',
        description: description,
        image_url: imageUrl,
        ticket_url: eventUrl,
        source: 'dice',
        is_cached: true // Sent directly by background process integration
      }, { onConflict: 'external_id' })
      .select('id')
      .single();

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw upsertError;
    }

    // 5. Insert tags via vote_on_tag RPC function if row was created/updated
    if (upsertedRow) {
      await Promise.allSettled(
        tags.map(tagName =>
          supabase.rpc('vote_on_tag', {
            target_flyer_id: upsertedRow.id,
            target_tag_name: tagName,
            vote_val: 1,
            voter_id: 'notion-webhook',
          })
        )
      );
    }

    return new Response('Successfully synced to Supabase flyers table', { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}