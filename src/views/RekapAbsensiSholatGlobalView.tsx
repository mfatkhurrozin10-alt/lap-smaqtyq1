// src/views/RekapAbsensiSholatGlobalView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';

export default function RekapAbsensiSholatGlobalView({ showNotification }: any) {
  const [guruList, setGuruList] = useState<any[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, any>>({});
  const [sholatMap, setSholatMap] = useState<Record<string, any>>({});
  const [selectedBulan, setSelectedBulan] = useState(new Date().toISOString().slice(0, 7));
  const [fetchLoading, setFetchLoading] = useState(true);

  // State untuk Modal Detail Presensi (Klik di HP)
  const [selectedCellInfo, setSelectedCellInfo] = useState<{ guruNama: string; day: number; item: any; isSunday: boolean } | null>(null);

  // State untuk Data Kehadiran Hari Ini & Modal Detailnya
  const [todayAbsensiMap, setTodayAbsensiMap] = useState<Record<string, any>>({});
  const [showTodayDetailModal, setShowTodayDetailModal] = useState(false);
  const todayString = new Date().toISOString().slice(0, 10);

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedBulan.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(year, month - 1, dayNum);
      const isSunday = dateObj.getDay() === 0;
      return { day: dayNum, isSunday };
    });
  }, [selectedBulan]);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const rGuru = await supabase.from('guru').select('id, nama, niy').order('nama');
      const gList = rGuru.data || [];
      setGuruList(gList);

      const startDate = `${selectedBulan}-01`;
      const [year, month] = selectedBulan.split('-').map(Number);
      const endDate = `${selectedBulan}-${new Date(year, month, 0).getDate()}`;

      const [rAbsensi, rSholat, rTodayAbsen] = await Promise.all([
        supabase.from('absensi_guru_harian').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('absensi_sholat_guru').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('absensi_guru_harian').select('*').eq('tanggal', todayString)
      ]);

      const aMap: Record<string, any> = {};
      (rAbsensi.data || []).forEach((item: any) => {
        const dayNum = new Date(item.tanggal).getDate();
        aMap[`${item.guru_id}_${dayNum}`] = item;
      });
      setAbsensiMap(aMap);

      const sMap: Record<string, any> = {};
      (rSholat.data || []).forEach((item: any) => {
        const dayNum = new Date(item.tanggal).getDate();
        sMap[`${item.guru_id}_${dayNum}`] = item;
      });
      setSholatMap(sMap);

      const tMap: Record<string, any> = {};
      (rTodayAbsen.data || []).forEach((item: any) => {
        tMap[item.guru_id] = item;
      });
      setTodayAbsensiMap(tMap);

    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat rekap global', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBulan]);

  // Kalkulasi Statistik Kehadiran Hari Ini
  const todayStats = useMemo(() => {
    const totalGuru = guruList.length;
    if (totalGuru === 0) return { hadir: 0, sakit: 0, izin: 0, alfa: 0, belumAbsen: 0, persen: '0.0' };

    let hadir = 0, sakit = 0, izin = 0, alfa = 0;
    guruList.forEach((guru) => {
      const item = todayAbsensiMap[guru.id];
      if (item) {
        if (item.status_kehadiran === 'Hadir' || !item.status_kehadiran) hadir++;
        else if (item.status_kehadiran === 'Sakit') sakit++;
        else if (item.status_kehadiran === 'Izin') izin++;
        else if (item.status_kehadiran === 'Alfa') alfa++;
      }
    });
    const sudahAbsenCount = hadir + sakit + izin + alfa;
    const belumAbsen = totalGuru - sudahAbsenCount;
    const persen = totalGuru > 0 ? ((hadir / totalGuru) * 100).toFixed(1) : '0.0';

    return { totalGuru, hadir, sakit, izin, alfa, belumAbsen, persen };
  }, [guruList, todayAbsensiMap]);

  const getRekapSummary = (guruId: string) => {
    let s = 0, i = 0, a = 0, pc = 0, tl = 0, nfIn = 0, nfOut = 0, duhurYa = 0, asharYa = 0;
    daysInMonth.forEach(({ day }) => {
      const item = absensiMap[`${guruId}_${day}`];
      if (item) {
        if (item.status_kehadiran === 'Sakit') s++;
        if (item.status_kehadiran === 'Izin') i++;
        if (item.status_kehadiran === 'Alfa') a++;
        if (item.pulang_cepat) pc++;
        if (item.terlambat) tl++;
        if (item.nf_in) nfIn++;
        if (item.nf_out) nfOut++;
      }
      const sholat = sholatMap[`${guruId}_${day}`];
      if (sholat) {
        if (sholat.sholat_duhur === 'Ya') duhurYa++;
        if (sholat.sholat_ashar === 'Ya') asharYa++;
      }
    });
    const tdkHadir = s + i + a;
    const hadirCount = daysInMonth.length - tdkHadir;
    const persen = daysInMonth.length > 0 ? ((hadirCount / daysInMonth.length) * 100).toFixed(1) : '100.0';

    return { s, i, a, pc, tl, nfIn, nfOut, tdkHadir, persen, duhurYa, asharYa };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Rekap Kehadiran dan Sholat Guru</title></head>
      <body>
        <h3>REKAPITULASI KEHADIRAN DAN SHOLAT BERJAMAAH GURU - PERIODE ${selectedBulan}</h3>
        <table border="1">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>No</th>
              <th>Nama Guru</th>
              ${daysInMonth.map(({ day }) => `<th>${day}</th>`).join('')}
              <th>S</th><th>I</th><th>A</th><th>TL</th><th>PC</th><th>NFi</th><th>NFo</th><th>Duhur</th><th>Ashar</th><th>% Hadir</th>
            </tr>
          </thead>
          <tbody>
    `;

    guruList.forEach((guru, idx) => {
      const rekap = getRekapSummary(guru.id);
      htmlContent += `
        <tr>
          <td>${idx + 1}</td>
          <td>${guru.nama}</td>
          ${daysInMonth.map(({ day }) => {
            const item = absensiMap[`${guru.id}_${day}`];
            if (!item) return `<td>-</td>`;
            const status = item.status_kehadiran;
            let label = 'H';
            if (status === 'Sakit') label = 'S';
            else if (status === 'Izin') label = 'I';
            else if (status === 'Alfa') label = 'A';
            else {
              if (item?.terlambat) label = 'TL';
              else if (item?.pulang_cepat) label = 'PC';
              else if (item?.nf_in) label = 'NFi';
              else if (item?.nf_out) label = 'NFo';
            }
            return `<td>${label}</td>`;
          }).join('')}
          <td>${rekap.s}</td><td>${rekap.i}</td><td>${rekap.a}</td><td>${rekap.tl}</td><td>${rekap.pc}</td><td>${rekap.nfIn}</td><td>${rekap.nfOut}</td><td>${rekap.duhurYa}x</td><td>${rekap.asharYa}x</td><td>${rekap.persen}%</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Kehadiran_Sholat_Guru_${selectedBulan}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Berhasil mengexport data ke Excel!', 'success');
  };

  return (
    <div className="space-y-4 w-full text-left relative">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 5mm;
          }
          table {
            font-size: 7.5px !important;
            width: 100% !important;
          }
          th, td {
            padding: 1px 2px !important;
          }
        }
      `}</style>

      {/* Header Minimalis 1 Baris */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Laporan Rekapitulasi Kehadiran & Sholat Guru</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">Periode: {selectedBulan}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="month" 
            value={selectedBulan} 
            onChange={(e) => setSelectedBulan(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none"
          />
          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all"
          >
            <Icons.Download /> Cetak / PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all"
          >
            <Icons.FileSpreadsheet /> Excel
          </button>
        </div>
      </div>

      {/* Card Persentase Kehadiran Hari Ini (Klik untuk Detail) */}
      <div 
        onClick={() => setShowTodayDetailModal(true)}
        className="no-print bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition-all border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Kehadiran Hari Ini ({todayString})</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {todayStats.persen}% <span className="text-xs font-normal text-indigo-300">({todayStats.hadir} dari {todayStats.totalGuru} Guru Hadir)</span>
          </h3>
          <p className="text-xs text-indigo-200">Klik untuk melihat rincian status kehadiran guru hari ini.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-2 text-center text-xs">
            <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
              <span className="block font-bold text-emerald-300">{todayStats.hadir}</span>
              <span className="text-[10px] text-indigo-200">Hadir</span>
            </div>
            <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
              <span className="block font-bold text-blue-300">{todayStats.sakit}</span>
              <span className="text-[10px] text-indigo-200">Sakit</span>
            </div>
            <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
              <span className="block font-bold text-amber-300">{todayStats.izin}</span>
              <span className="text-[10px] text-indigo-200">Izin</span>
            </div>
            <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
              <span className="block font-bold text-rose-300">{todayStats.alfa}</span>
              <span className="text-[10px] text-indigo-200">Alfa</span>
            </div>
          </div>
          <span className="bg-white/20 group-hover:bg-white/30 text-white p-2 rounded-xl text-xs font-bold transition-all">
            Detail →
          </span>
        </div>
      </div>

      {/* Area Cetak */}
      <div className="print-area bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="hidden print:block text-center pb-2 mb-3 border-b border-slate-900">
          <h1 className="text-sm font-bold uppercase tracking-wider">LAPORAN RESMI REKAPITULASI KEHADIRAN DAN SHOLAT BERJAMAAH GURU</h1>
          <p className="text-[10px] text-slate-600">Periode Bulan: {selectedBulan}</p>
        </div>

        <div className="w-full overflow-x-auto pb-2">
          <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                <th className="px-1.5 py-2 sticky left-0 bg-slate-100 z-10 w-8 text-center">No</th>
                <th className="px-2.5 py-2 sticky left-8 bg-slate-100 z-10 min-w-[160px]">Nama Guru</th>
                {daysInMonth.map(({ day, isSunday }) => (
                  <th 
                    key={day} 
                    className={`px-1 py-2 text-center w-6 border-l border-slate-200 text-[10px] ${isSunday ? 'bg-rose-200 text-rose-800 font-black' : ''}`}
                  >
                    {day}
                  </th>
                ))}
                <th className="px-1.5 py-2 text-center border-l border-slate-300 bg-slate-200 w-6">S</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">I</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">A</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">TL</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">PC</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">NFi</th>
                <th className="px-1.5 py-2 text-center bg-slate-200 w-6">NFo</th>
                <th className="px-2 py-2 text-center bg-emerald-100 text-emerald-900 border-l border-emerald-200 w-10">Duhur</th>
                <th className="px-2 py-2 text-center bg-emerald-100 text-emerald-900 w-10">Ashar</th>
                <th className="px-2.5 py-2 text-center bg-indigo-50 text-indigo-900 border-l border-indigo-200 w-12">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchLoading ? (
                <tr><td colSpan={daysInMonth.length + 13} className="px-4 py-8 text-center text-slate-400">Memuat rekap...</td></tr>
              ) : guruList.length === 0 ? (
                <tr><td colSpan={daysInMonth.length + 13} className="px-4 py-8 text-center text-slate-400">Tidak ada data guru.</td></tr>
              ) : (
                guruList.map((guru, index) => {
                  const rekap = getRekapSummary(guru.id);
                  return (
                    <tr key={guru.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-1.5 py-1.5 sticky left-0 bg-white font-semibold text-center text-slate-500 text-[10px]">{index + 1}</td>
                      <td className="px-2.5 py-1.5 sticky left-8 bg-white font-bold text-slate-900 shadow-2xs text-[11px] truncate max-w-[160px]">{guru.nama}</td>
                      
                      {daysInMonth.map(({ day, isSunday }) => {
                        const item = absensiMap[`${guru.id}_${day}`];
                        
                        if (!item) {
                          const hoverText = isSunday ? `Hari Minggu (Libur) - ${day} ${selectedBulan}` : `Tanggal ${day} ${selectedBulan}: Belum di-input`;
                          return (
                            <td 
                              key={day} 
                              onClick={() => setSelectedCellInfo({ guruNama: guru.nama, day, item: null, isSunday })}
                              className={`p-0.5 border-l border-slate-100 text-center cursor-pointer ${isSunday ? 'bg-rose-100/70' : ''}`}
                            >
                              <div 
                                title={hoverText}
                                className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] ${isSunday ? 'bg-transparent text-transparent' : 'bg-slate-200 text-slate-400'}`}
                              >
                                {isSunday ? '' : '-'}
                              </div>
                            </td>
                          );
                        }

                        const status = item.status_kehadiran;
                        let label = 'H';
                        let bg = isSunday ? 'bg-rose-100/70 text-transparent' : 'bg-emerald-600 text-white font-bold'; 

                        if (status === 'Sakit') { 
                          label = 'S'; 
                          bg = 'bg-blue-600 text-white font-bold'; 
                        } else if (status === 'Izin') { 
                          label = 'I'; 
                          bg = 'bg-indigo-600 text-white font-bold'; 
                        } else if (status === 'Alfa') { 
                          label = 'A'; 
                          bg = 'bg-rose-600 text-white font-bold'; 
                        } else {
                          if (item?.terlambat) { label = 'TL'; bg = 'bg-amber-500 text-white font-bold text-[8px]'; }
                          else if (item?.pulang_cepat) { label = 'PC'; bg = 'bg-purple-500 text-white font-bold text-[8px]'; }
                          else if (item?.nf_in) { label = 'NFi'; bg = 'bg-cyan-600 text-white font-bold text-[8px]'; }
                          else if (item?.nf_out) { label = 'NFo'; bg = 'bg-orange-600 text-white font-bold text-[8px]'; }
                        }

                        const attrList = [
                          item?.terlambat && 'Terlambat (TL)',
                          item?.pulang_cepat && 'Pulang Cepat (PC)',
                          item?.nf_in && 'Not Finger In (NFi)',
                          item?.nf_out && 'Not Finger Out (NFo)',
                          item?.keterangan && `Ket: ${item.keterangan}`
                        ].filter(Boolean);

                        const tooltipText = `Tanggal ${day} ${selectedBulan}\nStatus: ${status}${attrList.length > 0 ? '\n' + attrList.join(', ') : ''}`;

                        return (
                          <td 
                            key={day} 
                            onClick={() => setSelectedCellInfo({ guruNama: guru.nama, day, item, isSunday })}
                            className={`p-0.5 border-l border-slate-100 text-center cursor-pointer ${isSunday ? 'bg-rose-100/70' : ''}`}
                          >
                            <div 
                              title={tooltipText}
                              className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] ${isSunday ? 'bg-transparent text-transparent' : bg}`}
                            >
                              {isSunday ? '' : label}
                            </div>
                          </td>
                        );
                      })}

                      <td className="px-1.5 py-1.5 text-center border-l border-slate-200 font-semibold bg-slate-50 text-[10px]">{rekap.s}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-[10px]">{rekap.i}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-rose-600 text-[10px]">{rekap.a}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-[10px]">{rekap.tl}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-[10px]">{rekap.pc}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-[10px]">{rekap.nfIn}</td>
                      <td className="px-1.5 py-1.5 text-center font-semibold bg-slate-50 text-[10px]">{rekap.nfOut}</td>
                      <td className="px-2 py-1.5 text-center font-bold bg-emerald-50 text-emerald-800 border-l border-emerald-100 text-[10px]">{rekap.duhurYa}x</td>
                      <td className="px-2 py-1.5 text-center font-bold bg-emerald-50 text-emerald-800 text-[10px]">{rekap.asharYa}x</td>
                      <td className="px-2.5 py-1.5 text-center font-black bg-indigo-50/80 text-indigo-700 border-l border-indigo-100 text-[10px]">{rekap.persen}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup Informasi Detail Presensi Harian (Card Klik) */}
      {showTodayDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm tracking-wide">Rincian Kehadiran Guru Hari Ini</h3>
                <p className="text-[11px] text-slate-400">Tanggal: {todayString} ({todayStats.persen}% Hadir)</p>
              </div>
              <button 
                onClick={() => setShowTodayDetailModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 space-y-2 flex-1">
              {guruList.map((guru, index) => {
                const item = todayAbsensiMap[guru.id];
                const isHadir = !item || item.status_kehadiran === 'Hadir';

                return (
                  <div key={guru.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 text-slate-400 font-semibold text-center">{index + 1}</span>
                      <div>
                        <p className="font-bold text-slate-900">{guru.nama}</p>
                        <p className="text-[10px] text-slate-500">{guru.niy ? `NIY: ${guru.niy}` : '-'}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        isHadir ? 'bg-emerald-100 text-emerald-800' :
                        item?.status_kehadiran === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                        item?.status_kehadiran === 'Izin' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item?.status_kehadiran || 'Hadir'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowTodayDetailModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Informasi Detail Presensi Tabel (Klik di Cell) */}
      {selectedCellInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">Detail Presensi Harian</h3>
              <button 
                onClick={() => setSelectedCellInfo(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Tenaga Pendidik</span>
                <p className="font-bold text-slate-900">{selectedCellInfo.guruNama}</p>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Rekam</span>
                <p className="font-semibold text-slate-800">{selectedCellInfo.day} {selectedBulan}</p>
              </div>

              {selectedCellInfo.isSunday ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                  Hari Minggu (Libur Nasional / Akhir Pekan).
                </div>
              ) : !selectedCellInfo.item ? (
                <div className="bg-slate-100 border border-slate-200 text-slate-600 p-3 rounded-xl text-xs font-semibold">
                  Belum ada data presensi yang di-input pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Status Kehadiran</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5 ${
                      selectedCellInfo.item.status_kehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                      selectedCellInfo.item.status_kehadiran === 'Sakit' ? 'bg-blue-100 text-blue-800' :
                      selectedCellInfo.item.status_kehadiran === 'Izin' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedCellInfo.item.status_kehadiran}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Atribut Kedisiplinan</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedCellInfo.item.terlambat && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-semibold">Terlambat (TL)</span>}
                      {selectedCellInfo.item.pulang_cepat && <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs font-semibold">Pulang Cepat (PC)</span>}
                      {selectedCellInfo.item.nf_in && <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded text-xs font-semibold">Not Finger In (NFi)</span>}
                      {selectedCellInfo.item.nf_out && <span className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded text-xs font-semibold">Not Finger Out (NFo)</span>}
                      {!selectedCellInfo.item.terlambat && !selectedCellInfo.item.pulang_cepat && !selectedCellInfo.item.nf_in && !selectedCellInfo.item.nf_out && (
                        <span className="text-xs text-slate-500 italic">Tidak ada catatan pelanggaran atribut.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Catatan / Keterangan</span>
                    <p className="text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 mt-0.5 font-medium">
                      {selectedCellInfo.item.keterangan || '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedCellInfo(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}