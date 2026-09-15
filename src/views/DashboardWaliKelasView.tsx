import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, downloadExcelTemplate } from '../components/UIComponents';

export default function DashboardWaliKelasView({ showNotification, user }: any) {
  const kelasBinaan = user?.kelas_binaan;
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [kehadiranList, setKehadiranList] = useState<any[]>([]);
  const [catatanBkList, setCatatanBkList] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // State untuk modal detail siswa terpilih
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  // State untuk mengontrol tampilan riwayat absensi penuh
  const [showFullAttendanceModal, setShowFullAttendanceModal] = useState(false);

  const fetchData = async () => {
    if (!kelasBinaan) {
      setFetchLoading(false);
      return;
    }
    setFetchLoading(true);
    try {
      const [rSiswa, rNilai, rKehadiran, rCatatanBk] = await Promise.all([
        supabase.from('siswa').select('*').eq('kelas', kelasBinaan).order('nama'),
        supabase.from('nilai').select('*, mapel(nama_mapel, kkm), siswa(nama, nis), ujian(nama_ujian), guru(nama)').eq('kelas', kelasBinaan),
        supabase.from('kehadiran').select('*'),
        supabase.from('catatan_bk').select('*, guru(nama)')
      ]);

      setSiswaList(rSiswa.data || []);
      setNilaiList(rNilai.data || []);
      setKehadiranList(rKehadiran.data || []);
      setCatatanBkList(rCatatanBk.data || []);
    } catch (err: any) {
      console.warn('Catatan opsional:', err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [kelasBinaan]);

  const filteredSiswa = useMemo(() => {
    return siswaList.filter(s => 
      (s.nama || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.nis || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [siswaList, search]);

  // Statistik Keseluruhan Kelas
  const classStats = useMemo(() => {
    if (siswaList.length === 0) return { avgClass: '0', totalNilaiRecords: 0, totalCatatanBk: 0, totalAlpha: 0 };
    
    const totalScoreAll = nilaiList.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
    const avgClass = nilaiList.length > 0 ? (totalScoreAll / nilaiList.length).toFixed(1) : '0';
    
    const siswaIds = new Set(siswaList.map(s => s.id));
    const classCatatanBk = catatanBkList.filter(c => siswaIds.has(c.siswa_id));

    const nisnSet = new Set(siswaList.map(s => String(s.nis || '').trim()));
    const classKehadiran = kehadiranList.filter(k => nisnSet.has(String(k.nisn || '').trim()));
    const totalAlpha = classKehadiran.filter(k => (k.keterangan || '').toLowerCase().includes('alfa')).length;

    return {
      avgClass,
      totalNilaiRecords: nilaiList.length,
      totalCatatanBk: classCatatanBk.length,
      totalAlpha
    };
  }, [siswaList, nilaiList, catatanBkList, kehadiranList]);

  const exportRekapWali = () => {
    if (siswaList.length === 0) {
      showNotification('Tidak ada data siswa di kelas binaan ini', 'error');
      return;
    }
    const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Jumlah Mapel Dinilai', 'Rata-rata Nilai', 'Total Catatan BK', 'Total Absen'];
    const rows = siswaList.map(s => {
      const sNilai = nilaiList.filter(n => n.siswa_id === s.id);
      const totalScore = sNilai.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
      const avg = sNilai.length > 0 ? (totalScore / sNilai.length).toFixed(1) : '0';

      const sBk = catatanBkList.filter(c => c.siswa_id === s.id);
      const sHadir = kehadiranList.filter(k => String(k.nisn || '').trim() === String(s.nis || '').trim());

      return [s.nis || '', s.nama || '', kelasBinaan, String(sNilai.length), avg, String(sBk.length), String(sHadir.length)];
    });

    downloadExcelTemplate(`Rekap_Wali_Kelas_${kelasBinaan}.xlsx`, headers, rows);
    showNotification('Rekap kelas binaan berhasil diunduh!', 'success');
  };

  const handlePrintClass = () => {
    const printContent = document.getElementById('printable-official-class-document');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handlePrintStudent = () => {
    const printContent = document.getElementById('printable-official-student-document');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  if (!kelasBinaan) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800">Kelas Binaan Belum Diatur</h3>
        <p className="text-sm text-slate-500 mt-1">Akun Anda belum dikonfigurasi sebagai Wali Kelas oleh Administrator. Silakan hubungi admin.</p>
      </div>
    );
  }

  const studentNilaiDetail = selectedStudent ? nilaiList.filter(n => n.siswa_id === selectedStudent.id) : [];
  const studentCatatanBkDetail = selectedStudent ? catatanBkList.filter(c => c.siswa_id === selectedStudent.id) : [];
  
  const studentKehadiranDetail = selectedStudent ? kehadiranList.filter(k => String(k.nisn || '').trim() === String(selectedStudent.nis || '').trim()) : [];
  const studentMonthlyAttendance = useMemo(() => {
    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let hadir = 0;
    studentKehadiranDetail.forEach(k => {
      const ket = (k.keterangan || '').toLowerCase();
      if (ket.includes('sakit')) sakit++;
      else if (ket.includes('izin')) izin++;
      else if (ket.includes('alfa')) alfa++;
      else hadir++;
    });
    return { sakit, izin, alfa, hadir, total: studentKehadiranDetail.length };
  }, [studentKehadiranDetail]);

  return (
    <div className="space-y-6 w-full text-left">
      
      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dashboard Wali Kelas ({kelasBinaan})</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-100">
              {siswaList.length} Peserta Didik Aktif
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola rekap akademik, catatan BK, absensi, dan cetak dokumen resmi peserta didik</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handlePrintClass}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors shadow-sm"
          >
            <Icons.FileText /> Cetak Dokumen Kelas
          </button>
          <button 
            onClick={exportRekapWali}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm"
          >
            <Icons.Download /> Ekspor Excel
          </button>
          <button 
            onClick={fetchData} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Icons.Refresh /> Segarkan
          </button>
        </div>
      </div>

      {/* KARTU INFORMASI WALI KELAS & KELAS BINAAN */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl text-emerald-400 shrink-0">
            {kelasBinaan}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-1">
              <span>● Kelas Aktif Binaan</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">Wali Kelas: {user?.nama || 'Pengajar'}</h3>
            <p className="text-xs text-slate-300 mt-0.5">NIP/NIY: <span className="font-mono text-white">{user?.niy || '-'}</span> • Tanggung jawab penuh akademik & kedisiplinan siswa</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <div className="text-left">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Total Siswa</span>
            <span className="text-sm font-bold text-white">{siswaList.length} Peserta Didik</span>
          </div>
        </div>
      </div>

      {/* KPI STATISTIK KELAS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0"><Icons.GraduationCap /></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Peserta Didik</span>
            <h4 className="text-xl font-black text-slate-900 mt-0.5">{siswaList.length} Siswa</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0"><Icons.Award /></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Nilai Kelas</span>
            <h4 className="text-xl font-black text-emerald-600 mt-0.5">{classStats.avgClass} <span className="text-xs font-normal text-slate-500">/ 100</span></h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0"><Icons.FileText /></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catatan Absensi/Alfa</span>
            <h4 className="text-xl font-black text-slate-900 mt-0.5">{classStats.totalAlpha} <span className="text-xs font-normal text-slate-500">Kasus</span></h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0"><Icons.AlertCircle /></div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Catatan BK</span>
            <h4 className="text-xl font-black text-amber-600 mt-0.5">{classStats.totalCatatanBk} <span className="text-xs font-normal text-slate-500">Catatan</span></h4>
          </div>
        </div>
      </div>

      {/* TABEL UTAMA SISWA KELAS */}
      <Card 
        title={`Daftar Peserta Didik & Rekap Kelas ${kelasBinaan}`}
        subtitle="Klik baris atau tombol 'Lihat Rapor' untuk membuka rincian akademik, catatan BK, dan absensi"
        action={
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa / NIS..."
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
                <th className="px-4 sm:px-6 py-3.5">No</th>
                <th className="px-4 sm:px-6 py-3.5">NIS</th>
                <th className="px-4 sm:px-6 py-3.5">Nama Lengkap Siswa</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Mapel Dinilai</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Rata-rata Nilai</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Catatan BK</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Memuat rekap kelas binaan...</td></tr>
              ) : filteredSiswa.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada siswa terdaftar di kelas ini</td></tr>
              ) : (
                filteredSiswa.map((siswa: any, idx: number) => {
                  const sNilai = nilaiList.filter(n => n.siswa_id === siswa.id);
                  const totalScore = sNilai.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
                  const avg = sNilai.length > 0 ? (totalScore / sNilai.length).toFixed(1) : '0';

                  const sBk = catatanBkList.filter(c => c.siswa_id === siswa.id);

                  return (
                    <tr 
                      key={siswa.id} 
                      onClick={() => setSelectedStudent(siswa)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 sm:px-6 py-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 sm:px-6 py-3.5 font-mono font-semibold text-slate-600">{siswa.nis || '-'}</td>
                      <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {siswa.nama} <span className="text-[11px] font-normal text-slate-400 ml-1">(Klik profil)</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {sNilai.length} Mapel
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${sNilai.length === 0 ? 'bg-slate-100 text-slate-500' : parseFloat(avg) >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {sNilai.length === 0 ? 'Belum Ada Nilai' : avg}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sBk.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {sBk.length === 0 ? 'Aman (0)' : `${sBk.length} Catatan`}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <button className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors">
                          Lihat Rapor
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL PROFIL & RINCIAN SISWA */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">
                  {selectedStudent.nama ? selectedStudent.nama.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>{selectedStudent.nama}</span>
                    <span className="text-[11px] bg-indigo-600 text-white px-2.5 py-0.5 rounded-full font-normal">Kelas {kelasBinaan}</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">NIS: <span className="font-mono font-bold text-white">{selectedStudent.nis || '-'}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintStudent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Icons.FileText /> Cetak Dokumen Resmi
                </button>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <Icons.X />
                </button>
              </div>
            </div>

            {/* Isi Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 w-full">
              
              {/* Ringkasan Profil */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata Nilai Rapor</span>
                  <p className="text-2xl font-black text-indigo-600 mt-1">
                    {studentNilaiDetail.length > 0 
                      ? (studentNilaiDetail.reduce((a, b) => a + (b.nilai || 0), 0) / studentNilaiDetail.length).toFixed(1) 
                      : '0'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan / Kasus BK</span>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {studentCatatanBkDetail.length > 0 ? `${studentCatatanBkDetail.length} Catatan` : <span className="text-emerald-600 font-bold">Aman (0)</span>}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rekap Absensi</span>
                  <p className="text-lg font-bold text-slate-800 mt-1 font-mono">
                    S:{studentMonthlyAttendance.sakit} | I:{studentMonthlyAttendance.izin} | A:{studentMonthlyAttendance.alfa}
                  </p>
                </div>
              </div>

              {/* Tabel Catatan BK Siswa */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Catatan Bimbingan Konseling (BK)</h4>
                </div>
                <div className="w-full overflow-x-auto max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Tanggal</th>
                        <th className="px-4 py-2.5">Kategori / Catatan</th>
                        <th className="px-4 py-2.5">Guru BK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentCatatanBkDetail.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400">Tidak ada catatan BK untuk siswa ini.</td></tr>
                      ) : (
                        studentCatatanBkDetail.map((c: any) => (
                          <tr key={c.id}>
                            <td className="px-4 py-2.5 font-mono">{c.tanggal || '-'}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700">{c.kategori || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-500">{c.guru?.nama || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rekapitulasi Kehadiran & Tombol Detail Absen 1 Bulan Penuh */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-800">Rekapitulasi Kehadiran</h4>
                  <button
                    onClick={() => setShowFullAttendanceModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors shadow-sm w-fit"
                  >
                    <Icons.FileText /> Detail Absen Kehadiran (1 Bulan Penuh)
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center w-full">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 w-full">
                    <span className="text-xs text-slate-500 font-bold block">Sakit (S)</span>
                    <span className="text-xl font-black text-amber-600">{studentMonthlyAttendance.sakit}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 w-full">
                    <span className="text-xs text-slate-500 font-bold block">Izin (I)</span>
                    <span className="text-xl font-black text-blue-600">{studentMonthlyAttendance.izin}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 w-full">
                    <span className="text-xs text-slate-500 font-bold block">Alfa (A)</span>
                    <span className="text-xl font-black text-rose-600">{studentMonthlyAttendance.alfa}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 w-full">
                    <span className="text-xs text-slate-500 font-bold block">Total Kehadiran</span>
                    <span className="text-xl font-black text-slate-800">{studentMonthlyAttendance.total}</span>
                  </div>
                </div>
              </div>

              {/* Tabel Nilai Detail per Mapel & Ujian */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Daftar Nilai Akademik per Mata Pelajaran</h4>
                </div>
                
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Mata Pelajaran</th>
                        <th className="px-4 py-3">Jenis Ujian</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3">Guru Pengampu</th>
                        <th className="px-4 py-3 text-center">KKM</th>
                        <th className="px-4 py-3 text-center">Nilai</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentNilaiDetail.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                            Belum ada catatan nilai akademik yang diinput untuk siswa ini.
                          </td>
                        </tr>
                      ) : (
                        studentNilaiDetail.map((item: any) => {
                          const kkm = item.mapel?.kkm || 75;
                          const isPass = item.nilai >= kkm;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-slate-900">{item.mapel?.nama_mapel || '-'}</td>
                              <td className="px-4 py-3 font-semibold text-indigo-600">{item.ujian?.nama_ujian || '-'}</td>
                              <td className="px-4 py-3 text-slate-500">{item.bulan} ({item.tahun_ajaran})</td>
                              <td className="px-4 py-3 text-slate-600">{item.guru?.nama || '-'}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">{kkm}</td>
                              <td className="px-4 py-3 text-center font-extrabold text-slate-900 text-sm">{item.nilai}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {isPass ? 'Tuntas' : 'Remedial'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button 
                onClick={handlePrintStudent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Icons.FileText /> Cetak Dokumen Resmi Rapor
              </button>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Tutup Profil
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUB-MODAL: DETAIL ABSENSI 1 BULAN PENUH */}
      {showFullAttendanceModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Detail Absensi 1 Bulan Penuh - {selectedStudent.nama}</h3>
              <button onClick={() => setShowFullAttendanceModal(false)} className="p-1.5 text-slate-300 hover:text-white rounded-lg"><Icons.X /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Tanggal</th>
                      <th className="px-4 py-2.5">Keterangan Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentKehadiranDetail.length === 0 ? (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">Tidak ada log absensi tercatat.</td></tr>
                    ) : (
                      studentKehadiranDetail.map((k: any) => (
                        <tr key={k.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono">{k.tanggal || '-'}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{k.keterangan || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowFullAttendanceModal(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LEMBAR CETAK DOKUMEN RESMI SISWA INDIVIDUAL --- */}
      <div id="printable-official-student-document" className="hidden print:block p-10 bg-white text-black font-serif text-left">
        {selectedStudent && (
          <div className="space-y-6 max-w-3xl mx-auto text-sm leading-relaxed">
            
            {/* KOP SURAT RESMI SESUAI GAMBAR */}
            <div className="border-b-4 border-double border-black pb-3 flex items-center justify-between gap-4">
              <div className="shrink-0">
                <div className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-xs text-center p-1">
                  [LOGO YANBUUL QURAN]
                </div>
              </div>
              <div className="text-center flex-1 space-y-0.5">
                <h1 className="text-xl font-black uppercase tracking-tight font-sans">SMA QT YANBUUL QURAN 1</h1>
                <h2 className="text-sm font-bold uppercase tracking-wider font-sans text-slate-800">TERAKREDITASI A</h2>
                <p className="text-[11px] font-sans text-slate-700">Jalan Raya Pati - Tayu KM. 06 Sukoharjo, Wedarijaksa, Pati Kode Pos 59152</p>
                <p className="text-[11px] font-sans text-slate-700">NPSN : 70010053 &nbsp;|&nbsp; Telp: (0295)4102840 &nbsp;|&nbsp; Email: smaqtyqpati@gmail.com</p>
              </div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center pt-2">
              <h3 className="font-bold text-base uppercase underline tracking-wider font-sans">LAPORAN PERKEMBANGAN PESERTA DIDIK</h3>
              <p className="text-xs font-sans text-slate-600 mt-0.5">Semester Berjalan Tahun Ajaran Aktif</p>
            </div>

            {/* IDENTITAS SISWA */}
            <table className="w-full font-sans text-xs my-4 border-collapse">
              <tbody>
                <tr>
                  <td className="py-1 w-36 font-bold">Nama Peserta Didik</td>
                  <td className="py-1">: <span className="font-semibold uppercase">{selectedStudent.nama}</span></td>
                  <td className="py-1 w-32 font-bold">Kelas Binaan</td>
                  <td className="py-1">: {kelasBinaan}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold">Nomor Induk Siswa (NIS)</td>
                  <td className="py-1">: {selectedStudent.nis || '-'}</td>
                  <td className="py-1 font-bold">Wali Kelas</td>
                  <td className="py-1">: {user?.nama || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* 1. REKAPITULASI NILAI AKADEMIK */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase bg-slate-100 p-1.5 border border-black tracking-wider font-sans">I. Capaian Hasil Belajar (Akademik)</h4>
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th className="border border-black p-1.5 w-10">No</th>
                    <th className="border border-black p-1.5 text-left">Mata Pelajaran</th>
                    <th className="border border-black p-1.5 text-left">Jenis Ujian / Asesmen</th>
                    <th className="border border-black p-1.5 w-16">KKM</th>
                    <th className="border border-black p-1.5 w-16">Nilai</th>
                    <th className="border border-black p-1.5 w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentNilaiDetail.length === 0 ? (
                    <tr><td colSpan={6} className="border border-black p-3 text-center italic font-sans">Belum ada data nilai akademik.</td></tr>
                  ) : (
                    studentNilaiDetail.map((item: any, i: number) => {
                      const kkm = item.mapel?.kkm || 75;
                      const isPass = item.nilai >= kkm;
                      return (
                        <tr key={item.id}>
                          <td className="border border-black p-1.5 text-center">{i + 1}</td>
                          <td className="border border-black p-1.5 font-semibold">{item.mapel?.nama_mapel}</td>
                          <td className="border border-black p-1.5">{item.ujian?.nama_ujian}</td>
                          <td className="border border-black p-1.5 text-center">{kkm}</td>
                          <td className="border border-black p-1.5 text-center font-bold">{item.nilai}</td>
                          <td className="border border-black p-1.5 text-center">{isPass ? 'Tuntas' : 'Remedial'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. REKAPITULASI ABSENSI BULANAN */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase bg-slate-100 p-1.5 border border-black tracking-wider font-sans">II. Rekapitulasi Kehadiran Bulanan</h4>
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th className="border border-black p-2">Sakit (S)</th>
                    <th className="border border-black p-2">Izin (I)</th>
                    <th className="border border-black p-2">Alfa / Tanpa Keterangan (A)</th>
                    <th className="border border-black p-2">Total Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center font-bold">
                    <td className="border border-black p-2">{studentMonthlyAttendance.sakit} Hari</td>
                    <td className="border border-black p-2">{studentMonthlyAttendance.izin} Hari</td>
                    <td className="border border-black p-2 text-rose-700">{studentMonthlyAttendance.alfa} Hari</td>
                    <td className="border border-black p-2">{studentMonthlyAttendance.total} Hari</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. CATATAN / KASUS BK */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase bg-slate-100 p-1.5 border border-black tracking-wider font-sans">III. Catatan & Bimbingan Konseling (BK)</h4>
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-center">
                    <th className="border border-black p-1.5 w-10">No</th>
                    <th className="border border-black p-1.5 text-left w-32">Tanggal</th>
                    <th className="border border-black p-1.5 text-left">Kategori / Kasus / Catatan Khusus</th>
                    <th className="border border-black p-1.5 text-left w-32">Guru BK</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCatatanBkDetail.length === 0 ? (
                    <tr><td colSpan={4} className="border border-black p-3 text-center italic font-sans">Tidak ada catatan pelanggaran atau kasus BK (Siswa berkedisiplinan baik).</td></tr>
                  ) : (
                    studentCatatanBkDetail.map((c: any, i: number) => (
                      <tr key={c.id}>
                        <td className="border border-black p-1.5 text-center">{i + 1}</td>
                        <td className="border border-black p-1.5 font-mono">{c.tanggal}</td>
                        <td className="border border-black p-1.5 font-semibold">{c.kategori}</td>
                        <td className="border border-black p-1.5">{c.guru?.nama || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* TANDA TANGAN RESMI */}
            <div className="pt-12 grid grid-cols-2 text-xs font-sans">
              <div className="text-center space-y-16">
                <p>Mengetahui,<br/>Orang Tua / Wali Murid</p>
                <p className="font-bold underline">( ................................................... )</p>
              </div>
              <div className="text-center space-y-16">
                <p>Pati, .................................... 20...<br/>Wali Kelas {kelasBinaan}</p>
                <p className="font-bold underline">{user?.nama || '-'}</p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- LEMBAR CETAK DOKUMEN RESMI KELAS (REKAP KELAS) --- */}
      <div id="printable-official-class-document" className="hidden print:block p-10 bg-white text-black font-serif text-left">
        <div className="space-y-6 max-w-4xl mx-auto text-sm leading-relaxed">
          
          {/* KOP SURAT RESMI KELAS */}
          <div className="border-b-4 border-double border-black pb-3 flex items-center justify-between gap-4">
            <div className="shrink-0">
              <div className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-xs text-center p-1">
                [LOGO YANBUUL QURAN]
              </div>
            </div>
            <div className="text-center flex-1 space-y-0.5">
              <h1 className="text-xl font-black uppercase tracking-tight font-sans">SMA QT YANBUUL QURAN 1</h1>
              <h2 className="text-sm font-bold uppercase tracking-wider font-sans text-slate-800">TERAKREDITASI A</h2>
              <p className="text-[11px] font-sans text-slate-700">Jalan Raya Pati - Tayu KM. 06 Sukoharjo, Wedarijaksa, Pati Kode Pos 59152</p>
              <p className="text-[11px] font-sans text-slate-700">NPSN : 70010053 &nbsp;|&nbsp; Telp: (0295)4102840 &nbsp;|&nbsp; Email: smaqtyqpati@gmail.com</p>
            </div>
          </div>

          {/* JUDUL DOKUMEN */}
          <div className="text-center pt-2">
            <h3 className="font-bold text-base uppercase underline tracking-wider font-sans">REKAPITULASI KEMAJUAN AKADEMIK KELAS {kelasBinaan}</h3>
            <p className="text-xs font-sans text-slate-600 mt-0.5">Daftar Rekapitulasi Nilai & Kehadiran Seluruh Peserta Didik Binaan</p>
          </div>

          <table className="w-full font-sans text-xs my-3">
            <tbody>
              <tr>
                <td className="w-32 font-bold">Wali Kelas</td>
                <td>: {user?.nama || '-'}</td>
                <td className="w-32 font-bold">Total Siswa</td>
                <td>: {siswaList.length} Peserta Didik</td>
              </tr>
            </tbody>
          </table>

          {/* TABEL REKAP KELAS */}
          <table className="w-full border-collapse border border-black text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 w-28">NIS</th>
                <th className="border border-black p-2 text-left">Nama Peserta Didik</th>
                <th className="border border-black p-2 w-20">Mapel Dinilai</th>
                <th className="border border-black p-2 w-20">Rata-rata</th>
                <th className="border border-black p-2 w-20">Catatan BK</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => {
                const sNilai = nilaiList.filter(n => n.siswa_id === s.id);
                const totalScore = sNilai.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
                const avg = sNilai.length > 0 ? (totalScore / sNilai.length).toFixed(1) : '0';
                const sBk = catatanBkList.filter(c => c.siswa_id === s.id);
                return (
                  <tr key={s.id}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 text-center font-mono">{s.nis || '-'}</td>
                    <td className="border border-black p-2 font-semibold">{s.nama}</td>
                    <td className="border border-black p-2 text-center">{sNilai.length}</td>
                    <td className="border border-black p-2 text-center font-bold">{avg}</td>
                    <td className="border border-black p-2 text-center">{sBk.length} Kasus</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TANDA TANGAN WALI KELAS */}
          <div className="pt-12 flex justify-end text-xs font-sans">
            <div className="text-center space-y-16">
              <p>Pati, .................................... 20...<br/>Wali Kelas {kelasBinaan}</p>
              <p className="font-bold underline">{user?.nama || '-'}</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}