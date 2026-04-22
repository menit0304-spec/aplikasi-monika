import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Search, Filter, Phone, MessageSquare, Eye, PlusCircle, Building, Users, Banknote } from "lucide-react";
import { fetchGuests } from "../services/dataService";
import { Guest } from "../types";
import { cn } from "../lib/utils";
import PaymentOverview from "./PaymentOverview";

export default function GuestList() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"guests" | "payments">("guests");
  const guestStatusTabs = ["Aktif", "Mendatang", "Riwayat"];
  const currentGuestStatusTab = "Aktif";

  useEffect(() => {
    fetchGuests()
      .then(data => {
        if (Array.isArray(data)) {
          setGuests(data);
        } else {
          console.error("Expected array from fetchGuests, got:", data);
          setGuests([]);
        }
      })
      .catch(err => {
        console.error("Guest list error:", err);
        setGuests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-8 pb-32 space-y-12"
    >
      {/* Top Level Tab Switcher */}
      <div className="flex bg-surface-container/50 p-2 rounded-[2rem] w-fit mx-auto shadow-sm border border-outline-variant/10 sticky top-4 z-40 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab("guests")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full font-headline font-black transition-all",
            activeTab === "guests" 
              ? "bg-white text-primary shadow-md scale-105" 
              : "text-outline hover:bg-surface-container"
          )}
        >
          <Users size={20} />
          <span>Guest Database</span>
        </button>
        <button 
          onClick={() => setActiveTab("payments")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full font-headline font-black transition-all",
            activeTab === "payments" 
              ? "bg-white text-primary shadow-md scale-105" 
              : "text-outline hover:bg-surface-container"
          )}
        >
          <Banknote size={20} />
          <span>Payment Module</span>
        </button>
      </div>

      {activeTab === "payments" ? (
        <PaymentOverview />
      ) : (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">Hotel Monika Yogyakarta</span>
              <h2 className="text-4xl font-extrabold font-headline tracking-tighter text-on-surface leading-tight">Daftar Tamu</h2>
            </div>
            <div className="relative w-full md:w-96 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline/50 group-focus-within:text-primary transition-colors">
                <Search size={20} />
              </div>
              <input 
                className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border-0 ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary rounded-[1.5rem] text-sm placeholder:text-outline/40 transition-all outline-none shadow-sm" 
                placeholder="Cari nama atau nomor kamar..." 
                type="text"
              />
            </div>
          </div>

          {/* Tabs & Filters */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <nav className="flex p-1.5 bg-surface-container rounded-[1.5rem] w-full md:w-fit">
              {guestStatusTabs.map(tab => (
                <button 
                  key={tab}
                  className={cn(
                    "px-10 py-3 rounded-[1.2rem] text-sm font-bold transition-all duration-300",
                    currentGuestStatusTab === tab ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary/60"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <button className="p-4 rounded-2xl bg-surface-container-lowest text-primary ring-1 ring-outline-variant/10 hover:shadow-md transition-all active:scale-95">
              <Filter size={20} />
            </button>
          </div>

          {/* Guest List Body */}
          <div className="space-y-4">
            {/* Table Header - for desktop */}
            <div className="hidden md:grid grid-cols-12 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline/60 bg-surface-container/30 rounded-2xl">
              <div className="col-span-3">Tamu</div>
              <div className="col-span-2 text-center">Kontak</div>
              <div className="col-span-2 text-center">Unit</div>
              <div className="col-span-2 text-center">Durasi</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-1 text-right">Aksi</div>
            </div>

            {guests.map((guest, idx) => (
              <motion.div 
                key={guest.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group grid grid-cols-1 md:grid-cols-12 items-center gap-4 bg-white p-6 md:px-8 py-5 rounded-[2rem] shadow-[0_4px_24px_rgba(26,28,28,0.02)] hover:shadow-xl hover:shadow-on-surface/5 transition-all duration-300 border border-outline-variant/10"
              >
                {/* Guest Info */}
                <div className="col-span-1 md:col-span-3 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 bg-surface-container-high border border-outline-variant/5">
                    {guest.imageUrl ? (
                      <img 
                        alt={guest.name} 
                        className="w-full h-full object-cover" 
                        src={guest.imageUrl}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex-shrink-0 flex items-center justify-center text-primary font-black text-lg">
                        {guest.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold font-headline text-on-surface tracking-tight group-hover:text-primary transition-colors truncate">
                      {guest.name}
                    </h3>
                    <p className="text-[10px] font-bold text-outline/40 uppercase tracking-widest truncate">ID: {guest.idNumber || "---"}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center">
                  <span className="md:hidden text-[9px] font-bold uppercase tracking-widest text-outline/40 mb-1">Kontak</span>
                  <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                     <Phone size={14} className="opacity-40" />
                     <span className="text-xs font-bold font-mono">{guest.phoneNumber || "---"}</span>
                  </div>
                  <p className="hidden md:block text-[9px] font-bold text-outline/40 mt-1 truncate max-w-full opacity-60">ID: {guest.idNumber}</p>
                </div>

                {/* Room Info */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center">
                  <span className="md:hidden text-[9px] font-bold uppercase tracking-widest text-outline/40 mb-1">Unit</span>
                  <div className="flex items-center gap-2 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                    <Building size={14} className="text-primary group-hover:text-white" />
                    <span className="text-sm font-black text-primary group-hover:text-white">{guest.roomNumber || "--"}</span>
                  </div>
                  <p className="hidden md:block text-[9px] font-bold text-outline/60 mt-1 uppercase truncate max-w-full">{guest.roomType}</p>
                </div>

                {/* Duration */}
                <div className="col-span-1 md:col-span-2 flex md:flex-col items-center justify-center gap-3 md:gap-0">
                   <span className="md:hidden text-[9px] font-bold uppercase tracking-widest text-outline/40">Durasi:</span>
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-on-surface">{guest.checkIn}</span>
                      <div className="h-2 w-px bg-outline-variant/30 hidden md:block my-0.5" />
                      <span className="text-[10px] font-bold text-on-surface">{guest.checkOut}</span>
                   </div>
                </div>

                {/* Status */}
                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <div className={cn(
                    "px-5 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-[0.15em] border whitespace-nowrap",
                    guest.status === "CHECKED-IN" ? "bg-status-checked-in/15 text-status-on-checked-in border-status-checked-in/20" : "bg-status-booked/15 text-status-on-booked border-status-booked/20"
                  )}>
                    {(guest.status || "BOOKED").replace("-", " ")}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-1 flex items-center justify-end gap-2 translate-y-2 md:translate-y-0 border-t md:border-0 pt-4 md:pt-0 border-outline-variant/10">
                  <button className="w-10 h-10 flex items-center justify-center text-primary bg-surface-container hover:bg-primary/10 rounded-xl transition-all">
                    <MessageSquare size={16} />
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                    <Phone size={16} />
                  </button>
                </div>
              </motion.div>
            ))}

            {guests.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <Building size={48} />
                <p className="font-headline font-bold text-xl">Belum ada data tamu saat ini</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
