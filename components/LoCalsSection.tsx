"use client";
import { LocationBucketModal } from "./LocationBucketModal";

export function LoCalsSection({ 
  LoCALPopRef, 
  showPopularLoCALs, 
  setShowPopularLoCALs, 
  townInput, 
  setTownInput, 
  knownLoCALs, 
  handleAddTown, 
  activeTowns, 
  setActiveTowns, 
  scaled 
}: any) {

  // THE FIX: Bridges the Modal selection to your working Sidebar logic
  const handleModalSelection = (loc: string) => {
    if (typeof handleAddTown === 'function') {
      handleAddTown(loc); // Triggers the population of the tag
      setShowPopularLoCALs(false); // Closes the modal
    }
  };

  return (
    <div className="space-y-3 mb-8" ref={LoCALPopRef}>
      <div 
        className="flex items-center gap-2 cursor-pointer group w-fit" 
        onClick={() => setShowPopularLoCALs(true)}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_12px_var(--primary)] animate-pulse" />
        <span style={{ color: 'var(--primary)' }} className="font-bold opacity-50 group-hover:opacity-100 uppercase">
          L<span className="lowercase">o</span>CALs
        </span>
      </div>
      
      <div className="relative">
        <input 
          style={scaled(13)} 
          className="w-full bg-neutral-900 border border-neutral-700 p-2 outline-none focus:border-[var(--primary)] font-bold text-[var(--text-main)] uppercase" 
          placeholder="+ Add LoCAL" 
          value={townInput || ""} 
          onChange={e => setTownInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleAddTown(townInput)} 
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {(activeTowns || []).map((t: string) => (
          <span 
            key={t} 
            onClick={() => setActiveTowns?.(activeTowns.filter((item: string) => item !== t))} 
            style={{ 
              ...scaled(10), 
              borderColor: 'var(--primary)', 
              color: 'var(--text-main)', 
              backgroundColor: 'var(--bg-main)' 
            }} 
            className="border px-2 py-0.5 font-bold cursor-pointer hover:border-red-500 transition-all uppercase truncate"
          >
            {t.replace(/-/g, ' ')} ×
          </span>
        ))}
      </div>

      {/* MODAL: Integrated here but teleported to document.body */}
      <LocationBucketModal 
        isOpen={showPopularLoCALs}
        onClose={() => setShowPopularLoCALs(false)}
        savedLocations={knownLoCALs}
        activeTowns={activeTowns || []}
        onAddTown={handleModalSelection} 
      />
    </div>
  );
}