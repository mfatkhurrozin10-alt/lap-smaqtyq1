// src/views/LaporanIkuUnitView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Printer, Calendar, Edit3, X, Sparkles } from 'lucide-react';

export default function LaporanIkuUnitView({ showNotification, onNavigateToKegiatan }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiList, setDivisiList] = useState<any[]>([]);
  const [selectedDivisiId, setSelectedDivisiId] = useState<string>('');
  
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [rekapRows, setRekapRows] = useState<any[]>([]);

  // State untuk Modal Catatan Evaluasi (Pop-up)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [modalCatatanText, setModalCatatanText] = useState('');

  // Helper Warna Realisasi (Hanya untuk persentase)
  const getScoreTextColor = (scoreStr: string) => {
    if (scoreStr === '-') return 'text-slate-400';
    if (scoreStr.includes('Kali')) return 'text-blue-600'; // Warna khusus untuk count
    const score = parseFloat(scoreStr) || 0;
    if (score > 66) return 'text-emerald-600';
    if (score > 33) return 'text-amber-600';
    return 'text-rose-600';
  };

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
      // 1. Ambil master Indikator IKU
      const { data: ikuList } = await supabase.from('indikator_iku').select('*');
      const ikuMap = new Map();
      (ikuList || []).forEach((item: any) => {
        ikuMap.set(item.id, item);
      });

      // 2. Ambil program kegiatan berdasarkan divisi
      const { data: progList, error: progErr } = await supabase
        .from('program_kegiatan')
        .select('*')
        .eq('divisi_id', selectedDivisiId);

      if (progErr) throw progErr;

      // 3. Ambil konfigurasi form (untuk mendeteksi target_realisasi_type)
      const { data: configList } = await supabase.from('divisi_form_config').select('*');
      const configMap = new Map();
      (configList || []).forEach((cfg: any) => {
        configMap.set(cfg.program_id, cfg);
      });

      // 4. Ambil log pengawasan
      const { data: logs } = await supabase.from('divisi_log_pengawasan').select('*');
      const allLogs = logs || [];

      // 5. Ambil data nilai terpisah (Ulangan Harian, ASTS, dll.)
      const { data: nilaiList } = await supabase.from('nilai').select('*');
      const allNilai = nilaiList || [];

      let rawRows: any[] = [];

      (progList || []).forEach((prog: any) => {
        const ikuId = prog.iku_id;
        const matchedIku = ikuMap.get(ikuId);
        const progConfig = configMap.get(prog.id) || {};
        const targetType = progConfig.target_realisasi_type || 'percentage';

        // Filter log sesuai bulan
        const pLogs = allLogs.filter((l: any) => l.program_id === prog.id);
        const filteredLogs = pLogs.filter((l: any) => {
          if (!selectedMonth) return true;
          return l.waktu_input && l.waktu_input.startsWith(selectedMonth);
        });

        // SUMBER REALISASI DINAMIS BERDASARKAN TIPE TARGET (PERCENTAGE / COUNT)
        let calculatedRealisasi = '-';
        const progNameLower = prog.nama_program?.toLowerCase() || '';

        if (targetType === 'count') {
          // Jika tipenya COUNT, hitung jumlah baris log yang terinput pada bulan tersebut
          const totalCount = filteredLogs.length;
          calculatedRealisasi = `${totalCount} Kali`;
        } else {
          // Jika tipenya PERCENTAGE, hitung rata-rata skor persentase
          if (progNameLower.includes('asts') || progNameLower.includes('pts')) {
            const astsNilai = allNilai.filter((n: any) => (n.kategori === 'ASTS' || n.jenis === 'ASTS') && (n.created_at?.startsWith(selectedMonth) || n.tanggal?.startsWith(selectedMonth)));
            if (astsNilai.length > 0) {
              const sum = astsNilai.reduce((acc: number, curr: any) => acc + Number(curr.nilai || curr.skor || 0), 0);
              calculatedRealisasi = `${(sum / astsNilai.length).toFixed(1)}%`;
            }
          } else if (progNameLower.includes('ulangan harian') || progNameLower.includes('uh')) {
            const uhNilai = allNilai.filter((n: any) => (n.kategori === 'UH' || n.jenis === 'UH') && (n.created_at?.startsWith(selectedMonth) || n.tanggal?.startsWith(selectedMonth)));
            if (uhNilai.length > 0) {
              const sum = uhNilai.reduce((acc: number, curr: any) => acc + Number(curr.nilai || curr.skor || 0), 0);
              calculatedRealisasi = `${(sum / uhNilai.length).toFixed(1)}%`;
            }
          } else {
            if (filteredLogs.length > 0) {
              const totalSkor = filteredLogs.reduce((acc: number, curr: any) => acc + Number(curr.skor_persen || 0), 0);
              calculatedRealisasi = `${(totalSkor / filteredLogs.length).toFixed(1)}%`;
            }
          }
        }

        rawRows.push({
          id: prog.id,
          iku_id: ikuId || 'unknown',
          kode_iku: matchedIku?.kode_iku || 'IKU-UNIT',
          judul_iku: matchedIku?.judul_iku || matchedIku?.nama_indikator || prog.nama_program,
          target: prog.target_capaian || matchedIku?.target_deskripsi || '100%',
          realisasi: calculatedRealisasi,
          yayasan: '',
          kegiatan: prog.nama_program || '-',
          waktu: prog.timeframe || '-',
          logs: filteredLogs,
          catatan_evaluasi: prog.catatan_evaluasi || '' 
        });
      });

      // 6. Urutkan berdasarkan IKU
      rawRows.sort((a, b) => a.kode_iku.localeCompare(b.kode_iku));

      // 7. Hitung rowspan untuk NO dan INDIKATOR
      let finalRows: any[] = [];
      let groupCounter = 1;
      let i = 0;

      while (i < rawRows.length) {
        let currentKode = rawRows[i].kode_iku;
        let count = 0;
        while (i + count < rawRows.length && rawRows[i + count].kode_iku === currentKode) {
          count++;
        }

        for (let j = 0; j < count; j++) {
          let row = rawRows[i + j];
          finalRows.push({
            ...row,
            no: j === 0 ? groupCounter : '',
            rowSpan: j === 0 ? count : 0,
          });
        }

        groupCounter++;
        i += count;
      }

      setRekapRows(finalRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRekapData();
  }, [selectedDivisiId, selectedMonth]);

  // Fungsi Membuka Modal Pop-up Catatan Evaluasi
  const handleOpenModal = (prog: any) => {
    setActiveProgram(prog);
    const defaultLogText = prog.logs.length > 0 
      ? prog.logs.map((l: any) => `• [${l.mapel_kelas || l.guru_target || 'Pengawasan'}]: ${l.catatan_temuan || 'Sesuai standar'}`).join('\n') 
      : '';
    setModalCatatanText(prog.catatan_evaluasi || defaultLogText);
    setIsModalOpen(true);
  };

  // Tombol "Tarik dari Log" di dalam modal
  const handlePullFromLog = () => {
    if (!activeProgram || !activeProgram.logs) return;
    const pulledText = activeProgram.logs.length > 0 
      ? activeProgram.logs.map((l: any) => `• [${l.mapel_kelas || l.guru_target || 'Pengawasan'}]: ${l.catatan_temuan || 'Sesuai standar'}`).join('\n')
      : '• (Belum ada catatan temuan dari log pengawasan pada bulan ini)';
    setModalCatatanText(pulledText);
    if (showNotification) showNotification('Berhasil menarik catatan dari log pengawasan!', 'success');
  };

  // Simpan Catatan secara permanen ke Database Supabase
  const handleSaveModalNote = async () => {
    if (!activeProgram) return;
    try {
      const { error } = await supabase
        .from('program_kegiatan')
        .update({ catatan_evaluasi: modalCatatanText })
        .eq('id', activeProgram.id);

      if (error) throw error;

      if (showNotification) showNotification('Catatan evaluasi berhasil disimpan ke database!', 'success');
      setIsModalOpen(false);
      fetchRekapData();
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('Gagal menyimpan catatan evaluasi.', 'error');
    }
  };

  const currentDivisiObj = divisiList.find((d: any) => d.id === selectedDivisiId);

  const formatMonthLabel = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${monthNames[parseInt(m) - 1] || m}-${y}`.toUpperCase();
  };

  if (loading && divisiList.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat Laporan IKU Unit...</div>;
  }

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800 relative">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/25 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
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
              {rekapRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Belum ada data program kegiatan terdaftar pada unit <span className="font-bold text-slate-600">{currentDivisiObj?.nama_divisi}</span>.
                  </td>
                </tr>
              ) : (
                rekapRows.map((row: any, idx: number) => {
                  const showMergedCell = row.rowSpan !== 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors align-top">
                      
                      {showMergedCell && (
                        <td rowSpan={row.rowSpan} className="px-5 py-5 font-mono text-slate-400 font-bold text-center border-r border-slate-100 bg-white align-middle">
                          {row.no}
                        </td>
                      )}
                      
                      {showMergedCell && (
                        <td rowSpan={row.rowSpan} className="px-6 py-5 border-r border-slate-100 bg-white align-middle">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 inline-block">
                              {row.kode_iku}
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-snug">
                              {row.judul_iku}
                            </p>
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-5 font-semibold text-slate-700 text-xs border-r border-slate-100 whitespace-nowrap">
                        {row.target}
                      </td>

                      <td className={`px-5 py-5 font-black text-sm bg-blue-50/40 border-r border-slate-100 whitespace-nowrap ${getScoreTextColor(row.realisasi)}`}>
                        {row.realisasi}
                      </td>

                      <td className="px-5 py-5 font-black text-sm bg-emerald-50/40 text-emerald-700 border-r border-slate-100 whitespace-nowrap">
                        {row.yayasan}
                      </td>

                      <td className="px-6 py-5 border-r border-slate-100 font-bold text-xs">
                        {onNavigateToKegiatan ? (
                          <button 
                            onClick={() => {
                              onNavigateToKegiatan({
                                divisiId: selectedDivisiId,
                                namaDivisi: currentDivisiObj?.nama_divisi,
                                programId: row.id,
                                timeframe: row.waktu
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer w-full"
                          >
                            {row.kegiatan}
                          </button>
                        ) : (
                          <span className="text-slate-800">{row.kegiatan}</span>
                        )}
                      </td>

                      <td className="px-5 py-5 border-r border-slate-100 text-slate-600 text-xs font-medium">
                        {row.waktu}
                      </td>

                      {/* CATATAN */}
                      <td className="px-6 py-5 border-r border-slate-100">
                        {row.catatan_evaluasi ? (
                          <div className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {row.catatan_evaluasi}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">(Belum ada catatan)</span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="px-5 py-5 text-center">
                        <button 
                          onClick={() => handleOpenModal(row)}
                          className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors shadow-2xs cursor-pointer"
                          title="Edit / Catatan Evaluasi"
                        >
                          <Edit3 size={15} />
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

      {/* POP-UP MODAL CATATAN EVALUASI */}
      {isModalOpen && activeProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black">Catatan Evaluasi Kegiatan</h3>
                <p className="text-xs text-purple-200 mt-0.5">{activeProgram.kegiatan} • Periode: {selectedMonth}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Sumber Isi Catatan:</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePullFromLog}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles size={14} /> Tarik dari Log ({activeProgram.logs.length})
                  </button>
                  <button 
                    onClick={() => setModalCatatanText('')}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Isi Catatan / Tindak Lanjut / Kendala Lapangan:
                </label>
                <textarea 
                  rows={6}
                  value={modalCatatanText}
                  onChange={e => setModalCatatanText(e.target.value)}
                  placeholder="Ketik catatan evaluasi di sini atau tarik otomatis dari log pengawasan..."
                  className="w-full p-4 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 italic">
                  *Catatan akan tersimpan otomatis ke database dan tidak akan hilang saat halaman dimuat ulang.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveModalNote}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}