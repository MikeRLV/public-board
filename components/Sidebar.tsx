"use client";
import { useState, useRef } from "react"; // Added for tooltip
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { BANNED_WORDS_SET } from "../lib/bannedWords";
import { Tooltip } from "./Tooltip"; // Import your modular tooltip

export function Sidebar(props: any) {
  const { 
    townInput, setTownInput, textScale, adjustScale, handleAddTown, scaled 
  } = useSidebarLogic(props);

  // Modular Tooltip Logic (New)
  const [showHelp, setShowHelp] = useState(false);
  const helpTriggerRef = useRef<HTMLDivElement>(null);

  // Safety Fallbacks
  const activeTowns = props.activeTowns || [];
  const activeTags = props.activeTags || [];
  const hasLocation = activeTowns.length > 0 || !!props.currentCity;

  return (
    <>
      {/* Mobile Overlay */}
      {props.isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={props.onClose} />}
      
      <div 
        style={{ 
          "--text-scale": textScale,
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-color)'
        } as any}
        className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-[100dvh] border-r p-4 flex flex-col gap-4 font-mono text-white transition-all duration-300 overflow-x-visible ${props.isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <button onClick={props.onClose} style={scaled(11)} className="md:hidden self-end text-neutral-500 mb-2 uppercase tracking-widest">Close X</button>
        
        <div className="space-y-4 w-full max-w-full shrink-0">
          <h1 style={{ ...scaled(22), color: 'var(--primary)' }} className="font-bold tracking-tighter leading-none whitespace-nowrap">
            B L<span className="lowercase">o</span>CAL
          </h1>
          
          <button 
            onClick={props.onAddEvent} 
            style={{ ...scaled(13), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} 
            className="w-full py-3 mt-2 font-bold uppercase hover:opacity-90 transition-all shadow-lg active:scale-95"
          >
            Post Event
          </button>

          {/* SECTION: LoCALs Management */}
          <div className="space-y-3 pt-6 w-full">
            <button onClick={props.onBucketClick} className="group flex items-center gap-2 text-left w-full p-1 border-t border-white/5 pt-3">
              <div className="flex items-center">
                <span style={{ backgroundColor: 'var(--primary)' }} className="w-1.5 h-1.5 rounded-full inline-block mr-2 shadow-[0_0_5px_rgba(202,138,4,0.3)]" /> 
                <span style={{ ...scaled(11), color: 'var(--primary)' }} className="font-bold opacity-50 tracking-[0.3em] group-hover:opacity-100 transition-colors uppercase">
                    LoCALs
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2 w-full">
              <input 
                style={scaled(13)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-[var(--primary)] transition-colors font-bold text-white" 
                placeholder="+ ADD LoCAL" 
                value={townInput}
                onChange={e => setTownInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)}
              />
              
              {/* HELP TRIGGER: Updated to use the Module logic */}
              <div 
                ref={helpTriggerRef}
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                className="shrink-0"
              >
                <div style={scaled(10)} className="w-5 h-5 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-600 cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">?</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
              {activeTowns.map((t: string) => (
                <span key={t} onClick={() => props.setActiveTowns?.(activeTowns.filter((item: string) => item !== t))} 
                  style={{ ...scaled(10), borderColor: 'var(--primary)', color: 'var(--text-main)' }}
                  className="bg-white/5 border px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 transition-all uppercase shadow-sm truncate">
                  {t.replace(/-/g, ' ')} ×
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full border-t-2 border-white/10 mt-2" />

        {/* SECTION: Trending Discovery */}
        <div className={`flex flex-col gap-3 pt-4 w-full overflow-hidden transition-opacity ${!hasLocation && !props.showAllEvents ? 'opacity-20 pointer-events-none' : ''}`}>
          <button onClick={props.onTrendingClick} className="group flex items-center gap-2 text-left w-full">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2 shadow-[0_0_5px_rgba(220,38,38,0.3)]" /> 
            <span style={{ ...scaled(11), color: 'var(--primary)' }} className="font-bold opacity-50 uppercase tracking-[0.3em] group-hover:opacity-100 transition-colors">Trending</span>
          </button>
          <div className="flex flex-col gap-1 w-full overflow-hidden">
            {props.trendingTags?.slice(0, 5).map((tag: any) => (
              <button 
                key={tag.name} 
                onClick={() => { if (!activeTags.includes(tag.name)) props.setActiveTags?.([...activeTags, tag.name]); }} 
                className="flex justify-between items-center group py-1 border-b border-white/[0.03] last:border-0 hover:bg-white/5 px-1 rounded transition-colors text-left w-full overflow-hidden"
              >
                <span style={scaled(12)} className="font-bold text-neutral-400 group-hover:text-white uppercase transition-colors truncate">#{tag.name}</span>
                <span style={{ ...scaled(10), color: 'var(--primary)' }} className="transition-colors shrink-0">+{tag.weight}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION: Filters */}
        <div className={`flex flex-col gap-4 w-full overflow-hidden transition-opacity ${!hasLocation && !props.showAllEvents ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-center w-full pt-4 border-t border-white/5">
            <div style={scaled(11)} className="font-bold text-neutral-500 uppercase tracking-widest">Filters</div>
            <div className="flex border border-neutral-800 rounded overflow-hidden shrink-0">
                <button onClick={() => props.setFilterMode?.('OR')} style={scaled(11)} className={`px-2 py-1 font-bold ${props.filterMode === 'OR' ? 'bg-[var(--primary)] text-[var(--bg-main)]' : 'text-neutral-500 hover:text-white'}`}>OR</button>
                <button onClick={() => props.setFilterMode?.('AND')} style={scaled(11)} className={`px-2 py-1 font-bold ${props.filterMode === 'AND' ? 'bg-[var(--primary)] text-[var(--bg-main)]' : 'text-neutral-500 hover:text-white'}`}>AND</button>
            </div>
          </div>
          
          <div className="space-y-4">
            <input 
              placeholder="+ ADD TAG" 
              style={scaled(13)}
              className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-[var(--primary)] transition-colors font-bold min-w-0" 
              onKeyDown={(e) => { 
                if(e.key === 'Enter') { 
                  const val = e.currentTarget.value.trim().toLowerCase();
                  if (BANNED_WORDS_SET.has(val)) { e.currentTarget.value = ""; return alert("Banned term."); }
                  if (val && !activeTags.includes(val)) props.setActiveTags?.([...activeTags, val]); 
                  e.currentTarget.value = ""; 
                } 
              }} 
            />

            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden pt-1">
              {activeTags.map((tag: string) => (
                <span 
                  key={tag} 
                  onClick={() => props.setActiveTags?.(activeTags.filter((t: string) => t !== tag))} 
                  style={{ ...scaled(10), color: 'var(--text-main)' }}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 transition-all uppercase shadow-sm truncate"
                >
                  #{tag} ×
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Controls - EXACT LOGIC PRESERVED */}
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 mt-auto w-full overflow-hidden">
           {/* AGE TOGGLES */}
           <div className="flex flex-wrap gap-4 px-1 pb-1">
              <button className="flex items-center gap-2 group" onClick={() => props.setShowAllAges?.(!props.showAllAges)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${props.showAllAges ? 'bg-emerald-600 border-emerald-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">All Ages</span>
              </button>
              <button className="flex items-center gap-2 group" onClick={() => props.setShow18?.(!props.show18)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${props.show18 ? 'bg-yellow-600 border-yellow-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">18+</span>
              </button>
              <button className="flex items-center gap-2 group" onClick={() => props.setShow21?.(!props.show21)}>
                 <div className={`w-3 h-3 border shrink-0 transition-all ${props.show21 ? 'bg-red-600 border-red-600 shadow-sm' : 'border-neutral-700'}`} />
                 <span style={scaled(10)} className="font-bold uppercase whitespace-nowrap">21+</span>
              </button>
           </div>
           
           <div className="flex items-end justify-between border-t border-white/5 pt-3 gap-2">
             <div className="flex flex-col gap-2.5">
               <button className="flex items-center gap-3 group text-left px-1" onClick={() => props.setShowAllEvents?.(!props.showAllEvents)}>
                  <div className={`w-4 h-4 border transition-all shrink-0 ${props.showAllEvents ? 'bg-[var(--primary)] border-[var(--primary)] shadow-lg' : 'border-neutral-700'}`} />
                  <span style={{ ...scaled(11), color: props.showAllEvents ? 'var(--primary)' : 'var(--text-muted)' }} className={`font-bold uppercase tracking-widest`}>Show All</span>
               </button>
               {/* SHOW SPAM TOGGLE: Your exact logic remains */}
               <button className="flex items-center gap-3 group text-left px-1" onClick={() => props.setShowSpam?.(!props.showSpam)}>
                  <div className={`w-4 h-4 border transition-all shrink-0 ${props.showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} />
                  <span style={{ ...scaled(11), color: props.showSpam ? 'var(--text-main)' : 'var(--text-muted)' }} className={`font-bold uppercase tracking-widest`}>Show Spam</span>
               </button>
             </div>
             <div className="flex items-center gap-1 shrink-0 pb-1">
               <button onClick={() => adjustScale(-0.1)} style={{ fontSize: '14px', backgroundColor: 'var(--primary)', color: 'var(--bg-main)', borderColor: 'var(--primary)' }} className="w-6 h-6 border flex items-center justify-center font-black hover:opacity-80 active:scale-90 transition-all">-</button>
               <button onClick={() => adjustScale(0.1)} style={{ fontSize: '14px', backgroundColor: 'var(--primary)', color: 'var(--bg-main)', borderColor: 'var(--primary)' }} className="w-6 h-6 border flex items-center justify-center font-black hover:opacity-80 active:scale-90 transition-all">+</button>
             </div>
           </div>
        </div>

        {/* MODULAR TOOLTIP: Rendered at end to ensure zero layout interference */}
        <Tooltip triggerRef={helpTriggerRef} isOpen={showHelp}>
           <p style={scaled(11)} className="leading-relaxed text-[var(--text-main)] normal-case font-sans italic relative z-10">
             A <strong style={{ color: 'var(--primary)' }} className="uppercase not-italic">LoCAL</strong> is a calendar to show a collection of events. <strong style={{ color: 'var(--primary)' }} className="uppercase not-italic">LoCAL's</strong> can be useful for bands, for producers or event coordinators, use it how it benefits you.
           </p>
        </Tooltip>
      </div>
    </>
  );
}