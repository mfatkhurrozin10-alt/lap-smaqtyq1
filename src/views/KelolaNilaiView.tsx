// src/views/KelolaNilaiView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Award } from 'lucide-react';

export default function KelolaNilaiView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [nilaiList, setNilaiList] = useState<any[]>([]);

  const fetchNilai = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('nilai').select('*');
      if (error) throw error;
      setNilaiList(data || []);
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('Gagal memuat data nilai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNilai();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat Rekap Penilaian...</div>;
  }

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
            <Award size={14} /> REKAPITULASI PENILAIAN SISWA
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Daftar Nilai Ulangan, ASTS, dan Ujian Sekolah</h2>
        </div>
      </div>

      {/* TABEL REKAP NILAI */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-12 text-center border-r border-slate-200">NO</th>
                <th className="px-6 py-4 border-r border-slate-200">KATEGORI / JENIS</th>
                <th className="px-6 py-4 border-r border-slate-200">NAMA / KETERANGAN</th>
                <th className="px-5 py-4 w-32 border-r border-slate-200 text-center">NILAI / SKOR</th>
                <th className="px-5 py-4 w-40 text-center">TANGGAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nilaiList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Belum ada data penilaian tersimpan di database.
                  </td>
                </tr>
              ) : (
                nilaiList.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-400 font-bold text-center border-r border-slate-100">{idx + 1}</td>
                    <td className="px-6 py-4 border-r border-slate-100 font-bold text-purple-700">
                      {item.kategori || item.jenis || 'Ulangan / Ujian'}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-100 text-slate-800 font-semibold">
                      {item.nama || item.keterangan || item.mapel || 'Penilaian Siswa'}
                    </td>
                    <td className="px-5 py-4 border-r border-slate-100 text-center font-black text-emerald-600">
                      {item.nilai || item.skor || '0'}
                    </td>
                    <td className="px-5 py-4 text-center text-slate-500 font-medium">
                      {item.tanggal || item.created_at?.slice(0, 10) || '-'}
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