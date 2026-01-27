"use client";
import { useEffect, useState, useMemo, useRef } from "react";

export function PostEventModal({ isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr, weightedTags = [] }: any) {
  // --- Autocomplete State ---
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the current word being typed (the string after the last comma)
  const currentWord = useMemo(() => {
    const parts = (formState.tags || "").split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  }, [formState.tags]);

  // Filter global weightedTags based on the current input word
  const suggestions = useMemo(() => {
    if (!currentWord || currentWord.length < 1) return [];
    return weightedTags
      .filter((t: any) => t.name.startsWith(currentWord))
      .slice(0, 5); 
  }, [currentWord, weightedTags]);

  // Reset index when suggestions change
  useEffect(() => {
    setSuggestionIdx(-1);
  }, [suggestions]);

  const handleSelectTag = (tagName: string) => {
    const parts = (formState.tags || "").split(",");
    // Replace the current partial word with the full tag
    parts[parts.length - 1] = ` ${tagName}`;
    // Join back and add a comma to prepare for the next manual entry
    const finalTags = parts.join(",").replace(/^,/, "").trim();
    setFormState({ ...formState, tags: finalTags + ", " });
    setSuggestionIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      setSuggestionIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setSuggestionIdx(prev => (prev > 0 ? prev - 1 : prev));
      e.preventDefault();
    } else if (e.key === "Enter" && suggestionIdx >= 0) {
      handleSelectTag(suggestions[suggestionIdx].name);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setSuggestionIdx(-1);
    }
  };

  // --- Bi-directional Sync Logic (Preserved & Sanitized) ---
  useEffect(() => {
    let currentTags = (formState.tags || "").split(',').map((t: string) => t.trim()).filter((t: string) => t !== "");
    let changed = false;

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

    const syncTag = (condition: boolean, tagName: string) => {
      const hasTag = currentTags.includes(tagName);
      if (condition && !hasTag) { currentTags.push(tagName); changed = true; }
      else if (!condition && hasTag) { currentTags = currentTags.filter((t: string) => t !== tagName); changed = true; }
    };

    syncTag(!!formState.is18Plus, "18+");
    syncTag(!!formState.is21Plus, "21+");
    syncTag(!!formState.isAllAges, "all-ages"); 

    if (changed) {
      // Logic to preserve existing trailing commas for better typing flow
      const trailingComma = (formState.tags || "").trim().endsWith(",") ? ", " : "";
      setFormState({ 
        ...formState, 
        tags: currentTags.join(', ') + (currentTags.length > 0 ? trailingComma || ', ' : '') 
      });
    }
  }, [formState.price, !!formState.is18Plus, !!formState.is21Plus, !!formState.isAllAges]); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/50 rounded-xl p-8 flex flex-col my-auto relative shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-yellow-500 mb-6 uppercase tracking-tighter leading-none">Post Event</h2>
        
        <div className="space-y-4">
          <input type="date" min={todayStr} className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" value={formState.date || ""} onChange={e => setFormState({ ...formState, date: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 uppercase font-black" placeholder="EVENT TITLE" value={formState.title || ""} onChange={e => setFormState({ ...formState, title: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono lowercase" placeholder="LOCATION (e.g. las-vegas)" value={formState.town || ""} onChange={e => setFormState({ ...formState, town: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="VENUE NAME" value={formState.place || ""} onChange={e => setFormState({ ...formState, place: e.target.value })} />
          <input className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" placeholder="PRICE" value={formState.price || ""} onChange={e => setFormState({ ...formState, price: e.target.value })} />
          
          <div className="flex flex-wrap gap-4 py-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.isAllAges} onChange={e => setFormState({...formState, isAllAges: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.isAllAges ? 'bg-emerald-600 border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.isAllAges ? 'text-emerald-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>All Ages</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is18Plus} onChange={e => setFormState({...formState, is18Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is18Plus ? 'bg-yellow-600 border-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is18Plus ? 'text-yellow-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>18+ Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="hidden" checked={!!formState.is21Plus} onChange={e => setFormState({...formState, is21Plus: e.target.checked})} />
              <div className={`w-4 h-4 border transition-all ${formState.is21Plus ? 'bg-red-600 border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'border-neutral-700'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${formState.is21Plus ? 'text-red-500' : 'text-neutral-500 group-hover:text-neutral-300'}`}>21+ Only</span>
            </label>
          </div>

          <div className="relative">
            <input 
              ref={inputRef}
              className="w-full bg-black border border-neutral-700 p-3 text-white text-xs outline-none focus:border-yellow-500 font-mono" 
              placeholder="TAGS (comma separated)" 
              value={formState.tags || ""} 
              onChange={e => setFormState({ ...formState, tags: e.target.value })} 
              onKeyDown={handleKeyDown}
            />
            
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-800 border border-neutral-700 rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                {suggestions.map((tag: any, i: number) => (
                  <button 
                    key={tag.name}
                    onClick={() => handleSelectTag(tag.name)}
                    onMouseEnter={() => setSuggestionIdx(i)}
                    className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 transition-colors flex justify-between items-center ${
                      suggestionIdx === i ? "bg-yellow-600 text-black" : "hover:bg-yellow-600/20 text-neutral-300"
                    }`}
                  >
                    <span>#{tag.name}</span>
                    <span className={`font-mono text-[8px] ${suggestionIdx === i ? "text-black/50" : "text-neutral-500"}`}>+{tag.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea className="w-full bg-black border border-neutral-700 p-3 text-white h-24 text-xs outline-none resize-none focus:border-yellow-500" placeholder="DESCRIPTION / DETAILS..." value={formState.desc || ""} onChange={e => setFormState({ ...formState, desc: e.target.value })} />
          
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