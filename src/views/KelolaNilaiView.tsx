// src/views/KelolaNilaiView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Award, Calendar, Search } from 'lucide-react';

export default function KelolaNilaiView({}: any) {
  const [loading, setLoading] = useState(true);
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  const fetchNilai = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nilai')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNilaiList(data || []);
    } catch (err) {
      console.error('Gagal memuat data nilai:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNilai();
  }, []);

  // Filter pencarian dan bulan
  const filteredNilai = nilaiList.filter((item: any) => {
    const matchSearch = 
      item.nama_siswa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori?.toLowerCase().includes(searchTerm.toLowerCase());

    const itemDate = item.created_at || item.tanggal || '';
    const matchMonth = selectedMonth ? itemDate.startsWith(selectedMonth) : true;

    return matchSearch && matchMonth;
  });

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat Data Nilai...</div>;
  }

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            <Award size={14} /> REKAPITULASI NILAI SANTRI
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Daftar Nilai Akademik dan Hasil Belajar</h2>
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
        </div>
      </div>

      {/* TOOLBAR PENCARIAN */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Cari siswa, mapel, atau kategori..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Total Ditampilkan: <span className="text-purple-700 font-black">{filteredNilai.length}</span> Data
        </div>
      </div>

      {/* TABEL DATA NILAI (READ-ONLY) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center border-r border-slate-200">NO</th>
                <th className="px-6 py-4 border-r border-slate-200">NAMA SISWA / SANTRI</th>
                <th className="px-6 py-4 border-r border-slate-200">MATA PELAJARAN</th>
                <th className="px-5 py-4 border-r border-slate-200">KATEGORI / JENIS</th>
                <th className="px-5 py-4 text-center border-r border-slate-200">NILAI / SKOR</th>
                <th className="px-6 py-4">TANGGAL / WAKTU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNilai.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Tidak ada data nilai ditemukan pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredNilai.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-400 font-bold text-center border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 border-r border-slate-100">
                      {item.nama_siswa || item.siswa_nama || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium border-r border-slate-100">
                      {item.mapel || item.mata_pelajaran || '-'}
                    </td>
                    <td className="px-5 py-4 border-r border-slate-100">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-[11px] rounded-lg border border-purple-100">
                        {item.kategori || item.jenis || 'Umum'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-black text-sm text-slate-900 border-r border-slate-100">
                      {item.nilai || item.skor || 0}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
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