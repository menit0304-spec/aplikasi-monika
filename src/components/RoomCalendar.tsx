import React, { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCw, Bed } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchRooms, fetchReservations } from "../services/dataService";
import { Room, Reservation } from "../types";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval,
  parseISO,
  differenceInCalendarDays,
  startOfDay
} from "date-fns";
import { id } from "date-fns/locale";

interface RoomCalendarProps {
  className?: string;
  showTitle?: boolean;
}

export default function RoomCalendar({ className, showTitle = true }: RoomCalendarProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, resvData] = await Promise.all([
        fetchRooms().catch(() => []),
        fetchReservations().catch(() => [])
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setReservations(Array.isArray(resvData) ? resvData : []);
    } catch (error) {
      console.error("Gagal memuat data kalender:", error);
      setRooms([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const roomTypes: string[] = Array.from(new Set(rooms.map(r => r.type)));
  const dayWidth = 100; // px

  const syncScrollLeftToRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (sidebarRef.current) sidebarRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
  };

  const syncScrollRightToLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
        <p className="text-xs font-black text-primary uppercase tracking-widest text-center">Sinkronisasi Kalender...</p>
      </div>
    );
  }

  if (rooms.length === 0) return null;

  return (
    <div className={cn("flex flex-col bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden", className)}>
      {/* Header Panel */}
      <div className="p-6 border-b border-outline-variant/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest">
        {showTitle && (
          <div>
            <h3 className="text-xl font-black font-headline tracking-tighter text-on-surface">Ketersediaan Unit</h3>
            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">
              Live Room Availability Status
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-2xl border border-outline-variant/10 flex items-center shadow-sm">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-container rounded-xl transition-all active:scale-90">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 font-black text-[10px] min-w-[120px] text-center uppercase tracking-widest">
              {format(currentMonth, 'MMMM yyyy', { locale: id })}
            </div>
            <button onClick={handleNextMonth} className="p-2 hover:bg-surface-container rounded-xl transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
          <button 
            onClick={loadData}
            className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative min-h-[400px]">
        {/* Locked Left Sidebar: Room List */}
        <div className="w-40 border-r border-outline-variant/10 bg-surface-container-lowest shrink-0 z-20 flex flex-col">
           <div className="h-14 border-b border-outline-variant/10 flex items-center px-5 sticky top-0 bg-surface-container-lowest z-30">
              <span className="text-[9px] font-black uppercase tracking-widest text-outline">Unit</span>
           </div>
           <div 
             ref={sidebarRef}
             className="overflow-y-auto no-scrollbar scroll-smooth"
             onScroll={syncScrollRightToLeft}
           >
              {roomTypes.map(type => {
                const typeRooms = rooms.filter(r => r.type === type);
                return (
                  <div key={type}>
                    <div className="bg-surface-container-low px-5 py-2 sticky top-0 z-10 border-b border-outline-variant/5">
                       <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest leading-none">{type.split(' ')[0]}</span>
                    </div>
                    {typeRooms.map(room => (
                      <div key={room.id} className="h-14 flex items-center px-5 border-b border-outline-variant/5 last:border-b-0 group hover:bg-primary/5 transition-colors">
                         <span className="font-headline font-black text-lg text-on-surface leading-none">{room.id}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
           </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative select-none scroll-smooth"
          onScroll={syncScrollLeftToRight}
        >
          {/* Horizontal Header: Dates */}
          <div className="flex sticky top-0 z-30 bg-white/90 backdrop-blur-md shadow-sm border-b border-outline-variant/10">
             {daysInMonth.map(day => (
               <div 
                 key={day.toISOString()} 
                 className={cn(
                   "shrink-0 flex flex-col items-center justify-center border-r border-outline-variant/5 h-14 transition-colors",
                   isSameDay(day, new Date()) ? "bg-primary/5" : "bg-transparent"
                 )}
                 style={{ width: dayWidth }}
               >
                 <span className="text-[8px] font-bold text-outline/40 uppercase tracking-widest leading-none mb-1">{format(day, 'EEE', { locale: id })}</span>
                 <span className={cn(
                   "text-base font-black font-headline leading-none",
                   isSameDay(day, new Date()) ? "text-primary transition-all" : "text-on-surface"
                 )}>{format(day, 'dd')}</span>
               </div>
             ))}
          </div>

          {/* Grid Area */}
          <div className="relative min-h-full" style={{ width: daysInMonth.length * dayWidth }}>
             <div className="absolute inset-0 flex pointer-events-none">
               {daysInMonth.map(day => (
                 <div 
                  key={day.toISOString()} 
                  className={cn(
                    "h-full border-r border-outline-variant/5",
                    isSameDay(day, new Date()) ? "bg-primary/5 border-primary/10" : ""
                  )} 
                  style={{ width: dayWidth }} 
                 />
               ))}
             </div>

             <div className="relative">
               {roomTypes.map(type => {
                  const typeRooms = rooms.filter(r => r.type === type);
                  return (
                    <div key={type}>
                      <div className="h-8" /> {/* Gap for type header */}
                      {typeRooms.map(room => {
                        const roomReservations = reservations.filter(res => res.room_number === room.id);
                        return (
                          <div key={room.id} className="h-14 border-b border-outline-variant/5 relative group">
                             {roomReservations.map(res => {
                                const start = parseISO(res.check_in);
                                const end = parseISO(res.check_out);
                                const viewStart = startOfMonth(currentMonth);
                                const renderStart = start < viewStart ? viewStart : start;
                                const startIndex = daysInMonth.findIndex(d => isSameDay(d, renderStart));
                                if (startIndex === -1) return null;
                                const diffDays = differenceInCalendarDays(end, renderStart);
                                const renderWidth = diffDays * dayWidth;
                                if (renderWidth <= 0) return null;

                                return (
                                  <div 
                                    key={res.id}
                                    className={cn(
                                      "absolute top-2 h-10 rounded-xl flex items-center px-3 overflow-hidden shadow-sm transition-all border border-white/20",
                                      res.reservation_status === "CHECKED-IN" && "bg-gradient-to-br from-status-checked-in to-status-checked-in/80 text-white",
                                      res.reservation_status === "BOOKED" && "bg-gradient-to-br from-primary to-primary/80 text-white",
                                      res.reservation_status === "CHECKED-OUT" && "bg-surface-container-highest text-on-surface-variant opacity-60",
                                    )}
                                    style={{ 
                                      left: startIndex * dayWidth + 2,
                                      width: Math.max(renderWidth - 4, 30),
                                    }}
                                  >
                                     <div className="flex flex-col min-w-0">
                                        <span className="text-[8px] font-black uppercase truncate leading-none">{res.guest_name}</span>
                                        <span className="text-[7px] font-bold opacity-70 truncate uppercase tracking-tighter whitespace-nowrap mt-0.5">
                                           {res.reservation_status}
                                        </span>
                                     </div>
                                  </div>
                                );
                             })}
                          </div>
                        );
                      })}
                    </div>
                  );
               })}
             </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 flex flex-wrap gap-x-6 gap-y-2 shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-primary" />
            <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Booking</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-status-checked-in" />
            <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Check-In</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-surface-container-highest border border-outline/10" />
            <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Check-Out</span>
         </div>
      </div>
    </div>
  );
}
