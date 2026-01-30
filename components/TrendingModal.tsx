"use client";

export function TrendingModal({ isOpen, onClose, weightedTags, activeTags, setActiveTags }: any) {
  if (!isOpen) return null;

  // Helper to ensure tags added from modal match the calendar's filter logic
  const slugify = (text: string) => 
    text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w-+]+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-2xl border border-yellow-600/50 rounded-xl p-8 flex flex-col max-h-[80vh] shadow-[0_0_50px_rgba(202,138,4,0.15)]" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-yellow-500 uppercase tracking-tighter leading-none">All Trending Tags</h2>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1 font-mono">Select a tag to filter the calendar</span>
          </div>
          <button onClick={onClose} className="text-2xl text-neutral-500 hover:text-white transition-colors">×</button>
        </div>

        <div className="overflow-y-auto flex flex-wrap gap-3 p-1 custom-scrollbar">
          {weightedTags.length === 0 ? (
            <div className="w-full py-10 text-center text-neutral-600 uppercase text-[10px] font-bold tracking-widest animate-pulse">
              No trending data projected yet...
            </div>
          ) : (
            weightedTags.map((tag: any) => {
              const tagSlug = slugify(tag.name); // Normalize the tag
              const isActive = activeTags.includes(tagSlug);

              return (
                <button 
                  key={tag.name} 
                  onClick={() => { 
                    if (!isActive) {
                      setActiveTags([...activeTags, tagSlug]); 
                    }
                    onClose(); 
                  }} 
                  className={`bg-black border px-4 py-2 rounded transition-all flex items-center gap-4 group ${
                    isActive ? 'border-yellow-500 opacity-50 cursor-default' : 'border-neutral-800 hover:border-yellow-500 active:scale-95'
                  }`}
                >
                  <span className={`text-[12px] font-bold uppercase transition-colors ${isActive ? 'text-yellow-500' : 'text-neutral-400 group-hover:text-white'}`}>
                    #{tag.name}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-600 group-hover:text-yellow-500 transition-colors">
                    +{tag.weight}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}