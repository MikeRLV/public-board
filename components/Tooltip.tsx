"use client";
import { useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  triggerRef: React.RefObject<any>;
  isOpen: boolean;
}

export function Tooltip({ children, triggerRef, isOpen }: TooltipProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.right + 12,
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        backgroundColor: "#000000", // Forced opaque black to block grid lines
        zIndex: 999999,
        opacity: 1,
      }}
      className="w-64 p-4 border border-[var(--primary)] rounded-sm shadow-[0_0_50px_rgba(0,0,0,1)] animate-in fade-in duration-150 pointer-events-none"
    >
      {/* Arrow: Also opaque black */}
      <div 
        style={{ backgroundColor: "#000000" }} 
        className="absolute left-0 top-3 -ml-[5px] w-2.5 h-2.5 border-l border-b border-[var(--primary)] rotate-45 z-10" 
      />
      <div className="relative z-20">
        {children}
      </div>
    </div>,
    document.body
  );
}