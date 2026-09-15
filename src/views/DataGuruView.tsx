import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Input, Select, ConfirmModal } from '../components/UIComponents';

export default function DataGuruView({ showNotification }: any) {
  const [data, setData] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({ 
    niy: '', 
    nama: '', 
    password: '', 
    role: 'guru', 
    kelas_binaan: '' 
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [rGuru, rSiswa] = await Promise.all([
        supabase.from('guru').select('*').order('created_at', { ascending: false }),
        supabase.from('siswa').select('kelas')
      ]);
      setData(rGuru.data || []);
      setSiswaList(rSiswa.data || []);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data guru', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Ambil daftar kelas unik dari data siswa untuk pilihan kelas binaan wali kelas
  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(siswaList.map((s: any) => s.kelas?.trim()).filter(Boolean)));
    return list.sort();
  }, [siswaList]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ 
      niy: item.niy || '', 
      nama: item.nama || '', 
      password: '', 
      role: item.role || 'guru', 
      kelas_binaan: item.kelas_binaan || '' 
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ niy: '', nama: '', password: '', role: 'guru', kelas_binaan: '' });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.niy.trim() || !form.nama.trim()) {
      showNotification('Mohon lengkapi NIY dan Nama Guru', 'error');
      return;
    }

    setLoading(true);
    try {
      let payload: any = { 
        niy: form.niy, 
        nama: form.nama,
        role: form.role,
        kelas_binaan: form.role === 'wali_kelas' ? form.kelas_binaan : null
      };

      if (form.password.trim() !== '') {
        payload.password = form.password.trim();
      }

      if (editingId) {
        const { error } = await supabase.from('guru').update(payload).eq('id', editingId);
        if (error) throw error;
        showNotification('Data pendidik & peran berhasil diperbarui!', 'success');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('guru').insert([payload]);
        if (error) throw error;
        showNotification('Tenaga pendidik berhasil ditambahkan!', 'success');
      }
      
      setForm({ niy: '', nama: '', password: '', role: 'guru', kelas_binaan: '' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan data guru', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('guru').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification(`Data Guru "${deleteTarget.nama}" berhasil dihapus`, 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus data guru', 'error');
    }
  };

  const roleLabels: Record<string, { label: string; bg: string }> = {
    admin: { label: 'Administrator', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    wali_kelas: { label: 'Wali Kelas', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    bk: { label: 'Guru BK', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    guru: { label: 'Guru Pengajar', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const filteredData = useMemo(() => {
    return data.filter((g: any) => 
      (g.nama || '').toLowerCase().includes(search.toLowerCase()) || 
      (g.niy || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Manajemen Guru & Peran (RBAC)</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold border border-indigo-100">
              {data.length} Total
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola identitas pendidik, hak akses portal, serta penugasan wali kelas</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Icons.Refresh /> Segarkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
        <div className="xl:col-span-1 w-full min-w-0">
          <Card 
            title={editingId ? 'Edit Peran & Data Guru' : 'Tambah Tenaga Pengajar'} 
            subtitle={editingId ? 'Perbarui profil, sandi, dan role guru' : 'Isi rincian guru baru'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nomor Induk Yayasan (NIY)" 
                required 
                value={form.niy} 
                onChange={(e: any) => setForm({...form, niy: e.target.value})} 
                placeholder="Contoh: GR-2024-001" 
              />
              <Input 
                label="Nama Lengkap & Gelar" 
                required 
                value={form.nama} 
                onChange={(e: any) => setForm({...form, nama: e.target.value})} 
                placeholder="Dr. Ahmad Subagja, M.Pd" 
              />
              
              <Select 
                label="Hak Akses / Peran (Role)" 
                required
                value={form.role}
                onChange={(e: any) => setForm({...form, role: e.target.value})}
                options={[
                  { label: 'Guru Pengajar (Standar)', value: 'guru' },
                  { label: 'Wali Kelas', value: 'wali_kelas' },
                  { label: 'Guru BK (Bimbingan Konseling)', value: 'bk' },
                  { label: 'Administrator', value: 'admin' },
                ]}
              />

              {form.role === 'wali_kelas' && (
                <div className="space-y-1.5 w-full">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-700">Kelas Binaan Wali</label>
                  <select
                    className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 outline-none cursor-pointer"
                    value={form.kelas_binaan}
                    onChange={(e) => setForm({...form, kelas_binaan: e.target.value})}
                    required
                  >
                    <option value="">-- Pilih Kelas Binaan --</option>
                    {availableClasses.map((cls: string) => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input 
                label={editingId ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi Portal'} 
                type="password"
                value={form.password} 
                onChange={(e: any) => setForm({...form, password: e.target.value})} 
                placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'Masukkan sandi login guru'} 
                helper={editingId ? 'Biarkan kosong apabila tidak ingin mengganti sandi lama' : undefined}
              />

              <div className="flex items-center gap-2 mt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Menyimpan...' : editingId ? <><Icons.Edit /> Perbarui Guru</> : <><Icons.Plus /> Tambah Guru</>}
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm">
                    Batal
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full min-w-0">
          <Card 
            title="Daftar Guru Terdaftar"
            action={
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / NIY..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
              </div>
            }
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">Tenaga Pengajar</th>
                    <th className="px-4 sm:px-6 py-3.5">NIY</th>
                    <th className="px-4 sm:px-6 py-3.5">Peran (Role)</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data guru...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada data ditemukan</td></tr>
                  ) : (
                    filteredData.map((item: any) => {
                      const currentRole = item.role || 'guru';
                      const badge = roleLabels[currentRole] || roleLabels['guru'];

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5">
                            <div className="font-bold text-slate-900">{item.nama}</div>
                            <div className="text-xs text-slate-400">
                              {currentRole === 'wali_kelas' && item.kelas_binaan ? `Wali Kelas ${item.kelas_binaan}` : 'Pendidik Aktif'}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 font-mono text-xs text-slate-600">{item.niy}</td>
                          <td className="px-4 sm:px-6 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                              {badge.label} {currentRole === 'wali_kelas' && item.kelas_binaan ? `(${item.kelas_binaan})` : ''}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><Icons.Edit /></button>
                              <button onClick={() => setDeleteTarget(item)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"><Icons.Trash /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Data Guru?"
        message={`Apakah Anda yakin ingin menghapus data "${deleteTarget?.nama}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}