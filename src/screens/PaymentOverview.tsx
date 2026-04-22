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
  Download
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchReservations, updatePaymentStatus } from "../services/dataService";
import { Reservation } from "../types";
import { cn } from "../lib/utils";

export default function PaymentOverview() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Lunas" | "Belum Lunas">("All");
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  
  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: 0,
    downPayment: 0,
    paymentMethod: "Tunai",
    discountType: "None",
    discountAmount: 0,
    status: "Lunas" as "Lunas" | "Belum Lunas"
  });

  const loadData = () => {
    setLoading(true);
    fetchReservations()
      .then(data => {
        if (Array.isArray(data)) {
          setReservations(data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentDialog = (res: Reservation) => {
    setSelectedRes(res);
    setPaymentForm({
      amountPaid: res.amount_paid || res.total_payment - (res.discount_amount || 0),
      downPayment: res.down_payment || 0,
      paymentMethod: res.payment_method || "Tunai",
      discountType: res.discount_type || "None",
      discountAmount: res.discount_amount || 0,
      status: (res.payment_status as any) || "Lunas"
    });
  };

  const generateInvoicePDF = (res: Reservation) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('id-ID');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(26, 28, 28);
    doc.text("HOTEL MONIKA", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Yogyakarta Management System", 14, 28);
    doc.text(`Tanggal: ${date}`, 14, 34);
    
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
    
    doc.text("DETAIL UNIT:", 120, 70);
    doc.setFont("helvetica", "bold");
    doc.text(`Kamar ${res.room_number}`, 120, 76);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipe: ${res.total_nights} Malam`, 120, 82);
    doc.text(`Check-in: ${res.check_in}`, 120, 88);
    
    // Table Breakdown
    autoTable(doc, {
      startY: 100,
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

  const submitPayment = async () => {
    if (!selectedRes) return;
    setLoading(true);
    try {
      await updatePaymentStatus(selectedRes.id, {
        status: paymentForm.status,
        amountPaid: paymentForm.amountPaid,
        downPayment: paymentForm.downPayment,
        paymentMethod: paymentForm.paymentMethod,
        discountType: paymentForm.discountType,
        discountAmount: paymentForm.discountAmount
      });
      setReservations(prev => prev.map(r => 
        r.id === selectedRes.id ? { 
          ...r, 
          payment_status: paymentForm.status,
          amount_paid: paymentForm.amountPaid,
          down_payment: paymentForm.downPayment,
          payment_method: paymentForm.paymentMethod,
          discount_type: paymentForm.discountType,
          discount_amount: paymentForm.discountAmount
        } : r
      ));
      setSelectedRes(null);
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui pembayaran.");
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(res => {
    if (filter === "All") return true;
    return res.payment_status === filter;
  });

  const totalIncome = reservations
    .filter(res => res.payment_status === "Lunas")
    .reduce((sum, res) => sum + (res.amount_paid || res.total_payment), 0);

  const pendingIncome = reservations
    .filter(res => res.payment_status === "Belum Lunas")
    .reduce((sum, res) => sum + (res.total_payment - (res.discount_amount || 0)), 0);

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
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low p-2 rounded-[2rem] border border-outline-variant/10">
          <div className="flex p-1 gap-1">
            {["All", "Lunas", "Belum Lunas"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
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
              className="w-full pl-12 pr-4 py-3 bg-white/50 border-none rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
             />
          </div>
        </div>
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
                <h4 className="text-lg font-black font-headline tracking-tight truncate">{res.guest_name}</h4>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Kamar {res.room_number}</span>
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

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Payment Status Button */}
              <button
                onClick={() => openPaymentDialog(res)}
                className={cn(
                  "flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2",
                  res.payment_status === "Lunas" 
                    ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                    : "bg-orange-500 text-white shadow-orange-500/20"
                )}
              >
                {res.payment_status === "Lunas" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                {res.payment_status}
              </button>
              
              {/* PDF Download Button */}
              <button 
                onClick={() => generateInvoicePDF(res)}
                title="Download Invoice"
                className="w-12 h-12 shrink-0 bg-surface-container rounded-2xl flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
              >
                <Download size={20} />
              </button>

              {/* Edit Button */}
              <button 
                onClick={() => openPaymentDialog(res)}
                className="w-12 h-12 shrink-0 bg-surface-container rounded-2xl flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
              >
                <ArrowUpRight size={20} />
              </button>
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
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Registrasi Tamu</p>
                    <p className="text-lg font-black">{selectedRes.guest_name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Unit Kamar</p>
                    <p className="text-lg font-black">Kamar {selectedRes.room_number}</p>
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
                      <div className="grid grid-cols-2 gap-2">
                        {["Tunai", "Transfer Bank"].map((m) => (
                          <button
                            key={m}
                            onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: m })}
                            className={cn(
                              "px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
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
                         <TrendingUp size={12} className="text-primary" /> DP / Uang Muka
                       </label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-outline/50">Rp</span>
                        <input 
                          type="number"
                          value={paymentForm.downPayment}
                          onChange={(e) => setPaymentForm({ ...paymentForm, downPayment: parseInt(e.target.value) || 0 })}
                          className="w-full pl-12 pr-5 py-3 bg-surface-container-low border-none rounded-2xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.15em] text-outline flex items-center gap-2">
                         <Wallet size={12} className="text-primary" /> Pelunasan (Manual)
                       </label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-outline/50">Rp</span>
                        <input 
                          type="number"
                          value={paymentForm.amountPaid}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: parseInt(e.target.value) || 0 })}
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
                   {paymentForm.downPayment > 0 && (
                     <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase tracking-widest">
                        <span>Sudah Dibayar (DP)</span>
                        <span>- Rp {paymentForm.downPayment.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="h-px bg-outline-variant/30 my-2" />
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black font-headline tracking-widest uppercase text-outline">Kekurangan Bayar</span>
                      <span className="text-3xl font-black font-headline tracking-tighter text-error">
                        Rp {(Math.max(0, selectedRes.total_payment - paymentForm.discountAmount - paymentForm.downPayment)).toLocaleString()}
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
