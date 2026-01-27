"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { BANNED_WORDS_SET } from "../lib/bannedWords";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function Sidebar({ currentCity, activeTags = [], setActiveTags, activeTowns = [], setActiveTowns, filterMode, setFilterMode, trendingTags = [], onTrendingClick, showAllEvents, setShowAllEvents, showSpam, setShowSpam, onAddEvent, isOpen, onClose }: any) {
  const router = useRouter();
  const [townInput, setTownInput] = useState("");

  // Normalization logic: converts "Las Vegas" to "las-vegas"
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const handleAddTown = (val: string) => {
    const slug = slugify(val);
    if (!slug) return;
    
    if (BANNED_WORDS_SET.has(slug)) return alert("Prohibited location name.");
    
    if (!activeTowns.includes(slug)) {
      setActiveTowns([...activeTowns, slug]);
    }
    setTownInput("");
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={onClose} />}
      <div className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-screen bg-black border-r border-white/20 p-4 flex flex-col gap-4 font-mono text-white transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <button onClick={onClose} className="md:hidden self-end text-neutral-500 text-[10px] mb-2 uppercase tracking-widest">Close [X]</button>
        
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-yellow-500 tracking-tighter leading-none whitespace-nowrap uppercase">B LoCAL</h1>
          
          {/* LOCATION SECTION */}
          <div className="space-y-2 border-b border-white/5 pb-4">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Location</div>
            <input 
              className="w-full bg-neutral-900 border border-neutral-700 text-xs p-2 outline-none focus:border-yellow-500 transition-colors" 
              placeholder="Location(s)" 
              value={townInput}
              onChange={e => setTownInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)}
            />
            
            <div className="flex flex-wrap gap-1 mt-2">
              {activeTowns.map((t: string) => (
                <span 
                  key={t} 
                  onClick={() => setActiveTowns(activeTowns.filter((item: string) => item !== t))} 
                  className="bg-yellow-900/40 border border-yellow-500/30 px-2 py-0.5 text-[8px] font-bold cursor-pointer hover:bg-red-900 hover:border-red-500 transition-colors uppercase"
                >
                  {t} ×
                </span>
              ))}
            </div>
          </div>

          <button onClick={onAddEvent} className="w-full py-3 font-bold text-xs uppercase bg-yellow-600 text-black hover:bg-yellow-500 transition-all shadow-lg active:scale-95">Post Event</button>
        </div>

        {/* TRENDING */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
          <button onClick={onTrendingClick} className="group flex items-center gap-2 text-left w-full">
            <div className="flex items-center animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block mr-2" /> 
              <span className="font-bold text-yellow-500/50 text-[10px] uppercase tracking-[0.3em] group-hover:text-yellow-500 transition-colors">Trending</span>
            </div>
          </button>
          <div className="flex flex-col gap-1">
            {trendingTags?.slice(0, 5).map((tag: any) => (
              <button key={tag.name} onClick={() => { if (!activeTags.includes(tag.name)) setActiveTags([...activeTags, tag.name]); }} className="flex justify-between items-center group py-1.5 text-left border-b border-white/[0.03] last:border-0 hover:bg-white/5 px-1 rounded transition-colors">
                <span className="text-[11px] font-bold text-neutral-400 group-hover:text-white uppercase transition-colors">#{tag.name}</span>
                <span className="text-[9px] font-mono text-neutral-600 group-hover:text-yellow-500 transition-colors">+{tag.weight}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          <div className="flex justify-between items-center text-[10px]">
            <div className="font-bold text-neutral-500 uppercase tracking-widest">Filters</div>
            <div className="flex border border-neutral-800 rounded overflow-hidden">
                <button onClick={() => setFilterMode('OR')} className={`px-2 py-1 font-bold ${filterMode === 'OR' ? 'bg-yellow-600 text-black' : 'text-neutral-500 hover:text-white'}`}>OR</button>
                <button onClick={() => setFilterMode('AND')} className={`px-2 py-1 font-bold ${filterMode === 'AND' ? 'bg-yellow-600 text-black' : 'text-neutral-500 hover:text-white'}`}>AND</button>
            </div>
          </div>
          <input 
            placeholder="+ Add Tag" 
            className="bg-neutral-900 p-2 w-full border border-neutral-700 text-xs text-white outline-none focus:border-yellow-500 transition-colors" 
            onKeyDown={(e) => { 
              if(e.key === 'Enter') { 
                const val = e.currentTarget.value.trim().toLowerCase();
                if (BANNED_WORDS_SET.has(val)) {
                  e.currentTarget.value = "";
                  return alert("Offensive filters are prohibited.");
                }
                if (val && !activeTags.includes(val)) setActiveTags([...activeTags, val]); 
                e.currentTarget.value = ""; 
              } 
            }} 
          />
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
            {activeTags.map((tag: any) => (
              <span key={"filter-" + tag} className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-[9px] font-bold flex items-center gap-2 cursor-pointer hover:border-red-500 uppercase transition-all" onClick={() => setActiveTags(activeTags.filter((t: any) => t !== tag))}>
                {tag} ×
              </span>
            ))}
          </div>
        </div>

        {/* BOTTOM TOGGLES */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 mt-auto">
           <button className="flex items-center gap-3 group w-full text-left" onClick={() => setShowAllEvents(!showAllEvents)}>
              <div className={`w-4 h-4 border transition-all rounded-sm ${showAllEvents ? 'bg-emerald-600 border-emerald-600 shadow-lg' : 'border-neutral-700'}`} />
              <span className="text-[10px] font-bold text-neutral-500 uppercase group-hover:text-neutral-300 transition-colors">Show All</span>
           </button>
           
           {/* RESTORED SHOW SPAM BUTTON */}
           <button className="flex items-center gap-3 group w-full text-left" onClick={() => setShowSpam(!showSpam)}>
              <div className={`w-4 h-4 border transition-all rounded-sm ${showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} />
              <span className="text-[10px] font-bold text-neutral-500 uppercase group-hover:text-neutral-300 transition-colors">Show Spam</span>
           </button>
        </div>
      </div>
    </>
  );
}