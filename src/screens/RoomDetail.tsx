import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { 
  LogIn, 
  LogOut, 
  X, 
  Wifi, 
  Snowflake, 
  Tv, 
  Calendar, 
  CalendarX,
  ArrowLeft,
  CheckCircle2,
  Hotel,
  User,
  Phone,
  CreditCard,
  UserCheck,
  Edit
} from "lucide-react";
import { updateRoomStatus, fetchRooms, updateGuest } from "../services/dataService";
import { Room } from "../types";
import { cn } from "../lib/utils";

export default function RoomDetail({ 
  accessMode,
  room: initialRoom, 
  onBack, 
  onBooking,
  showActions, 
  selectedDate 
}: { 
  accessMode?: "not-selected" | "guest" | "authorized",
  room: Room | null, 
  onBack: () => void, 
  onBooking?: (room: Room) => void,
  showActions?: boolean, 
  selectedDate?: string 
}) {
  const isGuest = accessMode === 'guest';
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localRoomStatus, setLocalRoomStatus] = useState<string | null>(initialRoom?.status || null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(initialRoom);
  const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false);
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [walkInGuest, setWalkInGuest] = useState({
    name: "",
    phoneNumber: "",
    idNumber: "",
    paymentStatus: "Belum Lunas",
    paymentAmount: 0,
    paymentMethod: "Tunai"
  });

  useEffect(() => {
    if (initialRoom && selectedDate) {
      setLoading(true);
      fetchRooms(selectedDate)
        .then(rooms => {
          if (Array.isArray(rooms)) {
            const freshRoom = rooms.find(r => r.id === initialRoom.id);
            if (freshRoom) {
              setCurrentRoom(freshRoom);
              setLocalRoomStatus(freshRoom.status);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [initialRoom?.id, selectedDate]);

  const room = currentRoom ? { ...currentRoom, status: localRoomStatus || currentRoom.status } : null;

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-10">
        <div className="w-16 h-16 bg-surface-container rounded-3xl flex items-center justify-center mb-4 opacity-40">
           <Hotel size={32} />
        </div>
        <p className="text-on-surface-variant font-bold">Kamar tidak ditemukan atau sesi berakhir.</p>
        <button onClick={onBack} className="text-primary font-black uppercase tracking-widest text-xs hover:underline mt-4">Kembali ke Dashboard</button>
      </div>
    );
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (isGuest) return;
    if (!room) return;

    // Check if manual check-in is needed
    if (newStatus === "CHECKED-IN" && !room.guestName && !isWalkInFormOpen) {
      setIsWalkInFormOpen(true);
      return;
    }

    setLoading(true);
    try {
      await updateRoomStatus(
        room.id, 
        newStatus, 
        selectedDate, 
        newStatus === "CHECKED-IN" && walkInGuest.name ? walkInGuest : undefined
      );
      setLocalRoomStatus(newStatus); // Update UI immediately
      setSuccess(true);
      setIsWalkInFormOpen(false);
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error: any) {
      console.error(error);
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert("Gagal memperbarui status. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGuestData = async () => {
    if (isGuest) return;
    if (!room?.guestId) return;
    setLoading(true);
    try {
      await updateGuest(room.guestId as any, {
        name: walkInGuest.name,
        phoneNumber: walkInGuest.phoneNumber,
        idNumber: walkInGuest.idNumber
      });
      setSuccess(true);
      setIsEditingGuest(false);
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui data tamu.");
    } finally {
      setLoading(false);
    }
  };

  const openEditGuestForm = () => {
    if (!room) return;
    setWalkInGuest({
      name: room.guestName || "",
      phoneNumber: room.phoneNumber || "",
      idNumber: "" // ID Number isn't returned in the room list for security, user will re-enter or we could fetch it
    });
    setIsEditingGuest(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto px-6 pt-8 space-y-10 pb-32"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold text-sm mb-4 hover:underline">
          <ArrowLeft size={16} /> Kembali
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-headline font-extrabold tracking-tight">Detail Unit</h2>
            <p className="text-on-surface-variant font-body text-sm opacity-60 mt-1">Modul manajemen status unit {room.id}.</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-status-available/10 text-status-on-available p-6 rounded-3xl flex items-center gap-4 border border-status-available/20 shadow-xl shadow-status-available/5">
          <CheckCircle2 size={32} />
          <div>
            <p className="font-black">Update Berhasil!</p>
            <p className="text-xs opacity-70">Status kamar telah diperbarui di database.</p>
          </div>
        </div>
      )}

      {/* Room Identity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-[0_8px_32px_rgba(26,28,28,0.04)] flex flex-col justify-between border border-outline-variant/10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-primary-container/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">Room Unit</span>
              <span className="text-outline-variant opacity-30 px-1 hover:opacity-100 transition-opacity">/</span>
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Lantai {room.floor}</span>
            </div>
            <h3 className="text-6xl font-headline font-extrabold tracking-tighter text-on-surface leading-tight">Kamar {room.id}</h3>
            <p className="text-2xl text-primary font-bold mb-8">{room.type}</p>
          </div>
          <div className="flex items-center gap-12">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Kapasitas</span>
              <span className="text-on-surface font-bold">{room.capacity || "Standard Bedding"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Fasilitas</span>
              <div className="flex flex-wrap gap-4 mt-1 text-on-surface-variant">
                {(() => {
                  const facilities = Array.isArray(room.facilities) 
                    ? room.facilities 
                    : (typeof room.facilities === 'string' ? (room.facilities as string).split(',').map(f => f.trim()) : []);
                  
                  if (facilities.length > 0) {
                    return facilities.map((fac, i) => {
                      const iconMap: Record<string, any> = {
                        'Wifi': Wifi,
                        'AC': Snowflake,
                        'TV': Tv,
                      };
                      const Icon = iconMap[fac] || CheckCircle2;
                      return (
                        <div key={i} className="flex items-center gap-1.5 opacity-70">
                          <Icon size={16} />
                          <span className="text-xs font-bold uppercase tracking-tight">{fac}</span>
                        </div>
                      );
                    });
                  }
                  return (
                    <div className="flex gap-4 text-outline">
                      <Wifi size={18} />
                      <Snowflake size={18} />
                      <Tv size={18} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Current Status Badge */}
        <div className={cn(
          "p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-xl transition-all duration-500",
          room.status === "AVAILABLE" ? (room.hasPendingCheckOut ? "bg-orange-500 text-white" : "bg-status-available text-status-on-available") : 
          room.status === "BOOKED" ? "bg-status-booked text-white" : 
          room.status === "CHECKED-IN" ? "bg-status-checked-in text-white" : "bg-status-checked-out text-on-surface"
        )}>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-4 font-bold">Status Saat Ini</span>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
            {room.status === "AVAILABLE" && !room.hasPendingCheckOut ? <Calendar size={32} /> : <UserCheck size={32} />}
          </div>
          <h4 className="text-3xl font-headline font-bold">
            {room.status === "AVAILABLE" && room.hasPendingCheckOut ? "READY (DUE OUT)" : room.status}
          </h4>

          {room.paymentStatus && (room.status !== "AVAILABLE" || room.hasPendingCheckOut) && (
            <div className={cn(
              "mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ring-1 ring-white/20",
              (room.paymentStatus === "Lunas" || room.paymentStatus === "Lunas Online") ? "bg-emerald-600/60" : "bg-red-600/60 animate-pulse"
            )}>
              {room.paymentStatus}
            </div>
          )}
          
          {(room.guestName || room.hasPendingCheckOut) && (
            <div className="mt-6 pt-6 border-t border-white/20 w-full text-left">
              <p className="text-[9px] uppercase tracking-widest font-black opacity-60 mb-2">Tamu Saat Ini / Terakhir</p>
              <div className="space-y-1">
                <p className="font-extrabold text-lg flex items-center gap-2">
                  <User size={14} className="opacity-70" /> {room.guestName || "---"}
                </p>
                <p className="text-xs font-bold opacity-70 flex items-center gap-2">
                  <Phone size={12} className="opacity-70" /> {room.phoneNumber || "---"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {(isWalkInFormOpen || isEditingGuest) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/5 p-10 rounded-[3rem] border border-primary/20 space-y-8"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-headline font-black text-primary">
              {isEditingGuest ? "Edit Data Tamu" : "Check-in Manual (Walk-in)"}
            </h4>
            <button onClick={() => { setIsWalkInFormOpen(false); setIsEditingGuest(false); }} className="text-outline hover:text-error transition-colors"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <User size={12} /> Nama Tamu *
              </label>
              <input 
                value={walkInGuest.name}
                onChange={e => setWalkInGuest({ ...walkInGuest, name: e.target.value })}
                className="w-full bg-white border-none rounded-2xl p-5 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Phone size={12} /> No. Telepon
              </label>
              <input 
                value={walkInGuest.phoneNumber}
                onChange={e => setWalkInGuest({ ...walkInGuest, phoneNumber: e.target.value })}
                className="w-full bg-white border-none rounded-2xl p-5 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                placeholder="0812..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <CreditCard size={12} /> No. Identitas (KTP/Passport) *
              </label>
              <input 
                value={walkInGuest.idNumber}
                onChange={e => setWalkInGuest({ ...walkInGuest, idNumber: e.target.value })}
                className="w-full bg-white border-none rounded-2xl p-5 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                placeholder="Masukkan NIK atau nomor identitas"
              />
            </div>

            <div className="space-y-4 md:col-span-2 pt-4 border-t border-primary/10 mt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <CreditCard size={12} /> Informasi Pembayaran
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex bg-white rounded-2xl p-1.5 shadow-sm gap-1">
                  <button 
                    onClick={() => setWalkInGuest({ ...walkInGuest, paymentStatus: "Lunas" })}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                      walkInGuest.paymentStatus === "Lunas" ? "bg-emerald-500 text-white shadow-md" : "text-outline/60 hover:bg-emerald-500/5 text-[8px]"
                    )}
                  >
                    Lunas
                  </button>
                  <button 
                    onClick={() => setWalkInGuest({ ...walkInGuest, paymentStatus: "Belum Lunas" })}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                      walkInGuest.paymentStatus === "Belum Lunas" ? "bg-amber-500 text-white shadow-md" : "text-outline/60 hover:bg-amber-500/5 text-[8px]"
                    )}
                  >
                    DP
                  </button>
                  <button 
                    onClick={() => setWalkInGuest({ ...walkInGuest, paymentStatus: "Lunas Online" })}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-dashed border-primary/20",
                      walkInGuest.paymentStatus === "Lunas Online" ? "bg-primary text-white shadow-md" : "text-primary/60 hover:bg-primary/5 text-[8px]"
                    )}
                  >
                    Lunas Online
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-outline/40 font-bold text-sm">Rp</div>
                  <input 
                    type="number"
                    value={walkInGuest.paymentAmount || ""}
                    onChange={e => setWalkInGuest({ ...walkInGuest, paymentAmount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border-none rounded-2xl p-5 pl-12 shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    placeholder="Contoh: 100000"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Tunai", "Transfer", "Debit", "Qris"].map(method => (
                  <button
                    key={method}
                    onClick={() => setWalkInGuest({ ...walkInGuest, paymentMethod: method })}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-tighter border transition-all",
                      walkInGuest.paymentMethod === method 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white text-outline border-outline/10 hover:border-primary/30"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => { setIsWalkInFormOpen(false); setIsEditingGuest(false); }}
              className="flex-1 bg-white text-on-surface-variant py-5 rounded-2xl font-bold transition-all hover:bg-surface-container"
            >
              Batal
            </button>
            <button 
              onClick={() => isEditingGuest ? handleUpdateGuestData() : handleUpdateStatus("CHECKED-IN")}
              disabled={!walkInGuest.name || !walkInGuest.idNumber || loading}
              className="flex-[2] bg-primary text-white py-5 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
            >
              {loading ? "Memproses..." : (isEditingGuest ? "Simpan Perubahan" : "Selesaikan Check-in")}
            </button>
          </div>
        </motion.div>
      )}

      {/* Action Selection */}
      {showActions && (
        <div className="bg-surface-container p-10 rounded-[3rem]">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-8 text-center">Pilih Tindakan Selanjutnya</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <ActionButton 
              icon={<Calendar size={24} />} 
              label="Booking" 
              theme="bg-primary/10 text-primary" 
              hover="hover:bg-primary hover:text-white"
              active={room.status === "AVAILABLE"}
              onClick={() => onBooking && onBooking(room)}
              disabled={loading || isGuest}
            />
            <ActionButton 
              icon={<LogIn size={24} />} 
              label="Check-in" 
              theme="bg-status-available/10 text-status-on-available" 
              hover="hover:bg-status-available hover:text-white"
              active={room.status === "BOOKED"}
              onClick={() => handleUpdateStatus("CHECKED-IN")}
              disabled={loading || isGuest}
            />
            <ActionButton 
              icon={<CalendarX size={24} />} 
              label="Batal" 
              theme="bg-red-500/10 text-red-600" 
              hover="hover:bg-red-500 hover:text-white"
              active={room.status === "BOOKED"}
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin membatalkan booking ini?")) {
                  handleUpdateStatus("CANCELLED");
                }
              }}
              disabled={loading || room.status !== "BOOKED" || isGuest}
            />
            <ActionButton 
              icon={<Edit size={24} />} 
              label="Edit Tamu" 
              theme="bg-blue-500/10 text-blue-600" 
              hover="hover:bg-blue-500 hover:text-white"
              active={false}
              onClick={openEditGuestForm}
              disabled={loading || (!room.guestName && !room.hasPendingCheckOut) || isGuest}
            />
            <ActionButton 
              icon={<LogOut size={24} />} 
              label="Check-out" 
              theme="bg-status-checked-in/10 text-status-on-checked-in"
              hover="hover:bg-status-checked-in hover:text-white"
              active={room.status === "CHECKED-IN" || room.hasPendingCheckOut}
              onClick={() => handleUpdateStatus("CHECKED-OUT")}
              disabled={loading || (room.status !== "CHECKED-IN" && !room.hasPendingCheckOut) || isGuest}
            />
            <ActionButton 
              icon={<X size={24} />} 
              label="Tersedia" 
              theme="bg-primary/10 text-primary" 
              hover="hover:bg-primary hover:text-white"
              onClick={() => handleUpdateStatus("AVAILABLE")}
              disabled={loading || isGuest}
            />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col items-center gap-8 py-10">
        <p className="text-[11px] font-medium text-on-surface-variant text-center max-w-sm leading-relaxed opacity-70">
          {showActions 
            ? "Setiap perubahan status akan langsung tercermin di Dashboard dan database SQL Hotel Monika Yogyakarta."
            : "Anda sedang dalam mode Guest (Pratinjau). Login sebagai staff untuk mengelola status kamar."}
        </p>
        <button onClick={onBack} className="text-on-surface-variant hover:text-primary font-bold text-sm transition-colors uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
          Kembali
        </button>
      </div>
    </motion.div>
  );
}

function ActionButton({ 
  icon, 
  label, 
  theme, 
  hover, 
  disabled,
  active,
  onClick
}: { 
  icon: React.ReactNode; 
  label: string; 
  theme?: string; 
  hover?: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center p-8 rounded-[3rem] transition-all duration-500 border border-outline-variant/10",
        disabled ? "bg-surface-container-low/50 cursor-not-allowed opacity-40 shadow-none hover:shadow-none" : cn("bg-surface-container-lowest shadow-sm hover:shadow-2xl hover:-translate-y-1", theme, hover),
        active && !disabled && "ring-4 ring-primary ring-offset-4 ring-offset-surface-container"
      )}
    >
      <div className={cn(
        "w-16 h-16 rounded-3xl flex items-center justify-center mb-5 transition-all duration-500",
        disabled ? "bg-outline-variant/20" : "bg-current opacity-20 group-hover:bg-white group-hover:scale-110"
      )}>
        <div className="text-current mix-blend-difference">{icon}</div>
      </div>
      <span className="font-extrabold text-lg tracking-tight">{label}</span>
    </button>
  );
}
