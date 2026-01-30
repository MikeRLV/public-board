"use client";
import { useEffect, useState, useMemo, useRef } from "react";

// Added weightedLocals as a separate pool
export function PostEventModal({ 
  isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr, 
  weightedTags = [], weightedLocals = [] 
}: any) {
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [townSuggestionIdx, setTownSuggestionIdx] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const townInputRef = useRef<HTMLInputElement>(null);

  // --- LoCAL Suggestions Logic (Using the LoCAL-specific pool) ---
  const currentTownWord = useMemo(() => {
    const parts = (formState.town || "").split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  }, [formState.town]);

  const townSuggestions = useMemo(() => {
    if (!currentTownWord || currentTownWord.length < 1) return [];
    // Filters from weightedLocals instead of weightedTags
    return weightedLocals
      .filter((t: any) => t.name.toLowerCase().startsWith(currentTownWord))
      .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 5); 
  }, [currentTownWord, weightedLocals]);

  const handleSelectTown = (townName: string) => {
    const parts = (formState.town || "").split(",");
    parts[parts.length - 1] = ` ${townName}`;
    const finalTowns = parts.join(",").replace(/^,/, "").trim();
    // Populates with a comma and space for the next entry
    setFormState({ ...formState, town: finalTowns + ", " }); 
    setTownSuggestionIdx(-1);
    townInputRef.current?.focus();
  };

  // --- Tag Suggestions Logic (Using the descriptive pool) ---
  const currentWord = useMemo(() => {
    const parts = (formState.tags || "").split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  }, [formState.tags]);

  const suggestions = useMemo(() => {
    if (!currentWord || currentWord.length < 1) return [];
    return weightedTags
      .filter((t: any) => t.name.toLowerCase().startsWith(currentWord))
      .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 5); 
  }, [currentWord, weightedTags]);

  const handleSelectTag = (tagName: string) => {
    const parts = (formState.tags || "").split(",");
    parts[parts.length - 1] = ` ${tagName}`;
    const finalTags = parts.join(",").replace(/^,/, "").trim();
    setFormState({ ...formState, tags: finalTags + ", " });
    setSuggestionIdx(-1);
    tagInputRef.current?.focus();
  };

  // --- Keyboard & Sync Logic remains identical to preserve functionality ---
  const handleKeyDown = (e: React.KeyboardEvent, type: 'tag' | 'town') => {
    const currentSuggestions = type === 'tag' ? suggestions : townSuggestions;
    const currentIdx = type === 'tag' ? suggestionIdx : townSuggestionIdx;
    const setIdx = type === 'tag' ? setSuggestionIdx : setTownSuggestionIdx;
    const selectFn = type === 'tag' ? handleSelectTag : handleSelectTown;

    if (currentSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      setIdx(prev => (prev < currentSuggestions.length - 1 ? prev + 1 : prev));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setIdx(prev => (prev > 0 ? prev - 1 : prev));
      e.preventDefault();
    } else if (e.key === "Enter" && currentIdx >= 0) {
      selectFn(currentSuggestions[currentIdx].name);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setIdx(-1);
    }
  };

  useEffect(() => {
    let currentTags = (formState.tags || "").split(',').map((t: string) => t.trim()).filter((t: string) => t !== "");
    let changed = false;
    const p = (formState.price || "").toLowerCase().trim();
    const isFree = (p === "0" || p === "$0" || p === "free");
    const hasFree = currentTags.some((t: string) => t.toLowerCase() === "free");
    if (isFree && !hasFree) { currentTags.push("free"); changed = true; }
    else if (!isFree && hasFree) { currentTags = currentTags.filter((t: string) => t.toLowerCase() !== "free"); changed = true; }
    const syncTag = (cond: boolean, name: string) => {
      const has = currentTags.includes(name);
      if (cond && !has) { currentTags.push(name); changed = true; }
      else if (!cond && has) { currentTags = currentTags.filter((t: string) => t !== name); changed = true; }
    };
    syncTag(!!formState.isAllAges, "all-ages"); syncTag(!!formState.is18Plus, "18+"); syncTag(!!formState.is21Plus, "21+");
    if (changed) setFormState({ ...formState, tags: currentTags.join(', ') + (currentTags.length > 0 ? ", " : "") });
  }, [formState.price, formState.isAllAges, formState.is18Plus, formState.is21Plus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-4 overflow-y-auto font-mono" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/50 rounded-xl p-8 flex flex-col my-auto relative shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 uppercase tracking-tighter leading-none">Post Event</h2>
        
        <div className="space-y-4">
          <input type="date" min={todayStr} className="w-full bg-black border border-neutral-700 p-3 text-white text-xs" value={formState.date || ""} onChange={e => setFormState({ ...formState, date: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs uppercase font-black" placeholder="EVENT TITLE" value={formState.title || ""} onChange={e => setFormState({ ...formState, title: e.target.value })} />
          
          <div className="relative">
            <input 
              ref={townInputRef}
              className="w-full bg-black border border-neutral-700 p-3 text-white text-[11px]" 
              placeholder="LoCAL(s) [comma separated]" 
              value={formState.town || ""} 
              onChange={e => setFormState({ ...formState, town: e.target.value })} 
              onKeyDown={(e) => handleKeyDown(e, 'town')}
            />
            {townSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-800 border border-neutral-700 rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                {townSuggestions.map((tag: any, i: number) => (
                  <button key={tag.name} onClick={() => handleSelectTown(tag.name)} onMouseEnter={() => setTownSuggestionIdx(i)} className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 transition-colors flex justify-between items-center ${townSuggestionIdx === i ? "bg-yellow-600 text-black" : "hover:bg-yellow-600/20 text-neutral-300"}`}>
                    <span>{tag.name}</span>
                    <span className={`font-mono text-[8px] ${townSuggestionIdx === i ? "text-black/50" : "text-neutral-500"}`}>+{tag.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs" placeholder="VENUE NAME" value={formState.place || ""} onChange={e => setFormState({ ...formState, place: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs" placeholder="PRICE" value={formState.price || ""} onChange={e => setFormState({ ...formState, price: e.target.value })} />
          
          <div className="flex flex-wrap gap-4 py-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.isAllAges} onChange={e => setFormState({...formState, isAllAges: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.isAllAges ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.isAllAges ? 'text-emerald-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>All Ages</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is18Plus} onChange={e => setFormState({...formState, is18Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is18Plus ? 'bg-yellow-600 border-yellow-600' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is18Plus ? 'text-yellow-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>18+ Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is21Plus} onChange={e => setFormState({...formState, is21Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is21Plus ? 'bg-red-600 border-red-600' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is21Plus ? 'text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>21+ Only</span>
            </label>
          </div>

          <div className="relative">
            <input 
              ref={tagInputRef}
              className="w-full bg-black border border-neutral-700 p-3 text-white text-xs font-mono" 
              placeholder="TAG(s) [comma separated]" 
              value={formState.tags || ""} 
              onChange={e => setFormState({ ...formState, tags: e.target.value })} 
              onKeyDown={(e) => handleKeyDown(e, 'tag')}
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-800 border border-neutral-700 rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                {suggestions.map((tag: any, i: number) => (
                  <button key={tag.name} onClick={() => handleSelectTag(tag.name)} onMouseEnter={() => setSuggestionIdx(i)} className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 transition-colors flex justify-between items-center ${suggestionIdx === i ? "bg-yellow-600 text-black" : "hover:bg-yellow-600/20 text-neutral-300"}`}>
                    <span>#{tag.name}</span>
                    <span className={`font-mono text-[8px] ${suggestionIdx === i ? "text-black/50" : "text-neutral-500"}`}>+{tag.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea className="w-full bg-black border border-neutral-700 p-3 text-white h-24 text-xs font-mono resize-none" placeholder="DESCRIPTION / DETAILS..." value={formState.desc || ""} onChange={e => setFormState({ ...formState, desc: e.target.value })} />
          
          <div className="relative border border-neutral-700 bg-black p-3 rounded-sm flex items-center justify-between group">
            <input type="file" accept=".jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setFormState({ ...formState, image: e.target.files?.[0] || null })} />
            <span className="text-[10px] text-neutral-400 truncate uppercase">{formState.image ? formState.image.name : "SELECT FLYER IMAGE"}</span>
            <div className="bg-yellow-600 text-black px-2 py-1 text-[9px] font-bold uppercase group-hover:bg-yellow-500 transition-colors">Browse</div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold border border-neutral-700 uppercase hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={isUploading || !formState.town} className="flex-1 py-3 text-xs font-bold uppercase bg-yellow-600 text-black disabled:opacity-50 active:scale-95 transition-all">
            {isUploading ? "UPLOADING..." : "Post Flyer"}
          </button>
        </div>
      </div>
    </div>
  );
}