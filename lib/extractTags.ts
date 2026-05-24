/**
 * extractTags.ts
 * Shared tag extraction utility used by both Dice and Ticketmaster sync routes.
 * Import and call extractTags(description, title) to get a normalized tag array.
 */

// ---------------------------------------------------------------------------
// Genre keyword map
// key   = substring to search for in lowercased text
// value = normalized tag name to store
// Order matters — more specific phrases before shorter ones
// ---------------------------------------------------------------------------
const GENRE_MAP: Record<string, string> = {
  // Rock & derivatives
  'math rock': 'math-rock',
  'art rock': 'art-rock',
  'alt rock': 'rock',
  'alternative rock': 'rock',
  'indie rock': 'rock',
  'hard rock': 'hard-rock',
  'classic rock': 'classic-rock',
  'post-rock': 'post-rock',
  'psychedelic rock': 'psychedelic',
  'psych rock': 'psychedelic',
  'stoner rock': 'stoner-rock',
  'garage rock': 'garage-rock',
  'progressive rock': 'prog-rock',
  'prog rock': 'prog-rock',

  // Punk & derivatives
  'post-punk': 'post-punk',
  'pop punk': 'pop-punk',
  'pop-punk': 'pop-punk',
  'skate punk': 'punk',
  'hardcore punk': 'hardcore',
  'hardcore': 'hardcore',
  'punk': 'punk',

  // Emo & adjacent
  'emo/math': 'emo',
  'math-rock': 'math-rock',
  'emo': 'emo',
  'midwest emo': 'emo',
  'screamo': 'screamo',

  // Metal
  'heavy metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'thrash metal': 'metal',
  'doom metal': 'metal',
  'metal': 'metal',

  // Indie & shoegaze
  'shoegaze': 'shoegaze',
  'dream pop': 'dream-pop',
  'indie pop': 'indie',
  'indie folk': 'indie',
  'indie': 'indie',

  // Electronic
  'electronic': 'electronic',
  'electronica': 'electronic',
  'edm': 'edm',
  'techno': 'techno',
  'house music': 'house',
  'deep house': 'house',
  'house': 'house',
  'drum and bass': 'drum-and-bass',
  'drum & bass': 'drum-and-bass',
  'dnb': 'drum-and-bass',
  'dubstep': 'dubstep',
  'ambient': 'ambient',
  'synthwave': 'synthwave',
  'industrial': 'industrial',

  // Hip-hop & R&B
  'hip hop': 'hip-hop',
  'hip-hop': 'hip-hop',
  'hiphop': 'hip-hop',
  'rap': 'rap',
  'r&b': 'r&b',
  'rnb': 'r&b',
  'rhythm and blues': 'r&b',
  'neo soul': 'soul',
  'soul': 'soul',
  'funk': 'funk',

  // Jazz & blues
  'jazz': 'jazz',
  'blues': 'blues',
  'swing': 'swing',
  'big band': 'big-band',

  // Folk & country
  'folk': 'folk',
  'americana': 'americana',
  'bluegrass': 'bluegrass',
  'country': 'country',

  // Pop
  'pop': 'pop',

  // Classical & orchestral
  'classical': 'classical',
  'orchestral': 'classical',
  'symphony': 'classical',
  'opera': 'opera',

  // Latin & reggae
  'reggae': 'reggae',
  'reggaeton': 'reggaeton',
  'latin': 'latin',
  'salsa': 'salsa',

  // Event type descriptors
  'dj set': 'dj',
  'dj': 'dj',
  'open mic': 'open-mic',
  'stand-up': 'comedy',
  'stand up comedy': 'comedy',
  'comedy': 'comedy',
  'tribute band': 'tribute',
  'tribute': 'tribute',
  'residency': 'residency',
  'day party': 'day-party',
  'pool party': 'pool-party',
  'block party': 'block-party',
  'karaoke': 'karaoke',
  'open bar': 'open-bar',
  'free admission': 'free',
  'no cover': 'free',
  'Free Parking' : 'free-parking'
};

// ---------------------------------------------------------------------------
// Age detection
// ---------------------------------------------------------------------------
function extractAgeTags(text: string): string[] {
  const tags: string[] = [];

  const is21 =
    text.includes('21+') ||
    text.includes('21 and over') ||
    text.includes('21 or older') ||
    text.includes('21 years') ||
    text.includes('must be 21') ||
    text.includes('ages 21') ||
    text.includes('21+ event') ||
    text.includes('21+ only') ||
    /\b21\+/.test(text);

  const is18 =
    text.includes('18+') ||
    text.includes('18 and over') ||
    text.includes('18 or older') ||
    text.includes('18 years') ||
    text.includes('must be 18') ||
    text.includes('ages 18') ||
    text.includes('18+ event') ||
    /\b18\+/.test(text);

  const isAllAges =
    text.includes('all ages') ||
    text.includes('all-ages') ||
    text.includes('family friendly') ||
    text.includes('family-friendly') ||
    text.includes('all age ') ||
    text.includes('open to all') ||
    text.includes('no age');

  // Priority: 21+ > 18+ > all ages (avoid stacking)
  if (is21) tags.push('21+');
  else if (is18) tags.push('18+');
  else if (isAllAges) tags.push('all-ages');

  return tags;
}

// ---------------------------------------------------------------------------
// Genre extraction from free text
// ---------------------------------------------------------------------------
function extractGenreTags(text: string): string[] {
  const found = new Set<string>();
  for (const [keyword, tag] of Object.entries(GENRE_MAP)) {
    if (text.includes(keyword)) {
      found.add(tag);
    }
  }
  return Array.from(found);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Extract normalized tags from event description and title text.
 *
 * @param description - Full event description (markdown OK, will be lowercased)
 * @param title       - Event title (will be lowercased)
 * @param extra       - Any additional text to scan (e.g. age restriction highlights)
 * @returns           - Deduplicated array of tag strings, e.g. ["punk", "all-ages"]
 */
export function extractTags(
  description: string = '',
  title: string = '',
  extra: string = ''
): string[] {
  const text = `${description} ${title} ${extra}`.toLowerCase();
  const tags = new Set<string>();

  for (const tag of extractAgeTags(text)) tags.add(tag);
  for (const tag of extractGenreTags(text)) tags.add(tag);

  return Array.from(tags);
}