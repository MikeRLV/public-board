"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Module-level cache — survives component unmount/remount within the same browser tab.
// Navigating away and back is instant: cached data shows immediately, then refreshes silently.
// Key: "citySlug:YYYY-MM"
const eventsCache = new Map<string, any[]>();
const _slugifyCache = (text: string) =>
  text.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-+]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');
const cacheKey = (city: string, date: dayjs.Dayjs) =>
  `${_slugifyCache(city)}:${date.format('YYYY-MM')}`;

// Per-(citySlug:month) sync throttle. Without this, every month navigation re-fired
// ~30 scraper requests (current + 4 neighbours x 6 platforms). Now a given month is
// re-triggered at most once per SYNC_TTL.
const lastSyncAt = new Map<string, number>();
const SYNC_TTL_MS = 10 * 60 * 1000;   // don't re-trigger a month's scrape within 10 min
const SCRAPE_WINDOW_MS = 90 * 1000;   // events may still be arriving this long after a trigger
const syncKey = (citySlug: string, month: string) => `${citySlug}:${month}`;

const PLATFORMS = ['dice', 'bandsintown', 'ntdlv', 'vegas-underground', 'eventbrite'];

// Fire the scrape triggers for one city/month, unless it was synced recently.
// Returns true if it actually fired. TM runs first so Bandsintown dedup can see it.
async function triggerSync(citySlug: string, month: string): Promise<boolean> {
  const k = syncKey(citySlug, month);
  if (Date.now() - (lastSyncAt.get(k) ?? 0) < SYNC_TTL_MS) return false;
  lastSyncAt.set(k, Date.now());
  try {
    await fetch('/api/ticketmaster/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citySlug, month }),
    }).catch(() => {});

    await Promise.allSettled(
      PLATFORMS.map((p) =>
        fetch(`/api/${p}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ citySlug, month }),
        })
      )
    );
  } catch (e) {
    console.error('Sync error:', e);
  }
  return true;
}

export function useCalendarData(city: string, currentDate: dayjs.Dayjs, initialLocals: string[] = [], initialTags: string[] = []) {
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // True while the current viewed month is still being scraped (events may keep
  // arriving). Drives the "searching" spinner. Only ever reflects the month in view.
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [weightedLocals, setWeightedLocals] = useState<{name: string, weight: number}[]>([]);
  const [savedLocations, setSavedLocations] = useState<string[]>([]);
  const [allTimeTags, setAllTimeTags] = useState<{name: string, count: number}[]>([]);
  
  const [activeTags, setActiveTags] = useState<string[]>(initialTags.map(t => slugify(t)));
  const [activeTowns, setActiveTowns] = useState<string[]>(initialLocals.map(l => slugify(l)));
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>('OR');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [excludeMode, setExcludeMode] = useState(false);
  const [showSpam, setShowSpam] = useState(false);
  const [showAllAges, setShowAllAges] = useState(false);
  const [show18, setShow18] = useState(false);
  const [show21, setShow21] = useState(false);

  // Reset excludeMode when showAllEvents is turned off
  useEffect(() => {
    if (!showAllEvents) setExcludeMode(false);
  }, [showAllEvents]);

  useEffect(() => {
    const fetchLocals = async () => {
      const { data } = await supabase.from('weighted_locals').select('name, weight').order('weight', { ascending: false });
      if (data) {
        setWeightedLocals(data);
        setSavedLocations(data.map((item: any) => item.name));
      }
    };
    fetchLocals();
  }, []);

  useEffect(() => {
    const fetchAllTimeTags = async () => {
      const { data, error } = await supabase
        .from('flyer_tags')
        .select('vote_count, tags(name)');

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((ft: any) => {
          const name = ft.tags?.name;
          if (name && slugify(name) !== 'spam') {
            const key = slugify(name);
            counts[key] = (counts[key] || 0) + (ft.vote_count || 0);
          }
        });
        const sorted = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setAllTimeTags(sorted);
      }
    };
    fetchAllTimeTags();
  }, []);

  // Tag "pool" weights for the month, derived from the events already loaded —
  // no extra Supabase query (this used to re-query on every 5s poll). Falls back
  // to the global all-time tags (already fetched once) so the list is never empty.
  const weightedTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const flyer of events) {
      flyer.flyer_tags?.forEach((ft: any) => {
        const tagName = ft.tags?.name;
        if (tagName && slugify(tagName) !== 'spam') {
          const key = slugify(tagName);
          tagCounts[key] = (tagCounts[key] || 0) + (ft.vote_count || 0);
        }
      });
    }
    let weighted = Object.entries(tagCounts)
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight);
    if (weighted.length === 0) {
      weighted = allTimeTags.map(t => ({ name: t.name, weight: t.count }));
    }
    return weighted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, allTimeTags]);

  useEffect(() => {
    let current = [...activeTags];
    let changed = false;
    const sync = (bool: boolean, tagName: string) => {
      const has = current.includes(tagName);
      if (bool && !has) { current.push(tagName); changed = true; }
      else if (!bool && has) { current = current.filter(t => t !== tagName); changed = true; }
    };
    sync(showAllAges, "all-ages"); sync(show18, "18+"); sync(show21, "21+");
    if (changed) setActiveTags(current);
  }, [showAllAges, show18, show21]);

  useEffect(() => {
    setShowAllAges(activeTags.includes("all-ages"));
    setShow18(activeTags.includes("18+"));
    setShow21(activeTags.includes("21+"));
  }, [activeTags]);

  useEffect(() => {
    let storedId = localStorage.getItem("local_user_id") || crypto.randomUUID();
    localStorage.setItem("local_user_id", storedId);
    setUserId(storedId);
  }, []);

  // Shared query helper — returns events from Supabase for the current month/city
  const queryEvents = useCallback(async () => {
    const monthStart = currentDate.format('YYYY-MM-01');
    const nextMonth = currentDate.add(1, 'month').format('YYYY-MM-01');

    const citySlug = city ? slugify(city) : null;
    const allSearchTowns = Array.from(
      new Set([...activeTowns, citySlug].filter((t): t is string => typeof t === 'string' && t.length > 0))
    );

    if (allSearchTowns.length === 0) return null;

    const cityFilters = allSearchTowns.map((t: string) => `city_slug.cs.{${t}}`).join(',');

    // Supabase caps every response at 1000 rows. A busy city-month blows past that
    // (Las Vegas/August is ~1800 across all sources), and the silently-dropped tail
    // was hiding most DICE shows. Page through in 1000-row chunks until exhausted.
    // Order by (event_start, id) so pagination is deterministic even with ties.
    const PAGE = 1000;
    const all: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('flyers')
        .select('id, title, event_start, event_end, location_name, price, ticket_url, image_url, description, source, city_slug, flyer_tags(vote_count, tags(name))')
        .gte('event_start', monthStart)
        .lt('event_start', nextMonth)
        .or(cityFilters)
        .order('event_start', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) return all.length > 0 ? all : null;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
    }
    return all;
  }, [currentDate, city, activeTowns]);

  // Full fetch — shows loading spinner, used on initial load.
  // Stale-while-revalidate: keep existing events visible while the query runs
  // so month navigation never blanks the calendar.
  const fetchEvents = useCallback(async (cancelled = false) => {
    setIsLoading(true);
    const data = await queryEvents();
    if (!cancelled) {
      if (data !== null) {
        // Only replace events if the query returned results.
        // If it returned empty (month not yet synced), keep whatever was
        // already showing — the sync + 5 s poll will fill it in shortly.
        setEvents(prev => data.length > 0 ? data : prev);
        if (data.length > 0) eventsCache.set(cacheKey(city, currentDate), data);
      }
      setIsLoading(false);
    }
  }, [queryEvents, city, currentDate]);

  // Fire scrapes for the given towns/month — throttled per city:month inside
  // triggerSync. Resolves to true if any city actually triggered a fresh scrape.
  const syncMonth = (towns: string[], date: dayjs.Dayjs): Promise<boolean> => {
    const month = date.format('YYYY-MM');
    const targets = towns.length > 0 ? towns : city ? [slugify(city)] : [];
    if (targets.length === 0) return Promise.resolve(false);
    return Promise.all(targets.map((c) => triggerSync(c, month))).then((r) => r.some(Boolean));
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const targets = activeTowns.length > 0
      ? activeTowns
      : city ? [slugify(city)] : [];
    const key = cacheKey(city, currentDate);
    const month = currentDate.format('YYYY-MM');

    // Decide whether a scrape is (or is about to be) running for THIS month — that's
    // what drives the spinner + result polling. willFire = a city is due for a fresh
    // trigger; mayBeScraping = one was triggered recently enough that events could
    // still be landing. A fully-settled month (synced a while ago) shows no spinner.
    const lastFor = (c: string) => lastSyncAt.get(syncKey(c, month)) ?? 0;
    const willFire = targets.some((c) => Date.now() - lastFor(c) >= SYNC_TTL_MS);
    const mayBeScraping = targets.some((c) => Date.now() - lastFor(c) < SCRAPE_WINDOW_MS);
    const shouldPoll = targets.length > 0 && (willFire || mayBeScraping);

    setIsSyncing(shouldPoll);

    const stop = () => {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    };

    const run = async () => {
      // 1. Instant cache restore — no blank flash; else show whatever's in Supabase
      const cached = eventsCache.get(key);
      if (cached && cached.length > 0) {
        setEvents(cached);
        setIsLoading(false);
      } else {
        await fetchEvents(cancelled);
        if (cancelled) return;
      }

      if (targets.length === 0) { setIsSyncing(false); return; }

      // 2. Pre-sync neighbours + current month (each throttled per city:month)
      syncMonth(targets, currentDate.subtract(1, 'month'));
      syncMonth(targets, currentDate.add(1, 'month'));
      syncMonth(targets, currentDate.add(2, 'month'));
      syncMonth(targets, currentDate.add(3, 'month'));
      syncMonth(targets, currentDate);

      // 3. Only poll / show the spinner if a scrape is actually in flight here
      if (!shouldPoll) { setIsSyncing(false); return; }

      // 4. Poll for results while the scrape runs. Keep the spinner up until the
      //    event count settles (no change for a few polls AFTER events appear) or
      //    we hit a hard cap — so late-arriving events still land in the calendar.
      const MAX_POLLS = 12;     // ~60s hard cap
      const STABLE_POLLS = 3;   // ~15s with no new events => consider it done
      let polls = 0;
      let lastCount = cached?.length ?? 0;
      let sawEvents = lastCount > 0;
      let stable = 0;

      pollInterval = setInterval(async () => {
        if (cancelled) return;
        polls++;
        const data = await queryEvents();
        if (data !== null) {
          if (data.length > 0) {
            setEvents(data);
            eventsCache.set(key, data);
            sawEvents = true;
          }
          if (data.length === lastCount) { stable++; }
          else { stable = 0; lastCount = data.length; }
        } else {
          stable++;
        }
        if ((sawEvents && stable >= STABLE_POLLS) || polls >= MAX_POLLS) {
          stop();
          if (!cancelled) setIsSyncing(false);
        }
      }, 5000);
    };

    run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [currentDate, city, activeTowns]);

  const filteredEvents = useMemo(() => {
    if (activeTowns.length === 0 && !city) return [];

    const citySlug = city ? slugify(city) : null;
    const currentViewTowns = Array.from(new Set([...activeTowns, citySlug].filter((t): t is string => typeof t === 'string' && t.length > 0)));

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Build a day → [normalizedTMTitle] map from all loaded TM events so we can
    // suppress BIT entries for shows already covered by Ticketmaster.
    const tmByDay = new Map<string, string[]>();
    for (const e of events) {
      if (e.source !== 'ticketmaster') continue;
      const day = e.event_start?.substring(0, 10);
      if (!day) continue;
      if (!tmByDay.has(day)) tmByDay.set(day, []);
      tmByDay.get(day)!.push(norm(e.title));
    }

    const hasTMDuplicate = (e: any) => {
      if (e.source !== 'bandsintown') return false;
      const day = e.event_start?.substring(0, 10);
      if (!day) return false;
      const perf = norm(e.title.split(/[@\-–]/)[0].trim());
      if (perf.length < 4) return false;
      return (tmByDay.get(day) || []).some(tmTitle => tmTitle.includes(perf));
    };

    // Age tags ('all-ages' / '18+' / '21+') are an independent refinement, NOT a
    // genre/source constraint. With no age selected the calendar shows every age;
    // selecting one or more ages narrows to events carrying any of them. Applies in
    // both OR and AND mode — so e.g. "dice" alone never hides 18+/21+ shows, while
    // "dice" + "21+" excludes all-ages and 18+.
    const AGE_TAGS = ['all-ages', '18+', '21+'];
    const selectedAges = activeTags.filter((t: string) => AGE_TAGS.includes(t));
    const genreTags = activeTags.filter((t: string) => !AGE_TAGS.includes(t));

    return events.filter((e: any) => {
      const eventSlugs = Array.isArray(e.city_slug) ? e.city_slug : [e.city_slug];
      const isInTargetLoCAL = currentViewTowns.some(town => eventSlugs.includes(town));
      if (!isInTargetLoCAL) return false;

      if (hasTMDuplicate(e)) return false;

      const totalVotes = e.flyer_tags?.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0) || 0;
      const isSpam = totalVotes > 0 && ((e.flyer_tags?.find((ft: any) => slugify(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;

      const eventTags = e.flyer_tags?.map((ft: any) => slugify(ft.tags.name)) || [];
      if (e.source) eventTags.push(slugify(e.source));

      // AGE GATE — no age selected => all ages pass; otherwise require a match.
      if (selectedAges.length > 0 && !selectedAges.some((a: string) => eventTags.includes(a))) {
        return false;
      }

      if (showAllEvents) {
        // In exclude mode, hide events that have any of the active genre/source tags
        if (excludeMode && genreTags.length > 0) {
          return !genreTags.some((tag: string) => eventTags.includes(slugify(tag)));
        }
        return true;
      }

      // Need at least one content selector: a genre/source tag, or an age.
      if (genreTags.length === 0) return selectedAges.length > 0;

      const passesTags = filterMode === 'OR'
        ? genreTags.some((tag: string) => eventTags.includes(slugify(tag)))
        : genreTags.every((tag: string) => eventTags.includes(slugify(tag)));

      return passesTags;
    }).sort((a, b) => (b.flyer_tags?.length || 0) - (a.flyer_tags?.length || 0));
  }, [events, activeTags, activeTowns, city, filterMode, showAllEvents, excludeMode, showSpam]);

  return {
    userId,
    events,
    isLoading,
    isSyncing,
    filteredEvents,
    weightedTags,
    allTimeTags,
    weightedLocals,
    savedLocations, activeTags, setActiveTags,
    activeTowns, setActiveTowns, filterMode, setFilterMode,
    showAllEvents, setShowAllEvents,
    excludeMode, setExcludeMode,
    showSpam, setShowSpam, showAllAges, setShowAllAges, show18, setShow18, show21, setShow21, 
    slugify, fetchEvents
  };
}