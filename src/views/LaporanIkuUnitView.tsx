// src/views/LaporanIkuUnitView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Printer, Calendar, Edit3, X, Sparkles, Save } from 'lucide-react';

export default function LaporanIkuUnitView({ showNotification, onNavigateToKegiatan }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiList, setDivisiList] = useState<any[]>([]);
  const [selectedDivisiId, setSelectedDivisiId] = useState<string>('');
  
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [rekapRows, setRekapRows] = useState<any[]>([]);

  // State untuk menampung perubahan nilai yayasan secara local (inline input) key: program_id
  const [yayasanInputs, setYayasanInputs] = useState<Record<string, string>>({});
  const [savingGlobal, setSavingGlobal] = useState(false);

  // State untuk Modal Catatan Evaluasi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [modalCatatanText, setModalCatatanText] = useState('');

  const getScoreTextColor = (scoreStr: string) => {
    if (scoreStr === '-') return 'text-slate-400';
    if (scoreStr.includes('Kali')) return 'text-blue-600 font-bold';
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
      const { data: ikuList } = await supabase.from('indikator_iku').select('*');
      const ikuMap = new Map();
      (ikuList || []).forEach((item: any) => {
        ikuMap.set(item.id, item);
      });

      const { data: progList, error: progErr } = await supabase
        .from('program_kegiatan')
        .select('*')
        .eq('divisi_id', selectedDivisiId);

      if (progErr) throw progErr;

      // Ambil data laporan bulanan sesuai bulan yang dipilih
      const { data: monthlyData } = await supabase
        .from('laporan_bulanan_kegiatan')
        .select('*')
        .eq('bulan', selectedMonth);
      
      const monthlyMap = new Map();
      const initialYayasanState: Record<string, string> = {};

      (monthlyData || []).forEach((m: any) => {
        monthlyMap.set(m.program_id, m);
      });

      const { data: logs } = await supabase.from('divisi_log_pengawasan').select('*');
      const allLogs = logs || [];

      // Ambil seluruh data nilai beserta relasi ujian untuk pencocokan makro
      const { data: nilaiList } = await supabase.from('nilai').select('*, ujian(nama_ujian)');
      const allNilai = nilaiList || [];

      let rawRows: any[] = [];

      (progList || []).forEach((prog: any) => {
        const ikuId = prog.iku_id;
        const matchedIku = ikuMap.get(ikuId);
        const targetType = prog.target_realisasi_type ? String(prog.target_realisasi_type).trim().toLowerCase() : 'percentage';

        const pLogs = allLogs.filter((l: any) => l.program_id === prog.id);
        const filteredLogs = pLogs.filter((l: any) => {
          if (!selectedMonth) return true;
          return l.waktu_input && l.waktu_input.startsWith(selectedMonth);
        });

        let calculatedRealisasi = '-';
        const progNameLower = prog.nama_program?.toLowerCase() || '';
        const ikuJudulLower = (matchedIku?.judul_iku || matchedIku?.nama_indikator || '').toLowerCase();

        // Cek apakah program ini masuk dalam indikator Rata-rata Nilai Ujian Sekolah Umum
        const isUjianProgram = ikuJudulLower.includes('rata-rata nilai ujian sekolah') || ikuJudulLower.includes('rata-rata nilai');

        if (targetType === 'count') {
          const totalCount = filteredLogs.length;
          calculatedRealisasi = `${totalCount} Kali`;
        } else if (isUjianProgram) {
          // Filter nilai berdasarkan bulan aktif yang dipilih pada Laporan IKU
          const nilaiBulanIni = allNilai.filter((n: any) => {
            const tanggalNilai = n.created_at || n.tanggal || '';
            return selectedMonth ? tanggalNilai.startsWith(selectedMonth) : true;
          });

          let targetNilaiList: any[] = [];

          if (progNameLower.includes('ulangan harian') || progNameLower.includes('uh')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return ujianNama.includes('ulangan harian') || ujianNama.includes('uh');
            });
          } else if (progNameLower.includes('sumatif tengah semester ganjil') || progNameLower.includes('asts gasal')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return (ujianNama.includes('tengah semester') || ujianNama.includes('asts')) && ujianNama.includes('ganjil');
            });
          } else if (progNameLower.includes('sumatif akhis semester ganjil') || progNameLower.includes('asas gasal') || progNameLower.includes('sumatif akhir semester ganjil')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return (ujianNama.includes('akhir semester') || ujianNama.includes('asas')) && ujianNama.includes('ganjil');
            });
          } else if (progNameLower.includes('sumatif akhir tahun genap') || progNameLower.includes('asat')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return ujianNama.includes('akhir tahun') || ujianNama.includes('asat');
            });
          } else if (progNameLower.includes('sumatif tengah semester genap') || progNameLower.includes('asts genap')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return (ujianNama.includes('tengah semester') || ujianNama.includes('asts')) && ujianNama.includes('genap');
            });
          } else if (progNameLower.includes('sumatif akhir jenjang') || progNameLower.includes('jenjang')) {
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return ujianNama.includes('jenjang') || ujianNama.includes('akhir jenjang');
            });
          } else {
            // Default pencocokan umum berdasarkan nama program
            targetNilaiList = nilaiBulanIni.filter((n: any) => {
              const ujianNama = (n.ujian?.nama_ujian || n.kategori || '').toLowerCase();
              return ujianNama.includes(progNameLower) || progNameLower.includes(ujianNama);
            });
          }

          if (targetNilaiList.length > 0) {
            const sumNilai = targetNilaiList.reduce((acc: number, curr: any) => acc + Number(curr.nilai || curr.skor || 0), 0);
            const avgMakro = sumNilai / targetNilaiList.length;
            calculatedRealisasi = `${avgMakro.toFixed(1)}%`;
          }
        } else {
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

        const monthRecord = monthlyMap.get(prog.id) || {};
        initialYayasanState[prog.id] = monthRecord.yayasan_capaian || '';

        rawRows.push({
          id: prog.id,
          iku_id: ikuId || 'unknown',
          kode_iku: matchedIku?.kode_iku || 'IKU-UNIT',
          judul_iku: matchedIku?.judul_iku || matchedIku?.nama_indikator || prog.nama_program,
          target: prog.target_capaian || matchedIku?.target_deskripsi || '100%',
          realisasi: calculatedRealisasi,
          kegiatan: prog.nama_program || '-',
          waktu: prog.timeframe || '-',
          logs: filteredLogs,
          catatan_evaluasi: monthRecord.catatan_evaluasi || '' 
        });
      });

      rawRows.sort((a, b) => a.kode_iku.localeCompare(b.kode_iku));

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
      setYayasanInputs(initialYayasanState);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRekapData();
  }, [selectedDivisiId, selectedMonth]);

  const handleYayasanChange = (programId: string, value: string) => {
    setYayasanInputs(prev => ({
      ...prev,
      [programId]: value
    }));
  };

  const handleSaveAllGlobal = async () => {
    setSavingGlobal(true);
    try {
      const { data: existingData } = await supabase
        .from('laporan_bulanan_kegiatan')
        .select('*')
        .eq('bulan', selectedMonth);

      const existingMap = new Map();
      (existingData || []).forEach((item: any) => {
        existingMap.set(item.program_id, item);
      });

      for (const row of rekapRows) {
        const progId = row.id;
        const currentYayasan = yayasanInputs[progId] || '';
        const foundRecord = existingMap.get(progId);

        if (foundRecord) {
          await supabase
            .from('laporan_bulanan_kegiatan')
            .update({ yayasan_capaian: currentYayasan })
            .eq('id', foundRecord.id);
        } else if (currentYayasan.trim() !== '' || row.catatan_evaluasi.trim() !== '') {
          await supabase
            .from('laporan_bulanan_kegiatan')
            .insert([{
              program_id: progId,
              bulan: selectedMonth,
              yayasan_capaian: currentYayasan,
              catatan_evaluasi: row.catatan_evaluasi || ''
            }]);
        }
      }

      if (showNotification) showNotification('Semua perubahan laporan bulan ini berhasil disimpan!', 'success');
      fetchRekapData();
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('Gagal menyimpan perubahan.', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleOpenModal = (prog: any) => {
    setActiveProgram(prog);
    const defaultLogText = prog.logs.length > 0 
      ? prog.logs.map((l: any) => `• [${l.mapel_kelas || l.guru_target || 'Pengawasan'}]: ${l.catatan_temuan || 'Sesuai standar'}`).join('\n') 
      : '';
    setModalCatatanText(prog.catatan_evaluasi || defaultLogText);
    setIsModalOpen(true);
  };

  const handlePullFromLog = () => {
    if (!activeProgram || !activeProgram.logs) return;
    const pulledText = activeProgram.logs.length > 0 
      ? activeProgram.logs.map((l: any) => `• [${l.mapel_kelas || l.guru_target || 'Pengawasan'}]: ${l.catatan_temuan || 'Sesuai standar'}`).join('\n')
      : '• (Belum ada catatan temuan dari log pengawasan pada bulan ini)';
    setModalCatatanText(pulledText);
    if (showNotification) showNotification('Berhasil menarik catatan dari log pengawasan!', 'success');
  };

  const handleSaveModalNote = async () => {
    if (!activeProgram) return;
    try {
      const { data: existingRecords } = await supabase
        .from('laporan_bulanan_kegiatan')
        .select('id')
        .eq('program_id', activeProgram.id)
        .eq('bulan', selectedMonth);

      const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
      const currentYayasan = yayasanInputs[activeProgram.id] || '';

      let error;
      if (existing) {
        const res = await supabase
          .from('laporan_bulanan_kegiatan')
          .update({ 
            catatan_evaluasi: modalCatatanText,
            yayasan_capaian: currentYayasan 
          })
          .eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('laporan_bulanan_kegiatan')
          .insert([{
            program_id: activeProgram.id,
            bulan: selectedMonth,
            catatan_evaluasi: modalCatatanText,
            yayasan_capaian: currentYayasan
          }]);
        error = res.error;
      }

      if (error) throw error;

      if (showNotification) showNotification('Catatan evaluasi berhasil disimpan!', 'success');
      setIsModalOpen(false);
      fetchRekapData();
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('Gagal menyimpan catatan.', 'error');
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
            onClick={handleSaveAllGlobal}
            disabled={savingGlobal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={15} /> {savingGlobal ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>

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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center border-r border-slate-200">NO</th>
                <th className="px-6 py-4 w-72 border-r border-slate-200">INDIKATOR (IKU)</th>
                <th className="px-5 py-4 w-28 border-r border-slate-200">TARGET</th>
                <th className="px-5 py-4 w-28 bg-blue-50/80 text-blue-900 border-r border-slate-200">REALISASI</th>
                <th className="px-5 py-4 w-32 bg-emerald-50/80 text-emerald-900 border-r border-slate-200">YAYASAN</th>
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
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
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

                      <td className="px-5 py-5 font-semibold text-slate-700 text-xs border-r border-slate-100 whitespace-nowrap align-middle">
                        <div className="flex items-center">
                          {row.target}
                        </div>
                      </td>

                      <td className={`px-5 py-5 font-black text-sm bg-blue-50/40 border-r border-slate-100 whitespace-nowrap align-middle ${getScoreTextColor(row.realisasi)}`}>
                        <div className="flex items-center">
                          {row.realisasi}
                        </div>
                      </td>

                      <td className="px-3 py-3 bg-emerald-50/25 border-r border-slate-100 align-middle">
                        <div className="flex items-center">
                          <input 
                            type="text"
                            value={yayasanInputs[row.id] || ''}
                            onChange={(e) => handleYayasanChange(row.id, e.target.value)}
                            placeholder="-"
                            className="w-full px-2 py-1 text-sm font-black text-emerald-700 bg-transparent border border-transparent hover:border-emerald-200 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all placeholder:text-slate-300 placeholder:font-normal"
                          />
                        </div>
                      </td>

                      <td className="px-6 py-5 border-r border-slate-100 font-bold text-xs align-middle">
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
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left cursor-pointer w-full block"
                          >
                            {row.kegiatan}
                          </button>
                        ) : (
                          <span className="text-slate-800">{row.kegiatan}</span>
                        )}
                      </td>

                      <td className="px-5 py-5 border-r border-slate-100 text-slate-600 text-xs font-medium align-middle">
                        <div className="flex items-center">
                          {row.waktu}
                        </div>
                      </td>

                      <td className="px-6 py-5 border-r border-slate-100 align-middle">
                        {row.catatan_evaluasi ? (
                          <div className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {row.catatan_evaluasi}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">(Belum ada catatan)</span>
                        )}
                      </td>

                      <td className="px-5 py-5 text-center align-middle">
                        <button 
                          onClick={() => handleOpenModal(row)}
                          className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors shadow-2xs cursor-pointer inline-flex items-center justify-center"
                          title="Edit Catatan Evaluasi"
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

      {isModalOpen && activeProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
              </div>
            </div>

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