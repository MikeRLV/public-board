"use client";
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useSidebarLogic } from "../hooks/useSidebarLogic";

dayjs.extend(localeData);

export function CalendarHeader({ currentDate, setCurrentDate, activeTowns = [], onMenuClick, setActiveTowns, ...props }: any) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showThemeLab, setShowThemeLab] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const themeLabRef = useRef<HTMLDivElement>(null);
  
  const { theme, setTheme } = useSidebarLogic({ ...props, setActiveTowns });

  // 1. Initial Custom Theme State (Hydrated from Cache)
  const [customColors, setCustomColors] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("local-bull-custom-theme");
      return saved ? JSON.parse(saved) : {
        bg: "#000000",
        primary: "#eab308",
        border: "#262626",
        text: "#ffffff",
        muted: "#737373"
      };
    }
    return { bg: "#000000", primary: "#eab308", border: "#262626", text: "#ffffff", muted: "#737373" };
  });

  // 2. Persist custom colors to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem("local-bull-custom-theme", JSON.stringify(customColors));
  }, [customColors]);

  // 3. Controlled Injection: Inject variables into the document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'custom') {
      root.style.setProperty('--bg-main', customColors.bg);
      root.style.setProperty('--primary', customColors.primary);
      root.style.setProperty('--border-color', customColors.border);
      root.style.setProperty('--text-main', customColors.text);
      root.style.setProperty('--text-muted', customColors.muted);
    } else {
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--border-color');
      root.style.removeProperty('--text-main');
      root.style.removeProperty('--text-muted');
    }
  }, [customColors, theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setIsPickerOpen(false);
      if (themeLabRef.current && !themeLabRef.current.contains(event.target as Node)) setShowThemeLab(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FIXED: Explicitly typed 'prev' to match customColors object
  const handleColorChange = (key: keyof typeof customColors, hex: string) => {
    setCustomColors((prev: typeof customColors) => ({ ...prev, [key]: hex }));
    if (theme !== 'custom') setTheme('custom');
  };

  const applyPreset = (palette: typeof customColors) => {
    setCustomColors(palette);
    if (theme !== 'custom') setTheme('custom');
  };

  const months = dayjs.months(); 
  const currentYear = currentDate.year();
  const years = Array.from({ length: 5 }, (_, i: number) => currentYear - 2 + i);

  return (
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-black sticky top-0 z-50">
      
      {/* 1. LEFT: Menu & Theme Lab Column */}
      <div className="flex items-center gap-4 justify-start">
        <button onClick={onMenuClick} className="md:hidden text-yellow-500 font-bold text-[10px] border border-yellow-500/50 px-2 py-1 uppercase transition-colors">Menu</button>

        <div className="flex flex-col gap-1.5 ml-1 relative" ref={themeLabRef}>
          <button onClick={() => setTheme('default')} className={`w-3.5 h-3.5 bg-yellow-500 border-2 ${theme === 'default' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
          <button onClick={() => setTheme('cyberpunk')} className={`w-3.5 h-3.5 bg-pink-500 border-2 ${theme === 'cyberpunk' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
          <button onClick={() => setTheme('minimalist')} className={`w-3.5 h-3.5 bg-neutral-500 border-2 ${theme === 'minimalist' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
          
          <button 
            onClick={() => setShowThemeLab(!showThemeLab)}
            className={`w-3.5 h-3.5 bg-neutral-800 border-2 flex items-center justify-center text-[8px] font-black ${theme === 'custom' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`}
          >
            ?
          </button>

          {showThemeLab && (
            <div className="absolute left-full top-0 ml-3 flex flex-col gap-3 bg-neutral-900 border border-white/10 p-3 rounded-sm shadow-2xl z-50 min-w-[160px] animate-in slide-in-from-left-2 duration-200">
              <span className="text-[7px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-1">Theme Lab</span>
              
              <div className="space-y-2">
                {[
                  { label: 'BG', key: 'bg' },
                  { label: 'PRI', key: 'primary' },
                  { label: 'BRD', key: 'border' },
                  { label: 'TXT', key: 'text' },
                  { label: 'ACC', key: 'muted' }
                ].map((slot) => (
                  <div key={slot.key} className="flex items-center gap-2 group">
                    <span className="w-6 text-[8px] text-neutral-500 font-bold uppercase">{slot.label}</span>
                    <input 
                      type="text" 
                      maxLength={7}
                      value={customColors[slot.key as keyof typeof customColors]}
                      onChange={(e) => handleColorChange(slot.key as keyof typeof customColors, e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-white/10 text-[10px] px-1.5 py-0.5 font-mono uppercase text-white outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <div className="relative w-4 h-4 shrink-0 overflow-hidden border border-white/20">
                      <input 
                        type="color" 
                        value={customColors[slot.key as keyof typeof customColors]}
                        onChange={(e) => handleColorChange(slot.key as keyof typeof customColors, e.target.value)}
                        className="absolute inset-0 w-8 h-8 -top-1 -left-1 opacity-0 cursor-pointer z-10"
                      />
                      <div style={{ backgroundColor: customColors[slot.key as keyof typeof customColors] }} className="w-full h-full" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="text-[6px] text-neutral-600 font-bold uppercase tracking-widest block mb-2 text-center">Presets</span>
                <div className="flex gap-2 justify-between px-1">
                   <button onClick={() => applyPreset({bg:'#050505', primary:'#00ff88', border:'#113322', text:'#ffffff', muted:'#446655'})} className="w-3 h-3 bg-[#00ff88] rounded-full hover:scale-125 transition-transform" />
                   <button onClick={() => applyPreset({bg:'#000000', primary:'#3b82f6', border:'#1e3a8a', text:'#ffffff', muted:'#60a5fa'})} className="w-3 h-3 bg-[#3b82f6] rounded-full hover:scale-125 transition-transform" />
                   <button onClick={() => applyPreset({bg:'#0c0014', primary:'#a855f7', border:'#3b0764', text:'#f5f3ff', muted:'#8b5cf6'})} className="w-3 h-3 bg-[#a855f7] rounded-full hover:scale-125 transition-transform" />
                   <button onClick={() => applyPreset({bg:'#1a1c1e', primary:'#f97316', border:'#452b1f', text:'#ffffff', muted:'#94a3b8'})} className="w-3 h-3 bg-[#f97316] rounded-full hover:scale-125 transition-transform" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER: Navigation */}
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&lt;</button>
        <div className="relative flex flex-col items-center text-center" ref={pickerRef}>
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setIsPickerOpen(!isPickerOpen)} style={{ color: 'var(--primary)' }} className="group text-3xl font-black uppercase tracking-tighter leading-none whitespace-nowrap hover:opacity-80 transition-opacity">
              {currentDate.format("MMM YYYY")}
            </button>
            <div className="flex flex-wrap justify-center gap-x-2 h-3">
              {activeTowns.length > 0 ? (
                activeTowns.map((town: string, index: number) => (
                  <span key={town} className="text-[9px] text-white uppercase tracking-widest whitespace-nowrap font-bold">
                    {town.replace(/-/g, " ")}
                    {index < activeTowns.length - 1 && <span className="ml-2 text-neutral-700">•</span>}
                  </span>
                ))
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setActiveTowns?.([]); }} className="text-[9px] text-neutral-800 uppercase tracking-widest font-black hover:text-neutral-500 transition-colors">Global View</button>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&gt;</button>
      </div>

      {/* 3. RIGHT: Branding */}
      <div className="flex justify-end pr-2">
        <div className="text-[8px] text-neutral-800 font-black uppercase tracking-widest vertical-rl rotate-180 hidden md:block">LoCAL Bull</div>
      </div>
    </div>
  );
}