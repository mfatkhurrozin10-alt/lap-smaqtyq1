// src/views/LaporanIkuUnitView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Printer, Calendar, Edit3 } from 'lucide-react';

export default function LaporanIkuUnitView({}: any) {
  const [loading, setLoading] = useState(true);
  const [divisiList, setDivisiList] = useState<any[]>([]);
  const [selectedDivisiId, setSelectedDivisiId] = useState<string>('');
  
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [ikuRekapList, setIkuRekapList] = useState<any[]>([]);

  const fetchDivisi = async () => {
    try {
      const { data, error } = await supabase.from('divisi').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setDivisiList(data);
        setSelectedDivisiId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDivisi();
  }, []);

  const fetchRekapData = async () => {
    if (!selectedDivisiId) return;
    setLoading(true);
    try {
      // 1. Ambil indikator IKU yang tersedia di divisi ini (melalui program kegiatan)
      const { data: progList, error: progErr } = await supabase
        .from('program_kegiatan')
        .select(`
          id,
          nama_program,
          timeframe,
          target_pencapaian,
          indikator_iku (
            id,
            kode_iku,
            judul_iku,
            target_deskripsi
          )
        `)
        .eq('divisi_id', selectedDivisiId);

      if (progErr) throw progErr;

      const { data: logs, error: logErr } = await supabase
        .from('divisi_log_pengawasan')
        .select('*');

      if (logErr) throw logErr;
      const allLogs = logs || [];

      // Kelompokkan berdasarkan Indikator IKU (Unique IKU)
      const ikuMap: { [key: string]: any } = {};

      (progList || []).forEach((prog: any) => {
        const iku = prog.indikator_iku;
        const ikuId = iku?.id || 'umum';

        if (!ikuMap[ikuId]) {
          ikuMap[ikuId] = {
            id: ikuId,
            kode_iku: iku?.kode_iku || 'IKU-UNIT',
            judul_iku: iku?.judul_iku || 'Kinerja Unit',
            target_deskripsi: iku?.target_deskripsi || '100%',
            kegiatanList: []
          };
        }

        const pLogs = allLogs.filter((l: any) => l.program_id === prog.id);
        const filteredLogs = pLogs.filter((l: any) => {
          if (!selectedMonth) return true;
          return l.waktu_input && l.waktu_input.startsWith(selectedMonth);
        });

        const totalSkor = filteredLogs.reduce((acc: number, curr: any) => acc + Number(curr.skor_persen || 0), 0);
        const avgSkor = filteredLogs.length > 0 ? (totalSkor / filteredLogs.length).toFixed(1) : '0';

        ikuMap[ikuId].kegiatanList.push({
          ...prog,
          logs: filteredLogs,
          realisasi_persen: `${avgSkor}%`
        });
      });

      setIkuRekapList(Object.values(ikuMap));
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

  const formatMonthLabel = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${monthNames[parseInt(m) - 1] || m}-${y}`;
  };

  if (loading && divisiList.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat Laporan IKU Unit...</div>;
  }

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            <FileText size={14} /> DASHBOARD LAPORAN SEKOLAH
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Pantau capaian IKU dan tuliskan catatan evaluasi per kegiatan tiap bulan</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-md transition-all"
          >
            <Printer size={15} /> PDF
          </button>

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
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center border-r border-slate-200">NO</th>
                <th className="px-6 py-4 w-72 border-r border-slate-200">INDIKATOR (IKU)</th>
                <th className="px-5 py-4 w-28 border-r border-slate-200">TARGET</th>
                <th className="px-5 py-4 w-28 bg-blue-50/80 text-blue-900 border-r border-slate-200">REALISASI</th>
                <th className="px-5 py-4 w-28 bg-emerald-50/80 text-emerald-900 border-r border-slate-200">YAYASAN</th>
                <th className="px-6 py-4 w-44 border-r border-slate-200">KEGIATAN</th>
                <th className="px-5 py-4 w-28 border-r border-slate-200">WAKTU</th>
                <th className="px-6 py-4 border-r border-slate-200">CATATAN ({formatMonthLabel(selectedMonth)})</th>
                <th className="px-5 py-4 w-16 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ikuRekapList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Belum ada data indikator IKU terdaftar pada unit <span className="font-bold text-slate-600">{currentDivisiObj?.nama_divisi}</span>.
                  </td>
                </tr>
              ) : (
                ikuRekapList.map((ikuItem: any, idx: number) => (
                  <tr key={ikuItem.id} className="hover:bg-slate-50/80 transition-colors align-top">
                    
                    {/* NO */}
                    <td className="px-5 py-5 font-mono text-slate-400 font-bold text-center border-r border-slate-100">{idx + 1}</td>
                    
                    {/* INDIKATOR (IKU) */}
                    <td className="px-6 py-5 border-r border-slate-100">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 inline-block">
                          {ikuItem.kode_iku}
                        </span>
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {ikuItem.judul_iku}
                        </p>
                      </div>
                    </td>

                    {/* TARGET */}
                    <td className="px-5 py-5 font-semibold text-slate-700 text-xs border-r border-slate-100">
                      {ikuItem.target_deskripsi}
                    </td>

                    {/* REALISASI (Biru Muda) */}
                    <td className="px-5 py-5 font-black text-sm bg-blue-50/40 text-blue-700 border-r border-slate-100 whitespace-nowrap">
                      {ikuItem.kegiatanList[0]?.realisasi_persen || '0%'}
                    </td>

                    {/* YAYASAN (Hijau Muda) */}
                    <td className="px-5 py-5 font-black text-sm bg-emerald-50/40 text-emerald-700 border-r border-slate-100 whitespace-nowrap">
                      {ikuItem.target_deskripsi}
                    </td>

                    {/* KEGIATAN */}
                    <td className="px-6 py-5 border-r border-slate-100 space-y-3">
                      {ikuItem.kegiatanList.map((keg: any, kIdx: number) => (
                        <div key={kIdx} className="font-bold text-slate-800 text-xs py-1">
                          {keg.nama_program}
                        </div>
                      ))}
                    </td>

                    {/* WAKTU */}
                    <td className="px-5 py-5 border-r border-slate-100 space-y-3">
                      {ikuItem.kegiatanList.map((keg: any, kIdx: number) => (
                        <div key={kIdx} className="text-slate-600 text-xs font-medium py-1">
                          {keg.timeframe || 'Harian'}
                        </div>
                      ))}
                    </td>

                    {/* CATATAN */}
                    <td className="px-6 py-5 border-r border-slate-100">
                      {ikuItem.kegiatanList.map((keg: any, kIdx: number) => (
                        <div key={kIdx} className="space-y-2 pb-2">
                          {keg.logs.length === 0 ? (
                            <span className="text-slate-400 italic text-xs">(Belum ada catatan)</span>
                          ) : (
                            keg.logs.map((log: any, lIdx: number) => (
                              <div key={lIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                                <div className="text-xs">
                                  <span className="font-semibold text-slate-700 mr-1">[{log.mapel_kelas || log.guru_target || 'Pengawasan'}]:</span>
                                  <span className="text-slate-600">{log.catatan_temuan || 'Sesuai standar'}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </td>

                    {/* AKSI */}
                    <td className="px-5 py-5 text-center">
                      <button 
                        onClick={() => alert(`Edit / Evaluasi IKU: ${ikuItem.kode_iku}`)}
                        className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors shadow-2xs"
                        title="Edit / Catatan Evaluasi"
                      >
                        <Edit3 size={15} />
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