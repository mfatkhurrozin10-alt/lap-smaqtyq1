import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from '../components/UIComponents';

export default function InputPoinKasusView({ showNotification, user }: any) {
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [masterPoinList, setMasterPoinList] = useState<any[]>([]);
  
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [selectedMasterPoinId, setSelectedMasterPoinId] = useState('');
  const [catatanPoin, setCatatanPoin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBkClasses = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase.from('bk_mapping').select('kelas').eq('guru_id', user.id);
        if (error) throw error;
        const classes = (data || []).map((m: any) => m.kelas);
        setAssignedClasses(classes);
        if (classes.length > 0) setSelectedClass(classes[0]);
      } catch (err: any) {
        showNotification(err.message || 'Gagal memuat kelas binaan', 'error');
      }
    };
    fetchBkClasses();
  }, [user]);

  useEffect(() => {
    const fetchMasterPoin = async () => {
      const { data } = await supabase.from('master_poin').select('*').order('nama_kegiatan');
      setMasterPoinList(data || []);
    };
    fetchMasterPoin();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSiswa = async () => {
      const { data } = await supabase.from('siswa').select('*').eq('kelas', selectedClass).order('nama');
      setSiswaList(data || []);
      setSelectedSiswaId('');
    };
    fetchSiswa();
  }, [selectedClass]);

  const handleSavePoin = async (e: any) => {
    e.preventDefault();
    if (!selectedSiswaId || !selectedMasterPoinId) {
      showNotification('Pilih siswa dan jenis kriteria poin terlebih dahulu', 'error');
      return;
    }

    const foundPoinItem = masterPoinList.find(p => p.id === selectedMasterPoinId);
    if (!foundPoinItem) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('catatan_bk').insert([{
        siswa_id: selectedSiswaId,
        guru_id: user.id,
        tanggal: selectedDate,
        kategori: foundPoinItem.jenis,
        keterangan: foundPoinItem.nama_kegiatan + (catatanPoin ? ` (${catatanPoin})` : ''),
        poin: foundPoinItem.bobot
      }]);

      if (error) throw error;
      showNotification('Catatan poin kedisiplinan berhasil direkam!', 'success');
      setSelectedMasterPoinId('');
      setCatatanPoin('');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan catatan poin', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto text-left px-2 sm:px-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Catatan Poin & Pelanggaran Siswa</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Rekam kedisiplinan, pelanggaran, atau penghargaan prestasi peserta didik</p>
      </div>

      {assignedClasses.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">Belum Ada Kelas Binaan BK</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Akun Anda belum diatur memiliki kelas binaan oleh Administrator.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Kolom Form Input (Lebar 1 grid di layar besar) */}
          <div className="lg:col-span-1 w-full">
            <Card title="Input Catatan Poin" subtitle="Pilih kelas dan siswa yang bersangkutan">
              <form onSubmit={handleSavePoin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Pilih Kelas Binaan</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none">
                    {assignedClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Pilih Siswa</label>
                  <select value={selectedSiswaId} onChange={(e) => setSelectedSiswaId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none" required>
                    <option value="">-- Pilih Siswa Kelas {selectedClass} --</option>
                    {siswaList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.nis || s.nisn || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Tanggal Kasus</label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Jenis Kasus / Penghargaan</label>
                  <select value={selectedMasterPoinId} onChange={(e) => setSelectedMasterPoinId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none" required>
                    <option value="">-- Pilih Kriteria Master Poin --</option>
                    {masterPoinList.map(mp => (
                      <option key={mp.id} value={mp.id}>
                        [{mp.jenis.toUpperCase()}] {mp.nama_kegiatan} ({mp.bobot > 0 ? `+${mp.bobot}` : mp.bobot} Poin)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Catatan Tambahan (Opsional)</label>
                  <textarea value={catatanPoin} onChange={(e) => setCatatanPoin(e.target.value)} placeholder="Keterangan kronologis singkat..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none h-24 resize-none" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                  {loading ? 'Menyimpan...' : 'Rekam Catatan Poin'}
                </button>
              </form>
            </Card>
          </div>

          {/* Kolom Tabel Daftar Siswa (Lebar 2 grid di layar besar) */}
          <div className="lg:col-span-2 w-full">
            <Card title={`Daftar Siswa Kelas ${selectedClass}`} subtitle="Klik form di samping atau tombol aksi untuk mencatat kasus kedisiplinan">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">No</th>
                      <th className="px-4 sm:px-6 py-3.5">NIS / NISN</th>
                      <th className="px-4 sm:px-6 py-3.5">Nama Siswa</th>
                      <th className="px-4 sm:px-6 py-3.5 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {siswaList.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada siswa terdaftar.</td></tr>
                    ) : (
                      siswaList.map((siswa, idx) => (
                        <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-mono font-semibold text-slate-600">{siswa.nis || siswa.nisn || '-'}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">{siswa.nama}</td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <button 
                              onClick={() => setSelectedSiswaId(siswa.id)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              Pilih untuk Kasus
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
      )}
    </div>
  );
}