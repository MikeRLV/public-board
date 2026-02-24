"use client";
import dayjs from "dayjs";

interface MonthYearPickerProps {
  currentDate: dayjs.Dayjs;
  onSelect: (date: dayjs.Dayjs) => void;
  onClose: () => void;
}

export function MonthYearPicker({ currentDate, onSelect, onClose }: MonthYearPickerProps) {
  const months = dayjs.months();
  const currentYear = currentDate.year();
  // Range: 2 years back, 5 years forward
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-[100] bg-[var(--bg-main)] border border-[var(--primary)] p-4 min-w-[280px] shadow-2xl font-mono">
      <div className="flex justify-between items-center border-b border-[var(--primary)]/20 pb-2 mb-3">
        <span className="text-[var(--primary)] text-[10px] font-black uppercase tracking-widest">Select Date</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-white text-[10px] font-bold">×</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Months List */}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => onSelect(currentDate.month(index))}
              className={`text-left p-1.5 text-[11px] font-bold uppercase transition-all ${
                currentDate.month() === index 
                ? 'bg-[var(--primary)] text-black' 
                : 'text-neutral-400 hover:text-[var(--primary)] hover:bg-white/5'
              }`}
            >
              {month}
            </button>
          ))}
        </div>

        {/* Years List */}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onSelect(currentDate.year(year))}
              className={`text-left p-1.5 text-[11px] font-bold transition-all ${
                currentDate.year() === year 
                ? 'bg-[var(--primary)] text-black' 
                : 'text-neutral-400 hover:text-[var(--primary)] hover:bg-white/5'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}