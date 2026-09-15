// src/views/KelolaDivisiView.tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Settings } from 'lucide-react';

export default function KelolaDivisiView({ showNotification }: any) {
  const [activeTab, setActiveTab] = useState<'divisi' | 'iku' | 'program'>('divisi');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Data States
  const [divisiList, setDivisiList] = useState<any[]>([]);
  const [ikuList, setIkuList] = useState<any[]>([]);
  const [programList, setProgramList] = useState<any[]>([]);

  // Filter States
  const [filterDivisi, setFilterDivisi] = useState('ALL');

  // Modal States
  const [modalType, setModalType] = useState<'divisi' | 'iku' | 'program' | null>(null);
  
  // Form States
  const [formDivisi, setFormDivisi] = useState({ kode_divisi: '', nama_divisi: '', nama_koordinator: '' });
  const [formIku, setFormIku] = useState({ divisi_id: '', kode_iku: '', judul_iku: '' });
  const [formProgram, setFormProgram] = useState({ divisi_id: '', iku_id: '', nama_program: '', timeframe: 'Harian', target_capaian: '100%' });

  // Fetch Data
  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [rDivisi, rIku, rProgram] = await Promise.all([
        supabase.from('divisi').select('*').order('created_at', { ascending: true }),
        supabase.from('indikator_iku').select('*, divisi(nama_divisi)').order('created_at', { ascending: true }),
        supabase.from('program_kegiatan').select('*, divisi(nama_divisi), indikator_iku(judul_iku)').order('created_at', { ascending: true })
      ]);
      setDivisiList(rDivisi.data || []);
      setIkuList(rIku.data || []);
      setProgramList(rProgram.data || []);
    } catch (err: any) {
      showNotification(err.message || 'Gagal memuat data', 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter Data
  const filteredIku = useMemo(() => {
    return ikuList.filter(item => filterDivisi === 'ALL' || item.divisi_id === filterDivisi);
  }, [ikuList, filterDivisi]);

  const filteredProgram = useMemo(() => {
    return programList.filter(item => filterDivisi === 'ALL' || item.divisi_id === filterDivisi);
  }, [programList, filterDivisi]);

  // Handlers Submit Form
  const handleSubmitDivisi = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('divisi').insert([formDivisi]);
      if (error) throw error;
      showNotification('Divisi berhasil ditambahkan', 'success');
      setModalType(null);
      setFormDivisi({ kode_divisi: '', nama_divisi: '', nama_koordinator: '' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitIku = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('indikator_iku').insert([formIku]);
      if (error) throw error;
      showNotification('Indikator IKU berhasil ditambahkan', 'success');
      setModalType(null);
      setFormIku({ divisi_id: '', kode_iku: '', judul_iku: '' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProgram = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formProgram,
        iku_id: formProgram.iku_id === '' ? null : formProgram.iku_id
      };
      const { error } = await supabase.from('program_kegiatan').insert([payload]);
      if (error) throw error;
      showNotification('Program berhasil ditambahkan', 'success');
      setModalType(null);
      setFormProgram({ divisi_id: '', iku_id: '', nama_program: '', timeframe: 'Harian', target_capaian: '100%' });
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler Delete
  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      showNotification('Data berhasil dihapus', 'success');
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-indigo-600" />
            Manajemen Master Divisi, IKU & Program
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kelola data master sistem monitoring pendidikan secara langsung ke database Supabase</p>
        </div>
        <button 
          onClick={() => setModalType(activeTab)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"
        >
          <Icons.Plus /> 
          Tambah {activeTab === 'divisi' ? 'Divisi Baru' : activeTab === 'iku' ? 'Indikator IKU' : 'Program Baru'}
        </button>
      </div>

      {/* Tabs & Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6">
          <button 
            onClick={() => setActiveTab('divisi')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'divisi' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Divisi Kerja ({divisiList.length})
          </button>
          <button 
            onClick={() => setActiveTab('iku')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'iku' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Indikator IKU ({ikuList.length})
          </button>
          <button 
            onClick={() => setActiveTab('program')}
            className={`pb-3 text-sm font-bold transition-all ${activeTab === 'program' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Program Kegiatan ({programList.length})
          </button>
        </div>

        {/* Filter Dropdown */}
        {(activeTab === 'iku' || activeTab === 'program') && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Divisi:</span>
            <select 
              value={filterDivisi} 
              onChange={(e) => setFilterDivisi(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none w-48 shadow-sm"
            >
              <option value="ALL">Semua Divisi ({divisiList.length})</option>
              {divisiList.map(d => (
                <option key={d.id} value={d.id}>{d.nama_divisi}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dynamic Table Area */}
        <div className="w-full overflow-x-auto min-h-[300px]">
          {fetchLoading ? (
            <div className="p-12 text-center text-slate-400">Memuat data...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                
                {/* Header Divisi */}
                {activeTab === 'divisi' && (
                  <tr>
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Kode</th>
                    <th className="px-6 py-4">Nama Divisi</th>
                    <th className="px-6 py-4">Koordinator</th>
                    <th className="px-6 py-4 text-center">Total IKU</th>
                    <th className="px-6 py-4 text-center">Total Program</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                )}

                {/* Header IKU */}
                {activeTab === 'iku' && (
                  <tr>
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Kode IKU</th>
                    <th className="px-6 py-4">Indikator Kinerja Utama</th>
                    <th className="px-6 py-4">Divisi</th>
                    <th className="px-6 py-4 text-center">Program</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                )}

                {/* Header Program */}
                {activeTab === 'program' && (
                  <tr>
                    <th className="px-6 py-4">No</th>
                    <th className="px-6 py-4">Nama Program Kegiatan</th>
                    <th className="px-6 py-4">Divisi</th>
                    <th className="px-6 py-4">IKU Terkait</th>
                    <th className="px-6 py-4">Timeframe</th>
                    <th className="px-6 py-4">Target</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {/* Body Divisi */}
                {activeTab === 'divisi' && divisiList.map((item, idx) => {
                  const totalIku = ikuList.filter(i => i.divisi_id === item.id).length;
                  const totalProgram = programList.filter(p => p.divisi_id === item.id).length;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-blue-700">{item.kode_divisi}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{item.nama_divisi}</td>
                      <td className="px-6 py-4 text-slate-600">{item.nama_koordinator || '-'}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{totalIku}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{totalProgram}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleDelete('divisi', item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Icons.Trash /></button>
                      </td>
                    </tr>
                  );
                })}

                {/* Body IKU */}
                {activeTab === 'iku' && filteredIku.map((item, idx) => {
                  const totalProgram = programList.filter(p => p.iku_id === item.id).length;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-blue-700">{item.kode_iku}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 whitespace-normal min-w-[250px]">{item.judul_iku}</td>
                      <td className="px-6 py-4 text-slate-500">{item.divisi?.nama_divisi || '-'}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{totalProgram}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleDelete('indikator_iku', item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Icons.Trash /></button>
                      </td>
                    </tr>
                  );
                })}

                {/* Body Program */}
                {activeTab === 'program' && filteredProgram.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{item.nama_program}</td>
                    <td className="px-6 py-4 text-slate-500">{item.divisi?.nama_divisi || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-normal min-w-[200px]">
                      {item.indikator_iku ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-600">Terikat IKU</span>
                          <span className="text-xs">{item.indikator_iku.judul_iku}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">Umum Divisi / Tanpa IKU</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{item.timeframe}</td>
                    <td className="px-6 py-4 font-semibold text-blue-700">{item.target_capaian}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete('program_kegiatan', item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Icons.Trash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL TAMBAH DATA --- */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Tambah Data Baru: {modalType === 'divisi' ? 'Divisi Kerja' : modalType === 'iku' ? 'Indikator IKU' : 'Program Kegiatan'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700"><Icons.X /></button>
            </div>

            <div className="p-6">
              {modalType === 'divisi' && (
                <form onSubmit={handleSubmitDivisi} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Divisi</label>
                    <input type="text" required value={formDivisi.nama_divisi} onChange={e => setFormDivisi({...formDivisi, nama_divisi: e.target.value})} placeholder="Contoh: Kurikulum, Kesiswaan..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode Divisi</label>
                    <input type="text" required value={formDivisi.kode_divisi} onChange={e => setFormDivisi({...formDivisi, kode_divisi: e.target.value.toUpperCase()})} placeholder="Contoh: KUR, KES..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Koordinator</label>
                    <input type="text" value={formDivisi.nama_koordinator} onChange={e => setFormDivisi({...formDivisi, nama_koordinator: e.target.value})} placeholder="Nama lengkap koordinator..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600">Batal</button>
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">Simpan Divisi</button>
                  </div>
                </form>
              )}

              {modalType === 'iku' && (
                <form onSubmit={handleSubmitIku} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Divisi Penanggung Jawab</label>
                    <select required value={formIku.divisi_id} onChange={e => setFormIku({...formIku, divisi_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Pilih Divisi --</option>
                      {divisiList.map(d => <option key={d.id} value={d.id}>{d.nama_divisi} ({d.kode_divisi})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode IKU</label>
                    <input type="text" required value={formIku.kode_iku} onChange={e => setFormIku({...formIku, kode_iku: e.target.value.toUpperCase()})} placeholder="Contoh: IKU-KUR-01..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul / Rumusan Indikator IKU</label>
                    <textarea required value={formIku.judul_iku} onChange={e => setFormIku({...formIku, judul_iku: e.target.value})} placeholder="Tuliskan indikator sasaran kinerja..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600">Batal</button>
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">Simpan IKU</button>
                  </div>
                </form>
              )}

              {modalType === 'program' && (
                <form onSubmit={handleSubmitProgram} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Divisi Pelaksana</label>
                    <select required value={formProgram.divisi_id} onChange={e => setFormProgram({...formProgram, divisi_id: e.target.value, iku_id: ''})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Pilih Divisi --</option>
                      {divisiList.map(d => <option key={d.id} value={d.id}>{d.nama_divisi} ({d.kode_divisi})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Indikator IKU Terkait</label>
                    <select value={formProgram.iku_id} onChange={e => setFormProgram({...formProgram, iku_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={!formProgram.divisi_id}>
                      <option value="">(Umum Divisi / Tanpa IKU Khusus)</option>
                      {ikuList.filter(i => i.divisi_id === formProgram.divisi_id).map(i => (
                        <option key={i.id} value={i.id}>[{i.kode_iku}] {i.judul_iku.substring(0, 40)}...</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul Program Kegiatan</label>
                    <input type="text" required value={formProgram.nama_program} onChange={e => setFormProgram({...formProgram, nama_program: e.target.value})} placeholder="Contoh: Monitoring KBM, Klinik Belajar..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timeframe</label>
                      <select required value={formProgram.timeframe} onChange={e => setFormProgram({...formProgram, timeframe: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Harian">Harian</option>
                        <option value="Mingguan">Mingguan</option>
                        <option value="Bulanan">Bulanan</option>
                        <option value="Semesteran">Semesteran</option>
                        <option value="Tahunan">Tahunan</option>
                        <option value="Insidental">Insidental</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Capaian</label>
                      <input type="text" required value={formProgram.target_capaian} onChange={e => setFormProgram({...formProgram, target_capaian: e.target.value})} placeholder="Contoh: 100%, 4 Kali..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600">Batal</button>
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">Simpan Program</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}