"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Color Math ───────────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex: string): [number, number, number] {
  if (!hex || hex.length < 7) return [0, 0, 50];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WHEEL_SIZE = 148;
const SLOTS = [
  { label: 'BG',  key: 'bg' },
  { label: 'PRI', key: 'primary' },
  { label: 'BRD', key: 'border' },
  { label: 'TXT', key: 'text' },
  { label: 'ACC', key: 'muted' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ThemeLab({ customColors, onColorChange, onApplyPreset, theme, setTheme, isMobile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('primary');
  const [contrast, setContrast] = useState(50);
  const [pinPos, setPinPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = WHEEL_SIZE;
    const cx = size / 2, cy = size / 2;
    const radius = size / 2 - 1;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;
        if (dist > radius) { data[idx + 3] = 0; continue; }
        const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        const sat = (dist / radius) * 100;
        const [r, g, b] = hslToRgb(hue, sat, contrast);
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [contrast, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const hex = customColors[selectedSlot];
    if (!hex || hex.length !== 7) return;
    try {
      const [h, s, l] = hexToHsl(hex);
      setContrast(l);
      const radius = WHEEL_SIZE / 2 - 1;
      const angle = (h * Math.PI) / 180;
      const dist = (s / 100) * radius;
      setPinPos({
        x: WHEEL_SIZE / 2 + Math.cos(angle) * dist,
        y: WHEEL_SIZE / 2 + Math.sin(angle) * dist,
      });
    } catch {}
  }, [selectedSlot, isOpen]);

  const getColorFromPos = useCallback((x: number, y: number, lightnessOverride?: number) => {
    const l = lightnessOverride !== undefined ? lightnessOverride : contrast;
    const cx = WHEEL_SIZE / 2, cy = WHEEL_SIZE / 2;
    const radius = WHEEL_SIZE / 2 - 1;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, radius);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
    const sat = (clampedDist / radius) * 100;
    const [r, g, b] = hslToRgb(hue, sat, l);
    return {
      hex: rgbToHex(r, g, b),
      clampedX: cx + nx * clampedDist,
      clampedY: cy + ny * clampedDist,
    };
  }, [contrast]);

  const handleWheelInteraction = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { hex, clampedX, clampedY } = getColorFromPos(x, y);
    setPinPos({ x: clampedX, y: clampedY });
    if (theme !== 'custom') setTheme('custom');
    onColorChange(selectedSlot, hex);
  }, [getColorFromPos, selectedSlot, onColorChange, setTheme, theme]);

  const handleContrastChange = useCallback((newL: number) => {
    setContrast(newL);
    if (pinPos) {
      const { hex } = getColorFromPos(pinPos.x, pinPos.y, newL);
      if (theme !== 'custom') setTheme('custom');
      onColorChange(selectedSlot, hex);
    }
  }, [pinPos, getColorFromPos, selectedSlot, onColorChange, setTheme, theme]);

  const currentSlotColor = customColors[selectedSlot] || '#808080';

  return (
    <div className={`flex flex-col gap-1.5 relative ${isMobile ? 'items-end' : ''}`} ref={containerRef}>

      {/* ── Preset dots ── */}
      <button onMouseDown={e => e.stopPropagation()} onClick={() => setTheme('default')}
        className={`w-3.5 h-3.5 bg-yellow-500 border-2 ${theme === 'default' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={e => e.stopPropagation()} onClick={() => setTheme('cyberpunk')}
        className={`w-3.5 h-3.5 bg-pink-500 border-2 ${theme === 'cyberpunk' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={e => e.stopPropagation()} onClick={() => setTheme('minimalist')}
        className={`w-3.5 h-3.5 bg-neutral-500 border-2 ${theme === 'minimalist' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={e => e.stopPropagation()} onClick={() => setTheme('custom')}
        style={{ backgroundColor: customColors.primary }}
        suppressHydrationWarning
        className={`w-3.5 h-3.5 border-2 ${theme === 'custom' ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`} />
      <button onMouseDown={e => e.stopPropagation()} onClick={() => setIsOpen(!isOpen)}
        className={`w-3.5 h-3.5 bg-neutral-800 border-2 flex items-center justify-center text-[8px] font-black text-white ${isOpen ? 'border-white' : 'border-transparent opacity-40'} hover:opacity-100 transition-all`}>
        ?
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', width: 184 }}
          className={`absolute ${isMobile ? 'right-0' : 'left-full'} top-0 ${isMobile ? 'mt-8' : 'ml-3'} flex flex-col gap-3 border p-3 shadow-2xl z-[100]`}
        >
          <span className="text-[7px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Theme Lab</span>

          {/* ── Color wheel ── */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative cursor-crosshair"
              style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
              onMouseDown={e => { setIsDragging(true); handleWheelInteraction(e.clientX, e.clientY); }}
              onMouseMove={e => { if (isDragging) handleWheelInteraction(e.clientX, e.clientY); }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <canvas
                ref={canvasRef}
                width={WHEEL_SIZE}
                height={WHEEL_SIZE}
                className="rounded-full"
                style={{ display: 'block' }}
              />
              {pinPos && (
                <div
                  className="absolute pointer-events-none transition-none"
                  style={{
                    left: pinPos.x - 6,
                    top: pinPos.y - 6,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid white',
                    backgroundColor: currentSlotColor,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.8)',
                  }}
                />
              )}
            </div>

            {/* ── Contrast slider ── */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contrast</span>
                <span className="text-[7px] font-mono text-[var(--text-muted)]">{contrast}%</span>
              </div>
              <div className="relative h-3 flex items-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(to right, #000000, ${currentSlotColor}, #ffffff)` }}
                />
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={contrast}
                  onChange={e => handleContrastChange(Number(e.target.value))}
                  className="relative w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `calc(${((contrast - 5) / 90) * 100}% - 5px)`,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: currentSlotColor,
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Hex inputs — click row to target wheel ── */}
          <div className="space-y-1 border-t border-white/5 pt-2">
            {SLOTS.map(slot => (
              <div
                key={slot.key}
                onClick={() => setSelectedSlot(slot.key)}
                style={{ borderColor: selectedSlot === slot.key ? 'rgba(255,255,255,0.25)' : 'transparent' }}
                className="flex items-center gap-2 px-1 py-0.5 cursor-pointer border rounded-sm transition-all hover:bg-white/5"
              >
                <span className={`w-6 text-[8px] font-bold uppercase transition-colors ${selectedSlot === slot.key ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                  {slot.label}
                </span>
                <input
                  type="text"
                  maxLength={7}
                  value={customColors[slot.key] || ""}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onColorChange(slot.key, e.target.value)}
                  className="flex-1 min-w-0 bg-black/40 border border-white/10 text-[10px] px-1.5 py-0.5 font-mono uppercase text-[var(--text-main)] outline-none"
                />
                <div
                  style={{ backgroundColor: customColors[slot.key] || '#000' }}
                  className="w-4 h-4 shrink-0 border border-white/20"
                />
              </div>
            ))}
          </div>

          {/* ── Presets ── */}
          <div className="pt-2 border-t border-white/5 flex gap-2 justify-between px-1">
            <button onMouseDown={e => { e.stopPropagation(); onApplyPreset({ bg: '#050505', primary: '#00ff88', border: '#113322', text: '#ffffff', muted: '#446655' }); }} className="w-3.5 h-3.5 bg-[#00ff88] rounded-full hover:scale-125 border border-white/10" />
            <button onMouseDown={e => { e.stopPropagation(); onApplyPreset({ bg: '#000000', primary: '#3b82f6', border: '#1e3a8a', text: '#ffffff', muted: '#60a5fa' }); }} className="w-3.5 h-3.5 bg-[#3b82f6] rounded-full hover:scale-125 border border-white/10" />
            <button onMouseDown={e => { e.stopPropagation(); onApplyPreset({ bg: '#0c0014', primary: '#a855f7', border: '#3b0764', text: '#f5f3ff', muted: '#8b5cf6' }); }} className="w-3.5 h-3.5 bg-[#a855f7] rounded-full hover:scale-125 border border-white/10" />
            <button onMouseDown={e => { e.stopPropagation(); onApplyPreset({ bg: '#1a1c1e', primary: '#f97316', border: '#452b1f', text: '#ffffff', muted: '#94a3b8' }); }} className="w-3.5 h-3.5 bg-[#f97316] rounded-full hover:scale-125 border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
