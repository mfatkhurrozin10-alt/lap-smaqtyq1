// src/views/DivisiHumasView.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function DivisiHumasView({ showNotification }: any) {
  const [loading, setLoading] = useState(true);
  const [divisiData, setDivisiData] = useState<any>({ nama_divisi: 'Humas', nama_koordinator: 'Tim Humas' });
  const [programList, setProgramList] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'riwayat' | 'realisasi' | 'customize'>('form');
  const [timeframe] = useState('Harian');
  const [formInput, setFormInput] = useState({ petugas_pj: '', guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [riwayatList, setRiwayatList] = useState<any[]>([]);

  const getScoreColorClass = (s: number) => s > 66 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : s > 33 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200';
  const getScoreTextColor = (s: number) => s > 66 ? 'text-emerald-600' : s > 33 ? 'text-amber-600' : 'text-rose-600';

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: divList } = await supabase.from('divisi').select('*');
      const targetDiv = divList?.find((d: any) => d.nama_divisi?.toLowerCase().includes('humas')) || divList?.[0];
      if (targetDiv) {
        setDivisiData(targetDiv);
        const { data: prog } = await supabase.from('program_kegiatan').select('*').eq('divisi_id', targetDiv.id);
        if (prog && prog.length > 0) {
          setProgramList(prog);
          setSelectedProgramId(prog[0].id);
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [timeframe]);

  const fetchProgramDetail = async () => {
    if (!selectedProgramId) return;
    try {
      const { data: kat } = await supabase.from('divisi_kategori_indikator').select('*, divisi_butir_ceklis(*)').eq('program_id', selectedProgramId);
      setKategoriList(kat || []);
      const { data: riw } = await supabase.from('divisi_log_pengawasan').select('*').eq('program_id', selectedProgramId).order('waktu_input', { ascending: false });
      setRiwayatList(riw || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchProgramDetail(); }, [selectedProgramId]);

  const calculateCurrentScore = () => {
    let total = 0, aktif = 0;
    kategoriList.forEach(k => k.divisi_butir_ceklis?.forEach((b: any) => { total++; if (checkedItems[b.id]) aktif++; }));
    const skor = total > 0 ? Number(((1 - (aktif / total)) * 100).toFixed(1)) : 100;
    return { skor, skala: Number((skor / 33.3).toFixed(2)) };
  };

  const { skor: currentSkor, skala: currentSkala } = calculateCurrentScore();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await supabase.from('divisi_log_pengawasan').insert([{
        program_id: selectedProgramId, waktu_input: new Date().toISOString(),
        petugas_pj: formInput.petugas_pj, guru_target: formInput.guru_target,
        catatan_temuan: formInput.catatan, skor_persen: currentSkor, detail_ceklis: checkedItems
      }]);
      showNotification('Laporan Humas berhasil disimpan!', 'success');
      setCheckedItems({}); setFormInput({ petugas_pj: '', guru_target: '', mapel_kelas: '', kelas_dipilih: '', catatan: '' });
      fetchProgramDetail(); setActiveSubTab('riwayat');
    } catch (err: any) { showNotification(err.message, 'error'); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Memuat data Divisi Humas...</div>;
  const avgRealisasi = riwayatList.length > 0 ? riwayatList.reduce((acc, curr) => acc + Number(curr.skor_persen), 0) / riwayatList.length : 0;

  return (
    <div className="space-y-6 w-full text-left pb-12 font-sans text-slate-800">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Divisi Humas</h2>
          <p className="text-sm text-slate-500">Koordinator: <span className="font-semibold text-slate-700">{divisiData?.nama_koordinator}</span></p>
        </div>
        <select value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none shadow-sm">
          {programList.map((p: any) => (<option key={p.id} value={p.id}>{p.nama_program}</option>))}
        </select>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveSubTab('form')} className={`px-4 py-2.5 rounded-xl text-sm font-bold ${activeSubTab === 'form' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>Form Ceklis</button>
        <button onClick={() => setActiveSubTab('riwayat')} className={`px-4 py-2.5 rounded-xl text-sm font-bold ${activeSubTab === 'riwayat' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>Riwayat ({riwayatList.length})</button>
        <button onClick={() => setActiveSubTab('realisasi')} className={`px-4 py-2.5 rounded-xl text-sm font-bold ${activeSubTab === 'realisasi' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>Realisasi</button>
      </div>

      {activeSubTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Informasi Kegiatan Kehumasan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Petugas Humas:</label><input type="text" value={formInput.petugas_pj} onChange={e => setFormInput({...formInput, petugas_pj: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Mitra / Sasaran:</label><input type="text" value={formInput.guru_target} onChange={e => setFormInput({...formInput, guru_target: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" required /></div>
            </div>
          </div>
          {kategoriList.map((kat: any) => (
            <div key={kat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800">{kat.nama_kategori}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {kat.divisi_butir_ceklis?.map((b: any) => (
                  <label key={b.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input type="checkbox" checked={!!checkedItems[b.id]} onChange={e => setCheckedItems({...checkedItems, [b.id]: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">{b.nama_butir}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <textarea value={formInput.catatan} onChange={e => setFormInput({...formInput, catatan: e.target.value})} placeholder="Catatan kegiatan..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none" />
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className={`px-4 py-1.5 border rounded-xl font-black text-sm ${getScoreColorClass(currentSkor)}`}>Skor: {currentSkor}% ({currentSkala} / 3.0)</div>
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md">Simpan Laporan</button>
            </div>
          </div>
        </form>
      )}

      {activeSubTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800">Riwayat Humas</h3></div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <tr><th className="px-6 py-4">Waktu</th><th className="px-6 py-4">Petugas</th><th className="px-6 py-4">Mitra/Sasaran</th><th className="px-6 py-4">Skor</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayatList.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs text-slate-600">{new Date(item.waktu_input).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 font-semibold">{item.petugas_pj}</td>
                  <td className="px-6 py-4">{item.guru_target}</td>
                  <td className={`px-6 py-4 font-black ${getScoreTextColor(Number(item.skor_persen))}`}>{item.skor_persen}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'realisasi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Target IKU</p><h3 className="text-3xl font-black text-slate-900">100%</h3></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Realisasi</p><h3 className={`text-3xl font-black ${getScoreTextColor(avgRealisasi)}`}>{avgRealisasi.toFixed(1)}%</h3></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Total Laporan</p><h3 className="text-3xl font-black text-blue-600">{riwayatList.length}</h3></div>
        </div>
      )}
    </div>
  );
}