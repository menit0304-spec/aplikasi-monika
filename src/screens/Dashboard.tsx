import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchRooms } from "../services/dataService";
import { Room } from "../types";
import { cn } from "../lib/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCw, LogOut } from "lucide-react";

export default function Dashboard({ 
  selectedDate, 
  onDateChange, 
  onViewDetail,
  readOnly = false
}: { 
  selectedDate: string, 
  onDateChange: (date: string) => void,
  onViewDetail: (room: Room) => void,
  readOnly?: boolean
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = () => {
    setLoading(true);
    fetchRooms(selectedDate)
      .then(data => {
        if (Array.isArray(data)) {
          setRooms(data);
        }
      })
      .catch(err => console.error("Failed to load rooms:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // Add a refresh interval or just ensure it reloads on focus
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    const newYear = d.getFullYear();
    const newMonth = String(d.getMonth() + 1).padStart(2, '0');
    const newDay = String(d.getDate()).padStart(2, '0');
    onDateChange(`${newYear}-${newMonth}-${newDay}`);
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    const newYear = d.getFullYear();
    const newMonth = String(d.getMonth() + 1).padStart(2, '0');
    const newDay = String(d.getDate()).padStart(2, '0');
    onDateChange(`${newYear}-${newMonth}-${newDay}`);
  };

  const floors = (Array.from(new Set(rooms.map(r => Number(r.floor || 0)))) as number[])
    .sort((a, b) => a - b)
    .map(floorNum => ({
      name: `Lantai ${floorNum}`,
      rooms: rooms.filter(r => Number(r.floor || 0) === floorNum)
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    }));

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(new Date(year, month - 1, day));
  };

  const formattedDate = formatDisplayDate(selectedDate);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <CalendarIcon className="text-primary/40" size={24} />
          </div>
        </div>
        <div className="text-center animate-pulse">
          <p className="text-lg font-headline font-black text-primary uppercase tracking-widest">Sinkronisasi Data</p>
          <p className="text-xs text-on-surface-variant font-bold opacity-60 mt-1 uppercase tracking-tighter">Memuat status kamar untuk {formattedDate}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-6 pt-8 space-y-10"
    >
      {/* Header & Date Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h2 className="text-5xl font-extrabold font-headline tracking-tighter mb-4 leading-none">Daftar Kamar</h2>
          <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed opacity-70">
            Monitor ketersediaan unit dan status operasional real-time di Hotel Monika.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="bg-surface-container-low p-2 rounded-[2.5rem] border border-outline-variant/10 flex items-center gap-2 shadow-sm self-start">
          <button 
            onClick={handlePrevDay}
            className="p-3 hover:bg-white rounded-full transition-all text-on-surface-variant opacity-60 hover:opacity-100 active:scale-90"
            title="Hari Sebelumnya"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm min-w-[240px] justify-center relative group hover:border-primary/30 transition-all">
            <CalendarIcon size={20} className="text-primary" />
            <span className="text-sm font-black text-on-surface uppercase tracking-tight">{formattedDate}</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <button 
            onClick={handleNextDay}
            className="p-3 hover:bg-white rounded-full transition-all text-on-surface-variant opacity-60 hover:opacity-100 active:scale-90"
            title="Hari Selanjutnya"
          >
            <ChevronRight size={24} />
          </button>

          <div className="w-[1px] h-10 bg-outline-variant/20 mx-2" />

          <button 
            onClick={loadData}
            className="p-3 hover:bg-primary-container hover:text-white rounded-full transition-all text-primary active:rotate-180 duration-700"
            title="Refresh Data"
          >
            <RotateCw size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 p-6 bg-surface-container-low rounded-[1.5rem] border border-outline-variant/5">
        <StatusLegend color="bg-emerald-500" label="Tersedia" />
        <StatusLegend color="bg-blue-500" label="Terpesan (Booked)" />
        <StatusLegend color="bg-orange-500" label="Sudah Check-in" />
        <StatusLegend color="bg-neutral-600" label="Sudah Check-out" />
        
        {readOnly && (
          <div className="ml-auto flex items-center gap-3 px-6 py-3 bg-secondary/10 text-secondary rounded-2xl border border-secondary/20">
            <div className="w-2 h-2 bg-secondary rounded-full animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest">Mode Guest: Read-Only</span>
          </div>
        )}
        
        {!readOnly && selectedDate !== getLocalDateString() && (
          <div className="ml-auto px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 animate-pulse">
            Menampilkan Jadwal Mendatang/Lampau
          </div>
        )}
      </div>

      {/* Grid Sections */}
      <div className="space-y-16 pb-12">
        {floors.map((floor, idx) => (
          <section 
            key={floor.name} 
            className={cn(
              "rounded-[2rem] transition-all",
              idx % 2 === 1 ? "bg-surface-container p-8 -mx-8 px-10" : "space-y-6"
            )}
          >
            <div className="flex items-center justify-between mb-6 border-b border-outline-variant/15 pb-4">
              <div className="flex items-center">
                <h3 className="text-xl font-bold font-headline">{floor.name}</h3>
              </div>
              <span className="text-xs text-primary font-bold uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">{floor.rooms.length} Unit</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {floor.rooms.map(room => (
                <button 
                  key={room.id} 
                  onClick={() => onViewDetail(room)}
                  className={cn(
                    "group relative aspect-[4/5] rounded-[2rem] flex flex-col items-center justify-between transition-all hover:shadow-2xl active:scale-95 border-2 p-3 overflow-hidden",
                    room.status === "AVAILABLE" && "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/10",
                    room.status === "CHECKED-IN" && "bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/10",
                    room.status === "CHECKED-OUT" && "bg-neutral-600 border-neutral-700 text-white shadow-md shadow-neutral-600/10",
                    room.status === "BOOKED" && "bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-500/10"
                  )}
                >
                  {room.paymentStatus && (room.status !== "AVAILABLE" || room.hasPendingCheckOut) && (
                    <div className={cn(
                      "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-sm ring-1 ring-white/20 z-10",
                      room.paymentStatus === "Lunas" ? "bg-emerald-600/90" : "bg-red-600/90 animate-pulse"
                    )}>
                      {room.paymentStatus}
                    </div>
                  )}

                  {room.status === "AVAILABLE" && room.hasPendingCheckOut && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest shadow-sm ring-1 ring-white/20 bg-orange-600/90">
                      OUT
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-0.5 mt-2 transition-all">
                    <span className="text-4xl font-black font-headline tracking-tighter leading-none">{room.id}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest opacity-70 truncate w-full px-1 mb-1">{room.type}</span>
                    
                    {(room.status === "BOOKED" || room.status === "CHECKED-IN" || room.hasPendingCheckOut) && room.guestName ? (
                      <div className="flex flex-col items-center justify-center min-h-[1.5rem] w-full px-1">
                        <span className={cn(
                          "text-[9px] font-bold text-white leading-tight line-clamp-1 italic",
                          room.hasPendingCheckOut && "opacity-80"
                        )}>
                          {room.guestName}
                        </span>
                      </div>
                    ) : (
                      <div className="min-h-[1.5rem]" /> // Maintain consistent spacing
                    )}
                  </div>

                  <div className="w-full py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-sm border border-white/20 shadow-inner flex items-center justify-center gap-1">
                    {room.hasPendingCheckOut && <LogOut size={10} />}
                    {room.status === "CHECKED-IN" ? "In" : room.status === "CHECKED-OUT" ? "Out" : room.status === "AVAILABLE" ? (room.hasPendingCheckOut ? "Out" : "Ready") : "Book"}
                  </div>

                  {/* Hover Accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/40 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}

function StatusLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-4 h-4 rounded-full", color)} />
      <span className="text-xs font-bold font-body uppercase tracking-widest text-on-surface-variant">{label}</span>
    </div>
  );
}
