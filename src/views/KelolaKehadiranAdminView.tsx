// src/views/KelolaKehadiranAdminView.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card } from '../components/UIComponents';

export default function KelolaKehadiranAdminView({ showNotification }: any) {
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [kehadiranList, setKehadiranList] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  // State Filter & Search
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState<string>(''); // Diubah default kosong dulu sebelum di-set otomatis
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM

  const fetchData = useCallback(async () => {
    if (!filterBulan) return;
    
    setFetchLoading(true);
    try {
      const startDate = `${filterBulan}-01`;
      const [year, month] = filterBulan.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${filterBulan}-${lastDay}`;

      // 1. Ambil SELURUH data Siswa secara aman menggunakan Looping (jika siswa > 1000)
      let allSiswa: any[] = [];
      let startSiswa = 0;
      let hasMoreSiswa = true;
      
      while (hasMoreSiswa) {
        const { data, error } = await supabase.from('siswa')
          .select('*')
          .order('nama')
          .range(startSiswa, startSiswa + 999);
          
        if (error) throw error;
        const chunk = data || [];
        allSiswa = [...allSiswa, ...chunk];
        
        if (chunk.length < 1000) hasMoreSiswa = false;
        else startSiswa += 1000;
      }
      setSiswaList(allSiswa);

      // 2. Ambil SELURUH data Kehadiran bulan ini menggunakan Looping (jika data > 1000)
      let allKehadiran: any[] = [];
      let startHadir = 0;
      let hasMoreHadir = true;
      
      while (hasMoreHadir) {
        const { data, error } = await supabase.from('kehadiran')
          .select('*')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .range(startHadir, startHadir + 999);
          
        if (error) throw error;
        const chunk = data || [];
        allKehadiran = [...allKehadiran, ...chunk];
        
        if (chunk.length < 1000) hasMoreHadir = false;
        else startHadir += 1000;
      }
      setKehadiranList(allKehadiran);

    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat rekap kehadiran', 'error');
    } finally {
      setFetchLoading(false);
    }
  }, [filterBulan, showNotification]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  // Daftar kelas unik untuk filter dropdown
  const availableClasses = useMemo(() => {
    return Array.from(new Set(siswaList.map(s => s.kelas?.trim()).filter(Boolean))).sort();
  }, [siswaList]);

  // OTOMATIS SET KELAS PERTAMA KETIKA DATA SISWA BERHASIL DIMUAT DAN FILTER KELAS MASIH KOSONG
  useEffect(() => {
    if (availableClasses.length > 0 && !filterKelas) {
      setFilterKelas(availableClasses[0]);
    }
  }, [availableClasses, filterKelas]);

  // Menggabungkan data siswa dengan rekapitulasi kehadiran berdasarkan filter bulan
  const rekapData = useMemo(() => {
    const summaryMap = new Map();

    kehadiranList.forEach(item => {
      const key = String(item.nisn || item.nis || '').trim();
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { hadir: 0, sakit: 0, izin: 0, alfa: 0 });
      }
      const record = summaryMap.get(key);
      const ket = (item.keterangan || '').toLowerCase();

      if (ket.includes('hadir')) record.hadir++;
      else if (ket.includes('sakit')) record.sakit++;
      else if (ket.includes('izin')) record.izin++;
      else if (ket.includes('alfa') || ket.includes('alpha') || ket.includes('mangkir')) record.alfa++;
      else record.hadir++; 
    });

    return siswaList.map(s => {
      const nisKey = String(s.nis || s.nisn || '').trim();
      const stats = summaryMap.get(nisKey) || { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
      
      return {
        id: s.id,
        nis: s.nis || s.nisn || '-',
        nama: s.nama || 'Tanpa Nama',
        kelas: (s.kelas || '-').trim(),
        ...stats
      };
    });
  }, [siswaList, kehadiranList]);

  // Filter pencarian dan kelas pada tabel rekap
  const filteredRekap = useMemo(() => {
    return rekapData.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || item.nis.includes(search);
      // Jika filterKelas kosong atau ALL, tampilkan semua (atau sesuaikan), namun karena default di-set ke kelas pertama, maka langsung tersortir ke kelas tersebut.
      const matchesKelas = !filterKelas || filterKelas === 'ALL' || item.kelas === filterKelas;
      return matchesSearch && matchesKelas;
    });
  }, [rekapData, search, filterKelas]);

  // Statistik Total Keseluruhan (Menyesuaikan dengan kelas/pencarian yg difilter)
  const totalStats = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alfa = 0;
    filteredRekap.forEach(item => {
      hadir += item.hadir;
      sakit += item.sakit;
      izin += item.izin;
      alfa += item.alfa;
    });
    return { hadir, sakit, izin, alfa };
  }, [filteredRekap]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Rekapitulasi Kehadiran Siswa</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Akumulasi data kehadiran peserta didik per bulan (Hadir, Sakit, Izin, Alpha)</p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm w-fit cursor-pointer">
          <Icons.Refresh /> Segarkan Data
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Total Hadir</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{totalStats.hadir} <span className="text-xs font-normal text-slate-400">Sesi</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase">Total Sakit</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalStats.sakit} <span className="text-xs font-normal text-slate-400">Hari</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Total Izin</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{totalStats.izin} <span className="text-xs font-normal text-slate-400">Hari</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase">Total Alpha</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{totalStats.alfa} <span className="text-xs font-normal text-slate-400">Hari</span></p>
        </div>
      </div>

      <Card 
        title="Tabel Rekapitulasi Kehadiran Bulanan"
        action={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input 
              type="month" 
              value={filterBulan} 
              onChange={(e) => setFilterBulan(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer" 
            />
            <select 
              value={filterKelas} 
              onChange={(e) => setFilterKelas(e.target.value)} 
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-medium cursor-pointer"
            >
              {/* Opsi 'Semua Kelas' dihilangkan atau ditaruh bawah jika ingin memaksa default kelas pertama, atau tetap dipertahankan namun prioritas awal ke index 0 */}
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
            </select>
            <div className="relative w-full sm:w-48">
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Cari nama / NIS..." 
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
                <th className="px-4 py-3.5">NIS</th>
                <th className="px-4 py-3.5">Nama Peserta Didik</th>
                <th className="px-4 py-3.5 text-center">Kelas</th>
                <th className="px-4 py-3.5 text-center text-emerald-700">Hadir</th>
                <th className="px-4 py-3.5 text-center text-blue-700">Sakit</th>
                <th className="px-4 py-3.5 text-center text-amber-700">Izin</th>
                <th className="px-4 py-3.5 text-center text-rose-700">Alpha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetchLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Memuat dan menghitung data kehadiran...</td></tr>
              ) : filteredRekap.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada data siswa yang cocok dengan filter.</td></tr>
              ) : (
                filteredRekap.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-600">{item.nis}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{item.nama}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.kelas}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{item.hadir}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-blue-600">{item.sakit}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-amber-600">{item.izin}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-rose-600">{item.alfa}</td>
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