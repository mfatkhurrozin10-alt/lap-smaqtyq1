// src/views/Nilai/NilaiDashboardStats.tsx
import { useState, useMemo, useEffect } from 'react';
import { Icons } from '../../Icons';

export default function NilaiDashboardStats({
  stats, 
  filterMapel, setFilterMapel, filteredMapelOptions,
  filterKelas, setFilterKelas, options, search, setSearch,
  fetchLoading, groupedByMapelAndKelas,
  filterGuru, setFilterGuru, isTeacherRole
}: any) {
  
  const [filterUjian, setFilterUjian] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedModalData, setSelectedModalData] = useState<any | null>(null);
  
  // State untuk menampilkan Pop-up Progres Guru
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Helper untuk mendapatkan Nama Wali Kelas berdasarkan Nama Kelas
  const getWaliKelas = (kelasName: string) => {
    const found = (options?.guru || []).find((g: any) => {
      const roleMatch = (g.role || '').trim().toLowerCase() === 'wali_kelas';
      const binaanMatch = (g.kelas_binaan || '').trim().toLowerCase() === (kelasName || '').trim().toLowerCase();
      return roleMatch && binaanMatch;
    });
    return found ? found.nama : null;
  };

  const getSingkatanUjian = (nama_ujian: string) => {
    if (!nama_ujian) return '-';
    let formatted = nama_ujian.toLowerCase();
    
    if (formatted.includes('ulangan harian') || formatted.includes('uh')) return 'UH';
    if (formatted.includes('tengah semester gasal') || formatted.includes('asts gasal')) return 'ASTS Gasal';
    if (formatted.includes('tengah semester genap') || formatted.includes('asts genap')) return 'ASTS Genap';
    if (formatted.includes('akhir semester gasal') || formatted.includes('asas gasal')) return 'ASAS Gasal';
    if (formatted.includes('akhir semester genap') || formatted.includes('asas genap')) return 'ASAS Genap';
    if (formatted.includes('akhir tahun') || formatted.includes('asat')) return 'ASAT';
    if (formatted.includes('tengah semester')) return 'ASTS';
    if (formatted.includes('akhir semester')) return 'ASAS';
    
    return nama_ujian; 
  };

  const tableRows = useMemo(() => {
    const result: Record<string, any[]> = {};
    const allItems: any[] = [];
    
    Object.values(groupedByMapelAndKelas || {}).forEach((arr: any) => {
      allItems.push(...arr);
    });

    allItems.forEach((item: any) => {
      const kkm = item.mapel?.kkm || 75;
      const isPass = item.nilai >= kkm;
      const singkatanUjianItem = getSingkatanUjian(item.ujian?.nama_ujian);

      const matchesUjian = filterUjian === 'ALL' || singkatanUjianItem === filterUjian || item.ujian_id === filterUjian;
      const matchesStatus = filterStatus === 'ALL' || 
        (filterStatus === 'TUNTAS' && isPass) || 
        (filterStatus === 'REMEDIAL' && !isPass);

      if (matchesUjian && matchesStatus) {
        const namaGuru = item.guru?.nama || item.guru_nama || 'Tanpa Guru';
        const namaMapel = item.mapel?.nama_mapel || item.mapel_nama || 'Tanpa Mapel';
        const kelas = item.kelas || 'Umum';
        const ujianId = item.ujian_id || 'umum';
        const judulMateriKey = (item.judul_materi || '-').trim().toLowerCase();
        
        const newKey = `${namaGuru}|#|${namaMapel}|#|${kelas}|#|${ujianId}|#|${judulMateriKey}`;
        
        if (!result[newKey]) result[newKey] = [];
        result[newKey].push(item);
      }
    });

    const rows = Object.keys(result).map((key) => {
      const items = result[key];
      const [namaGuru, namaMapel, kelas] = key.split('|#|');
      
      const kkm = items[0]?.mapel?.kkm || 75;
      const jmlSiswa = items.length;
      
      const latestCreatedAt = items.reduce((latest, curr) => {
        return (!latest || new Date(curr.created_at) > new Date(latest)) ? curr.created_at : latest;
      }, items[0]?.created_at);

      const totalNilai = items.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
      const rataRata = jmlSiswa > 0 ? (totalNilai / jmlSiswa).toFixed(2) : '0';
      
      const jmlTuntas = items.filter((i: any) => i.nilai >= kkm).length;
      const jmlKurang = jmlSiswa - jmlTuntas;
      
      const pctTuntas = jmlSiswa > 0 ? ((jmlTuntas / jmlSiswa) * 100).toFixed(1) : '0';
      const pctKurang = jmlSiswa > 0 ? ((jmlKurang / jmlSiswa) * 100).toFixed(1) : '0';

      const isTuntasBaik = parseFloat(pctTuntas) >= 80;
      const sortedItems = [...items].sort((a, b) => (a.siswa?.nama || '').localeCompare(b.siswa?.nama || ''));

      const defaultMateri = items[0]?.judul_materi || '-';
      const namaUjianLabel = getSingkatanUjian(items[0]?.ujian?.nama_ujian);

      return {
        namaGuru, namaMapel, kelas, defaultMateri, namaUjianLabel, kkm, jmlSiswa, rataRata,
        jmlTuntas, jmlKurang, pctTuntas, pctKurang,
        isTuntasBaik, items: sortedItems, latestCreatedAt
      };
    });

    return rows.sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime());
  }, [groupedByMapelAndKelas, filterUjian, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterGuru, filterMapel, filterKelas, filterUjian, filterStatus, search]);

  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const paginatedRows = tableRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const availableUjianOptions = useMemo(() => {
    const list: any[] = [];
    Object.values(groupedByMapelAndKelas || {}).forEach((arr: any) => {
      arr.forEach((item: any) => {
        if (item.ujian) {
          const singkatan = getSingkatanUjian(item.ujian.nama_ujian);
          if (!list.some(u => u.id === item.ujian.id)) {
            list.push({ id: item.ujian.id, nama: singkatan, originalName: item.ujian.nama_ujian });
          }
        }
      });
    });
    return list;
  }, [groupedByMapelAndKelas]);

  return (
    <div className="space-y-6 w-full relative">
      
      {/* CARD RATA-RATA NILAI TERFILTER & PROGRES PENGISIAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Rata-rata Nilai (Terfilter)</h3>
            <p className="text-xs text-slate-400">Kalkulasi berdasarkan kombinasi filter bulan, kelas, guru, dan mapel.</p>
          </div>
          <div className="px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
            <span className="block text-3xl font-extrabold text-indigo-700">{stats?.avgScore || '0'}</span>
          </div>
        </div>

        {/* Kotak Progres Pengisian (Bisa Diklik) */}
        <div 
          onClick={() => setShowProgressModal(true)}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
          title="Klik untuk melihat rincian progres masing-masing guru"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 group-hover:text-emerald-600 transition-colors">Progres Pengisian Nilai</h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Rincian</span>
            </div>
            <p className="text-xs text-slate-400">Berdasarkan pembagian tugas mengajar di guru_mapel.</p>
          </div>
          <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center group-hover:bg-emerald-100 transition-colors">
            <span className="block text-3xl font-extrabold text-emerald-700">{stats?.progressPct || '0.0'}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Rekapitulasi Nilai & Ketuntasan</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Klik baris tabel untuk melihat dan mengelola detail nilai kelas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          
          {!isTeacherRole && (
            <select
              value={filterGuru}
              onChange={(e) => setFilterGuru(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer flex-1 min-w-[120px]"
            >
              <option value="ALL">Semua Guru</option>
              {options.guru.map((g: any) => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          )}

          <select
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer flex-1 min-w-[120px]"
          >
            <option value="ALL">Semua Mapel</option>
            {filteredMapelOptions.map((m: any) => (<option key={m.id} value={m.id}>{m.nama_mapel}</option>))}
          </select>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer flex-1 min-w-[100px]"
          >
            <option value="ALL">Semua Kelas</option>
            {Array.from(new Set(options.siswa.map((s: any) => s.kelas).filter(Boolean))).sort().map((cls: any) => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>

          <select
            value={filterUjian}
            onChange={(e) => setFilterUjian(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer flex-1 min-w-[110px]"
          >
            <option value="ALL">Semua Ujian</option>
            {availableUjianOptions.map((u: any) => (
              <option key={u.id} value={u.nama}>{u.nama}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer flex-1 min-w-[110px]"
          >
            <option value="ALL">Semua Status</option>
            <option value="TUNTAS">Tuntas</option>
            <option value="REMEDIAL">Remedial</option>
          </select>

          <div className="relative w-full sm:w-44">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full min-w-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 text-center">NO</th>
                <th className="px-5 py-4">PENGAMPU (GURU)</th>
                <th className="px-5 py-4">MATA PELAJARAN & MATERI</th>
                <th className="px-5 py-4 text-center">KELAS</th>
                <th className="px-5 py-4 text-center">KKM</th>
                <th className="px-5 py-4 text-center">TOTAL</th>
                <th className="px-5 py-4 text-center">RATA-RATA</th>
                <th className="px-5 py-4 text-center">BELUM TUNTAS</th>
                <th className="px-5 py-4 text-center">TUNTAS</th>
                <th className="px-5 py-4 text-center">STATUS KELAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchLoading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-slate-400">Sinkronisasi rekapitulasi nilai...</td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-slate-400">Tidak ada rekapitulasi nilai yang cocok dengan filter.</td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const waliKelasName = getWaliKelas(row.kelas);
                  return (
                    <tr 
                      key={index} 
                      onClick={() => setSelectedModalData(row)}
                      className={`cursor-pointer transition-all hover:bg-indigo-50/40 ${!row.isTuntasBaik ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="px-5 py-4 text-center text-slate-400 font-semibold">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-5 py-4 font-bold text-slate-800">{row.namaGuru}</td>
                      
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-indigo-600">{row.namaMapel}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {row.namaUjianLabel}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]" title={row.defaultMateri}>
                            • {row.defaultMateri}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700">{row.kelas}</span>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {waliKelasName || <span className="italic text-slate-300">Belum diset</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-600 font-semibold">{row.kkm}</td>
                      <td className="px-5 py-4 text-center font-bold text-slate-800">{row.jmlSiswa}</td>
                      <td className="px-5 py-4 text-center font-bold text-slate-800">{row.rataRata}</td>
                      
                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-rose-600">{row.pctKurang}%</div>
                        <div className="text-[10px] text-slate-400">({row.jmlKurang} siswa)</div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-emerald-600">{row.pctTuntas}%</div>
                        <div className="text-[10px] text-slate-400">({row.jmlTuntas} siswa)</div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {row.isTuntasBaik ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Optimal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Perlu Remidi
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

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100 gap-3">
            <span className="text-[11px] font-medium text-slate-500">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, tableRows.length)} dari total {tableRows.length} rekor
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POP-UP / MODAL RINCIAN PROGRES MASING-MASING GURU */}
      {showProgressModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <Icons.Award />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">Rincian Progres Pengisian Nilai Per Guru</h2>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                    Persentase penyelesaian tugas asesmen berdasarkan penugasan kelas & mapel aktif.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowProgressModal(false)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Icons.X />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3 bg-white">
              {(!stats?.teacherProgressList || stats.teacherProgressList.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data penugasan guru ditemukan pada filter ini.</div>
              ) : (
                stats.teacherProgressList.map((t: any, idx: number) => {
                  const isComplete = parseFloat(t.pct) >= 100;
                  return (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">{t.nama}</span>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.pct}% Selesai
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tugas Terlaksana: <b>{t.selesaiTugas}</b> dari <b>{t.totalTugas}</b> penugasan kelas mapel</span>
                        <span>{isComplete ? '✨ Sempurna' : '⚠️ Belum Lengkap'}</span>
                      </div>
                      {/* Bar Progres Visual */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, parseFloat(t.pct))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">Total Pengajar Terdata: <b>{stats?.teacherProgressList?.length || 0}</b> guru</span>
              <button 
                onClick={() => setShowProgressModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <Icons.FileText />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">Rincian Penilaian & Materi Siswa</h2>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5">
                    {selectedModalData.namaGuru} — <span className="font-bold text-indigo-600">{selectedModalData.namaMapel}</span> (Kelas {selectedModalData.kelas}) — <span className="text-indigo-700 font-bold">{selectedModalData.namaUjianLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedModalData(null)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  <Icons.X />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 w-full bg-white">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                <thead className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-5 py-3 text-center">NO</th>
                    <th className="px-5 py-3">NIS</th>
                    <th className="px-5 py-3">NAMA SISWA</th>
                    <th className="px-5 py-3">JUDUL MATERI</th>
                    <th className="px-5 py-3 text-center">NILAI</th>
                    <th className="px-5 py-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedModalData.items.map((item: any, idx: number) => {
                    const isPass = item.nilai >= selectedModalData.kkm;

                    return (
                      <tr key={item.id || idx} className="transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{item.siswa?.nis || '-'}</td>
                        <td className="px-5 py-3 font-bold text-slate-800 text-xs">{item.siswa?.nama || 'Siswa'}</td>
                        <td className="px-5 py-3 text-xs text-slate-600 font-medium">
                          {item.judul_materi || '-'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-sm font-black ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>{item.nilai}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isPass ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                              Tuntas
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                              Remedial
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">Total: <b>{selectedModalData.items.length}</b> rekor penilaian</span>
              <button 
                onClick={() => setSelectedModalData(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
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