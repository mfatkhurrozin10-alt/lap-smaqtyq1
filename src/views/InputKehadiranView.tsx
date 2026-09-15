import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from '../components/UIComponents';

export default function InputKehadiranView({ showNotification, user }: any) {
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [siswaList, setSiswaList] = useState<any[]>([]);
  // Menggunakan ID siswa sebagai key agar terisolasi sempurna dan tidak stuck
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Ambil kelas binaan BK
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
        showNotification(err.message || 'Gagal memuat kelas binaan BK', 'error');
      }
    };
    fetchBkClasses();
  }, [user]);

  // Ambil siswa berdasarkan kelas & set default 'Hadir' berdasarkan ID siswa
  useEffect(() => {
    if (!selectedClass) return;
    const fetchSiswa = async () => {
      setFetchLoading(true);
      try {
        const { data, error } = await supabase.from('siswa').select('*').eq('kelas', selectedClass).order('nama');
        if (error) throw error;
        const list = data || [];
        setSiswaList(list);

        // Inisialisasi default 'Hadir' menggunakan ID unik siswa (s.id)
        const initialStatus: Record<string, string> = {};
        list.forEach((s: any) => {
          if (s.id) {
            initialStatus[s.id] = 'Hadir';
          }
        });
        setAttendanceRecords(initialStatus);
      } catch (err: any) {
        showNotification(err.message || 'Gagal memuat daftar siswa', 'error');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchSiswa();
  }, [selectedClass]);

  const handleAttendanceChange = (siswaId: string, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [siswaId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || siswaList.length === 0) {
      showNotification('Tidak ada data siswa untuk disimpan', 'error');
      return;
    }

    setLoading(true);
    try {
      const payloadList = Object.entries(attendanceRecords).map(([siswaId, status]) => {
        const foundSiswa = siswaList.find(s => s.id === siswaId);
        // Mendapatkan NIS/NISN secara fleksibel dari kolom yang tersedia di database
        const identifier = foundSiswa?.nisn || foundSiswa?.nis || '-';
        return {
          nisn: identifier,
          nama: foundSiswa?.nama || 'Siswa',
          tanggal: selectedDate,
          keterangan: status
        };
      });

      const { error } = await supabase.from('kehadiran').insert(payloadList);
      if (error) throw error;
      showNotification(`Berhasil merekam absensi ${payloadList.length} peserta didik!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan kehadiran', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Kehadiran Siswa</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Catat rekapitulasi absensi harian kelas binaan bimbingan konseling</p>
      </div>

      {assignedClasses.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">Belum Ada Kelas Binaan BK</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Akun Anda belum diatur memiliki kelas binaan oleh Administrator.</p>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-sm w-full">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Pilih Kelas Binaan</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none">
                {assignedClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Absensi</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none" />
            </div>
          </div>

          <Card title={`Absensi Kelas ${selectedClass}`} subtitle={`Tanggal Rekam: ${selectedDate}`}>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">No</th>
                    <th className="px-4 sm:px-6 py-3.5">NIS / NISN</th>
                    <th className="px-4 sm:px-6 py-3.5">Nama Siswa</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data siswa...</td></tr>
                  ) : siswaList.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada siswa di kelas ini.</td></tr>
                  ) : (
                    siswaList.map((siswa, idx) => {
                      const currentStatus = attendanceRecords[siswa.id] || 'Hadir';
                      const displayIdentitas = siswa.nis || siswa.nisn || '-';

                      return (
                        <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-mono font-semibold text-slate-600">{displayIdentitas}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">{siswa.nama}</td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                              {['Hadir', 'Sakit', 'Izin', 'Alpha'].map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleAttendanceChange(siswa.id, st)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === st 
                                      ? (st === 'Hadir' ? 'bg-emerald-600 text-white shadow' : st === 'Sakit' ? 'bg-blue-600 text-white shadow' : st === 'Izin' ? 'bg-amber-600 text-white shadow' : 'bg-rose-600 text-white shadow') 
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="pt-6 flex justify-end">
              <button onClick={handleSaveAttendance} disabled={loading || siswaList.length === 0} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                {loading ? 'Menyimpan...' : 'Simpan Rekap Kehadiran'}
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}