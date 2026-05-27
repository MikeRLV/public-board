"use client";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useMemo } from "react";

dayjs.extend(isSameOrBefore);

// Extract the event's calendar date in America/New_York local time.
// DICE (and most sources) store times with EDT/EST offsets; Supabase converts to UTC.
// e.g. "2026-07-13T20:30:00-04:00" → stored as "2026-07-14T00:30:00+00:00" in UTC.
// substring(0,10) would give July 14 (wrong). NYC local date gives July 13 (correct).
// en-CA locale returns dates in YYYY-MM-DD format natively.
const nycDateStr = (ts: string | null | undefined): string => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
};

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

  // Group events by day — multi-day events populate every day in their range.
  // Use America/New_York local date so events like 8:30 PM EDT (midnight UTC)
  // land on the correct calendar day, not the UTC-shifted next day.
  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach((event) => {
      const startStr = nycDateStr(event.event_start);
      const endStr = event.event_end ? nycDateStr(event.event_end) : startStr;
      if (!startStr) return;
      // Walk from start date to end date (for multi-day events).
      // Append T12:00:00 so dayjs treats these as local noon, not UTC midnight.
      // dayjs('YYYY-MM-DD') parses as UTC midnight, and .format() then renders
      // in local time — shifting dates like 2026-07-06T00:00:00Z to July 5 in EDT.
      // Using noon avoids that entirely: noon local is the same calendar day in any timezone.
      let current = dayjs(`${startStr}T12:00:00`);
      const end = dayjs(`${endStr}T12:00:00`);
      while (current.isSameOrBefore(end, 'day')) {
        const d = current.format("YYYY-MM-DD");
        if (!map[d]) map[d] = [];
        if (!map[d].find((e: any) => e.id === event.id || e.title === event.title)) {
          map[d].push(event);
        }
        current = current.add(1, 'day');
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

          // Separate single-day and multi-day events for visual distinction
          const multiDayEvents = events.filter((e: any) => !!e.event_end);
          const singleDayEvents = events.filter((e: any) => !e.event_end);

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
                {/* Multi-day events shown first with a distinct style */}
                {multiDayEvents.slice(0, 3).map((e: any) => (
                  <div 
                    key={`multi-${e.id}`} 
                    className="text-[9px] truncate border-l-2 pl-1 border-[var(--primary)] bg-[var(--primary)]/10 leading-tight uppercase font-bold text-[var(--primary)]/90 whitespace-nowrap"
                  >
                    {e.title || e.location_name}
                  </div>
                ))}
                {/* Single-day events */}
                {singleDayEvents.slice(0, Math.max(0, 5 - multiDayEvents.length)).map((e: any) => (
                  <div 
                    key={e.id} 
                    className="text-[9px] truncate border-l-2 pl-1 border-[var(--primary)]/60 leading-tight uppercase font-bold text-[var(--text-main)]/90 whitespace-nowrap"
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
