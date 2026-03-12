"use client";

export function TutorialOverlay() {
  return (
    <div className="flex-1 relative bg-neutral-900/20 font-mono">

      {/* LoCAL callout — aligns with LoCALs label in sidebar */}
      <div className="absolute hidden md:flex items-start" style={{ top: '-14px', left: '2rem', zIndex: 50 }}>
        <div style={{ borderRightColor: 'var(--primary)', marginTop: '0.9rem' }}
          className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[20px] shrink-0 opacity-70" />
        <div style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--bg-main)' }}
          className="border rounded-sm px-8 py-6 max-w-xl opacity-70 hover:opacity-100 transition-opacity">
          <p style={{ color: 'var(--primary)', fontSize: 'calc(16px * var(--text-scale, 1))' }}
            className="font-black uppercase tracking-tighter leading-relaxed">
            Pick a LoCAL to populate a calendar. If you know of one you can enter it directly, or click on{' '}
            <span className="underline">LoCALs</span> to see what's available. A LoCAL won't populate on the LoCAL list until an event is posted to it first.
          </p>
        </div>
      </div>

      {/* Tags callout — aligns with FILTERS label in sidebar */}
      <div className="absolute hidden md:flex items-start" style={{ top: '228px', left: '2rem', zIndex: 50 }}>
        <div style={{ borderRightColor: 'var(--primary)', marginTop: '0.9rem' }}
          className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[20px] shrink-0 opacity-70" />
        <div style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--bg-main)' }}
          className="border rounded-sm px-8 py-6 max-w-xl opacity-70 hover:opacity-100 transition-opacity">
          <p style={{ color: 'var(--primary)', fontSize: 'calc(16px * var(--text-scale, 1))' }}
            className="font-black uppercase tracking-tighter leading-relaxed">
            Sort available events in each LoCAL using tags. If you don't know what you're looking for, click{' '}
            <span className="underline">Show All</span> to see everything that's going on.
          </p>
        </div>
      </div>

      {/* Mobile — stacked cards with arrow pointing to beehive */}
      <div className="flex md:hidden flex-col gap-6 p-6 pt-8">

        {/* LoCAL card with arrow pointing up-left to beehive */}
        <div className="relative">
          {/* Arrow pointing up-left */}
          <div className="absolute -top-6 left-4 flex flex-col items-center">
            <div style={{ borderBottomColor: 'var(--primary)' }}
              className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] opacity-70" />
            <div style={{ backgroundColor: 'var(--primary)' }} className="w-0.5 h-4 opacity-70" />
          </div>
          <div style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--bg-main)' }}
            className="border rounded-sm px-6 py-5 opacity-80">
            <p style={{ color: 'var(--primary)', fontSize: 'calc(14px * var(--text-scale, 1))' }}
              className="font-black uppercase tracking-tighter leading-relaxed">
              Click on the Bee-Hive above to open the sidebar. You can sort LoCAL calendars by either clicking or filling in an area. A LoCAL can be entered, but will not populate events until something is posted.
            </p>
          </div>
        </div>

        {/* Tags card */}
        <div style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--bg-main)' }}
          className="border rounded-sm px-6 py-5 opacity-80">
          <p style={{ color: 'var(--primary)', fontSize: 'calc(14px * var(--text-scale, 1))' }}
            className="font-black uppercase tracking-tighter leading-relaxed">
            Sort events by using the tags and toggles in the sidebar. If you don't know what you're looking for, check{' '}
            <span className="underline">Show All</span>. Feel free to add any tags to events you see fit.
          </p>
        </div>

      </div>

    </div>
  );
}
