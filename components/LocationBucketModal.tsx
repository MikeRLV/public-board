"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export function LocationBucketModal({ isOpen, onClose, savedLocations, activeTowns, onAddTown }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--primary)' }}
        className="w-full max-w-lg border-2 rounded-2xl p-8 flex flex-col relative shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 style={{ color: 'var(--primary)' }} className="text-2xl font-black tracking-tighter leading-none">
            L<span className="lowercase">o</span>CALs
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors text-xl font-mono">CLOSE [X]</button>
        </div>

        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          {savedLocations && savedLocations.length > 0 ? (
            savedLocations
              .filter((loc: string) => !activeTowns.includes(loc.toLowerCase().trim().replace(/[\s_]+/g, "-")))
              .map((loc: string) => (
                <button
                  key={loc}
                  onClick={() => onAddTown(loc)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-color)' }}
                  className="group flex justify-between items-center p-4 border hover:border-[var(--primary)]/50 rounded-xl transition-all"
                >
                  <span style={{ color: 'var(--text-main)' }} className="text-xs font-bold uppercase transition-colors">
                    {loc.replace(/-/g, ' ')}
                  </span>
                  <span style={{ color: 'var(--primary)' }} className="text-[10px] font-black group-hover:opacity-100 opacity-40">ADD +</span>
                </button>
              ))
          ) : (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-xl text-neutral-700 uppercase italic text-[10px]">No LoCALs found</div>
          )}
        </div>
      </div>
    </div>,
    document.body // Teleports the modal to sit on top of the site
  );
}