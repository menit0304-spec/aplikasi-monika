import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { User, Building2, Calendar, ShieldCheck, ArrowRight, Info, CheckCircle2, Plus, Trash2, Download } from "lucide-react";
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  initialRoomType = "",
  accessMode 
}: { 
  initialRoomNumber?: string, 
  initialRoomType?: string,
  accessMode?: "not-selected" | "guest" | "authorized"
}) {
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookingMode, setBookingMode] = useState<"regular" | "group">("regular");
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

  const maxRegularRooms = 2;
  const [loading, setLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    if (bookingDetails) {
       QRCode.toDataURL(JSON.stringify({
         batchId: bookingDetails.batchId,
         name: bookingDetails.name,
         rooms: bookingDetails.selectedRooms,
         checkIn: bookingDetails.checkIn,
         checkOut: bookingDetails.checkOut
       }), { width: 300 }).then(setQrCode);
    }
  }, [bookingDetails]);

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
    if (bookingMode === "regular" && formData.selectedRooms.length >= maxRegularRooms) {
      alert(`Regular Booking hanya diperbolehkan maksimal ${maxRegularRooms} kamar. Gunakan Group Booking untuk lebih banyak kamar.`);
      return;
    }
    setFormData({
      ...formData,
      selectedRooms: [...formData.selectedRooms, { roomType: "", roomNumber: "" }]
    });
  };

  const handleModeChange = (mode: "regular" | "group") => {
    setBookingMode(mode);
    if (mode === "regular" && formData.selectedRooms.length > maxRegularRooms) {
      setFormData({
        ...formData,
        selectedRooms: formData.selectedRooms.slice(0, maxRegularRooms)
      });
    } else if (mode === "group" && formData.selectedRooms.length < 3) {
      // Ensure group starts with at least 3 if they transition? 
      // User said "more than 2", so 3 is minimum for group.
      const current = [...formData.selectedRooms];
      while (current.length < 3) {
        current.push({ roomType: "", roomNumber: "" });
      }
      setFormData({ ...formData, selectedRooms: current });
    }
  };

  const removeRoom = (index: number) => {
    const minRooms = bookingMode === "group" ? 3 : 1;
    if (formData.selectedRooms.length <= minRooms) {
      if (bookingMode === "group") {
        alert("Group Booking minimal harus 3 kamar. Gunakan Regular Booking untuk pesanan yang lebih sedikit.");
      }
      return;
    }
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

      const res = await createReservation({
        name: formData.name,
        idNumber: formData.idNumber,
        phoneNumber: formData.phoneNumber,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        totalNights: nights,
        rooms: roomPayload,
        paymentMethod: formData.paymentMethod,
        downPayment: formData.downPayment,
        batchId: `B-${Date.now()}`
      });
      setBookingDetails({ ...formData, batchId: res.batchId });
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

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("SURAT KONFIRMASI BOOKING", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Kode Booking: ${bookingDetails.batchId}`, 20, 40);
    doc.text(`Nama: ${bookingDetails.name}`, 20, 50);
    doc.text(`No HP: ${bookingDetails.phoneNumber}`, 20, 60);
    doc.text(`Check-in: ${bookingDetails.checkIn}`, 20, 70);
    doc.text(`Check-out: ${bookingDetails.checkOut}`, 20, 80);
    
    // Multi-room summary
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Rooms table
    autoTable(doc, {
        startY: 90,
        head: [['Kamar', 'Tipe']],
        body: bookingDetails.selectedRooms.map((r: any) => [r.roomNumber, r.roomType])
    });

    // Terms
    doc.setFontSize(10);
    doc.setTextColor(255, 0, 0); // Red for warning
    doc.text("PERHATIAN:", 20, (doc as any).lastAutoTable.finalY + 15);
    doc.text(`Batas pembayaran DP/Lunas: ${expiryDate}`, 20, (doc as any).lastAutoTable.finalY + 20);
    doc.text("Max pembayaran 1x24 jam.", 20, (doc as any).lastAutoTable.finalY + 25);
    doc.text("Apabila tidak ada DP atau pelunasan dalam waktu tersebut, booking dianggap batal secara otomatis.", 20, (doc as any).lastAutoTable.finalY + 30);
    
    // Payment Details
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setFont("helvetica", "bold");
    doc.text("INFORMASI PEMBAYARAN:", 20, (doc as any).lastAutoTable.finalY + 42);
    doc.setFont("helvetica", "normal");
    doc.text("Bank BCA: 1690232363", 20, (doc as any).lastAutoTable.finalY + 48);
    doc.text("A/N: Dewi Yuni Widyantari", 20, (doc as any).lastAutoTable.finalY + 54);

    // Check-in Terms (Ketentuan Check-in)
    doc.setFont("helvetica", "bold");
    doc.text("KETENTUAN CHECK-IN:", 20, (doc as any).lastAutoTable.finalY + 65);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("1. Wajib menunjukkan Kode Booking dan Kartu Identitas (KTP/Passport) asli.", 20, (doc as any).lastAutoTable.finalY + 72);
    doc.text("2. Waktu check-in standard adalah pukul 14:00 WIB.", 20, (doc as any).lastAutoTable.finalY + 78);
    doc.text("3. Hubungi kami jika Anda berencana check-in di luar jam standard.", 20, (doc as any).lastAutoTable.finalY + 84);

    // QR Code
    if (qrCode) {
        doc.addImage(qrCode, 'PNG', 80, (doc as any).lastAutoTable.finalY + 95, 50, 50);
    }
    
    doc.save(`Booking_${bookingDetails.batchId}.pdf`);
  };

  if (bookingDetails) {
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
        <p className="text-on-surface-variant mb-4 text-sm">Kode Booking: <span className="font-bold text-lg">{bookingDetails.batchId}</span></p>
        <div className="bg-error/10 p-4 rounded-2xl mb-6">
          <p className="text-error text-xs font-bold uppercase tracking-widest mb-1">Batas Waktu Pembayaran (1x24 Jam)</p>
          <p className="text-error font-black text-lg">
            {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="text-error/70 text-[10px] mt-1 font-medium italic">
            Booking batal otomatis jika tidak ada pembayaran DP/Lunas sebelum waktu di atas.
          </p>
        </div>
        
        {qrCode && (
          <div className="mb-8 flex justify-center">
            <img src={qrCode} alt="QR Code Booking" className="w-48 h-48" />
          </div>
        )}
        
        <div className="bg-primary/5 p-6 rounded-2xl mb-6 border border-primary/10 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Informasi Pembayaran</p>
          <div className="space-y-1">
            <p className="text-sm font-bold text-on-surface">Bank BCA</p>
            <p className="text-xl font-headline font-black text-primary tracking-tight">1690232363</p>
            <p className="text-xs font-bold text-on-surface-variant">a/n Dewi Yuni Widyantari</p>
          </div>
        </div>

        <div className="text-left text-sm space-y-2 mb-6 bg-surface-container-low p-6 rounded-2xl">
          <p><strong>Nama:</strong> {bookingDetails.name}</p>
          <p><strong>No HP:</strong> {bookingDetails.phoneNumber}</p>
          <p><strong>Check-in:</strong> {bookingDetails.checkIn}</p>
          <p><strong>Check-out:</strong> {bookingDetails.checkOut}</p>
          <p><strong>Kamar:</strong> {bookingDetails.selectedRooms.map((r:any) => r.roomNumber).join(', ')}</p>
        </div>

        <div className="text-left text-xs bg-secondary/5 p-6 rounded-2xl mb-10 border border-secondary/10">
          <p className="font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
            <Info size={14} /> Ketentuan Check-in
          </p>
          <ul className="space-y-2 text-on-surface/70 list-disc pl-4 font-medium">
            <li>Siapkan <strong>Kode Booking</strong> & <strong>ID Asli</strong> (KTP/Passport).</li>
            <li>Standard check-in mulai pukul <strong>14:00 WIB</strong>.</li>
            <li>Konfirmasi ulang jika berencana check-in lewat jam operasional.</li>
          </ul>
        </div>

        <button 
          onClick={downloadPDF}
          className="bg-secondary text-on-secondary px-10 py-4 rounded-2xl font-bold mb-4 shadow-xl w-full flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Download PDF Konfirmasi
        </button>

        <button 
          onClick={() => {
            setBookingDetails(null);
            setFormData({
              name: "",
              idNumber: "",
              phoneNumber: "",
              selectedRooms: [{ roomType: "", roomNumber: "" }],
              checkIn: "",
              checkOut: "",
              paymentMethod: "Tunai",
              downPayment: 0
            });
          }}
          className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 w-full"
        >
          Tutup & Buat Baru
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
      <div className="space-y-6">
        <div className="space-y-3">
          <span className="text-primary font-headline font-extrabold text-xs tracking-[0.2em] uppercase">Reservation System</span>
          <h2 className="text-5xl font-headline font-extrabold tracking-tighter text-on-surface leading-tight">Create Booking</h2>
          <p className="text-on-surface-variant text-lg font-medium max-w-xl leading-relaxed opacity-70">
            Pilih metode reservasi yang sesuai dengan kebutuhan Anda.
          </p>
        </div>

        {/* Sub-page Selector */}
        <div className="flex bg-white p-1.5 rounded-3xl border border-outline-variant/10 shadow-sm w-fit">
          <button 
            onClick={() => handleModeChange("regular")}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              bookingMode === "regular" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-outline hover:bg-surface-container"
            )}
          >
            Regular Booking (Max 2)
          </button>
          <button 
            onClick={() => handleModeChange("group")}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              bookingMode === "group" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-outline hover:bg-surface-container"
            )}
          >
            Group Booking (3+ Kamar)
          </button>
        </div>
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

          {/* Section 2: Timeline */}
          <div className="md:col-span-12 bg-white p-10 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] border border-outline-variant/5">
            <div className="flex items-center gap-4 mb-10 text-primary">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Calendar size={24} />
              </div>
              <h3 className="font-headline font-extrabold text-2xl tracking-tight">Stay Timeline</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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

          {/* Section 3: Unit Selection (Multi) */}
          <div className="md:col-span-12 space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] border border-outline-variant/5">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4 text-primary">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Building2 size={24} />
                  </div>
                  <h3 className="font-headline font-extrabold text-2xl tracking-tight">Room List</h3>
                  <span className="text-[10px] font-bold text-outline-variant bg-surface-container px-2 py-0.5 rounded-full ml-4">
                    {bookingMode === "regular" ? "Max 2 Kamar" : "Min 3 Kamar"}
                  </span>
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

              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 no-scrollbar">
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
