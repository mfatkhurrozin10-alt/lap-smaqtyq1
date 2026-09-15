import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Select, ConfirmModal } from '../components/UIComponents';

export default function PenugasanGuruView({ showNotification }: any) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // State baru untuk Search dan Filter Kelas
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  const [form, setForm] = useState({
    guru_id: '',
    mapel_id: '',
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [rAssign, rGuru, rMapel, rSiswa] = await Promise.all([
        supabase.from('guru_mapel').select('*'),
        supabase.from('guru').select('id, nama, niy').order('nama'),
        supabase.from('mapel').select('id, nama_mapel, kode').order('nama_mapel'),
        supabase.from('siswa').select('kelas')
      ]);

      const gList = rGuru.data || [];
      const mList = rMapel.data || [];
      const rawAssign = rAssign.data || [];

      const combined = rawAssign.map((item: any) => {
        const foundGuru = gList.find((g: any) => g.id === item.guru_id);
        const foundMapel = mList.find((m: any) => m.id === item.mapel_id);
        return {
          ...item,
          guru: foundGuru || { nama: 'Guru Tidak Ditemukan', niy: '-' },
          mapel: foundMapel || { nama_mapel: 'Mapel Tidak Ditemukan', kode: '-' }
        };
      });

      setAssignments(combined);
      setGuruList(gList);
      setMapelList(mList);
      setSiswaList(rSiswa.data || []);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data pembagian mengajar', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Menyaring daftar mapel agar nama yang sama persis cukup muncul 1 kali saja di dropdown
  const uniqueMapelList = useMemo(() => {
    const map = new Map();
    mapelList.forEach((m: any) => {
      const cleanName = (m.nama_mapel || '').trim();
      if (cleanName && !map.has(cleanName.toLowerCase())) {
        map.set(cleanName.toLowerCase(), {
          id: m.id,
          nama_mapel: cleanName,
          kode: m.kode || '-'
        });
      }
    });
    return Array.from(map.values());
  }, [mapelList]);

  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(siswaList.map((s: any) => s.kelas?.trim()).filter(Boolean)));
    return list.sort();
  }, [siswaList]);

  // Computed data untuk Filter dan Search pada Daftar Penugasan Aktif
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item: any) => {
      const namaGuru = (item.guru?.nama || '').toLowerCase();
      const namaMapel = (item.mapel?.nama_mapel || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = namaGuru.includes(query) || namaMapel.includes(query);
      const matchesKelas = filterKelas ? item.kelas === filterKelas : true;

      return matchesSearch && matchesKelas;
    });
  }, [assignments, searchQuery, filterKelas]);

  const handleCheckboxChange = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]
    );
  };

  const handleSelectAll = () => {
    if (selectedClasses.length === availableClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses([...availableClasses]);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.guru_id || !form.mapel_id) {
      showNotification('Mohon pilih Guru dan Mata Pelajaran terlebih dahulu', 'error');
      return;
    }
    if (selectedClasses.length === 0) {
      showNotification('Mohon centang minimal satu kelas yang diampu', 'error');
      return;
    }

    setLoading(true);
    try {
      const payloadList = selectedClasses.map(cls => ({
        guru_id: form.guru_id,
        mapel_id: form.mapel_id,
        kelas: cls
      }));

      const { error } = await supabase.from('guru_mapel').insert(payloadList);
      if (error) throw error;
      
      showNotification(`Berhasil menetapkan ${selectedClasses.length} penugasan kelas sekaligus!`, 'success');
      setForm({ guru_id: '', mapel_id: '' });
      setSelectedClasses([]);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan penugasan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('guru_mapel').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification('Penugasan berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus penugasan', 'error');
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pembagian Tugas Mengajar Guru</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Petakan mapel ke guru dan pilih rombel kelas secara massal menggunakan kotak centang</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
        <div className="xl:col-span-1 w-full">
          <Card title="Tambah Penugasan Cepat" subtitle="Pilih guru, mapel, dan centang kelasnya">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select 
                label="Pilih Guru" 
                required 
                value={form.guru_id} 
                onChange={(e: any) => setForm({...form, guru_id: e.target.value})} 
                options={guruList.map(g => ({ label: `${g.nama} (${g.niy || '-'})`, value: g.id }))} 
              />
              <Select 
                label="Mata Pelajaran" 
                required 
                value={form.mapel_id} 
                onChange={(e: any) => setForm({...form, mapel_id: e.target.value})} 
                options={uniqueMapelList.map((m: any) => ({ label: m.nama_mapel, value: m.id }))} 
              />

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Pilih Rombel Kelas</label>
                  {availableClasses.length > 0 && (
                    <button type="button" onClick={handleSelectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                      {selectedClasses.length === availableClasses.length ? 'Batalkan Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>

                {availableClasses.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                    Belum ada data kelas pada data siswa.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {availableClasses.map((cls: string) => {
                      const isChecked = selectedClasses.includes(cls);
                      return (
                        <label 
                          key={cls} 
                          className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(cls)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span>Kelas {cls}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-400">Anda bisa mencentang lebih dari satu kelas sekaligus (misal: XI F1 & XI F2).</p>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {loading ? 'Menyimpan...' : <><Icons.Plus /> Simpan Penugasan Massal</>}
              </button>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full">
          <Card title="Daftar Penugasan Aktif" subtitle="Daftar rombel kelas dan mapel per guru pengampu">
            {/* Bagian Filter Kelas & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 pt-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Cari nama guru atau mata pelajaran..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
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
                    <th className="px-4 sm:px-6 py-3.5">Nama Guru</th>
                    <th className="px-4 sm:px-6 py-3.5">Mata Pelajaran</th>
                    <th className="px-4 sm:px-6 py-3.5">Rombel Kelas</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data...</td></tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada penugasan guru yang sesuai.</td></tr>
                  ) : (
                    filteredAssignments.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-slate-900">{item.guru?.nama}</td>
                        <td className="px-4 sm:px-6 py-3.5 text-slate-700">{item.mapel?.nama_mapel}</td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Kelas {item.kelas}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <button onClick={() => setDeleteTarget(item)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl">
                            <Icons.Trash />
                          </button>
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Penugasan?"
        message={`Hapus penugasan mengajar untuk guru ${deleteTarget?.guru?.nama}?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}