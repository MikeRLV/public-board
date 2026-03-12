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
        top: rect.bottom + 8,
        left: 4, // flush to sidebar left edge
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
        backgroundColor: "#000000",
        zIndex: 999999,
        opacity: 1,
        width: '248px',
      }}
      className="p-4 border border-[var(--primary)] rounded-sm shadow-[0_0_50px_rgba(0,0,0,1)] pointer-events-none"
    >
      {/* Arrow points up toward the ? button at top-right */}
      <div
        style={{ backgroundColor: "#000000", right: '10px' }}
        className="absolute -top-[5px] w-2.5 h-2.5 border-r border-t border-[var(--primary)] -rotate-45 z-10"
      />
      <div className="relative z-20">
        {children}
      </div>
    </div>,
    document.body
  );
}
