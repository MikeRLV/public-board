"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Sidebar } from "./Sidebar"; 
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailsModal } from "./DayDetailsModal";
import { PostEventModal } from "./PostEventModal";
import { TrendingModal } from "./TrendingModal";
import { LocationBucketModal } from "./LocationBucketModal"; 
import { useRouter } from "next/navigation";
import { BANNED_WORDS_ARRAY, BANNED_WORDS_SET } from "../lib/bannedWords";

dayjs.extend(isSameOrAfter);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function CalendarLogic({ city }: { city: string }) {
  const router = useRouter();

  // --- UI & Modal State ---
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isTrendingModalOpen, setIsTrendingModalOpen] = useState(false);
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false); 
  const [isUploading, setIsUploading] = useState(false);

  // --- Data & Filtering State ---
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [weightedTags, setWeightedTags] = useState<{name: string, weight: number}[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeTowns, setActiveTowns] = useState<string[]>([]); 
  const [savedLocations, setSavedLocations] = useState<string[]>([]); 
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>('OR'); 
  const [showAllEvents, setShowAllEvents] = useState(false); 
  const [showSpam, setShowSpam] = useState(false); 

  // --- Age Restriction Filter States ---
  const [showAllAges, setShowAllAges] = useState(false);
  const [show18, setShow18] = useState(false);
  const [show21, setShow21] = useState(false);

  // --- Form State ---
  const [formState, setFormState] = useState({
    title: "", town: "", place: "", price: "", desc: "", date: "", tags: "", image: null as File | null,
    isAllAges: false, is18Plus: false, is21Plus: false 
  });

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  useEffect(() => {
    let storedId = localStorage.getItem("local_user_id") || crypto.randomUUID();
    localStorage.setItem("local_user_id", storedId);
    setUserId(storedId);
  }, []);

  // FIXED: Fetch unique towns on MOUNT, not just when events change. 
  // This ensures the Locations modal isn't empty when the calendar starts gated.
  useEffect(() => {
    const fetchUniqueTowns = async () => {
      const { data, error } = await supabase
        .from('flyers')
        .select('town_name')
        .not('town_name', 'is', null);

      if (!error && data) {
        const unique = Array.from(new Set(data.map((item: any) => item.town_name)))
          .sort((a: any, b: any) => a.localeCompare(b));
        setSavedLocations(unique);
      }
    };
    fetchUniqueTowns();
  }, []); 

  useEffect(() => {
    const fetchWeightedTags = async () => {
      const { data, error } = await supabase.from('flyer_tags').select('vote_count, tags(name)').limit(500);
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((ft: any) => {
          const name = ft.tags?.name;
          if (name && slugify(name) !== 'spam') { 
            const key = slugify(name);
            counts[key] = (counts[key] || 0) + (ft.vote_count || 0);
          }
        });
        setWeightedTags(Object.entries(counts).map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight));
      }
    };
    fetchWeightedTags();
  }, [events]);

  const fetchEvents = async () => {
    const start = currentDate.startOf('month').toISOString();
    const end = currentDate.endOf('month').toISOString();
    
    let query = supabase
      .from('flyers')
      .select('*, flyer_tags(vote_count, tags(name))')
      .gte('event_start', start)
      .lte('event_start', end);

    const citySlug = city ? slugify(city) : null;

    if (activeTowns.length > 0 || citySlug) {
      const townFilters = activeTowns.map((t: string) => `town_name.eq.${t}`);
      const cityFilter = citySlug ? `city_slug.eq.${citySlug}` : '';
      const orFilter = [...townFilters, cityFilter].filter(Boolean).join(',');
      query = query.or(orFilter);
    } else {
      setEvents([]);
      return;
    }

    const { data, error } = await query;
    if (!error && data) setEvents(data);
  };

  useEffect(() => { fetchEvents(); }, [currentDate, city, activeTowns]);

  const handleClosePostModal = () => {
    setFormState({ 
      title: "", town: "", place: "", price: "", desc: "", date: "", tags: "", image: null,
      isAllAges: false, is18Plus: false, is21Plus: false 
    });
    setIsPostModalOpen(false);
  };

  const handlePostSubmit = async () => {
    if (isUploading || !formState.image || !formState.town) return;
    const townSlug = slugify(formState.town);
    if (BANNED_WORDS_SET.has(townSlug)) return alert("Prohibited location name.");
    const tags = formState.tags.split(',').map((t: string) => slugify(t)).filter((t: string) => t !== "");
    if (tags.some((tag: string) => BANNED_WORDS_SET.has(tag))) return alert("One or more tags prohibited.");

    setIsUploading(true);
    try {
      const fileExt = formState.image.name.split('.').pop();
      const fileName = `${townSlug}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('flyers').upload(fileName, formState.image);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('flyers').getPublicUrl(fileName);
      const targetCity = city || townSlug;
      const { data: insertedData, error: insertError } = await supabase.from('flyers').insert({
        city_slug: slugify(targetCity), town_name: townSlug, title: formState.title, 
        location_name: formState.place, price: formState.price, description: formState.desc, 
        image_url: urlData.publicUrl, event_start: dayjs(formState.date).hour(12).toISOString()
      }).select(); 

      if (!insertError && insertedData?.[0]) {
        for (const t of tags) await supabase.rpc('vote_on_tag', { target_flyer_id: insertedData[0].id, target_tag_name: t, vote_val: 1, voter_id: userId });
        handleClosePostModal();
        if (!city) {
          router.push(`/?city=${townSlug}`);
        } else {
          if (!activeTowns.includes(townSlug)) setActiveTowns([...activeTowns, townSlug]);
          fetchEvents();
        }
      }
    } finally { setIsUploading(false); }
  };

  // --- UPDATED: Strict Location-First Gate Logic ---
  const filteredEvents = useMemo(() => {
    // 1. HARD GATE: Return empty immediately if no location is selected in bucket or URL.
    // This stops random global results from populating the grid.
    const hasActiveLocation = activeTowns.length > 0 || city;
    if (!hasActiveLocation) return [];

    return events.filter((e: any) => {
      // 2. BOUNDARY CHECK: Even if a town is picked, event must match an active chip.
      if (activeTowns.length > 0 && !activeTowns.includes(e.town_name)) return false;
      
      const eventTags = e.flyer_tags.map((ft: any) => slugify(ft.tags.name));

      // 3. SHOW ALL MODE: Limited strictly to the active location context.
      if (showAllEvents) return true;

      // 4. DISCOVERY CHECK: Grid stays empty until a tag or age filter is active.
      const hasActiveFilter = activeTags.length > 0 || showAllAges || show18 || show21;
      if (!hasActiveFilter) return false;

      // 5. AGE FILTERS
      if (showAllAges && !eventTags.includes("all-ages")) return false;
      if (show18 && !eventTags.includes("18+")) return false;
      if (show21 && !eventTags.includes("21+")) return false;

      // 6. TAG FILTERING logic
      if (activeTags.length > 0) {
        const passesTags = filterMode === 'OR' 
          ? activeTags.some((tag: string) => eventTags.includes(slugify(tag))) 
          : activeTags.every((tag: string) => eventTags.includes(slugify(tag)));
        
        if (!passesTags) return false;
      }

      // 7. SPAM FILTER calculation
      const totalVotes = e.flyer_tags.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0);
      const isSpam = totalVotes > 0 && ((e.flyer_tags.find((ft: any) => slugify(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;

      return true; 
    }).sort((a: any, b: any) => b.flyer_tags.length - a.flyer_tags.length);
  }, [events, activeTags, activeTowns, city, filterMode, showAllEvents, showSpam, showAllAges, show18, show21]);

  return (
    <div className="flex min-h-screen font-mono text-sm text-white bg-black">
      <Sidebar 
        currentCity={city} 
        activeTags={activeTags} setActiveTags={setActiveTags} 
        activeTowns={activeTowns} setActiveTowns={setActiveTowns} 
        savedLocations={savedLocations} 
        filterMode={filterMode} setFilterMode={setFilterMode} 
        trendingTags={weightedTags} 
        onTrendingClick={() => setIsTrendingModalOpen(true)} 
        onBucketClick={() => setIsBucketModalOpen(true)} 
        showAllEvents={showAllEvents} setShowAllEvents={setShowAllEvents} 
        showSpam={showSpam} setShowSpam={setShowSpam} 
        showAllAges={showAllAges} setShowAllAges={setShowAllAges}
        show18={show18} setShow18={setShow18}
        show21={show21} setShow21={setShow21}
        onAddEvent={() => { 
          setFormState({...formState, date: todayStr, town: city || activeTowns[0] || ""}); 
          setIsPostModalOpen(true); 
        }}
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} 
        bannedWords={BANNED_WORDS_ARRAY}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} activeTowns={activeTowns} setActiveTowns={setActiveTowns} onMenuClick={() => setIsSidebarOpen(true)} />
        
        {activeTowns.length === 0 && !city ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-neutral-900/20">
            <h2 className="text-4xl font-black text-yellow-500 uppercase tracking-tighter leading-none">No Location Selected</h2>
            <div className="pt-4 animate-pulse">
              <span className="text-[10px] text-yellow-600 font-black border border-yellow-600/30 px-4 py-2 rounded-full uppercase tracking-widest">&larr; Add a town to view a Calendar</span>
            </div>
          </div>
        ) : (
          <CalendarGrid currentDate={currentDate} todayStr={todayStr} activeDay={activeDay} setActiveDay={setActiveDay} filteredEvents={filteredEvents} city={city || activeTowns[0]} />
        )}

        {activeDay && (
          <DayDetailsModal 
            activeDay={activeDay} 
            events={filteredEvents} 
            onClose={() => setActiveDay(null)} 
            onVote={fetchEvents} 
            weightedTags={weightedTags} 
            onPostClick={(d: string) => { 
               setActiveDay(null); 
               setFormState({...formState, date: d, town: city || activeTowns[0] || "", isAllAges: false, is18Plus: false, is21Plus: false}); 
               setIsPostModalOpen(true); 
            }} 
          />
        )}

        <PostEventModal 
          isOpen={isPostModalOpen} 
          onClose={handleClosePostModal} 
          formState={formState} 
          setFormState={setFormState} 
          onSave={handlePostSubmit} 
          isUploading={isUploading} 
          todayStr={todayStr} 
          weightedTags={weightedTags} 
        />

        <TrendingModal isOpen={isTrendingModalOpen} onClose={() => setIsTrendingModalOpen(false)} weightedTags={weightedTags} activeTags={activeTags} setActiveTags={setActiveTags} />

        <LocationBucketModal 
          isOpen={isBucketModalOpen} 
          onClose={() => setIsBucketModalOpen(false)} 
          savedLocations={savedLocations}
          activeTowns={activeTowns}
          onAddTown={(loc: string) => {
            const slug = slugify(loc);
            if (!activeTowns.includes(slug)) setActiveTowns([...activeTowns, slug]);
            setIsBucketModalOpen(false); 
          }}
        />
      </div>
    </div>
  );
}