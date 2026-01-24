"use client";

import dayjs from "dayjs";

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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className={`grid grid-cols-7 gap-1 ${!city ? "opacity-0" : ""}`}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="text-[10px] text-neutral-600 font-bold text-center py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`off-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dateStr = currentDate.date(i + 1).format("YYYY-MM-DD");
          const isToday = dateStr === todayStr;
          const dayData = filteredEvents.filter((e) => dayjs(e.event_start).format("YYYY-MM-DD") === dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => { if (city) setActiveDay(dateStr); }}
              className={`border p-1 min-h-[120px] cursor-pointer hover:bg-neutral-800/50 transition relative
                ${activeDay === dateStr ? "bg-yellow-900/30 border-yellow-500 z-10" : "border-neutral-800"}
                ${isToday && activeDay !== dateStr ? "bg-yellow-500/5 border-yellow-500/30" : ""}
              `}
            >
              <div className={`text-xs font-bold ${isToday ? "text-yellow-500" : "text-neutral-500"}`}>
                {i + 1}
                {isToday && <span className="ml-1 text-[8px] uppercase tracking-tighter opacity-70">Today</span>}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {dayData.slice(0, 3).map((e) => (
                  <div key={e.id} className="md:text-[9px] md:truncate md:border-l-2 md:pl-1 md:border-white leading-tight uppercase font-medium">
                    {e.title || e.location_name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}