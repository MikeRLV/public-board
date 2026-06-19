"use client";
import dayjs from "dayjs";
import { useMemo } from "react";

// An event's day is just its stored date — NO timezone conversion. Scrapers capture
// event_date natively in the venue's own local time, which is exactly the day people
// expect when they browse a town. Legacy rows that predate event_date fall back to the
// date portion of the stored timestamp (a plain string slice — still no tz math).
const dayOf = (ts: string | null | undefined): string =>
  typeof ts === 'string' ? ts.slice(0, 10) : '';

interface GridProps {
  currentDate: dayjs.Dayjs;
  todayStr: string;
  activeDay: string | null;
  setActiveDay: (date: string) => void;
  filteredEvents: any[];
  city: string;
}

export function CalendarGrid({ currentDate, todayStr, activeDay, setActiveDay, filteredEvents, city }: GridProps) {
  const startOffset = currentDate.startOf("month").day();
  const daysInMonth = currentDate.daysInMonth();

  // Each event shows on its own day (event_date), full stop. We deliberately do NOT
  // span across event_end: almost every "range" in the data is just a show that ends
  // after midnight (e.g. ends 12:30 AM), which would otherwise duplicate onto the next
  // day. True multi-day handling can come back later if a real need shows up.
  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach((event) => {
      const d = event.event_date || dayOf(event.event_start);
      if (!d) return;
      if (!map[d]) map[d] = [];
      if (!map[d].find((e: any) => e.id === event.id || e.title === event.title)) {
        map[d].push(event);
      }
    });
    return map;
  }, [filteredEvents]);

  return (
    <div className="flex-1 overflow-y-auto p-4 font-mono bg-[var(--bg-main)] text-[var(--text-main)]">
      <div className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${!city ? "opacity-0" : "opacity-100"}`}>
        
        {/* Day Labels */}
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="text-[10px] text-[var(--text-muted)] font-bold text-center py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
        
        {/* Offset Spacers */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`off-${i}`} className="min-h-[80px] md:min-h-[120px]" />
        ))}

        {/* Calendar Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dateStr = currentDate.date(i + 1).format("YYYY-MM-DD");
          const isToday = dateStr === todayStr;
          const events = eventsByDay[dateStr] || [];

          return (
            <div
              key={dateStr}
              onClick={() => { if (city) setActiveDay(dateStr); }}
              className={`border p-1 min-h-[80px] md:min-h-[120px] cursor-pointer transition relative flex flex-col
                ${activeDay === dateStr 
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] z-10" 
                  : "border-[var(--border-color)] hover:bg-white/5"}
                ${isToday && activeDay !== dateStr ? "bg-[var(--primary)]/5 border-[var(--primary)]/30" : ""}
              `}
            >
              {/* Day Header */}
              <div className={`text-xs font-bold ${isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
                {i + 1}
                {isToday && <span className="ml-1 text-[8px] uppercase tracking-tighter opacity-70">Today</span>}
              </div>

              {/* DESKTOP VIEW */}
              <div className="hidden md:flex flex-col gap-1 mt-1 overflow-hidden">
                {/* Gold highlight is RESERVED for promoted events (e.promoted) — that
                    flag isn't wired up yet, so today everything renders in the plain
                    style. When promotion lands, promoted events light up gold. */}
                {events.slice(0, 5).map((e: any) => (
                  <div
                    key={e.id}
                    className={`text-[9px] truncate border-l-2 pl-1 leading-tight uppercase font-bold whitespace-nowrap ${
                      e.promoted
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]/90'
                        : 'border-[var(--primary)]/60 text-[var(--text-main)]/90'
                    }`}
                  >
                    {e.title || e.location_name}
                  </div>
                ))}
                {events.length > 5 && (
                  <div className="text-[8px] font-black text-[var(--text-muted)] uppercase mt-0.5 pl-1">
                    + {events.length - 5} MORE
                  </div>
                )}
              </div>

              {/* MOBILE VIEW: Numeric Counter */}
              <div className="md:hidden flex-1 flex items-center justify-center">
                {events.length > 0 && (
                  <div className="bg-[var(--primary)] text-[var(--bg-main)] w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-black leading-none">
                      {events.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
