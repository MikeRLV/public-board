"use client";
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

dayjs.extend(localeData);

export function CalendarHeader({ currentDate, setCurrentDate, activeTowns = [], onMenuClick, setActiveTowns }: any) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const months = dayjs.months(); 
  const currentYear = currentDate.year();
  const years = Array.from({ length: 5 }, (_, i: number) => currentYear - 2 + i);

  return (
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-black sticky top-0 z-50">
      {/* 1. LEFT: Mobile Menu */}
      <div className="flex justify-start">
        <button 
          onClick={onMenuClick} 
          className="md:hidden text-yellow-500 font-bold text-[10px] border border-yellow-500/50 px-2 py-1 uppercase transition-colors"
        >
          Menu
        </button>
      </div>

      {/* 2. CENTER: Navigation & Merged Towns List */}
      <div className="flex items-center justify-center gap-6">
        <button 
          onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} 
          className="text-2xl text-neutral-500 hover:text-yellow-500 transition-colors font-light"
        >
          &lt;
        </button>
        
        <div className="relative flex flex-col items-center text-center" ref={pickerRef}>
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="group text-3xl font-black text-yellow-500 uppercase tracking-tighter leading-none whitespace-nowrap hover:text-yellow-400 transition-colors"
            >
              {currentDate.format("MMM YYYY")}
            </button>
            
            {/* Merged Town Labels Section - Updated to White Text */}
            <div className="flex flex-wrap justify-center gap-x-2 h-3">
              {activeTowns.length > 0 ? (
                activeTowns.map((town: string, index: number) => (
                  <span key={town} className="text-[9px] text-white uppercase tracking-widest whitespace-nowrap font-bold">
                    {town.replace(/-/g, " ")}
                    {index < activeTowns.length - 1 && <span className="ml-2 text-neutral-700">•</span>}
                  </span>
                ))
              ) : (
                <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     if (setActiveTowns) setActiveTowns([]); 
                   }}
                   className="text-[9px] text-neutral-800 uppercase tracking-widest font-black hover:text-neutral-500 transition-colors"
                >
                  Global View
                </button>
              )}
            </div>
          </div>

          {/* Month/Year Dropdown Menu */}
          {isPickerOpen && (
            <div className="absolute top-full mt-4 w-64 bg-neutral-900 border border-yellow-600/50 rounded-lg shadow-2xl p-4 grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-150 z-[100]">
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <span className="text-[8px] text-neutral-500 font-black uppercase mb-2 tracking-widest text-center">Month</span>
                {months.map((m: string, i: number) => (
                  <button
                    key={m}
                    onClick={() => {
                      setCurrentDate(currentDate.month(i));
                      setIsPickerOpen(false);
                    }}
                    className={`text-[10px] uppercase font-bold py-1 px-2 rounded-sm text-left transition-colors ${currentDate.month() === i ? 'bg-yellow-600 text-black' : 'text-neutral-400 hover:bg-white/5'}`}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-neutral-500 font-black uppercase mb-2 tracking-widest text-center">Year</span>
                {years.map((y: number) => (
                  <button
                    key={y}
                    onClick={() => {
                      setCurrentDate(currentDate.year(y));
                      setIsPickerOpen(false);
                    }}
                    className={`text-[10px] font-black py-2 px-2 rounded-sm transition-colors ${currentYear === y ? 'bg-yellow-600 text-black' : 'text-neutral-400 hover:bg-white/5'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setCurrentDate(currentDate.add(1, "month"))} 
          className="text-2xl text-neutral-500 hover:text-yellow-500 transition-colors font-light"
        >
          &gt;
        </button>
      </div>

      {/* 3. RIGHT: Branding - Updated to LoCAL Bull and hidden on mobile */}
      <div className="flex justify-end pr-2">
        <div className="text-[8px] text-neutral-800 font-black uppercase tracking-widest vertical-rl rotate-180 hidden md:block">
          LoCAL Bull
        </div>
      </div>
    </div>
  );
}