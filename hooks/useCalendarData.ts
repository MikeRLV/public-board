"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [showSpam, setShowSpam] = useState(false);
  const [showAllAges, setShowAllAges] = useState(false);
  const [show18, setShow18] = useState(false);
  const [show21, setShow21] = useState(false);

  // All locals — always fetched on mount, never gated on selection
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

  // All-time tags: fetched once on mount, used by BrowseModal 'all-tags' view
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

  const syncTicketmaster = async (towns: string[], date: dayjs.Dayjs) => {
    const month = date.format('YYYY-MM');
    const targets = towns.length > 0 ? towns : city ? [slugify(city)] : [];
    if (targets.length === 0) return;

    await Promise.all(
      targets.map(async (citySlug) => {
        try {
          const res = await fetch('/api/ticketmaster/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citySlug, month }),
          });
          const d = await res.json();
          console.log('TM sync:', d);
        } catch (e) {
          console.error('TM sync error:', e);
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
        });
      } catch {}
    });
  };

  const fetchEvents = async (cancelled = false) => {
    setIsLoading(true);
    const monthStart = currentDate.format('YYYY-MM-01');
    const nextMonth = currentDate.add(1, 'month').format('YYYY-MM-01');

    const citySlug = city ? slugify(city) : null;
    const allSearchTowns = Array.from(new Set([...activeTowns, citySlug].filter((t): t is string => typeof t === 'string' && t.length > 0)));

    if (allSearchTowns.length === 0) { setIsLoading(false); return; }

    const cityFilters = allSearchTowns.map((t: string) => `city_slug.cs.{${t}}`).join(',');

    const { data, error } = await supabase
      .from('flyers')
      .select('*, flyer_tags(vote_count, tags(name))')
      .gte('event_start', monthStart)
      .lt('event_start', nextMonth)
      .or(cityFilters);

    if (!cancelled && !error && data) setEvents(data);
    if (!cancelled) setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await fetchEvents(cancelled);
      if (cancelled) return;

      preSyncMonth(activeTowns, currentDate.add(1, 'month'));
      preSyncMonth(activeTowns, currentDate.add(2, 'month'));
      preSyncMonth(activeTowns, currentDate.add(3, 'month'));

      await syncTicketmaster(activeTowns, currentDate);
      if (cancelled) return;

      fetchEvents(cancelled);
    };

    run();
    return () => { cancelled = true; };
  }, [currentDate, city, activeTowns]);

  const filteredEvents = useMemo(() => {
    if (activeTowns.length === 0 && !city) return [];
    
    const citySlug = city ? slugify(city) : null;
    const currentViewTowns = Array.from(new Set([...activeTowns, citySlug].filter((t): t is string => typeof t === 'string' && t.length > 0)));

    return events.filter((e: any) => {
      const eventSlugs = Array.isArray(e.city_slug) ? e.city_slug : [e.city_slug];
      const isInTargetLoCAL = currentViewTowns.some(town => eventSlugs.includes(town));
      if (!isInTargetLoCAL) return false;

      const totalVotes = e.flyer_tags?.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0) || 0;
      const isSpam = totalVotes > 0 && ((e.flyer_tags?.find((ft: any) => slugify(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;

      if (showAllEvents) return true;
      if (activeTags.length === 0) return false;

      const eventTags = e.flyer_tags?.map((ft: any) => slugify(ft.tags.name)) || [];
      const passesTags = filterMode === 'OR' 
        ? activeTags.some((tag: string) => eventTags.includes(slugify(tag))) 
        : activeTags.every((tag: string) => eventTags.includes(slugify(tag)));
        
      return passesTags;
    }).sort((a, b) => (b.flyer_tags?.length || 0) - (a.flyer_tags?.length || 0));
  }, [events, activeTags, activeTowns, city, filterMode, showAllEvents, showSpam]);

  return {
    userId, 
    events,
    isLoading,
    filteredEvents, 
    weightedTags,
    allTimeTags,
    weightedLocals,
    savedLocations, activeTags, setActiveTags,
    activeTowns, setActiveTowns, filterMode, setFilterMode, showAllEvents, setShowAllEvents,
    showSpam, setShowSpam, showAllAges, setShowAllAges, show18, setShow18, show21, setShow21, 
    slugify, fetchEvents
  };
}