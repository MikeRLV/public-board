"use client";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCalendarData } from "../hooks/useCalendarData"; 
import { Sidebar } from "./Sidebar"; 
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { DayDetailsModal } from "./DayDetailsModal";
import { PostEventModal } from "./PostEventModal";
import { TrendingModal } from "./TrendingModal";
import { LocationBucketModal } from "./LocationBucketModal";
import { BANNED_WORDS_SET } from "../lib/bannedWords";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function CalendarLogic({ city }: { city: string }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isTrendingModalOpen, setIsTrendingModalOpen] = useState(false);
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    userId, filteredEvents, weightedTags, weightedLocals, // Integrated separate LoCAL pool
    savedLocations, activeTags, setActiveTags,
    activeTowns, setActiveTowns, filterMode, setFilterMode, showAllEvents, setShowAllEvents,
    showSpam, setShowSpam, showAllAges, setShowAllAges, show18, setShow18, show21, setShow21, 
    slugify, fetchEvents
  } = useCalendarData(city, currentDate);

  const [formState, setFormState] = useState({
    title: "", town: "", place: "", price: "", desc: "", date: "", tags: "", image: null as File | null,
    isAllAges: false, is18Plus: false, is21Plus: false 
  });

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const handlePostSubmit = async () => {
    if (isUploading || !formState.image || !formState.town) return;

    const localsArray = formState.town
      .split(',')
      .map(t => slugify(t))
      .filter(t => t !== "" && !BANNED_WORDS_SET.has(t));

    if (localsArray.length === 0) return alert("Prohibited or empty LoCAL name.");

    setIsUploading(true);
    try {
      const fileExt = formState.image.name.split('.').pop();
      const fileName = `${localsArray[0]}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('flyers').upload(fileName, formState.image);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('flyers').getPublicUrl(fileName);
      const tags = formState.tags.split(',').map(t => slugify(t)).filter(t => t !== "");

      for (const localSlug of localsArray) {
        const { data: insertedData, error: insertError } = await supabase.from('flyers').insert({
          city_slug: localSlug,
          town_name: localSlug, 
          title: formState.title, 
          location_name: formState.place, 
          price: formState.price, 
          description: formState.desc, 
          image_url: urlData.publicUrl, 
          event_start: dayjs(formState.date).hour(12).toISOString()
        }).select(); 

        if (!insertError && insertedData?.[0]) {
          for (const t of tags) {
            await supabase.rpc('vote_on_tag', { target_flyer_id: insertedData[0].id, target_tag_name: t, vote_val: 1, voter_id: userId });
          }
        }
      }

      setFormState({ title: "", town: "", place: "", price: "", desc: "", date: "", tags: "", image: null, isAllAges: false, is18Plus: false, is21Plus: false });
      setIsPostModalOpen(false); 
      fetchEvents(); 
    } finally { 
      setIsUploading(false); 
    }
  };

  return (
    <div className="flex min-h-screen font-mono text-sm text-white bg-black">
      <Sidebar 
        currentCity={city} 
        activeTags={activeTags} 
        setActiveTags={setActiveTags} 
        activeTowns={activeTowns} 
        setActiveTowns={setActiveTowns} 
        savedLocations={savedLocations} 
        filterMode={filterMode} 
        setFilterMode={setFilterMode} 
        trendingTags={weightedTags} 
        onTrendingClick={() => setIsTrendingModalOpen(true)} 
        onBucketClick={() => setIsBucketModalOpen(true)} 
        showAllEvents={showAllEvents} 
        setShowAllEvents={setShowAllEvents} 
        showSpam={showSpam} 
        setShowSpam={setShowSpam} 
        showAllAges={showAllAges} 
        setShowAllAges={setShowAllAges} 
        show18={show18} 
        setShow18={setShow18} 
        show21={show21} 
        setShow21={setShow21} 
        onAddEvent={() => setIsPostModalOpen(true)} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <CalendarHeader 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          activeTowns={activeTowns} 
          setActiveTowns={setActiveTowns} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        
        {activeTowns.length === 0 && !city ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-neutral-900/20">
            <h2 className="text-4xl font-black text-yellow-500 uppercase tracking-tighter leading-none">No LoCAL Selected</h2>
          </div>
        ) : (
          <CalendarGrid 
            currentDate={currentDate} 
            todayStr={todayStr} 
            activeDay={activeDay} 
            setActiveDay={setActiveDay} 
            filteredEvents={filteredEvents} 
            city={city || activeTowns[0]} 
          />
        )}
        
        {activeDay && (
          <DayDetailsModal 
            activeDay={activeDay} 
            events={filteredEvents} 
            onClose={() => setActiveDay(null)} 
            onVote={fetchEvents} 
            weightedTags={weightedTags} 
            onPostClick={() => setIsPostModalOpen(true)} 
          />
        )}
        
        <PostEventModal 
          isOpen={isPostModalOpen} 
          onClose={() => setIsPostModalOpen(false)} 
          formState={formState} 
          setFormState={setFormState} 
          onSave={handlePostSubmit} 
          isUploading={isUploading} 
          todayStr={todayStr} 
          weightedTags={weightedTags} 
          weightedLocals={weightedLocals} // Passed the separate LoCAL suggestion pool
        />
        
        <TrendingModal 
          isOpen={isTrendingModalOpen} 
          onClose={() => setIsTrendingModalOpen(false)} 
          weightedTags={weightedTags} 
          activeTags={activeTags} 
          setActiveTags={setActiveTags} 
        />
        
        <LocationBucketModal 
          isOpen={isBucketModalOpen} 
          onClose={() => setIsBucketModalOpen(false)} 
          savedLocations={savedLocations} 
          activeTowns={activeTowns} 
          onAddTown={(loc: string) => setActiveTowns([...activeTowns, slugify(loc)])} 
        />
      </div>
    </div>
  );
}