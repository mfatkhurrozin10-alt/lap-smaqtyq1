import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Input, ImportModal, ConfirmModal } from '../components/UIComponents';

export default function DataSiswaView({ showNotification }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [form, setForm] = useState({ nis: '', nama: '', kelas: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const { data: res, error } = await supabase.from('siswa').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setData(res || []);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data siswa', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ nis: item.nis || '', nama: item.nama || '', kelas: item.kelas || '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ nis: '', nama: '', kelas: '' });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.nis.trim() || !form.nama.trim() || !form.kelas.trim()) {
      showNotification('Mohon lengkapi seluruh field formulir siswa', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('siswa').update(form).eq('id', editingId);
        if (error) throw error;
        showNotification(`Data siswa ${form.nama} berhasil diperbarui!`, 'success');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('siswa').insert([form]);
        if (error) throw error;
        showNotification(`Siswa ${form.nama} berhasil didaftarkan!`, 'success');
      }
      setForm({ nis: '', nama: '', kelas: '' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('siswa').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification(`Siswa ${deleteTarget.nama} berhasil dihapus`, 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus siswa', 'error');
    }
  };

  const validateSiswaRow = (row: string[]) => {
    const nis = row[0]?.trim();
    const nama = row[1]?.trim();
    const kelas = row[2]?.trim().toUpperCase();
    if (!nis || !nama || !kelas) return { valid: false, error: 'NIS, Nama, atau Kelas tidak lengkap' };
    return { valid: true, data: { nis, nama, kelas } };
  };

  const handleImportSiswa = async (rows: any[]) => {
    const { error } = await supabase.from('siswa').insert(rows);
    if (error) {
      showNotification(error.message || 'Gagal mengimpor siswa', 'error');
      return { successCount: 0, errorCount: rows.length };
    }
    showNotification(`Berhasil mengimpor ${rows.length} data siswa!`, 'success');
    fetchData();
    return { successCount: rows.length, errorCount: 0 };
  };

  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(data.map((d: any) => d.kelas).filter(Boolean)));
    return list.sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const matchesSearch = (item.nama || '').toLowerCase().includes(search.toLowerCase()) || 
                            (item.nis || '').toLowerCase().includes(search.toLowerCase());
      const matchesKelas = filterKelas === 'ALL' || item.kelas === filterKelas;
      return matchesSearch && matchesKelas;
    });
  }, [data, search, filterKelas]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Manajemen Siswa</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-100">
              {data.length} Peserta Didik
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola data murid, nomor induk, dan rombongan belajar</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsImportOpen(true)} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Icons.Upload /> Impor Excel (.xlsx)
          </button>
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
            title={editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'} 
            subtitle={editingId ? 'Perbarui nomor induk dan rombel' : 'Input profil data peserta didik'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nomor Induk Siswa (NIS)" 
                required 
                value={form.nis} 
                onChange={(e: any) => setForm({...form, nis: e.target.value})} 
                placeholder="Contoh: 2024101" 
              />
              <Input 
                label="Nama Lengkap" 
                required 
                value={form.nama} 
                onChange={(e: any) => setForm({...form, nama: e.target.value})} 
                placeholder="Contoh: Muhammad Farhan" 
              />
              <Input 
                label="Rombel / Kelas" 
                required 
                value={form.kelas} 
                onChange={(e: any) => setForm({...form, kelas: e.target.value.toUpperCase()})} 
                placeholder="Contoh: X-E1, XI F2, atau XII-B" 
                helper="Format otomatis kapital"
              />
              <div className="flex items-center gap-2 mt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Menyimpan...
                    </>
                  ) : editingId ? (
                    <>
                      <Icons.Edit /> Perbarui Siswa
                    </>
                  ) : (
                    <>
                      <Icons.Plus /> Simpan Siswa
                    </>
                  )}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-all"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full min-w-0">
          <Card 
            title="Daftar Siswa Aktif"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  {availableClasses.map((cls: any, idx: number) => (
                    <option key={idx} value={cls}>{cls}</option>
                  ))}
                </select>
                <div className="relative w-48">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.Search />
                  </div>
                </div>
              </div>
            }
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">NIS</th>
                    <th className="px-4 sm:px-6 py-3.5">Nama Siswa</th>
                    <th className="px-4 sm:px-6 py-3.5">Kelas</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data siswa...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <p className="font-medium text-slate-500">Data siswa tidak ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1">Pastikan kata kunci pencarian atau gunakan tombol impor data.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 sm:px-6 py-3.5 font-mono text-xs font-semibold text-slate-600">{item.nis}</td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">{item.nama}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.kelas}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button 
                              onClick={() => handleEdit(item)}
                              title="Edit siswa"
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            >
                              <Icons.Edit />
                            </button>
                            <button 
                              onClick={() => setDeleteTarget(item)} 
                              title="Hapus data"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Impor Data Peserta Didik (Siswa)"
        templateFileName="Template_Data_Siswa.xlsx"
        templateHeaders={['NIS', 'Nama Siswa', 'Kelas']}
        templateSamples={[
          ['2024101', 'Muhammad Farhan', 'X-E1'],
          ['2024102', 'Aisyah Zahra', 'XI F2'],
          ['2024103', 'Bagas Pratama', 'XII-B']
        ]}
        validatorAndMapper={validateSiswaRow}
        onImport={handleImportSiswa}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Peserta Didik?"
        message={`Apakah Anda yakin ingin menghapus siswa "${deleteTarget?.nama}" (NIS: ${deleteTarget?.nis})?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}