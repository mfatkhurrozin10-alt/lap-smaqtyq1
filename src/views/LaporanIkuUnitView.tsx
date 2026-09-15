// src/views/LaporanIkuUnitView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Printer, Calendar, Filter, ChevronRight, Edit3 } from 'lucide-react';

export default function LaporanIkuUnitView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiList, setDivisiList] = useState<any[]>([]);
  const [selectedDivisiId, setSelectedDivisiId] = useState<string>('');
  
  // Filter Bulan (Default ke bulan aktif saat ini, misal "2026-09")
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  
  const [programRekapList, setProgramRekapList] = useState<any[]>([]);

  // Ambil daftar divisi/unit kerja
  const fetchDivisi = async () => {
    try {
      const { data, error } = await supabase.from('divisi').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setDivisiList(data);
        setSelectedDivisiId(data[0].id); // Default ke unit pertama (misal Kurikulum)
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDivisi();
  }, []);

  // Ambil program dan rekap log pengawasan berdasarkan divisi yang dipilih
  const fetchRekapData = async () => {
    if (!selectedDivisiId) return;
    setLoading(true);
    try {
      // 1. Ambil semua program & indikator IKU di divisi ini
      const { data: progList, error: progErr } = await supabase
        .from('program_kegiatan')
        .select('*, indikator_iku(id, kode_iku, judul_iku, target_deskripsi)')
        .eq('divisi_id', selectedDivisiId);

      if (progErr) throw progErr;

      // 2. Ambil seluruh log pengawasan untuk program-program tersebut
      const programIds = progList?.map((p: any) => p.id) || [];
      let logsData: any[] = [];
      
      if (programIds.length > 0) {
        const { data: logs, error: logErr } = await supabase
          .from('divisi_log_pengawasan')
          .select('*')
          .in('program_id', programIds);

        if (logErr) throw logErr;
        logsData = logs || [];
      }

      // 3. Petakan log ke masing-masing program/indikator
      const combined = progList?.map((prog: any) => {
        const pLogs = logsData.filter((l: any) => l.program_id === prog.id);
        
        // Filter berdasarkan bulan yang dipilih jika ada
        const filteredLogs = pLogs.filter((l: any) => {
          if (!selectedMonth) return true;
          return l.waktu_input?.startsWith(selectedMonth);
        });

        // Hitung rata-rata realisasi skor
        const avgSkor = filteredLogs.length > 0 
          ? (filteredLogs.reduce((acc: number, curr: any) => acc + Number(curr.skor_persen), 0) / filteredLogs.length).toFixed(1)
          : '0';

        return {
          ...prog,
          logs: filteredLogs,
          realisasi_persen: `${avgSkor}%`
        };
      });

      setProgramRekapList(combined || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRekapData();
  }, [selectedDivisiId, selectedMonth]);

  const currentDivisiObj = divisiList.find((d: any) => d.id === selectedDivisiId);

  if (loading && divisiList.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat Laporan IKU Unit...</div>;
  }

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* BANNER HEADER UTAMA */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            <FileText size={14} /> DASHBORAD LAPORAN SEKOLAH
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Pantau capaian IKU dan tuliskan catatan evaluasi per kegiatan tiap bulan</h2>
        </div>

        {/* CONTROLS (BULAN, PDF/CETAK, PILIH UNIT) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Filter Bulan */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-xs font-bold">
            <Calendar size={15} />
            <span>BULAN:</span>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-bold"
            />
          </div>

          {/* Tombol Cetak / PDF */}
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-md transition-all"
          >
            <Printer size={15} /> PDF
          </button>

          {/* Tombol Pilih Unit / Divisi */}
          <div className="flex items-center gap-2 bg-white text-purple-900 px-4 py-2 rounded-2xl shadow-md">
            <span className="text-[11px] font-black uppercase text-purple-700">UNIT:</span>
            <select
              value={selectedDivisiId}
              onChange={(e) => setSelectedDivisiId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {divisiList.map((div: any) => (
                <option key={div.id} value={div.id}>{div.nama_divisi}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* TABEL REKAPITULASI IKU */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4 w-72">Indikator (IKU)</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Realisasi</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Catatan ({selectedMonth})</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programRekapList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">Belum ada program atau indikator IKU pada unit {currentDivisiObj?.nama_divisi}.</td>
                </tr>
              ) : (
                programRekapList.map((prog: any, idx: number) => {
                  const iku = prog.indikator_iku;
                  const logs = prog.logs || [];

                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="px-6 py-5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                      
                      {/* Kolom Indikator IKU */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {iku?.kode_iku || 'IKU-UNIT'}
                          </span>
                          <p className="text-xs font-bold text-slate-800 leading-snug pt-1">
                            {iku?.judul_iku || prog.nama_program}
                          </p>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-6 py-5 font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {iku?.target_deskripsi || prog.target_pencapaian || '100%'}
                      </td>

                      {/* Realisasi */}
                      <td className="px-6 py-5 font-black text-purple-700 text-sm whitespace-nowrap">
                        {prog.realisasi_persen}
                      </td>

                      {/* Kegiatan */}
                      <td className="px-6 py-5 font-semibold text-slate-800 text-xs whitespace-nowrap">
                        {prog.nama_program}
                      </td>

                      {/* Waktu */}
                      <td className="px-6 py-5 text-slate-600 text-xs whitespace-nowrap">
                        {prog.timeframe || 'Harian'}
                      </td>

                      {/* Catatan Gabungan dari Seluruh Log di Bulan Tersebut */}
                      <td className="px-6 py-5 text-slate-600 text-xs max-w-md leading-relaxed">
                        {logs.length === 0 ? (
                          <span className="text-slate-400 italic">(Belum ada catatan di bulan ini)</span>
                        ) : (
                          <div className="space-y-2">
                            {logs.map((log: any, lIdx: number) => (
                              <div key={lIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                                <div>
                                  <span className="font-semibold text-slate-700 mr-1">[{log.mapel_kelas || log.guru_target || 'Pengawasan'}]:</span>
                                  <span>{log.catatan_temuan || 'Sesuai standar'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => alert(`Detail IKU: ${prog.nama_program}`)}
                          className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors"
                          title="Edit / Catatan Evaluasi"
                        >
                          <Edit3 size={16} />
                        </button>
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
  );
}