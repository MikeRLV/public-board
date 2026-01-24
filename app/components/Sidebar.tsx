"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { BANNED_WORDS_ARRAY, BANNED_WORDS_SET } from "../lib/bannedWords";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export function Sidebar({ currentCity, activeTags = [], setActiveTags, filterMode, setFilterMode, trendingTags = [], onTrendingClick, showAllEvents, setShowAllEvents, showSpam, setShowSpam, onAddEvent, isOpen, onClose }: any) {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase.from('cities').select('*').order('name');
      if (data) setCities(data);
    };
    fetchCities();
  }, []);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={onClose} />}
      <div className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-screen bg-black border-r border-white/20 p-4 flex flex-col gap-4 font-mono text-white transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <button onClick={onClose} className="md:hidden self-end text-neutral-500 text-[10px] mb-2 uppercase tracking-widest">Close [X]</button>
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-yellow-500 tracking-tighter leading-none">B LoCAL</h1>
          <select className="w-full bg-neutral-900 border border-neutral-700 text-xs p-2 uppercase outline-none focus:border-yellow-500 transition-colors" value={currentCity} onChange={(e) => { router.push(`/?city=${e.target.value}`); if (onClose) onClose(); }}>
            <option value="" disabled>-- CHOOSE A CITY --</option>
            {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <button onClick={onAddEvent} className="w-full py-3 font-bold text-xs uppercase bg-yellow-600 text-black hover:bg-yellow-500 transition-all">+ Post Event</button>
        </div>

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
                // --- BANNED CHECK ---
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

        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 mt-auto">
           <button className="flex items-center gap-3 group w-full text-left" onClick={() => setShowAllEvents(!showAllEvents)}>
              <div className={`w-4 h-4 border transition-all rounded-sm ${showAllEvents ? 'bg-emerald-600 border-emerald-600 shadow-lg' : 'border-neutral-700'}`} />
              <span className="text-[10px] font-bold text-neutral-500 uppercase group-hover:text-neutral-300 transition-colors">Show All</span>
           </button>
           <button className="flex items-center gap-3 group w-full text-left" onClick={() => setShowSpam(!showSpam)}>
              <div className={`w-4 h-4 border transition-all rounded-sm ${showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} />
              <span className="text-[10px] font-bold text-neutral-500 uppercase group-hover:text-neutral-300 transition-colors">Show Spam</span>
           </button>
        </div>
      </div>
    </>
  );
}