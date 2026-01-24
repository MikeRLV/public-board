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
import { useRouter } from "next/navigation";
import { BANNED_WORDS_ARRAY, BANNED_WORDS_SET } from "../lib/bannedWords";

dayjs.extend(isSameOrAfter);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function CalendarLogic({ city }: { city: string }) {
  const router = useRouter();

  // UI & Modal State
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isTrendingModalOpen, setIsTrendingModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Data State
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [weightedTags, setWeightedTags] = useState<{name: string, weight: number}[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'OR' | 'AND'>('OR'); 
  const [showAllEvents, setShowAllEvents] = useState(false); 
  const [showSpam, setShowSpam] = useState(false); 

  // Form State
  const [formState, setFormState] = useState({
    title: "", place: "", price: "", desc: "", date: "", tags: "", image: null as File | null
  });

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const normalizeTag = (tag: string) => 
    tag.toLowerCase().trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  useEffect(() => {
    let storedId = localStorage.getItem("local_user_id") || crypto.randomUUID();
    localStorage.setItem("local_user_id", storedId);
    setUserId(storedId);
  }, []);

  useEffect(() => {
    const fetchWeightedTags = async () => {
      if (!city) return;
      const { data, error } = await supabase.from('flyer_tags').select('vote_count, tags(name)').limit(500);
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach((ft: any) => {
          const name = ft.tags?.name;
          if (name && normalizeTag(name) !== 'spam') { 
            const key = normalizeTag(name);
            counts[key] = (counts[key] || 0) + (ft.vote_count || 0);
          }
        });
        setWeightedTags(Object.entries(counts).map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight));
      }
    };
    fetchWeightedTags();
  }, [city, events]);

  const fetchEvents = async () => {
    if (!city) return; 
    const start = currentDate.startOf('month').toISOString();
    const end = currentDate.endOf('month').toISOString();
    const { data } = await supabase.from('flyers').select('*, flyer_tags(vote_count, tags(name))').eq('city_slug', city).gte('event_start', start).lte('event_start', end);
    if (data) setEvents(data);
  };

  useEffect(() => { fetchEvents(); }, [currentDate, city]);

  const handleClosePostModal = () => {
    setFormState({ title: "", place: "", price: "", desc: "", date: "", tags: "", image: null });
    setIsPostModalOpen(false);
  };

  const handlePostSubmit = async () => {
    if (isUploading || !formState.image) return;
    const tags = formState.tags.split(',').map(t => normalizeTag(t)).filter(t => t !== "");
    if (tags.some(tag => BANNED_WORDS_SET.has(tag))) {
      return alert("One or more tags contains prohibited language.");
    }

    setIsUploading(true);
    try {
      const fileExt = formState.image.name.split('.').pop();
      const fileName = `${city}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('flyers').upload(fileName, formState.image);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('flyers').getPublicUrl(fileName);
      const { data: insertedData, error: insertError } = await supabase.from('flyers').insert({
        city_slug: city, title: formState.title, location_name: formState.place, 
        price: formState.price, description: formState.desc, image_url: urlData.publicUrl, 
        event_start: dayjs(formState.date).hour(12).toISOString()
      }).select(); 

      if (!insertError && insertedData?.[0]) {
        for (const t of tags) await supabase.rpc('vote_on_tag', { target_flyer_id: insertedData[0].id, target_tag_name: t, vote_val: 1, voter_id: userId });
        handleClosePostModal();
        fetchEvents();
      }
    } finally { setIsUploading(false); }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const totalVotes = e.flyer_tags.reduce((acc: number, ft: any) => acc + Math.max(0, ft.vote_count || 0), 0);
      const isSpam = totalVotes > 0 && ((e.flyer_tags.find((ft: any) => normalizeTag(ft.tags.name) === 'spam')?.vote_count || 0) / totalVotes >= 0.25);
      if (isSpam && !showSpam) return false;
      if (showAllEvents) return true;
      if (activeTags.length === 0) return false;
      const eventTags = e.flyer_tags.map((ft: any) => normalizeTag(ft.tags.name));
      return filterMode === 'OR' 
        ? activeTags.some(tag => eventTags.includes(normalizeTag(tag))) 
        : activeTags.every(tag => eventTags.includes(normalizeTag(tag)));
    }).sort((a, b) => b.flyer_tags.length - a.flyer_tags.length);
  }, [events, activeTags, filterMode, showAllEvents, showSpam]);

  return (
    <div className="flex min-h-screen font-mono text-sm text-white bg-black">
      <Sidebar 
        currentCity={city} activeTags={activeTags} setActiveTags={setActiveTags} 
        filterMode={filterMode} setFilterMode={setFilterMode} trendingTags={weightedTags} 
        onTrendingClick={() => setIsTrendingModalOpen(true)} showAllEvents={showAllEvents} 
        setShowAllEvents={setShowAllEvents} showSpam={showSpam} setShowSpam={setShowSpam} 
        onAddEvent={() => { setFormState({...formState, date: todayStr}); setIsPostModalOpen(true); }}
        isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} bannedWords={BANNED_WORDS_ARRAY}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Updated Header Call */}
        <CalendarHeader 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          city={city} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        
        <CalendarGrid currentDate={currentDate} todayStr={todayStr} activeDay={activeDay} setActiveDay={setActiveDay} filteredEvents={filteredEvents} city={city} />
        {activeDay && <DayDetailsModal activeDay={activeDay} events={filteredEvents} onClose={() => setActiveDay(null)} onVote={() => {}} onPostClick={(d: string) => { setFormState({...formState, date: d}); setIsPostModalOpen(true); }} />}
        <PostEventModal isOpen={isPostModalOpen} onClose={handleClosePostModal} formState={formState} setFormState={setFormState} onSave={handlePostSubmit} isUploading={isUploading} todayStr={todayStr} weightedTags={weightedTags} bannedWords={BANNED_WORDS_ARRAY} />
        <TrendingModal isOpen={isTrendingModalOpen} onClose={() => setIsTrendingModalOpen(false)} weightedTags={weightedTags} activeTags={activeTags} setActiveTags={setActiveTags} />
      </div>
    </div>
  );
}