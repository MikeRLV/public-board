"use client";
import { useState, useEffect } from "react";

// Fix: Ensure this is a NAMED EXPORT to match your import in CalendarLogic
export function PostEventModal({ isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr, bannedWords = [] }: any) {
  
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  // --- Bi-directional Auto-Tag Logic ---
  useEffect(() => {
    const p = formState.price.toLowerCase().trim();
    const isFreePrice = (p === "0" || p === "$0" || p === "free");
    
    // Fix: Explicitly type 't' as string
    const tagsArray = formState.tags.split(',').map((t: string) => t.trim());
    const hasFreeTag = tagsArray.some((t: string) => t.toLowerCase() === "free");

    if (isFreePrice && !hasFreeTag) {
      const updatedTags = formState.tags.trim() 
        ? (formState.tags.trim().endsWith(',') ? `${formState.tags} free, ` : `${formState.tags}, free, `)
        : "free, ";
      setFormState({ ...formState, tags: updatedTags });

    } else if (!isFreePrice && hasFreeTag) {
      const filteredTags = tagsArray
        .filter((t: string) => t.toLowerCase() !== "free") // Fix: Explicit type
        .filter((t: string) => t !== "")                  // Fix: Explicit type
        .join(', ');
      
      const finalTags = filteredTags ? `${filteredTags}, ` : "";
      setFormState({ ...formState, tags: finalTags });
    }
  }, [formState.price]); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/50 rounded-xl p-8 flex flex-col my-auto relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 uppercase tracking-tighter leading-none">Post Event</h2>
        
        <div className="space-y-4">
          <input type="date" min={todayStr} className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" value={formState.date} onChange={e => setFormState({ ...formState, date: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 uppercase font-black" placeholder="EVENT TITLE" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value })} />

          <div className="flex flex-col gap-1">
             <input 
               required
               className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono lowercase" 
               placeholder="LOCATION" 
               value={formState.town} 
               onChange={e => {
                 const val = e.target.value;
                 if (bannedWords.includes(slugify(val))) return alert("Invalid area name.");
                 setFormState({ ...formState, town: val });
               }} 
               onBlur={() => setFormState({ ...formState, town: slugify(formState.town) })}
             />
             <span className="text-[7px] text-neutral-600 uppercase tracking-widest ml-1 font-bold">
                {formState.town ? `Posting to: ${slugify(formState.town)}` : "Required: Choose a location"}
             </span>
          </div>

          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="VENUE NAME" value={formState.place} onChange={e => setFormState({ ...formState, place: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="PRICE" value={formState.price} onChange={e => setFormState({ ...formState, price: e.target.value })} />
          
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="TAGS (comma separated)" value={formState.tags} onChange={e => setFormState({ ...formState, tags: e.target.value })} />

          <textarea className="w-full bg-black border border-neutral-700 p-3 text-white h-24 text-xs outline-none resize-none focus:border-yellow-500" placeholder="DESCRIPTION / DETAILS..." value={formState.desc} onChange={e => setFormState({ ...formState, desc: e.target.value })} />
          
          <div className="flex flex-col gap-2 pt-2">
            <div className="relative border border-neutral-700 bg-black p-3 rounded-sm flex items-center justify-between">
              <input type="file" accept=".jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFormState({ ...formState, image: e.target.files?.[0] || null })} />
              <span className="text-[10px] text-neutral-400 truncate">{formState.image ? formState.image.name : "SELECT FILE"}</span>
              <div className="bg-yellow-600 text-black px-2 py-1 text-[9px] font-bold uppercase">Browse</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold border border-neutral-700 uppercase">Cancel</button>
          <button onClick={onSave} disabled={isUploading || !formState.town} className="flex-1 py-3 text-xs font-bold uppercase bg-yellow-600 text-black disabled:opacity-50">
            {isUploading ? "UPLOADING..." : "Post Flyer"}
          </button>
        </div>
      </div>
    </div>
  );
}