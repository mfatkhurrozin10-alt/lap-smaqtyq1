// src/views/KelolaPoinAdminView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card } from '../components/UIComponents';

export default function KelolaPoinAdminView({ showNotification }: any) {
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [catatanList, setCatatanList] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // State Filter, Search, & Modal Detail
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Menyimpan status panggilan yang sudah diselesaikan
  const [resolvedCalls, setResolvedCalls] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('resolved_parent_calls');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      // Ambil data siswa dan catatan_bk secara terpisah untuk menghindari kegagalan relasi foreign key
      const [rSiswa, rCatatan, rGuru] = await Promise.all([
        supabase.from('siswa').select('*').order('nama'),
        supabase.from('catatan_bk').select('*').order('tanggal', { ascending: false }),
        supabase.from('guru').select('id, nama')
      ]);

      setSiswaList(rSiswa.data || []);
      setCatatanList(rCatatan.data || []);

      // Simpan data guru untuk mapping nama pencatat
      const guruMap = new Map();
      (rGuru.data || []).forEach((g: any) => guruMap.set(g.id, g.nama));

      // Lampirkan data pendukung ke catatan
      const enrichedCatatan = (rCatatan.data || []).map((c: any) => ({
        ...c,
        namaGuru: guruMap.get(c.guru_id) || 'Guru BK'
      }));

      setCatatanList(enrichedCatatan);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data poin dan pelanggaran', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(siswaList.map(s => s.kelas?.trim()).filter(Boolean))).sort();
  }, [siswaList]);

  // Agregasi data poin per siswa dengan mapping manual berdasarkan siswa_id
  const siswaSummary = useMemo(() => {
    const map = new Map();

    siswaList.forEach(s => {
      map.set(s.id, {
        id: s.id,
        nis: s.nis || s.nisn || '-',
        nama: s.nama || 'Tanpa Nama',
        kelas: (s.kelas || '-').trim(),
        totalPelanggaranPoin: 0,
        totalPenghargaanPoin: 0,
        riwayat: []
      });
    });

    catatanList.forEach(item => {
      const studentId = item.siswa_id;
      if (!studentId || !map.has(studentId)) return;

      const studentData = map.get(studentId);
      const poin = Number(item.poin || 0);
      const kategori = (item.kategori || '').toLowerCase();
      const keterangan = item.keterangan || 'Catatan Kedisiplinan';

      studentData.riwayat.push({
        ...item,
        bobotPoin: poin,
        kategoriJenis: kategori,
        namaKegiatan: keterangan
      });

      if (poin < 0 || kategori.includes('pelanggaran')) {
        studentData.totalPelanggaranPoin += Math.abs(poin);
      } else {
        studentData.totalPenghargaanPoin += Math.abs(poin);
      }
    });

    // HANYA TAMPILKAN SISWA YANG MEMILIKI POIN
    return Array.from(map.values()).filter(s => {
      return s.totalPelanggaranPoin > 0 || s.totalPenghargaanPoin > 0;
    });
  }, [siswaList, catatanList]);

  const filteredSiswaSummary = useMemo(() => {
    return siswaSummary.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || item.nis.includes(search);
      const matchesKelas = filterKelas === 'ALL' || item.kelas === filterKelas;
      return matchesSearch && matchesKelas;
    });
  }, [siswaSummary, search, filterKelas]);

  const handleResolveCall = (studentId: string, currentTargetLevel: number) => {
    const updated = { ...resolvedCalls, [studentId]: currentTargetLevel };
    setResolvedCalls(updated);
    try {
      localStorage.setItem('resolved_parent_calls', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showNotification('Status panggilan orang tua ditandai selesai.', 'success');
  };

  const handlePrintSummon = (student: any, targetLevel: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Surat Panggilan Orang Tua - ${student.nama}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
            .content { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background-color: #f4f4f4; }
            .footer { display: flex; justify-content: space-between; margin-top: 60px; }
            .sign { text-align: center; width: 200px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PEMERINTAH KABUPATEN / DINAS PENDIDIKAN</h2>
            <h3>SURAT PANGGILAN ORANG TUA / WALI MURID</h3>
            <p>Nomor: ___ / BK / SP / ${new Date().getFullYear()}</p>
          </div>
          <div class="content">
            <p>Kepada Yth.<br><strong>Bapak/Ibu Orang Tua / Wali dari siswa:</strong></p>
            <p style="margin-left: 20px;">
              Nama: <strong>${student.nama}</strong><br>
              NIS: ${student.nis}<br>
              Kelas: ${student.kelas}
            </p>
            <p>Dengan ini kami mengundang Bapak/Ibu untuk hadir ke sekolah sehubungan dengan akumulasi poin pelanggaran kedisiplinan siswa yang telah mencapai <strong>${targetLevel} Poin</strong>.</p>
            
            <p><strong>Daftar Riwayat Pelanggaran:</strong></p>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Bentuk Pelanggaran / Keterangan</th>
                  <th>Poin</th>
                </tr>
              </thead>
              <tbody>
                ${student.riwayat.filter((r: any) => r.bobotPoin < 0).map((r: any) => `
                  <tr>
                    <td>${r.tanggal || '-'}</td>
                    <td>${r.namaKegiatan}</td>
                    <td>${r.bobotPoin}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="margin-top: 20px;">Demikian surat panggilan ini kami sampaikan atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
          </div>
          <div class="footer">
            <div></div>
            <div class="sign">
              <p>Mengetahui,<br>Guru Bimbingan Konseling (BK)</p>
              <br><br><br>
              <p><strong>( _____________________ )</strong></p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Kelola Poin Pelanggaran & Pemanggilan</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Memantau akumulasi poin kedisiplinan siswa dan notifikasi batas pemanggilan orang tua</p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm w-fit">
          <Icons.Refresh /> Segarkan Data
        </button>
      </div>

      <Card 
        title="Akumulasi Poin Pelanggaran Peserta Didik"
        subtitle="Klik pada nama siswa untuk melihat rincian riwayat lengkap dan mencetak surat panggilan"
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select 
              value={filterKelas} 
              onChange={(e) => setFilterKelas(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
            </select>
            <div className="relative w-full sm:w-48">
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Cari siswa / NIS..." 
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" 
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
            </div>
          </div>
        }
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">NIS</th>
                <th className="px-4 py-3.5">Nama Peserta Didik (Klik Detail)</th>
                <th className="px-4 py-3.5 text-center">Kelas</th>
                <th className="px-4 py-3.5 text-center text-rose-700">Akumulasi Poin Pelanggaran</th>
                <th className="px-4 py-3.5 text-center text-emerald-700">Poin Penghargaan</th>
                <th className="px-4 py-3.5">Status Panggilan Orang Tua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Memuat rekapitulasi poin...</td></tr>
              ) : filteredSiswaSummary.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Tidak ada catatan pelanggaran atau prestasi siswa saat ini. (Total data catatan: {catatanList.length})</td></tr>
              ) : (
                filteredSiswaSummary.map((item: any) => {
                  const points = item.totalPelanggaranPoin;
                  
                  let activeTargetLevel = 0;
                  if (points >= 50) {
                    activeTargetLevel = Math.floor(points / 50) * 50;
                  }

                  const lastResolvedLevel = resolvedCalls[item.id] || 0;
                  const needsParentCall = activeTargetLevel > 0 && activeTargetLevel > lastResolvedLevel;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">{item.nis}</td>
                      <td className="px-4 py-3.5">
                        <button 
                          onClick={() => setSelectedStudent(item)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left block"
                        >
                          {item.nama}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.kelas}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-rose-600">
                        {points} Poin
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-600">
                        +{item.totalPenghargaanPoin} Poin
                      </td>
                      <td className="px-4 py-3.5">
                        {needsParentCall ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                              ⚠️ Wajib Panggil Ortu (Kelipatan {activeTargetLevel})
                            </span>
                            <button 
                              onClick={() => handleResolveCall(item.id, activeTargetLevel)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
                            >
                              Selesai Panggil
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            {activeTargetLevel > 0 ? `Panggilan Ortu Level ${activeTargetLevel} Selesai` : 'Aman (Di bawah 50 poin)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL POP-UP DETAIL RIWAYAT & CETAK SURAT */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Detail Riwayat Siswa: {selectedStudent.nama}</h3>
                <p className="text-xs text-slate-500 font-mono">NIS: {selectedStudent.nis} | Kelas: {selectedStudent.kelas}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700">
                <Icons.X />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 uppercase">Total Poin Pelanggaran</span>
                  <p className="text-2xl font-black text-rose-600 mt-1">{selectedStudent.totalPelanggaranPoin} Poin</p>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Total Poin Penghargaan</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">+{selectedStudent.totalPenghargaanPoin} Poin</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Log Riwayat Pelanggaran & Prestasi:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 font-semibold text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">Keterangan / Kasus</th>
                        <th className="px-3 py-2 text-center">Bobot Poin</th>
                        <th className="px-3 py-2">Pencatat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedStudent.riwayat.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">Belum ada riwayat catatan.</td></tr>
                      ) : (
                        selectedStudent.riwayat.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-500">{r.tanggal || '-'}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{r.namaKegiatan}</td>
                            <td className="px-3 py-2 text-center font-bold">
                              <span className={r.bobotPoin < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                {r.bobotPoin > 0 ? `+${r.bobotPoin}` : r.bobotPoin}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{r.namaGuru || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => handlePrintSummon(selectedStudent, Math.floor(selectedStudent.totalPelanggaranPoin / 50) * 50 || 50)} 
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Icons.FileText /> Cetak Surat Panggilan Ortu
              </button>
              <button type="button" onClick={() => setSelectedStudent(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}