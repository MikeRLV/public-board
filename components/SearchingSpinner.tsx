"use client";

/**
 * Small theme-colored spinner shown while the month in view is still being
 * scraped (events may keep populating). Renders nothing when not active.
 */
export function SearchingSpinner({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="flex items-center gap-2 mt-2 font-mono select-none"
      title="Still searching — more events may appear"
      aria-live="polite"
    >
      <span
        className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
        style={{
          border: "2px solid var(--border-color, rgba(255,255,255,0.15))",
          borderTopColor: "var(--primary)",
        }}
      />
      <span
        style={{ color: "var(--primary)" }}
        className="text-[10px] font-black uppercase tracking-[0.15em] opacity-75"
      >
        Searching…
      </span>
    </div>
  );
}
