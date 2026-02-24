"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { createClient } from "@supabase/supabase-js"; 
import { Tooltip } from "./Tooltip"; 
import { LocationBucketModal } from "./LocationBucketModal";

// Modular Imports
import { TrendingSection } from "./TrendingSection";
import { FilterSection } from "./FilterSection";
import { ToggleSection } from "./ToggleSection";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function Sidebar(props: any) {
  const { 
    townInput, setTownInput, textScale, adjustScale, handleAddTown, scaled 
  } = useSidebarLogic(props);

  const [showHelp, setShowHelp] = useState(false);
  const [showPopularLoCALs, setShowPopularLoCALs] = useState(false);
  const [dbWeightedTowns, setDbWeightedTowns] = useState<any[]>([]);
  
  // FIXED: Removed the local [filterMode, setFilterMode] state from here! 
  // It was "shadowing" the props and preventing the calendar from updating.
  
  const helpTriggerRef = useRef<HTMLDivElement>(null);
  const LoCALPopRef = useRef<HTMLDivElement>(null);
  const TagPopRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    const fetchWeightedLocals = async () => {
      const { data, error } = await supabase
        .from('weighted_locals')
        .select('name, weight')
        .order('weight', { ascending: false });
      if (!error && data) setDbWeightedTowns(data);
    };
    fetchWeightedLocals();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
  }, [textScale]);

  const activeTowns = props.activeTowns || [];
  const activeTags = props.activeTags || [];
  const hasLocation = activeTowns.length > 0 || !!props.currentCity;

  const knownLoCALs = useMemo(() => {
    const rawNames = [...dbWeightedTowns.map((t: any) => t.name), ...activeTowns];
    const normalized = rawNames.map(name => name.toLowerCase().trim().replace(/\s+/g, '-'));
    return Array.from(new Set(normalized)).sort();
  }, [activeTowns, dbWeightedTowns]);

  const handleModalSelection = (loc: string) => {
    handleAddTown(loc);
    setShowPopularLoCALs(false);
  };

  const toggleTag = (tag: string) => {
    const lowerTag = tag.toLowerCase().replace('#', '');
    if (activeTags.includes(lowerTag)) {
      props.setActiveTags?.(activeTags.filter((t: string) => t !== lowerTag));
    } else {
      props.setActiveTags?.([...activeTags, lowerTag]);
    }
  };

  return (
    <>
      {props.isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={props.onClose} />}
      
      <div 
        style={{ 
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-color)',
          fontSize: `calc(1rem * ${textScale})`,
          color: 'var(--text-main)'
        } as any}
        className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-[100dvh] border-r p-4 flex flex-col font-mono transition-all duration-300 overflow-hidden ${props.isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col gap-4 shrink-0 mb-4">
          <button onClick={props.onClose} style={scaled(11)} className="md:hidden self-end text-neutral-500 uppercase tracking-widest">Close X</button>
          <h1 style={scaled(22)} className="font-bold tracking-tighter leading-none whitespace-nowrap text-[var(--primary)]">
            B L<span className="lowercase">o</span>CAL
          </h1>
          <button 
            onClick={props.onAddEvent} 
            style={{ ...scaled(13), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} 
            className="w-full py-3 mt-2 font-bold uppercase shadow-lg active:scale-95 transition-all"
          >
            Post Event
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar overflow-x-visible">
          <div className="flex flex-col mb-8" ref={LoCALPopRef} style={{ gap: `calc(0.4rem * var(--text-scale))` }}>
            <div className="flex items-center gap-2 cursor-pointer group w-fit overflow-visible" onClick={() => setShowPopularLoCALs(true)}>
              <div className="flex items-center justify-center w-6 h-6 overflow-visible shrink-0">
                <div 
                   style={{ 
                     width: `calc(0.625rem * var(--text-scale))`, 
                     height: `calc(0.625rem * var(--text-scale))` 
                   }}
                   className="rounded-full bg-[var(--primary)] shadow-[0_0_12px_var(--primary)] animate-pulse group-hover:scale-150 transition-transform" 
                />
              </div>
              <span style={{ color: 'var(--primary)' }} className="font-bold opacity-50 group-hover:opacity-100">
                LoCALs
              </span>
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <input 
                style={scaled(13)} 
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-[var(--primary)] font-bold text-[var(--text-main)] uppercase placeholder:normal-case" 
                placeholder="+ ADD LoCAL" 
                value={townInput || ""} 
                onChange={e => setTownInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)} 
              />
              <div ref={helpTriggerRef} onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} className="shrink-0">
                <div style={scaled(10)} className="w-5 h-5 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-600 cursor-pointer hover:border-[var(--primary)] transition-colors">?</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {activeTowns.map((t: string) => (
                <span 
                  key={t} 
                  onClick={() => props.setActiveTowns?.(activeTowns.filter((item: string) => item !== t))} 
                  style={{ ...scaled(10), borderColor: 'var(--primary)', color: 'var(--text-main)', backgroundColor: 'var(--bg-main)' }} 
                  className="border px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 transition-all uppercase truncate"
                >
                  {t.replace(/-/g, ' ')} ×
                </span>
              ))}
            </div>
          </div>

          <TrendingSection {...{ 
            hasLocation, 
            trendingTags: props.trendingTags, 
            toggleTag, 
            scaled,
            hasEvents: props.hasEventsThisMonth
          }} />
          
          <div className="h-10 shrink-0" />

          {/* FIXED: Hooked this directly to `props` so it communicates with the calendar hook */}
          <FilterSection {...{ 
            TagPopRef, 
            filterMode: props.filterMode, 
            setFilterMode: props.setFilterMode, 
            activeTags, 
            toggleTag, 
            scaled 
          }} />
        </div>

        <ToggleSection {...{ 
          ...props, 
          activeTags, 
          toggleTag, 
          scaled, 
          adjustScale,
          showAllEvents: props.showAllEvents,
          setShowAllEvents: props.setShowAllEvents,
          showSpam: props.showSpam,
          setShowSpam: props.setShowSpam,
          showAllAges: props.showAllAges,
          setShowAllAges: props.setShowAllAges
        }} />

        <Tooltip triggerRef={helpTriggerRef} isOpen={showHelp}>
           <p style={scaled(11)} className="leading-relaxed text-[var(--text-main)] normal-case font-sans italic relative z-20">
             A <strong style={{ color: 'var(--primary)' }} className="not-italic">LoCAL</strong> is a calendar to show a collection of events. 
             <strong style={{ color: 'var(--primary)' }} className="not-italic ml-1">LoCALs</strong> can be useful for bands, for producers or event coordinators, use it how it benefits you.
           </p>
        </Tooltip>
      </div>

      {mounted && showPopularLoCALs && createPortal(
        <LocationBucketModal 
          isOpen={showPopularLoCALs}
          onClose={() => setShowPopularLoCALs(false)}
          savedLocations={knownLoCALs}
          activeTowns={activeTowns}
          onAddTown={handleModalSelection} 
        />,
        document.body
      )}
    </>
  );
}