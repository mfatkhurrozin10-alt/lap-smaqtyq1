// src/views/DivisiKurikulumView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckSquare, History, BarChart2, Settings, RefreshCw, Plus, Trash2, Printer } from 'lucide-react';

export default function DivisiKurikulumView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiData, setDivisiData] = useState<any>({
    nama_divisi: 'Kurikulum',
    nama_koordinator: 'Ummi Mukhoyyaroh, M.Pd.'
  });
  
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  
  // Timeframe Filter: Harian, Mingguan, Bulanan, Tahunan
  const [timeframe, setTimeframe] = useState('Harian');

  // State Pilihan Dropdown dari Tabel Supabase (Guru, Kelas, Mapel)
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

  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [riwayatList, setRiwayatList] = useState<any[]>([]);
  const [formConfig, setFormConfig] = useState<any>({
    show_petugas: true,
    show_guru: true,
    show_mapel: true,
    show_kelas: true,
    show_jam: true,
    show_santri_absen: true
  });

  const [newKategoriNama, setNewKategoriNama] = useState('');
  const [newKategoriTipe, setNewKategoriTipe] = useState('Negatif (Temuan/Pelanggaran)');
  const [inputButirBaru, setInputButirBaru] = useState<{ [key: string]: string }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil data Divisi & Program beserta relasi indikator_iku
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

      // 2. Ambil data GURU langsung dari tabel 'guru' Supabase
      const { data: dbGuru } = await supabase.from('guru').select('id, nama');
      if (dbGuru && dbGuru.length > 0) {
        setGuruList(dbGuru);
      }

      // 3. Ambil data MAPEL langsung dari tabel 'mapel' Supabase
      const { data: dbMapel } = await supabase.from('mapel').select('id, nama_mapel, kode');
      if (dbMapel && dbMapel.length > 0) {
        setMapelList(dbMapel);
      }

      // 4. Ambil data KELAS unik dari tabel 'guru_mapel' atau fallback standar
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
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProgramDetail();
  }, [selectedProgramId]);

  const handleSubmitCeklis = async (e: any) => {
    e.preventDefault();
    try {
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
        waktu_input: new Date().toISOString(),
        petugas_pj: formInput.petugas_pj,
        guru_target: formInput.guru_target,
        mapel_kelas: `${formInput.mapel_kelas} (${formInput.kelas_dipilih})`,
        jam_pembelajaran: formInput.jam_pembelajaran,
        santri_absen: formInput.santri_absen,
        catatan_temuan: formInput.catatan,
        skor_persen: skor,
        detail_ceklis: checkedItems
      };

      const { error } = await supabase.from('divisi_log_pengawasan').insert([payload]);
      if (error) throw error;

      if (showNotification) showNotification(`Data laporan ${timeframe.toLowerCase()} berhasil disimpan!`, 'success');
      setCheckedItems({});
      setFormInput({ ...formInput, guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
      fetchProgramDetail();
      setActiveSubTab('riwayat');
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
      if (showNotification) showNotification('Butir indikator ditambahkan', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleDeleteButir = async (butirId: string) => {
    try {
      await supabase.from('divisi_butir_ceklis').delete().eq('id', butirId);
      if (showNotification) showNotification('Butir dihapus', 'success');
      fetchProgramDetail();
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Kurikulum...</div>;
  }

  const filteredProgramsByTime = programList.filter((p: any) => !p.timeframe || p.timeframe.toLowerCase() === timeframe.toLowerCase());
  const selectedProgramObj = programList.find((p: any) => p.id === selectedProgramId);

  return (
    <div className="space-y-6 w-full text-left pb-12">
      
      {/* HEADER DIVISI & FILTER TIMEFRAME */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Divisi {divisiData?.nama_divisi || 'Kurikulum'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator || 'Ummi Mukhoyyaroh, M.Pd.'}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tombol Filter Waktu */}
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

          {/* Dropdown Program Berdasarkan Timeframe */}
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none shadow-sm"
          >
            {filteredProgramsByTime.length === 0 ? (
              <option value="">Tidak ada program {timeframe}</option>
            ) : (
              filteredProgramsByTime.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nama_program}</option>
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
          <CheckSquare size={16} /> Form Ceklis ({timeframe})
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
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckSquare size={18} className="text-blue-600" /> Informasi Pengawasan & Guru Terkait ({timeframe})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formConfig.show_petugas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ustadz / Petugas Pemantau (PJ):</label>
                  <input type="text" value={formInput.petugas_pj} onChange={e => setFormInput({...formInput, petugas_pj: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required />
                </div>
              )}

              {/* DROPDOWN GURU DIAMBIL DARI TABEL 'guru' SUPABASE */}
              {formConfig.show_guru && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ustadz / Guru Pengampu:</label>
                  <select 
                    value={formInput.guru_target} 
                    onChange={e => setFormInput({...formInput, guru_target: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none" 
                    required
                  >
                    <option value="">-- Pilih Ustadz / Guru --</option>
                    {guruList.map((g: any) => (
                      <option key={g.id} value={g.nama}>{g.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* DROPDOWN MAPEL DIAMBIL DARI TABEL 'mapel' SUPABASE */}
              {formConfig.show_mapel && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran:</label>
                  <select 
                    value={formInput.mapel_kelas} 
                    onChange={e => setFormInput({...formInput, mapel_kelas: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                    required
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {mapelList.map((m: any) => (
                      <option key={m.id} value={m.nama_mapel}>{m.nama_mapel} ({m.kode})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* DROPDOWN KELAS DIAMBIL DARI TABEL GURU_MAPEL / SISWA */}
              {formConfig.show_kelas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas:</label>
                  <select 
                    value={formInput.kelas_dipilih} 
                    onChange={e => setFormInput({...formInput, kelas_dipilih: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none"
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                Kirim & Simpan Pengawasan ({timeframe})
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: RIWAYAT */}
      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Log Riwayat Pengawasan ({timeframe}) - {riwayatList.length} Data</h3>
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
                  <th className="px-6 py-4">Ustadz / Target</th>
                  <th className="px-6 py-4">Mapel / Kelas</th>
                  <th className="px-6 py-4">Skor</th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayatList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Belum ada riwayat pengawasan untuk program {timeframe} ini.</td>
                  </tr>
                ) : (
                  riwayatList.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.petugas_pj}</td>
                      <td className="px-6 py-4 text-slate-700">{item.guru_target}</td>
                      <td className="px-6 py-4 text-slate-600">{item.mapel_kelas}</td>
                      <td className="px-6 py-4 font-black text-blue-600">{item.skor_persen}%</td>
                      <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{item.catatan_temuan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <h3 className="font-bold text-slate-800">Pengaturan Kolom Informasi Pengawasan ({timeframe})</h3>
            <p className="text-xs text-slate-500">Centang modul yang ingin ditampilkan pada form kegiatan program ini.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_petugas} onChange={e => setFormConfig({...formConfig, show_petugas: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Petugas (PJ)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_guru} onChange={e => setFormConfig({...formConfig, show_guru: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Ustadz / Guru Pengampu
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_mapel} onChange={e => setFormConfig({...formConfig, show_mapel: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Mata Pelajaran
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_kelas} onChange={e => setFormConfig({...formConfig, show_kelas: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Kelas
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_jam} onChange={e => setFormConfig({...formConfig, show_jam: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Jam Pembelajaran
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_santri_absen} onChange={e => setFormConfig({...formConfig, show_santri_absen: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Santri Absen
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Tambah Kategori & Indikator Ceklis</h3>
            
            <form onSubmit={handleAddKategori} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Nama Kategori Baru (misal: Kebersihan)..." 
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

          <div className="space-y-4">
            {kategoriList.map((kat: any) => (
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