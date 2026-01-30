"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useCalendarData(city: string, currentDate: dayjs.Dayjs) {
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [weightedTags, setWeightedTags] = useState<{name: string, weight: number}[]>([]);
  const [weightedLocals, setWeightedLocals] = useState<{name: string, weight: number}[]>([]); 
  const [savedLocations, setSavedLocations] = useState<string[]>([]);
  
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeTowns, setActiveTowns] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>('OR');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showSpam, setShowSpam] = useState(false);

  const [showAllAges, setShowAllAges] = useState(false);
  const [show18, setShow18] = useState(false);
  const [show21, setShow21] = useState(false);

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const fetchPools = async () => {
    const { data, error } = await supabase.from('flyer_tags').select('vote_count, tags(name)').limit(500);
    
    if (!error && data) {
      const tagCounts: Record<string, number> = {};
      data.forEach((ft: any) => {
        const name = ft.tags?.name;
        if (name && slugify(name) !== 'spam') { 
          const key = slugify(name);
          tagCounts[key] = (tagCounts[key] || 0) + (ft.vote_count || 0);
        }
      });
      setWeightedTags(Object.entries(tagCounts).map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight));
    }

    const { data: localData } = await supabase.from('flyers').select('town_name');
    if (localData) {
      const localCounts: Record<string, number> = {};
      localData.forEach((f: any) => {
        if (f.town_name) {
          const key = f.town_name.toLowerCase();
          localCounts[key] = (localCounts[key] || 0) + 1;
        }
      });
      setWeightedLocals(Object.entries(localCounts).map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight));
    }
  };

  useEffect(() => { fetchPools(); }, []); 
  useEffect(() => { fetchPools(); }, [events]); 

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

    const fetchUniqueTowns = async () => {
      const { data } = await supabase.from('flyers').select('town_name').not('town_name', 'is', null);
      if (data) {
        const unique = Array.from(new Set(data.map((item: any) => item.town_name))).sort((a: any, b: any) => a.localeCompare(b));
        setSavedLocations(unique);
      }
    };
    fetchUniqueTowns();
  }, []);

  const fetchEvents = async () => {
    const start = currentDate.startOf('month').toISOString();
    const end = currentDate.endOf('month').toISOString();
    let query = supabase.from('flyers').select('*, flyer_tags(vote_count, tags(name))').gte('event_start', start).lte('event_start', end);
    const citySlug = city ? slugify(city) : null;
    if (activeTowns.length > 0 || citySlug) {
      const townFilters = activeTowns.map((t: string) => `town_name.eq.${t}`);
      const cityFilter = citySlug ? `city_slug.eq.${citySlug}` : '';
      query = query.or([...townFilters, cityFilter].filter(Boolean).join(','));
      const { data } = await query;
      if (data) setEvents(data);
    } else { setEvents([]); }
  };

  useEffect(() => { fetchEvents(); }, [currentDate, city, activeTowns]);

  // --- REFACTORED FILTERING ENGINE ---
  const filteredEvents = useMemo(() => {
    if (activeTowns.length === 0 && !city) return [];
    
    return events.filter((e: any) => {
      // 1. Geography Check (LoCAL or City)
      if (activeTowns.length > 0 && !activeTowns.includes(e.town_name)) return false;

      // 2. Spam Filter (Always active unless showSpam is toggled)
      const totalVotes = e.flyer_tags.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0);
      const isSpam = totalVotes > 0 && ((e.flyer_tags.find((ft: any) => slugify(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;

      // 3. MASTER OVERRIDE: If Show All is active, let it through
      if (showAllEvents) return true;

      // 4. Tag Dependency: If not "Showing All", we must have active tags
      if (activeTags.length === 0) return false;

      // 5. Normal Tag Filtering
      const eventTags = e.flyer_tags.map((ft: any) => slugify(ft.tags.name));
      const passesTags = filterMode === 'OR' 
        ? activeTags.some((tag: string) => eventTags.includes(slugify(tag))) 
        : activeTags.every((tag: string) => eventTags.includes(slugify(tag)));
        
      return passesTags;
    }).sort((a, b) => b.flyer_tags.length - a.flyer_tags.length);
  }, [events, activeTags, activeTowns, city, filterMode, showAllEvents, showSpam]);

  return {
    userId, filteredEvents, weightedTags, weightedLocals,
    savedLocations, activeTags, setActiveTags,
    activeTowns, setActiveTowns, filterMode, setFilterMode, showAllEvents, setShowAllEvents,
    showSpam, setShowSpam, showAllAges, setShowAllAges, show18, setShow18, show21, setShow21, 
    slugify, fetchEvents
  };
}