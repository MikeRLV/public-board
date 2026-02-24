"use client";
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useSidebarLogic } from "../hooks/useSidebarLogic";
import { MonthYearPicker } from "./MonthYearPicker";

dayjs.extend(localeData);

// 1. THEME LAB (Preserved exactly as original)
function ThemeLab({ customColors, onColorChange, onApplyPreset, theme, setTheme, isMobile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`flex flex-col gap-1.5 relative ${isMobile ? 'items-end' : ''}`} ref={containerRef}>
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setTheme('default')} className={`w-3.5 h-3.5 bg-yellow-500 border-2 ${theme === 'default' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setTheme('cyberpunk')} className={`w-3.5 h-3.5 bg-pink-500 border-2 ${theme === 'cyberpunk' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setTheme('minimalist')} className={`w-3.5 h-3.5 bg-neutral-500 border-2 ${theme === 'minimalist' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setTheme('custom')} style={{ backgroundColor: customColors.primary }} className={`w-3.5 h-3.5 border-2 ${theme === 'custom' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsOpen(!isOpen)} className={`w-3.5 h-3.5 bg-neutral-800 border-2 flex items-center justify-center text-[8px] font-black ${isOpen ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all text-white`}>?</button>

      {isOpen && (
        <div onMouseDown={(e) => e.stopPropagation()} className={`absolute ${isMobile ? 'right-0' : 'left-full'} top-0 ${isMobile ? 'mt-8' : 'ml-3'} flex flex-col gap-3 bg-neutral-900 border border-white/10 p-3 rounded-sm shadow-2xl z-50 min-w-[165px] animate-in fade-in duration-200`}>
          <span className="text-[7px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-1">Theme Lab</span>
          <div className="space-y-2">
            {[{ label: 'BG', key: 'bg' }, { label: 'PRI', key: 'primary' }, { label: 'BRD', key: 'border' }, { label: 'TXT', key: 'text' }, { label: 'ACC', key: 'muted' }].map((slot) => (
              <div key={slot.key} className="flex items-center gap-2">
                <span className="w-6 text-[8px] text-neutral-500 font-bold uppercase">{slot.label}</span>
                <input type="text" maxLength={7} value={customColors[slot.key] || ""} onChange={(e) => onColorChange(slot.key, e.target.value)} className="flex-1 min-w-0 bg-black border border-white/10 text-[10px] px-1.5 py-0.5 font-mono text-white outline-none" />
                <div className="relative w-4 h-4 border border-white/20 overflow-hidden cursor-pointer">
                  <input type="color" value={customColors[slot.key]} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => onColorChange(slot.key, e.target.value)} className="absolute -inset-4 w-[300%] h-[300%] opacity-0 cursor-pointer z-50 block" />
                  <div style={{ backgroundColor: customColors[slot.key] }} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/5 flex gap-2 justify-between px-1">
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#050505', primary:'#00ff88', border:'#113322', text:'#ffffff', muted:'#446655'}); }} className="w-3.5 h-3.5 bg-[#00ff88] rounded-full hover:scale-125 transition-transform border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#000000', primary:'#3b82f6', border:'#1e3a8a', text:'#ffffff', muted:'#60a5fa'}); }} className="w-3.5 h-3.5 bg-[#3b82f6] rounded-full hover:scale-125 transition-transform border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#0c0014', primary:'#a855f7', border:'#3b0764', text:'#f5f3ff', muted:'#8b5cf6'}); }} className="w-3.5 h-3.5 bg-[#a855f7] rounded-full hover:scale-125 transition-transform border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#1a1c1e', primary:'#f97316', border:'#452b1f', text:'#ffffff', muted:'#94a3b8'}); }} className="w-3.5 h-3.5 bg-[#f97316] rounded-full hover:scale-125 transition-transform border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}

// 2. MAIN HEADER
export function CalendarHeader({ currentDate, setCurrentDate, activeTowns = [], onMenuClick, setActiveTowns, ...props }: any) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useSidebarLogic({ ...props, setActiveTowns });

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

  // Root theme sync (Preserved)
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

  // Click outside picker (Updated)
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
    // FIX: Background is now consistent with theme
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-[var(--bg-main)] sticky top-0 z-50">
      <div className="flex items-center gap-4 justify-start">
        <button onClick={onMenuClick} className="md:hidden text-[var(--primary)] font-bold text-[10px] border border-[var(--primary)]/50 px-2 py-1 uppercase">Menu</button>
        <div className="hidden md:flex">
          <ThemeLab customColors={customColors} onColorChange={handleColorChange} onApplyPreset={setCustomColors} theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 relative z-20">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&lt;</button>
        
        {/* MONTH/YEAR PICKER INTEGRATION */}
        <div className="relative flex flex-col items-center text-center" ref={pickerRef}>
          <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)} 
            style={{ color: 'var(--primary)' }} 
            className="group text-3xl font-black uppercase tracking-tighter leading-none whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            {currentDate.format("MMM YYYY")}
          </button>
          
          {isPickerOpen && (
            <MonthYearPicker 
              currentDate={currentDate}
              onSelect={(newDate) => {
                setCurrentDate(newDate);
                setIsPickerOpen(false);
              }}
              onClose={() => setIsPickerOpen(false)}
            />
          )}
        </div>

        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&gt;</button>
      </div>

      <div className="flex justify-end pr-2">
        <div className="text-[8px] text-neutral-800 font-black uppercase tracking-widest vertical-rl rotate-180 hidden md:block">LoCAL Bull</div>
        <div className="flex md:hidden">
          <ThemeLab customColors={customColors} onColorChange={handleColorChange} onApplyPreset={setCustomColors} theme={theme} setTheme={setTheme} isMobile />
        </div>
      </div>
    </div>
  );
}