// src/views/SistemAbsensiView.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card } from '../components/UIComponents';

export default function SistemAbsensiView({ showNotification, user }: any) {
  // === STATE NAVIGATION ===
  const [activeTab, setActiveTab] = useState<'input' | 'rekap_harian' | 'detail' | 'rekap_bulanan'>('rekap_harian');

  // === STATE FILTER & DATA ===
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [kehadiranList, setKehadiranList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // === STATE KHUSUS INPUT ABSENSI ===
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});

  // 1. Fetch Data Global untuk Rekap (Semua Kelas & Kehadiran Bulan Ini)
  const fetchData = useCallback(async () => {
    setFetchLoading(true);
    try {
      let allSiswa: any[] = [];
      let startSiswa = 0;
      let hasMoreSiswa = true;
      while (hasMoreSiswa) {
        const { data, error } = await supabase.from('siswa').select('*').order('kelas').order('nama').range(startSiswa, startSiswa + 999);
        if (error) throw error;
        allSiswa = [...allSiswa, ...(data || [])];
        if ((data || []).length < 1000) hasMoreSiswa = false;
        else startSiswa += 1000;
      }
      setSiswaList(allSiswa);

      const startDate = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${selectedMonth}-${lastDay}`;

      let allKehadiran: any[] = [];
      let startHadir = 0;
      let hasMoreHadir = true;
      while (hasMoreHadir) {
        const { data, error } = await supabase.from('kehadiran').select('*').gte('tanggal', startDate).lte('tanggal', endDate).range(startHadir, startHadir + 999);
        if (error) throw error;
        allKehadiran = [...allKehadiran, ...(data || [])];
        if ((data || []).length < 1000) hasMoreHadir = false;
        else startHadir += 1000;
      }
      setKehadiranList(allKehadiran);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data', 'error');
    } finally {
      setFetchLoading(false);
    }
  }, [selectedMonth, showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableClasses = useMemo(() => Array.from(new Set(siswaList.map(s => s.kelas?.trim()).filter(Boolean))).sort(), [siswaList]);

  // 2. Fetch Kelas Binaan BK (Aman dari error UUID untuk akun Admin)
  useEffect(() => {
    const fetchBkClasses = async () => {
      if (!user?.id || user.role === 'admin' || user.id === 'admin-123') {
        if (availableClasses.length > 0) {
          setAssignedClasses(availableClasses);
          if (!selectedClass) setSelectedClass(availableClasses[0]);
        }
        return;
      }

      try {
        const { data, error } = await supabase.from('bk_mapping').select('kelas').eq('guru_id', user.id);
        if (error) throw error;
        const classes = (data || []).map((m: any) => m.kelas);
        
        const finalClasses = classes.length > 0 ? classes : availableClasses;
        setAssignedClasses(finalClasses);
        
        if (!selectedClass && finalClasses.length > 0) {
          setSelectedClass(finalClasses[0]);
        }
      } catch (err: any) {
        setAssignedClasses(availableClasses);
        if (!selectedClass && availableClasses.length > 0) setSelectedClass(availableClasses[0]);
      }
    };

    if (availableClasses.length > 0) {
      fetchBkClasses();
    }
  }, [user, availableClasses, selectedClass]);

  // 3. Inisialisasi Default 'Hadir' atau Data yang Sudah Ada saat Kelas/Tanggal Dipilih
  useEffect(() => {
    if (!selectedClass || siswaList.length === 0) return;
    
    const studentsInClass = siswaList.filter(s => s.kelas?.trim() === selectedClass);
    const initialStatus: Record<string, string> = {};
    const todayRecords = kehadiranList.filter(k => k.tanggal === selectedDate);
    
    studentsInClass.forEach((s: any) => {
      if (s.id) {
        const existingRecord = todayRecords.find(r => r.nisn === s.nisn || r.nisn === s.nis);
        initialStatus[s.id] = existingRecord ? existingRecord.keterangan : 'Hadir';
      }
    });
    setAttendanceRecords(initialStatus);
  }, [selectedClass, siswaList, selectedDate, kehadiranList]);


  // === HANDLER INPUT ABSENSI ===
  const handleAttendanceChange = (siswaId: string, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [siswaId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    const studentsInClass = siswaList.filter(s => s.kelas?.trim() === selectedClass);
    
    if (!selectedClass || studentsInClass.length === 0) {
      showNotification('Tidak ada data siswa untuk disimpan', 'error');
      return;
    }

    setLoading(true);
    try {
      const nisnList = studentsInClass.map(s => s.nisn || s.nis).filter(Boolean);

      // 1. Hapus data absensi lama di tanggal & kelas ini terlebih dahulu (Mendukung fungsi Edit)
      if (nisnList.length > 0) {
        const deletePromises = nisnList.map(identifier => 
          (supabase.from('kehadiran').delete() as any).match({ 
            tanggal: selectedDate, 
            nisn: identifier 
          })
        );
        await Promise.all(deletePromises);
      }

      // 2. Masukkan data absensi baru / hasil perubahan
      const payloadList = Object.entries(attendanceRecords).map(([siswaId, status]) => {
        const foundSiswa = studentsInClass.find(s => s.id === siswaId);
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
      
      showNotification(`Berhasil memperbarui rekap absensi ${selectedClass}!`, 'success');
      await fetchData();
      setActiveTab('rekap_harian');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan kehadiran', 'error');
    } finally {
      setLoading(false);
    }
  };

  const prepareInputData = (kelas: string, date: string) => {
    setSelectedClass(kelas);
    setSelectedDate(date);
    setActiveTab('input');
  };


  // === DATA PROCESSOR REKAP ===
  const dailyData = useMemo(() => {
    const todayRecords = kehadiranList.filter(k => k.tanggal === selectedDate);
    const classMap: Record<string, { total: number, hadir: number, sakit: number, izin: number, alfa: number, absentStudents: any[] }> = {};
    availableClasses.forEach(cls => { classMap[cls] = { total: 0, hadir: 0, sakit: 0, izin: 0, alfa: 0, absentStudents: [] }; });

    siswaList.forEach(s => {
      const cls = s.kelas?.trim();
      if (!cls || !classMap[cls]) return;
      classMap[cls].total++;
      const record = todayRecords.find(r => r.nisn === s.nisn || r.nisn === s.nis);
      if (record) {
        const ket = (record.keterangan || '').toLowerCase();
        if (ket.includes('hadir')) classMap[cls].hadir++;
        else if (ket.includes('sakit')) { classMap[cls].sakit++; classMap[cls].absentStudents.push({ nama: s.nama, ket: 'Sakit' }); }
        else if (ket.includes('izin')) { classMap[cls].izin++; classMap[cls].absentStudents.push({ nama: s.nama, ket: 'Izin' }); }
        else { classMap[cls].alfa++; classMap[cls].absentStudents.push({ nama: s.nama, ket: 'Alpha' }); }
      }
    });
    return availableClasses.map(cls => ({ kelas: cls, ...classMap[cls] }));
  }, [siswaList, kehadiranList, selectedDate, availableClasses]);

  const dailyGlobalStats = useMemo(() => dailyData.reduce((acc, curr) => ({
    hadir: acc.hadir + curr.hadir, sakit: acc.sakit + curr.sakit, izin: acc.izin + curr.izin, alfa: acc.alfa + curr.alfa, total: acc.total + curr.total
  }), { hadir: 0, sakit: 0, izin: 0, alfa: 0, total: 0 }), [dailyData]);

  const detailData = useMemo(() => {
    return siswaList.filter(s => s.kelas?.trim() === selectedClass).map(s => {
      const records = kehadiranList.filter(k => (k.nisn === s.nisn || k.nisn === s.nis));
      let h = 0, sk = 0, i = 0, a = 0;
      records.forEach(r => {
        const ket = (r.keterangan || '').toLowerCase();
        if (ket.includes('hadir')) h++; else if (ket.includes('sakit')) sk++; else if (ket.includes('izin')) i++; else a++;
      });
      const total = h + sk + i + a;
      return { id: s.id, nis: s.nisn || s.nis || '-', nama: s.nama, h, s: sk, i, a, pct: total === 0 ? 0 : (h / total) * 100 };
    });
  }, [siswaList, kehadiranList, selectedClass]);

  const monthlyData = useMemo(() => {
    const classMap: Record<string, { hadir: number, sakit: number, izin: number, alfa: number }> = {};
    availableClasses.forEach(cls => classMap[cls] = { hadir: 0, sakit: 0, izin: 0, alfa: 0 });

    siswaList.forEach(s => {
      const cls = s.kelas?.trim();
      if (!cls || !classMap[cls]) return;
      const records = kehadiranList.filter(k => (k.nisn === s.nisn || k.nisn === s.nis));
      records.forEach(r => {
        const ket = (r.keterangan || '').toLowerCase();
        if (ket.includes('hadir')) classMap[cls].hadir++; else if (ket.includes('sakit')) classMap[cls].sakit++; else if (ket.includes('izin')) classMap[cls].izin++; else classMap[cls].alfa++;
      });
    });
    return availableClasses.map(cls => {
      const { hadir, sakit, izin, alfa } = classMap[cls];
      const total = hadir + sakit + izin + alfa;
      return { kelas: cls, hadir, sakit, izin, alfa, pct: total === 0 ? 0 : (hadir / total) * 100 };
    });
  }, [siswaList, kehadiranList, availableClasses]);

  const monthlyGlobalStats = useMemo(() => monthlyData.reduce((acc, curr) => ({
    hadir: acc.hadir + curr.hadir, sakit: acc.sakit + curr.sakit, izin: acc.izin + curr.izin, alfa: acc.alfa + curr.alfa
  }), { hadir: 0, sakit: 0, izin: 0, alfa: 0 }), [monthlyData]);


  return (
    <div className="w-full bg-slate-50 min-h-screen text-slate-800">
      
      {/* HEADER & TABS */}
      <div className="bg-indigo-600 rounded-3xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md mb-6">
        <h1 className="font-extrabold text-xl sm:text-2xl text-white flex items-center gap-3">
          <span className="bg-white/20 p-2 rounded-xl"><Icons.FileText /></span>
          Sistem Absensi Santri
        </h1>
        
        <div className="flex flex-wrap items-center gap-1.5 bg-indigo-800/40 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('input')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'input' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Input Absensi</button>
          <button onClick={() => setActiveTab('rekap_harian')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'rekap_harian' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Rekap Hari Ini</button>
          <button onClick={() => setActiveTab('detail')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'detail' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Detail Kehadiran</button>
          <button onClick={() => setActiveTab('rekap_bulanan')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'rekap_bulanan' ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}>Rekap Bulanan</button>
        </div>
      </div>

      {fetchLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Memuat data absensi...</div>
      ) : (
        <>
          {/* ================= TAB 1: INPUT ABSENSI ================= */}
          {activeTab === 'input' && (
            <div className="space-y-6 w-full text-left animate-in fade-in duration-300">
              
              {assignedClasses.length === 0 ? (
                <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Belum Ada Kelas Tersedia</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Belum ada data kelas atau siswa yang terdaftar di sistem.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-sm w-full">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Pilih Kelas</label>
                      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500">
                        {assignedClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tanggal Absensi</label>
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  <Card title={`Absensi Kelas ${selectedClass}`} subtitle={`Tanggal Rekam: ${selectedDate}`}>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 sm:px-6 py-3.5">No</th>
                            <th className="px-4 sm:px-6 py-3.5">NIS / NISN</th>
                            <th className="px-4 sm:px-6 py-3.5">Nama Siswa</th>
                            <th className="px-4 sm:px-6 py-3.5 text-center">Status Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {siswaList.filter(s => s.kelas?.trim() === selectedClass).length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Tidak ada siswa di kelas ini.</td></tr>
                          ) : (
                            siswaList.filter(s => s.kelas?.trim() === selectedClass).map((siswa, idx) => {
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
                      <button onClick={handleSaveAttendance} disabled={loading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all">
                        {loading ? 'Menyimpan...' : 'Simpan Rekap Kehadiran'}
                      </button>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}


          {/* ================= TAB 2: REKAP HARI INI ================= */}
          {activeTab === 'rekap_harian' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Presensi</label>
                  <div className="flex items-center gap-3">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
                    <button onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-colors">Hari Ini</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Progres: <b className="text-slate-800">{dailyData.filter(d => (d.hadir + d.sakit + d.izin + d.alfa) > 0).length}</b> dari {availableClasses.length} Rombel Terinput
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3">Statistik Kehadiran Seluruh Santri ({selectedDate})</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-emerald-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hadir Hari Ini</p>
                    <p className="text-3xl font-extrabold text-emerald-500 mt-1">{dailyGlobalStats.hadir}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sakit</p>
                    <p className="text-3xl font-extrabold text-amber-500 mt-1">{dailyGlobalStats.sakit}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-blue-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Izin</p>
                    <p className="text-3xl font-extrabold text-blue-500 mt-1">{dailyGlobalStats.izin}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alpha</p>
                    <p className="text-3xl font-extrabold text-rose-500 mt-1">{dailyGlobalStats.alfa}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-slate-700 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">% Kehadiran</p>
                    <p className="text-3xl font-extrabold text-slate-700 mt-1">
                      {dailyGlobalStats.total > 0 ? ((dailyGlobalStats.hadir / dailyGlobalStats.total) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm uppercase">Rekap Presensi Harian Per Rombel Kelas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                    <thead className="bg-slate-50/50 text-[11px] font-extrabold text-slate-500">
                      <tr>
                        <th className="px-5 py-4">NO</th>
                        <th className="px-5 py-4">KELAS</th>
                        <th className="px-5 py-4 text-center">TOTAL SISWA</th>
                        <th className="px-5 py-4 text-center text-emerald-600">HADIR</th>
                        <th className="px-5 py-4 text-center text-amber-600">SAKIT</th>
                        <th className="px-5 py-4 text-center text-blue-600">IZIN</th>
                        <th className="px-5 py-4 text-center text-rose-600">ALPHA</th>
                        <th className="px-5 py-4 text-center">% HADIR</th>
                        <th className="px-5 py-4">SANTRI TIDAK HADIR HARI INI</th>
                        <th className="px-5 py-4 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyData.map((row, idx) => {
                        const isInputted = (row.hadir + row.sakit + row.izin + row.alfa) > 0;
                        const pct = row.total > 0 ? ((row.hadir / row.total) * 100).toFixed(1) : 0;
                        return (
                          <tr key={row.kelas} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-5 py-3 font-bold text-slate-800">{row.kelas}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-600">{row.total}</td>
                            <td className="px-5 py-3 text-center font-bold text-emerald-600">{row.hadir}</td>
                            <td className="px-5 py-3 text-center font-bold text-amber-600">{row.sakit}</td>
                            <td className="px-5 py-3 text-center font-bold text-blue-600">{row.izin}</td>
                            <td className="px-5 py-3 text-center font-bold text-rose-600">{row.alfa}</td>
                            <td className="px-5 py-3 text-center">
                              {isInputted ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold text-xs">{pct}%</span>
                              ) : (
                                <span className="bg-rose-50 text-rose-500 border border-rose-200 px-2.5 py-1 rounded-full font-bold text-[10px]">Belum Diabsen</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {!isInputted ? <span className="text-slate-300">-</span> : row.absentStudents.length === 0 ? <span className="text-emerald-500 font-medium text-xs">-</span> : (
                                <div className="flex flex-wrap gap-1.5">
                                  {row.absentStudents.map((abs, i) => (
                                    <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${abs.ket === 'Sakit' ? 'bg-amber-50 text-amber-700 border-amber-200' : abs.ket === 'Izin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                      {abs.nama} ({abs.ket})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => prepareInputData(row.kelas, selectedDate)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isInputted ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}>
                                {isInputted ? 'Edit' : 'Input'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* ================= TAB 3: DETAIL KEHADIRAN ================= */}
          {activeTab === 'detail' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-end gap-4">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilih Kelas</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                    {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilih Bulan</label>
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-4">NO</th>
                      <th className="px-5 py-4">NIS</th>
                      <th className="px-5 py-4">NAMA SANTRI</th>
                      <th className="px-5 py-4 text-center text-emerald-600">H</th>
                      <th className="px-5 py-4 text-center text-amber-600">S</th>
                      <th className="px-5 py-4 text-center text-blue-600">I</th>
                      <th className="px-5 py-4 text-center text-rose-600">A</th>
                      <th className="px-5 py-4 text-center">PERSENTASE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailData.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{row.nis}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{row.nama}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{row.h}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-amber-600">{row.s}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-blue-600">{row.i}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-rose-600">{row.a}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.pct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {row.pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* ================= TAB 4: REKAP BULANAN ================= */}
          {activeTab === 'rekap_bulanan' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-1.5 min-w-[250px]">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilih Bulan Rekapitulasi</label>
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3">Statistik Absensi Bulan {selectedMonth}</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Hadir</p>
                    <p className="text-3xl font-extrabold text-emerald-500 mt-1">{monthlyGlobalStats.hadir}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Sakit</p>
                    <p className="text-3xl font-extrabold text-amber-500 mt-1">{monthlyGlobalStats.sakit}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-blue-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Izin</p>
                    <p className="text-3xl font-extrabold text-blue-500 mt-1">{monthlyGlobalStats.izin}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Alpha</p>
                    <p className="text-3xl font-extrabold text-rose-500 mt-1">{monthlyGlobalStats.alfa}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">% Kehadiran</p>
                    <p className="text-3xl font-extrabold text-slate-700 mt-1">
                      {(monthlyGlobalStats.hadir + monthlyGlobalStats.sakit + monthlyGlobalStats.izin + monthlyGlobalStats.alfa) > 0 
                        ? ((monthlyGlobalStats.hadir / (monthlyGlobalStats.hadir + monthlyGlobalStats.sakit + monthlyGlobalStats.izin + monthlyGlobalStats.alfa)) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-[11px] font-extrabold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">KELAS</th>
                      <th className="px-6 py-4 text-center text-emerald-600 bg-emerald-50/30">HADIR</th>
                      <th className="px-6 py-4 text-center text-amber-600 bg-amber-50/30">SAKIT</th>
                      <th className="px-6 py-4 text-center text-blue-600 bg-blue-50/30">IZIN</th>
                      <th className="px-6 py-4 text-center text-rose-600 bg-rose-50/30">ALPHA</th>
                      <th className="px-6 py-4 text-center">PERSENTASE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyData.map(row => (
                      <tr key={row.kelas} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-extrabold text-slate-800">{row.kelas}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-emerald-600 bg-emerald-50/10">{row.hadir}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-amber-600 bg-amber-50/10">{row.sakit}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-blue-600 bg-blue-50/10">{row.izin}</td>
                        <td className="px-6 py-3.5 text-center font-bold text-rose-600 bg-rose-50/10">{row.alfa}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{row.pct.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}