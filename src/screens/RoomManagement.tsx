import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, LayoutGrid, Wallet, CheckCircle, Smartphone, Settings, X, Save, Layers, Upload, ImageIcon, TrendingUp } from "lucide-react";
import { fetchRooms, fetchRoomTypes, updateRoomType, addRoomType, deleteRoomType, addRoom, deleteRoom, uploadRoomPhoto } from "../services/dataService";
import RateManagement from "./RateManagement";
import { cn } from "../lib/utils";

export default function RoomManagement() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [rawRoomTypes, setRawRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "rate">("list");
  const [editingType, setEditingType] = useState<any | null>(null);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState<{ typeId: any, typeName: string } | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  
  const [newTypeData, setNewTypeData] = useState({
    name: "",
    description: "",
    base_price: 200000,
    capacity: "2 Orang",
    facilities: "Wifi, AC, TV",
    imageUrl: ""
  });

  const [newUnitData, setNewUnitData] = useState({
    roomNumber: "",
    floor: 1
  });

  const [bulkData, setBulkData] = useState({
    typeId: "",
    floor: 1,
    prefix: "",
    startNum: 1,
    count: 5
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchRooms(), fetchRoomTypes()])
      .then(([roomsData, typesData]) => {
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setRawRoomTypes(Array.isArray(typesData) ? typesData : []);
      })
      .catch(error => {
        console.error("Scale room mgmt data error:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveEdit = async () => {
    if (!editingType) return;
    try {
      await updateRoomType(editingType.id, {
        description: editingType.description,
        base_price: Number(editingType.base_price),
        capacity: editingType.capacity,
        facilities: editingType.facilities,
        imageUrl: editingType.imageUrl
      });
      setEditingType(null);
      loadData();
    } catch (error: any) {
      console.error(error);
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert("Gagal mengupdate tipe kamar");
      }
    }
  };

  const handleFileUpload = async (file: File, isEditing: boolean) => {
    try {
      const { imageUrl } = await uploadRoomPhoto(file);
      if (isEditing && editingType) {
        setEditingType({ ...editingType, imageUrl });
      } else {
        setNewTypeData({ ...newTypeData, imageUrl });
      }
    } catch (error) {
      console.error(error);
      alert("Gagal mengunggah foto");
    }
  };

  const handleAddType = async () => {
    if (!newTypeData.name) return;
    try {
      await addRoomType(newTypeData);
      setIsAddingType(false);
      setNewTypeData({
        name: "",
        description: "",
        base_price: 200000,
        capacity: "2 Orang",
        facilities: "Wifi, AC, TV",
        imageUrl: ""
      });
      loadData();
    } catch (error: any) {
      console.error(error);
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert("Gagal menambah tipe kamar");
      }
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm("Hapus tipe kamar ini? Seluruh unit tipe ini harus kosong.")) return;
    try {
      const res = await deleteRoomType(id);
      if (res.error) throw new Error(res.error);
      loadData();
    } catch (error: any) {
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert(error.message || "Gagal menghapus tipe kamar");
      }
    }
  };

  const handleAddUnit = async () => {
    if (!isAddingUnit || !newUnitData.roomNumber) return;
    try {
      const res = await addRoom({
        roomNumber: newUnitData.roomNumber,
        typeId: isAddingUnit.typeId,
        floor: Number(newUnitData.floor)
      });
      if (res.error) throw new Error(res.error);
      setIsAddingUnit(null);
      setNewUnitData({ roomNumber: "", floor: 1 });
      loadData();
    } catch (error: any) {
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert(error.message || "Gagal menambah unit kamar. Pastikan nomor unit belum digunakan.");
      }
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkData.typeId) return;
    setLoading(true);
    try {
      for (let i = 0; i < bulkData.count; i++) {
        const num = (bulkData.startNum + i).toString().padStart(2, '0');
        const roomNumber = `${bulkData.prefix}${num}`;
        try {
          await addRoom({
            roomNumber,
            typeId: Number(bulkData.typeId),
            floor: Number(bulkData.floor)
          });
        } catch (e) {
          console.warn(`Gagal menambah ${roomNumber}, mungkin sudah ada.`);
        }
      }
      setIsBulkAdding(false);
      loadData();
    } catch (error: any) {
       alert("Selesai diproses dengan beberapa kemungkinan error skip.");
       loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async (roomNumber: string) => {
    if (!confirm(`Hapus unit kamar ${roomNumber}?`)) return;
    try {
      const res = await deleteRoom(roomNumber);
      if (res.error) throw new Error(res.error);
      loadData();
    } catch (error: any) {
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert(error.message || "Gagal menghapus unit kamar");
      }
    }
  };

  const roomTypes = rawRoomTypes.map(type => ({
    id: type.id,
    name: type.name,
    desc: type.description,
    price: type.base_price,
    capacity: type.capacity,
    facilities: type.facilities,
    img: type.imageUrl ? type.imageUrl : `https://picsum.photos/seed/${type.name.replace(" ", "-").toLowerCase()}/800/600`,
    premium: type.name.includes("Plus") || type.name.includes("Deluxe"),
    units: rooms.filter(r => r.type === type.name).map(r => r.id)
  }));

  if (loading && !editingType) {
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
      {/* Tab Switcher */}
      <div className="flex bg-surface-container/50 p-2 rounded-[2rem] w-fit mx-auto shadow-sm border border-outline-variant/10">
        <button 
          onClick={() => setActiveTab("list")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full font-headline font-black transition-all",
            activeTab === "list" 
              ? "bg-white text-primary shadow-md scale-105" 
              : "text-outline hover:bg-surface-container"
          )}
        >
          <LayoutGrid size={20} />
          <span>Unit Management</span>
        </button>
        <button 
          onClick={() => setActiveTab("rate")}
          className={cn(
            "flex items-center gap-3 px-8 py-3 rounded-full font-headline font-black transition-all",
            activeTab === "rate" 
              ? "bg-white text-primary shadow-md scale-105" 
              : "text-outline hover:bg-surface-container"
          )}
        >
          <TrendingUp size={20} />
          <span>Rate Management</span>
        </button>
      </div>

      {activeTab === "rate" ? (
        <RateManagement />
      ) : (
        <>
          {/* Edit Modal */}
      <AnimatePresence>
        {editingType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setEditingType(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Edit Tipe Kamar</h3>
                <button 
                  onClick={() => setEditingType(null)}
                  className="p-2 hover:bg-surface-container rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                <p className="text-sm font-bold text-primary uppercase tracking-widest">{editingType.name}</p>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Foto Kamar</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full aspect-video rounded-2xl bg-surface-container overflow-hidden relative group">
                      {editingType.imageUrl ? (
                        <img 
                          src={editingType.imageUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-outline/30 bg-surface-container-high">
                          <ImageIcon size={32} />
                          <span className="text-[10px] font-bold mt-2">No Photo</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all backdrop-blur-[2px]">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, true);
                          }}
                        />
                        <div className="text-white flex flex-col items-center gap-1">
                          <Upload size={20} />
                          <span className="text-[10px] font-black uppercase">Ganti Foto</span>
                        </div>
                      </label>
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                       <p className="text-[10px] font-black leading-tight opacity-50 uppercase italic">Recomendasi: Landscape ratio (16:9) & ukuran di bawah 2MB.</p>
                       {editingType.imageUrl && (
                         <button 
                           onClick={() => setEditingType({ ...editingType, imageUrl: "" })}
                           className="text-[10px] font-black text-error uppercase text-left hover:underline"
                         >
                           Hapus Foto
                         </button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Deskripsi</label>
                  <textarea 
                    value={editingType.description}
                    onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-on-surface"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Kapasitas</label>
                    <input 
                      value={editingType.capacity}
                      onChange={e => setEditingType({ ...editingType, capacity: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Fasilitas</label>
                    <input 
                      value={editingType.facilities}
                      onChange={e => setEditingType({ ...editingType, facilities: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveEdit}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Save size={24} /> Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setIsAddingType(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Tambah Tipe Baru</h3>
                <button 
                  onClick={() => setIsAddingType(false)}
                  className="p-2 hover:bg-surface-container rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Foto Kamar (Opsional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-full aspect-video rounded-2xl bg-surface-container overflow-hidden relative group border-2 border-dashed border-outline-variant/30">
                      {newTypeData.imageUrl ? (
                        <img 
                          src={newTypeData.imageUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-outline/30">
                          <Plus size={24} />
                          <span className="text-[10px] font-bold mt-1">Upload</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all backdrop-blur-[2px]">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, false);
                          }}
                        />
                        <div className="text-white flex flex-col items-center gap-1">
                          <Upload size={20} />
                          <span className="text-[10px] font-black uppercase">Pilih Foto</span>
                        </div>
                      </label>
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                       <p className="text-[10px] font-black leading-tight opacity-50 uppercase italic tracking-tighter">Opsional. Jika dikosongkan akan menggunakan gambar random berkualitas.</p>
                       {newTypeData.imageUrl && (
                         <button 
                           onClick={() => setNewTypeData({ ...newTypeData, imageUrl: "" })}
                           className="text-[10px] font-black text-error uppercase text-left hover:underline"
                         >
                           Reset
                         </button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Nama Tipe</label>
                  <input 
                    value={newTypeData.name}
                    onChange={e => setNewTypeData({ ...newTypeData, name: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    placeholder="Contoh: Junior Suite"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Deskripsi</label>
                  <textarea 
                    value={newTypeData.description}
                    onChange={e => setNewTypeData({ ...newTypeData, description: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-on-surface"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Harga (Rp)</label>
                    <input 
                      type="number"
                      value={newTypeData.base_price}
                      onChange={e => setNewTypeData({ ...newTypeData, base_price: Number(e.target.value) })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Kapasitas</label>
                    <input 
                      value={newTypeData.capacity}
                      onChange={e => setNewTypeData({ ...newTypeData, capacity: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Fasilitas</label>
                  <input 
                    value={newTypeData.facilities}
                    onChange={e => setNewTypeData({ ...newTypeData, facilities: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                  />
                </div>

                <button 
                  onClick={handleAddType}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  <Plus size={24} /> Tambah Properti
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingUnit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setIsAddingUnit(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-sm relative z-10 shadow-2xl border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Tambah Unit</h3>
                <button 
                  onClick={() => setIsAddingUnit(null)}
                  className="p-2 hover:bg-surface-container rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                   <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Tipe</p>
                   <p className="text-xl font-headline font-black">{isAddingUnit.typeName}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Nomor Kamar</label>
                  <input 
                    value={newUnitData.roomNumber}
                    onChange={e => setNewUnitData({ ...newUnitData, roomNumber: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    placeholder="Contoh: 301"
                    autoFocus
                  />
                  <p className="text-[9px] text-on-surface-variant italic leading-tight">Gunakan nomor unik (misal: 101, 205, A1).</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Lantai</label>
                  <input 
                    type="number"
                    value={newUnitData.floor}
                    onChange={e => setNewUnitData({ ...newUnitData, floor: Number(e.target.value) })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                  />
                </div>

                <button 
                  onClick={handleAddUnit}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  <Plus size={24} /> Simpan Unit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isBulkAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              onClick={() => setIsBulkAdding(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-10 shadow-2xl border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Massal Room Add</h3>
                <button 
                  onClick={() => setIsBulkAdding(false)}
                  className="p-2 hover:bg-surface-container rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pilih Tipe Kamar</label>
                  <select 
                    value={bulkData.typeId}
                    onChange={e => setBulkData({ ...bulkData, typeId: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface appearance-none"
                  >
                    <option value="">-- Pilih Tipe --</option>
                    {rawRoomTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Lantai</label>
                    <input 
                      type="number"
                      value={bulkData.floor}
                      onChange={e => setBulkData({ ...bulkData, floor: Number(e.target.value) })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Prefix (Opsional)</label>
                    <input 
                      value={bulkData.prefix}
                      onChange={e => setBulkData({ ...bulkData, prefix: e.target.value })}
                      placeholder="e.g. 10"
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Start Number</label>
                    <input 
                      type="number"
                      value={bulkData.startNum}
                      onChange={e => setBulkData({ ...bulkData, startNum: Number(e.target.value) })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Jumlah Unit</label>
                    <input 
                      type="number"
                      value={bulkData.count}
                      onChange={e => setBulkData({ ...bulkData, count: Number(e.target.value) })}
                      className="w-full bg-surface-container-low border-none rounded-2xl p-5 focus:ring-4 focus:ring-primary/10 transition-all font-bold text-on-surface"
                    />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                   <p className="text-[10px] font-black uppercase text-primary mb-1">Preview Room Numbers:</p>
                   <p className="text-sm font-bold text-on-surface opacity-60 italic">
                     {bulkData.prefix || '?'}{bulkData.startNum.toString().padStart(2, '0')}, ... , 
                     {bulkData.prefix || '?'}{(bulkData.startNum + bulkData.count - 1).toString().padStart(2, '0')}
                   </p>
                </div>

                <button 
                  onClick={handleBulkAdd}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all mt-2"
                >
                  <Plus size={24} /> Generate & Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tighter text-on-surface font-headline leading-tight">Room Management</h1>
          <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed opacity-80">
            Konfigurasi properti Hotel Monika Yogyakarta. Atur harga, deskripsi, dan pantau ketersediaan unit.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsBulkAdding(true)}
            className="bg-surface-container-high text-primary px-8 py-4 rounded-3xl font-headline font-black flex items-center gap-3 hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Layers size={20} />
            Massal Room Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Room Types Side */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface font-headline">Tipe Kamar</h2>
            <button 
              onClick={() => setIsAddingType(true)}
              className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              Tambah Tipe Baru
            </button>
          </div>

          <div className="space-y-4">
            {roomTypes.map((type) => (
              <div 
                key={type.id} 
                className={cn(
                  "bg-white p-8 rounded-[2.5rem] shadow-[0_8px_48px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between group transition-all duration-500 hover:scale-[1.01] border border-outline-variant/10",
                  type.premium && "ring-2 ring-primary/20 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-8 w-full md:w-auto">
                  <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden shadow-inner flex-shrink-0">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      src={type.img} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight">{type.name}</h3>
                      {type.premium && (
                        <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/20">Premium</span>
                      )}
                    </div>
                    <p className="text-on-surface-variant text-sm font-medium opacity-70">{type.desc}</p>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-outline mt-2">
                      <span>{type.capacity}</span>
                      <span className="opacity-30">•</span>
                      <span>{type.facilities}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-12 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-outline-variant/10">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Starting at</p>
                    <p className="text-2xl font-extrabold text-on-surface tracking-tight">Rp {type.price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditingType({
                        id: type.id,
                        name: type.name,
                        description: type.desc,
                        base_price: type.price,
                        capacity: type.capacity,
                        facilities: type.facilities,
                        imageUrl: rawRoomTypes.find(rt => rt.id === type.id)?.imageUrl || ""
                      })}
                      className="p-4 text-on-surface-variant bg-surface-container-high/50 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteType(type.id)}
                      className="p-4 text-error bg-error-container/10 hover:bg-error hover:text-white rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary text-white p-10 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-primary/30">
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Total Rooms</p>
                <h3 className="text-7xl font-extrabold font-headline tracking-tighter">{rooms.length}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm border border-white/10 flex items-center gap-2">
                  <CheckCircle size={16} className="text-status-available" />
                  85% Occupancy
                </span>
              </div>
            </div>
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          </div>

          <div className="bg-surface-container-high/40 p-10 rounded-[3rem] border border-outline-variant/15">
            <h4 className="font-bold text-lg mb-8 text-on-surface font-headline uppercase tracking-widest opacity-60">Management Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <QuickButton icon={<Plus />} label="Add Type" onClick={() => setIsAddingType(true)} />
              <QuickButton icon={<Layers />} label="Bulk Add" onClick={() => setIsBulkAdding(true)} />
              <QuickButton icon={<Trash2 />} label="Delete Logs" onClick={() => alert("Menu ini dalam tahap pengembangan.")} />
              <QuickButton icon={<TrendingUp />} label="Rates UI" onClick={() => setActiveTab("rate")} />
            </div>
          </div>
        </div>
      </div>

      {/* Unit Detail Sections */}
      <section className="mt-16 space-y-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Detail Unit per Tipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roomTypes.map((type, idx) => (
            <div key={type.name} className="bg-surface-container-low/50 rounded-[2.5rem] p-8 space-y-8 border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-8 rounded-full",
                    idx === 0 ? "bg-primary" : idx === 1 ? "bg-status-on-available" : "bg-status-checked-in"
                  )} />
                  <h3 className="font-bold text-xl tracking-tight">{type.name} Units</h3>
                </div>
                <button 
                  onClick={() => setIsAddingUnit({ typeId: type.id, typeName: type.name })}
                  className="text-primary font-bold text-xs uppercase tracking-widest hover:underline"
                >
                  Add Unit
                </button>
              </div>
              <div className="space-y-3">
                {type.units.map(unit => (
                  <div key={unit} className="bg-white px-6 py-5 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-lg transition-all border border-outline-variant/5">
                    <div className="flex items-center gap-3">
                      <Layers size={14} className="text-outline/40" />
                      <span className="font-extrabold text-on-surface">{unit}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteUnit(unit.toString())}
                      className="p-2 opacity-0 group-hover:opacity-100 text-error hover:bg-error-container/20 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      </>
      )}
    </motion.div>
  );
}

function QuickButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-6 rounded-[2rem] flex flex-col items-center gap-3 text-center hover:shadow-xl hover:-translate-y-1 transition-all group w-full"
    >
      <div className="text-primary group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest text-wrap">{label}</span>
    </button>
  );
}
