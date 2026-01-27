"use client";
import { useState } from "react";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase for tag submission
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-5xl h-[85vh] border border-white/20 rounded-xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header - Updated Branding to Event Info */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-yellow-500 uppercase font-mono leading-none">Event Info</h2>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
              {dayjs(activeDay).format('MMMM D, YYYY')}
            </span>
          </div>
          <button onClick={onClose} className="text-2xl text-neutral-500 hover:text-white transition-colors">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Post Invitation Section */}
          <div className="border border-dashed border-yellow-500/30 rounded-lg p-6 bg-yellow-500/5 flex flex-col items-center justify-center gap-3">
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold text-center">
              {dayjs(activeDay).isBefore(dayjs().startOf('day')) ? "Past days cannot be updated" : "Know of something else happening on this day?"}
            </p>
            {dayjs(activeDay).isSameOrAfter(dayjs().startOf('day')) && (
              <button 
                onClick={() => {
                  onClose(); // Prevent Z-index stacking issues
                  onPostClick(activeDay);
                }} 
                className="bg-yellow-600 text-black px-8 py-2 rounded-full font-bold text-xs uppercase shadow-lg transition-all hover:bg-yellow-500"
              >
                + Post Flyer
              </button>
            )}
          </div>

          {dayEvents.map((e: any) => {
            const sortedTags = [...(e.flyer_tags || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            
            const currentInput = (tagInput[e.id] || "").toLowerCase();
            const suggestions = currentInput 
              ? weightedTags.filter((t: any) => t.name.startsWith(currentInput)).slice(0, 5) 
              : [];

            return (
              <div key={e.id} className="border p-10 bg-black rounded-lg border-neutral-800 shadow-2xl relative group">
                <div className="flex flex-col md:flex-row gap-14">
                  <div className="w-full md:w-2/5 flex-shrink-0 bg-neutral-900 rounded-lg border border-white/5 min-h-[300px] flex items-center justify-center relative overflow-hidden">
                    {e.image_url ? (
                      <img src={e.image_url} alt="Flyer" className="w-full h-auto object-contain max-h-[500px]" />
                    ) : (
                      <div className="opacity-20 uppercase text-[8px] font-black tracking-widest">No Flyer Projected</div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h3 className="text-5xl font-black text-yellow-500 uppercase leading-none tracking-tighter mb-6">{e.title}</h3>
                    
                    <div className="text-[11px] text-neutral-400 font-bold mb-8 border-b border-white/10 pb-5 uppercase flex items-center justify-between">
                      <span>📍 {e.location_name} | {e.price || 'Free'}</span>
                      <button 
                        onClick={() => onVote(e.id, 'spam', 1)} 
                        className="text-[8px] border border-red-900/40 bg-red-900/10 px-2 py-1 text-red-500/60 hover:bg-red-500 hover:text-white transition-all uppercase font-black rounded-sm tracking-widest"
                      >
                        Report Spam
                      </button>
                    </div>

                    <p className="text-neutral-300 text-base mb-8 leading-relaxed whitespace-pre-wrap">{e.description}</p>

                    <div className="space-y-4 mt-auto">
                      <div className="flex flex-wrap gap-2 pt-8 border-t border-white/5">
                        {sortedTags.map((ft: any) => (
                          <div key={ft.tags?.name} className="bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-[10px] flex items-center gap-3 rounded-md group hover:border-yellow-500/40 transition-all">
                            <span className="text-neutral-400 font-bold group-hover:text-white uppercase transition-colors">#{ft.tags?.name}</span>
                            <span className="text-yellow-500 font-black border-l border-white/10 pl-3">{ft.vote_count}</span>
                            <div className="flex gap-2 ml-1">
                              <button onClick={() => onVote(e.id, ft.tags?.name, 1)} className="hover:text-green-400 text-xs font-bold transition-all transform hover:scale-125">+</button>
                              <button onClick={() => onVote(e.id, ft.tags?.name, -1)} className="hover:text-red-400 text-xs font-bold transition-all transform hover:scale-125">-</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="relative flex gap-2 max-w-xs pt-4">
                        <div className="flex-1 relative">
                          <input 
                            className="bg-neutral-900 border border-neutral-800 text-[10px] p-2 outline-none focus:border-yellow-500 w-full uppercase font-bold text-white rounded-sm"
                            placeholder="New Tag..."
                            value={tagInput[e.id] || ""}
                            onChange={ev => setTagInput({ ...tagInput, [e.id]: ev.target.value })}
                            onKeyDown={ev => ev.key === 'Enter' && handleAddTag(e.id)}
                          />
                          
                          {suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-800 border border-neutral-700 rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                              {suggestions.map((tag: any) => (
                                <button 
                                  key={tag.name}
                                  onClick={() => setTagInput({ ...tagInput, [e.id]: tag.name })}
                                  className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 hover:bg-yellow-600 hover:text-black transition-colors flex justify-between items-center"
                                >
                                  <span>#{tag.name}</span>
                                  <span className="opacity-40 font-mono text-[8px]">+{tag.weight}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleAddTag(e.id)}
                          className="bg-neutral-800 border border-neutral-700 px-4 py-2 text-[10px] font-black uppercase text-neutral-400 hover:bg-yellow-600 hover:text-black transition-all rounded-sm"
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
        </div>
      </div>
    </div>
  );
}