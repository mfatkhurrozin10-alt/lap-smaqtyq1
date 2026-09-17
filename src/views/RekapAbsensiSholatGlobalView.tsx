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

      const [rAbsensi, rSholat] = await Promise.all([
        supabase.from('absensi_guru_harian').select('*').gte('tanggal', startDate).lte('tanggal', endDate),
        supabase.from('absensi_sholat_guru').select('*').gte('tanggal', startDate).lte('tanggal', endDate)
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

    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat rekap global', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBulan]);

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
    <div className="space-y-4 w-full text-left">
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
                    className={`px-1 py-2 text-center w-6 border-l border-slate-200 text-[10px] ${isSunday ? 'bg-rose-100 text-rose-700 font-black' : ''}`}
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
                        
                        // Jika belum ada data absensi yang diinput pada tanggal tersebut
                        if (!item) {
                          return (
                            <td key={day} className={`p-0.5 border-l border-slate-100 text-center ${isSunday ? 'bg-rose-50/70' : ''}`}>
                              <div 
                                title={`Tanggal ${day} ${selectedBulan}: Belum di-input`}
                                className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] cursor-help ${isSunday ? 'bg-rose-200 text-rose-500 font-bold' : 'bg-slate-200 text-slate-400'}`}
                              >
                                {isSunday ? 'LIBUR' : '-'}
                              </div>
                            </td>
                          );
                        }

                        const status = item.status_kehadiran;
                        let label = 'H';
                        let bg = isSunday ? 'bg-rose-200 text-rose-700 font-bold' : 'bg-emerald-600 text-white font-bold'; 

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
                            className={`p-0.5 border-l border-slate-100 text-center ${isSunday ? 'bg-rose-50/70' : ''}`}
                          >
                            <div 
                              title={tooltipText}
                              className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] cursor-help ${bg}`}
                            >
                              {label}
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
    </div>
  );
}