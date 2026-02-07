"use client";
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useSidebarLogic } from "../hooks/useSidebarLogic";

dayjs.extend(localeData);

// 1. EXTRACTED THEME LAB FOR STABILITY
function ThemeLab({ customColors, onColorChange, onApplyPreset, theme, setTheme, isMobile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`flex flex-col gap-1.5 relative ${isMobile ? 'items-end' : ''}`} ref={containerRef}>
      <button onClick={(e) => { e.stopPropagation(); setTheme('default'); }} className={`w-3.5 h-3.5 bg-yellow-500 border-2 ${theme === 'default' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onClick={(e) => { e.stopPropagation(); setTheme('cyberpunk'); }} className={`w-3.5 h-3.5 bg-pink-500 border-2 ${theme === 'cyberpunk' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onClick={(e) => { e.stopPropagation(); setTheme('minimalist'); }} className={`w-3.5 h-3.5 bg-neutral-500 border-2 ${theme === 'minimalist' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-3.5 h-3.5 bg-neutral-800 border-2 flex items-center justify-center text-[8px] font-black ${isOpen ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`}
      >
        ?
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()} // 2. PREVENT INTERNAL CLICKS FROM CLOSING
          className={`absolute ${isMobile ? 'right-0' : 'left-full'} top-0 ${isMobile ? 'mt-8' : 'ml-3'} flex flex-col gap-3 bg-neutral-900 border border-white/10 p-3 rounded-sm shadow-2xl z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-200`}
        >
          <span className="text-[7px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-1">Theme Lab</span>
          <div className="space-y-2">
            {[{ label: 'BG', key: 'bg' }, { label: 'PRI', key: 'primary' }, { label: 'BRD', key: 'border' }, { label: 'TXT', key: 'text' }, { label: 'ACC', key: 'muted' }].map((slot) => (
              <div key={slot.key} className="flex items-center gap-2 group">
                <span className="w-6 text-[8px] text-neutral-500 font-bold uppercase">{slot.label}</span>
                <input 
                  type="text" 
                  maxLength={7} 
                  value={customColors[slot.key]} 
                  onChange={(e) => onColorChange(slot.key, e.target.value)} 
                  className="flex-1 min-w-0 bg-black border border-white/10 text-[10px] px-1.5 py-0.5 font-mono uppercase text-white outline-none focus:border-[var(--primary)] transition-colors" 
                />
                <div className="relative w-4 h-4 shrink-0 overflow-hidden border border-white/20">
                  <input 
                    type="color" 
                    value={customColors[slot.key]} 
                    onChange={(e) => onColorChange(slot.key, e.target.value)} 
                    className="absolute inset-0 w-8 h-8 -top-1 -left-1 opacity-0 cursor-pointer z-10" 
                  />
                  <div style={{ backgroundColor: customColors[slot.key] }} className="w-full h-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/5 flex gap-2 justify-between px-1">
             <button onClick={() => onApplyPreset({bg:'#050505', primary:'#00ff88', border:'#113322', text:'#ffffff', muted:'#446655'})} className="w-3 h-3 bg-[#00ff88] rounded-full hover:scale-125 transition-transform" />
             <button onClick={() => onApplyPreset({bg:'#000000', primary:'#3b82f6', border:'#1e3a8a', text:'#ffffff', muted:'#60a5fa'})} className="w-3 h-3 bg-[#3b82f6] rounded-full hover:scale-125 transition-transform" />
             <button onClick={() => onApplyPreset({bg:'#0c0014', primary:'#a855f7', border:'#3b0764', text:'#f5f3ff', muted:'#8b5cf6'})} className="w-3 h-3 bg-[#a855f7] rounded-full hover:scale-125 transition-transform" />
             <button onClick={() => onApplyPreset({bg:'#1a1c1e', primary:'#f97316', border:'#452b1f', text:'#ffffff', muted:'#94a3b8'})} className="w-3 h-3 bg-[#f97316] rounded-full hover:scale-125 transition-transform" />
          </div>
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'custom') {
      root.style.setProperty('--bg-main', customColors.bg);
      root.style.setProperty('--primary', customColors.primary);
      root.style.setProperty('--border-color', customColors.border);
      root.style.setProperty('--text-main', customColors.text);
      root.style.setProperty('--text-muted', customColors.muted);
    } else {
      ['--bg-main', '--primary', '--border-color', '--text-main', '--text-muted'].forEach(prop => root.style.removeProperty(prop));
    }
  }, [customColors, theme]);

  // Consolidated click-outside for the Month Picker
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

  const applyPreset = (palette: any) => {
    setCustomColors(palette);
    if (theme !== 'custom') setTheme('custom');
  };

  return (
    <div className="grid grid-cols-3 items-center p-6 border-b border-white/10 bg-black sticky top-0 z-50">
      <div className="flex items-center gap-4 justify-start">
        <button onClick={onMenuClick} className="md:hidden text-yellow-500 font-bold text-[10px] border border-yellow-500/50 px-2 py-1 uppercase">Menu</button>
        <div className="hidden md:flex">
          <ThemeLab customColors={customColors} onColorChange={handleColorChange} onApplyPreset={applyPreset} theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 relative z-20">
        <button onClick={() => setCurrentDate(currentDate.subtract(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&lt;</button>
        <div className="relative flex flex-col items-center text-center" ref={pickerRef}>
            <button onClick={() => setIsPickerOpen(!isPickerOpen)} style={{ color: 'var(--primary)' }} className="group text-3xl font-black uppercase tracking-tighter leading-none whitespace-nowrap hover:opacity-80 transition-opacity">
              {currentDate.format("MMM YYYY")}
            </button>
            {/* ... rest of your town mapping ... */}
        </div>
        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))} className="text-2xl text-neutral-500 hover:text-[var(--primary)] transition-colors font-light">&gt;</button>
      </div>

      <div className="flex justify-end pr-2">
        <div className="text-[8px] text-neutral-800 font-black uppercase tracking-widest vertical-rl rotate-180 hidden md:block">LoCAL Bull</div>
        <div className="flex md:hidden">
          <ThemeLab customColors={customColors} onColorChange={handleColorChange} onApplyPreset={applyPreset} theme={theme} setTheme={setTheme} isMobile />
        </div>
      </div>
    </div>
  );
}