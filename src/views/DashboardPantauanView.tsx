// src/views/DashboardPantauanView.tsx
import { useState, useEffect } from 'react';
import { supabase, getCurrentMonthName } from '../services/supabase';
import { CheckCircle2, Clock, Eye, RefreshCw, AlertCircle, Award } from 'lucide-react';

export default function DashboardPantauanView({ showNotification, onNavigateToDivisi, onNavigateToNilai, onNavigateToAbsensi, onNavigateToJurnal }: any) {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // STATE FILTER BULAN MANUAL (Default mengikuti bulan aktif saat ini)
  const [filterBulanNilai, setFilterBulanNilai] = useState(getCurrentMonthName());
  
  // State Statistik Atas
  const [absensiStats, setAbsensiStats] = useState({ hadir: 0, sakit: 0, izin: 0, alfa: 0, totalSantri: 0 });
  const [jurnalStats, setJurnalStats] = useState({ terisi: 0, totalGuru: 23 });
  
  // State Progres Nilai
  const [nilaiProgressStats, setNilaiProgressStats] = useState({ persentase: '0.0', terpenuhi: 0, totalTarget: 0 });

  // State Tabel Pantauan Kegiatan Harian Semua Divisi
  const [pantauanRows, setPantauanRows] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Helper Paginasi identik dengan KelolaNilaiView
      const fetchWithPagination = async (queryBuilderFn: (start: number, end: number) => any) => {
        let allData: any[] = [];
        let start = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await queryBuilderFn(start, start + 999);
          if (error) throw error;
          const chunk = data || [];
          allData = [...allData, ...chunk];
          if (chunk.length < 1000) hasMore = false;
          else start += 1000;
        }
        return { data: allData };
      };

      // 1. Ambil Data Siswa dengan Paginasi
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

      // 2. Ambil Data Kehadiran tanggal terpilih
      const { data: hadirList, error: hadirErr } = await supabase.from('kehadiran').select('*').eq('tanggal', selectedDate);
      if (hadirErr) throw hadirErr;
      const todayRecords = hadirList || [];

      // 3. Hitung Statistik Absensi
      let sakitCount = 0;
      let izinCount = 0;
      let alfaCount = 0;

      allSiswa.forEach((s: any) => {
        const sNisn = String(s.nisn || s.nis || '').trim();
        const record = todayRecords.find((r: any) => String(r.nisn || '').trim() === sNisn);
        if (record) {
          const ket = (record.keterangan || '').toLowerCase();
          if (ket.includes('sakit')) {
            sakitCount++;
          } else if (ket.includes('izin')) {
            izinCount++;
          } else if (!ket.includes('hadir')) {
            alfaCount++;
          }
        }
      });

      setAbsensiStats({ 
        hadir: 0, 
        sakit: sakitCount, 
        izin: izinCount, 
        alfa: alfaCount, 
        totalSantri: allSiswa.length 
      });

      // 4. Ambil Data Log Pengawasan Harian Hari Ini (untuk Jurnal / Kegiatan Harian)
      const { data: logs } = await supabase.from('divisi_log_pengawasan').select('*');
      const todayLogs = (logs || []).filter((l: any) => l.waktu_input && l.waktu_input.startsWith(selectedDate));
      
      const uniqueGuruJurnal = new Set(todayLogs.map((l: any) => l.guru_target).filter(Boolean));
      setJurnalStats({ terisi: uniqueGuruJurnal.size, totalGuru: 23 });

      // 5. AMBIL DATA PROGRES NILAI MENGGUNAKAN PAGINASI DAN LOGIKA KELOLANILAIVIEW
      try {
        const [rNilai, rGuruMapel] = await Promise.all([
          fetchWithPagination((s, e) => supabase.from('nilai').select('*').range(s, e)),
          supabase.from('guru_mapel').select('*')
        ]);

        const allNilaiData = rNilai.data || [];
        const guruMapelList = rGuruMapel.data || [];

        // Filter data nilai persis seperti logika filteredData di KelolaNilaiView
        const filteredNilaiData = allNilaiData.filter((item: any) => {
          const bulanMatch = filterBulanNilai === 'ALL' || (item.bulan || '') === filterBulanNilai;
          return bulanMatch;
        });

        const totalExpected = guruMapelList.length;

        if (totalExpected > 0) {
          const uploadedSet = new Set(
            filteredNilaiData.map((n: any) => `${n.guru_id}-${n.mapel_id}-${(n.kelas || '').trim()}`)
          );
          let fulfilledCount = 0;
          guruMapelList.forEach((gm: any) => {
            const key = `${gm.guru_id}-${gm.mapel_id}-${(gm.kelas || '').trim()}`;
            if (uploadedSet.has(key)) {
              fulfilledCount++;
            }
          });

          const pct = ((fulfilledCount / totalExpected) * 100).toFixed(1);
          setNilaiProgressStats({
            persentase: pct,
            terpenuhi: fulfilledCount,
            totalTarget: totalExpected
          });
        }
      } catch (nilaiErr) {
        console.error("Gagal memuat statistik nilai:", nilaiErr);
      }

      // 6. Ambil Master Program Kegiatan Harian dari Semua Divisi untuk Tabel Pantauan
      const { data: progList } = await supabase.from('program_kegiatan').select('*, divisi(id, nama_divisi)');
      const harianPrograms = (progList || []).filter((p: any) => p.timeframe?.toLowerCase() === 'harian');

      const rows = harianPrograms.map((prog: any) => {
        const matchedLog = todayLogs.find((l: any) => l.program_id === prog.id);
        return {
          id: prog.id,
          divisiNama: prog.divisi?.nama_divisi || 'Umum',
          divisiId: prog.divisi_id,
          kegiatanNama: prog.nama_program || '-',
          isSudahInput: !!matchedLog,
          skorPersen: matchedLog ? Number(matchedLog.skor_persen || 100) : 0,
          catatan_temuan: matchedLog?.catatan_temuan || '',
          logId: matchedLog?.id || null,
          timeframe: prog.timeframe || 'Harian'
        };
      });

      setPantauanRows(rows);
    } catch (err: any) {
      console.error(err);
      if (showNotification) showNotification('Gagal memuat data dashboard pantauan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, filterBulanNilai]);

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* HEADER BANNER & FILTER TANGGAL */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Dashboard Pantauan Sekolah</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Pantau kepatuhan input kegiatan harian seluruh divisi dan keaktifan guru secara real-time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 shadow-2xs">
            <span>TANGGAL:</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-bold text-slate-900"
            />
          </div>

          <button 
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Hari Ini
          </button>

          <button 
            onClick={fetchDashboardData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 3 KARTU STATISTIK ATAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KARTU 1: SISWA ABSEN */}
        <div 
          onClick={() => { if (onNavigateToAbsensi) onNavigateToAbsensi(); }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-rose-300 transition-all"
          title="Klik untuk membuka Rekapitulasi Absensi"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-rose-600 transition-colors">Siswa Absen (Hari Ini)</p>
              <h3 className="text-3xl font-black text-rose-600 mt-1 flex items-baseline gap-2">
                {absensiStats.sakit + absensiStats.izin + absensiStats.alfa} 
                <span className="text-xs font-bold text-slate-500">Santri</span>
              </h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors">
              <AlertCircle size={22} />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>Sakit: {absensiStats.sakit} • Izin: {absensiStats.izin} • Alpha: {absensiStats.alfa}</span>
            <span className="text-[11px] font-bold text-rose-600 hover:underline">
              Buka Absensi →
            </span>
          </div>
        </div>

        {/* KARTU 2: GURU MENGISI JURNAL (Dapat diklik menuju riwayat monitoring KBM Kurikulum) */}
        <div 
          onClick={() => { if (onNavigateToJurnal) onNavigateToJurnal(); }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-blue-300 transition-all"
          title="Klik untuk membuka Riwayat Monitoring KBM"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Guru Mengisi Jurnal (Hari Ini)</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                {jurnalStats.terisi} 
                <span className="text-xs font-bold text-slate-500">dari {jurnalStats.totalGuru} Guru</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors">
              <CheckCircle2 size={22} />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>Total {jurnalStats.terisi} log jurnal pembelajaran tercatat</span>
            <span className="text-[11px] font-bold text-blue-600 hover:underline">
              Buka Riwayat →
            </span>
          </div>
        </div>

        {/* KARTU 3: PROGRES PENGISIAN NILAI (DILENGKAPI FILTER BULAN MANUAL) */}
        <div 
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Progres Pengisian Nilai</p>
                <select 
                  value={filterBulanNilai}
                  onChange={(e) => setFilterBulanNilai(e.target.value)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg outline-none cursor-pointer"
                  title="Pilih Bulan Penilaian"
                >
                  <option value="ALL">Semua Bulan</option>
                  <option value="Januari">Januari</option>
                  <option value="Februari">Februari</option>
                  <option value="Maret">Maret</option>
                  <option value="April">April</option>
                  <option value="Mei">Mei</option>
                  <option value="Juni">Juni</option>
                  <option value="Juli">Juli</option>
                  <option value="Agustus">Agustus</option>
                  <option value="September">September</option>
                  <option value="Oktober">Oktober</option>
                  <option value="November">November</option>
                  <option value="Desember">Desember</option>
                </select>
              </div>

              <div 
                onClick={() => { if (onNavigateToNilai) onNavigateToNilai(); }}
                className="cursor-pointer group-hover:opacity-80 transition-opacity"
                title="Klik untuk membuka Rekapitulasi Nilai"
              >
                <h3 className="text-3xl font-black text-emerald-600 mt-1 flex items-baseline gap-2">
                  {nilaiProgressStats.persentase}%
                  <span className="text-xs font-bold text-slate-500">Selesai</span>
                </h3>
              </div>
            </div>

            <div 
              onClick={() => { if (onNavigateToNilai) onNavigateToNilai(); }}
              className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-colors"
              title="Buka Halaman Rekap"
            >
              <Award size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>Terpenuhi <b>{nilaiProgressStats.terpenuhi}</b> dari <b>{nilaiProgressStats.totalTarget}</b> tugas</span>
            <button 
              onClick={() => { if (onNavigateToNilai) onNavigateToNilai(); }}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Buka Rekap →
            </button>
          </div>
        </div>

      </div>

      {/* TABEL PANTAUAN INPUT KEGIATAN HARIAN SEMUA DIVISI */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Pantauan Input Kegiatan Harian Semua Divisi ({selectedDate})</h3>
            <p className="text-xs text-slate-500 mt-0.5">Status keterisian formulir ceklis harian seluruh unit kerja sekolah</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            Total Kegiatan Harian: {pantauanRows.length} Program
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4 w-44">Divisi</th>
                <th className="px-6 py-4 w-64">Kegiatan Harian</th>
                <th className="px-6 py-4 w-36 text-center">Keterangan</th>
                <th className="px-6 py-4 w-28 text-center">Nilai (%)</th>
                <th className="px-6 py-4">Catatan / Temuan</th>
                <th className="px-6 py-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">Memuat data pantauan...</td>
                </tr>
              ) : pantauanRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Belum ada program kegiatan harian yang terdaftar.</td>
                </tr>
              ) : (
                pantauanRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors align-middle">
                    <td className="px-6 py-4 font-mono text-slate-400 font-bold text-center">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{row.divisiNama}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{row.kegiatanNama}</td>
                    
                    <td className="px-6 py-4 text-center">
                      {row.isSudahInput ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                          <CheckCircle2 size={13} /> Sudah Diinput
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 font-bold text-xs rounded-full border border-rose-200">
                          <Clock size={13} /> Belum Diinput
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center font-black text-sm">
                      {row.isSudahInput ? (
                        <span className="text-blue-600">{row.skorPersen}%</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-xs italic max-w-xs truncate">
                      {row.catatan_temuan || <span className="text-slate-300">Tidak ada catatan</span>}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => {
                          if (onNavigateToDivisi) {
                            onNavigateToDivisi({
                              namaDivisi: row.divisiNama,
                              programId: row.id,
                              timeframe: row.timeframe,
                              initialTab: row.isSudahInput ? 'riwayat' : 'form'
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Eye size={13} /> {row.isSudahInput ? 'Lihat' : 'Isi Ceklis'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}