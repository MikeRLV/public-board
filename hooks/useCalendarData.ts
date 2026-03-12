"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useCalendarData(city: string, currentDate: dayjs.Dayjs, initialLocals: string[] = [], initialTags: string[] = []) {
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [weightedTags, setWeightedTags] = useState<{name: string, weight: number}[]>([]);
  const [weightedLocals, setWeightedLocals] = useState<{name: string, weight: number}[]>([]); 
  const [savedLocations, setSavedLocations] = useState<string[]>([]);
  const [allTimeTags, setAllTimeTags] = useState<{name: string, count: number}[]>([]);
  
  const [activeTags, setActiveTags] = useState<string[]>(initialTags);
  const [activeTowns, setActiveTowns] = useState<string[]>(initialLocals);
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>('OR');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showSpam, setShowSpam] = useState(false);
  const [showAllAges, setShowAllAges] = useState(false);
  const [show18, setShow18] = useState(false);
  const [show21, setShow21] = useState(false);

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

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
    const start = currentDate.startOf('month').toISOString();
    const end = currentDate.endOf('month').toISOString();
    const citySlug = city ? slugify(city) : null;
    const targetCities = Array.from(new Set([...activeTowns, citySlug].filter(Boolean)));

    if (targetCities.length === 0) {
      setWeightedTags([]);
      return;
    }

    try {
      const { data: monthFlyers } = await supabase
        .from('flyers')
        .select('flyer_tags(vote_count, tags(name)), city_slug')
        .or(`city_slug.cs.{${targetCities.join(',')}}`) 
        .gte('event_start', start)
        .lte('event_start', end);

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

  const fetchEvents = async () => {
    const start = currentDate.startOf('month').toISOString();
    const end = currentDate.endOf('month').toISOString();
    
    let query = supabase
      .from('flyers')
      .select('*, flyer_tags(vote_count, tags(name))')
      .gte('event_start', start)
      .lte('event_start', end);

    const citySlug = city ? slugify(city) : null;
    const allSearchTowns = Array.from(new Set([...activeTowns, citySlug].filter(Boolean)));

    if (allSearchTowns.length > 0) {
      query = query.or(`city_slug.cs.{${allSearchTowns.join(',')}}`);
      const { data, error } = await query;
      if (!error && data) setEvents(data);
    } else { 
      setEvents([]); 
    }
  };

  useEffect(() => { fetchEvents(); }, [currentDate, city, activeTowns]);

  const filteredEvents = useMemo(() => {
    if (activeTowns.length === 0 && !city) return [];
    
    const citySlug = city ? slugify(city) : null;
    const currentViewTowns = Array.from(new Set([...activeTowns, citySlug].filter(Boolean)));

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
