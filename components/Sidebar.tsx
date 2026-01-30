"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BANNED_WORDS_SET } from "../lib/bannedWords";

export function Sidebar({ 
  currentCity, activeTags = [], setActiveTags, activeTowns = [], setActiveTowns, 
  savedLocations = [], filterMode, setFilterMode, trendingTags = [], onTrendingClick, 
  onBucketClick, showAllEvents, setShowAllEvents, showSpam, setShowSpam,
  show18, setShow18, show21, setShow21, showAllAges, setShowAllAges, 
  onAddEvent, isOpen, onClose 
}: any) {
  const router = useRouter();
  const [townInput, setTownInput] = useState("");
  const [textScale, setTextScale] = useState(1.0);

  // PERSISTENCE: Hydrate scale and activeTowns from cache on mount
  useEffect(() => {
    const savedScale = localStorage.getItem("blocal_text_scale");
    if (savedScale) setTextScale(parseFloat(savedScale));

    const savedTowns = localStorage.getItem("blocal_active_towns");
    if (savedTowns) {
      try {
        const parsed = JSON.parse(savedTowns);
        // Only restore if there is cached data to prevent clearing parent state
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveTowns(parsed);
        }
      } catch (e) {
        console.error("Failed to parse cached LoCALs", e);
      }
    }
  }, [setActiveTowns]);

  // PERSISTENCE: Sync changes to cache (Sidebar stays out of the URL)
  useEffect(() => {
    localStorage.setItem("blocal_text_scale", textScale.toString());
  }, [textScale]);

  useEffect(() => {
    localStorage.setItem("blocal_active_towns", JSON.stringify(activeTowns));
  }, [activeTowns]);

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const handleAddTown = (val: string) => {
    const slug = slugify(val);
    if (!slug) return;
    if (BANNED_WORDS_SET.has(slug)) return alert("Prohibited LoCAL name.");
    if (!activeTowns.includes(slug)) setActiveTowns([...activeTowns, slug]);
    setTownInput("");
  };

  const hasLocation = activeTowns.length > 0 || currentCity;
  const scaled = (px: number) => ({ fontSize: `calc(${px}px * var(--text-scale))` });

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={onClose} />}
      
      <div 
        style={{ "--text-scale": textScale } as any}
        /* FIXED: Dynamic viewport height for mobile stability */
        className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-[100dvh] bg-black border-r border-white/20 p-4 flex flex-col gap-4 font-mono text-white transition-all duration-300 overflow-x-visible ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <button onClick={onClose} style={scaled(11)} className="md:hidden self-end text-neutral-500 mb-2 uppercase tracking-widest">Close X</button>
        
        <div className="space-y-4 w-full max-w-full shrink-0">
          <h1 style={scaled(22)} className="font-bold text-yellow-500 tracking-tighter leading-none whitespace-nowrap">
            B L<span className="lowercase">o</span>CAL
          </h1>
          
          <button onClick={onAddEvent} style={scaled(13)} className="w-full py-3 mt-2 font-bold uppercase bg-yellow-600 text-black hover:bg-yellow-500 transition-all shadow-lg active:scale-95">
            Post Event
          </button>

          {/* SECTION: LoCALs Management */}
          <div className="space-y-3 pt-6 w-full">
            <button onClick={onBucketClick} className="group flex items-center gap-2 text-left w-full p-1 border-t border-white/5 pt-3">
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full inline-block mr-2 shadow-[0_0_5px_rgba(202,138,4,0.3)]" /> 
                <span style={scaled(11)} className="font-bold text-yellow-500/50 tracking-[0.3em] group-hover:text-yellow-500 transition-colors">
                    LoCALs
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2 w-full">
              <input 
                style={scaled(13)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-yellow-500 transition-colors font-bold text-white" 
                placeholder="+ ADD LoCAL" 
                value={townInput}
                onChange={e => setTownInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)}
              />
              
              <div className="group relative shrink-0">
                <div 
                  style={scaled(10)} 
                  className="w-5 h-5 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-600 cursor-pointer group-hover:border-yellow-500 group-hover:text-yellow-500 transition-colors"
                >
                  ?
                </div>
                <div 
                  style={{ backgroundColor: '#171717', opacity: 1 }}
                  className="absolute left-full top-0 ml-4 w-64 p-4 border border-yellow-600/50 rounded-sm shadow-[20px_20px_50px_rgba(0,0,0,1)] invisible group-hover:visible pointer-events-none transition-all z-[100] transform -translate-x-2 group-hover:translate-x-0"
                >
                  <div style={{ backgroundColor: '#171717' }} className="absolute left-0 top-2 -ml-[5px] w-2 h-2 border-l border-b border-yellow-600/50 rotate-45" />
                  {/* UPDATED: Help popup text as requested */}
                  <p style={scaled(11)} className="leading-relaxed text-neutral-200 normal-case font-sans italic">
                    A <strong className="text-yellow-500 uppercase not-italic">LoCAL</strong> is a calendar to show a collection of events. <strong className="text-yellow-500 uppercase not-italic">LoCAL's</strong> can be useful for bands, for producers or event coordinators, use it how it benefits you.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Chips with word-wrapping enabled */}
            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
              {activeTowns.map((t: string) => (
                <span key={t} onClick={() => setActiveTowns(activeTowns.filter((item: string) => item !== t))} 
                  style={scaled(9)}
                  className="bg-yellow-900/40 border border-yellow-600/50 px-2 py-0.5 font-bold cursor-pointer hover:bg-red-900/40 hover:border-red-500 transition-all uppercase shadow-sm truncate">
                  {t.replace(/-/g, ' ')} ×
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Anchored divider line with no gap below */}
        <div className="w-full border-t-2 border-white/10 mt-2" />

        {/* SECTION: Trending Discovery (Above Filters) */}
        <div className={`flex flex-col gap-3 pt-4 w-full overflow-hidden transition-opacity ${!hasLocation && !showAllEvents ? 'opacity-20 pointer-events-none' : ''}`}>
          <button onClick={onTrendingClick} className="group flex items-center gap-2 text-left w-full">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2 shadow-[0_0_5px_rgba(220,38,38,0.3)]" /> 
            <span style={scaled(11)} className="font-bold text-yellow-500/50 uppercase tracking-[0.3em] group-hover:text-yellow-500 transition-colors">Trending</span>
          </button>
          <div className="flex flex-col gap-1 w-full overflow-hidden">
            {trendingTags?.slice(0, 5).map((tag: any) => (
              <button 
                key={tag.name} 
                onClick={() => { if (!activeTags.includes(tag.name)) setActiveTags([...activeTags, tag.name]); }} 
                className="flex justify-between items-center group py-1 border-b border-white/[0.03] last:border-0 hover:bg-white/5 px-1 rounded transition-colors text-left w-full overflow-hidden"
              >
                <span style={scaled(12)} className="font-bold text-neutral-400 group-hover:text-white uppercase transition-colors truncate">#{tag.name}</span>
                <span style={scaled(10)} className="text-neutral-600 group-hover:text-yellow-500 transition-colors shrink-0">+{tag.weight}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION: Filters (Flows tightly after Trending) */}
        <div className={`flex flex-col gap-4 w-full overflow-hidden transition-opacity ${!hasLocation && !showAllEvents ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center w-full">
            <div style={scaled(11)} className="font-bold text-neutral-500 uppercase tracking-widest">Filters</div>
            <div className="flex border border-neutral-800 rounded overflow-hidden shrink-0">
                <button onClick={() => setFilterMode('OR')} style={scaled(11)} className={`px-2 py-1 font-bold ${filterMode === 'OR' ? 'bg-yellow-600 text-black' : 'text-neutral-500 hover:text-white'}`}>OR</button>
                <button onClick={() => setFilterMode('AND')} style={scaled(11)} className={`px-2 py-1 font-bold ${filterMode === 'AND' ? 'bg-yellow-600 text-black' : 'text-neutral-500 hover:text-white'}`}>AND</button>
            </div>
          </div>
          
          <div className="space-y-4">
            <input 
              placeholder="+ ADD TAG" 
              style={scaled(13)}
              className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-yellow-500 transition-colors font-bold min-w-0" 
              onKeyDown={(e) => { 
                if(e.key === 'Enter') { 
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (BANNED_WORDS_SET.has(val)) { e.currentTarget.value = ""; return alert("Banned term."); }
                  if (val && !activeTags.includes(val)) setActiveTags([...activeTags, val]); 
                  e.currentTarget.value = ""; 
                } 
              }} 
            />

            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden pt-1">
              {activeTags.map((tag: string) => (
                <span 
                  key={tag} 
                  onClick={() => setActiveTags(activeTags.filter((t: string) => t !== tag))} 
                  style={scaled(9)}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-0.5 font-bold cursor-pointer hover:bg-red-900/40 hover:border-red-500 transition-all uppercase shadow-sm truncate"
                >
                  #{tag} ×
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 mt-auto w-full overflow-hidden">
           <div className="flex flex-wrap gap-4 px-1 pb-1">
              <button className="flex items-center gap-2 group" onClick={() => setShowAllAges(!showAllAges)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${showAllAges ? 'bg-emerald-600 border-emerald-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">All Ages</span>
              </button>
              <button className="flex items-center gap-2 group" onClick={() => setShow18(!show18)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${show18 ? 'bg-yellow-600 border-yellow-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">18+</span>
              </button>
              <button className="flex items-center gap-2 group" onClick={() => setShow21(!show21)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${show21 ? 'bg-red-600 border-red-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">21+</span>
              </button>
           </div>
           
           <div className="flex items-end justify-between border-t border-white/5 pt-3 gap-2">
             <div className="flex flex-col gap-2.5">
               <button className="flex items-center gap-3 group text-left px-1" onClick={() => setShowAllEvents(!showAllEvents)}>
                  <div className={`w-4 h-4 border transition-all shrink-0 ${showAllEvents ? 'bg-yellow-600 border-yellow-600 shadow-lg' : 'border-neutral-700'}`} />
                  <span style={scaled(11)} className={`font-bold uppercase tracking-widest ${showAllEvents ? 'text-yellow-500' : 'text-neutral-500'}`}>Show All</span>
               </button>
               <button className="flex items-center gap-3 group text-left px-1" onClick={() => setShowSpam(!showSpam)}>
                  <div className={`w-4 h-4 border transition-all shrink-0 ${showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} />
                  <span style={scaled(11)} className={`font-bold uppercase tracking-widest ${showSpam ? 'text-red-500' : 'text-neutral-500'}`}>Show Spam</span>
               </button>
             </div>
             <div className="flex items-center gap-1 shrink-0 pb-1">
               <button onClick={() => setTextScale(prev => Math.max(0.7, prev - 0.1))} style={scaled(14)} className="w-6 h-6 border border-yellow-600/50 flex items-center justify-center font-bold text-yellow-500">-</button>
               <button onClick={() => setTextScale(prev => Math.min(1.5, prev + 0.1))} style={scaled(14)} className="w-6 h-6 border border-yellow-600/50 flex items-center justify-center font-bold text-yellow-500">+</button>
             </div>
           </div>
        </div>
      </div>
    </>
  );
}