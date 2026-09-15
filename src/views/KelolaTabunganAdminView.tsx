// src/views/KelolaTabunganAdminView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { fetchAllTabunganData } from '../services/tabungan';
import { Icons } from '../Icons';
import { Card } from '../components/UIComponents';

export default function KelolaTabunganAdminView({ showNotification }: any) {
  const [tabunganData, setTabunganData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  
  // State tambahan untuk Filter Tabungan Kosong dan Pengurutan (Sorting)
  const [filterStatusTabungan, setFilterStatusTabungan] = useState('ALL'); // 'ALL' | 'KOSONG' | 'ADA'
  const [sortBy, setSortBy] = useState('nama_asc'); // 'nama_asc' | 'saldo_desc' | 'saldo_asc' | 'kelas_asc'

  const fetchTabunganAll = async () => {
    setLoading(true);
    try {
      const [resSiswa, resTabunganSheets] = await Promise.all([
        supabase.from('siswa').select('*').order('nama'),
        fetchAllTabunganData()
      ]);

      if (resSiswa.error) throw resSiswa.error;
      const listSiswa = resSiswa.data || [];
      const listTabunganSheets = resTabunganSheets || [];

      const tabunganMap = new Map();
      listTabunganSheets.forEach((item: any) => {
        const key = String(item.nisn || '').trim();
        if (key) tabunganMap.set(key, item);
      });

      const mergedResults = listSiswa.map((s: any) => {
        const nisUser = String(s.nis || s.nisn || '').trim();
        const tabunganInfo = tabunganMap.get(nisUser);

        return {
          ...s,
          saldo: Number(tabunganInfo?.saldo || 0),
          history: tabunganInfo?.history || []
        };
      });

      setTabunganData(mergedResults);
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyinkronkan data tabungan dari server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTabunganAll(); }, []);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(tabunganData.map(s => s.kelas?.trim()).filter(Boolean))).sort();
  }, [tabunganData]);

  // Filter dan Sorting digabungkan secara dinamis
  const filteredTabungan = useMemo(() => {
    // 1. Filter Data
    const filtered = tabunganData.filter(item => {
      const matchesSearch = (item.nama || '').toLowerCase().includes(search.toLowerCase()) || String(item.nis || item.nisn || '').includes(search);
      const matchesKelas = filterKelas === 'ALL' || (item.kelas || '').trim() === filterKelas;
      
      // Filter status tabungan (Kosong vs Ada isi)
      const saldoVal = Number(item.saldo || 0);
      const matchesStatusTabungan = 
        filterStatusTabungan === 'ALL' || 
        (filterStatusTabungan === 'KOSONG' && saldoVal === 0) || 
        (filterStatusTabungan === 'ADA' && saldoVal > 0);

      return matchesSearch && matchesKelas && matchesStatusTabungan;
    });

    // 2. Sorting Data
    return filtered.sort((a, b) => {
      if (sortBy === 'saldo_desc') {
        return Number(b.saldo || 0) - Number(a.saldo || 0);
      }
      if (sortBy === 'saldo_asc') {
        return Number(a.saldo || 0) - Number(b.saldo || 0);
      }
      if (sortBy === 'kelas_asc') {
        const kelasA = (a.kelas || '').trim();
        const kelasB = (b.kelas || '').trim();
        if (kelasA !== kelasB) {
          return kelasA.localeCompare(kelasB, undefined, { numeric: true });
        }
        return (a.nama || '').localeCompare(b.nama || '');
      }
      // Default: nama_asc
      return (a.nama || '').localeCompare(b.nama || '');
    });
  }, [tabunganData, search, filterKelas, filterStatusTabungan, sortBy]);

  const totalSemuaSaldo = useMemo(() => {
    return tabunganData.reduce((acc, curr) => acc + Number(curr.saldo || 0), 0);
  }, [tabunganData]);

  // 1. Hitung 5 Peringkat Tertinggi Tabungan
  const top5Tabungan = useMemo(() => {
    return [...tabunganData]
      .sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0))
      .slice(0, 5);
  }, [tabunganData]);

  // 2. Olah Data untuk Grafik Garis Perkembangan per Hari
  const chartData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};
    
    tabunganData.forEach(siswa => {
      if (siswa.history && Array.isArray(siswa.history)) {
        siswa.history.forEach((h: any) => {
          const tgl = h.tanggal; // Format: DD/MM/YYYY
          const nominal = Number(h.nominal || 0);
          if (tgl) {
            dailyMap[tgl] = (dailyMap[tgl] || 0) + nominal;
          }
        });
      }
    });

    // Urutkan berdasarkan tanggal (ubah DD/MM/YYYY ke timestamp untuk sorting)
    const sortedDates = Object.keys(dailyMap).sort((a, b) => {
      const [dA, mA, yA] = a.split('/').map(Number);
      const [dB, mB, yB] = b.split('/').map(Number);
      return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
    });

    return sortedDates.map(tgl => ({
      tanggal: tgl,
      total: dailyMap[tgl]
    }));
  }, [tabunganData]);

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Kelola Tabungan Siswa</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Monitoring saldo tabungan seluruh santri secara terpusat dari Google Sheets</p>
        </div>
        <button onClick={fetchTabunganAll} disabled={loading} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-sm w-fit disabled:opacity-50">
          <Icons.Refresh /> {loading ? 'Memuat Saldo...' : 'Sinkronkan Saldo'}
        </button>
      </div>

      {/* Kartu Statistik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Seluruh Tabungan Santri</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">Rp {totalSemuaSaldo.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Santri Terpantau</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{tabunganData.length} Siswa</p>
        </div>
      </div>

      {/* Grid Bagian Atas: 5 Peringkat & Grafik Perkembangan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Top 5 Peringkat Tertinggi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> 5 Peringkat Tabungan Tertinggi
              </h3>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-xs text-slate-400 py-6 text-center">Memuat peringkat...</p>
              ) : top5Tabungan.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada data</p>
              ) : (
                top5Tabungan.map((item, index) => (
                  <div key={item.id || index} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.nama}</p>
                        <p className="text-[10px] text-slate-500">Kelas {item.kelas || '-'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">
                      Rp {Number(item.saldo || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 2. Grafik Garis Perkembangan Setoran per Hari */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Grafik Perkembangan Transaksi Harian
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-100">
                Real-time dari History
              </span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Memuat grafik...</div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Belum ada data riwayat transaksi harian.</div>
            ) : (
              <div className="pt-4">
                {/* SVG Line Chart yang Responsif & Elegan */}
                <div className="w-full h-48 overflow-x-auto">
                  <svg className="w-full h-full min-w-[400px]" viewBox="0 0 500 180" preserveAspectRatio="none">
                    {/* Grid Garis Latar Belakang */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Kalkulasi Koordinat Line Chart */}
                    {(() => {
                      const maxVal = Math.max(...chartData.map(d => d.total), 1000);
                      const points = chartData.map((d, i) => {
                        const x = chartData.length === 1 ? 250 : (i / (chartData.length - 1)) * 460 + 20;
                        const y = 150 - (d.total / maxVal) * 120;
                        return `${x},${y}`;
                      }).join(' ');

                      const firstX = chartData.length === 1 ? 250 : 20;
                      const lastX = chartData.length === 1 ? 250 : 480;
                      const areaPoints = `${firstX},160 ${points} ${lastX},160`;

                      return (
                        <>
                          {/* Area Gradien di Bawah Garis */}
                          <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <polygon points={areaPoints} fill="url(#grad)" />

                          {/* Garis Grafik Utama */}
                          <polyline
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                          />

                          {/* Titik Data (Dots) */}
                          {chartData.map((d, i) => {
                            const x = chartData.length === 1 ? 250 : (i / (chartData.length - 1)) * 460 + 20;
                            const y = 150 - (d.total / maxVal) * 120;
                            return (
                              <g key={i} className="group cursor-pointer">
                                <circle cx={x} cy={y} r="4.5" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Sumbu X (Label Tanggal) */}
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 px-2 overflow-x-auto">
                  {chartData.map((d, i) => (
                    <span key={i} className="truncate px-1">{d.tanggal}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Tabel Utama Daftar Tabungan */}
      <Card 
        title="Daftar Saldo Tabungan Peserta Didik"
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter Kelas */}
            <select 
              value={filterKelas} 
              onChange={(e) => setFilterKelas(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
            </select>

            {/* Filter Status Tabungan (Kosong / Ada Saldo) */}
            <select 
              value={filterStatusTabungan} 
              onChange={(e) => setFilterStatusTabungan(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
            >
              <option value="ALL">Semua Tabungan</option>
              <option value="KOSONG">Tabungan Kosong (Rp 0)</option>
              <option value="ADA">Ada Saldo (&gt; Rp 0)</option>
            </select>

            {/* Pilihan Sorting (Urutkan Berdasarkan) */}
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
            >
              <option value="nama_asc">Urut Nama (A-Z)</option>
              <option value="saldo_desc">Saldo Tertinggi</option>
              <option value="saldo_asc">Saldo Terendah</option>
              <option value="kelas_asc">Urut Berdasarkan Kelas</option>
            </select>

            {/* Input Pencarian */}
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
                <th className="px-4 py-3.5">NIS / NISN</th>
                <th className="px-4 py-3.5">Nama Peserta Didik</th>
                <th className="px-4 py-3.5 text-center">Kelas</th>
                <th className="px-4 py-3.5 text-right">Saldo Tabungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Sedang menarik data tabungan secara serentak dari server...</td></tr>
              ) : filteredTabungan.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada data tabungan santri yang ditemukan.</td></tr>
              ) : (
                filteredTabungan.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">{item.nis || item.nisn || '-'}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.kelas || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                      Rp {Number(item.saldo || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}