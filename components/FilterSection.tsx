"use client";

export function FilterSection({ TagPopRef, filterMode, setFilterMode, activeTags, setActiveTags, toggleTag, scaled }: any) {
  return (
    <div className="space-y-4 pb-4" ref={TagPopRef}>
      {/* Border opacity unified for line consistency */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div style={scaled(11)} className="font-bold text-neutral-500 uppercase">Filters</div>
        
        {/* SCALING TOGGLE */}
        <button 
          onClick={() => setFilterMode(filterMode === 'AND' ? 'OR' : 'AND')} 
          style={{ fontSize: `calc(${scaled(10.5).fontSize} * 0.9)` } as any}
          className="flex items-center border border-neutral-700 rounded-sm overflow-hidden"
        >
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'AND' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>
            AND
          </div>
          <div className={`px-2.5 py-1 font-bold transition-colors ${filterMode === 'OR' ? 'bg-[var(--primary)] text-black' : 'text-neutral-500'}`}>
            OR
          </div>
        </button>
      </div>

      <input 
        placeholder="+ Add tag" 
        style={scaled(13)} 
        className="bg-neutral-900 p-2 w-full border border-neutral-700 text-white outline-none focus:border-[var(--primary)] font-bold uppercase transition-all" 
        onKeyDown={(e) => { 
          if(e.key === 'Enter') { 
            const val = e.currentTarget.value.trim().toLowerCase(); 
            if (val && !activeTags.includes(val)) setActiveTags?.([...activeTags, val]); 
            e.currentTarget.value = ""; 
          } 
        }} 
      />

      {/* Dynamic Tag Container: Gaps now grow with scale */}
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
              // Dynamic padding ensures the "pill" grows with the text
              padding: `calc(0.125rem * var(--text-scale)) calc(0.5rem * var(--text-scale))`
            }}
            className="bg-neutral-800 border border-neutral-700 font-bold cursor-pointer hover:border-red-500 transition-all truncate uppercase"
          >
            {tag} ×
          </span>
        ))}
      </div>
    </div>
  );
}