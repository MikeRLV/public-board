"use client";

export function TrendingSection({ hasLocation, trendingTags, toggleTag, scaled, hasEvents, onTrendingClick }: any) {
  const isMonthEmpty = hasEvents === false || (Array.isArray(hasEvents) && hasEvents.length === 0);
  const tags = isMonthEmpty ? [] : (trendingTags || []);
  
  return (
    <div 
      style={{ gap: `calc(0.4rem * var(--text-scale))` }}
      className={`flex flex-col transition-opacity ${!hasLocation ? 'opacity-20 pointer-events-none' : ''}`}
    >
      <div
        className="flex items-center gap-2 w-fit overflow-visible cursor-pointer group"
        onClick={onTrendingClick}
      >
        <div className="flex items-center justify-center w-6 h-6 overflow-visible shrink-0">
          <div 
            style={{ width: `calc(0.625rem * var(--text-scale))`, height: `calc(0.625rem * var(--text-scale))` }}
            className="rounded-full bg-red-600 shadow-[0_0_12px_#dc2626] animate-pulse group-hover:scale-150 transition-transform" 
          />
        </div>
        <span style={{ color: 'var(--primary)' }} className="font-bold opacity-50 group-hover:opacity-100 uppercase">
          Trending
        </span>
      </div>

      <div 
        style={{ gap: `calc(0.25rem * var(--text-scale))` }}
        className="flex flex-col max-h-[240px] overflow-y-auto custom-scrollbar pr-1"
      >
        {!hasLocation ? (
          <div 
            style={{ 
              ...scaled(10), 
              padding: `calc(0.75rem * var(--text-scale))`, 
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)' 
            }} 
            className="opacity-70 italic leading-tight uppercase border border-dashed text-center"
          >
            Please select a LoCAL to populate trending tags.
          </div>
        ) : tags.length === 0 ? (
          <div 
            style={{ 
              ...scaled(10), 
              padding: `calc(0.75rem * var(--text-scale))`, 
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)' 
            }} 
            className="opacity-70 italic leading-tight uppercase border border-dashed text-center"
          >
            Nothing trending this month yet.
          </div>
        ) : (
          tags.sort((a: any, b: any) => b.weight - a.weight).slice(0, 8).map((tag: any) => (
            <button 
              key={tag.name} 
              onClick={() => toggleTag(tag.name)} 
              style={{ padding: `calc(0.35rem * var(--text-scale)) calc(0.125rem * var(--text-scale))` }}
              className="flex justify-between items-center group border-b border-white/10 hover:bg-white/5 rounded transition-colors uppercase"
            >
              <span style={scaled(12)} className="font-bold text-neutral-400 truncate group-hover:text-white">
                {tag.name}
              </span>
              <span style={{ ...scaled(10), color: 'var(--primary)' }} className="font-black">
                +{tag.weight}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
