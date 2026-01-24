"use client";
import dayjs from "dayjs";

export function CalendarHeader({ currentDate, setCurrentDate, city, onMenuClick }: any) {
  return (
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-black sticky top-0 z-40">
      <div className="flex justify-start">
        <button 
          onClick={onMenuClick} 
          className="md:hidden text-yellow-500 font-bold text-[10px] border border-yellow-500/50 px-2 py-1 uppercase transition-colors"
        >
          Menu
        </button>
      </div>

      <div className="flex items-center justify-center gap-8">
        {city && (
          <button 
            onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} 
            className="text-xl text-neutral-500 hover:text-white transition-colors"
          >
            &lt;
          </button>
        )}
        <div className="flex flex-col items-center text-center">
          <div className="text-3xl font-bold text-yellow-500 uppercase tracking-tighter leading-none whitespace-nowrap">
            {currentDate.format("MMM YYYY")}
          </div>
          {city && (
            <div className="text-[10px] text-neutral-500 uppercase mt-1 tracking-widest whitespace-nowrap">
              {city.replace(/-/g, " ")}
            </div>
          )}
        </div>
        {city && (
          <button 
            onClick={() => setCurrentDate(currentDate.add(1, "month"))} 
            className="text-xl text-neutral-500 hover:text-white transition-colors"
          >
            &gt;
          </button>
        )}
      </div>

      <div className="flex justify-end">
        {/* Export button removed from here */}
      </div>
    </div>
  );
}