"use client";
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { Tooltip } from "./Tooltip"; 

import { TrendingSection } from "./TrendingSection";
import { FilterSection } from "./FilterSection";
import { ToggleSection } from "./ToggleSection";
import { BrandLogo } from "./BrandLogo";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Portal dropdown for LoCALs (no counts) ────────────────────────────────────
function LocalsDropdown({ inputRef, suggestions, onSelect, visible }: {
  inputRef: React.RefObject<HTMLInputElement>;
  suggestions: string[];
  onSelect: (s: string) => void;
  visible: boolean;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (!visible) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [visible, suggestions]);

  if (!visible || suggestions.length === 0) return null;

  return createPortal(
    <div
      style={{ top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
      className="fixed bg-neutral-900 border border-neutral-700 shadow-2xl max-h-48 overflow-y-auto"
    >
      {suggestions.map((s, i) => (
        <div
          key={`${s}-${i}`}
          onMouseDown={e => { e.preventDefault(); onSelect(s); }}
          className="px-3 py-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-neutral-800 hover:text-[var(--primary)] text-white border-b border-white/5 last:border-0 transition-colors"
        >
          {s}
        </div>
      ))}
    </div>,
    document.body
  );
}

export function Sidebar(props: any) {
  const { 
    townInput, setTownInput, textScale, adjustScale, handleAddTown, scaled 
  } = useSidebarLogic(props);

  const [showHelp, setShowHelp] = useState(false);
  const helpTriggerRef = useRef<HTMLDivElement>(null);
  const TagPopRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const [localFocused, setLocalFocused] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
  }, [textScale]);

  // Debounced search while typing
  useEffect(() => {
    if (!townInput?.trim()) return;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('weighted_locals').select('name').ilike('name', `%${townInput.trim()}%`).limit(8);
      if (!error && data) setLocalSuggestions(data.map((t: any) => t.name));
    }, 150);
    return () => clearTimeout(timer);
  }, [townInput]);

  const handleLocalFocus = async () => {
    setLocalFocused(true);
    if (!townInput?.trim()) {
      const { data, error } = await supabase
        .from('weighted_locals').select('name').order('weight', { ascending: false }).limit(10);
      if (!error && data) setLocalSuggestions(data.map((t: any) => t.name));
    }
  };

  const handleLocalBlur = () => {
    setTimeout(() => {
      setLocalFocused(false);
      if (!townInput?.trim()) setLocalSuggestions([]);
    }, 150);
  };

  const activeTowns = props.activeTowns || [];
  const activeTags = props.activeTags || [];
  const hasLocation = activeTowns.length > 0 || !!props.currentCity;

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
        className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-[100dvh] border-r p-4 flex flex-col font-mono transition-all duration-300 ${props.isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col gap-4 shrink-0">
          <button onClick={props.onClose} style={scaled(11)} className="md:hidden self-end text-neutral-500 uppercase tracking-widest">Close X</button>
          
          <div className="flex items-center justify-between w-full">
            <h1 style={scaled(22)} className="font-bold tracking-tighter leading-none whitespace-nowrap text-[var(--primary)]">
              B L<span className="lowercase">o</span>CAL
            </h1>
            <BrandLogo className="w-8 h-8 text-[var(--primary)] shrink-0" />
          </div>

          <button 
            onClick={props.onAddEvent} 
            style={{ ...scaled(13), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} 
            className="w-full py-3 mt-2 font-bold uppercase shadow-lg active:scale-95 transition-all"
          >
            Post Event
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 -ml-6 pl-6 pt-4 overflow-x-hidden custom-scrollbar">
          {/* LoCALs Section */}
          <div className="flex flex-col mb-8" style={{ gap: `calc(0.4rem * var(--text-scale))` }}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 cursor-pointer group w-fit overflow-visible" onClick={props.onBucketClick}>
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
                <div ref={helpTriggerRef} onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} className="shrink-0">
                  <div style={{ ...scaled(12), color: 'var(--primary)', borderColor: 'var(--primary)', borderWidth: '2px' }} className="w-6 h-6 border-2 rounded-full flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity font-black">?</div>
                </div>
            </div>

            <div className="flex w-full">
              <input
                ref={localInputRef}
                style={scaled(13)}
                className="w-full bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-[var(--primary)] font-bold text-[var(--text-main)] uppercase placeholder:normal-case"
                placeholder="+ ADD LoCAL"
                value={townInput || ""}
                onChange={e => setTownInput(e.target.value)}
                onFocus={handleLocalFocus}
                onBlur={handleLocalBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddTown(townInput);
                    setLocalSuggestions([]);
                  }
                }}
              />
              <LocalsDropdown
                inputRef={localInputRef}
                suggestions={localSuggestions}
                visible={localFocused && localSuggestions.length > 0}
                onSelect={s => {
                  handleAddTown(s);
                  setTownInput('');
                  setLocalSuggestions([]);
                }}
              />
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
            hasEvents: props.hasEventsThisMonth,
            onTrendingClick: props.onTrendingClick,
          }} />
          
          <div className="h-10 shrink-0" />

          <FilterSection {...{ 
            TagPopRef, 
            filterMode: props.filterMode, 
            setFilterMode: props.setFilterMode, 
            activeTags, 
            toggleTag, 
            scaled,
            onTagsClick: props.onTagsClick,
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
    </>
  );
}
