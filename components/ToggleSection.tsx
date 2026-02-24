"use client";

// Reverted to showAllEvents and setShowAllEvents to match parent component state
export function ToggleSection({ 
  activeTags, 
  toggleTag, 
  scaled, 
  adjustScale,
  showAllEvents,     // <--- Using Events naming
  setShowAllEvents,  // <--- Using Events naming
  showSpam, 
  setShowSpam,
  showAllAges,
  setShowAllAges 
}: any) {
  return (
    <div className="flex flex-col border-t border-white/10 mt-auto shrink-0 bg-[var(--bg-main)]">
        
       {/* AGE RESTRICTIONS */}
       <div className="flex flex-wrap gap-x-4 gap-y-3 px-5 pt-4 pb-4">
          <button className="flex items-center gap-2 group" onClick={() => setShowAllAges?.(!showAllAges)}>
              <div 
                style={{ width: `calc(0.75rem * var(--text-scale))`, height: `calc(0.75rem * var(--text-scale))` }}
                className={`border shrink-0 transition-all ${showAllAges ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-700'}`} 
              />
              <span style={{ ...scaled(10), color: 'var(--text-main)' }} className="font-bold uppercase whitespace-nowrap">All ages</span>
          </button>
          
          {['18+', '21+'].map(age => (
            <button key={age} className="flex items-center gap-2 group" onClick={() => toggleTag(age)}>
              <div 
                style={{ width: `calc(0.75rem * var(--text-scale))`, height: `calc(0.75rem * var(--text-scale))` }}
                className={`border shrink-0 transition-all ${activeTags.includes(age.toLowerCase()) ? (age === '18+' ? 'bg-yellow-600' : 'bg-red-600') : 'border-neutral-700'}`} 
              />
              <span style={{ ...scaled(10), color: 'var(--text-main)' }} className="font-bold uppercase whitespace-nowrap">{age}</span>
            </button>
          ))}
       </div>
       
       {/* VISIBILITY & +/- CONTROLS */}
       <div className="flex items-end justify-between border-t border-white/10 pt-4 pb-5 px-5 gap-2">
         <div className="flex flex-col gap-3">
           
           <button className="flex items-center gap-3 group text-left" onClick={() => setShowAllEvents?.(!showAllEvents)}>
              {/* Box turns emerald green */}
              <div 
                style={{ width: `calc(1rem * var(--text-scale))`, height: `calc(1rem * var(--text-scale))` }}
                className={`border transition-all shrink-0 ${showAllEvents ? 'bg-emerald-600 border-emerald-600 shadow-lg' : 'border-neutral-700'}`} 
              />
              {/* Text remains primary orange */}
              <span style={{ ...scaled(11), color: showAllEvents ? 'var(--primary)' : 'var(--text-muted)' }} className="font-bold uppercase">Show all</span>
           </button>
           
           <button className="flex items-center gap-3 group text-left" onClick={() => setShowSpam?.(!showSpam)}>
              <div 
                style={{ width: `calc(1rem * var(--text-scale))`, height: `calc(1rem * var(--text-scale))` }}
                className={`border transition-all shrink-0 ${showSpam ? 'bg-red-600 border-red-600 shadow-lg' : 'border-neutral-700'}`} 
              />
              <span style={{ ...scaled(11), color: showSpam ? 'var(--primary)' : 'var(--text-muted)' }} className="font-bold uppercase">Show spam</span>
           </button>
         </div>

         <div className="flex gap-1.5 pb-1">
            <button 
              onClick={() => adjustScale(-0.1)} 
              style={{ backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
              className="w-5 h-5 flex items-center justify-center font-bold hover:opacity-80 active:scale-95 rounded-sm shadow-sm"
            > - </button>
            <button 
              onClick={() => adjustScale(0.1)} 
              style={{ backgroundColor: 'var(--primary)', color: 'var(--bg-main)' }}
              className="w-5 h-5 flex items-center justify-center font-bold hover:opacity-80 active:scale-95 rounded-sm shadow-sm"
            > + </button>
         </div>
       </div>
    </div>
  );
}