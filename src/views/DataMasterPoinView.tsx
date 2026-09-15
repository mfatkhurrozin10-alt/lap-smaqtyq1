import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Input, Select, ConfirmModal } from '../components/UIComponents';

export default function DataMasterPoinView({ showNotification }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('ALL');

  const [form, setForm] = useState({
    nama_kegiatan: '',
    jenis: 'pelanggaran',
    bobot: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const { data: res, error } = await supabase.from('master_poin').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setData(res || []);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat master poin', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      nama_kegiatan: item.nama_kegiatan || '',
      jenis: item.jenis || 'pelanggaran',
      bobot: String(Math.abs(item.bobot || 0))
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ nama_kegiatan: '', jenis: 'pelanggaran', bobot: '' });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.nama_kegiatan.trim() || form.bobot === '') {
      showNotification('Mohon lengkapi nama kegiatan dan bobot poin', 'error');
      return;
    }

    setLoading(true);
    try {
      const numBobot = parseFloat(form.bobot);
      const payload = {
        nama_kegiatan: form.nama_kegiatan.trim(),
        jenis: form.jenis,
        bobot: form.jenis === 'pelanggaran' ? -Math.abs(numBobot) : Math.abs(numBobot)
      };

      if (editingId) {
        const { error } = await supabase.from('master_poin').update(payload).eq('id', editingId);
        if (error) throw error;
        showNotification('Master poin berhasil diperbarui!', 'success');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('master_poin').insert([payload]);
        if (error) throw error;
        showNotification('Master poin berhasil ditambahkan!', 'success');
      }

      setForm({ nama_kegiatan: '', jenis: 'pelanggaran', bobot: '' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('master_poin').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification('Kriteria berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus data', 'error');
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const matchSearch = (item.nama_kegiatan || '').toLowerCase().includes(search.toLowerCase());
      const matchJenis = filterJenis === 'ALL' || item.jenis === filterJenis;
      return matchSearch && matchJenis;
    });
  }, [data, search, filterJenis]);

  return (
    <div className="space-y-6 w-full text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Master Poin & Pelanggaran (BK)</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola acuan bobot poin penghargaan dan sanksi pelanggaran kedisiplinan siswa</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
        <div className="xl:col-span-1 w-full min-w-0">
          <Card title={editingId ? 'Edit Kriteria Poin' : 'Tambah Kriteria Poin'} subtitle="Tentukan nama kasus dan bobot poin">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nama Pelanggaran / Penghargaan" 
                required 
                value={form.nama_kegiatan} 
                onChange={(e: any) => setForm({...form, nama_kegiatan: e.target.value})} 
                placeholder="Contoh: Terlambat hadir lebih dari 15 menit" 
              />
              <Select 
                label="Kategori Jenis" 
                required
                value={form.jenis}
                onChange={(e: any) => setForm({...form, jenis: e.target.value})}
                options={[
                  { label: 'Pelanggaran (Poin Minus)', value: 'pelanggaran' },
                  { label: 'Penghargaan / Prestasi (Poin Plus)', value: 'penghargaan' },
                ]}
              />
              <Input 
                label="Besaran Bobot Poin" 
                type="number"
                required 
                value={form.bobot} 
                onChange={(e: any) => setForm({...form, bobot: e.target.value})} 
                placeholder="Contoh: 10" 
                helper={form.jenis === 'pelanggaran' ? 'Otomatis bernilai minus (-)' : 'Otomatis bernilai plus (+)'}
              />

              <div className="flex items-center gap-2 pt-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                  {loading ? 'Menyimpan...' : editingId ? 'Perbarui Kriteria' : 'Tambah Kriteria'}
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Batal</button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full min-w-0">
          <Card 
            title="Daftar Kriteria Poin"
            action={
              <div className="flex items-center gap-2">
                <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none">
                  <option value="ALL">Semua Jenis</option>
                  <option value="pelanggaran">Pelanggaran</option>
                  <option value="penghargaan">Penghargaan</option>
                </select>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..." className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none w-40" />
              </div>
            }
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">Nama Kegiatan / Kasus</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Kategori</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Bobot</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Belum ada kriteria poin</td></tr>
                  ) : (
                    filteredData.map((item: any) => {
                      const isPelanggaran = item.jenis === 'pelanggaran';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">{item.nama_kegiatan}</td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isPelanggaran ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {isPelanggaran ? 'Pelanggaran' : 'Penghargaan'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center font-mono font-black text-base">
                            <span className={isPelanggaran ? 'text-rose-600' : 'text-emerald-600'}>{item.bobot > 0 ? `+${item.bobot}` : item.bobot}</span>
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

      <ConfirmModal isOpen={!!deleteTarget} title="Hapus Kriteria?" message={`Hapus "${deleteTarget?.nama_kegiatan}"?`} onCancel={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
}