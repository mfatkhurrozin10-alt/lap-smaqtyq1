// src/views/RekapKehadiranView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, ImportModal } from '../components/UIComponents';

export default function RekapKehadiranView({ showNotification, user }: any) {
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { hadir: number; sakit: number; izin: number; alpha: number }>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSiswaAndAttendance = async () => {
      setFetchLoading(true);
      try {
        // Tentukan rentang tanggal awal dan akhir bulan agar aman dari limit baris Supabase
        const startDate = `${selectedMonth}-01`;
        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${selectedMonth}-${lastDay}`;

        const [rSiswa, rKehadiran] = await Promise.all([
          supabase.from('siswa').select('*').eq('kelas', selectedClass).order('nama'),
          supabase.from('kehadiran')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
        ]);

        if (rSiswa.error) throw rSiswa.error;
        if (rKehadiran.error) throw rKehadiran.error;

        const list = rSiswa.data || [];
        setSiswaList(list);
        const allKehadiran = rKehadiran.data || [];
        
        const summaryMap: Record<string, { hadir: number; sakit: number; izin: number; alpha: number }> = {};
        
        list.forEach((s: any) => {
          const nisnVal = String(s.nisn || '').trim();
          const nisVal = String(s.nis || '').trim();
          
          const sRecords = allKehadiran.filter((k: any) => {
            const kIdent = String(k.nisn || '').trim();
            return (nisnVal && kIdent === nisnVal) || (nisVal && kIdent === nisVal) || k.nama === s.nama;
          });
          
          summaryMap[s.id] = {
            hadir: sRecords.filter((k: any) => (k.keterangan || '').toLowerCase().includes('hadir')).length,
            sakit: sRecords.filter((k: any) => (k.keterangan || '').toLowerCase().includes('sakit')).length,
            izin: sRecords.filter((k: any) => (k.keterangan || '').toLowerCase().includes('izin')).length,
            alpha: sRecords.filter((k: any) => {
              const ket = (k.keterangan || '').toLowerCase();
              return ket.includes('alpha') || ket.includes('alfa') || ket.includes('mangkir');
            }).length,
          };
        });

        setAttendanceRecords(summaryMap);
      } catch (err: any) {
        showNotification(err.message || 'Gagal memuat data kehadiran bulanan', 'error');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchSiswaAndAttendance();
  }, [selectedClass, selectedMonth]);

  // Hitung metrik Dashboard Statistik secara real-time berdasarkan data rekap kelas aktif
  const stats = useMemo(() => {
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;

    Object.values(attendanceRecords).forEach((rec: any) => {
      totalHadir += rec.hadir || 0;
      totalSakit += rec.sakit || 0;
      totalIzin += rec.izin || 0;
      totalAlpha += rec.alpha || 0;
    });

    const totalSemua = totalHadir + totalSakit + totalIzin + totalAlpha;
    const persentaseHadir = totalSemua > 0 ? ((totalHadir / totalSemua) * 100).toFixed(1) : '0';

    return {
      totalSiswa: siswaList.length,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpha,
      persentaseHadir
    };
  }, [attendanceRecords, siswaList]);

  const handleCountChange = (siswaId: string, type: 'hadir' | 'sakit' | 'izin' | 'alpha', value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setAttendanceRecords(prev => ({
      ...prev,
      [siswaId]: {
        ...(prev[siswaId] || { hadir: 0, sakit: 0, izin: 0, alpha: 0 }),
        [type]: num
      }
    }));
  };

  const handleSaveMonthlyAttendance = async () => {
    if (!selectedClass || siswaList.length === 0) {
      showNotification('Tidak ada data siswa untuk disimpan', 'error');
      return;
    }

    setLoading(true);
    try {
      const targetDate = `${selectedMonth}-01`;

      for (const s of siswaList) {
        const ident = String(s.nisn || s.nis || '').trim();
        if (ident) {
          await (supabase.from('kehadiran') as any).delete().eq('tanggal', targetDate).eq('nisn', ident);
        }
      }

      const payloadList: any[] = [];
      siswaList.forEach(s => {
        const acc = attendanceRecords[s.id] || { hadir: 0, sakit: 0, izin: 0, alpha: 0 };
        const ident = String(s.nisn || s.nis || '-').trim();

        for (let i = 0; i < acc.hadir; i++) payloadList.push({ nisn: ident, nama: s.nama, tanggal: targetDate, keterangan: 'Hadir' });
        for (let i = 0; i < acc.sakit; i++) payloadList.push({ nisn: ident, nama: s.nama, tanggal: targetDate, keterangan: 'Sakit' });
        for (let i = 0; i < acc.izin; i++) payloadList.push({ nisn: ident, nama: s.nama, tanggal: targetDate, keterangan: 'Izin' });
        for (let i = 0; i < acc.alpha; i++) payloadList.push({ nisn: ident, nama: s.nama, tanggal: targetDate, keterangan: 'Alpha' });
      });

      if (payloadList.length > 0) {
        const { error } = await supabase.from('kehadiran').insert(payloadList);
        if (error) throw error;
      }

      showNotification(`Berhasil menyimpan rekap bulanan kelas ${selectedClass} (${selectedMonth})!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan rekap bulanan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateExcelRow = (row: string[]) => {
    const nisn = row[0]?.trim();
    const nama = row[1]?.trim();
    const hadir = parseInt(row[2]) || 0;
    const sakit = parseInt(row[3]) || 0;
    const izin = parseInt(row[4]) || 0;
    const alpha = parseInt(row[5]) || 0;

    if (!nama) {
      return { valid: false, error: 'Nama siswa wajib diisi pada baris Excel' };
    }

    return {
      valid: true,
      data: { nisn: nisn || '-', nama, hadir, sakit, izin, alpha }
    };
  };

  const handleImportExcel = async (rows: any[]) => {
    const targetDate = `${selectedMonth}-01`;
    const payloadList: any[] = [];

    rows.forEach(r => {
      for (let i = 0; i < r.hadir; i++) payloadList.push({ nisn: r.nisn, nama: r.nama, tanggal: targetDate, keterangan: 'Hadir' });
      for (let i = 0; i < r.sakit; i++) payloadList.push({ nisn: r.nisn, nama: r.nama, tanggal: targetDate, keterangan: 'Sakit' });
      for (let i = 0; i < r.izin; i++) payloadList.push({ nisn: r.nisn, nama: r.nama, tanggal: targetDate, keterangan: 'Izin' });
      for (let i = 0; i < r.alpha; i++) payloadList.push({ nisn: r.nisn, nama: r.nama, tanggal: targetDate, keterangan: 'Alpha' });
    });

    if (payloadList.length === 0) {
      showNotification('Tidak ada data rekap angka yang valid dalam file Excel', 'error');
      return { successCount: 0, errorCount: rows.length };
    }

    const { error } = await supabase.from('kehadiran').insert(payloadList);
    if (error) {
      showNotification(error.message || 'Gagal mengimpor data ke database', 'error');
      return { successCount: 0, errorCount: rows.length };
    }

    showNotification(`Berhasil mengimpor rekap bulanan untuk ${rows.length} siswa!`, 'success');
    setSelectedMonth(prev => prev); 
    return { successCount: rows.length, errorCount: 0 };
  };

  const dynamicTemplateSamples = useMemo(() => {
    if (siswaList.length === 0) {
      return [
        ['1001', 'Contoh Siswa 1', '20', '2', '1', '0'],
        ['1002', 'Contoh Siswa 2', '22', '0', '1', '0']
      ];
    }
    return siswaList.map(s => [
      s.nisn || s.nis || '',
      s.nama || '',
      '', '', '', ''
    ]);
  }, [siswaList]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Rekap Kehadiran Bulanan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Input akumulasi kehadiran bulanan kelas binaan atau unggah file rekap Excel</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shadow-sm"
          >
            <Icons.Upload /> Impor Rekap Excel (.xlsx)
          </button>
        </div>
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
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Pilih Bulan Rekap</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Siswa Kelas</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-slate-900">{stats.totalSiswa}</span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Peserta</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Akumulasi Hadir</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-emerald-600">{stats.totalHadir}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">{stats.persentaseHadir}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Akumulasi Sakit</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-blue-600">{stats.totalSakit}</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">Hari</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Akumulasi Izin</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-amber-600">{stats.totalIzin}</span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">Hari</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Akumulasi Alpha</span>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-rose-600">{stats.totalAlpha}</span>
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">Hari</span>
              </div>
            </div>
          </div>

          <Card title={`Akun Rekap Kehadiran Bulan ${selectedMonth} - Kelas ${selectedClass}`} subtitle="Masukkan jumlah akumulasi hari Hadir, Sakit, Izin, dan Alpha per siswa">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">No</th>
                    <th className="px-4 sm:px-6 py-3.5">NIS / NISN</th>
                    <th className="px-4 sm:px-6 py-3.5">Nama Lengkap Siswa</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Hadir (Hari)</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Sakit (Hari)</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Izin (Hari)</th>
                    <th className="px-4 sm:px-6 py-3.5 text-center">Alpha (Hari)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Memuat daftar siswa...</td></tr>
                  ) : siswaList.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada siswa terdaftar di kelas {selectedClass}.</td></tr>
                  ) : (
                    siswaList.map((siswa, idx) => {
                      const rec = attendanceRecords[siswa.id] || { hadir: 0, sakit: 0, izin: 0, alpha: 0 };
                      return (
                        <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-mono font-semibold text-slate-600">{siswa.nisn || siswa.nis || '-'}</td>
                          <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900">{siswa.nama}</td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={rec.hadir}
                              onChange={(e) => handleCountChange(siswa.id, 'hadir', e.target.value)}
                              className="w-20 px-3 py-1.5 text-center text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={rec.sakit}
                              onChange={(e) => handleCountChange(siswa.id, 'sakit', e.target.value)}
                              className="w-20 px-3 py-1.5 text-center text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={rec.izin}
                              onChange={(e) => handleCountChange(siswa.id, 'izin', e.target.value)}
                              className="w-20 px-3 py-1.5 text-center text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" 
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3.5 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={rec.alpha}
                              onChange={(e) => handleCountChange(siswa.id, 'alpha', e.target.value)}
                              className="w-20 px-3 py-1.5 text-center text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500" 
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-6 flex justify-end">
              <button onClick={handleSaveMonthlyAttendance} disabled={loading || siswaList.length === 0} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                {loading ? 'Menyimpan...' : 'Simpan Akumulasi Bulanan'}
              </button>
            </div>
          </Card>
        </>
      )}

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title={`Impor Rekap Kehadiran Kelas ${selectedClass} (Excel)`}
        templateFileName={`Template_Rekap_Bulanan_Kelas_${selectedClass}.xlsx`}
        templateHeaders={['NIS / NISN', 'Nama Siswa', 'Jumlah Hadir', 'Jumlah Sakit', 'Jumlah Izin', 'Jumlah Alpha']}
        templateSamples={dynamicTemplateSamples}
        validatorAndMapper={validateExcelRow}
        onImport={handleImportExcel}
      />
    </div>
  );
}