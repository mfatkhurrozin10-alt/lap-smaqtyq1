// src/views/DivisiKesiswaanView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckSquare, History, BarChart2, Settings, RefreshCw, Plus, Trash2, Edit, Printer, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DivisiKesiswaanView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiData, setDivisiData] = useState<any>({
    nama_divisi: 'Kesiswaan',
    nama_koordinator: 'Tim Kesiswaan'
  });
  
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  const [timeframe, setTimeframe] = useState('Harian');

  const [guruList, setGuruList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);

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

  const [formConfig, setFormConfig] = useState<any>({
    show_petugas: true, show_guru: true, show_mapel: true, show_kelas: true, show_jam: true, show_santri_absen: true
  });

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
      const targetDiv = divList?.find((d: any) => d.nama_divisi?.toLowerCase().includes('kesiswaan')) || divList?.[0];

      if (targetDiv) {
        setDivisiData(targetDiv);
        const { data: prog } = await supabase.from('program_kegiatan').select('*, indikator_iku(kode_iku, judul_iku)').eq('divisi_id', targetDiv.id);
        if (prog && prog.length > 0) {
          setProgramList(prog);
          const filteredByTime = prog.filter((p: any) => p.timeframe?.toLowerCase() === timeframe.toLowerCase());
          setSelectedProgramId(filteredByTime.length > 0 ? filteredByTime[0].id : prog[0].id);
        }
      }
      const { data: dbGuru } = await supabase.from('guru').select('id, nama');
      if (dbGuru) setGuruList(dbGuru);
      const { data: dbMapel } = await supabase.from('mapel').select('id, nama_mapel, kode');
      if (dbMapel) setMapelList(dbMapel);
      const { data: dbKelas } = await supabase.from('guru_mapel').select('kelas');
      if (dbKelas && dbKelas.length > 0) {
        setKelasList(Array.from(new Set(dbKelas.map((k: any) => k.kelas))).filter(Boolean));
      } else {
        setKelasList(['Kelas 7-A', 'Kelas 7-B', 'Kelas 8-A', 'Kelas 8-B', 'Kelas 9-A', 'Kelas 9-B']);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [timeframe]);

  const fetchProgramDetail = async () => {
    if (!selectedProgramId) return;
    try {
      const { data: cfgList } = await supabase.from('divisi_form_config').select('*').eq('program_id', selectedProgramId);
      if (cfgList && cfgList.length > 0) setFormConfig(cfgList[0]);
      const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', selectedProgramId).order('urutan');
      setKategoriList(kat || []);
      const { data: riw } = await supabase.from('divisi_log_pengawasan').select('*').eq('program_id', selectedProgramId).order('waktu_input', { ascending: false });
      setRiwayatList(riw || []);
      setCurrentPage(1);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchProgramDetail(); }, [selectedProgramId]);

  const calculateCurrentScore = () => {
    let totalButir = 0, temuanAktif = 0;
    kategoriList.forEach(kat => {
      kat.divisi_butir_ceklis?.forEach((butir: any) => {
        totalButir++;
        if (checkedItems[butir.id]) temuanAktif++;
      });
    });
    const skorPersen = totalButir > 0 ? Number(((1 - (temuanAktif / totalButir)) * 100).toFixed(1)) : 100;
    return { skorPersen, skala: Number((skorPersen / 33.3).toFixed(2)) };
  };

  const { skorPersen: currentSkorPersen, skala: currentSkala } = calculateCurrentScore();

  const handleSubmitCeklis = async (e: any) => {
    e.preventDefault();
    try {
      const payload = {
        program_id: selectedProgramId, waktu_input: new Date().toISOString(),
        petugas_pj: formInput.petugas_pj, guru_target: formInput.guru_target,
        mapel_kelas: `${formInput.mapel_kelas} (${formInput.kelas_dipilih})`,
        jam_pembelajaran: formInput.jam_pembelajaran, santri_absen: formInput.santri_absen,
        catatan_temuan: formInput.catatan, skor_persen: currentSkorPersen, detail_ceklis: checkedItems
      };
      if (editingLogId) {
        await supabase.from('divisi_log_pengawasan').update(payload).eq('id', editingLogId);
        showNotification('Laporan Kesiswaan diperbarui!', 'success');
        setEditingLogId(null);
      } else {
        await supabase.from('divisi_log_pengawasan').insert([payload]);
        showNotification('Laporan Kesiswaan disimpan!', 'success');
      }
      setCheckedItems({});
      setFormInput({ ...formInput, petugas_pj: '', guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
      fetchProgramDetail(); setActiveSubTab('riwayat');
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Kesiswaan...</div>;

  const filteredPrograms = programList.filter((p: any) => !p.timeframe || p.timeframe.toLowerCase() === timeframe.toLowerCase());
  const selectedProgramObj = programList.find((p: any) => p.id === selectedProgramId);
  const filteredRiwayat = riwayatList.filter((item: any) => selectedMonthFilter === 'all' || new Date(item.waktu_input).toISOString().slice(0, 7) === selectedMonthFilter);
  const totalPages = Math.ceil(filteredRiwayat.length / itemsPerPage) || 1;
  const currentData = filteredRiwayat.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const avgRealisasi = riwayatList.length > 0 ? (riwayatList.reduce((acc, curr) => acc + Number(curr.skor_persen), 0) / riwayatList.length) : 0;

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Divisi Kesiswaan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Harian', 'Mingguan', 'Bulanan', 'Tahunan'].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tf}</button>
            ))}
          </div>
          <select value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none shadow-sm cursor-pointer">
            {filteredPrograms.map((p: any) => (<option key={p.id} value={p.id}>{p.nama_program}</option>))}
          </select>
          <button onClick={fetchData} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"><RefreshCw size={16} /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveSubTab('form')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${activeSubTab === 'form' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><CheckSquare size={16} /> Form Ceklis</button>
        <button onClick={() => setActiveSubTab('riwayat')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${activeSubTab === 'riwayat' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><History size={16} /> Riwayat ({riwayatList.length})</button>
        <button onClick={() => setActiveSubTab('realisasi')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${activeSubTab === 'realisasi' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><BarChart2 size={16} /> Realisasi</button>
        <button onClick={() => setActiveSubTab('customize')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${activeSubTab === 'customize' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}><Settings size={16} /> Customize</button>
      </div>

      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmitCeklis} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckSquare size={18} className="text-blue-600" /> Informasi Pengawasan Kesiswaan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formConfig.show_petugas && <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Petugas PJ:</label><input type="text" value={formInput.petugas_pj} onChange={e => setFormInput({...formInput, petugas_pj: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required /></div>}
              {formConfig.show_guru && <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Pihak / Pembina Terkait:</label><select value={formInput.guru_target} onChange={e => setFormInput({...formInput, guru_target: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none" required><option value="">-- Pilih --</option>{guruList.map((g: any)=><option key={g.id} value={g.nama}>{g.nama}</option>)}</select></div>}
              {formConfig.show_kelas && <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas:</label><select value={formInput.kelas_dipilih} onChange={e => setFormInput({...formInput, kelas_dipilih: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none" required><option value="">-- Pilih Kelas --</option>{kelasList.map((k: string, i)=><option key={i} value={k}>{k}</option>)}</select></div>}
            </div>
          </div>
          <div className="space-y-4">
            {kategoriList.map((kat: any) => (
              <div key={kat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-800">{kat.nama_kategori}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kat.divisi_butir_ceklis?.map((butir: any) => (
                    <label key={butir.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                      <input type="checkbox" checked={!!checkedItems[butir.id]} onChange={e => setCheckedItems({...checkedItems, [butir.id]: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm font-medium text-slate-700">{butir.nama_butir}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <textarea value={formInput.catatan} onChange={e => setFormInput({...formInput, catatan: e.target.value})} placeholder="Catatan khusus..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none" />
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className={`px-4 py-1.5 border rounded-xl font-black text-sm ${getScoreColorClass(currentSkorPersen)}`}>Skor: {currentSkorPersen}% ({currentSkala} / 3.0)</div>
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md">Simpan Laporan</button>
            </div>
          </div>
        </form>
      )}

      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Riwayat Kesiswaan ({filteredRiwayat.length})</h3>
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"><Printer size={14} /> Cetak</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <tr><th className="px-6 py-4">Waktu</th><th className="px-6 py-4">Petugas</th><th className="px-6 py-4">Sasaran</th><th className="px-6 py-4">Skor</th><th className="px-6 py-4">Catatan</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 font-semibold">{item.petugas_pj}</td>
                    <td className="px-6 py-4">{item.guru_target}</td>
                    <td className={`px-6 py-4 font-black ${getScoreTextColor(Number(item.skor_persen))}`}>{item.skor_persen}%</td>
                    <td className="px-6 py-4 text-slate-500 italic truncate max-w-xs">{item.catatan_temuan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'realisasi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Target IKU</p><h3 className="text-3xl font-black text-slate-900">100%</h3></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Realisasi Rata-rata</p><h3 className={`text-3xl font-black ${getScoreTextColor(avgRealisasi)}`}>{avgRealisasi.toFixed(1)}%</h3></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Total Laporan</p><h3 className="text-3xl font-black text-blue-600">{riwayatList.length}</h3></div>
        </div>
      )}

      {activeSubTab === 'customize' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">Customize Kategori Kesiswaan</h3>
          <p className="text-xs text-slate-500">Gunakan program ini untuk mengatur indikator Kesiswaan secara spesifik.</p>
        </div>
      )}
    </div>
  );
}