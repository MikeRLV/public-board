"use client";
import dayjs from "dayjs";
import { useMemo } from "react";

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

  // Group events by day string for efficient lookup
  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach((event) => {
      const d = dayjs(event.event_start).format("YYYY-MM-DD");
      if (!map[d]) map[d] = [];
      map[d].push(event);
    });
    return map;
  }, [filteredEvents]);

  return (
    <div className="flex-1 overflow-y-auto p-4 font-mono">
      <div className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${!city ? "opacity-0" : "opacity-100"}`}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="text-[10px] text-neutral-600 font-bold text-center py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
        
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`off-${i}`} className="min-h-[80px] md:min-h-[120px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dateStr = currentDate.date(i + 1).format("YYYY-MM-DD");
          const isToday = dateStr === todayStr;
          const events = eventsByDay[dateStr] || [];

          return (
            <div
              key={dateStr}
              onClick={() => { if (city) setActiveDay(dateStr); }}
              className={`border p-1 min-h-[80px] md:min-h-[120px] cursor-pointer hover:bg-neutral-800/50 transition relative flex flex-col
                ${activeDay === dateStr ? "bg-yellow-900/30 border-yellow-500 z-10" : "border-neutral-800"}
                ${isToday && activeDay !== dateStr ? "bg-yellow-500/5 border-yellow-500/30" : ""}
              `}
            >
              {/* Day Header */}
              <div className={`text-xs font-bold ${isToday ? "text-yellow-500" : "text-neutral-500"}`}>
                {i + 1}
                {isToday && <span className="ml-1 text-[8px] uppercase tracking-tighter opacity-70">Today</span>}
              </div>

              {/* DESKTOP VIEW: Max 5 events + ellipses */}
              <div className="hidden md:flex flex-col gap-1 mt-1 overflow-hidden">
                {events.slice(0, 5).map((e) => (
                  <div 
                    key={e.id} 
                    className="text-[9px] truncate border-l-2 pl-1 border-white/40 leading-tight uppercase font-bold text-white/90 whitespace-nowrap"
                  >
                    {e.title || e.location_name}
                  </div>
                ))}
                {events.length > 5 && (
                  <div className="text-[8px] font-black text-neutral-500 uppercase mt-0.5 pl-1">
                    + {events.length - 5} MORE
                  </div>
                )}
              </div>

              {/* MOBILE VIEW: Numeric Counter */}
              <div className="md:hidden flex-1 flex items-center justify-center">
                {events.length > 0 && (
                  <div className="bg-yellow-600 text-black w-5 h-5 rounded-full flex items-center justify-center">
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