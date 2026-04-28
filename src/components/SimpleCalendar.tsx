import React, { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface SimpleCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export default function SimpleCalendar({ selectedDate, onSelect, onClose }: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedDateObj = new Date(selectedDate);

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-3xl shadow-2xl border border-outline-variant/10 p-5 z-50 w-80">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-container rounded-full"><ChevronLeft size={16} /></button>
        <span className="text-sm font-black uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy', { locale: id })}</span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-surface-container rounded-full"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => <span key={d} className="text-[10px] font-bold text-outline">{d}</span>)}
        {daysInMonth.map(day => (
          <button
            key={day.toISOString()}
            onClick={() => { onSelect(format(day, 'yyyy-MM-dd')); onClose(); }}
            className={cn(
              "p-2 rounded-full text-xs font-bold transition-all",
              isSameDay(day, selectedDateObj) ? "bg-primary text-white" : "hover:bg-primary/10",
              !isSameMonth(day, currentMonth) && "text-outline/40"
            )}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
}
