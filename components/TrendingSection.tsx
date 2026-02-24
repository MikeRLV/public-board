"use client";

export function TrendingSection({ hasLocation, trendingTags, toggleTag, scaled }: any) {
  const tags = trendingTags || [];
  
  return (
    <div 
      style={{ gap: `calc(0.4rem * var(--text-scale))` }}
      className={`flex flex-col transition-opacity ${!hasLocation ? 'opacity-20 pointer-events-none' : ''}`}
    >
      {/* HEADER: Made static (non-clickable) to prevent dead-end interactions */}
      <div className="flex items-center gap-2 w-fit overflow-visible select-none pointer-events-none">
        {/* CENTERED DOT HOUSING: Kept for branding; hover effects removed */}
        <div className="flex items-center justify-center w-6 h-6 overflow-visible shrink-0">
          <div 
            style={{ 
              width: `calc(0.625rem * var(--text-scale))`, 
              height: `calc(0.625rem * var(--text-scale))` 
            }}
            className="rounded-full bg-red-600 shadow-[0_0_12px_#dc2626] animate-pulse" 
          />
        </div>

        <span 
          style={{ color: 'var(--primary)' }} 
          className="font-bold opacity-50 uppercase"
        >
          Trending
        </span>
      </div>

      <div 
        style={{ gap: `calc(0.25rem * var(--text-scale))` }}
        className="flex flex-col max-h-[240px] overflow-y-auto custom-scrollbar pr-1"
      >
        {hasLocation ? (
          tags.sort((a: any, b: any) => b.weight - a.weight).slice(0, 8).map((tag: any) => (
            <button 
              key={tag.name} 
              onClick={() => toggleTag(tag.name)} 
              style={{ 
                paddingTop: `calc(0.35rem * var(--text-scale))`,
                paddingBottom: `calc(0.35rem * var(--text-scale))`,
                paddingLeft: `calc(0.125rem * var(--text-scale))`,
                paddingRight: `calc(0.125rem * var(--text-scale))`
              }}
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
        ) : (
          <div 
            style={{ 
              ...scaled(10), 
              padding: `calc(0.75rem * var(--text-scale))`,
              borderColor: 'var(--border-color)'
            }} 
            className="text-neutral-600 italic leading-tight uppercase border border-dashed text-center"
          >
            Please select a LoCAL to populate trending tags.
          </div>
        )}
      </div>
    </div>
  );
}