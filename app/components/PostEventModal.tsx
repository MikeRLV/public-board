"use client";
import { useEffect } from "react";

export function PostEventModal({ isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr }: any) {
  
  // --- Bi-directional Sync for Price & Age Restrictions ---
  useEffect(() => {
    // FIX: Using fallback empty string to prevent split error on undefined
    let currentTags = (formState.tags || "").split(',').map((t: string) => t.trim()).filter((t: string) => t !== "");
    let changed = false;

    // 1. Handle "free" tag based on price
    const p = (formState.price || "").toLowerCase().trim();
    const isFreePrice = (p === "0" || p === "$0" || p === "free");
    const hasFreeTag = currentTags.some((t: string) => t.toLowerCase() === "free");

    if (isFreePrice && !hasFreeTag) {
      currentTags.push("free");
      changed = true;
    } else if (!isFreePrice && hasFreeTag) {
      currentTags = currentTags.filter((t: string) => t.toLowerCase() !== "free");
      changed = true;
    }

    // Helper to sync boolean flags with specific tag strings
    const syncTag = (condition: boolean, tagName: string) => {
      const hasTag = currentTags.includes(tagName);
      if (condition && !hasTag) {
        currentTags.push(tagName);
        changed = true;
      } else if (!condition && hasTag) {
        currentTags = currentTags.filter((t: string) => t !== tagName);
        changed = true;
      }
    };

    // 2. Handle Age Restriction Tags
    // Use !! to ensure boolean values and prevent uncontrolled input errors
    syncTag(!!formState.is18Plus, "18+");
    syncTag(!!formState.is21Plus, "21+");
    syncTag(!!formState.isAllAges, "all-ages"); // Updated to slugified format

    if (changed) {
      setFormState({ 
        ...formState, 
        tags: currentTags.join(', ') + (currentTags.length > 0 ? ', ' : '') 
      });
    }
    // FIX: Constant dependency array size to solve React Hook error
  }, [formState.price, !!formState.is18Plus, !!formState.is21Plus, !!formState.isAllAges]); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/50 rounded-xl p-8 flex flex-col my-auto relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 uppercase tracking-tighter leading-none">Post Event</h2>
        
        <div className="space-y-4">
          <input type="date" min={todayStr} className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" value={formState.date} onChange={e => setFormState({ ...formState, date: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 uppercase font-black" placeholder="EVENT TITLE" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value })} />

          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono lowercase" placeholder="LOCATION (e.g. las-vegas)" value={formState.town} onChange={e => setFormState({ ...formState, town: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="VENUE NAME" value={formState.place} onChange={e => setFormState({ ...formState, place: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="PRICE" value={formState.price} onChange={e => setFormState({ ...formState, price: e.target.value })} />
          
          {/* Age Restriction Toggles with Preserved Functional Styles */}
          <div className="flex flex-wrap gap-4 py-2 px-1">
            {/* All Ages (Emerald Green) */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.isAllAges} onChange={e => setFormState({...formState, isAllAges: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.isAllAges ? 'bg-emerald-600 border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.isAllAges ? 'text-emerald-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>All Ages</span>
            </label>

            {/* 18+ Only (Yellow) */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is18Plus} onChange={e => setFormState({...formState, is18Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is18Plus ? 'bg-yellow-600 border-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is18Plus ? 'text-yellow-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>18+ Only</span>
            </label>

            {/* 21+ Only (Red) */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is21Plus} onChange={e => setFormState({...formState, is21Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is21Plus ? 'bg-red-600 border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is21Plus ? 'text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>21+ Only</span>
            </label>
          </div>

          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="TAGS (comma separated)" value={formState.tags} onChange={e => setFormState({ ...formState, tags: e.target.value })} />
          <textarea className="w-full bg-black border border-neutral-700 p-3 text-white h-24 text-xs outline-none resize-none focus:border-yellow-500" placeholder="DESCRIPTION / DETAILS..." value={formState.desc} onChange={e => setFormState({ ...formState, desc: e.target.value })} />
          
          <div className="relative border border-neutral-700 bg-black p-3 rounded-sm flex items-center justify-between">
            <input type="file" accept=".jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFormState({ ...formState, image: e.target.files?.[0] || null })} />
            <span className="text-[10px] text-neutral-400 truncate">{formState.image ? formState.image.name : "SELECT FLYER IMAGE"}</span>
            <div className="bg-yellow-600 text-black px-2 py-1 text-[9px] font-bold uppercase">Browse</div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold border border-neutral-700 uppercase hover:bg-white/5">Cancel</button>
          <button onClick={onSave} disabled={isUploading || !formState.town} className="flex-1 py-3 text-xs font-bold uppercase bg-yellow-600 text-black disabled:opacity-50">
            {isUploading ? "UPLOADING..." : "Post Flyer"}
          </button>
        </div>
      </div>
    </div>
  );
}