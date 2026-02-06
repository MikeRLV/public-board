"use client";
import { useState, useRef, useEffect } from "react";
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { BANNED_WORDS_SET } from "../lib/bannedWords";
import { Tooltip } from "./Tooltip"; 

export function Sidebar(props: any) {
  const { 
    townInput, setTownInput, textScale, adjustScale, handleAddTown, scaled 
  } = useSidebarLogic(props);

  const [showHelp, setShowHelp] = useState(false);
  const helpTriggerRef = useRef<HTMLDivElement>(null);

  // GLOBAL SCALE SYNC: Allows modals and text boxes to scale too
  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
  }, [textScale]);

  const activeTowns = props.activeTowns || [];
  const activeTags = props.activeTags || [];
  const hasLocation = activeTowns.length > 0 || !!props.currentCity;

  return (
    <>
      {props.isOpen && <div className="fixed inset-0 bg-black/60 z-[70] md:hidden" onClick={props.onClose} />}
      
      <div 
        style={{ 
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-color)',
          fontSize: `calc(1rem * ${textScale})` // Applies scale locally to sidebar text
        } as any}
        className={`fixed md:sticky top-0 left-0 z-[80] md:z-0 w-64 h-[100dvh] border-r p-4 flex flex-col font-mono text-white transition-all duration-300 overflow-hidden ${props.isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* TOP: Fixed Brand & Post Button */}
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

        {/* MIDDLE: Scrollable Discovery */}
        <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar overflow-x-visible">
          <div className="space-y-3">
            <button onClick={props.onBucketClick} className="group flex items-center gap-2 text-left w-full p-1 border-t border-white/5 pt-3">
              <span style={{ ...scaled(11), color: 'var(--primary)' }} className="font-bold opacity-50 tracking-[0.3em] uppercase">LoCALs</span>
            </button>
            <div className="flex items-center gap-2 w-full">
              <input 
                style={scaled(13)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-[var(--primary)] font-bold text-white" 
                placeholder="+ ADD LoCAL" 
                value={townInput}
                onChange={e => setTownInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)}
              />
              <div ref={helpTriggerRef} onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} className="shrink-0">
                <div style={scaled(10)} className="w-5 h-5 border border-neutral-700 rounded-full flex items-center justify-center text-neutral-600 cursor-pointer hover:border-[var(--primary)] transition-colors">?</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {activeTowns.map((t: string) => (
                <span key={t} onClick={() => props.setActiveTowns?.(activeTowns.filter((item: string) => item !== t))} 
                  style={{ ...scaled(10), borderColor: 'var(--primary)' }}
                  className="bg-white/5 border px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 transition-all uppercase truncate">
                  {t.replace(/-/g, ' ')} ×
                </span>
              ))}
            </div>
          </div>

          <div className={`flex flex-col gap-3 transition-opacity ${!hasLocation && !props.showAllEvents ? 'opacity-20 pointer-events-none' : ''}`}>
            <span style={scaled(11)} className="font-bold opacity-50 uppercase tracking-[0.3em] block">Trending</span>
            <div className="flex flex-col gap-1">
              {props.trendingTags?.slice(0, 5).map((tag: any) => (
                <button key={tag.name} onClick={() => { if (!activeTags.includes(tag.name)) props.setActiveTags?.([...activeTags, tag.name]); }} className="flex justify-between items-center group py-1 border-b border-white/[0.03] hover:bg-white/5 px-1 rounded transition-colors">
                  <span style={scaled(12)} className="font-bold text-neutral-400 uppercase truncate">#{tag.name}</span>
                  <span style={{ ...scaled(10), color: 'var(--primary)' }}>+{tag.weight}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
             <div style={scaled(11)} className="font-bold text-neutral-500 uppercase tracking-widest border-t border-white/5 pt-4">Filters</div>
             <input placeholder="+ ADD TAG" style={scaled(13)} className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-[var(--primary)] font-bold" onKeyDown={(e) => { if(e.key === 'Enter') { const val = e.currentTarget.value.trim().toLowerCase(); if (val && !activeTags.includes(val)) props.setActiveTags?.([...activeTags, val]); e.currentTarget.value = ""; } }} />
             <div className="flex flex-wrap gap-1">
               {activeTags.map((tag: string) => (
                 <span key={tag} onClick={() => props.setActiveTags?.(activeTags.filter((t: string) => t !== tag))} style={scaled(10)} className="bg-neutral-800 border border-neutral-700 px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 uppercase truncate">#{tag} ×</span>
               ))}
             </div>
          </div>
        </div>

        {/* BOTTOM: Fixed Controls */}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 mt-auto w-full shrink-0 bg-[var(--bg-main)]">
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
                  <span style={{ ...scaled(11), color: props.showAllEvents ? 'var(--primary)' : 'var(--text-muted)' }} className="font-bold uppercase tracking-widest">Show All</span>
               </button>
               <button className="flex items-center gap-3 group text-left px-1" onClick={() => props.setShowSpam?.(!props.setShowSpam)}>
                  <div className={`w-4 h-4 border transition-all shrink-0 ${props.showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} />
                  <span style={{ ...scaled(11), color: props.showSpam ? 'var(--text-main)' : 'var(--text-muted)' }} className="font-bold uppercase tracking-widest">Show Spam</span>
               </button>
             </div>
             <div className="flex items-center gap-1 shrink-0 pb-1">
               <button onClick={() => adjustScale(-0.1)} style={{ fontSize: '14px', backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} className="w-6 h-6 border-0 flex items-center justify-center font-black active:scale-90">-</button>
               <button onClick={() => adjustScale(0.1)} style={{ fontSize: '14px', backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} className="w-6 h-6 border-0 flex items-center justify-center font-black active:scale-90">+</button>
             </div>
           </div>
        </div>

        <Tooltip triggerRef={helpTriggerRef} isOpen={showHelp}>
           <p style={scaled(11)} className="leading-relaxed text-[var(--text-main)] normal-case font-sans italic relative z-20">
             A <strong style={{ color: 'var(--primary)' }} className="uppercase not-italic">LoCAL</strong> is a calendar to show a collection of events. <strong style={{ color: 'var(--primary)' }} className="uppercase not-italic">LoCAL's</strong> can be useful for bands, for producers or event coordinators, use it how it benefits you.
           </p>
        </Tooltip>
      </div>
    </>
  );
}