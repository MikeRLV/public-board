"use client";
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { MonthYearPicker } from "./MonthYearPicker";
import { BrandLogo } from "./BrandLogo";
import { ThemeLab } from "./ThemeLab";

dayjs.extend(localeData);

export function CalendarHeader({ currentDate, setCurrentDate, activeTowns = [], onMenuClick, setActiveTowns, ...props }: any) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const { theme, setTheme, scaled } = useSidebarLogic({ ...props, activeTowns, setActiveTowns });

  const [customColors, setCustomColors] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("local-bull-custom-theme");
      return saved ? JSON.parse(saved) : { bg: "#000000", primary: "#eab308", border: "#262626", text: "#ffffff", muted: "#737373" };
    }
    return { bg: "#000000", primary: "#eab308", border: "#262626", text: "#ffffff", muted: "#737373" };
  });

  useEffect(() => {
    localStorage.setItem("local-bull-custom-theme", JSON.stringify(customColors));
  }, [customColors]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'custom') {
      root.style.setProperty('--bg-main', customColors.bg);
      root.style.setProperty('--primary', customColors.primary);
      root.style.setProperty('--border-color', customColors.border);
      root.style.setProperty('--text-main', customColors.text);
      root.style.setProperty('--text-muted', customColors.muted);
    } else {
      ['--bg-main', '--primary', '--border-color', '--text-main', '--text-muted'].forEach(p => root.style.removeProperty(p));
    }
  }, [customColors, theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setIsPickerOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleColorChange = (key: string, hex: string) => {
    setCustomColors((prev: any) => ({ ...prev, [key]: hex }));
    if (theme !== 'custom') setTheme('custom');
  };

  return (
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-[var(--bg-main)] sticky top-0 z-50 min-h-[130px]">
      
      {/* LEFT: Menu / Logo */}
      <div className="flex flex-col items-start justify-center h-full relative pl-2">
        <button 
          onClick={onMenuClick}
          className="md:hidden absolute font-black tracking-tighter leading-none text-[var(--primary)] whitespace-nowrap pt-1 outline-none text-left"
          style={{ fontSize: '22px', left: '-20px', top: '-8px' }}
        >
          B L<span className="lowercase">o</span>CAL
        </button>

        <div className="flex h-full items-center">
          <button 
            onClick={onMenuClick} 
            className="md:hidden flex items-center justify-center w-[46px] h-[46px] shrink-0 aspect-square rounded-full border border-[var(--primary)]/50 text-[var(--primary)] transition-all hover:scale-105 active:scale-95 hover:bg-[var(--primary)]/10 p-0 -ml-4"
          >
            <BrandLogo className="w-7 h-7 shrink-0" />
          </button>
        </div>
        
        <div className="hidden md:flex">
          <ThemeLab
            customColors={customColors}
            onColorChange={handleColorChange}
            onApplyPreset={setCustomColors}
            theme={theme}
            setTheme={setTheme}
          />
        </div>
      </div>

      {/* CENTER: Date picker */}
      <div className="flex items-center justify-center gap-6 relative z-20">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&lt;</button>
        
        <div className="relative flex flex-col items-center text-center" ref={pickerRef}>
          <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)} 
            style={{ color: 'var(--primary)' }} 
            className="group text-3xl font-black uppercase tracking-tighter leading-none whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            {currentDate.format("MMM YYYY")}
          </button>
          
          <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
            {activeTowns.map((town: string) => (
              <span 
                key={town} 
                onClick={() => setActiveTowns?.(activeTowns.filter((t: string) => t !== town))}
                style={{ 
                  ...(scaled ? scaled(11.5) : { fontSize: '11.5px' }), 
                  borderColor: 'var(--primary)', 
                  color: 'var(--primary)' 
                }} 
                className="px-2 py-0.5 border font-bold uppercase cursor-pointer hover:bg-[var(--primary)] hover:text-[var(--bg-main)] transition-all truncate max-w-[130px]"
              >
                {town.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
          
          {isPickerOpen && (
            <MonthYearPicker 
              currentDate={currentDate}
              onSelect={(newDate) => { setCurrentDate(newDate); setIsPickerOpen(false); }}
              onClose={() => setIsPickerOpen(false)}
            />
          )}
        </div>

        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&gt;</button>
      </div>

      {/* RIGHT */}
      <div className="flex justify-end pr-2 h-full items-center">
        <div className="text-[8px] text-neutral-800 font-black uppercase tracking-widest vertical-rl rotate-180 hidden md:block">LoCAL Bull</div>
        <div className="flex md:hidden">
          <ThemeLab
            customColors={customColors}
            onColorChange={handleColorChange}
            onApplyPreset={setCustomColors}
            theme={theme}
            setTheme={setTheme}
            isMobile
          />
        </div>
      </div>
    </div>
  );
}
