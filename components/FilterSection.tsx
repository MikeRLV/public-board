"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Portal dropdown ───────────────────────────────────────────────────────────
function PortalDropdown({ inputRef, suggestions, onSelect, visible }: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  suggestions: { name: string; count?: number }[];
  onSelect: (s: string) => void;
  visible: boolean;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (!visible) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [visible, suggestions]);

  if (!visible || suggestions.length === 0) return null;

  return createPortal(
    <div
      style={{ top: coords.top, left: coords.left, width: coords.width, zIndex: 99999 }}
      className="fixed bg-neutral-900 border border-neutral-700 shadow-2xl max-h-48 overflow-y-auto"
    >
      {suggestions.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          onMouseDown={e => { e.preventDefault(); onSelect(s.name); }}
          className="px-3 py-2 text-[11px] font-bold uppercase cursor-pointer hover:bg-neutral-800 hover:text-[var(--primary)] text-white border-b border-white/5 last:border-0 transition-colors flex items-center justify-between"
        >
          <span>#{s.name}</span>
          {s.count != null && s.count > 1 && (
            <span className="text-[9px] font-mono text-neutral-500 ml-2">×{s.count}</span>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ── Aggregate flyer_tags into {name, count} sorted by popularity ──────────────
const aggregateTags = (data: any[]): { name: string; count: number }[] => {
  const map = new Map<string, number>();
  for (const t of data) {
    const name = t.tags?.name;
    if (!name) continue;
    map.set(name, (map.get(name) || 0) + (t.vote_count || 1));
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

export function FilterSection({ 
  TagPopRef, 
  filterMode, 
  setFilterMode, 
  activeTags = [], 
  setActiveTags, 
  toggleTag, 
  scaled,
  onTagsClick,
}: any) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search while typing
  useEffect(() => {
    if (!inputValue.trim()) return;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('flyer_tags').select('vote_count, tags(name)').ilike('tags.name', `%${inputValue.trim()}%`).limit(50);
      if (error || !data) return;
      const results = aggregateTags(data).filter(t => !activeTags.includes(t.name)).slice(0, 8);
      setSuggestions(results);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, activeTags]);

  // Top 10 on focus when empty
  const handleFocus = async () => {
    setFocused(true);
    if (!inputValue.trim()) {
      const { data, error } = await supabase
        .from('flyer_tags').select('vote_count, tags(name)').order('vote_count', { ascending: false }).limit(100);
      if (!error && data) {
        const results = aggregateTags(data).filter(t => !activeTags.includes(t.name)).slice(0, 10);
        setSuggestions(results);
      }
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setFocused(false);
      if (!inputValue.trim()) setSuggestions([]);
    }, 150);
  };

  const handleAddTag = (tagToAdd: string) => {
    const val = tagToAdd.trim().toLowerCase();
    if (val && !activeTags.includes(val)) {
      if (toggleTag) toggleTag(val);
      else if (setActiveTags) setActiveTags([...activeTags, val]);
    }
    setInputValue("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-4 pb-4" ref={TagPopRef}>
      
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 w-fit overflow-visible cursor-pointer group" onClick={onTagsClick}>
          <div className="flex items-center justify-center w-6 h-6 overflow-visible shrink-0">
            <div 
              style={{ width: `calc(0.625rem * var(--text-scale))`, height: `calc(0.625rem * var(--text-scale))` }}
              className="rounded-full bg-green-500 shadow-[0_0_12px_#22c55e] animate-pulse group-hover:scale-150 transition-transform" 
            />
          </div>
          <span style={{ color: 'var(--primary)' }} className="font-bold opacity-50 group-hover:opacity-100 uppercase">
            Filters
          </span>
        </div>

        <button 
          onClick={() => setFilterMode(filterMode === 'AND' ? 'OR' : 'AND')} 
          style={{ fontSize: `calc(${scaled(10.5).fontSize} * 0.9)` } as any}
          className="flex items-center border border-neutral-700 rounded-sm overflow-hidden shrink-0"
        >
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'AND' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>AND</div>
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'OR' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>OR</div>
        </button>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          placeholder="+ Add tag"
          style={scaled(13)}
          className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-[var(--primary)] font-bold uppercase transition-all"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(inputValue); } }}
        />
        <PortalDropdown
          inputRef={inputRef}
          suggestions={suggestions}
          visible={focused && suggestions.length > 0}
          onSelect={s => handleAddTag(s)}
        />
      </div>

      <div style={{ gap: `calc(0.25rem * var(--text-scale))` }} className="flex flex-wrap">
        {activeTags.map((tag: string) => (
          <span
            key={tag}
            onClick={() => toggleTag(tag)}
            style={{ ...scaled(10), padding: `calc(0.125rem * var(--text-scale)) calc(0.5rem * var(--text-scale))` }}
            className="bg-neutral-800 border border-neutral-700 font-bold cursor-pointer hover:border-red-500 transition-all truncate uppercase"
          >
            {tag} &times;
          </span>
        ))}
      </div>
    </div>
  );
}
