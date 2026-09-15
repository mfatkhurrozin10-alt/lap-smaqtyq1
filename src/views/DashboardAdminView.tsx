import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card } from '../components/UIComponents';

export default function DashboardAdminView({ onNavigate }: any) {
  const [stats, setStats] = useState({
    guruCount: 0,
    siswaCount: 0,
    mapelCount: 0,
    nilaiCount: 0,
    tuntasPercent: 100,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        const [guruRes, siswaRes, mapelRes, nilaiRes] = await Promise.all([
          supabase.from('guru').select('id', { count: 'exact' }),
          supabase.from('siswa').select('id', { count: 'exact' }),
          supabase.from('mapel').select('id', { count: 'exact' }),
          supabase.from('nilai').select('nilai, mapel(kkm)')
        ]);

        const totalNilai = (nilaiRes as any)?.data || [];
        const lulusCount = totalNilai.filter((n: any) => n.nilai >= (n.mapel?.kkm || 75)).length;
        const passRatio = totalNilai.length ? Math.round((lulusCount / totalNilai.length) * 100) : 100;

        setStats({
          guruCount: (guruRes as any)?.count || 0,
          siswaCount: (siswaRes as any)?.count || 0,
          mapelCount: (mapelRes as any)?.count || 0,
          nilaiCount: totalNilai.length,
          tuntasPercent: passRatio,
        });
      } catch (e) {
        console.error('Error fetching dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8 w-full text-left">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-700 text-white p-8 md:p-10 shadow-xl shadow-indigo-950/10 w-full">
        <div className="relative z-10 w-full space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Portal Manajemen Terpusat
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Selamat Datang di Sistem Informasi Akademik
          </h1>
          <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
            Kelola data pengajar, siswa, kurikulum, serta unggah rekapitulasi penilaian kelas menggunakan format Microsoft Excel (.xlsx).
          </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => onNavigate('nilai')}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center sm:justify-start gap-2"
                >
                  <Icons.Plus /> Input Nilai Kelas
                </button>
                <button
                  onClick={() => onNavigate('siswa')}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-950/40 hover:bg-indigo-950/60 text-white font-semibold text-xs sm:text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-all flex items-center justify-center sm:justify-start gap-2"
                >
                  <Icons.GraduationCap /> Lihat Data Siswa
                </button>
              </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full">
        {[
          { label: 'Tenaga Pengajar', value: stats.guruCount, desc: 'Guru Terdaftar', tab: 'guru', icon: <Icons.Users />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
          { label: 'Peserta Didik', value: stats.siswaCount, desc: 'Siswa Aktif', tab: 'siswa', icon: <Icons.GraduationCap />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
          { label: 'Mata Pelajaran', value: stats.mapelCount, desc: 'Kurikulum Aktif', tab: 'mapel', icon: <Icons.Book />, color: 'bg-amber-50 text-amber-600 border-amber-200' },
          { label: 'Rerata Kelulusan', value: `${stats.tuntasPercent}%`, desc: 'Tuntas KKM', tab: 'nilai', icon: <Icons.TrendingUp />, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        ].map((m, idx) => (
          <div 
            key={idx} 
            onClick={() => onNavigate(m.tab)}
            className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between w-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.color} transition-transform group-hover:scale-105`}>
                {m.icon}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {loading ? <span className="inline-block w-12 h-7 bg-slate-200 animate-pulse rounded"></span> : m.value}
              </div>
              <div className="text-xs text-slate-400 mt-1">{m.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        <Card title="Akses Cepat Modul" subtitle="Navigasi langsung ke modul utama">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {[
              { id: 'guru', title: 'Data Guru', desc: 'Input & List Pendidik', icon: <Icons.Users />, color: 'text-blue-600 bg-blue-50' },
              { id: 'siswa', title: 'Data Siswa', desc: 'Kelola Kelas & NIS', icon: <Icons.GraduationCap />, color: 'text-emerald-600 bg-emerald-50' },
              { id: 'ujian', title: 'Data Ujian', desc: 'Master UTS, PAS, dsb', icon: <Icons.FileText />, color: 'text-amber-600 bg-amber-50' },
              { id: 'nilai', title: 'Daftar Nilai', desc: 'Transkrip & Rekapitulasi', icon: <Icons.Award />, color: 'text-rose-600 bg-rose-50' },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => onNavigate(btn.id)}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/70 transition-all text-left group w-full"
              >
                <div className={`p-2.5 rounded-xl ${btn.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  {btn.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{btn.title}</h4>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">{btn.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Dukungan Microsoft Excel Asli" subtitle="Manajemen batch berkas .xlsx">
          <div className="space-y-3 w-full">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs w-full">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <Icons.FileSpreadsheet />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800">Dukungan Excel Asli (.xlsx)</span>
                <p className="text-slate-500 leading-relaxed">
                  Unduh template resmi, buka langsung di Microsoft Excel tanpa konfigurasi pemisah CSV, simpan nilai, dan unggah kembali secara instan.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 leading-relaxed w-full">
              💡 <strong>Tips Penilaian:</strong> Saat memilih kelas target pada formulir nilai, sistem secara otomatis menyiapkan template Excel yang sudah memuat nama seluruh murid di kelas tersebut.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}