import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash2, Shield, User, Key, X, CheckCircle2 } from "lucide-react";
import { fetchUsers, addUser, deleteUser } from "../services/dataService";
import { User as UserType } from "../types";

export default function StaffManagement({ accessMode }: { accessMode?: string }) {
  const isGuest = accessMode === 'guest';
  const [users, setUsers] = useState<UserType[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "staff",
    isAdmin: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Expected array from fetchUsers, got:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    try {
      await addUser(newUser);
      setIsAddModalOpen(false);
      setNewUser({ username: "", password: "", fullName: "", role: "staff", isAdmin: false });
      loadUsers();
    } catch (error: any) {
      if (error.status !== 401 && error.message !== "Unauthorized") {
        alert("Gagal menambah user. Username mungkin sudah ada.");
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (isGuest) return;
    if (confirm("Hapus user ini?")) {
      try {
        await deleteUser(id);
        loadUsers();
      } catch (error: any) {
        if (error.status !== 401 && error.message !== "Unauthorized") {
          alert("Gagal menghapus user.");
        }
      }
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight">Staff Management</h2>
          <p className="text-on-surface-variant font-medium mt-1">Kelola akun staff dan admin hotel.</p>
        </div>
        {!isGuest && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-white p-6 rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            <UserPlus size={24} />
            <span className="font-headline font-black text-lg">Tambah Staff</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-outline-variant/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline">User</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline">Jabatan / Role</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-outline text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr><td colSpan={3} className="p-20 text-center font-bold text-outline animate-pulse">Memuat data...</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-headline font-black text-on-surface text-lg">{user.fullName}</div>
                        <div className="text-xs font-bold text-outline">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {user.isAdmin ? (
                      <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest w-fit block">
                        Staff
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    {!isGuest && (
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-3 text-outline hover:text-error hover:bg-error/5 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-on-surface/30 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl p-10 space-y-8"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-headline font-black text-on-surface">Tambah Staff Baru</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface hover:bg-error hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-2">Nama Lengkap</label>
                <input 
                  required
                  className="w-full bg-surface-container-low border-none rounded-2xl p-5 font-bold shadow-sm"
                  value={newUser.fullName}
                  onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                  placeholder="Budi Santoso"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-2">Username</label>
                  <input 
                    required
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 font-bold shadow-sm"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    placeholder="budi123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-2">Password</label>
                  <input 
                    required
                    type="password"
                    className="w-full bg-surface-container-low border-none rounded-2xl p-5 font-bold shadow-sm"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 bg-surface-container-low p-6 rounded-3xl">
                <input 
                  type="checkbox"
                  id="isAdmin"
                  className="w-6 h-6 rounded-lg text-primary focus:ring-primary border-outline-variant"
                  checked={newUser.isAdmin}
                  onChange={e => setNewUser({...newUser, isAdmin: e.target.checked})}
                />
                <label htmlFor="isAdmin" className="font-bold text-on-surface select-none">Berikan Hak Akses Admin</label>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-white py-6 rounded-3xl font-headline font-black text-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <CheckCircle2 size={24} /> Simpan Data Staff
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
