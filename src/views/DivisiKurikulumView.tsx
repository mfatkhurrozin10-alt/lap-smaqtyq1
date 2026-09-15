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
  
  // Data Program default agar tidak kosong jika Supabase belum diisi
  const [programList, setProgramList] = useState<any[]>([
    { id: 'prog-1', nama_program: 'Monitoring KBM' }
  ]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('prog-1');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  
  const [timeframe, setTimeframe] = useState('Harian');

  const [formInput, setFormInput] = useState({
    petugas_pj: 'Ummi Mukhoyyaroh, M.Pd.',
    guru_target: '',
    mapel_kelas: '',
    jam_pembelajaran: '1-2',
    santri_absen: 'Nihil',
    catatan: ''
  });

  // Data Kategori & Indikator Ceklis Default (Persis seperti gambar Anda)
  const [kategoriList, setKategoriList] = useState<any[]>([
    {
      id: 'kat-1',
      nama_kategori: 'Kebersihan',
      tipe_kategori: 'Negatif (Temuan/Pelanggaran)',
      divisi_butir_ceklis: [
        { id: 'b-1', nama_butir: 'Papan tulis belum bersih' },
        { id: 'b-2', nama_butir: 'Ada sarang laba-laba' },
        { id: 'b-3', nama_butir: 'Jendela/Kaca kotor' },
        { id: 'b-4', nama_butir: 'Meja/kursi kotor' },
        { id: 'b-5', nama_butir: 'Lantai kotor' }
      ]
    },
    {
      id: 'kat-2',
      nama_kategori: 'Kerapian',
      tipe_kategori: 'Negatif (Temuan/Pelanggaran)',
      divisi_butir_ceklis: [
        { id: 'b-6', nama_butir: 'Meja/kursi siswa tidak rapi' },
        { id: 'b-7', nama_butir: 'Buku siswa tidak rapi' },
        { id: 'b-8', nama_butir: 'Atribut siswa tidak lengkap/rapi' }
      ]
    }
  ]);

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
      const { data: divList } = await supabase.from('divisi').select('*');
      const kurikulumDiv = divList?.find((d: any) => d.nama_divisi?.toLowerCase().includes('kurikulum')) || divList?.[0];

      if (kurikulumDiv) {
        setDivisiData(kurikulumDiv);
        const { data: prog } = await supabase.from('program_kegiatan').select('*').eq('divisi_id', kurikulumDiv.id);
        if (prog && prog.length > 0) {
          setProgramList(prog);
          setSelectedProgramId(prog[0].id);
          
          // Ambil Kategori dari Supabase jika ada
          const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', prog[0].id).order('urutan');
          if (kat && kat.length > 0) {
            setKategoriList(kat);
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
  }, []);

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

      const newLog = {
        id: Date.now().toString(),
        waktu_input: new Date().toISOString(),
        petugas_pj: formInput.petugas_pj,
        guru_target: formInput.guru_target || 'Ustadzah Pengampu',
        mapel_kelas: formInput.mapel_kelas || 'Kelas 7-A',
        skor_persen: skor,
        catatan_temuan: formInput.catatan || 'Sesuai standar'
      };

      setRiwayatList([newLog, ...riwayatList]);
      if (showNotification) showNotification('Form ceklis berhasil disimpan!', 'success');
      setCheckedItems({});
      setFormInput({ ...formInput, guru_target: '', mapel_kelas: '', catatan: '' });
      setActiveSubTab('riwayat');
    } catch (err: any) {
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleAddKategori = (e: any) => {
    e.preventDefault();
    if (!newKategoriNama) return;
    const newKat = {
      id: 'kat-' + Date.now(),
      nama_kategori: newKategoriNama,
      tipe_kategori: newKategoriTipe,
      divisi_butir_ceklis: []
    };
    setKategoriList([...kategoriList, newKat]);
    setNewKategoriNama('');
    if (showNotification) showNotification('Kategori baru ditambahkan', 'success');
  };

  const handleAddButir = (kategoriId: string) => {
    const namaButir = inputButirBaru[kategoriId];
    if (!namaButir) return;
    
    const updated = kategoriList.map(kat => {
      if (kat.id === kategoriId) {
        return {
          ...kat,
          divisi_butir_ceklis: [...(kat.divisi_butir_ceklis || []), { id: 'b-' + Date.now(), nama_butir: namaButir }]
        };
      }
      return kat;
    });

    setKategoriList(updated);
    setInputButirBaru({ ...inputButirBaru, [kategoriId]: '' });
    if (showNotification) showNotification('Butir indikator ditambahkan', 'success');
  };

  const handleDeleteButir = (kategoriId: string, butirId: string) => {
    const updated = kategoriList.map(kat => {
      if (kat.id === kategoriId) {
        return {
          ...kat,
          divisi_butir_ceklis: kat.divisi_butir_ceklis.filter((b: any) => b.id !== butirId)
        };
      }
      return kat;
    });
    setKategoriList(updated);
    if (showNotification) showNotification('Butir dihapus', 'success');
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Kurikulum...</div>;
  }

  const selectedProgramObj = programList.find((p: any) => p.id === selectedProgramId) || programList[0];

  return (
    <div className="space-y-6 w-full text-left pb-12">
      
      {/* HEADER DIVISI */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Divisi {divisiData?.nama_divisi || 'Kurikulum'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator || 'Ummi Mukhoyyaroh, M.Pd.'}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none shadow-sm"
          >
            {programList.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nama_program}</option>
            ))}
          </select>
          
          <button onClick={fetchData} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Refresh Data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* SUB-MENU TAB NAVIGASI */}
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

      {/* TAB 1: FORM CEKLIS */}
      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmitCeklis} className="space-y-6">
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

          <div className="space-y-4">
            {kategoriList.map((kat: any) => (
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

      {/* TAB 2: RIWAYAT */}
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
                {riwayatList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Belum ada riwayat pengawasan. Silakan isi form ceklis terlebih dahulu.</td>
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
            <p className="text-xs font-bold text-slate-400 uppercase">Target Resmi IKU</p>
            <h3 className="text-3xl font-black text-slate-900">100%</h3>
            <p className="text-xs text-slate-500">Target indikator kinerja utama divisi</p>
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
            <h3 className="font-bold text-slate-800">Pengaturan Kolom Informasi Pengawasan</h3>
            <p className="text-xs text-slate-500">Centang modul yang ingin ditampilkan pada form kegiatan ini.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_petugas} onChange={e => setFormConfig({...formConfig, show_petugas: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Petugas (PJ)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formConfig.show_guru} onChange={e => setFormConfig({...formConfig, show_guru: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /> Guru Pengampu
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
                      <button onClick={() => handleDeleteButir(kat.id, butir.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
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