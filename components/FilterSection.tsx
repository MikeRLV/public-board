"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function FilterSection({ 
  TagPopRef, 
  filterMode, 
  setFilterMode, 
  activeTags = [], 
  setActiveTags, 
  toggleTag, 
  scaled 
}: any) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchedTags, setFetchedTags] = useState<string[]>([]); // Holds tags from DB

  // Fetch tags from SQL whenever the input changes
  useEffect(() => {
    const fetchTags = async () => {
      const search = inputValue.trim().toLowerCase();
      if (!search) {
        setFetchedTags([]);
        return;
      }

      // Query the 'tags' table for names that match what the user is typing
      const { data, error } = await supabase
        .from('tags') 
        .select('name') 
        .ilike('name', `%${search}%`)
        .limit(10); 

      if (!error && data) {
        const returnedTags = data.map((t: any) => t.name.toLowerCase());
        setFetchedTags(returnedTags.filter(tag => !activeTags.includes(tag)));
      }
    };

    // 150ms debounce
    const delayDebounceFn = setTimeout(() => {
      fetchTags();
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, activeTags]);

  const handleAddTag = (tagToAdd: string) => {
    const val = tagToAdd.trim().toLowerCase();
    if (val && !activeTags.includes(val)) {
      if (toggleTag) {
        toggleTag(val);
      } else if (setActiveTags) {
        setActiveTags([...activeTags, val]);
      }
    }
    setInputValue("");
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4 pb-4" ref={TagPopRef}>
      
      {/* HEADER SECTION - Toggle moved back here with space-between */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        
        {/* Left Side: Blinking light + Text */}
        <div className="flex items-center gap-2 w-fit overflow-visible select-none pointer-events-none">
          <div className="flex items-center justify-center w-6 h-6 overflow-visible shrink-0">
            <div 
              style={{ width: `calc(0.625rem * var(--text-scale))`, height: `calc(0.625rem * var(--text-scale))` }}
              className="rounded-full bg-green-500 shadow-[0_0_12px_#22c55e] animate-pulse" 
            />
          </div>
          <span style={{ color: 'var(--primary)' }} className="font-bold opacity-50 uppercase">
            Filters
          </span>
        </div>

        {/* Right Side: SCALING TOGGLE */}
        <button 
          onClick={() => setFilterMode(filterMode === 'AND' ? 'OR' : 'AND')} 
          style={{ fontSize: `calc(${scaled(10.5).fontSize} * 0.9)` } as any}
          className="flex items-center border border-neutral-700 rounded-sm overflow-hidden shrink-0"
        >
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'AND' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>
            AND
          </div>
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'OR' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>
            OR
          </div>
        </button>
      </div>

      {/* INPUT & DROPDOWN WRAPPER - Back to taking full width on its own line */}
      <div className="relative">
        <input 
          placeholder="+ Add tag" 
          style={scaled(13)} 
          className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-[var(--primary)] font-bold uppercase transition-all" 
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          // Timeout prevents dropdown from closing before a click registers
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)} 
          onKeyDown={(e) => { 
            if(e.key === 'Enter') { 
              e.preventDefault(); 
              handleAddTag(inputValue);
            } 
          }} 
        />

        {/* SQL AUTOCOMPLETE DROPDOWN */}
        {showDropdown && inputValue && fetchedTags.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
            {fetchedTags.map((tag: string) => (
              <div 
                key={tag}
                onClick={() => handleAddTag(tag)}
                style={scaled(12)}
                className="p-3 cursor-pointer hover:bg-neutral-800 hover:text-[var(--primary)] text-white font-bold uppercase border-b border-white/5 last:border-0 transition-colors"
              >
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Tag Container */}
      <div 
        style={{ gap: `calc(0.25rem * var(--text-scale))` }}
        className="flex flex-wrap"
      >
        {activeTags.map((tag: string) => (
          <span 
            key={tag} 
            onClick={() => toggleTag(tag)} 
            style={{
              ...scaled(10),
              padding: `calc(0.125rem * var(--text-scale)) calc(0.5rem * var(--text-scale))`
            }}
            className="bg-neutral-800 border border-neutral-700 font-bold cursor-pointer hover:border-red-500 transition-all truncate uppercase"
          >
            {tag} &times;
          </span>
        ))}
      </div>
    </div>
  );
}