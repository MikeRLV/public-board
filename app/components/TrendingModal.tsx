"use client";

// Ensure this uses 'export function' to match the import in CalendarLogic
export function TrendingModal({ isOpen, onClose, weightedTags, activeTags, setActiveTags }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-2xl border border-yellow-600/50 rounded-xl p-8 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <h2 className="text-2xl font-bold text-yellow-500 uppercase tracking-tighter">All Trending Tags</h2>
          <button onClick={onClose} className="text-2xl text-neutral-500 hover:text-white transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex flex-wrap gap-3 p-1 custom-scrollbar">
          {weightedTags.map((tag: any) => (
            <button 
              key={tag.name} 
              onClick={() => { 
                if (!activeTags.includes(tag.name)) setActiveTags([...activeTags, tag.name]); 
                onClose(); 
              }} 
              className="bg-black border border-neutral-800 px-4 py-2 rounded hover:border-yellow-500 transition-all flex items-center gap-4 group"
            >
              <span className="text-[12px] font-bold text-neutral-400 group-hover:text-white uppercase transition-colors">#{tag.name}</span>
              <span className="text-[10px] font-mono text-neutral-600 group-hover:text-yellow-500 transition-colors">+{tag.weight}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}