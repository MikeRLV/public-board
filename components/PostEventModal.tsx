"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useSidebarLogic } from "../hooks/useSidebarLogic";

// Preserve existing suggestion logic and tag syncing
export function PostEventModal({ 
  isOpen, onClose, formState, setFormState, onSave, isUploading, todayStr, 
  weightedTags = [], weightedLocals = [] 
}: any) {
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [townSuggestionIdx, setTownSuggestionIdx] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const townInputRef = useRef<HTMLInputElement>(null);

  // Sync logic to ensure modal respects the Theme Lab cache immediately
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      const savedTheme = localStorage.getItem("local-bull-custom-theme");
      if (savedTheme) {
        const colors = JSON.parse(savedTheme);
        const root = document.documentElement;
        if (root.getAttribute('data-theme') === 'custom') {
          root.style.setProperty('--bg-main', colors.bg);
          root.style.setProperty('--primary', colors.primary);
          root.style.setProperty('--border-color', colors.border);
          root.style.setProperty('--text-main', colors.text);
          root.style.setProperty('--text-muted', colors.muted);
        }
      }
    }
  }, [isOpen]);

  // --- LoCAL Suggestions Logic ---
  const currentTownWord = useMemo(() => {
    const parts = (formState.town || "").split(",");
    return parts[parts.length - 1].trim().toLowerCase();
  }, [formState.town]);

  const townSuggestions = useMemo(() => {
    if (!currentTownWord || currentTownWord.length < 1) return [];
    return weightedLocals
      .filter((t: any) => t.name.toLowerCase().startsWith(currentTownWord))
      .sort((a: any, b: any) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 5); 
  }, [currentTownWord, weightedLocals]);

  const handleSelectTown = (townName: string) => {
    const parts = (formState.town || "").split(",");
    parts[parts.length - 1] = ` ${townName}`;
    const finalTowns = parts.join(",").replace(/^,/, "").trim();
    setFormState({ ...formState, town: finalTowns + ", " }); 
    setTownSuggestionIdx(-1);
    townInputRef.current?.focus();
  };

  // --- Tag Suggestions Logic ---
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

  // Auto-sync Tags based on Price and Age Checks
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
      <div 
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        className="w-full max-w-lg border rounded-xl p-8 flex flex-col my-auto relative shadow-2xl transition-colors duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ color: 'var(--primary)' }} className="text-2xl font-bold mb-6 uppercase tracking-tighter leading-none">
          Post Event
        </h2>
        
        <div className="space-y-4">
          <input 
            type="date" min={todayStr} 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-3 text-[var(--text-main)] text-xs color-scheme-dark focus:border-[var(--primary)] outline-none" 
            value={formState.date || ""} onChange={e => setFormState({ ...formState, date: e.target.value })} 
          />
          
          <input 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-3 text-[var(--text-main)] text-xs uppercase font-black focus:border-[var(--primary)] outline-none" 
            placeholder="EVENT TITLE" value={formState.title || ""} onChange={e => setFormState({ ...formState, title: e.target.value })} 
          />
          
          <div className="relative">
            <input 
              ref={townInputRef}
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              className="w-full border p-3 text-[var(--text-main)] text-[11px] focus:border-[var(--primary)] outline-none" 
              placeholder="LoCAL(s) [comma separated]" 
              value={formState.town || ""} 
              onChange={e => setFormState({ ...formState, town: e.target.value })} 
              onKeyDown={(e) => handleKeyDown(e, 'town')}
            />
            {townSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-900 border border-[var(--border-color)] rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                {townSuggestions.map((tag: any, i: number) => (
                  <button 
                    key={tag.name} 
                    onClick={() => handleSelectTown(tag.name)} 
                    onMouseEnter={() => setTownSuggestionIdx(i)} 
                    className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 transition-colors flex justify-between items-center ${townSuggestionIdx === i ? "bg-[var(--primary)] text-[var(--bg-main)]" : "hover:bg-white/5 text-[var(--text-muted)]"}`}
                  >
                    <span>{tag.name}</span>
                    <span className={`font-mono text-[8px] ${townSuggestionIdx === i ? "opacity-50" : "text-[var(--text-muted)]"}`}>+{tag.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-3 text-[var(--text-main)] text-xs focus:border-[var(--primary)] outline-none" 
            placeholder="VENUE NAME" value={formState.place || ""} onChange={e => setFormState({ ...formState, place: e.target.value })} 
          />
          
          <input 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-3 text-[var(--text-main)] text-xs focus:border-[var(--primary)] outline-none" 
            placeholder="PRICE" value={formState.price || ""} onChange={e => setFormState({ ...formState, price: e.target.value })} 
          />
          
          {/* Age Restriction Checkboxes */}
          <div className="flex flex-wrap gap-4 py-2 px-1">
            {[
              { id: 'isAllAges', label: 'All Ages', color: 'bg-emerald-600' },
              { id: 'is18Plus', label: '18+ Only', color: 'bg-yellow-600' },
              { id: 'is21Plus', label: '21+ Only', color: 'bg-red-600' }
            ].map((age) => (
              <label key={age.id} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="hidden" checked={!!formState[age.id]} onChange={e => setFormState({...formState, [age.id]: e.target.checked})} />
                <div 
                  style={{ borderColor: formState[age.id] ? 'transparent' : 'var(--border-color)' }}
                  className={`w-4 h-4 border transition-all ${formState[age.id] ? age.color : ''}`} 
                />
                <span className={`text-[10px] font-bold uppercase transition-colors ${formState[age.id] ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>
                  {age.label}
                </span>
              </label>
            ))}
          </div>

          <div className="relative">
            <input 
              ref={tagInputRef}
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              className="w-full border p-3 text-[var(--text-main)] text-xs font-mono focus:border-[var(--primary)] outline-none" 
              placeholder="TAG(s) [comma separated]" 
              value={formState.tags || ""} 
              onChange={e => setFormState({ ...formState, tags: e.target.value })} 
              onKeyDown={(e) => handleKeyDown(e, 'tag')}
            />
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-neutral-900 border border-[var(--border-color)] rounded-sm shadow-2xl z-20 flex flex-col overflow-hidden">
                {suggestions.map((tag: any, i: number) => (
                  <button 
                    key={tag.name} 
                    onClick={() => handleSelectTag(tag.name)} 
                    onMouseEnter={() => setSuggestionIdx(i)} 
                    className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase border-b border-white/5 last:border-0 transition-colors flex justify-between items-center ${suggestionIdx === i ? "bg-[var(--primary)] text-[var(--bg-main)]" : "hover:bg-white/5 text-[var(--text-muted)]"}`}
                  >
                    <span>#{tag.name}</span>
                    <span className={`font-mono text-[8px] ${suggestionIdx === i ? "opacity-50" : "text-[var(--text-muted)]"}`}>+{tag.weight}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea 
            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            className="w-full border p-3 text-[var(--text-main)] h-24 text-xs font-mono resize-none focus:border-[var(--primary)] outline-none" 
            placeholder="DESCRIPTION / DETAILS..." value={formState.desc || ""} onChange={e => setFormState({ ...formState, desc: e.target.value })} 
          />
          
          {/* Browse Section */}
          <div style={{ borderColor: 'var(--border-color)' }} className="relative border bg-black/20 p-3 rounded-sm flex items-center justify-between group">
            <input type="file" accept=".jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => setFormState({ ...formState, image: e.target.files?.[0] || null })} />
            <span className="text-[10px] text-[var(--text-muted)] truncate uppercase">{formState.image ? formState.image.name : "SELECT FLYER IMAGE"}</span>
            <div 
              style={{ backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
              className="px-2 py-1 text-[9px] font-bold uppercase transition-opacity hover:opacity-80"
            >
              Browse
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 mt-8">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-xs font-bold border border-[var(--border-color)] text-[var(--text-main)] uppercase hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            disabled={isUploading || !formState.town} 
            style={{ 
              backgroundColor: isUploading ? 'var(--text-muted)' : 'var(--primary)', 
              color: 'var(--bg-main)' 
            }}
            className="flex-1 py-3 text-xs font-bold uppercase disabled:opacity-50 active:scale-95 transition-all shadow-lg"
          >
            {isUploading ? "UPLOADING..." : "Post Flyer"}
          </button>
        </div>
      </div>
    </div>
  );
}