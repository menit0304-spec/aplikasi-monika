import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { User, Building2, Calendar, ShieldCheck, ArrowRight, Info, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { createReservation, fetchRoomTypes, fetchRooms } from "../services/dataService";
import { cn } from "../lib/utils";
// Removed RoomCalendar import as requested

function InputGroup({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="group space-y-3 w-full">
      <div className="flex justify-between items-center pr-2 transition-colors group-focus-within:text-primary">
        <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em]">{label}</label>
        <CheckCircle2 size={12} className={cn("transition-opacity", value ? "text-status-on-available opacity-100" : "opacity-0")} />
      </div>
      <input 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all outline-none text-on-surface font-bold placeholder:text-outline/30 shadow-sm" 
        placeholder={placeholder} 
        type={type} 
      />
    </div>
  );
}

export default function BookingForm({ 
  initialRoomNumber = "", 
  initialRoomType = "" 
}: { 
  initialRoomNumber?: string, 
  initialRoomType?: string 
}) {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    idNumber: "",
    phoneNumber: "",
    selectedRooms: [{ roomType: initialRoomType, roomNumber: initialRoomNumber }],
    checkIn: "",
    checkOut: "",
    paymentMethod: "Tunai",
    downPayment: 0
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRoomTypes().then(setRoomTypes);
    const dateToFetch = formData.checkIn || new Date().toISOString().split('T')[0];
    fetchRooms(dateToFetch).then(setRooms);
  }, [formData.checkIn]);

  useEffect(() => {
    if (initialRoomNumber && initialRoomType) {
      setFormData(prev => ({
        ...prev,
        selectedRooms: [{ roomType: initialRoomType, roomNumber: initialRoomNumber }]
      }));
    }
  }, [initialRoomNumber, initialRoomType]);

  const addRoom = () => {
    setFormData({
      ...formData,
      selectedRooms: [...formData.selectedRooms, { roomType: "", roomNumber: "" }]
    });
  };

  const removeRoom = (index: number) => {
    if (formData.selectedRooms.length <= 1) return;
    const updated = [...formData.selectedRooms];
    updated.splice(index, 1);
    setFormData({ ...formData, selectedRooms: updated });
  };

  const updateRoom = (index: number, field: string, value: string) => {
    const updated = [...formData.selectedRooms];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, selectedRooms: updated });
  };

  const calculateNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 1;
    const start = new Date(formData.checkIn);
    const end = new Date(formData.checkOut);
    // Use local time comparison to avoid UTC timezone shift issues for 1-night bookings
    const diffTime = end.getTime() - start.getTime();
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedRooms.some(r => !r.roomNumber)) {
      alert("Harap pilih nomor kamar untuk semua unit");
      return;
    }

    setLoading(true);
    try {
      const nights = calculateNights();

      const roomPayload = formData.selectedRooms.map(r => {
        const type = roomTypes.find(t => t.name === r.roomType);
        const price = type ? type.base_price : 0;
        return {
          roomNumber: r.roomNumber,
          totalPayment: price * nights
        };
      });

      await createReservation({
        name: formData.name,
        idNumber: formData.idNumber,
        phoneNumber: formData.phoneNumber,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        totalNights: nights,
        rooms: roomPayload,
        paymentMethod: formData.paymentMethod,
        downPayment: formData.downPayment,
        batchId: `B-${Date.now()}` // Generate batch id
      });
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert("Gagal membuat reservasi");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const nights = calculateNights();
    
    return formData.selectedRooms.reduce((acc, r) => {
      const type = roomTypes.find(t => t.name === r.roomType);
      return acc + (type ? type.base_price * nights : 0);
    }, 0);
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto mt-20 p-12 bg-white rounded-[3rem] text-center shadow-2xl border border-primary/10"
      >
        <div className="w-20 h-20 bg-status-available/20 text-status-on-available rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-headline font-extrabold mb-4">Booking Berhasil!</h2>
        <p className="text-on-surface-variant mb-10">Data reservasi (multi-room) telah tersimpan di database Hotel Monika Yogyakarta.</p>
        <button 
          onClick={() => {
            setSuccess(false);
            setFormData({
              name: "",
              idNumber: "",
              phoneNumber: "",
              selectedRooms: [{ roomType: "", roomNumber: "" }],
              checkIn: "",
              checkOut: "",
            });
          }}
          className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-primary/20"
        >
          Buat Booking Baru
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto px-6 pt-12 pb-32 space-y-12"
    >
      {/* Page Header */}
      <div className="space-y-3">
        <span className="text-primary font-headline font-extrabold text-xs tracking-[0.2em] uppercase">Multi-Room Reservation</span>
        <h2 className="text-5xl font-headline font-extrabold tracking-tighter text-on-surface leading-tight">Batch Booking</h2>
        <p className="text-on-surface-variant text-lg font-medium max-w-xl leading-relaxed opacity-70">
          Kelola pesanan untuk beberapa kamar sekaligus. Ideal untuk tamu grup atau keluarga besar.
        </p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        {/* Main Form Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Section 1: Identity */}
          <div className="md:col-span-12 bg-white p-10 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] border border-outline-variant/5">
            <div className="flex items-center gap-4 mb-10 text-primary">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <User size={24} />
              </div>
              <h3 className="font-headline font-extrabold text-2xl tracking-tight">Guest Identity</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <InputGroup 
                label="Nama Tamu Utama" 
                placeholder="e.g. Jonathan Aristha" 
                value={formData.name}
                onChange={v => setFormData({ ...formData, name: v })}
              />
              <InputGroup 
                label="NIK / ID Number" 
                placeholder="3201xxxxxxxxxxxx" 
                value={formData.idNumber}
                onChange={v => setFormData({ ...formData, idNumber: v })}
              />
              <InputGroup 
                label="Nomor Telepon" 
                placeholder="+62 812-xxxx-xxxx" 
                type="tel" 
                value={formData.phoneNumber}
                onChange={v => setFormData({ ...formData, phoneNumber: v })}
              />
            </div>
          </div>

          {/* Section 2: Unit Selection (Multi) */}
          <div className="md:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] border border-outline-variant/5">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4 text-primary">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Building2 size={24} />
                  </div>
                  <h3 className="font-headline font-extrabold text-2xl tracking-tight">Room List</h3>
                </div>
                <button 
                  type="button"
                  onClick={addRoom}
                  className="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-2xl font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={18} />
                  Tambah Kamar
                </button>
              </div>

              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 no-scrollbar">
                {formData.selectedRooms.map((selRoom, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-end gap-6 p-6 bg-surface-container-low rounded-[2rem] border border-outline-variant/5 relative group">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2">Tipe Kamar</label>
                      <select 
                        value={selRoom.roomType}
                        onChange={e => updateRoom(index, "roomType", e.target.value)}
                        className="w-full bg-white border-none rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-on-surface appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Pilih Tipe</option>
                        {roomTypes.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2">Nomor Kamar</label>
                      <select 
                        value={selRoom.roomNumber}
                        onChange={e => updateRoom(index, "roomNumber", e.target.value)}
                        className="w-full bg-white border-none rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-on-surface appearance-none shadow-sm cursor-pointer disabled:opacity-50"
                        disabled={!selRoom.roomType}
                      >
                        <option value="">Pilih Kamar</option>
                        {rooms
                          .filter(r => r.type === selRoom.roomType && r.status === "AVAILABLE")
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.id}</option>
                          ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeRoom(index)}
                      className={cn(
                        "p-4 text-error bg-error/10 rounded-2xl hover:bg-error hover:text-white transition-all active:scale-90",
                        formData.selectedRooms.length <= 1 && "opacity-0 pointer-events-none"
                      )}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-8 flex flex-col">
            {/* Timeline */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] border border-outline-variant/5 flex-1">
              <div className="flex items-center gap-4 mb-8 text-primary">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <h3 className="font-headline font-extrabold text-2xl tracking-tight">Timeline</h3>
              </div>
              
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2 transition-colors group-focus-within:text-primary">Check-in</label>
                  <input 
                    value={formData.checkIn}
                    onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-on-surface font-bold" 
                    type="date" 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2 transition-colors group-focus-within:text-primary">Check-out</label>
                  <input 
                    value={formData.checkOut}
                    onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-on-surface font-bold" 
                    type="date" 
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2 transition-colors group-focus-within:text-primary">Metode Pembayaran</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-on-surface font-bold appearance-none cursor-pointer"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Debit/QRIS">Debit / QRIS</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 pr-2 transition-colors group-focus-within:text-primary">Bayar DP (Opsional)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-outline/40">Rp</span>
                    <input 
                      value={formData.downPayment}
                      onChange={e => setFormData({ ...formData, downPayment: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border-none rounded-2xl pl-12 pr-6 py-5 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all text-on-surface font-bold" 
                      type="number" 
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Area (Summarized and Consolidated) */}
        <div className="pt-10 border-t border-outline-variant/10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            {/* Left: Security Info */}
            <div className="md:col-span-4 flex items-center gap-4 text-on-surface-variant bg-secondary-container/5 p-6 rounded-3xl border border-secondary-container/10">
              <div className="text-status-on-available">
                <ShieldCheck size={28} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-status-on-available">Verification Secured</span>
                <span className="text-[11px] font-medium opacity-60 italic leading-tight">Batch processing ensures all selected rooms are locked atomically.</span>
              </div>
            </div>

            {/* Right: Price + Confirm (Side by Side) */}
            <div className="md:col-span-8 flex flex-col sm:flex-row items-stretch gap-4">
              {/* Compact Price Summary */}
              <div className="flex-1 bg-surface-container-high p-6 rounded-3xl flex flex-col justify-center border border-outline-variant/10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-outline mb-1">Estimasi Total</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-primary">Rp</span>
                  <span className="text-3xl font-headline font-black tracking-tighter text-on-surface">
                    {calculateTotal().toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-outline ml-auto">
                    {formData.selectedRooms.length} Kamar
                  </span>
                </div>
              </div>

              {/* Confirm Action Button */}
              <button 
                disabled={loading}
                className="flex-[1.5] bg-primary text-white px-8 py-4 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-4 group disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Konfirmasi Booking"}
                <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
