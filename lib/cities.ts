// Canonical supported cities with coordinates, mirrored from the scraper's
// SUPPORTED_CITIES. Used to map a user's geolocation to the nearest covered
// city. Store the display NAME (+ coords); slugs are derived with the app's
// shared slugify so they stay consistent with how towns are added elsewhere.

export interface City {
  name: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  // --- US / Canada ---
  { name: "Atlanta", lat: 33.749, lon: -84.388 },
  { name: "Austin", lat: 30.2672, lon: -97.7431 },
  { name: "Bloomington", lat: 39.1653, lon: -86.5264 },
  { name: "Boise", lat: 43.6166, lon: -116.2009 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298 },
  { name: "Detroit", lat: 42.3314, lon: -83.0458 },
  { name: "Durham", lat: 35.994, lon: -78.8986 },
  { name: "Fort Lauderdale", lat: 26.1224, lon: -80.1373 },
  { name: "Indio", lat: 33.7206, lon: -116.2156 },
  { name: "Las Vegas", lat: 36.1716, lon: -115.1391 },
  { name: "Lincoln", lat: 40.8258, lon: -96.6852 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Madison", lat: 43.0731, lon: -89.4012 },
  { name: "Miami", lat: 25.7617, lon: -80.1918 },
  { name: "Minneapolis", lat: 44.9778, lon: -93.265 },
  { name: "Nashville", lat: 36.1627, lon: -86.7816 },
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Philadelphia", lat: 39.9526, lon: -75.1652 },
  { name: "Saint Paul", lat: 44.9537, lon: -93.09 },
  { name: "Salem", lat: 44.9429, lon: -123.0351 },
  { name: "San Diego", lat: 32.7157, lon: -117.1611 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Seattle", lat: 47.6062, lon: -122.3321 },
  { name: "Southampton", lat: 40.8842, lon: -72.3895 },
  { name: "St. Louis", lat: 38.627, lon: -90.1994 },
  { name: "Tucson", lat: 32.2226, lon: -110.9747 },
  { name: "Tupelo", lat: 34.2576, lon: -88.7034 },
  { name: "Washington DC", lat: 38.9072, lon: -77.0369 },
  { name: "Toronto", lat: 43.651, lon: -79.347 },
  // --- Europe ---
  { name: "Bordeaux", lat: 44.8378, lon: -0.5792 },
  { name: "Lille", lat: 50.6292, lon: 3.0573 },
  { name: "Lyon", lat: 45.764, lon: 4.8357 },
  { name: "Marseille", lat: 43.2965, lon: 5.3698 },
  { name: "Nantes", lat: 47.2184, lon: -1.5536 },
  { name: "Nice", lat: 43.7102, lon: 7.262 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "Rennes", lat: 48.1173, lon: -1.6778 },
  { name: "Rouen", lat: 49.4432, lon: 1.0999 },
  { name: "Toulouse", lat: 43.6047, lon: 1.4442 },
  { name: "Berlin", lat: 52.52, lon: 13.405 },
  { name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  { name: "Munich", lat: 48.1351, lon: 11.582 },
  { name: "Dublin", lat: 53.3498, lon: -6.2603 },
  { name: "Bologna", lat: 44.4949, lon: 11.3426 },
  { name: "Milan", lat: 45.4642, lon: 9.19 },
  { name: "Naples", lat: 40.8518, lon: 14.2681 },
  { name: "Rome", lat: 41.9028, lon: 12.4964 },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393 },
  { name: "Barcelona", lat: 41.3851, lon: 2.1734 },
  { name: "Ibiza", lat: 38.9067, lon: 1.4206 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038 },
  { name: "Birmingham", lat: 52.4862, lon: -1.8904 },
  { name: "Bridport", lat: 50.733, lon: -2.7583 },
  { name: "Brighton", lat: 50.8225, lon: -0.1372 },
  { name: "Bristol", lat: 51.4545, lon: -2.5879 },
  { name: "Chelmsford", lat: 51.7356, lon: 0.4685 },
  { name: "High Wycombe", lat: 51.6286, lon: -0.7482 },
  { name: "Inverness", lat: 57.4778, lon: -4.2247 },
  { name: "Leeds", lat: 53.8008, lon: -1.5491 },
  { name: "Liverpool", lat: 53.4084, lon: -2.9916 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Manchester", lat: 53.4808, lon: -2.2426 },
  { name: "Norwich", lat: 52.6309, lon: 1.2974 },
  { name: "Nottingham", lat: 52.9548, lon: -1.1581 },
  { name: "Sheffield", lat: 53.3811, lon: -1.4701 },
  { name: "York", lat: 53.9599, lon: -1.0873 },
];

// Haversine distance in miles.
function distanceMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Nearest supported city to a coordinate. Returns null if the closest city is
 * farther than `maxMiles` (so users with no nearby coverage get the manual
 * picker instead of a wrong city).
 */
export function nearestCity(
  lat: number,
  lon: number,
  maxMiles = 150
): { city: City; miles: number } | null {
  let best: City | null = null;
  let bestMiles = Infinity;
  for (const c of CITIES) {
    const m = distanceMiles(lat, lon, c.lat, c.lon);
    if (m < bestMiles) {
      bestMiles = m;
      best = c;
    }
  }
  if (!best || bestMiles > maxMiles) return null;
  return { city: best, miles: bestMiles };
}
