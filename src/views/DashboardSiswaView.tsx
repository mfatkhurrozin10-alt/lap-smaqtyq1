// src/views/DashboardSiswaView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { fetchAllTabunganData } from '../services/tabungan'; // Menggunakan fungsi all agar seragam dengan admin

export default function DashboardSiswaView({ user }: any) {
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [catatanBkList, setCatatanBkList] = useState<any[]>([]);
  const [kehadiranList, setKehadiranList] = useState<any[]>([]);
  
  // State untuk Tabungan dari Google Sheets
  const [tabunganInfo, setTabunganInfo] = useState<any>(null);
  const [tabunganHistory, setTabunganHistory] = useState<any[]>([]);
  const [tabunganLoading, setTabunganLoading] = useState(false);
  const [showTabunganModal, setShowTabunganModal] = useState(false);

  // State untuk Modal Riwayat Kehadiran
  const [showKehadiranModal, setShowKehadiranModal] = useState(false);

  // State untuk modal riwayat nilai mapel
  const [selectedMapelHistory, setSelectedMapelHistory] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.id) return;
      try {
        const [rNilai, rBk, rHadir, rGuru] = await Promise.all([
          supabase.from('nilai').select('*, mapel(nama_mapel, kkm), ujian(nama_ujian, kode), guru(nama)').eq('siswa_id', user.id),
          supabase.from('catatan_bk').select('*').eq('siswa_id', user.id),
          supabase.from('kehadiran').select('*').eq('nisn', String(user.nis || user.nisn || '').trim()).order('tanggal', { ascending: false }),
          supabase.from('guru').select('id, nama')
        ]);

        const guruMap = new Map();
        (rGuru.data || []).forEach((g: any) => guruMap.set(g.id, g.nama));

        const mappedBk = (rBk.data || []).map((c: any) => ({
          ...c,
          namaGuru: guruMap.get(c.guru_id) || 'Guru BK'
        }));

        setNilaiList(rNilai.data || []);
        setCatatanBkList(mappedBk);
        setKehadiranList(rHadir.data || []);
      } catch (err) {
        console.error('Gagal memuat data siswa:', err);
      }
    };
    fetchStudentData();
  }, [user]);

  // Mengambil data tabungan dengan menyamakan logika pencocokan seperti di halaman Admin
  useEffect(() => {
    const loadTabungan = async () => {
      const nisUser = String(user?.nis || user?.nisn || '').trim();
      console.log("Mencari tabungan untuk NIS/NISN:", nisUser);
      if (!nisUser) return;

      setTabunganLoading(true);
      try {
        const listTabunganSheets = await fetchAllTabunganData();
        console.log("Semua data tabungan dari sheets:", listTabunganSheets);

        // Cari data yang nisn-nya cocok dengan siswa yang sedang login (sama persis seperti di KelolaTabunganAdminView)
        const foundTabungan = (listTabunganSheets || []).find((item: any) => {
          const sheetNis = String(item.nisn || item.nis || '').trim();
          return sheetNis === nisUser;
        });

        if (foundTabungan) {
          setTabunganInfo({
            saldo: Number(foundTabungan.saldo || 0),
            ...foundTabungan
          });
          setTabunganHistory(foundTabungan.history || []);
        } else {
          setTabunganInfo({ saldo: 0 });
          setTabunganHistory([]);
        }
      } catch (err) {
        console.error('Gagal memuat tabungan:', err);
      } finally {
        setTabunganLoading(false);
      }
    };

    loadTabungan();
  }, [user]);

  // Fungsi helper untuk menyingkat nama jenis ujian agar header tidak terlalu panjang
  const getShortExamName = (fullName: string) => {
    if (!fullName) return 'Ujian';
    const upper = fullName.toUpperCase();
    if (upper.includes('ULANGAN HARIAN') || upper === 'UH') return 'UH';
    if (upper.includes('TENGAH SEMESTER') || upper.includes('ASTS') || upper.includes('PTS')) {
      if (upper.includes('GASAL') || upper.includes('GANJIL')) return 'ASTS Gasal';
      if (upper.includes('GENAP')) return 'ASTS Genap';
      return 'ASTS';
    }
    if (upper.includes('AKHIR SEMESTER') || upper.includes('ASAS') || upper.includes('PAS')) {
      if (upper.includes('GASAL') || upper.includes('GANJIL')) return 'ASAS Gasal';
      if (upper.includes('GENAP')) return 'ASAS Genap';
      return 'ASAS';
    }
    if (upper.includes('UJIAN SEKOLAH') || upper.includes('US')) return 'US';
    return fullName.length > 12 ? fullName.slice(0, 10) + '...' : fullName;
  };

  // Ekstraksi jenis ujian unik yang ada pada nilai siswa ini
  const availableExamTypes = useMemo(() => {
    const types = new Set<string>();
    nilaiList.forEach((n: any) => {
      const examName = n.ujian?.nama_ujian || n.ujian?.kode || 'Ujian';
      types.add(examName);
    });
    return Array.from(types);
  }, [nilaiList]);

  // Mengelompokkan nilai per Mata Pelajaran (hanya yang sudah ada nilainya)
  const processedMapelData = useMemo(() => {
    const mapelMap: Record<string, { nama: string; kkm: number; scores: Record<string, number[]>; rawItems: any[] }> = {};

    nilaiList.forEach((n: any) => {
      const mapelId = n.mapel_id || n.mapel?.nama_mapel;
      if (!mapelId) return;

      if (!mapelMap[mapelId]) {
        mapelMap[mapelId] = {
          nama: n.mapel?.nama_mapel || 'Mata Pelajaran',
          kkm: n.mapel?.kkm || 75,
          scores: {},
          rawItems: []
        };
      }

      mapelMap[mapelId].rawItems.push(n);

      const examKey = n.ujian?.nama_ujian || n.ujian?.kode || 'Ujian';
      if (!mapelMap[mapelId].scores[examKey]) {
        mapelMap[mapelId].scores[examKey] = [];
      }
      mapelMap[mapelId].scores[examKey].push(n.nilai || 0);
    });

    return Object.values(mapelMap).map(item => {
      const computedScores: Record<string, string> = {};
      let totalSum = 0;
      let totalCount = 0;

      availableExamTypes.forEach((ex: string) => {
        const arr = item.scores[ex];
        if (arr && arr.length > 0) {
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          computedScores[ex] = avg.toFixed(1);
          totalSum += avg;
          totalCount++;
        } else {
          computedScores[ex] = '-';
        }
      });

      const finalAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '0';

      return {
        ...item,
        computedScores,
        finalAvg
      };
    });
  }, [nilaiList, availableExamTypes]);

  // Statistik Kehadiran Lengkap
  const attendanceStats = useMemo(() => {
    let sakit = 0, izin = 0, alfa = 0, hadir = 0;
    kehadiranList.forEach((k: any) => {
      const ket = (k.keterangan || '').toLowerCase();
      if (ket.includes('sakit')) sakit++;
      else if (ket.includes('izin')) izin++;
      else if (ket.includes('alfa')) alfa++;
      else hadir++;
    });
    return { sakit, izin, alfa, hadir, total: kehadiranList.length };
  }, [kehadiranList]);

  // 10 Data Kehadiran Terbaru untuk ditampilkan di Pop-up
  const latestKehadiran = useMemo(() => {
    return kehadiranList.slice(0, 10);
  }, [kehadiranList]);

  // Fungsi Cetak / Download PDF Laporan Kehadiran Keseluruhan
  const handlePrintAttendancePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Kehadiran - ${user?.nama || 'Siswa'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background-color: #f4f4f4; }
            .summary { margin-top: 20px; display: flex; gap: 20px; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>LAPORAN KEHADIRAN PESERTA DIDIK</h2>
            <p>SIM-AKADEMIK</p>
          </div>
          <div class="info">
            <p><strong>Nama Siswa:</strong> ${user?.nama || '-'}</p>
            <p><strong>NIS:</strong> ${user?.nis || user?.nisn || '-'}</p>
            <p><strong>Kelas:</strong> ${user?.kelas || '-'}</p>
          </div>
          <div class="summary">
            <span>Hadir: ${attendanceStats.hadir}</span>
            <span>Sakit: ${attendanceStats.sakit}</span>
            <span>Izin: ${attendanceStats.izin}</span>
            <span>Alpha: ${attendanceStats.alfa}</span>
            <span>Total Log: ${attendanceStats.total}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Keterangan / Status</th>
              </tr>
            </thead>
            <tbody>
              ${kehadiranList.length === 0 ? '<tr><td colspan="3" style="text-align:center;">Tidak ada data kehadiran.</td></tr>' : 
                kehadiranList.map((k: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${k.tanggal || '-'}</td>
                    <td><strong>${k.keterangan || 'Hadir'}</strong></td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Pengelompokan Kasus BK yang Serupa (Grouping & Frequency Count)
  const groupedCatatanBk = useMemo(() => {
    const groupMap: Record<string, { namaKasus: string; totalPoin: number; count: number; keteranganList: string[]; pencatat: string }> = {};

    catatanBkList.forEach((c: any) => {
      const namaKasus = (c.keterangan || c.kategori || 'Catatan Kedisiplinan').trim();
      const poin = Number(c.poin || 0);

      if (!groupMap[namaKasus]) {
        groupMap[namaKasus] = {
          namaKasus,
          totalPoin: 0,
          count: 0,
          keteranganList: [],
          pencatat: c.namaGuru || 'Guru BK'
        };
      }

      groupMap[namaKasus].totalPoin += poin;
      groupMap[namaKasus].count += 1;
      if (c.keterangan) {
        groupMap[namaKasus].keteranganList.push(c.keterangan);
      }
    });

    return Object.values(groupMap);
  }, [catatanBkList]);

  // Perhitungan Poin BK (Pelanggaran & Penghargaan)
  const totalPoinPelanggaran = useMemo(() => {
    return catatanBkList.reduce((acc: number, curr: any) => {
      const poin = Number(curr.poin || 0);
      const kategori = (curr.kategori || '').toLowerCase();
      if (poin < 0 || kategori.includes('pelanggaran')) {
        return acc + Math.abs(poin);
      }
      return acc;
    }, 0);
  }, [catatanBkList]);

  const totalPoinPrestasi = useMemo(() => {
    return catatanBkList.reduce((acc: number, curr: any) => {
      const poin = Number(curr.poin || 0);
      const kategori = (curr.kategori || '').toLowerCase();
      if (poin > 0 && !kategori.includes('pelanggaran')) {
        return acc + poin;
      }
      return acc;
    }, 0);
  }, [catatanBkList]);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto text-left">
      
      {/* KARTU PROFIL SISWA */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl text-emerald-400 shrink-0">
            {user?.kelas || 'S'}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-1">
              <span>● Portal Rapor & Rekapitulasi Peserta Didik</span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">{user?.nama || 'Siswa'}</h3>
            <p className="text-xs text-slate-300 mt-0.5">NIS: <span className="font-mono text-white">{user?.nis || user?.nisn || '-'}</span> • Kelas: <span className="font-bold text-white">{user?.kelas || '-'}</span></p>
          </div>
        </div>
      </div>

      {/* STATISTIK GRID RESPONSIF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        
        {/* REKAPITULASI KEHADIRAN */}
        <div 
          onClick={() => setShowKehadiranModal(true)}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group w-full"
          title="Klik untuk melihat rincian riwayat kehadiran"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rekapitulasi Kehadiran</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">Lihat Detail</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center my-3">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block">H</span>
              <span className="text-sm font-black text-emerald-600">{attendanceStats.hadir}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block">S</span>
              <span className="text-sm font-black text-blue-600">{attendanceStats.sakit}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block">I</span>
              <span className="text-sm font-black text-amber-600">{attendanceStats.izin}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 font-bold block">A</span>
              <span className="text-sm font-black text-rose-600">{attendanceStats.alfa}</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Total Log Kehadiran: {attendanceStats.total} Hari</span>
        </div>

        {/* SALDO TABUNGAN */}
        <div 
          onClick={() => tabunganInfo && setShowTabunganModal(true)}
          className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Tabungan Santri</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">Lihat Riwayat</span>
          </div>
          <div className="my-2">
            <h4 className="text-xl font-black text-emerald-700">
              {tabunganLoading ? 'Memuat...' : `Rp ${Number(tabunganInfo?.saldo || 0).toLocaleString('id-ID')}`}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Klik untuk cek rincian transaksi</span>
        </div>

        {/* POIN PELANGGARAN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Akumulasi Poin Pelanggaran</span>
          <div className="my-2">
            <h4 className="text-2xl font-black text-rose-600">{totalPoinPelanggaran} <span className="text-xs font-normal text-slate-500">Poin</span></h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Berdasarkan catatan disiplin BK</span>
        </div>

        {/* POIN PRESTASI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Akumulasi Poin Prestasi</span>
          <div className="my-2">
            <h4 className="text-2xl font-black text-emerald-600">{totalPoinPrestasi} <span className="text-xs font-normal text-slate-500">Poin</span></h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Penghargaan / catatan positif</span>
        </div>

        {/* TOTAL CATATAN BK */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Catatan / Kasus BK</span>
          <div className="my-2">
            <h4 className="text-2xl font-black text-indigo-600">{catatanBkList.length} <span className="text-xs font-normal text-slate-500">Kasus</span></h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Riwayat bimbingan konseling</span>
        </div>

      </div>

      {/* TABEL REKAPITULASI NILAI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Rekapitulasi Hasil Belajar Peserta Didik</h4>
            <p className="text-xs text-slate-500 mt-0.5">Klik pada salah satu baris mata pelajaran untuk melihat riwayat penilaian lengkap.</p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-100 w-fit">
            {processedMapelData.length} Mata Pelajaran Dinilai
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Mata Pelajaran</th>
                <th className="px-4 py-3.5 text-center w-16">KKM</th>
                {availableExamTypes.map((ex: string) => (
                  <th key={ex} title={ex} className="px-4 py-3.5 text-center cursor-help">
                    {getShortExamName(ex)}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-center">Rata-rata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedMapelData.length === 0 ? (
                <tr><td colSpan={4 + availableExamTypes.length} className="px-6 py-12 text-center text-slate-400 italic">Belum ada data nilai mata pelajaran yang tercatat.</td></tr>
              ) : (
                processedMapelData.map((item: any, idx: number) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedMapelHistory(item)}
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    title="Klik untuk melihat riwayat rincian nilai mapel ini"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.nama} <span className="text-[10px] font-normal text-slate-400 ml-1">(Klik rincian)</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-600">{item.kkm}</td>
                    {availableExamTypes.map((ex: string) => (
                      <td key={ex} className="px-4 py-3.5 text-center font-medium text-slate-700">
                        {item.computedScores[ex]}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-center font-extrabold text-indigo-600 text-sm">{item.finalAvg}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION RINCIAN CATATAN & KASUS BK */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4 w-full">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Rincian Catatan & Kasus Bimbingan Konseling (BK)</h4>
        
        {groupedCatatanBk.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-slate-100">
            Tidak ada catatan pelanggaran atau kasus BK (Peserta didik berkedisiplinan baik).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {groupedCatatanBk.map((group, idx: number) => {
              const isMinus = group.totalPoin < 0;
              
              return (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 flex flex-col justify-between w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">
                        {group.namaKasus} {group.count > 1 && <span className="text-indigo-600 font-extrabold ml-1">({group.count}x)</span>}
                      </h5>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg border shrink-0 ${isMinus ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      {group.totalPoin > 0 ? `+${group.totalPoin}` : group.totalPoin} Poin
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                    {group.count > 1 ? `Tercatat sebanyak ${group.count} kali melakukan pelanggaran "${group.namaKasus}".` : (group.keteranganList[0] || 'Tanpa keterangan tambahan.')}
                  </p>
                  <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-200/60">
                    <span>Pencatat: <strong className="text-slate-700">{group.pencatat}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL POP UP RIWAYAT KEHADIRAN */}
      {showKehadiranModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Riwayat Kehadiran (10 Terbaru)</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Total Keseluruhan Log: <span className="font-bold text-white">{attendanceStats.total} Hari</span></p>
              </div>
              <button 
                onClick={() => setShowKehadiranModal(false)} 
                className="p-2 text-indigo-200 hover:text-white rounded-xl bg-indigo-800 hover:bg-indigo-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Menampilkan 10 Catatan Terakhir</span>
                <button 
                  onClick={handlePrintAttendancePDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  🖨️ Cetak / Unduh PDF Lengkap
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3 text-center">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {latestKehadiran.length === 0 ? (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 italic">Belum ada catatan kehadiran.</td></tr>
                    ) : (
                      latestKehadiran.map((item: any, index: number) => {
                        const ket = (item.keterangan || 'hadir').toLowerCase();
                        const badgeColor = 
                          ket.includes('hadir') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ket.includes('sakit') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ket.includes('izin') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

                        return (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-slate-600">{item.tanggal || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                                {item.keterangan || 'Hadir'}
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

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setShowKehadiranModal(false)} 
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP UP RIWAYAT TABUNGAN SISWA */}
      {showTabunganModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Riwayat Tabungan Santri</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Total Saldo: <span className="font-bold text-white">Rp {Number(tabunganInfo?.saldo || 0).toLocaleString('id-ID')}</span></p>
              </div>
              <button 
                onClick={() => setShowTabunganModal(false)} 
                className="p-2 text-emerald-200 hover:text-white rounded-xl bg-emerald-900 hover:bg-emerald-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tabunganHistory.length === 0 ? (
                      <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 italic">Belum ada riwayat transaksi tabungan.</td></tr>
                    ) : (
                      tabunganHistory.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{item.tanggal}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-600">Rp {Number(item.nominal || 0).toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setShowTabunganModal(false)} 
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP UP RIWAYAT PENILAIAN MAPEL */}
      {selectedMapelHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Riwayat Penilaian: {selectedMapelHistory.nama}</h3>
                <p className="text-xs text-slate-300 mt-0.5">Standar KKM: <span className="font-bold text-white">{selectedMapelHistory.kkm}</span></p>
              </div>
              <button 
                onClick={() => setSelectedMapelHistory(null)} 
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Jenis Ujian</th>
                      <th className="px-4 py-3">Periode ditampilkan</th>
                      <th className="px-4 py-3">Guru Pengampu</th>
                      <th className="px-4 py-3 text-center">Nilai</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMapelHistory.rawItems.map((item: any) => {
                      const kkm = selectedMapelHistory.kkm;
                      const isPass = item.nilai >= kkm;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{item.ujian?.nama_ujian || item.ujian?.kode || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{item.bulan} ({item.tahun_ajaran})</td>
                          <td className="px-4 py-3 text-slate-600">{item.guru?.nama || '-'}</td>
                          <td className="px-4 py-3 text-center font-extrabold text-slate-900 text-sm">{item.nilai}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {isPass ? 'Tuntas' : 'Remedial'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setSelectedMapelHistory(null)} 
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}