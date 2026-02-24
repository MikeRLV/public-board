"use client";
import { useState, useRef, useEffect } from "react";

export function ThemeLab({ customColors, onColorChange, onApplyPreset, theme, setTheme, isMobile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // CLICK-OUTSIDE: Only closes if the target is genuinely outside this container
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
      {/* Sidebar Theme Buttons */}
      <button onClick={() => setTheme('default')} className={`w-3.5 h-3.5 bg-yellow-500 border-2 ${theme === 'default' ? 'border-white' : 'border-transparent opacity-40'} transition-all`} />
      <button onClick={() => setTheme('cyberpunk')} className={`w-3.5 h-3.5 bg-pink-500 border-2 ${theme === 'cyberpunk' ? 'border-white' : 'border-transparent opacity-40'} transition-all`} />
      <button onClick={() => setTheme('minimalist')} className={`w-3.5 h-3.5 bg-neutral-500 border-2 ${theme === 'minimalist' ? 'border-white' : 'border-transparent opacity-40'} transition-all`} />
      <button 
        onClick={() => setTheme('custom')} 
        style={{ backgroundColor: customColors.primary }} 
        className={`w-3.5 h-3.5 border-2 ${theme === 'custom' ? 'border-white' : 'border-transparent opacity-40'} transition-all`} 
      />
      
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-3.5 h-3.5 bg-neutral-800 border-2 flex items-center justify-center text-[8px] font-black ${isOpen ? 'border-white' : 'border-transparent opacity-40'}`}
      >
        ?
      </button>

      {isOpen && (
        <div 
          onMouseDown={(e) => e.stopPropagation()} // BLOCKER: Prevents internal clicks from closing lab
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
          className={`absolute ${isMobile ? 'right-0' : 'left-full'} top-0 ${isMobile ? 'mt-8' : 'ml-3'} flex flex-col gap-3 border p-3 shadow-2xl z-[100] min-w-[175px] animate-in fade-in duration-200`}
        >
          <span className="text-[7px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mb-1">Theme Lab</span>
          
          <div className="space-y-2">
            {[{ label: 'BG', key: 'bg' }, { label: 'PRI', key: 'primary' }, { label: 'BRD', key: 'border' }, { label: 'TXT', key: 'text' }, { label: 'ACC', key: 'muted' }].map((slot) => (
              <div key={slot.key} className="flex items-center gap-2 group">
                <span className="w-6 text-[8px] text-[var(--text-muted)] font-bold uppercase">{slot.label}</span>
                <input 
                  type="text" 
                  maxLength={7} 
                  value={customColors[slot.key] || ""} // FIX: Prevents uncontrolled input error
                  onChange={(e) => onColorChange(slot.key, e.target.value)} 
                  className="flex-1 min-w-0 bg-black/40 border border-white/10 text-[10px] px-1.5 py-0.5 font-mono uppercase text-[var(--text-main)] outline-none" 
                />
                
                {/* SYSTEM COLOR PICKER SWATCH */}
                <div className="relative w-4 h-4 shrink-0 overflow-hidden border border-white/20">
                  <input 
                    type="color" 
                    value={customColors[slot.key] || "#000000"} 
                    onMouseDown={(e) => e.stopPropagation()} // BLOCKER: Native picker click won't close window
                    onChange={(e) => onColorChange(slot.key, e.target.value)} 
                    className="absolute inset-0 w-8 h-8 -top-1 -left-1 opacity-0 cursor-pointer z-10" 
                  />
                  <div style={{ backgroundColor: customColors[slot.key] }} className="w-full h-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 flex gap-2 justify-between px-1">
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#050505', primary:'#00ff88', border:'#113322', text:'#ffffff', muted:'#446655'}); }} className="w-3.5 h-3.5 bg-[#00ff88] rounded-full hover:scale-125 border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#000000', primary:'#3b82f6', border:'#1e3a8a', text:'#ffffff', muted:'#60a5fa'}); }} className="w-3.5 h-3.5 bg-[#3b82f6] rounded-full hover:scale-125 border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#0c0014', primary:'#a855f7', border:'#3b0764', text:'#f5f3ff', muted:'#8b5cf6'}); }} className="w-3.5 h-3.5 bg-[#a855f7] rounded-full hover:scale-125 border border-white/10" />
             <button onMouseDown={(e) => { e.stopPropagation(); onApplyPreset({bg:'#1a1c1e', primary:'#f97316', border:'#452b1f', text:'#ffffff', muted:'#94a3b8'}); }} className="w-3.5 h-3.5 bg-[#f97316] rounded-full hover:scale-125 border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}