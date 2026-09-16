// src/views/DashboardPantauanView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckCircle2, Clock, Eye, RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPantauanView({ showNotification, onNavigateToDivisi }: any) {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // State Statistik Atas
  const [absensiStats, setAbsensiStats] = useState({ sakit: 0, izin: 0, alfa: 0, totalAbsen: 0 });
  const [jurnalStats, setJurnalStats] = useState({ terisi: 0, totalGuru: 23 });
  const [legerStats, setLegerStats] = useState({ terisi: 0, totalGuru: 23 });

  // State Tabel Pantauan Kegiatan Harian Semua Divisi
  const [pantauanRows, setPantauanRows] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. SUMBER DATA ABSENSI: Mengambil dari tabel 'kehadiran' (sesuai SistemAbsensiView)
      const { data: hadirList, error: hadirErr } = await supabase
        .from('kehadiran')
        .select('*')
        .eq('tanggal', selectedDate);
      
      if (hadirErr) throw hadirErr;

      let sakit = 0, izin = 0, alfa = 0;
      (hadirList || []).forEach((h: any) => {
        const ket = (h.keterangan || '').toLowerCase();
        if (ket.includes('sakit')) sakit++;
        else if (ket.includes('izin')) izin++;
        else if (ket.includes('hadir')) {
          // Hadir diabaikan dari hitungan siswa absen
        } else {
          alfa++; // Default jika selain hadir/sakit/izin dianggap alpha/mangkir
        }
      });
      setAbsensiStats({ sakit, izin, alfa, totalAbsen: sakit + izin + alfa });

      // 2. SUMBER DATA GURU MENGISI JURNAL: Mengambil dari divisi_log_pengawasan (jurnal harian divisi)
      const { data: logs, error: logErr } = await supabase.from('divisi_log_pengawasan').select('*');
      if (logErr) throw logErr;

      const todayLogs = (logs || []).filter((l: any) => l.waktu_input && l.waktu_input.startsWith(selectedDate));
      const uniqueGuruJurnal = new Set(todayLogs.map((l: any) => l.guru_target).filter(Boolean));
      setJurnalStats({ terisi: uniqueGuruJurnal.size, totalGuru: 23 });

      // 3. SUMBER DATA GURU MENGISILEGER NILAI: Mengambil dari tabel 'nilai' (sesuai KelolaNilaiView)
      const { data: nilaiList, error: nilaiErr } = await supabase.from('nilai').select('guru_id, created_at, tanggal');
      if (nilaiErr) throw nilaiErr;

      const todayNilai = (nilaiList || []).filter((n: any) => {
        const tgl = n.tanggal || (n.created_at ? n.created_at.slice(0, 10) : '');
        return tgl === selectedDate;
      });
      const uniqueGuruLeger = new Set(todayNilai.map((n: any) => n.guru_id).filter(Boolean));
      setLegerStats({ terisi: uniqueGuruLeger.size, totalGuru: 23 });

      // 4. Master Program Kegiatan Harian dari Semua Divisi untuk Tabel Pantauan
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
  }, [selectedDate]);

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
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Siswa Absen (Hari Ini)</p>
              <h3 className="text-3xl font-black text-rose-600 mt-1 flex items-baseline gap-2">
                {absensiStats.totalAbsen} 
                <span className="text-xs font-bold text-slate-500">Santri</span>
              </h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertCircle size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Sakit: {absensiStats.sakit} • Izin: {absensiStats.izin} • Alpha: {absensiStats.alfa}
          </p>
        </div>

        {/* KARTU 2: GURU MENGISI JURNAL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Guru Mengisi Jurnal (Hari Ini)</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                {jurnalStats.terisi} 
                <span className="text-xs font-bold text-slate-500">dari {jurnalStats.totalGuru} Guru</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Total {jurnalStats.terisi} log jurnal pembelajaran tercatat
          </p>
        </div>

        {/* KARTU 3: GURU MENGISI LEGER NILAI */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Guru Mengisi Leger Nilai</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                {legerStats.terisi} 
                <span className="text-xs font-bold text-slate-500">dari {legerStats.totalGuru} Guru</span>
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Akumulasi nilai harian & ujian tersimpan
          </p>
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