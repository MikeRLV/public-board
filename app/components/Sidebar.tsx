"use client";
import { useState } from "react";
import { BANNED_WORDS_SET } from "../lib/bannedWords";

export function Sidebar({ activeTags = [], setActiveTags, activeTowns = [], setActiveTowns, showAllEvents, setShowAllEvents, onAddEvent, isOpen, onClose }: any) {
  const [townInput, setTownInput] = useState("");

  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  const handleAddTown = (val: string) => {
    const slug = slugify(val);
    if (!slug) return;
    if (BANNED_WORDS_SET.has(slug)) return alert("Prohibited location name.");
    if (!activeTowns.includes(slug)) setActiveTowns([...activeTowns, slug]);
    setTownInput("");
  };

  return (
    <div className={`fixed md:sticky top-0 left-0 z-[80] w-64 h-screen bg-black border-r border-white/20 p-4 flex flex-col gap-4 font-mono text-white transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-yellow-500 tracking-tighter leading-none">B LoCAL</h1>
        
        {/* TOWN TAG INPUT */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Project Location</div>
          <input 
            className="w-full bg-neutral-900 border border-neutral-700 text-xs p-2 outline-none focus:border-yellow-500" 
            placeholder="+ Add Town Slug" 
            value={townInput}
            onChange={e => setTownInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {activeTowns.map((t: string) => (
              <span key={t} onClick={() => setActiveTowns(activeTowns.filter((item: string) => item !== t))} className="bg-yellow-900/40 border border-yellow-500/30 px-2 py-0.5 text-[8px] font-bold cursor-pointer hover:border-red-500 uppercase transition-colors">
                {t} ×
              </span>
            ))}
          </div>
        </div>

        <button onClick={onAddEvent} className="w-full py-3 font-bold text-xs uppercase bg-yellow-600 text-black hover:bg-yellow-500">+ Post Event</button>
      </div>
      
      {/* CATEGORY TAGS SECTION (Same Enter-to-Add logic) */}
      {/* ... existing tag logic ... */}
    </div>
  );
}