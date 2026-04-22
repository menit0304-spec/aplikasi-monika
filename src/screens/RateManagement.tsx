import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Search, 
  ArrowRight, 
  Save, 
  Settings, 
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Percent,
  Coins,
  ChevronRight
} from "lucide-react";
import { fetchRoomTypes, updateBulkPrices } from "../services/dataService";
import { cn } from "../lib/utils";

interface RoomType {
  id: number;
  name: string;
  description: string;
  base_price: number;
  capacity: string;
  facilities: string;
  image_url: string;
}

export default function RateManagement() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for modified prices
  const [priceChanges, setPriceChanges] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkValue, setBulkValue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRoomTypes();
      setRoomTypes(data);
      // Reset changes
      setPriceChanges({});
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data tipe kamar.");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: number, val: string) => {
    const num = parseInt(val.replace(/\D/g, ""));
    setPriceChanges(prev => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num
    }));
  };

  const applyBulkPercent = () => {
    const p = parseFloat(bulkPercent);
    if (isNaN(p)) return;
    
    const newChanges: Record<number, number> = { ...priceChanges };
    filteredRoomTypes.forEach(rt => {
      const currentPrice = priceChanges[rt.id] !== undefined ? priceChanges[rt.id] : rt.base_price;
      newChanges[rt.id] = Math.round(currentPrice * (1 + p / 100));
    });
    setPriceChanges(newChanges);
    setBulkPercent("");
  };

  const applyBulkValue = () => {
    const v = parseInt(bulkValue.replace(/\D/g, ""));
    if (isNaN(v)) return;
    
    const newChanges: Record<number, number> = { ...priceChanges };
    filteredRoomTypes.forEach(rt => {
      newChanges[rt.id] = v;
    });
    setPriceChanges(newChanges);
    setBulkValue("");
  };

  const handleSave = async () => {
    if (Object.keys(priceChanges).length === 0) return;
    
    setUpdating(true);
    setError(null);
    try {
      const updates = Object.entries(priceChanges).map(([id, price]) => ({
        id: parseInt(id),
        price: price as number
      }));
      
      await updateBulkPrices(updates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memperbarui harga.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredRoomTypes = roomTypes.filter(rt => 
    rt.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = Object.keys(priceChanges).length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-6 py-12 space-y-10 pb-32"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary uppercase tracking-[0.2em] font-black text-xs">
            <TrendingUp size={16} />
            <span>Revenue Optimization</span>
          </div>
          <h2 className="text-5xl font-headline font-black tracking-tight text-on-surface">Rate Management</h2>
          <p className="text-on-surface-variant font-medium opacity-60 max-w-lg">
            Atur harga semua tipe kamar secara masal. Gunakan fitur penyesuaian otomatis untuk menaikkan atau menurunkan harga berdasarkan persentase.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={loadData}
             className="p-4 bg-surface-container hover:bg-surface-container-high rounded-2xl transition-all"
             title="Refresh Data"
           >
             <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button 
             disabled={!hasChanges || updating}
             onClick={handleSave}
             className={cn(
               "flex items-center gap-3 px-8 py-4 rounded-2xl font-headline font-black text-lg transition-all shadow-xl",
               hasChanges 
                ? "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95" 
                : "bg-surface-container text-outline cursor-not-allowed opacity-50"
             )}
           >
             {updating ? "Menyimpan..." : (
               <>
                 <Save size={20} />
                 Simpan Perubahan
               </>
             )}
           </button>
        </div>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-status-available/10 text-status-on-available p-6 rounded-3xl flex items-center gap-4 border border-status-available/20"
        >
          <CheckCircle2 size={32} />
          <div>
            <p className="font-black text-lg">Harga Berhasil Diperbarui!</p>
            <p className="text-sm opacity-70 font-medium">Semua unit akan menggunakan rate baru mulai saat ini.</p>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="bg-error/10 text-error p-6 rounded-3xl flex items-center gap-4 border border-error/20">
          <AlertCircle size={32} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Bulk Controls Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-on-surface">
            <Settings size={20} className="text-primary" />
            <h3 className="font-headline font-bold text-xl">Masal Adjustment</h3>
          </div>
          
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Sesuaikan (%)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                  <input 
                    type="number"
                    placeholder="e.g. 10 or -5"
                    value={bulkPercent}
                    onChange={e => setBulkPercent(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-3 font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button 
                  onClick={applyBulkPercent}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 rounded-xl transition-all font-bold text-sm"
                >
                  Apply
                </button>
              </div>
              <p className="text-[10px] text-outline mt-2 italic px-1">*Mengubah harga tipe kamar yang tampil</p>
            </div>

            <div className="group pt-4 border-t border-outline-variant/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 block">Set Harga Tetap</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                  <input 
                    type="text"
                    placeholder="e.g. 500,000"
                    value={bulkValue}
                    onChange={e => setBulkValue(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-3 font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button 
                  onClick={applyBulkValue}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 rounded-xl transition-all font-bold text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search & List container */}
        <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-8 flex flex-col">
          <div className="flex items-center justify-between gap-4">
             <div className="relative flex-1">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-outline" />
                <input 
                  placeholder="Cari tipe kamar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-on-surface outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 no-scrollbar">
            {filteredRoomTypes.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                 <div className="w-16 h-16 bg-surface-container rounded-3xl flex items-center justify-center mx-auto opacity-40">
                    <TrendingUp size={32} />
                 </div>
                 <p className="text-outline font-bold">Tidak ada tipe kamar yang cocok.</p>
              </div>
            ) : (
              filteredRoomTypes.map(rt => {
                const currentPrice = priceChanges[rt.id] !== undefined ? priceChanges[rt.id] : rt.base_price;
                const isChanged = priceChanges[rt.id] !== undefined && priceChanges[rt.id] !== rt.base_price;
                
                return (
                  <div 
                    key={rt.id} 
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border transition-all",
                      isChanged 
                        ? "bg-primary/5 border-primary/30 shadow-md translate-x-2" 
                        : "bg-surface-container-low border-transparent hover:border-outline-variant/20 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden border border-outline-variant/10">
                          {rt.image_url ? (
                            <img src={rt.image_url} alt={rt.name} className="w-full h-full object-cover" />
                          ) : (
                            <TrendingUp size={24} className="text-outline opacity-30" />
                          )}
                       </div>
                       <div>
                          <h4 className="font-headline font-black text-lg text-on-surface">{rt.name}</h4>
                          <span className="text-[10px] uppercase font-black tracking-widest text-outline opacity-60">Status: {isChanged ? "Modified" : "Original"}</span>
                       </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="text-right hidden sm:block">
                          <span className="text-[9px] uppercase font-black tracking-tighter text-outline/50 block mb-1">Original Price</span>
                          <span className="font-bold text-on-surface/40 line-through">Rp{rt.base_price.toLocaleString()}</span>
                       </div>
                       
                       <div className="flex items-center bg-white px-2 rounded-2xl border border-outline-variant/10 shadow-inner group-focus-within:border-primary transition-all">
                          <span className="pl-4 text-primary font-black text-sm">Rp</span>
                          <input 
                            type="text"
                            value={currentPrice.toLocaleString()}
                            onChange={e => handlePriceChange(rt.id, e.target.value)}
                            className="w-32 py-4 px-3 font-headline font-black text-xl text-on-surface border-none outline-none focus:ring-0 bg-transparent text-right"
                          />
                       </div>
                       
                       {isChanged && (
                         <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center animate-pulse">
                            <ChevronRight size={14} />
                         </div>
                       )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-outline-variant/10 flex flex-col items-center gap-4 text-center">
         <p className="text-xs font-bold text-outline max-w-sm uppercase tracking-widest opacity-60 leading-relaxed">
            Perubahan harga akan berdampak pada perhitungan reservasi baru secara otomatis. Reservasi yang sudah ada tidak akan terpengaruh.
         </p>
      </div>
    </motion.div>
  );
}
