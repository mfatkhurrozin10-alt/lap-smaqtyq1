// src/views/KelolaNilaiView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, getCurrentAcademicYear, getCurrentMonthName } from '../services/supabase';
import { Icons } from '../Icons';
import { ImportModal, ConfirmModal, downloadExcelTemplate } from '../components/UIComponents';

// Import Komponen Anak
import NilaiDashboardStats from './Nilai/NilaiDashboardStats';
import NilaiBatchForm from './Nilai/NilaiBatchForm';

export default function KelolaNilaiView({ showNotification, user }: any) {
  const isTeacherRole = user?.role === 'guru' || user?.role === 'wali_kelas';

  const [data, setData] = useState<any[]>([]);
  const [options, setOptions] = useState<{ guru: any[]; siswa: any[]; ujian: any[]; mapel: any[]; guruMapel: any[] }>({
    guru: [], siswa: [], ujian: [], mapel: [], guruMapel: []
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMapel, setFilterMapel] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterGuru, setFilterGuru] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form'>('dashboard');

  const [form, setForm] = useState({
    tahun_ajaran: getCurrentAcademicYear(),
    bulan: getCurrentMonthName(),
    ujian_id: '',
    mapel_id: '',
    guru_id: isTeacherRole ? user.id : '',
    judul_materi: '',
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [bulkScore, setBulkScore] = useState('');

  useEffect(() => {
    if (isTeacherRole && user?.id) {
      setForm(prev => ({ ...prev, guru_id: user.id }));
    }
  }, [isTeacherRole, user]);

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
        supabase.from('guru').select('id, nama, niy').order('nama'),
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

  const availableClasses = useMemo(() => {
    if (isTeacherRole && user?.id) {
      const assignedClasses = options.guruMapel
        .filter((gm: any) => gm.guru_id === user.id && (!form.mapel_id || gm.mapel_id === form.mapel_id))
        .map((gm: any) => gm.kelas?.trim())
        .filter(Boolean);
      return Array.from(new Set(assignedClasses)).sort();
    }
    
    if (!form.mapel_id) {
      const list = Array.from(new Set(options.siswa.map((s: any) => s.kelas).filter(Boolean)));
      return list.sort();
    }

    const assignedClasses = options.guruMapel
      .filter((gm: any) => gm.mapel_id === form.mapel_id)
      .map((gm: any) => gm.kelas?.trim())
      .filter(Boolean);
    return Array.from(new Set(assignedClasses)).sort();
  }, [options.siswa, options.guruMapel, form.mapel_id, isTeacherRole, user]);

  const handleClassCheckboxChange = (cls: string) => {
    setSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === availableClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses([...availableClasses]);
    }
  };

  const studentsInSelectedClass = useMemo(() => {
    if (selectedClasses.length === 0) return [];
    const filtered = options.siswa.filter((s: any) => selectedClasses.includes(s.kelas));
    
    return filtered.sort((a: any, b: any) => {
      const kelasCompare = (a.kelas || '').localeCompare(b.kelas || '');
      if (kelasCompare !== 0) return kelasCompare;
      return (a.nama || '').localeCompare(b.nama || '');
    });
  }, [options.siswa, selectedClasses]);

  const stats = useMemo(() => {
    if (data.length === 0) return { totalRecords: 0, avgScore: '0', tuntasCount: 0, remedialCount: 0 };
    const totalScore = data.reduce((acc, curr) => acc + (curr.nilai || 0), 0);
    const avgScore = (totalScore / data.length).toFixed(1);
    
    let tuntas = 0;
    let remedial = 0;
    data.forEach(n => {
      const kkm = n.mapel?.kkm || 75;
      if ((n.nilai || 0) >= kkm) tuntas++;
      else remedial++;
    });

    return { totalRecords: data.length, avgScore, tuntasCount: tuntas, remedialCount: remedial };
  }, [data]);

  const handleMapelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, mapel_id: e.target.value }));
    setSelectedClasses([]);
    setScores({});
  };

  const selectedMapel = useMemo(() => {
    return options.mapel.find((m: any) => m.id === form.mapel_id);
  }, [options.mapel, form.mapel_id]);

  const handleScoreChange = (studentId: string, val: string) => {
    setScores(prev => ({ ...prev, [studentId]: val }));
  };

  const handleApplyBulkScore = () => {
    if (!bulkScore || isNaN(parseFloat(bulkScore))) return;
    const updated: Record<string, string> = {};
    studentsInSelectedClass.forEach((s: any) => { updated[s.id] = bulkScore; });
    setScores(updated);
  };

  const handleBatchSubmit = async (e: any) => {
    e.preventDefault();
    if (selectedClasses.length === 0 || !form.mapel_id || !form.ujian_id || !form.guru_id) {
      showNotification('Mohon lengkapi Tahun Ajaran, Bulan, Ujian, Mapel, minimal satu Kelas Target, dan Guru Pengampu', 'error');
      return;
    }

    const payloadList: any[] = [];
    for (const student of studentsInSelectedClass) {
      const rawVal = scores[student.id];
      if (rawVal !== undefined && rawVal !== '') {
        const numVal = parseFloat(rawVal);
        if (isNaN(numVal) || numVal < 0 || numVal > 100) {
          showNotification(`Nilai untuk siswa "${student.nama}" tidak valid (harus 0 - 100)`, 'error');
          return;
        }
        payloadList.push({
          tahun_ajaran: form.tahun_ajaran, 
          bulan: form.bulan, 
          ujian_id: form.ujian_id,
          mapel_id: form.mapel_id, 
          kelas: student.kelas, 
          guru_id: form.guru_id,
          siswa_id: student.id, 
          nilai: numVal,
          judul_materi: form.judul_materi.trim() || '-'
        });
      }
    }

    if (payloadList.length === 0) {
      showNotification('Belum ada nilai siswa yang diisi pada tabel', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('nilai').insert(payloadList);
      if (error) throw error;
      
      showNotification(`Berhasil merekam ${payloadList.length} nilai siswa dari ${selectedClasses.length} kelas!`, 'success');
      
      // RESET FORM KEMBALI KE KONDISI KOSONG
      setForm({
        tahun_ajaran: getCurrentAcademicYear(),
        bulan: getCurrentMonthName(),
        ujian_id: '',
        mapel_id: '',
        guru_id: isTeacherRole ? user.id : '',
        judul_materi: '',
      });
      setScores({});
      setSelectedClasses([]);
      setBulkScore('');

      fetchData();
      setActiveTab('dashboard');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan rekaman nilai', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClassTemplate = () => {
    if (selectedClasses.length === 0 || !form.mapel_id || !form.ujian_id || !form.guru_id) {
      showNotification('Pilih Jenis Asesmen, Mapel, minimal satu Kelas Target, dan Guru terlebih dahulu', 'error');
      return;
    }

    const selectedUjian = options.ujian.find((u: any) => u.id === form.ujian_id);
    const selectedGuru = options.guru.find((g: any) => g.id === form.guru_id);
    const headers = ['Tahun Ajaran', 'Bulan', 'Nama/Kode Ujian', 'Kode/Nama Mapel', 'Kelas', 'NIY/Nama Guru', 'NIS Siswa', 'Nama Siswa (Info)', 'Nilai (0-100)'];

    const sampleRows = studentsInSelectedClass.map((s: any) => [
      form.tahun_ajaran, form.bulan, selectedUjian?.nama_ujian || selectedUjian?.kode || '', 
      selectedMapel?.nama_mapel || selectedMapel?.kode || '', s.kelas, 
      selectedGuru?.nama || selectedGuru?.niy || '', s.nis, s.nama, ''
    ]);

    downloadExcelTemplate(`Template_Nilai_Gabungan_Kelas_${selectedClasses.join('_')}_${selectedMapel?.nama_mapel || 'Mapel'}.xlsx`, headers, sampleRows);
    showNotification(`Template Excel multi-kelas berhasil diunduh!`, 'success');
  };

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

  const validateNilaiRow = (row: string[]) => {
    const tahun_ajaran = row[0]?.trim() || getCurrentAcademicYear();
    const bulan = row[1]?.trim() || getCurrentMonthName();
    const examKeyword = row[2]?.trim().toLowerCase();
    const mapelKeyword = row[3]?.trim().toLowerCase();
    const kelas = row[4]?.trim().toUpperCase();
    const teacherKeyword = row[5]?.trim().toLowerCase();
    const studentNis = row[6]?.trim();
    
    let rawScore = parseFloat(row[8]?.trim());
    if (isNaN(rawScore)) rawScore = parseFloat(row[7]?.trim());

    if (isNaN(rawScore) || rawScore < 0 || rawScore > 100) return { valid: false, error: 'Skor nilai harus berupa angka antara 0 - 100' };

    const foundSiswa = options.siswa.find((s: any) => s.nis?.trim() === studentNis || (s.nama && s.nama.toLowerCase().includes(studentNis.toLowerCase())));
    if (!foundSiswa) return { valid: false, error: `Siswa dengan NIS "${studentNis}" tidak ditemukan` };

    const foundMapel = options.mapel.find((m: any) => m.kode?.toLowerCase() === mapelKeyword || m.nama_mapel?.toLowerCase() === mapelKeyword);
    if (!foundMapel) return { valid: false, error: `Mata pelajaran "${row[3]}" tidak ditemukan` };

    const foundUjian = options.ujian.find((u: any) => u.kode?.toLowerCase() === examKeyword || u.nama_ujian?.toLowerCase() === examKeyword);
    if (!foundUjian) return { valid: false, error: `Ujian "${row[2]}" tidak ditemukan` };

    const foundGuru = options.guru.find((g: any) => g.niy?.toLowerCase() === teacherKeyword || g.nama?.toLowerCase().includes(teacherKeyword));
    if (!foundGuru) return { valid: false, error: `Guru "${row[5]}" tidak ditemukan` };

    if (isTeacherRole && foundGuru.id !== user.id) return { valid: false, error: 'Anda hanya diizinkan mengimpor nilai untuk akun Anda sendiri' };

    return {
      valid: true,
      data: { tahun_ajaran, bulan, ujian_id: foundUjian.id, mapel_id: foundMapel.id, kelas: kelas || foundSiswa.kelas || 'Umum', guru_id: foundGuru.id, siswa_id: foundSiswa.id, nilai: rawScore }
    };
  };

  const handleImportNilai = async (rows: any[]) => {
    const { error } = await supabase.from('nilai').insert(rows);
    if (error) {
      showNotification(error.message || 'Gagal mengimpor nilai', 'error');
      return { successCount: 0, errorCount: rows.length };
    }
    showNotification(`Berhasil merekam ${rows.length} nilai peserta didik!`, 'success');
    fetchData();
    return { successCount: rows.length, errorCount: 0 };
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const nameMatch = (item.siswa?.nama || '').toLowerCase().includes(search.toLowerCase()) || (item.siswa?.nis || '').toLowerCase().includes(search.toLowerCase());
      const mapelMatch = filterMapel === 'ALL' || item.mapel_id === filterMapel;
      const kelasMatch = filterKelas === 'ALL' || (item.kelas || '').trim() === filterKelas.trim();
      const guruMatch = filterGuru === 'ALL' || item.guru_id === filterGuru;
      return nameMatch && mapelMatch && kelasMatch && guruMatch;
    });
  }, [data, search, filterMapel, filterKelas, filterGuru]);

  const groupedByMapelAndKelas = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredData.forEach((item: any) => {
      const key = `${item.mapel?.nama_mapel || 'Tanpa Mapel'} - Kelas ${item.kelas || 'Umum'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredData]);

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      showNotification('Tidak ada data nilai untuk diekspor', 'error');
      return;
    }
    const headers = ['Tahun Ajaran', 'Bulan', 'NIS', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Ujian', 'Guru Pengampu', 'Nilai', 'KKM', 'Status'];
    const rows = filteredData.map((d: any) => {
      const kkm = d.mapel?.kkm || 75;
      const status = d.nilai >= kkm ? 'Lulus' : 'Remedial';
      return [
        d.tahun_ajaran || '', d.bulan || '', d.siswa?.nis || '', d.siswa?.nama || '', d.kelas || '', d.mapel?.nama_mapel || '', d.ujian?.nama_ujian || '', d.guru?.nama || '', String(d.nilai), String(kkm), status
      ];
    });

    downloadExcelTemplate(`Rekap_Nilai_Akademik_${new Date().toISOString().slice(0, 10)}.xlsx`, headers, rows);
    showNotification('Berkas Excel rekap nilai berhasil diunduh!', 'success');
  };

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
          {activeTab === 'dashboard' ? (
            <button onClick={() => setActiveTab('form')} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer">
              <Icons.Plus /> Buka Form Input Nilai
            </button>
          ) : (
            <button onClick={() => setActiveTab('dashboard')} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm cursor-pointer">
              ← Kembali ke Dashboard
            </button>
          )}
          <button onClick={() => setIsImportOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shadow-sm cursor-pointer">
            <Icons.Upload /> Impor (Excel)
          </button>
          <button onClick={exportToExcel} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm cursor-pointer">
            <Icons.Download /> Ekspor
          </button>
          <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
            <Icons.Refresh /> Segarkan
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
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
      ) : (
        <NilaiBatchForm 
          form={form}
          setForm={setForm}
          handleMapelChange={handleMapelChange}
          filteredMapelOptions={filteredMapelOptions}
          options={options}
          isTeacherRole={isTeacherRole}
          availableClasses={availableClasses}
          studentsInSelectedClass={studentsInSelectedClass}
          selectedMapel={selectedMapel}
          bulkScore={bulkScore}
          setBulkScore={setBulkScore}
          handleApplyBulkScore={handleApplyBulkScore}
          handleDownloadClassTemplate={handleDownloadClassTemplate}
          scores={scores}
          handleScoreChange={handleScoreChange}
          setActiveTab={setActiveTab}
          handleBatchSubmit={handleBatchSubmit}
          loading={loading}
          selectedClasses={selectedClasses}
          handleClassCheckboxChange={handleClassCheckboxChange}
          handleSelectAllClasses={handleSelectAllClasses}
        />
      )}

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Impor Penilaian Siswa (Excel)"
        templateFileName="Template_Penilaian_Nilai.xlsx"
        templateHeaders={['Tahun Ajaran', 'Bulan', 'Nama/Kode Ujian', 'Kode/Nama Mapel', 'Kelas', 'NIY/Nama Guru', 'NIS Siswa', 'Nama Siswa (Info)', 'Nilai (0-100)']}
        templateSamples={[[getCurrentAcademicYear(), getCurrentMonthName(), options.ujian[0]?.nama_ujian || 'UTS-1', options.mapel[0]?.kode || 'BIO-01', 'X-E1', options.guru[0]?.niy || '1993080420220134', options.siswa[0]?.nis || '2024101', options.siswa[0]?.nama || 'Nama Siswa', '88']]}
        validatorAndMapper={validateNilaiRow}
        onImport={handleImportNilai}
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