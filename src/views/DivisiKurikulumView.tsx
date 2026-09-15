// src/views/DivisiKurikulumView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckSquare, History, BarChart2, Settings, RefreshCw, Plus, Trash2, Edit, Printer, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DivisiKurikulumView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiData, setDivisiData] = useState<any>({
    nama_divisi: 'Kurikulum',
    nama_koordinator: 'Ummi Mukhoyyaroh, M.Pd.'
  });
  
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  
  const [timeframe, setTimeframe] = useState('Harian');

  const [guruList, setGuruList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);

  const [formInput, setFormInput] = useState({
    petugas_pj: 'Ustadz / Ustadzah Pemantau',
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
  
  // State Paginasi & Filter Bulan Riwayat
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');
  const itemsPerPage = 10;

  const [formConfig, setFormConfig] = useState<any>({
    show_petugas: true,
    show_guru: true,
    show_mapel: true,
    show_kelas: true,
    show_jam: true,
    show_santri_absen: true
  });

  const [newKategoriNama, setNewKategoriNama] = useState('');
  const [newKategoriTipe, setNewKategoriTipe] = useState('Negatif (Dicentang jika bermasalah)');
  
  const [inputButirBaru, setInputButirBaru] = useState<{ [key: string]: string }>({});
  const [showInputButir, setShowInputButir] = useState<{ [key: string]: boolean }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: divList } = await supabase.from('divisi').select('*');
      const kurikulumDiv = divList?.find((d: any) => d.nama_divisi?.toLowerCase().includes('kurikulum')) || divList?.[0];

      if (kurikulumDiv) {
        setDivisiData(kurikulumDiv);
        const { data: prog } = await supabase.from('program_kegiatan').select('*, indikator_iku(kode_iku, judul_iku)').eq('divisi_id', kurikulumDiv.id);
        if (prog && prog.length > 0) {
          setProgramList(prog);
          const filteredByTime = prog.filter((p: any) => p.timeframe?.toLowerCase() === timeframe.toLowerCase());
          const targetProg = filteredByTime.length > 0 ? filteredByTime[0] : prog[0];
          setSelectedProgramId(targetProg.id);
        }
      }

      const { data: dbGuru } = await supabase.from('guru').select('id, nama');
      if (dbGuru && dbGuru.length > 0) setGuruList(dbGuru);

      const { data: dbMapel } = await supabase.from('mapel').select('id, nama_mapel, kode');
      if (dbMapel && dbMapel.length > 0) setMapelList(dbMapel);

      const { data: dbKelas } = await supabase.from('guru_mapel').select('kelas');
      if (dbKelas && dbKelas.length > 0) {
        const uniqueKelas = Array.from(new Set(dbKelas.map((k: any) => k.kelas))).filter(Boolean);
        setKelasList(uniqueKelas);
      } else {
        setKelasList(['Kelas 7-A', 'Kelas 7-B', 'Kelas 8-A', 'Kelas 8-B', 'Kelas 9-A', 'Kelas 9-B']);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const fetchProgramDetail = async () => {
    if (!selectedProgramId) return;
    try {
      const { data: cfgList } = await supabase.from('divisi_form_config').select('*').eq('program_id', selectedProgramId);
      if (cfgList && cfgList.length > 0) {
        setFormConfig(cfgList[0]);
      }

      const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', selectedProgramId).order('urutan');
      setKategoriList(kat || []);

      const { data: riw } = await supabase.from('divisi_log_pengawasan').select('*').eq('program_id', selectedProgramId).order('waktu_input', { ascending: false });
      setRiwayatList(riw || []);
      setCurrentPage(1); // Reset ke halaman 1 saat program berubah
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProgramDetail();
  }, [selectedProgramId]);

  // Kalkulasi Skor Real-Time untuk Form
  const calculateCurrentScore = () => {
    let totalButir = 0;
    let temuanAktif = 0;
    kategoriList.forEach(kat => {
      kat.divisi_butir_ceklis?.forEach((butir: any) => {
        totalButir++;
        if (checkedItems[butir.id]) temuanAktif++;
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
        if (showNotification) showNotification('Laporan berhasil diperbarui!', 'success');
        setEditingLogId(null);
      } else {
        const { error } = await supabase.from('divisi_log_pengawasan').insert([payload]);
        if (error) throw error;
        if (showNotification) showNotification('Laporan baru berhasil disimpan!', 'success');
      }

      setCheckedItems({});
      setFormInput({ ...formInput, guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
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

  const handleSelectAllConfig = async (status: boolean) => {
    const updated = {
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
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Kurikulum...</div>;
  }

  const filteredProgramsByTime = programList.filter((p: any) => !p.timeframe || p.timeframe.toLowerCase() === timeframe.toLowerCase());
  const selectedProgramObj = programList.find((p: any) => p.id === selectedProgramId);

  // Filter riwayat berdasarkan bulan
  const filteredRiwayatByMonth = riwayatList.filter((item: any) => {
    if (selectedMonthFilter === 'all') return true;
    const itemMonth = new Date(item.waktu_input).toISOString().slice(0, 7); // Format "YYYY-MM"
    return itemMonth === selectedMonthFilter;
  });

  // Paginasi Data (10 data per halaman)
  const totalPages = Math.ceil(filteredRiwayatByMonth.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRiwayatPageData = filteredRiwayatByMonth.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      
      {/* HEADER DIVISI & FILTER TIMEFRAME */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Divisi {divisiData?.nama_divisi || 'Kurikulum'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator || 'Ummi Mukhoyyaroh, M.Pd.'}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
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

      {/* SUB-MENU TAB & INDIKATOR IKU */}
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

      {/* TAB 1: FORM CEKLIS */}
      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmitCeklis} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-600" /> Informasi Pengawasan & Guru Terkait
              </h3>
              {editingLogId && (
                <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-bold border border-amber-200">
                  Mode Edit Data
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formConfig.show_petugas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ustadz / Petugas Pemantau (PJ):</label>
                  <input type="text" value={formInput.petugas_pj} onChange={e => setFormInput({...formInput, petugas_pj: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium text-slate-800" required />
                </div>
              )}

              {formConfig.show_guru && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ustadz / Guru Pengampu:</label>
                  <select 
                    value={formInput.guru_target} 
                    onChange={e => setFormInput({...formInput, guru_target: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer" 
                    required
                  >
                    <option value="">-- Pilih Ustadz / Guru --</option>
                    {guruList.map((g: any) => (
                      <option key={g.id} value={g.nama}>{g.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {formConfig.show_mapel && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran:</label>
                  <select 
                    value={formInput.mapel_kelas} 
                    onChange={e => setFormInput({...formInput, mapel_kelas: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {mapelList.map((m: any) => (
                      <option key={m.id} value={m.nama_mapel}>{m.nama_mapel} ({m.kode})</option>
                    ))}
                  </select>
                </div>
              )}

              {formConfig.show_kelas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas:</label>
                  <select 
                    value={formInput.kelas_dipilih} 
                    onChange={e => setFormInput({...formInput, kelas_dipilih: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {kelasList.map((kls: string, idx: number) => (
                      <option key={idx} value={kls}>{kls}</option>
                    ))}
                  </select>
                </div>
              )}

              {formConfig.show_jam && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam Pembelajaran:</label>
                  <input type="text" value={formInput.jam_pembelajaran} onChange={e => setFormInput({...formInput, jam_pembelajaran: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium text-slate-800" />
                </div>
              )}

              {formConfig.show_santri_absen && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Santri Tidak Hadir:</label>
                  <input type="text" value={formInput.santri_absen} onChange={e => setFormInput({...formInput, santri_absen: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium text-slate-800" />
                </div>
              )}
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

            {/* KOTAK SKOR TERKALKULASI REAL-TIME */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Skor Terkalkulasi:</span>
                <div className="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-black text-sm shadow-2xs">
                  {currentSkorPersen}% ({currentSkala} / 3.0)
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {editingLogId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingLogId(null); setFormInput({ petugas_pj: 'Ustadz / Ustadzah Pemantau', guru_target: '', mapel_kelas: '', kelas_dipilih: '', jam_pembelajaran: '1-2', santri_absen: 'Nihil', catatan: '' }); setCheckedItems({}); }}
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

      {/* TAB 2: RIWAYAT (DENGAN FILTER BULAN DAN 10 DATA PER HALAMAN) */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">LOG RIWAYAT PENGAWASAN ({filteredRiwayatByMonth.length} DATA)</h3>
            
            <div className="flex items-center gap-3">
              {/* Filter Bulan */}
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
                  <th className="px-6 py-4">Petugas (PJ)</th>
                  <th className="px-6 py-4">Guru / Target</th>
                  <th className="px-6 py-4">Mapel & Kelas</th>
                  <th className="px-6 py-4">Siswa Absen</th>
                  <th className="px-6 py-4">Skor</th>
                  <th className="px-6 py-4">Catatan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRiwayatPageData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">Belum ada log riwayat pengawasan pada filter ini.</td>
                  </tr>
                ) : (
                  currentRiwayatPageData.map((item: any, idx: number) => {
                    const absenText = item.santri_absen || 'Nihil';
                    const shortenedAbsen = absenText.length > 18 ? absenText.substring(0, 15) + '...' : absenText;
                    const absoluteIndex = startIndex + idx + 1;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-400">{absoluteIndex}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800 max-w-xs truncate">{item.petugas_pj}</td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{item.guru_target}</td>
                        <td className="px-6 py-4 text-slate-600">{item.mapel_kelas}</td>
                        <td className="px-6 py-4 text-slate-600" title={absenText}>{shortenedAbsen}</td>
                        <td className="px-6 py-4 font-black text-blue-600">{item.skor_persen}%</td>
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

          {/* NAVIGASI PAGINASI (MAKSIMAL 10 DATA PER HALAMAN) */}
          {filteredRiwayatByMonth.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <p>Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredRiwayatByMonth.length)} dari {filteredRiwayatByMonth.length} data</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold px-3 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  Hal {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
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

      {/* POP-UP MODAL DETAIL */}
      {selectedDetailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 relative animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Eye size={20} className="text-blue-600" /> Detail Hasil Pengawasan & Evaluasi
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
                <h4 className="text-2xl font-black text-blue-600">{selectedDetailLog.skor_persen}%</h4>
                <p className="text-[11px] text-slate-500">Skala: {(selectedDetailLog.skor_persen / 33.3).toFixed(2)} / 3.0</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KELAS & JAM</p>
                <h4 className="text-xs font-bold text-slate-800 break-words">{selectedDetailLog.mapel_kelas}</h4>
                <p className="text-[11px] text-slate-500">Jam: {selectedDetailLog.jam_pembelajaran || '1-2'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GURU / SASARAN</p>
                <h4 className="text-xs font-bold text-slate-800 leading-snug break-words">{selectedDetailLog.guru_target}</h4>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SISWA TIDAK HADIR</p>
                <h4 className="text-xs font-bold text-slate-800 leading-snug break-words">{selectedDetailLog.santri_absen || 'Nihil'}</h4>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
              <p>Petugas Pemantau (PJ): <span className="font-semibold text-slate-700">{selectedDetailLog.petugas_pj}</span></p>
              <p>Waktu Input: <span className="font-semibold text-slate-700">{new Date(selectedDetailLog.waktu_input).toLocaleString('id-ID')}</span></p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">RINCIAN INDIKATOR MASALAH / TEMUAN DICENTANG</h4>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                  {selectedDetailLog.detail_ceklis ? Object.values(selectedDetailLog.detail_ceklis).filter(Boolean).length : 0} Temuan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto">
                {selectedDetailLog.detail_ceklis && Object.keys(selectedDetailLog.detail_ceklis).length > 0 ? (
                  Object.entries(selectedDetailLog.detail_ceklis)
                    .filter(([_, val]) => val === true)
                    .map(([key], i) => {
                      let namaButirItem = key;
                      kategoriList.forEach(kat => {
                        kat.divisi_butir_ceklis?.forEach((b: any) => {
                          if (b.id === key) namaButirItem = b.nama_butir;
                        });
                      });
                      return (
                        <div key={i} className="flex items-center gap-2 p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs font-medium text-rose-900">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span className="truncate">{namaButirItem}</span>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 col-span-2">Tidak ada indikator bermasalah yang dicentang (Semua sesuai standar / bersih).</p>
                )}
              </div>
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

      {/* TAB 3: HASIL REALISASI */}
      {activeSubTab === 'realisasi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Target Resmi IKU ({timeframe})</p>
            <h3 className="text-3xl font-black text-slate-900">100%</h3>
            <p className="text-xs text-slate-500">Target indikator kinerja utama program</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Realisasi Tercapai</p>
            <h3 className="text-3xl font-black text-blue-600">
              {riwayatList.length > 0 ? (riwayatList.reduce((acc: number, curr: any) => acc + Number(curr.skor_persen), 0) / riwayatList.length).toFixed(1) : 0}%
            </h3>
            <p className="text-xs text-slate-500">Rata-rata kepatuhan dari {riwayatList.length} sesi</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Keterisian Data</p>
            <h3 className="text-3xl font-black text-emerald-600">{riwayatList.length} Laporan</h3>
            <p className="text-xs text-slate-500">Total formulir ceklis berhasil diinput</p>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMIZE FORM */}
      {activeSubTab === 'customize' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" /> PENGATURAN KOLOM INFORMASI PENGAWASAN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Centang modul yang ingin ditampilkan pada form kegiatan ini</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <button type="button" onClick={() => handleSelectAllConfig(true)} className="text-blue-600 hover:underline">Centang Semua</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => handleSelectAllConfig(false)} className="text-slate-500 hover:underline">Kosongkan Semua</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_petugas ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_petugas} onChange={e => handleToggleConfigField('show_petugas', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Petugas (PJ)
              </label>
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_guru ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_guru} onChange={e => handleToggleConfigField('show_guru', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Ustadz / Guru Pengampu
              </label>
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_mapel ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_mapel} onChange={e => handleToggleConfigField('show_mapel', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Mata Pelajaran
              </label>
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_kelas ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_kelas} onChange={e => handleToggleConfigField('show_kelas', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Kelas
              </label>
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_jam ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_jam} onChange={e => handleToggleConfigField('show_jam', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Jam Pembelajaran
              </label>
              <label className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${formConfig.show_santri_absen ? 'border-blue-500 bg-blue-50/20 text-blue-900 shadow-2xs' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input type="checkbox" checked={formConfig.show_santri_absen} onChange={e => handleToggleConfigField('show_santri_absen', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Santri Absen
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800">Pengaturan Kategori & Indikator</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sesuaikan butir ceklis untuk program <span className="font-semibold text-slate-700">"{selectedProgramObj?.nama_program}"</span></p>
            </div>
            
            <form onSubmit={handleAddKategori} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input 
                type="text" 
                placeholder="Nama Kategori Baru (misal: Kebersihan, Ketertiban)..." 
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