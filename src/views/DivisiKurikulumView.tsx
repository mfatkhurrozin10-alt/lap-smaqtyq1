// src/views/DivisiKurikulumView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { CheckSquare, History, BarChart2, Settings, RefreshCw, Plus, Trash2, Printer } from 'lucide-react';

export default function DivisiKurikulumView({ showNotification }: any) {
  // State Utama Divisi Kurikulum (ID Divisi Kurikulum di database atau dipilih dinamis)
  const [divisiData, setDivisiData] = useState<any>(null);
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  
  // Timeframe Filter (Harian, Mingguan, Bulanan, Tahunan)
  const [timeframe, setTimeframe] = useState('Harian');

  // State Form Ceklis Input
  const [formInput, setFormInput] = useState({
    petugas_pj: 'Ummi Mukhoyyaroh, M.Pd.',
    guru_target: '',
    mapel_kelas: '',
    jam_pembelajaran: '1-2',
    santri_absen: 'Nihil',
    catatan: ''
  });
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // State Riwayat & Realisasi
  const [riwayatList, setRiwayatList] = useState<any[]>([]);
  const [formConfig, setFormConfig] = useState<any>({
    show_petugas: true,
    show_guru: true,
    show_mapel: true,
    show_kelas: true,
    show_jam: true,
    show_santri_absen: true
  });

  // State Customize Form (Tambah Kategori & Butir Baru)
  const [newKategoriNama, setNewKategoriNama] = useState('');
  const [newKategoriTipe, setNewKategoriTipe] = useState('Negatif (Temuan/Pelanggaran)');
  const [inputButirBaru, setInputButirBaru] = useState<{ [key: string]: string }>({});

  // Load Data Awal (Divisi & Program Kurikulum)
  const fetchInitialData = async () => {
    try {
      // Cari divisi dengan kode KUR atau nama Kurikulum
      const { data: div } = await supabase.from('divisi').select('*').ilike('nama_divisi', '%Kurikulum%').single();
      if (div) {
        setDivisiData(div);
        // Ambil program yang terikat dengan divisi ini
        const { data: prog } = await supabase.from('program_kegiatan').select('*').eq('divisi_id', div.id);
        setProgramList(prog || [] );
        if (prog && prog.length > 0 && !selectedProgramId) {
          setSelectedProgramId(prog[0].id);
        }
      }
    } catch (err: any) {
      showNotification('Gagal memuat data kurikulum', 'error');
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Load Detail Program saat selectedProgramId berubah
  const fetchProgramDetail = async () => {
    if (!selectedProgramId) return;
    try {
      // Ambil Konfigurasi Form
      const { data: cfg } = await supabase.from('divisi_form_config').select('*').eq('program_id', selectedProgramId).single();
      if (cfg) setFormConfig(cfg);

      // Ambil Kategori & Butir Ceklis beserta relasinya
      const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', selectedProgramId).order('urutan');
      setKategoriList(kat || []);

      // Ambil Riwayat Pengawasan
      const { data: riw } = await supabase.from('divisi_log_pengawasan').select('*').eq('program_id', selectedProgramId).order('waktu_input', { ascending: false });
      setRiwayatList(riw || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProgramDetail();
  }, [selectedProgramId]);

  // Handler Submit Form Ceklis
  const handleSubmitCeklis = async (e: any) => {
    e.preventDefault();
    try {
      // Hitung skor sederhana berdasarkan temuan yang dicentang
      let totalButir = 0;
      let temuanAktif = 0;
      kategoriList.forEach(kat => {
        kat.divisi_butir_ceklis?.forEach((butir: any) => {
          totalButir++;
          if (checkedItems[butir.id]) temuanAktif++;
        });
      });

      const skor = totalButir > 0 ? Number(((1 - (temuanAktif / totalButir)) * 100).toFixed(1)) : 100;

      const payload = {
        program_id: selectedProgramId,
        petugas_pj: formInput.petugas_pj,
        guru_target: formInput.guru_target,
        mapel_kelas: formInput.mapel_kelas,
        jam_pembelajaran: formInput.jam_pembelajaran,
        santri_absen: formInput.santri_absen,
        catatan_temuan: formInput.catatan,
        skor_persen: skor,
        detail_ceklis: checkedItems
      };

      const { error } = await supabase.from('divisi_log_pengawasan').insert([payload]);
      if (error) throw error;

      showNotification('Form ceklis berhasil disimpan!', 'success');
      setCheckedItems({});
      setFormInput({ ...formInput, guru_target: '', mapel_kelas: '', catatan: '' });
      fetchProgramDetail();
      setActiveSubTab('riwayat');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Tambah Kategori Baru (Customize Form)
  const handleAddKategori = async (e: any) => {
    e.preventDefault();
    if (!newKategoriNama) return;
    try {
      const { error } = await supabase.from('divisi_kategori_indikator').insert([{
        program_id: selectedProgramId,
        nama_kategori: newKategoriNama,
        tipe_kategori: newKategoriTipe
      }]);
      if (error) throw error;
      setNewKategoriNama('');
      showNotification('Kategori baru ditambahkan', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Tambah Butir Ceklis ke Kategori
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
      showNotification('Butir ceklis ditambahkan', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Hapus Butir Ceklis
  const handleDeleteButir = async (butirId: string) => {
    try {
      await supabase.from('divisi_butir_ceklis').delete().eq('id', butirId);
      showNotification('Butir dihapus', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Update Config Checkbox Kolom Form
  const handleToggleConfig = async (field: string, value: boolean) => {
    const updated = { ...formConfig, [field]: value };
    setFormConfig(updated);
    try {
      // Cek apakah config sudah ada
      const { data: existing } = await supabase.from('divisi_form_config').select('id').eq('program_id', selectedProgramId).single();
      if (existing) {
        await supabase.from('divisi_form_config').update({ [field]: value }).eq('program_id', selectedProgramId);
      } else {
        await supabase.from('divisi_form_config').insert([{ program_id: selectedProgramId, [field]: value }]);
      }
      showNotification('Konfigurasi form disimpan', 'success');
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedProgramObj = programList.find(p => p.id === selectedProgramId);

  return (
    <div className="space-y-6 w-full text-left pb-12">
      
      {/* HEADER DIVISI & FILTER PROGRAM */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Divisi {divisiData?.nama_divisi || 'Kurikulum'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator || 'Ummi Mukhoyyaroh, M.Pd.'}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Timeframe */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Dropdown Pilih Program */}
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none shadow-sm"
          >
            {programList.map(p => (
              <option key={p.id} value={p.id}>{p.nama_program} ({riwayatList.filter(r => r.program_id === p.id).length} data)</option>
            ))}
          </select>
          
          <button onClick={fetchProgramDetail} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Refresh Data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* SUB-MENU NAVIGASI TAB */}
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

        {selectedProgramObj && (
          <div className="ml-auto px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700">
            Program Aktif: {selectedProgramObj.nama_program}
          </div>
        )}
      </div>

      {/* --- KONTEN TAB 1: FORM CEKLIS --- */}
      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmitCeklis} className="space-y-6">
          
          {/* Panel Informasi Pengawasan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckSquare size={18} className="text-blue-600" /> Informasi Pengawasan & Guru Terkait
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formConfig.show_petugas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Petugas Pemantau (PJ):</label>
                  <input type="text" value={formInput.petugas_pj} onChange={e => setFormInput({...formInput, petugas_pj: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required />
                </div>
              )}
              {formConfig.show_guru && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ustadzah / Guru Pengampu:</label>
                  <input type="text" placeholder="Ketik atau pilih nama guru..." value={formInput.guru_target} onChange={e => setFormInput({...formInput, guru_target: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required />
                </div>
              )}
              {formConfig.show_mapel && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran:</label>
                  <input type="text" placeholder="Ketik atau pilih mapel..." value={formInput.mapel_kelas} onChange={e => setFormInput({...formInput, mapel_kelas: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              )}
              {formConfig.show_kelas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas:</label>
                  <select value={formInput.mapel_kelas} onChange={e => setFormInput({...formInput, mapel_kelas: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                    <option value="">Pilih Kelas</option>
                    <option value="Kelas 7-A">Kelas 7-A</option>
                    <option value="Kelas 7-B">Kelas 7-B</option>
                    <option value="Kelas 8-A">Kelas 8-A</option>
                    <option value="Kelas 9-A">Kelas 9-A</option>
                  </select>
                </div>
              )}
              {formConfig.show_jam && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam Pembelajaran:</label>
                  <input type="text" value={formInput.jam_pembelajaran} onChange={e => setFormInput({...formInput, jam_pembelajaran: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              )}
              {formConfig.show_santri_absen && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Santri Tidak Hadir:</label>
                  <input type="text" value={formInput.santri_absen} onChange={e => setFormInput({...formInput, santri_absen: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              )}
            </div>
          </div>

          {/* Panel Kategori & Butir Ceklis Dinamis */}
          <div className="space-y-4">
            {kategoriList.map(kat => (
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
                    <label key={butir.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl cursor-pointer transition-colors">
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
            ))}
          </div>

          {/* Catatan & Tombol Simpan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan / Temuan Khusus:</label>
              <textarea 
                value={formInput.catatan} 
                onChange={e => setFormInput({...formInput, catatan: e.target.value})} 
                placeholder="Tuliskan catatan tambahan jika ada..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                Kirim & Simpan Pengawasan
              </button>
            </div>
          </div>
        </form>
      )}

      {/* --- KONTEN TAB 2: RIWAYAT --- */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Log Riwayat Pengawasan ({riwayatList.length} Data)</h3>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
              <Printer size={14} /> Cetak Laporan
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Petugas (PJ)</th>
                  <th className="px-6 py-4">Guru / Target</th>
                  <th className="px-6 py-4">Mapel / Kelas</th>
                  <th className="px-6 py-4">Skor</th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayatList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.petugas_pj}</td>
                    <td className="px-6 py-4 text-slate-700">{item.guru_target || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{item.mapel_kelas || '-'}</td>
                    <td className="px-6 py-4 font-black text-blue-600">{item.skor_persen}%</td>
                    <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{item.catatan_temuan || 'Tidak ada catatan'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- KONTEN TAB 3: HASIL REALISASI --- */}
      {activeSubTab === 'realisasi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Target Resmi IKU</p>
            <h3 className="text-3xl font-black text-slate-900">100%</h3>
            <p className="text-xs text-slate-500">Target indikator kinerja utama divisi</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Realisasi Tercapai</p>
            <h3 className="text-3xl font-black text-blue-600">
              {riwayatList.length > 0 ? (riwayatList.reduce((acc, curr) => acc + Number(curr.skor_persen), 0) / riwayatList.length).toFixed(1) : 0}%
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

      {/* --- KONTEN TAB 4: CUSTOMIZE FORM --- */}
      {activeSubTab === 'customize' && (
        <div className="space-y-6">
          
          {/* Pengaturan Kolom Informasi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Pengaturan Kolom Informasi Pengawasan</h3>
            <p className="text-xs text-slate-500">Centang modul yang ingin ditampilkan pada form kegiatan ini (Contoh: Sarpras bisa menghilangkan kolom kelas/mapel).</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_petugas} onChange={e => handleToggleConfig('show_petugas', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Petugas (PJ)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_guru} onChange={e => handleToggleConfig('show_guru', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Guru Pengampu
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_mapel} onChange={e => handleToggleConfig('show_mapel', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Mata Pelajaran
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_kelas} onChange={e => handleToggleConfig('show_kelas', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Kelas
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_jam} onChange={e => handleToggleConfig('show_jam', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Jam Pembelajaran
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_santri_absen} onChange={e => handleToggleConfig('show_santri_absen', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> Santri Absen
              </label>
            </div>
          </div>

          {/* Tambah Kategori Baru */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Tambah Kategori & Indikator Ceklis</h3>
            
            <form onSubmit={handleAddKategori} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Nama Kategori Baru (misal: Kebersihan, Ketertiban)..." 
                value={newKategoriNama} 
                onChange={e => setNewKategoriNama(e.target.value)} 
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                required
              />
              <select value={newKategoriTipe} onChange={e => setNewKategoriTipe(e.target.value)} className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none">
                <option value="Negatif (Temuan/Pelanggaran)">Negatif (Temuan)</option>
                <option value="Positif (Pencapaian)">Positif (Pencapaian)</option>
              </select>
              <button type="submit" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md">
                <Plus size={16} /> Tambah Kategori
              </button>
            </form>
          </div>

          {/* Daftar Kategori & Butir Aktif Saat Ini */}
          <div className="space-y-4">
            {kategoriList.map(kat => (
              <div key={kat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800">{kat.nama_kategori}</h4>
                  <span className="text-xs text-slate-500 font-semibold">{kat.tipe_kategori}</span>
                </div>

                <div className="space-y-2">
                  {kat.divisi_butir_ceklis?.map((butir: any) => (
                    <div key={butir.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                      <span className="text-sm text-slate-700">{butir.nama_butir}</span>
                      <button onClick={() => handleDeleteButir(butir.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                {/* Input Tambah Butir ke Kategori Ini */}
                <div className="flex gap-2 pt-2">
                  <input 
                    type="text" 
                    placeholder="Tambah butir indikator baru..." 
                    value={inputButirBaru[kat.id] || ''} 
                    onChange={e => setInputButirBaru({...inputButirBaru, [kat.id]: e.target.value})}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <button onClick={() => handleAddButir(kat.id)} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl">
                    Tambah Butir
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}