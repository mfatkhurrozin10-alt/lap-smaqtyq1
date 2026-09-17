// src/views/KelolaNilaiView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase, getCurrentMonthName } from '../services/supabase';
import { Icons } from '../Icons';
import { ConfirmModal } from '../components/UIComponents';

// Import Komponen Anak
import NilaiDashboardStats from './Nilai/NilaiDashboardStats';

export default function KelolaNilaiView({ showNotification, user }: any) {
  const isTeacherRole = user?.role === 'guru' || user?.role === 'wali_kelas';

  const [data, setData] = useState<any[]>([]);
  const [options, setOptions] = useState<{ guru: any[]; siswa: any[]; ujian: any[]; mapel: any[]; guruMapel: any[] }>({
    guru: [], siswa: [], ujian: [], mapel: [], guruMapel: []
  });
  
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMapel, setFilterMapel] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterGuru, setFilterGuru] = useState('ALL');
  const [filterBulan, setFilterBulan] = useState(getCurrentMonthName()); 
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const fetchWithPagination = async (queryBuilderFn: (start: number, end: number) => any) => {
        let allData: any[] = [];
        let start = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await queryBuilderFn(start, start + 999);
          if (error) throw error;
          const chunk = data || [];
          allData = [...allData, ...chunk];
          if (chunk.length < 1000) hasMore = false;
          else start += 1000;
        }
        return { data: allData };
      };

      const [rGuru, rSiswa, rUjian, rMapel, rGuruMapel, rNilai] = await Promise.all([
        supabase.from('guru').select('id, nama, niy, role, kelas_binaan').order('nama'),
        fetchWithPagination((s, e) => supabase.from('siswa').select('id, nama, nis, kelas').order('nama').range(s, e)),
        supabase.from('ujian').select('id, nama_ujian, kode').order('nama_ujian'),
        supabase.from('mapel').select('id, nama_mapel, kode, kkm').order('nama_mapel'),
        supabase.from('guru_mapel').select('*'),
        fetchWithPagination((s, e) => supabase.from('nilai')
          .select('*, guru(nama, id), siswa(nama, nis), ujian(nama_ujian), mapel(nama_mapel, kkm)')
          .order('created_at', { ascending: false })
          .range(s, e)
        )
      ]);

      setOptions({
        guru: rGuru.data || [],
        siswa: rSiswa.data || [],
        ujian: rUjian.data || [],
        mapel: rMapel.data || [],
        guruMapel: rGuruMapel.data || []
      });

      let finalNilaiData = rNilai.data || [];
      
      if (isTeacherRole && user?.id) {
        const assignedMapels = (rGuruMapel.data || []).filter((gm: any) => gm.guru_id === user.id).map((gm: any) => gm.mapel_id);
        const assignedClasses = (rGuruMapel.data || []).filter((gm: any) => gm.guru_id === user.id).map((gm: any) => gm.kelas?.trim());
        
        finalNilaiData = finalNilaiData.filter((n: any) => 
          n.guru_id === user.id || (assignedMapels.includes(n.mapel_id) && assignedClasses.includes(n.kelas?.trim()))
        );
      }

      setData(finalNilaiData);
    } catch (err: any) {
      showNotification(err.message || 'Gagal sinkronisasi data penilaian', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredMapelOptions = useMemo(() => {
    let baseMapel = options.mapel;
    if (isTeacherRole && user?.id) {
      const assignedMapelIds = options.guruMapel.filter((gm: any) => gm.guru_id === user.id).map((gm: any) => gm.mapel_id);
      baseMapel = options.mapel.filter((m: any) => assignedMapelIds.includes(m.id));
    }
    return baseMapel;
  }, [options.mapel, options.guruMapel, isTeacherRole, user]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('nilai').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification('Data penilaian berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus nilai', 'error');
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const nameMatch = (item.siswa?.nama || '').toLowerCase().includes(search.toLowerCase()) || (item.siswa?.nis || '').toLowerCase().includes(search.toLowerCase());
      const mapelMatch = filterMapel === 'ALL' || item.mapel_id === filterMapel;
      const kelasMatch = filterKelas === 'ALL' || (item.kelas || '').trim() === filterKelas.trim();
      const guruMatch = filterGuru === 'ALL' || item.guru_id === filterGuru;
      const bulanMatch = filterBulan === 'ALL' || (item.bulan || '') === filterBulan;
      
      return nameMatch && mapelMatch && kelasMatch && guruMatch && bulanMatch;
    });
  }, [data, search, filterMapel, filterKelas, filterGuru, filterBulan]);

  // Kalkulasi statistik dan rincian daftar tugas sudah/belum per guru
  const stats = useMemo(() => {
    if (filteredData.length === 0 && options.guruMapel.length === 0) {
      return { totalRecords: 0, avgScore: '0', tuntasCount: 0, remedialCount: 0, progressPct: '0.0', teacherProgressList: [] };
    }
    
    const totalScore = filteredData.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
    const avgScore = filteredData.length > 0 ? (totalScore / filteredData.length).toFixed(1) : '0';
    
    let tuntas = 0;
    let remedial = 0;
    filteredData.forEach(n => {
      const kkm = n.mapel?.kkm || 75;
      if ((n.nilai || 0) >= kkm) tuntas++;
      else remedial++;
    });

    let targetGuruMapel = options.guruMapel;
    if (filterGuru !== 'ALL') {
      targetGuruMapel = targetGuruMapel.filter((gm: any) => gm.guru_id === filterGuru);
    }
    if (filterMapel !== 'ALL') {
      targetGuruMapel = targetGuruMapel.filter((gm: any) => gm.mapel_id === filterMapel);
    }
    if (filterKelas !== 'ALL') {
      targetGuruMapel = targetGuruMapel.filter((gm: any) => (gm.kelas || '').trim() === filterKelas.trim());
    }

    const totalExpected = targetGuruMapel.length;
    let progressPct = '100.0';

    const uploadedSet = new Set(
      filteredData.map((n: any) => `${n.guru_id}-${n.mapel_id}-${(n.kelas || '').trim()}`)
    );

    if (totalExpected > 0) {
      let fulfilled = 0;
      targetGuruMapel.forEach((gm: any) => {
        const key = `${gm.guru_id}-${gm.mapel_id}-${(gm.kelas || '').trim()}`;
        if (uploadedSet.has(key)) fulfilled++;
      });
      progressPct = ((fulfilled / totalExpected) * 100).toFixed(1);
    } else {
      progressPct = '0.0';
    }

    // Map detail rincian per guru (list kelas & mapel sudah/belum)
    const teacherMap: Record<string, any> = {};
    
    options.guru.forEach((g: any) => {
      if (filterGuru === 'ALL' || g.id === filterGuru) {
        teacherMap[g.id] = { 
          nama: g.nama, 
          totalTugas: 0, 
          selesaiTugas: 0, 
          listPekerjaan: [] 
        };
      }
    });

    targetGuruMapel.forEach((gm: any) => {
      if (!teacherMap[gm.guru_id]) {
        const foundG = options.guru.find((g: any) => g.id === gm.guru_id);
        teacherMap[gm.guru_id] = { 
          nama: foundG ? foundG.nama : 'Guru Lain', 
          totalTugas: 0, 
          selesaiTugas: 0, 
          listPekerjaan: [] 
        };
      }

      teacherMap[gm.guru_id].totalTugas++;
      
      const key = `${gm.guru_id}-${gm.mapel_id}-${(gm.kelas || '').trim()}`;
      const isUploaded = uploadedSet.has(key);
      if (isUploaded) {
        teacherMap[gm.guru_id].selesaiTugas++;
      }

      const mapelObj = options.mapel.find((m: any) => m.id === gm.mapel_id);
      teacherMap[gm.guru_id].listPekerjaan.push({
        mapelNama: mapelObj ? mapelObj.nama_mapel : 'Mata Pelajaran',
        kelasName: gm.kelas || '-',
        isUploaded
      });
    });

    const teacherProgressList = Object.values(teacherMap)
      .filter((t: any) => t.totalTugas > 0)
      .map((t: any) => {
        const pct = t.totalTugas > 0 ? ((t.selesaiTugas / t.totalTugas) * 100).toFixed(1) : '0.0';
        return { ...t, pct };
      })
      .sort((a: any, b: any) => parseFloat(b.pct) - parseFloat(a.pct));

    return { 
      totalRecords: filteredData.length, 
      avgScore, 
      tuntasCount: tuntas, 
      remedialCount: remedial, 
      progressPct,
      teacherProgressList 
    };
  }, [filteredData, options.guruMapel, options.guru, options.mapel, filterGuru, filterMapel, filterKelas]);

  const groupedByMapelAndKelas = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredData.forEach((item: any) => {
      const key = `${item.mapel?.nama_mapel || 'Tanpa Mapel'} - Kelas ${item.kelas || 'Umum'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredData]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Daftar & Penilaian Akademik</span>
            <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-semibold border border-rose-100">
              {stats.totalRecords} Rekor
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola rekapitulasi nilai dan pengisian lembar asesmen peserta didik</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <select 
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Bulan</option>
            <option value="Januari">Januari</option>
            <option value="Februari">Februari</option>
            <option value="Maret">Maret</option>
            <option value="April">April</option>
            <option value="Mei">Mei</option>
            <option value="Juni">Juni</option>
            <option value="Juli">Juli</option>
            <option value="Agustus">Agustus</option>
            <option value="September">September</option>
            <option value="Oktober">Oktober</option>
            <option value="November">November</option>
            <option value="Desember">Desember</option>
          </select>

          <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            <Icons.Refresh /> Segarkan
          </button>
        </div>
      </div>

      <NilaiDashboardStats 
        stats={stats}
        filterMapel={filterMapel}
        setFilterMapel={setFilterMapel}
        filteredMapelOptions={filteredMapelOptions}
        filterKelas={filterKelas}
        setFilterKelas={setFilterKelas}
        filterGuru={filterGuru}
        setFilterGuru={setFilterGuru}
        isTeacherRole={isTeacherRole}
        options={options}
        search={search}
        setSearch={setSearch}
        fetchLoading={fetchLoading}
        groupedByMapelAndKelas={groupedByMapelAndKelas}
        setDeleteTarget={setDeleteTarget}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Rekor Nilai?"
        message={`Apakah Anda yakin ingin menghapus data nilai "${deleteTarget?.siswa?.nama}" pada mata pelajaran "${deleteTarget?.mapel?.nama_mapel}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}