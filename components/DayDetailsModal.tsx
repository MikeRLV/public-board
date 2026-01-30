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

export function DayDetailsModal({ activeDay, events, onClose, onVote, onPostClick, weightedTags = [] }: any) {
  const [tagInput, setTagInput] = useState<Record<string, string>>({}); 

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-5xl h-[85vh] border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-yellow-500 uppercase leading-none">Event Info</h2>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
              {dayjs(activeDay).format('MMMM D, YYYY')}
            </span>
          </div>
          <button onClick={onClose} className="text-2xl text-neutral-500 hover:text-white transition-colors leading-none">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          {/* Post Invitation Section */}
          <div className="border border-dashed border-yellow-500/30 rounded-lg p-6 bg-yellow-500/5 flex flex-col items-center justify-center gap-3">
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold text-center">
              {dayjs(activeDay).isBefore(dayjs().startOf('day')) ? "Past days cannot be updated" : "Know of something else happening on this day?"}
            </p>
            {dayjs(activeDay).isSameOrAfter(dayjs().startOf('day')) && (
              <button onClick={() => { onClose(); onPostClick(activeDay); }} className="bg-yellow-600 text-black px-8 py-2 rounded-full font-bold text-xs uppercase shadow-lg transition-all hover:bg-yellow-500 active:scale-95">
                + Post Flyer
              </button>
            )}
          </div>

          {dayEvents.map((e: any) => {
            const sortedTags = [...(e.flyer_tags || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            
            return (
              <div key={e.id} className="bg-black/40 rounded-lg border border-white/5 p-8 md:p-12 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                  
                  {/* LEFT COLUMN: Sticky Flyer + Title + Metadata Stack */}
                  <div className="w-full md:w-2/5 sticky top-0 self-start pt-2">
                    <div className="relative group flex items-center justify-center mb-10">
                      <div className="absolute -inset-3 border border-white/10 rounded-sm pointer-events-none group-hover:border-yellow-500/20 transition-colors" />
                      {e.image_url ? (
                        <img 
                          src={e.image_url} 
                          alt="Flyer" 
                          className="w-full h-auto object-contain max-h-[50vh] shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-0" 
                        />
                      ) : (
                        <div className="w-full h-64 bg-neutral-900 flex items-center justify-center border border-white/5 italic text-neutral-600 text-[10px] uppercase tracking-tighter">
                          No Flyer Projected
                        </div>
                      )}
                    </div>

                    <h3 className="text-3xl md:text-5xl font-black text-yellow-500 uppercase leading-[0.9] tracking-tighter break-words">
                      {e.title}
                    </h3>

                    {/* Divider Line */}
                    <div className="w-full h-px bg-white/10 my-6" />

                    {/* METADATA SECTION: Aligned Spam Button to the right of Price */}
                    <div className="flex flex-col gap-4">
                      {/* Location Row */}
                      <div className="text-[14px] font-black tracking-tighter uppercase leading-none">
                        <span className="text-yellow-500/50 mr-2">LOCATION:</span>
                        <span className="text-white">{e.location_name}</span>
                      </div>

                      {/* Price and Spam Button Row */}
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="text-[14px] font-black tracking-tighter uppercase leading-none whitespace-nowrap">
                          <span className="text-yellow-500/50 mr-2">PRICE:</span>
                          <span className="text-white">{e.price || 'FREE'}</span>
                        </div>

                        <button 
                          onClick={() => onVote(e.id, 'spam', 1)} 
                          className="text-[9px] border border-red-900/40 bg-red-900/10 px-3 py-1.5 text-red-500/60 hover:bg-red-500 hover:text-white transition-all uppercase font-black rounded-sm tracking-widest shrink-0"
                        >
                          Report Spam
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Description + Tags */}
                  <div className="flex-1 flex flex-col w-full pt-2">
                    <p className="text-neutral-300 text-[16px] mb-12 leading-relaxed whitespace-pre-wrap font-sans">
                      {e.description}
                    </p>

                    <div className="space-y-6 mt-auto">
                      <div className="flex flex-wrap gap-2 pt-8 border-t border-white/5">
                        {sortedTags.map((ft: any) => (
                          <div key={ft.tags?.name} className="bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-[10px] flex items-center gap-3 rounded-md hover:border-yellow-500/40 transition-all">
                            <span className="text-neutral-400 font-bold uppercase">#{ft.tags?.name}</span>
                            <span className="text-yellow-500 font-black border-l border-white/10 pl-3">{ft.vote_count}</span>
                            <div className="flex gap-2 ml-1">
                              <button onClick={() => onVote(e.id, ft.tags?.name, 1)} className="hover:text-green-400 text-xs font-bold transition-all transform hover:scale-125">+</button>
                              <button onClick={() => onVote(e.id, ft.tags?.name, -1)} className="hover:text-red-400 text-xs font-bold transition-all transform hover:scale-125">-</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="relative flex gap-2 max-w-xs pt-4">
                        <input 
                          className="bg-neutral-900 border border-neutral-800 text-[10px] p-2 outline-none focus:border-yellow-500 w-full uppercase font-bold text-white rounded-sm"
                          placeholder="New Tag..."
                          value={tagInput[e.id] || ""}
                          onChange={ev => setTagInput({ ...tagInput, [e.id]: ev.target.value })}
                          onKeyDown={ev => ev.key === 'Enter' && handleAddTag(e.id)}
                        />
                        <button onClick={() => handleAddTag(e.id)} className="bg-neutral-800 border border-neutral-700 px-4 py-2 text-[10px] font-black uppercase text-neutral-400 hover:bg-yellow-600 hover:text-black transition-all rounded-sm">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}