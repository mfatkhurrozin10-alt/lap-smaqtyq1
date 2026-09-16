// src/views/DivisiTataUsahaView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckSquare, History, BarChart2, Settings, RefreshCw, Plus, Trash2, Edit, Printer, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DivisiTataUsahaView({ 
  showNotification, 
  initialTab = 'form', 
  initialTimeframe = 'Harian', 
  initialProgramId = '' 
}: any) {
  const [loading, setLoading] = useState(true);
  const [divisiData, setDivisiData] = useState<any>({
    nama_divisi: 'Tata Usaha',
    nama_koordinator: 'Tim Tata Usaha'
  });
  
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(initialProgramId);
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>(initialTab);
  
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  const [formInput, setFormInput] = useState({
    petugas_pj: '',
    guru_target: '',
    mapel_kelas: '',
    kelas_dipilih: '',
    jam_pembelajaran: '1-2',
    santri_absen: 'Nihil',
    catatan: ''
  });

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [selectedDetailLog, setSelectedDetailLog] = useState<any | null>(null);

  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [riwayatList, setRiwayatList] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const itemsPerPage = 10;

  // Konfigurasi Kolom, Label, Tipe Input, dan Pilihan Target Realisasi
  const [formConfig, setFormConfig] = useState<any>({
    show_petugas: true,
    show_guru: true,
    show_mapel: true,
    show_kelas: true,
    show_jam: true,
    show_santri_absen: true,
    label_petugas: 'Petugas (PJ)',
    label_guru: 'Guru / Pengajar',
    label_mapel: 'Mata Pelajaran',
    label_kelas: 'Kelas',
    label_jam: 'Jam Ke-',
    label_santri_absen: 'Keterangan / Absen',
    type_petugas: 'input',
    type_guru: 'input',
    type_mapel: 'input',
    type_kelas: 'input',
    type_jam: 'input',
    type_santri_absen: 'input',
    options_petugas: [],
    options_guru: [],
    options_mapel: [],
    options_kelas: [],
    options_jam: [],
    options_santri_absen: [],
    target_realisasi_type: 'percentage' 
  });

  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [tempType, setTempType] = useState('input');
  const [tempOptionsText, setTempOptionsText] = useState('');

  const [newKategoriNama, setNewKategoriNama] = useState('');
  const [newKategoriTipe, setNewKategoriTipe] = useState('Negatif (Dicentang jika bermasalah)');
  
  const [inputButirBaru, setInputButirBaru] = useState<{ [key: string]: string }>({});
  const [showInputButir, setShowInputButir] = useState<{ [key: string]: boolean }>({});

  const getScoreColorClass = (score: number) => {
    if (score > 66) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score > 33) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreTextColor = (score: number) => {
    if (score > 66) return 'text-emerald-600';
    if (score > 33) return 'text-amber-600';
    return 'text-rose-600';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: divList } = await supabase.from('divisi').select('*');
      const divisiObj = divList?.find((d: any) => d.nama_divisi?.toLowerCase().includes('tata usaha')) || divList?.[0];

      if (divisiObj) {
        setDivisiData(divisiObj);
        const { data: prog } = await supabase.from('program_kegiatan').select('*, indikator_iku(kode_iku, judul_iku)').eq('divisi_id', divisiObj.id);
        if (prog && prog.length > 0) {
          setProgramList(prog);
          
          if (!selectedProgramId) {
            const filteredByTime = prog.filter((p: any) => p.timeframe?.toLowerCase() === timeframe.toLowerCase());
            const targetProg = filteredByTime.length > 0 ? filteredByTime[0] : prog[0];
            setSelectedProgramId(targetProg.id);
          } else {
            const currentSelected = prog.find((p: any) => p.id === selectedProgramId);
            if (currentSelected && currentSelected.timeframe) {
              setTimeframe(currentSelected.timeframe);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

const fetchProgramDetail = async () => {
    if (!selectedProgramId) return;
    try {
      // Perbaikan: Gunakan .eq().then() atau ambil dengan [0] untuk menghindari error TypeScript pada .single()
      const { data: progList } = await supabase
        .from('program_kegiatan')
        .select('*')
        .eq('id', selectedProgramId);

      const progObj = progList && progList.length > 0 ? progList[0] : null;

      if (progObj) {
        setFormConfig((prev: any) => ({ 
          ...prev, 
          target_realisasi_type: progObj.target_realisasi_type || 'percentage' 
        }));
      }

      const { data: cfgList } = await supabase.from('divisi_form_config').select('*').eq('program_id', selectedProgramId);
      if (cfgList && cfgList.length > 0) {
        setFormConfig((prev: any) => ({ ...prev, ...cfgList[0] }));
      }

      const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', selectedProgramId).order('urutan');
      setKategoriList(kat || []);

      const { data: riw } = await supabase.from('divisi_log_pengawasan').select('*').eq('program_id', selectedProgramId).order('waktu_input', { ascending: false });
      setRiwayatList(riw || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProgramDetail();
  }, [selectedProgramId]);

  const calculateCurrentScore = () => {
    let totalButir = 0;
    let temuanAktif = 0;
    
    kategoriList.forEach(kat => {
      const isPositif = kat.tipe_kategori?.toLowerCase().includes('positif');
      
      kat.divisi_butir_ceklis?.forEach((butir: any) => {
        totalButir++;
        const isChecked = !!checkedItems[butir.id];
        
        if (isPositif) {
          if (!isChecked) temuanAktif++;
        } else {
          if (isChecked) temuanAktif++;
        }
      });
    });
    
    const skorPersen = totalButir > 0 ? Number(((1 - (temuanAktif / totalButir)) * 100).toFixed(1)) : 100;
    const skala = Number((skorPersen / 33.3).toFixed(2));
    return { skorPersen, skala };
  };

  const { skorPersen: currentSkorPersen, skala: currentSkala } = calculateCurrentScore();

  const handleSubmitCeklis = async (e: any) => {
    e.preventDefault();
    try {
      const payload = {
        program_id: selectedProgramId,
        waktu_input: new Date().toISOString(),
        petugas_pj: formInput.petugas_pj,
        guru_target: formInput.guru_target,
        mapel_kelas: `${formInput.mapel_kelas} (${formInput.kelas_dipilih})`,
        jam_pembelajaran: formInput.jam_pembelajaran,
        santri_absen: formInput.santri_absen,
        catatan_temuan: formInput.catatan,
        skor_persen: currentSkorPersen,
        detail_ceklis: checkedItems
      };

      if (editingLogId) {
        const { error } = await supabase.from('divisi_log_pengawasan').update(payload).eq('id', editingLogId);
        if (error) throw error;
        if (showNotification) showNotification('Laporan Tata Usaha berhasil diperbarui!', 'success');
        setEditingLogId(null);
      } else {
        const { error } = await supabase.from('divisi_log_pengawasan').insert([payload]);
        if (error) throw error;
        if (showNotification) showNotification('Laporan Tata Usaha baru berhasil disimpan!', 'success');
      }

      setCheckedItems({});
      setFormInput({ ...formInput, petugas_pj: '', guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
      fetchProgramDetail();
      setActiveSubTab('riwayat');
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleEditLog = (item: any) => {
    setEditingLogId(item.id);
    setFormInput({
      petugas_pj: item.petugas_pj || '',
      guru_target: item.guru_target || '',
      mapel_kelas: item.mapel_kelas ? item.mapel_kelas.split(' (')[0] : '',
      kelas_dipilih: item.mapel_kelas && item.mapel_kelas.includes('(') ? item.mapel_kelas.split('(')[1].replace(')', '') : '',
      jam_pembelajaran: item.jam_pembelajaran || '1-2',
      santri_absen: item.santri_absen || 'Nihil',
      catatan: item.catatan_temuan || ''
    });
    setCheckedItems(item.detail_ceklis || {});
    setActiveSubTab('form');
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data riwayat ini?')) return;
    try {
      const { error } = await supabase.from('divisi_log_pengawasan').delete().eq('id', logId);
      if (error) throw error;
      if (showNotification) showNotification('Riwayat berhasil dihapus', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleAddKategori = async (e: any) => {
    e.preventDefault();
    if (!newKategoriNama || !selectedProgramId) return;
    try {
      const { error } = await supabase.from('divisi_kategori_indikator').insert([{
        program_id: selectedProgramId,
        nama_kategori: newKategoriNama,
        tipe_kategori: newKategoriTipe
      }]);
      if (error) throw error;
      setNewKategoriNama('');
      if (showNotification) showNotification('Kategori baru ditambahkan', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleDeleteKategori = async (kategoriId: string) => {
    if (!window.confirm('Hapus kategori ini beserta seluruh butir indikator di dalamnya?')) return;
    try {
      await supabase.from('divisi_kategori_indikator').delete().eq('id', kategoriId);
      if (showNotification) showNotification('Kategori berhasil dihapus', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleAddButir = async (kategoriId: string) => {
    const namaButir = inputButirBaru[kategoriId];
    if (!namaButir) return;
    try {
      const { error } = await supabase.from('divisi_butir_ceklis').insert([{
        kategori_id: kategoriId,
        nama_butir: namaButir
      }]);
      if (error) throw error;
      setInputButirBaru({ ...inputButirBaru, [kategoriId]: '' });
      setShowInputButir({ ...showInputButir, [kategoriId]: false });
      if (showNotification) showNotification('Indikator ditambahkan', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleDeleteButir = async (butirId: string) => {
    try {
      await supabase.from('divisi_butir_ceklis').delete().eq('id', butirId);
      if (showNotification) showNotification('Indikator dihapus', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleToggleConfigField = async (field: string, value: boolean) => {
    const updated = { ...formConfig, [field]: value };
    setFormConfig(updated);
    if (!selectedProgramId) return;
    try {
      const { data: existing } = await supabase.from('divisi_form_config').select('id').eq('program_id', selectedProgramId);
      if (existing && existing.length > 0) {
        await supabase.from('divisi_form_config').update({ [field]: value }).eq('program_id', selectedProgramId);
      } else {
        await supabase.from('divisi_form_config').insert([{ program_id: selectedProgramId, [field]: value }]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Fungsi simpan target_realisasi_type langsung ke tabel program_kegiatan
  const handleUpdateTargetRealisasiType = async (newType: string) => {
    const updated = { ...formConfig, target_realisasi_type: newType };
    setFormConfig(updated);
    if (!selectedProgramId) return;

    try {
      const { error } = await supabase
        .from('program_kegiatan')
        .update({ target_realisasi_type: newType })
        .eq('id', selectedProgramId);

      if (error) throw error;
      if (showNotification) showNotification('Bentuk target realisasi berhasil disimpan permanen!', 'success');
      fetchData();
    } catch (err: any) {
      console.error("Gagal menyimpan:", err);
      if (showNotification) showNotification(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const handleSaveColumnCustomize = async (columnKey: string) => {
    const mapConfig: any = {
      show_petugas: { label: 'label_petugas', type: 'type_petugas', opts: 'options_petugas' },
      show_guru: { label: 'label_guru', type: 'type_guru', opts: 'options_guru' },
      show_mapel: { label: 'label_mapel', type: 'type_mapel', opts: 'options_mapel' },
      show_kelas: { label: 'label_kelas', type: 'type_kelas', opts: 'options_kelas' },
      show_jam: { label: 'label_jam', type: 'type_jam', opts: 'options_jam' },
      show_santri_absen: { label: 'label_santri_absen', type: 'type_santri_absen', opts: 'options_santri_absen' },
    };

    const targetMap = mapConfig[columnKey];
    if (!targetMap || !selectedProgramId) return;

    const optionsArray = tempOptionsText.split(',').map(s => s.trim()).filter(Boolean);

    const updatedConfig = { 
      ...formConfig, 
      [targetMap.label]: tempLabel, 
      [targetMap.type]: tempType,
      [targetMap.opts]: optionsArray
    };
    setFormConfig(updatedConfig);

    try {
      const { data: existing } = await supabase.from('divisi_form_config').select('id').eq('program_id', selectedProgramId);
      if (existing && existing.length > 0) {
        await supabase.from('divisi_form_config').update({ 
          [targetMap.label]: tempLabel, 
          [targetMap.type]: tempType,
          [targetMap.opts]: optionsArray
        }).eq('program_id', selectedProgramId);
      } else {
        await supabase.from('divisi_form_config').insert([{ 
          program_id: selectedProgramId, 
          [targetMap.label]: tempLabel, 
          [targetMap.type]: tempType,
          [targetMap.opts]: optionsArray
        }]);
      }
      if (showNotification) showNotification('Pengaturan kolom berhasil diperbarui!', 'success');
      setEditingColumnKey(null);
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleSelectAllConfig = async (status: boolean) => {
    const updated = {
      ...formConfig,
      show_petugas: status,
      show_guru: status,
      show_mapel: status,
      show_kelas: status,
      show_jam: status,
      show_santri_absen: status
    };
    setFormConfig(updated);
    if (!selectedProgramId) return;
    try {
      const { data: existing } = await supabase.from('divisi_form_config').select('id').eq('program_id', selectedProgramId);
      if (existing && existing.length > 0) {
        await supabase.from('divisi_form_config').update(updated).eq('program_id', selectedProgramId);
      } else {
        await supabase.from('divisi_form_config').insert([{ program_id: selectedProgramId, ...updated }]);
      }
      if (showNotification) showNotification(status ? 'Semua kolom ditampilkan' : 'Semua kolom dikosongkan', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Tata Usaha...</div>;
  }

  const filteredProgramsByTime = programList.filter((p: any) => !p.timeframe || p.timeframe.toLowerCase() === timeframe.toLowerCase());
  const selectedProgramObj = programList.find((p: any) => p.id === selectedProgramId);

  const filteredRiwayatByMonth = riwayatList.filter((item: any) => {
    if (selectedMonthFilter === 'all') return true;
    const itemMonth = new Date(item.waktu_input).toISOString().slice(0, 7);
    return itemMonth === selectedMonthFilter;
  });

  const totalPages = Math.ceil(filteredRiwayatByMonth.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRiwayatPageData = filteredRiwayatByMonth.slice(startIndex, startIndex + itemsPerPage);

  const averageRealisasi = riwayatList.length > 0 ? (riwayatList.reduce((acc: number, curr: any) => acc + Number(curr.skor_persen), 0) / riwayatList.length) : 0;

  const renderDynamicInput = (
    showKey: string, 
    labelKey: string, 
    typeKey: string, 
    optsKey: string, 
    valueState: string, 
    onChangeVal: (val: string) => void
  ) => {
    if (!formConfig[showKey]) return null;

    const label = formConfig[labelKey];
    const inputType = formConfig[typeKey] || 'input';
    const optionsList = formConfig[optsKey] || [];

    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}:</label>
        {inputType === 'dropdown' && optionsList.length > 0 ? (
          <select 
            value={valueState} 
            onChange={e => onChangeVal(e.target.value)} 
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer" 
            required
          >
            <option value="">-- Pilih {label} --</option>
            {optionsList.map((opt: string, idx: number) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input 
            type="text" 
            value={valueState} 
            onChange={e => onChangeVal(e.target.value)} 
            placeholder={`Masukkan ${label}`} 
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium text-slate-800 placeholder:text-slate-400" 
            required 
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Divisi {divisiData?.nama_divisi || 'Tata Usaha'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator || 'Tim Kurikulum'}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Harian', 'Mingguan', 'Bulanan', 'Semesteran', 'Tahunan'].map(tf => (
              <button
                key={tf}
                onClick={() => { setTimeframe(tf); setSelectedProgramId(''); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tf}
              </button>
            ))}
          </div>

          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none shadow-sm cursor-pointer"
          >
            {filteredProgramsByTime.length === 0 ? (
              <option value="">Tidak ada program {timeframe}</option>
            ) : (
              filteredProgramsByTime.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nama_program} ({riwayatList.length} data)</option>
              ))
            )}
          </select>
          
          <button onClick={fetchData} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Refresh Data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'form' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          <CheckSquare size={16} /> Form Ceklis
        </button>
        <button
          onClick={() => setActiveSubTab('riwayat')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'riwayat' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          <History size={16} /> Riwayat ({riwayatList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('realisasi')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'realisasi' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          <BarChart2 size={16} /> Hasil Realisasi
        </button>
        <button
          onClick={() => setActiveSubTab('customize')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'customize' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          <Settings size={16} /> Customize Form
        </button>

        {selectedProgramObj?.indikator_iku && (
          <div className="ml-auto px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm truncate max-w-md">
            <span className="text-blue-600 mr-1">{selectedProgramObj.indikator_iku.kode_iku}:</span> 
            {selectedProgramObj.indikator_iku.judul_iku}
          </div>
        )}
      </div>

      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmitCeklis} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-600" /> Informasi Pengawasan & Sasaran Terkait
              </h3>
              {editingLogId && (
                <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-bold border border-amber-200">
                  Mode Edit Data
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderDynamicInput('show_petugas', 'label_petugas', 'type_petugas', 'options_petugas', formInput.petugas_pj, (val) => setFormInput({...formInput, petugas_pj: val}))}
              {renderDynamicInput('show_guru', 'label_guru', 'type_guru', 'options_guru', formInput.guru_target, (val) => setFormInput({...formInput, guru_target: val}))}
              {renderDynamicInput('show_mapel', 'label_mapel', 'type_mapel', 'options_mapel', formInput.mapel_kelas, (val) => setFormInput({...formInput, mapel_kelas: val}))}
              {renderDynamicInput('show_kelas', 'label_kelas', 'type_kelas', 'options_kelas', formInput.kelas_dipilih, (val) => setFormInput({...formInput, kelas_dipilih: val}))}
              {renderDynamicInput('show_jam', 'label_jam', 'type_jam', 'options_jam', formInput.jam_pembelajaran, (val) => setFormInput({...formInput, jam_pembelajaran: val}))}
              {renderDynamicInput('show_santri_absen', 'label_santri_absen', 'type_santri_absen', 'options_santri_absen', formInput.santri_absen, (val) => setFormInput({...formInput, santri_absen: val}))}
            </div>
          </div>

          <div className="space-y-4">
            {kategoriList.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                Belum ada butir ceklis untuk program ini. Atur melalui menu <span className="font-bold text-slate-600">Customize Form</span>.
              </div>
            ) : (
              kategoriList.map((kat: any) => (
                <div key={kat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      {kat.nama_kategori} <span className="text-xs text-slate-400 font-normal">({kat.divisi_butir_ceklis?.length || 0} Indikator)</span>
                    </h4>
                    <span className="text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">{kat.tipe_kategori}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kat.divisi_butir_ceklis?.map((butir: any) => (
                      <label key={butir.id} className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={!!checkedItems[butir.id]} 
                          onChange={e => setCheckedItems({...checkedItems, [butir.id]: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                        />
                        <span className="text-sm font-medium text-slate-700">{butir.nama_butir}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan / Temuan Khusus:</label>
              <textarea 
                value={formInput.catatan} 
                onChange={e => setFormInput({...formInput, catatan: e.target.value})} 
                placeholder="Tuliskan catatan tambahan jika ada..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none font-medium text-slate-800"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Skor Terkalkulasi:</span>
                <div className={`px-4 py-1.5 border rounded-xl font-black text-sm shadow-2xs ${getScoreColorClass(currentSkorPersen)}`}>
                  {currentSkorPersen}% ({currentSkala} / 3.0)
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {editingLogId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingLogId(null); setFormInput({ petugas_pj: '', guru_target: '', mapel_kelas: '', kelas_dipilih: '', jam_pembelajaran: '1-2', santri_absen: 'Nihil', catatan: '' }); setCheckedItems({}); }}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                  >
                    Batal Edit
                  </button>
                )}
                <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                  {editingLogId ? 'Simpan Perubahan Data' : 'Simpan Laporan Ceklis'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">LOG RIWAYAT PENGAWASAN ({filteredRiwayatByMonth.length} DATA)</h3>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Bulan:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => { setSelectedMonthFilter(e.target.value); setCurrentPage(1); }}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Semua Bulan</option>
                  {Array.from(new Set(riwayatList.map(item => new Date(item.waktu_input).toISOString().slice(0, 7)))).map((monthStr: any) => {
                    const [y, m] = monthStr.split('-');
                    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                    const label = `${monthNames[parseInt(m) - 1]} ${y}`;
                    return (
                      <option key={monthStr} value={monthStr}>{label}</option>
                    );
                  })}
                </select>
              </div>

              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Waktu</th>
                  {/* Header dinamis berdasarkan label dan status show di formConfig */}
                  {formConfig.show_petugas && <th className="px-6 py-4">{formConfig.label_petugas || 'Petugas (PJ)'}</th>}
                  {formConfig.show_guru && <th className="px-6 py-4">{formConfig.label_guru || 'Guru / Pengajar'}</th>}
                  {formConfig.show_mapel && <th className="px-6 py-4">{formConfig.label_mapel || 'Mata Pelajaran'}</th>}
                  {formConfig.show_kelas && <th className="px-6 py-4">{formConfig.label_kelas || 'Kelas'}</th>}
                  {formConfig.show_jam && <th className="px-6 py-4">{formConfig.label_jam || 'Jam Ke-'}</th>}
                  {formConfig.show_santri_absen && <th className="px-6 py-4">{formConfig.label_santri_absen || 'Keterangan / Absen'}</th>}
                  <th className="px-6 py-4">Skor</th>
                  <th className="px-6 py-4">Catatan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRiwayatPageData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-slate-400">Belum ada log riwayat pengawasan pada filter ini.</td>
                  </tr>
                ) : (
                  currentRiwayatPageData.map((item: any, idx: number) => {
                    const absoluteIndex = startIndex + idx + 1;
                    const skorVal = Number(item.skor_persen);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-400">{absoluteIndex}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                        
                        {/* Data baris yang ikut tersembunyi/tampil sesuai pengaturan formConfig */}
                        {formConfig.show_petugas && <td className="px-6 py-4 font-semibold text-slate-800 max-w-xs truncate">{item.petugas_pj || '-'}</td>}
                        {formConfig.show_guru && <td className="px-6 py-4 text-slate-700 font-medium">{item.guru_target || '-'}</td>}
                        {formConfig.show_mapel && <td className="px-6 py-4 text-slate-600">{item.mapel_kelas ? item.mapel_kelas.split(' (')[0] : '-'}</td>}
                        {formConfig.show_kelas && <td className="px-6 py-4 text-slate-600">{item.mapel_kelas && item.mapel_kelas.includes('(') ? item.mapel_kelas.split('(')[1].replace(')', '') : '-'}</td>}
                        {formConfig.show_jam && <td className="px-6 py-4 text-slate-600">{item.jam_pembelajaran || '-'}</td>}
                        {formConfig.show_santri_absen && <td className="px-6 py-4 text-slate-600">{item.santri_absen || 'Nihil'}</td>}
                        
                        <td className={`px-6 py-4 font-black ${getScoreTextColor(skorVal)}`}>
                          {skorVal}%
                        </td>
                        <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{item.catatan_temuan || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button 
                              onClick={() => setSelectedDetailLog(item)} 
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye size={13} /> Detail
                            </button>
                            <button 
                              onClick={() => handleEditLog(item)} 
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" 
                              title="Edit Data"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLog(item.id)} 
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" 
                              title="Hapus Data"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredRiwayatByMonth.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <p>Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredRiwayatByMonth.length)} dari {filteredRiwayatByMonth.length} data</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold px-3 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  Hal {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedDetailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 relative animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Eye size={20} className="text-blue-600" /> Detail Hasil Pengawasan Tata Usaha
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Program: <span className="font-semibold text-slate-700">{selectedProgramObj?.nama_program}</span> • ID #{selectedDetailLog.id.slice(-4)}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailLog(null)} 
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKOR KEPATUHAN</p>
                <h4 className={`text-2xl font-black ${getScoreTextColor(Number(selectedDetailLog.skor_persen))}`}>
                  {selectedDetailLog.skor_persen}%
                </h4>
                <p className="text-[11px] text-slate-500">Skala: {(selectedDetailLog.skor_persen / 33.3).toFixed(2)} / 3.0</p>
              </div>
              {formConfig.show_mapel && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formConfig.label_mapel.toUpperCase()}</p>
                  <h4 className="text-xs font-bold text-slate-800 break-words">{selectedDetailLog.mapel_kelas ? selectedDetailLog.mapel_kelas.split(' (')[0] : '-'}</h4>
                </div>
              )}
              {formConfig.show_kelas && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formConfig.label_kelas.toUpperCase()}</p>
                  <h4 className="text-xs font-bold text-slate-800 break-words">{selectedDetailLog.mapel_kelas && selectedDetailLog.mapel_kelas.includes('(') ? selectedDetailLog.mapel_kelas.split('(')[1].replace(')', '') : '-'}</h4>
                </div>
              )}
              {formConfig.show_guru && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formConfig.label_guru.toUpperCase()}</p>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug break-words">{selectedDetailLog.guru_target || '-'}</h4>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 gap-2">
              {formConfig.show_petugas && <p>{formConfig.label_petugas}: <span className="font-semibold text-slate-700">{selectedDetailLog.petugas_pj}</span></p>}
              {formConfig.show_jam && <p>{formConfig.label_jam}: <span className="font-semibold text-slate-700">{selectedDetailLog.jam_pembelajaran}</span></p>}
              <p>Waktu Input: <span className="font-semibold text-slate-700">{new Date(selectedDetailLog.waktu_input).toLocaleString('id-ID')}</span></p>
            </div>

            <div className="space-y-2">
              {(() => {
                let daftarMasalah: any[] = [];
                if (selectedDetailLog.detail_ceklis) {
                  kategoriList.forEach((kat: any) => {
                    const isPositif = kat.tipe_kategori?.toLowerCase().includes('positif');
                    kat.divisi_butir_ceklis?.forEach((b: any) => {
                      const isChecked = !!selectedDetailLog.detail_ceklis[b.id];
                      
                      if (isPositif && !isChecked) {
                        daftarMasalah.push({ nama: b.nama_butir, label: 'Belum Tercapai' });
                      } else if (!isPositif && isChecked) {
                        daftarMasalah.push({ nama: b.nama_butir, label: 'Temuan Masalah' });
                      }
                    });
                  });
                }

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">RINCIAN MASALAH / BELUM TERCAPAI</h4>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                        {daftarMasalah.length} Temuan
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto">
                      {daftarMasalah.length > 0 ? (
                        daftarMasalah.map((item, i) => (
                          <div key={i} className="flex flex-col justify-center p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs font-medium text-rose-900">
                            <div className="flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                               <span className="truncate font-bold">{item.nama}</span>
                            </div>
                            <span className="text-[10px] text-rose-500 ml-4 font-normal tracking-wide">{item.label}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2 col-span-2">Semua indikator sesuai standar (100% Tercapai / Bersih).</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">CATATAN TAMBAHAN & EVALUASI PENGAWAS</h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                {selectedDetailLog.catatan_temuan || 'Tidak ada catatan khusus yang ditambahkan.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedDetailLog(null)} 
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'realisasi' && (
        <div className="space-y-6">
          {formConfig.target_realisasi_type === 'count' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Tipe Target Realisasi</p>
                  <h3 className="text-2xl font-black text-blue-600">Count (Hitungan Frekuensi)</h3>
                  <p className="text-xs text-slate-500">Dihitung berdasarkan jumlah pengisian formulir</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Keseluruhan (Count)</p>
                  <h3 className="text-3xl font-black text-slate-900">
                    {riwayatList.length} <span className="text-sm font-normal text-slate-500">Kali</span>
                  </h3>
                  <p className="text-xs text-slate-500">Akumulasi total log laporan masuk</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <h3 className="font-bold text-slate-800">Rekapitulasi Hitungan (Count) Pengisian Form Per Bulan</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Bulan & Tahun</th>
                        <th className="px-6 py-3">Jumlah Pengisian (Count)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const groupedByMonth: { [key: string]: any[] } = {};
                        riwayatList.forEach((item: any) => {
                          const monthKey = new Date(item.waktu_input).toISOString().slice(0, 7);
                          if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
                          groupedByMonth[monthKey].push(item);
                        });

                        const monthKeys = Object.keys(groupedByMonth).sort().reverse();
                        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

                        if (monthKeys.length === 0) {
                          return (
                            <tr>
                              <td colSpan={2} className="text-center py-8 text-slate-400">Belum ada data rekam jejak pengisian.</td>
                            </tr>
                          );
                        }

                        return monthKeys.map((mKey) => {
                          const [y, m] = mKey.split('-');
                          const labelBulan = `${monthNames[parseInt(m) - 1]} ${y}`;
                          const countPengisian = groupedByMonth[mKey].length;

                          return (
                            <tr key={mKey} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800">{labelBulan}</td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-100">
                                  {countPengisian} Kali
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Tipe Target Realisasi</p>
                  <h3 className="text-2xl font-black text-slate-900">Persentase (%)</h3>
                  <p className="text-xs text-slate-500">Berdasarkan skor kepatuhan ceklis</p>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Rata-rata Realisasi Skor</p>
                  <h3 className={`text-3xl font-black ${getScoreTextColor(averageRealisasi)}`}>
                    {averageRealisasi.toFixed(1)}%
                  </h3>
                  <p className="text-xs text-slate-500">Rata-rata kepatuhan keseluruhan</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total Keterisian Data</p>
                  <h3 className="text-3xl font-black text-blue-600">{riwayatList.length} Laporan</h3>
                  <p className="text-xs text-slate-500">Total formulir berhasil diinput</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <h3 className="font-bold text-slate-800">Rekapitulasi Persentase Skor Per Bulan</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Bulan & Tahun</th>
                        <th className="px-6 py-3">Jumlah Laporan</th>
                        <th className="px-6 py-3">Rata-rata Skor (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const groupedByMonth: { [key: string]: any[] } = {};
                        riwayatList.forEach((item: any) => {
                          const monthKey = new Date(item.waktu_input).toISOString().slice(0, 7);
                          if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
                          groupedByMonth[monthKey].push(item);
                        });

                        const monthKeys = Object.keys(groupedByMonth).sort().reverse();
                        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

                        if (monthKeys.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="text-center py-8 text-slate-400">Belum ada data rekam jejak pengisian.</td>
                            </tr>
                          );
                        }

                        return monthKeys.map((mKey) => {
                          const [y, m] = mKey.split('-');
                          const labelBulan = `${monthNames[parseInt(m) - 1]} ${y}`;
                          const logsInMonth = groupedByMonth[mKey];
                          const avgSkorBulan = logsInMonth.reduce((acc, curr) => acc + Number(curr.skor_persen || 0), 0) / logsInMonth.length;

                          return (
                            <tr key={mKey} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800">{labelBulan}</td>
                              <td className="px-6 py-4 text-slate-600 font-semibold">{logsInMonth.length} Laporan</td>
                              <td className={`px-6 py-4 font-black ${getScoreTextColor(avgSkorBulan)}`}>
                                {avgSkorBulan.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'customize' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-600" /> PENGATURAN BENTUK TARGET REALISASI
            </h3>
            <p className="text-xs text-slate-500">Pilih apakah hasil akhir target realisasi pada program ini ditampilkan dalam bentuk Persentase (%) atau Count (Hitungan Frekuensi Pengisian).</p>
            
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Bentuk Target Realisasi:</label>
              <select 
                value={formConfig.target_realisasi_type || 'percentage'}
                onChange={(e) => handleUpdateTargetRealisasiType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="count">Count (Hitungan Berapa Kali Diisi)</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" /> PENGATURAN KOLOM, LABEL, & TIPE INPUTAN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Centang modul yang ingin ditampilkan, atau klik ikon pensil untuk mengubah judul, tipe inputan, serta opsi pilihannya.</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <button type="button" onClick={() => handleSelectAllConfig(true)} className="text-blue-600 hover:underline">Centang Semua</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => handleSelectAllConfig(false)} className="text-slate-500 hover:underline">Kosongkan Semua</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {[
                { key: 'show_petugas', defaultLabel: 'Petugas (PJ)', labelKey: 'label_petugas', typeKey: 'type_petugas', optsKey: 'options_petugas' },
                { key: 'show_guru', defaultLabel: 'Guru / Pengajar', labelKey: 'label_guru', typeKey: 'type_guru', optsKey: 'options_guru' },
                { key: 'show_mapel', defaultLabel: 'Mata Pelajaran', labelKey: 'label_mapel', typeKey: 'type_mapel', optsKey: 'options_mapel' },
                { key: 'show_kelas', defaultLabel: 'Kelas', labelKey: 'label_kelas', typeKey: 'type_kelas', optsKey: 'options_kelas' },
                { key: 'show_jam', defaultLabel: 'Jam Ke-', labelKey: 'label_jam', typeKey: 'type_jam', optsKey: 'options_jam' },
                { key: 'show_santri_absen', defaultLabel: 'Keterangan / Absen', labelKey: 'label_santri_absen', typeKey: 'type_santri_absen', optsKey: 'options_santri_absen' },
              ].map((item) => {
                const currentLabel = formConfig[item.labelKey] || item.defaultLabel;
                const isChecked = formConfig[item.key];
                const inputType = formConfig[item.typeKey] || 'input';

                return (
                  <div key={item.key} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isChecked ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={e => handleToggleConfigField(item.key, e.target.checked)} 
                        className="w-4 h-4 text-blue-600 rounded shrink-0" 
                      />
                      <div className="truncate">
                        <span className="text-sm font-medium block truncate">{currentLabel}</span>
                        <span className="text-[10px] text-slate-400 capitalize">Tipe: {inputType === 'dropdown' ? 'Dropdown Pilihan' : 'Teks Singkat'}</span>
                      </div>
                    </label>
                    
                    <button 
                      type="button"
                      onClick={() => { 
                        setEditingColumnKey(item.key); 
                        setTempLabel(currentLabel); 
                        setTempType(inputType);
                        setTempOptionsText((formConfig[item.optsKey] || []).join(', '));
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors shrink-0 ml-2"
                      title="Edit Kolom"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {editingColumnKey && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
                <h3 className="text-base font-bold text-slate-800">Edit Konfigurasi Kolom Form</h3>
                <p className="text-xs text-slate-500">Sesuaikan nama label, jenis inputan (Dropdown / Teks Singkat), serta daftar opsi pilihannya.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Judul / Label Kolom:</label>
                    <input 
                      type="text"
                      value={tempLabel}
                      onChange={e => setTempLabel(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Inputan:</label>
                    <select 
                      value={tempType} 
                      onChange={e => setTempType(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="dropdown">Dropdown (Pilihan Menu)</option>
                      <option value="input">Teks Singkat (Input Bebas)</option>
                    </select>
                  </div>

                  {tempType === 'dropdown' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Opsi Dropdown (Pisahkan dengan koma):</label>
                      <textarea 
                        value={tempOptionsText}
                        onChange={e => setTempOptionsText(e.target.value)}
                        placeholder="Contoh: Opsi 1, Opsi 2, Opsi 3"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none h-20 resize-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Ketik pilihan opsi dipisahkan tanda koma (`, `).</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingColumnKey(null)} 
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSaveColumnCustomize(editingColumnKey)} 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800">Pengaturan Kategori & Indikator</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sesuaikan butir ceklis untuk program <span className="font-semibold text-slate-700">"{selectedProgramObj?.nama_program}"</span></p>
            </div>
            
            <form onSubmit={handleAddKategori} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input 
                type="text" 
                placeholder="Nama Kategori Baru..." 
                value={newKategoriNama} 
                onChange={e => setNewKategoriNama(e.target.value)} 
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium"
                required
              />
              <select value={newKategoriTipe} onChange={e => setNewKategoriTipe(e.target.value)} className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer">
                <option value="Negatif (Dicentang jika bermasalah)">Negatif (Dicentang jika bermasalah)</option>
                <option value="Positif (Dicentang jika tercapai)">Positif (Dicentang jika tercapai)</option>
              </select>
              <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                <Plus size={16} /> Tambah Kategori
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {kategoriList.map((kat: any) => (
              <div key={kat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    {kat.nama_kategori} <span className="text-xs text-slate-400 font-normal">({kat.divisi_butir_ceklis?.length || 0} Indikator)</span>
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">{kat.tipe_kategori}</span>
                    <button type="button" onClick={() => handleDeleteKategori(kat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Hapus Kategori">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {kat.divisi_butir_ceklis?.map((butir: any) => (
                    <div key={butir.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-2xs">
                      <span className="text-sm font-medium text-slate-700">{butir.nama_butir}</span>
                      <button onClick={() => handleDeleteButir(butir.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Indikator">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {showInputButir[kat.id] ? (
                  <div className="flex gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Ketik butir indikator baru..." 
                      value={inputButirBaru[kat.id] || ''} 
                      onChange={e => setInputButirBaru({...inputButirBaru, [kat.id]: e.target.value})}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium"
                      autoFocus
                    />
                    <button onClick={() => handleAddButir(kat.id)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm">
                      Simpan
                    </button>
                    <button onClick={() => setShowInputButir({...showInputButir, [kat.id]: false})} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl">
                      Batal
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setShowInputButir({...showInputButir, [kat.id]: true})}
                    className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/10 text-slate-500 hover:text-blue-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Plus size={14} /> Tambah Indikator Baru
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}