"use client";

import { useState, useMemo, useEffect } from "react";

export function PostEventModal({ isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr, weightedTags }: any) {
  const [tagInputFocus, setTagInputFocus] = useState(false);

  const normalizeTag = (tag: string) => 
    tag.toLowerCase().trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  // --- Auto-Tag "Free" Logic ---
  useEffect(() => {
    if (formState.price.toLowerCase().includes("free")) {
      const currentTags = formState.tags.split(',').map((t: string) => t.trim().toLowerCase());
      if (!currentTags.includes("free")) {
        const updated = formState.tags.trim() 
          ? (formState.tags.endsWith(',') ? formState.tags + " free, " : formState.tags + ", free, ")
          : "free, ";
        setFormState({ ...formState, tags: updated });
      }
    }
  }, [formState.price, setFormState]);

  // --- Tag Suggestions Logic ---
  const tagSuggestions = useMemo(() => {
    const lastTag = formState.tags.split(',').pop()?.trim().toLowerCase() || "";
    if (!lastTag && !tagInputFocus) return [];
    return weightedTags.filter((t: any) => t.name.startsWith(normalizeTag(lastTag))).slice(0, 5);
  }, [formState.tags, weightedTags, tagInputFocus]);

  const handleSelectTag = (tagName: string) => {
    const parts = formState.tags.split(',').map((t: string) => t.trim());
    parts.pop();
    parts.push(tagName);
    setFormState({ ...formState, tags: parts.join(', ') + ', ' });
    setTagInputFocus(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/50 rounded-xl p-8 flex flex-col my-auto relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 uppercase tracking-tighter">Post Event</h2>
        
        <div className="space-y-4">
          <input type="date" min={todayStr} className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors" value={formState.date} onChange={e => setFormState({ ...formState, date: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors" placeholder="EVENT TITLE" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value.toUpperCase() })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors" placeholder="VENUE NAME / ADDRESS" value={formState.place} onChange={e => setFormState({ ...formState, place: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors" placeholder="PRICE (e.g. $20 or FREE)" value={formState.price} onChange={e => setFormState({ ...formState, price: e.target.value })} />
          
          <div className="relative">
            <input 
              className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 transition-colors" 
              placeholder="TAGS (comma separated)" 
              value={formState.tags} 
              onChange={e => setFormState({ ...formState, tags: e.target.value })} 
              onFocus={() => setTagInputFocus(true)} 
              onBlur={() => setTimeout(() => setTagInputFocus(false), 200)} 
            />
            {tagInputFocus && tagSuggestions.length > 0 && (
              <div className="absolute z-[110] left-0 right-0 bottom-full mb-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-2xl overflow-hidden flex flex-col">
                {tagSuggestions.map((s: any) => (
                  <button key={s.name} onClick={() => handleSelectTag(s.name)} className="w-full text-left px-4 py-2.5 text-[10px] hover:bg-yellow-600 hover:text-black flex justify-between items-center group transition-colors">
                    <span className="uppercase font-black tracking-tight">{s.name}</span>
                    <span className="text-[9px] font-mono text-yellow-500/50 group-hover:text-black/40">+{s.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea className="w-full bg-black border border-neutral-700 p-3 text-white h-24 text-xs outline-none resize-none focus:border-yellow-500 transition-colors" placeholder="ADDITIONAL DETAILS..." value={formState.desc} onChange={e => setFormState({ ...formState, desc: e.target.value })} />
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-neutral-500 uppercase font-bold ml-1">Flyer Image</label>
            <div className="relative border border-neutral-700 bg-black p-3 rounded-sm flex items-center justify-between">
              <input type="file" accept=".jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFormState({ ...formState, image: e.target.files?.[0] || null })} />
              <span className="text-[10px] text-neutral-400 truncate">{formState.image ? formState.image.name : "CHOOSE FILE (JPG, PNG)"}</span>
              <div className="bg-yellow-600 text-black px-2 py-1 text-[9px] font-bold uppercase">Browse</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold border border-neutral-700 uppercase hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={isUploading} className="flex-1 py-3 text-xs font-bold uppercase transition-all bg-yellow-600 text-black hover:bg-yellow-500 disabled:opacity-50 shadow-lg active:scale-95">{isUploading ? "PROJECTING..." : "Post Flyer"}</button>
        </div>
      </div>
    </div>
  );
}