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
import { TutorialOverlay } from "./TutorialOverlay";
import { PostEventModal } from "./PostEventModal";
import { BrowseModal } from "./BrowseModal";
import { BANNED_WORDS_SET } from "../lib/bannedWords";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function CalendarLogic({ city, initialLocals = [], initialTags = [] }: { city: string; initialLocals?: string[]; initialTags?: string[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // BrowseModal unified state
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [browseType, setBrowseType] = useState<'locals' | 'trending' | 'all-tags'>('locals');

  const openBrowse = (type: 'locals' | 'trending' | 'all-tags') => {
    setBrowseType(type);
    setIsBrowseOpen(true);
  };

  const {
    userId, events, filteredEvents, weightedTags, weightedLocals, allTimeTags,
    savedLocations, activeTags, setActiveTags,
    activeTowns, setActiveTowns, filterMode, setFilterMode, showAllEvents, setShowAllEvents,
    showSpam, setShowSpam, showAllAges, setShowAllAges, show18, setShow18, show21, setShow21, 
    slugify, fetchEvents
  } = useCalendarData(city, currentDate, initialLocals, initialTags);

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

      const { data: insertedData, error: insertError } = await supabase.from('flyers').upsert({
        city_slug: localsArray,    
        town_name: localsArray[0],  
        title: formState.title, 
        location_name: formState.place, 
        price: formState.price, 
        description: formState.desc, 
        image_url: urlData.publicUrl, 
        event_start: dayjs(formState.date).hour(12).toISOString()
      }, { onConflict: 'title' }).select(); 

      if (!insertError && insertedData?.[0]) {
        for (const t of tags) {
          await supabase.rpc('vote_on_tag', { 
            target_flyer_id: insertedData[0].id, 
            target_tag_name: t, 
            vote_val: 1, 
            voter_id: userId 
          });
        }
      }

      setFormState({ title: "", town: "", place: "", price: "", desc: "", date: "", tags: "", image: null, isAllAges: false, is18Plus: false, is21Plus: false });
      setIsPostModalOpen(false); 
      fetchEvents(); 
    } catch (err: any) {
      alert("Error: " + err.message);
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
        onTrendingClick={() => openBrowse('trending')}
        onBucketClick={() => openBrowse('locals')}
        onTagsClick={() => openBrowse('all-tags')}
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
        filteredEvents={filteredEvents} 
        hasEventsThisMonth={events && events.length > 0}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-visible">
        <CalendarHeader 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          activeTowns={activeTowns} 
          setActiveTowns={setActiveTowns} 
          onMenuClick={() => setIsSidebarOpen(true)} 
          activeTags={activeTags} 
          setActiveTags={setActiveTags}
        />
        
        {activeTowns.length === 0 && !city ? (
          <TutorialOverlay />
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
            onVote={async (flyerId: string, tagName: string, voteVal: number) => {
              if (!flyerId || !tagName) { fetchEvents(); return; }

              const userId = localStorage.getItem("local_user_id");

              // Spam is always single flyer, no lock
              if (tagName === 'spam') {
                await supabase.rpc('vote_on_tag', { target_flyer_id: flyerId, target_tag_name: 'spam', vote_val: 1, voter_id: userId });
                fetchEvents();
                return;
              }

              const thisEvent = filteredEvents.find((e: any) => e.id === flyerId);
              if (!thisEvent) return;

              const lockKey = `voted:${thisEvent.title.toLowerCase()}:${tagName}`;
              const prevVote = localStorage.getItem(lockKey);

              // Block if already voted the same direction
              if (prevVote !== null && parseInt(prevVote) === voteVal) return;

              // Send raw voteVal — the RPC tracks per-voter and handles its own delta
              await supabase.rpc('vote_on_tag', {
                target_flyer_id: flyerId,
                target_tag_name: tagName,
                vote_val: voteVal,
                voter_id: userId
              });

              localStorage.setItem(lockKey, voteVal.toString());
              fetchEvents();
            }}
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
          weightedLocals={weightedLocals} 
        />

        <BrowseModal
          isOpen={isBrowseOpen}
          onClose={() => setIsBrowseOpen(false)}
          type={browseType}
          weightedLocals={weightedLocals}
          activeTowns={activeTowns}
          onAddTown={(loc: string) => setActiveTowns([...activeTowns, slugify(loc)])}
          onRemoveTown={(loc: string) => setActiveTowns(activeTowns.filter(t => t !== loc))}
          weightedTags={weightedTags}
          allTimeTags={allTimeTags ?? []}
          activeTags={activeTags}
          setActiveTags={setActiveTags}
        />
      </div>
    </div>
  );
}
