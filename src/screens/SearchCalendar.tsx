import { motion } from "framer-motion";
import React, { useState } from "react";
import { Search, Bed, RotateCw } from "lucide-react";
import { cn } from "../lib/utils";
import { Room } from "../types";
import RoomCalendar from "../components/RoomCalendar";

export default function SearchCalendar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden"
    >
      {/* Header Panel */}
      <section className="py-6 space-y-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black font-headline tracking-tighter text-on-surface">Timeline Reservasi</h2>
            <p className="text-on-surface-variant text-sm opacity-60 uppercase font-bold tracking-tight">
               Visualisasi Jadwal & Ketersediaan Unit
            </p>
          </div>
        </div>

        <div className="bg-white p-1 rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-3 px-4 max-w-xl group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="text-outline/40 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            className="w-full bg-transparent border-none focus:ring-0 text-sm py-3 font-bold placeholder:text-outline/30 outline-none" 
            placeholder="Cari No Kamar atau Tipe (misal: '101' or 'Deluxe')..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Main Timeline View */}
      <div className="flex-1 overflow-hidden flex flex-col mb-4">
        <RoomCalendar showTitle={false} className="h-full" />
      </div>
    </motion.div>
  );
}
