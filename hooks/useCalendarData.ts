"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

export function useCalendarData(city: string, currentDate: dayjs.Dayjs, initialLocals: string[] = [], initialTags: string[] = []) {
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [weightedTags, setWeightedTags] = useState<{name: string, weight: number}[]>([]);
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

  // Ref so background fetches can check if still mounted without triggering re-renders
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

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

  const fetchPools = async () => {
    const start = currentDate.startOf('month').format('YYYY-MM-DD');
    const end = currentDate.endOf('month').format('YYYY-MM-DD');
    const citySlug = city ? slugify(city) : null;
    const targetCities = Array.from(new Set([...activeTowns, citySlug].filter((t): t is string => typeof t === 'string' && t.length > 0)));

    if (targetCities.length === 0) {
      setWeightedTags([]);
      return;
    }

    try {
      const cityFilters = targetCities.map((t: string) => `city_slug.cs.{${t}}`).join(',');
      const { data: monthFlyers } = await supabase
        .from('flyers')
        .select('flyer_tags(vote_count, tags(name)), city_slug')
        .or(cityFilters)
        .gte('event_start', start)
        .lte('event_start', end + 'T23:59:59');

      let tagCounts: Record<string, number> = {};

      if (monthFlyers && monthFlyers.length > 0) {
        monthFlyers.forEach((flyer: any) => {
          flyer.flyer_tags?.forEach((ft: any) => {
            const tagName = ft.tags?.name;
            if (tagName && slugify(tagName) !== 'spam') {
              const key = slugify(tagName);
              tagCounts[key] = (tagCounts[key] || 0) + (ft.vote_count || 0);
            }
          });
        });
      }

      if (Object.keys(tagCounts).length === 0) {
        const { data: globalTags } = await supabase
          .from('flyer_tags')
          .select('vote_count, tags(name)')
          .limit(200);

        globalTags?.forEach((ft: any) => {
          const tagName = ft.tags?.name;
          if (tagName && slugify(tagName) !== 'spam') {
            const key = slugify(tagName);
            tagCounts[key] = (tagCounts[key] || 0) + (ft.vote_count || 0);
          }
        });
      }

      const weighted = Object.entries(tagCounts)
        .map(([name, weight]) => ({ name, weight }))
        .sort((a, b) => b.weight - a.weight);

      setWeightedTags(weighted);
    } catch (err) {
      console.error("Pool fetch failed:", err);
    }
  };

  useEffect(() => { fetchPools(); }, [currentDate, city, activeTowns, events]); 

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

    const { data, error } = await supabase
      .from('flyers')
      .select('*, flyer_tags(vote_count, tags(name))')
      .gte('event_start', monthStart)
      .lt('event_start', nextMonth)
      .or(cityFilters);

    if (error) return null;
    return data ?? [];
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

  // Silent background fetch — no loading state, merges new events in.
  // Same stale-while-revalidate rule: never blank if DB temporarily returns empty.
  const silentFetch = useCallback(async () => {
    if (!isMountedRef.current) return;
    const data = await queryEvents();
    if (isMountedRef.current && data !== null && data.length > 0) {
      setEvents(data);
      eventsCache.set(cacheKey(city, currentDate), data);
    }
  }, [queryEvents, city, currentDate]);

  const syncPlatforms = async (targets: string[], date: dayjs.Dayjs) => {
    const month = date.format('YYYY-MM');
    if (targets.length === 0) return;

    await Promise.all(
      targets.map(async (citySlug) => {
        try {
          // TM runs first so BIT dedup can check against it
          await fetch('/api/ticketmaster/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }).catch(() => {});

          await Promise.allSettled([
            fetch('/api/dice/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ citySlug, month }),
            }),
            fetch('/api/bandsintown/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ citySlug, month }),
            }),
            fetch('/api/ntdlv/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ citySlug, month }),
            }),
            fetch('/api/vegas-underground/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ citySlug, month }),
            }),
            fetch('/api/eventbrite/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ citySlug, month }),
            }),
          ]);
        } catch (e) {
          console.error('Sync error:', e);
        }
      })
    );
  };

  const preSyncMonth = (towns: string[], date: dayjs.Dayjs) => {
    const month = date.format('YYYY-MM');
    const targets = towns.length > 0 ? towns : city ? [slugify(city)] : [];
    targets.forEach(async (citySlug) => {
      try {
        await fetch('/api/ticketmaster/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ citySlug, month }),
        }).catch(() => {});

        await Promise.allSettled([
          fetch('/api/dice/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }),
          fetch('/api/bandsintown/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }),
          fetch('/api/ntdlv/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }),
          fetch('/api/vegas-underground/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }),
          fetch('/api/eventbrite/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          }),
        ]);
      } catch {}
    });
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const targets = activeTowns.length > 0
        ? activeTowns
        : city ? [slugify(city)] : [];

      // 1. Restore from in-memory cache instantly — no blank flash on re-visit
      const key = cacheKey(city, currentDate);
      const cached = eventsCache.get(key);
      if (cached && cached.length > 0) {
        setEvents(cached);
        setIsLoading(false);

        // Still pre-sync adjacent months and silently refresh current month
        preSyncMonth(targets, currentDate.subtract(1, 'month'));
        preSyncMonth(targets, currentDate.add(1, 'month'));
        preSyncMonth(targets, currentDate.add(2, 'month'));
        preSyncMonth(targets, currentDate.add(3, 'month'));

        pollInterval = setInterval(() => {
          if (!cancelled) silentFetch();
        }, 5000);

        await syncPlatforms(targets, currentDate);

        if (pollInterval) clearInterval(pollInterval);
        if (!cancelled) silentFetch();
        return;
      }

      // 2. No cache — first visit: show whatever is already in Supabase immediately
      await fetchEvents(cancelled);
      if (cancelled) return;

      // 3. Pre-sync adjacent months in background (fire and forget)
      preSyncMonth(targets, currentDate.subtract(1, 'month'));
      preSyncMonth(targets, currentDate.add(1, 'month'));
      preSyncMonth(targets, currentDate.add(2, 'month'));
      preSyncMonth(targets, currentDate.add(3, 'month'));

      // 4. Start polling silently every 5s so events appear as they land
      pollInterval = setInterval(() => {
        if (!cancelled) silentFetch();
      }, 5000);

      // 5. Sync current month — wait for it to finish
      await syncPlatforms(targets, currentDate);

      // 6. Stop polling, do one final silent fetch to catch anything last
      if (pollInterval) clearInterval(pollInterval);
      if (!cancelled) silentFetch();
    };

    run();
    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
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

    return events.filter((e: any) => {
      const eventSlugs = Array.isArray(e.city_slug) ? e.city_slug : [e.city_slug];
      const isInTargetLoCAL = currentViewTowns.some(town => eventSlugs.includes(town));
      if (!isInTargetLoCAL) return false;

      if (hasTMDuplicate(e)) return false;

      const totalVotes = e.flyer_tags?.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0) || 0;
      const isSpam = totalVotes > 0 && ((e.flyer_tags?.find((ft: any) => slugify(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;

      if (showAllEvents) {
        // In exclude mode, hide events that have any of the active tags
        if (excludeMode && activeTags.length > 0) {
          const eventTags = e.flyer_tags?.map((ft: any) => slugify(ft.tags.name)) || [];
          if (e.source) eventTags.push(slugify(e.source));
          return !activeTags.some((tag: string) => eventTags.includes(slugify(tag)));
        }
        return true;
      }

      if (activeTags.length === 0) return false;

      const eventTags = e.flyer_tags?.map((ft: any) => slugify(ft.tags.name)) || [];
      if (e.source) eventTags.push(slugify(e.source));

      const passesTags = filterMode === 'OR' 
        ? activeTags.some((tag: string) => eventTags.includes(slugify(tag))) 
        : activeTags.every((tag: string) => eventTags.includes(slugify(tag)));
        
      return passesTags;
    }).sort((a, b) => (b.flyer_tags?.length || 0) - (a.flyer_tags?.length || 0));
  }, [events, activeTags, activeTowns, city, filterMode, showAllEvents, excludeMode, showSpam]);

  return {
    userId, 
    events,
    isLoading,
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