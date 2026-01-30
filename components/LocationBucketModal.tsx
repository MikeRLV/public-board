"use client";

export function LocationBucketModal({ isOpen, onClose, savedLocations, activeTowns, onAddTown }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-lg border border-yellow-600/30 rounded-2xl p-8 flex flex-col relative shadow-2xl" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-8">
          {/* FIXED: Removed 'uppercase' class to allow the specific LoCALs casing to render */}
          <h2 className="text-2xl font-black text-yellow-500 tracking-tighter leading-none">
            LoCALs
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors text-xl font-mono">CLOSE [X]</button>
        </div>

        {/* UPDATED: Consistent branding in instructions */}
        <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-6 leading-relaxed">
          Select a <strong className="text-yellow-500/80">LoCAL</strong> to add it to your active filters.
        </p>

        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          {savedLocations.length > 0 ? (
            savedLocations
              .filter((loc: string) => !activeTowns.includes(loc))
              .map((loc: string) => (
                <button
                  key={loc}
                  onClick={() => onAddTown(loc)}
                  className="group flex justify-between items-center p-4 bg-black/40 border border-white/[0.03] hover:border-yellow-600/50 hover:bg-yellow-600/5 rounded-xl transition-all"
                >
                  <span className="text-xs font-bold text-neutral-400 group-hover:text-white uppercase transition-colors">
                    {loc.replace(/-/g, ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    {/* FIXED: Consistent 'ADD' text casing */}
                    <span className="text-[10px] text-neutral-700 font-black group-hover:text-yellow-500 transition-colors">ADD +</span>
                  </div>
                </button>
              ))
          ) : (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-xl">
               {/* UPDATED: Consistent branding in empty state */}
               <span className="text-[10px] text-neutral-700 uppercase italic tracking-[0.3em]">No LoCALs found in database</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}