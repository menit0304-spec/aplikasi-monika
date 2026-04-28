import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Receipt,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  DollarSign,
  X,
  ChevronDown,
  Tag,
  Percent,
  Banknote,
  Download,
  RefreshCw
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchReservations, updatePaymentStatus, fetchRooms } from "../services/dataService";
import { Reservation, Room } from "../types";
import { cn } from "../lib/utils";

export default function PaymentOverview({ initialSearch = "", onSearchClear }: { initialSearch?: string, onSearchClear?: () => void }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Lunas" | "Belum Lunas">("All");
  const [roomFilter, setRoomFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Update search term when prop changes
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: 0, // This will be the NEW amount being paid now
    alreadyPaid: 0, // amount_paid (which includes DP) already in DB
    totalBill: 0,
    paymentMethod: "Tunai",
    discountType: "None",
    discountAmount: 0,
    status: "Lunas" as "Lunas" | "Belum Lunas"
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchReservations(), fetchRooms()])
      .then(([reservationsData, roomsData]) => {
        if (Array.isArray(reservationsData)) {
          setReservations(reservationsData);
        }
        if (Array.isArray(roomsData)) {
          setRooms(roomsData);
        }
      })
      .catch((err) => {
        console.error("Failed to load payment data:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentDialog = (res: Reservation) => {
    const alreadyPaid = (res.amount_paid || 0); 
    const totalBill = res.total_payment - (res.discount_amount || 0);
    const remaining = Math.max(0, totalBill - alreadyPaid);
    
    setSelectedRes(res);
    setPaymentForm({
      amountPaid: remaining, // Suggest paying the rest by default
      alreadyPaid: alreadyPaid,
      totalBill: totalBill,
      paymentMethod: res.payment_method || "Tunai",
      discountType: res.discount_type || "None",
      discountAmount: res.discount_amount || 0,
      status: (res.payment_status as any) || (remaining <= 0 ? "Lunas" : "Belum Lunas")
    });

    // Fetch transaction history
    setLoadingTransactions(true);
    fetch(`/api/reservations/${res.id}/transactions`)
      .then(r => r.json())
      .then(data => setTransactions(data))
      .catch(e => console.error("History error:", e))
      .finally(() => setLoadingTransactions(false));
  };

  const generateInvoicePDF = (res: Reservation) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('id-ID');
    
    // Header
    const logo = '/logo.png';
    doc.addImage(logo, 'PNG', 14, 10, 40, 40);
    doc.setFontSize(22);
    doc.setTextColor(26, 28, 28);
    doc.text("HOTEL MONIKA", 60, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Yogyakarta Management System", 60, 28);
    doc.text(`Tanggal: ${date}`, 60, 34);
    
    doc.setFontSize(14);
    doc.setTextColor(26, 28, 28);
    doc.text("INVOICE PEMBAYARAN", 14, 48);
    doc.setFontSize(10);
    doc.text(`ID Transaksi: #${res.id}`, 14, 54);
    
    // Horizontal Line
    doc.setDrawColor(230);
    doc.line(14, 60, 196, 60);
    
    // Details Section
    doc.setFontSize(10);
    doc.text("INFORMASI TAMU:", 14, 70);
    doc.setFont("helvetica", "bold");
    doc.text(res.guest_name || "Guest Name", 14, 76);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`NIK: ${res.guest_id_number || '-'}`, 14, 82);
    doc.text(`Tel: ${res.guest_phone || '-'}`, 14, 86);
    doc.setFontSize(10);
    
    doc.text("DETAIL UNIT:", 120, 70);
    doc.setFont("helvetica", "bold");
    doc.text(`Kamar ${res.room_number}`, 120, 76);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Tipe: ${res.room_type || 'Unknown'}`, 120, 82);
    doc.text(`Durasi: ${res.total_nights} Malam`, 120, 86);
    doc.text(`Check-in: ${res.check_in}`, 120, 90);
    doc.text(`Check-out: ${res.check_out}`, 120, 94);
    
    // Table Breakdown
    autoTable(doc, {
      startY: 105,
      head: [['Deskripsi', 'Jumlah']],
      body: [
        ['Total Biaya Kamar', `Rp ${res.total_payment.toLocaleString()}`],
        ['Potongan Harga (' + (res.discount_type || 'None') + ')', `- Rp ${(res.discount_amount || 0).toLocaleString()}`],
        ['Pajak & Layanan', 'Termasuk'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [26, 28, 28], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Payment Summary Table
    autoTable(doc, {
      startY: finalY,
      head: [['Ringkasan Pembayaran', 'Status: ' + (res.payment_status || 'Belum Lunas')]],
      body: [
        ['Sudah Dibayar (DP)', `Rp ${(res.down_payment || 0).toLocaleString()}`],
        ['Metode Pembayaran', res.payment_method || 'Tunai'],
        ['Total Tagihan Bersih', `Rp ${(res.total_payment - (res.discount_amount || 0)).toLocaleString()}`],
        ['Kekurangan/Sisa', `Rp ${(Math.max(0, res.total_payment - (res.discount_amount || 0) - (res.amount_paid || res.down_payment || 0))).toLocaleString()}`],
      ],
      theme: 'grid',
      styles: { cellPadding: 5 },
      headStyles: { fillColor: res.payment_status === "Lunas" ? [16, 185, 129] : [249, 115, 22] },
      margin: { left: 14, right: 14 }
    });
    
    // Footer
    const lastY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Terima kasih telah memilih Hotel Monika Yogyakarta.", 14, lastY);
    doc.text("Dokumen ini adalah bukti transaksi resmi sistem manajemen Monika.", 14, lastY + 5);
    
    // Save
    doc.save(`Invoice_Monika_${res.guest_name}_${res.id}.pdf`);
  };

  const handleApplyDiscount = (type: string) => {
    if (!selectedRes) return;
    let amount = 0;
    if (type === "Tamu Langganan") amount = Math.floor(selectedRes.total_payment * 0.1);
    else if (type === "Diskon Khusus") amount = Math.floor(selectedRes.total_payment * 0.15);
    else if (type === "Diskon Owner") amount = Math.floor(selectedRes.total_payment * 0.5);
    
    setPaymentForm(prev => ({
      ...prev,
      discountType: type,
      discountAmount: amount,
      amountPaid: selectedRes.total_payment - amount
    }));
  };

  const generateTransactionReceipt = (res: Reservation, trans: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(33, 33, 33);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BUKTI PEMBAYARAN", 14, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("HOTEL MONIKA YOGYAKARTA", 140, 20);
    doc.text("Jl. Prawirotaman, Yogyakarta", 140, 25);
    doc.text("Tel: +62 812-3456-7890", 140, 30);
    
    // Receipt Info
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(12);
    doc.text(`No. Kwitansi: TRX-${trans.id?.slice(-8).toUpperCase()}`, 14, 55);
    doc.text(`Tanggal: ${new Date(trans.timestamp).toLocaleString('id-ID')}`, 14, 62);
    
    // Guest Info Box
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 75, 182, 35, 3, 3, "FD");
    
    doc.setFontSize(10);
    doc.text("DITERIMA DARI:", 20, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(res.guest_name || "Guest Name", 20, 95);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("UNTUK UNIT:", 120, 85);
    doc.setFont("helvetica", "bold");
    doc.text(`Unit ${res.room_number}`, 120, 95);
    doc.text(res.room_type || "", 120, 100);
    
    // Payment Details
    doc.setFont("helvetica", "normal");
    doc.text("KETERANGAN PEMBAYARAN:", 14, 130);
    doc.setLineWidth(0.5);
    doc.line(14, 133, 196, 133);
    
    doc.setFontSize(12);
    doc.text(trans.type === 'DP' ? "Down Payment (Uang Muka)" : "Pelunasan / Cicilan", 14, 145);
    doc.text("Metode:", 14, 155);
    doc.text(trans.payment_method || "Tunai", 50, 155);
    
    // Amount Box
    doc.setFillColor(245, 245, 245);
    doc.rect(120, 140, 76, 25, "F");
    doc.setFontSize(10);
    doc.text("JUMLAH:", 125, 148);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rp ${trans.amount?.toLocaleString('id-ID')}`, 125, 158);
    
    // Total Remaining Summary
    const totalBill = res.total_payment - (res.discount_amount || 0);
    const remainingAfterThis = Math.max(0, totalBill - res.amount_paid);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Status Setelah Transaksi:", 14, 180);
    doc.text(remainingAfterThis <= 0 ? "LUNAS" : `SISA TAGIHAN: Rp ${remainingAfterThis.toLocaleString('id-ID')}`, 14, 188);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Dokumen ini dihasilkan secara digital dan merupakan bukti pembayaran yang sah.", 105, 280, { align: "center" });
    
    doc.save(`Kwitansi_${res.guest_name}_${trans.type}.pdf`);
  };

  const submitPayment = async () => {
    if (!selectedRes) return;
    setLoading(true);
    
    // We update the total amount_paid by adding the new payment
    const newTotalPaid = paymentForm.alreadyPaid + paymentForm.amountPaid;
    const isLunas = paymentForm.status === "Lunas" || (newTotalPaid >= (selectedRes.total_payment - paymentForm.discountAmount));

    try {
      console.log("Submitting payment for:", selectedRes.id, {
        status: isLunas ? "Lunas" : "Belum Lunas",
        amountPaid: newTotalPaid,
      });

      const response = await updatePaymentStatus(selectedRes.id, {
        status: isLunas ? "Lunas" : "Belum Lunas",
        amountPaid: newTotalPaid,
        downPayment: selectedRes.down_payment || 0,
        paymentMethod: paymentForm.paymentMethod,
        discountType: paymentForm.discountType,
        discountAmount: paymentForm.discountAmount
      });
      
      console.log("Payment response:", response);
      setSelectedRes(null);
      loadData(); 
    } catch (error: any) {
      console.error("Payment error detail:", error);
      alert(`Gagal memperbarui pembayaran: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(res => {
    const matchesStatus = filter === "All" || res.payment_status === filter;
    const matchesRoom = roomFilter === "All" || res.room_number?.toString() === roomFilter.toString();
    const matchesSearch = !searchTerm || 
      (res.guest_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (res.room_number?.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (res.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesRoom && matchesSearch;
  });

  const totalIncome = reservations
    .reduce((sum, res) => sum + (res.amount_paid || 0), 0);

  const pendingIncome = reservations
    .reduce((sum, res) => sum + Math.max(0, (res.total_payment - (res.discount_amount || 0)) - (res.amount_paid || 0)), 0);

  if (loading && reservations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-6 pt-8 space-y-10 pb-32"
    >
      {/* Header & Stats */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">Financial Module</span>
            <h2 className="text-5xl font-extrabold font-headline tracking-tighter text-on-surface leading-tight">Pembayaran</h2>
            <p className="text-on-surface-variant opacity-60 text-sm">Kelola transaksi, invoice, dan status pembayaran tamu.</p>
          </div>
          
            <div className="flex gap-4">
              <button 
                onClick={loadData}
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-outline-variant/10 hover:bg-primary hover:text-white transition-all active:scale-95"
                title="Seringkan Data"
              >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
             <StatCard 
              icon={<TrendingUp size={16} className="text-emerald-500" />} 
              label="Total Lunas" 
              value={`Rp ${(totalIncome/1000).toFixed(0)}k`} 
              className="bg-emerald-500/5 border-emerald-500/10"
            />
            <StatCard 
              icon={<Clock size={16} className="text-orange-500" />} 
              label="Pending" 
              value={`Rp ${(pendingIncome/1000).toFixed(0)}k`}
              className="bg-orange-500/5 border-orange-500/10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low p-2 rounded-[2rem] border border-outline-variant/10">
            <div className="flex p-1 gap-1 overflow-x-auto no-scrollbar">
              {["All", "Lunas", "Belum Lunas"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    filter === f ? "bg-white text-primary shadow-sm ring-1 ring-outline-variant/5" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
               <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline/40" />
               <input 
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (onSearchClear) onSearchClear();
                }}
                className="w-full pl-12 pr-4 py-3 bg-white/50 border-none rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
               />
               {searchTerm && (
                 <button 
                  onClick={() => {
                    setSearchTerm("");
                    if (onSearchClear) onSearchClear();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 hover:text-error"
                 >
                   <X size={14} />
                 </button>
               )}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low/50 p-3 rounded-[2rem] border border-outline-variant/5 overflow-hidden">
            <div className="flex items-center gap-2 px-4 shrink-0 border-r border-outline-variant/20 mr-2">
               <Filter size={14} className="text-primary" />
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Filter Kamar</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setRoomFilter("All")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  roomFilter === "All" ? "bg-primary text-white" : "bg-white/50 text-on-surface-variant border border-outline-variant/10"
                )}
              >
                Semua
              </button>
              {Array.from(new Set(rooms.map(r => r.id))).sort().map(roomId => (
                <button
                  key={roomId}
                  onClick={() => setRoomFilter(roomId)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    roomFilter === roomId ? "bg-primary text-white" : "bg-white/50 text-on-surface-variant border border-outline-variant/10"
                  )}
                >
                  Unit {roomId}
                </button>
              ))}
            </div>
          </div>
        </div>

        {roomFilter !== "All" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem] flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Ringkasan Transaksi</p>
                <h4 className="text-xl font-black font-headline">Unit {roomFilter}</h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Total Pendapatan</p>
              <p className="text-2xl font-black font-headline text-primary">
                Rp {reservations
                  .filter(res => res.room_number === roomFilter && res.payment_status === "Lunas")
                  .reduce((sum, res) => sum + (res.amount_paid || res.total_payment), 0)
                  .toLocaleString('id-ID')}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Transaction List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredReservations.map((res, idx) => (
          <motion.div
            key={res.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group bg-white p-6 rounded-[2rem] border border-outline-variant/10 flex flex-col md:flex-row items-center gap-6 hover:shadow-xl hover:shadow-on-surface/5 transition-all"
          >
            <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Receipt size={24} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-black font-headline tracking-tight truncate">{res.guest_name}</h4>
                  {res.payment_method && (
                    <span className="px-3 py-1 bg-surface-container rounded-full text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 border border-primary/5">
                      {res.payment_method === 'Transfer Bank' ? <CreditCard size={10} /> : res.payment_method === 'Tunai' ? <Banknote size={10} /> : <Receipt size={10} />}
                      {res.payment_method}
                    </span>
                  )}
                  {res.batch_id && (
                    <span className="px-2 py-0.5 bg-outline-variant/10 rounded text-[8px] font-black uppercase tracking-[0.2em] text-outline">
                      Batch {res.batch_id.slice(-4)}
                    </span>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Unit {res.room_number}</span>
                    {res.room_type && <span className="text-[9px] font-medium text-outline/50 italic">({res.room_type})</span>}
                  </div>
                  <span className="w-1 h-1 bg-outline-variant/30 rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                     <Clock size={10} /> {res.total_nights} Malam
                  </span>
                  <span className="w-1 h-1 bg-outline-variant/30 rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline">{res.check_in}</span>
                    <span className="text-[10px] font-bold text-outline/30">Sampai</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline">{res.check_out}</span>
                  </div>
                </div>
                {res.guest_phone && (
                  <p className="text-[9px] font-medium text-outline/60 mt-1 uppercase tracking-widest">Phone: {res.guest_phone}</p>
                )}
              </div>
              <div className="flex flex-col md:items-end min-w-[max-content]">
                <span className="text-xl font-black font-headline tracking-tighter">
                  Rp {(res.amount_paid || (res.total_payment - (res.discount_amount || 0))).toLocaleString('id-ID')}
                </span>
                <div className="flex flex-col items-end gap-1 mt-1">
                  {res.down_payment ? (
                    <div className="flex items-center gap-1.5 opacity-60">
                      <span className="text-[9px] font-bold uppercase tracking-widest">DP: Rp {res.down_payment.toLocaleString()}</span>
                      <span className="w-1 h-1 bg-outline-variant/30 rounded-full" />
                      <span className="text-[9px] font-bold text-error uppercase tracking-widest">Sisa: Rp {(res.total_payment - (res.discount_amount || 0) - res.down_payment).toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5">
                    {res.discount_amount && (
                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">-{res.discount_amount.toLocaleString()}</span>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-outline/60">Total Bayar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              {/* Primary Action Button */}
              <button
                onClick={() => openPaymentDialog(res)}
                className={cn(
                  "w-full md:w-64 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 group/btn",
                  res.payment_status === "Lunas" 
                    ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                    : "bg-primary text-white shadow-primary/30 hover:scale-[1.02] hover:-translate-y-0.5"
                )}
              >
                {res.payment_status === "Lunas" ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Sudah Lunas</span>
                  </>
                ) : (
                  <>
                    <Banknote size={16} className="group-hover/btn:rotate-12 transition-transform" />
                    <span>Bayar Sekarang</span>
                  </>
                )}
              </button>
              
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => openPaymentDialog(res)}
                  className="flex-1 md:w-14 md:h-14 md:flex-none bg-surface-container rounded-2xl flex flex-col items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all active:scale-90 border border-outline-variant/10"
                  title="Detail & History"
                >
                  <ArrowUpRight size={20} />
                  <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Detail</span>
                </button>

                <button 
                  onClick={() => generateInvoicePDF(res)}
                  className="flex-1 md:w-14 md:h-14 md:flex-none bg-surface-container rounded-2xl flex flex-col items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all active:scale-90 border border-outline-variant/10"
                  title="Cetak Invoice"
                >
                  <Download size={20} />
                  <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Struk</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredReservations.length === 0 && (
          <div className="py-24 text-center space-y-4 opacity-30">
            <CreditCard size={48} className="mx-auto" />
            <p className="font-headline font-black text-xl uppercase tracking-widest">Tidak ada transaksi ditemukan</p>
          </div>
        )}
      </div>

      {/* Payment Dialog Modal */}
      <AnimatePresence>
        {selectedRes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRes(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex items-center justify-between bg-surface-container-low">
                <div>
                  <h3 className="text-2xl font-black font-headline tracking-tight">Detail Pembayaran</h3>
                  <p className="text-sm text-outline font-bold uppercase tracking-widest mt-1">Invoice #{selectedRes.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedRes(null)}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-outline hover:text-error transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-8 overflow-y-auto">
                {/* Guest Summary Card */}
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Registrasi Tamu</p>
                      <p className="text-xl font-black">{selectedRes.guest_name}</p>
                      {selectedRes.guest_phone && <p className="text-[10px] font-bold text-outline uppercase tracking-widest leading-none">Tel: {selectedRes.guest_phone}</p>}
                      {selectedRes.guest_id_number && <p className="text-[10px] font-bold text-outline uppercase tracking-widest leading-none">NIK: {selectedRes.guest_id_number}</p>}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Unit Kamar</p>
                      <p className="text-xl font-black">Unit {selectedRes.room_number}</p>
                      {selectedRes.room_type && <p className="text-[10px] font-bold text-outline uppercase tracking-widest leading-none italic">{selectedRes.room_type}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4 border-t border-primary/10">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Check-In</p>
                      <p className="font-bold text-sm">{selectedRes.check_in}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Durasi</p>
                      <p className="font-bold text-sm">{selectedRes.total_nights} Malam</p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Check-Out</p>
                      <p className="font-bold text-sm">{selectedRes.check_out}</p>
                    </div>
                  </div>
                </div>

                {/* Transaction History Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                    <Clock size={12} className="text-primary" /> Riwayat Pembayaran
                  </label>
                  <div className="bg-surface-container-low/50 rounded-3xl border border-outline-variant/10 overflow-hidden">
                    {loadingTransactions ? (
                      <div className="p-6 text-center text-[10px] font-bold uppercase tracking-widest text-outline/40">Memuat riwayat...</div>
                    ) : transactions.length === 0 ? (
                      <div className="p-6 text-center text-[10px] font-bold uppercase tracking-widest text-outline/40 italic">Belum ada catatan transaksi</div>
                    ) : (
                      <div className="divide-y divide-outline-variant/10">
                        {transactions.map((t, i) => (
                          <div key={t.id || i} className="p-4 flex items-center justify-between hover:bg-white/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black",
                                t.type === 'DP' ? "bg-emerald-500/10 text-emerald-600" : 
                                t.type === 'Angsuran' ? "bg-amber-500/10 text-amber-600" :
                                "bg-primary/10 text-primary"
                              )}>
                                {t.type === 'DP' ? 'DP' : t.type === 'Angsuran' ? 'A' : 'P'}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-black">
                                  {t.type === 'DP' ? 'Uang Muka' : t.type === 'Angsuran' ? 'Angsuran' : 'Pelunasan'}
                                </p>
                                <div className="flex items-center gap-2 text-[8px] font-bold text-outline/60 uppercase tracking-wider">
                                  <span>{t.payment_method}</span>
                                  <span className="w-0.5 h-0.5 bg-outline-variant/30 rounded-full" />
                                  <span>{t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-on-surface">
                                Rp {t.amount?.toLocaleString()}
                              </span>
                              <button 
                                onClick={() => generateTransactionReceipt(selectedRes!, t)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Download Struk"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Potongan Harga (Discounts) */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                       <Tag size={12} className="text-primary" /> Potongan Harga
                    </label>
                    <div className="flex flex-col gap-2">
                      {["None", "Tamu Langganan", "Diskon Khusus", "Diskon Owner"].map((type) => (
                        <button
                          key={type}
                          onClick={() => handleApplyDiscount(type)}
                          className={cn(
                            "text-left px-5 py-3.5 rounded-2xl text-xs font-bold transition-all border flex items-center justify-between group",
                            paymentForm.discountType === type 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-white border-outline-variant/10 text-on-surface hover:border-primary/40"
                          )}
                        >
                          <span>{type}</span>
                          {type !== "None" && (
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full",
                              paymentForm.discountType === type ? "bg-white/20 text-white" : "bg-primary/5 text-primary"
                            )}>
                              {type === "Tamu Langganan" ? "10%" : type === "Diskon Khusus" ? "15%" : type === "Diskon Owner" ? "50%" : ""}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                         <CreditCard size={12} className="text-primary" /> Cara Pembayaran
                       </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Tunai", "Transfer Bank", "Debit/QRIS"].map((m) => (
                          <button
                            key={m}
                            onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: m })}
                            className={cn(
                              "px-3 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              paymentForm.paymentMethod === m 
                                ? "bg-on-surface text-white border-on-surface shadow-md" 
                                : "bg-white border-outline-variant/10 text-outline hover:border-outline"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                         <Wallet size={12} className="text-primary" /> Tambah Pembayaran
                       </label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-outline/50">Rp</span>
                        <input 
                          type="number"
                          value={paymentForm.amountPaid}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const totalBill = selectedRes.total_payment - paymentForm.discountAmount;
                            const newTotal = paymentForm.alreadyPaid + val;
                            setPaymentForm({ 
                              ...paymentForm, 
                              amountPaid: val,
                              status: newTotal >= totalBill ? "Lunas" : "Belum Lunas"
                            });
                          }}
                          className="w-full pl-12 pr-5 py-4 bg-surface-container-low border-none rounded-2xl font-black text-lg focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                         Status Akhir
                       </label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Belum Lunas", "Lunas"].map((st) => (
                           <button
                            key={st}
                            onClick={() => setPaymentForm({ ...paymentForm, status: st as any })}
                            className={cn(
                              "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              paymentForm.status === st 
                                ? (st === "Lunas" ? "bg-emerald-500 text-white border-emerald-500" : "bg-orange-500 text-white border-orange-500")
                                : "bg-white border-outline-variant/10 text-outline hover:border-outline"
                            )}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="bg-surface-container p-8 rounded-[2rem] space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black text-outline uppercase tracking-widest opacity-60">
                      <span>Subtotal Tagihan</span>
                      <span>Rp {selectedRes.total_payment.toLocaleString()}</span>
                   </div>
                   {paymentForm.discountAmount > 0 && (
                     <div className="flex justify-between items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        <span>Potongan ({paymentForm.discountType})</span>
                        <span>- Rp {paymentForm.discountAmount.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center text-[10px] font-black text-primary/60 uppercase tracking-widest">
                      <span>Sudah Dibayar (Termasuk DP)</span>
                      <span>- Rp {paymentForm.alreadyPaid.toLocaleString()}</span>
                   </div>
                   <div className="h-px bg-outline-variant/30 my-2" />
                   <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black font-headline tracking-widest uppercase text-outline">Sisa Tagihan</span>
                        <p className="text-[8px] text-outline/40 leading-none">Setelah pembayaran baru: Rp {Math.max(0, selectedRes.total_payment - paymentForm.discountAmount - paymentForm.alreadyPaid - paymentForm.amountPaid).toLocaleString()}</p>
                      </div>
                      <span className="text-3xl font-black font-headline tracking-tighter text-error">
                        Rp {(Math.max(0, selectedRes.total_payment - paymentForm.discountAmount - paymentForm.alreadyPaid)).toLocaleString()}
                      </span>
                   </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 pt-0 bg-white">
                <div className="flex gap-4">
                  <button 
                    onClick={() => generateInvoicePDF(selectedRes)}
                    className="flex-1 bg-surface-container text-on-surface py-5 rounded-[2rem] font-black font-headline text-lg border border-outline-variant/10 flex items-center justify-center gap-3 hover:bg-white hover:shadow-xl transition-all"
                  >
                    <Download size={20} />
                    Cetak Invoice
                  </button>
                  <button 
                    onClick={submitPayment}
                    disabled={loading}
                    className="flex-[2] bg-primary text-white py-5 rounded-[2rem] font-black font-headline text-xl shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? "Menyimpan..." : (
                      <>
                        <CheckCircle2 size={24} />
                        Simpan & Selesai
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ icon, label, value, className }: { icon: React.ReactNode, label: string, value: string, className?: string }) {
  return (
    <div className={cn("p-4 px-6 rounded-3xl border flex flex-col gap-1 min-w-[140px]", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <span className="text-xl font-black font-headline tracking-tighter">{value}</span>
    </div>
  );
}
