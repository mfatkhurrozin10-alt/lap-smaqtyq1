import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Select, ConfirmModal } from '../components/UIComponents';

export default function PenugasanBkView({ showNotification }: any) {
  const [mappings, setMappings] = useState<any[]>([]);
  const [bkList, setBkList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // State baru untuk Search dan Filter Kelas
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  const [form, setForm] = useState({ guru_id: '' });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [rMap, rGuru, rSiswa] = await Promise.all([
        supabase.from('bk_mapping').select('*'),
        supabase.from('guru').select('id, nama, niy, role').eq('role', 'bk').order('nama'),
        supabase.from('siswa').select('kelas')
      ]);

      const gList = rGuru.data || [];
      const sList = rSiswa.data || [];
      const rawMap = rMap.data || [];

      const combined = rawMap.map((item: any) => {
        const foundBk = gList.find((g: any) => g.id === item.guru_id);
        return {
          ...item,
          bk: foundBk || { nama: 'Guru BK Tidak Ditemukan', niy: '-' }
        };
      });

      setMappings(combined);
      setBkList(gList);
      setSiswaList(sList);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat pembagian tugas BK', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(siswaList.map((s: any) => s.kelas?.trim()).filter(Boolean)));
    return list.sort();
  }, [siswaList]);

  // Computed data untuk Filter dan Search pada Daftar Penugasan BK Aktif
  const filteredMappings = useMemo(() => {
    return mappings.filter((item: any) => {
      const namaBk = (item.bk?.nama || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = namaBk.includes(query);
      const matchesKelas = filterKelas ? item.kelas === filterKelas : true;

      return matchesSearch && matchesKelas;
    });
  }, [mappings, searchQuery, filterKelas]);

  const handleCheckboxChange = (cls: string) => {
    setSelectedClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.guru_id) {
      showNotification('Pilih Guru BK terlebih dahulu', 'error');
      return;
    }
    if (selectedClasses.length === 0) {
      showNotification('Pilih minimal satu kelas binaan BK', 'error');
      return;
    }

    setLoading(true);
    try {
      const payloadList = selectedClasses.map(cls => ({
        guru_id: form.guru_id,
        kelas: cls
      }));

      const { error } = await supabase.from('bk_mapping').insert(payloadList);
      if (error) throw error;

      showNotification(`Berhasil menetapkan ${selectedClasses.length} kelas binaan BK!`, 'success');
      setForm({ guru_id: '' });
      setSelectedClasses([]);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan penugasan BK', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('bk_mapping').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification('Penugasan BK berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus', 'error');
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pembagian Tugas Guru BK</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Petakan kelas binaan untuk masing-masing Guru BK</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
        <div className="xl:col-span-1 w-full">
          <Card title="Tetapkan Kelas BK" subtitle="Pilih guru BK dan centang kelas binaannya">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select 
                label="Pilih Guru BK" 
                required 
                value={form.guru_id} 
                onChange={(e: any) => setForm({...form, guru_id: e.target.value})} 
                options={bkList.map(g => ({ label: `${g.nama} (${g.niy || '-'})`, value: g.id }))} 
              />
              {bkList.length === 0 && (
                <p className="text-xs text-rose-600 font-medium">⚠️ Belum ada guru dengan role "Guru BK". Atur role guru terlebih dahulu di menu Data Guru.</p>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Pilih Rombel Kelas Binaan</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {availableClasses.map((cls: string) => {
                    const isChecked = selectedClasses.includes(cls);
                    return (
                      <label key={cls} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxChange(cls)} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                        <span>Kelas {cls}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                {loading ? 'Menyimpan...' : 'Simpan Penugasan BK'}
              </button>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full">
          <Card title="Daftar Penugasan BK Aktif" subtitle="Daftar kelas binaan per Guru BK">
            {/* Bagian Filter Kelas & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 pt-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Cari nama Guru BK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  <option value="">Semua Kelas</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">Nama Guru BK</th>
                    <th className="px-4 sm:px-6 py-3.5">Kelas Binaan</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">Memuat data...</td></tr>
                  ) : filteredMappings.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400">Tidak ada penugasan BK yang sesuai.</td></tr>
                  ) : (
                    filteredMappings.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-slate-900">{item.bk?.nama}</td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">Kelas {item.kelas}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <button onClick={() => setDeleteTarget(item)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"><Icons.Trash /></button>
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

      <ConfirmModal isOpen={!!deleteTarget} title="Hapus Penugasan BK?" message="Hapus pemetaan kelas ini?" onCancel={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
}