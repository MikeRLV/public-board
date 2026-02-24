"use client";
import { useState } from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"; 
import { createClient } from "@supabase/supabase-js";

dayjs.extend(isSameOrAfter);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to make URLs clickable and keep long links contained
const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[var(--primary)] font-bold underline hover:opacity-80 transition-opacity"
          onClick={(ev) => ev.stopPropagation()}
        >
          TICKET LINK (EXTERNAL SITE, PROCEED WITH CAUTION)
        </a>
      );
    }
    return part; 
  });
};

export function DayDetailsModal({ activeDay, events, onClose, onVote, onPostClick }: any) {
  const [tagInput, setTagInput] = useState<Record<string, string>>({}); 
  const [newLocalInput, setNewLocalInput] = useState<Record<string, string>>({});
  const [projecting, setProjecting] = useState<Record<string, boolean>>({});

  const scaled = (base: number) => ({ fontSize: `calc(${base}px * var(--text-scale, 1))` });

  const dayEvents = events.filter((e: any) => dayjs(e.event_start).format('YYYY-MM-DD') === activeDay);

  const handleAddTag = async (flyerId: string) => {
    const val = tagInput[flyerId]?.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (!val) return;
    const userId = localStorage.getItem("local_user_id");
    const { error } = await supabase.rpc('vote_on_tag', {
      target_flyer_id: flyerId,
      target_tag_name: val,
      vote_val: 1,
      voter_id: userId
    });
    if (!error) {
      setTagInput({ ...tagInput, [flyerId]: "" });
      onVote(); 
    }
  };

  const handleAddToOtherLocal = async (e: any) => {
    // 1. Slugify input for DB processing
    const targetLocal = newLocalInput[e.id]?.trim().toLowerCase().replace(/\s+/g, '-');
    if (!targetLocal || projecting[e.id]) return;

    setProjecting({ ...projecting, [e.id]: true });

    try {
      // 2. MERGE LOGIC: Combine existing city_slug array with the new target
      const currentSlugs = Array.isArray(e.city_slug) ? e.city_slug : (e.city_slug ? [e.city_slug] : []);
      const updatedSlugs = Array.from(new Set([...currentSlugs, targetLocal]));

      // 3. UPSERT: Save the updated bucket while satisfying all DB constraints
      const { error } = await supabase.from("flyers").upsert({
        title: e.title,
        description: e.description,
        event_start: e.event_start,
        price: e.price,
        image_url: e.image_url,
        location_name: e.location_name, // Mandatory field
        city_slug: updatedSlugs,        // Merged bucket
      }, { onConflict: 'title' });       // Conflict on unique title

      if (error) throw error;
      
      // 4. CUSTOM FEEDBACK: Revert slug for the alert message
      const readableLocal = targetLocal.replace(/-/g, ' ');
      alert(`Event added to ${readableLocal} LoCAL.`);
      
      setNewLocalInput({ ...newLocalInput, [e.id]: "" });
      onVote(); 
    } catch (err: any) {
      // Handle network or timeout issues
      if (err.name === 'AbortError') {
        alert("The operation was aborted. Check your SQL unique title constraint or RLS policies.");
      } else {
        alert("Error: " + err.message);
      }
    } finally {
      setProjecting({ ...projecting, [e.id]: false });
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4 font-mono" onClick={onClose}>
      <div 
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        className="w-full max-w-5xl h-[95vh] md:h-[85vh] border rounded-xl flex flex-col overflow-hidden shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex flex-col">
            <h2 style={{ ...scaled(18), color: 'var(--primary)' }} className="font-bold uppercase leading-none">Event Info</h2>
            <span style={scaled(10)} className="text-[var(--text-muted)] uppercase tracking-widest mt-1">
              {dayjs(activeDay).format('MMMM D, YYYY')}
            </span>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors leading-none">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 md:space-y-12 custom-scrollbar">
          {dayEvents.map((e: any) => {
            const sortedTags = [...(e.flyer_tags || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            return (
              <div key={e.id} className="bg-black/20 rounded-lg border border-white/5 p-4 md:p-12 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                  
                  <div className="w-full md:w-2/5 md:sticky md:top-0 self-start pt-2">
                    <div className="relative group flex items-center justify-center mb-6 md:mb-10">
                      <div className="absolute -inset-3 border border-white/10 rounded-sm pointer-events-none group-hover:border-[var(--primary)]/20 transition-colors hidden md:block" />
                      {e.image_url ? (
                        <img 
                          src={e.image_url} 
                          alt="Flyer" 
                          style={{ borderColor: 'var(--border-color)' }}
                          className="w-full h-auto object-contain max-h-[40vh] md:max-h-[50vh] shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-0 border" 
                        />
                      ) : (
                        <div style={scaled(10)} className="w-full h-48 md:h-64 bg-black/40 flex items-center justify-center border border-white/5 italic text-[var(--text-muted)] uppercase tracking-tighter">
                          No Flyer Projected
                        </div>
                      )}
                    </div>

                    <h3 style={{ ...scaled(36), color: 'var(--primary)' }} className="font-black uppercase leading-[0.9] tracking-tighter break-words mb-4 md:mb-0">
                      {e.title}
                    </h3>

                    <div className="w-full h-px bg-white/10 my-4 md:my-6" />

                    <div className="flex flex-col gap-4">
                      <div style={scaled(13)} className="font-black tracking-tighter uppercase leading-none">
                        <span style={{ color: 'var(--primary)', opacity: 0.5 }} className="mr-2">LOCATION:</span>
                        <span className="text-[var(--text-main)] uppercase">{e.location_name}</span>
                      </div>

                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex items-center justify-between">
                          <div style={scaled(13)} className="font-black tracking-tighter uppercase leading-none whitespace-nowrap">
                            <span style={{ color: 'var(--primary)', opacity: 0.5 }} className="mr-2">PRICE:</span>
                            <span className="text-[var(--text-main)] uppercase">{e.price || 'FREE'}</span>
                          </div>

                          <button 
                            onClick={() => onVote(e.id, 'spam', 1)} 
                            style={scaled(9)}
                            className="bg-red-700 text-white px-3 py-1 hover:bg-red-600 transition-all uppercase font-black rounded-sm tracking-widest shrink-0"
                          >
                            Report Spam
                          </button>
                        </div>

                        <div className="flex gap-2 pt-2 mt-2 border-t border-white/5">
                          <input 
                            style={{ ...scaled(11), backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                            type="text"
                            placeholder="Add to other LoCAL"
                            value={newLocalInput[e.id] || ""}
                            onChange={ev => setNewLocalInput({ ...newLocalInput, [e.id]: ev.target.value })}
                            className="flex-1 border p-2 outline-none focus:border-[var(--primary)] text-xs font-bold uppercase rounded-sm"
                          />
                          <button 
                            onClick={() => handleAddToOtherLocal(e)}
                            style={{ ...scaled(10), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
                            className={`px-3 py-2 font-black uppercase rounded-sm transition-all ${projecting[e.id] ? 'opacity-50' : 'hover:opacity-80 active:scale-95'}`}
                          >
                            {projecting[e.id] ? '...' : '+ LoCAL'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col w-full pt-4 md:pt-2 overflow-hidden">
                    <p style={scaled(15)} className="text-[var(--text-main)] opacity-80 mb-8 md:mb-12 leading-relaxed whitespace-pre-wrap font-sans">
                      {renderDescriptionWithLinks(e.description)}
                    </p>

                    <div className="space-y-6 mt-auto">
                      <div className="flex flex-wrap gap-2 pt-6 md:pt-8 border-t border-white/5">
                        {sortedTags.map((ft: any) => (
                          <div key={ft.tags?.name} className="bg-black/40 border border-white/10 px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-2 md:gap-3 rounded-md hover:border-[var(--primary)]/40 transition-all">
                            <span style={scaled(10)} className="text-[var(--text-muted)] font-bold uppercase">{ft.tags?.name}</span>
                            <span style={{ ...scaled(10), color: 'var(--primary)' }} className="font-black border-l border-white/10 pl-2 md:pl-3">{ft.vote_count}</span>
                            <div className="flex gap-2 ml-1 text-[var(--text-main)]">
                              <button onClick={() => onVote(e.id, ft.tags?.name, 1)} className="hover:text-green-400 text-xs font-bold transition-all transform hover:scale-125">+</button>
                              <button onClick={() => onVote(e.id, ft.tags?.name, -1)} className="hover:text-red-400 text-xs font-bold transition-all transform hover:scale-125">-</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="relative flex gap-2 w-full max-w-xs pt-4">
                        <input 
                          style={{ ...scaled(11), backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                          className="border p-2 outline-none focus:border-[var(--primary)] w-full uppercase font-bold text-[var(--text-main)] rounded-sm"
                          placeholder="New Tag"
                          value={tagInput[e.id] || ""}
                          onChange={ev => setTagInput({ ...tagInput, [e.id]: ev.target.value })}
                          onKeyDown={ev => ev.key === 'Enter' && handleAddTag(e.id)}
                        />
                        <button 
                          onClick={() => handleAddTag(e.id)} 
                          style={{ ...scaled(11), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
                          className="px-4 py-2 font-black uppercase transition-all rounded-sm hover:opacity-80"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div style={{ borderColor: 'var(--primary)' }} className="border border-dashed border-opacity-40 rounded-lg p-8 bg-white/[0.03] flex flex-col items-center justify-center gap-4">
            <p style={scaled(10)} className="text-[var(--text-muted)] uppercase tracking-[0.3em] font-black text-center">
              {dayjs(activeDay).isBefore(dayjs().startOf('day')) ? "Past days cannot be updated" : "Know of something else happening on this day?"}
            </p>
            {dayjs(activeDay).isSameOrAfter(dayjs().startOf('day')) && (
              <button onClick={() => { onClose(); onPostClick(activeDay); }} style={{ ...scaled(11), backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }} className="px-10 py-3 rounded-sm font-black uppercase shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all hover:opacity-90 hover:scale-105 active:scale-95 border border-white/10">
                + Post Flyer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}