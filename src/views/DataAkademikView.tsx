import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Icons } from '../Icons';
import { Card, Input, ImportModal, ConfirmModal } from '../components/UIComponents';

export default function DataAkademikView({ type, showNotification }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const tableName = type === 'ujian' ? 'ujian' : 'mapel';
  const titleName = type === 'ujian' ? 'Ujian / Asesmen' : 'Mata Pelajaran';

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const { data: res, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setData(res || []);
    } catch (err: any) {
      showNotification(err.message || `Gagal memuat data ${titleName}`, 'error');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { 
    setForm({});
    setEditingId(null);
    fetchData(); 
  }, [type]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from(tableName).update(form).eq('id', editingId);
        if (error) throw error;
        showNotification(`Berhasil memperbarui data ${titleName}!`, 'success');
        setEditingId(null);
      } else {
        const { error } = await supabase.from(tableName).insert([form]);
        if (error) throw error;
        showNotification(`Berhasil menambahkan data ${titleName}!`, 'success');
      }
      setForm({});
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menyimpan data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showNotification('Data berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message || 'Gagal menghapus data', 'error');
    }
  };

  const validateRow = (row: string[]) => {
    if (type === 'ujian') {
      const kode = row[0]?.trim();
      const nama_ujian = row[1]?.trim();
      if (!kode || !nama_ujian) return { valid: false, error: 'Kode atau Nama Ujian kosong' };
      return { valid: true, data: { kode, nama_ujian } };
    } else {
      const kode = row[0]?.trim();
      const nama_mapel = row[1]?.trim();
      const kkm = parseFloat(row[2]) || 75;
      if (!kode || !nama_mapel) return { valid: false, error: 'Kode atau Nama Mapel kosong' };
      return { valid: true, data: { kode, nama_mapel, kkm } };
    }
  };

  const handleImport = async (rows: any[]) => {
    const { error } = await supabase.from(tableName).insert(rows);
    if (error) {
      showNotification(error.message || 'Gagal mengimpor data', 'error');
      return { successCount: 0, errorCount: rows.length };
    }
    showNotification(`Berhasil mengimpor ${rows.length} data ${titleName}!`, 'success');
    fetchData();
    return { successCount: rows.length, errorCount: 0 };
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const keyword = search.toLowerCase();
      if (type === 'ujian') {
        return (item.nama_ujian || '').toLowerCase().includes(keyword) || (item.kode || '').toLowerCase().includes(keyword);
      } else {
        return (item.nama_mapel || '').toLowerCase().includes(keyword) || (item.kode || '').toLowerCase().includes(keyword);
      }
    });
  }, [data, search, type]);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Master Data {titleName}</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold border border-indigo-100">
              {data.length} Total
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola referensi acuan standar operasional akademik sekolah</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsImportOpen(true)} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Icons.Upload /> Impor Excel (.xlsx)
          </button>
          <button 
            onClick={fetchData} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Icons.Refresh /> Segarkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
        <div className="xl:col-span-1 w-full min-w-0">
          <Card 
            title={editingId ? `Edit ${titleName}` : `Tambah ${titleName}`} 
            subtitle="Formulir rincian data"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {type === 'ujian' ? (
                <>
                  <Input 
                    label="Kode Ujian" 
                    required 
                    value={form.kode || ''} 
                    onChange={(e: any) => setForm({...form, kode: e.target.value})} 
                    placeholder="Contoh: PTS-1" 
                  />
                  <Input 
                    label="Nama Ujian" 
                    required 
                    value={form.nama_ujian || ''} 
                    onChange={(e: any) => setForm({...form, nama_ujian: e.target.value})} 
                    placeholder="Contoh: Penilaian Tengah Semester" 
                  />
                </>
              ) : (
                <>
                  <Input 
                    label="Kode Mapel" 
                    required 
                    value={form.kode || ''} 
                    onChange={(e: any) => setForm({...form, kode: e.target.value})} 
                    placeholder="Contoh: KIM" 
                  />
                  <Input 
                    label="Nama Mata Pelajaran" 
                    required 
                    value={form.nama_mapel || ''} 
                    onChange={(e: any) => setForm({...form, nama_mapel: e.target.value})} 
                    placeholder="Contoh: Kimia" 
                  />
                  <Input 
                    label="KKM Standar" 
                    type="number"
                    required 
                    value={form.kkm || ''} 
                    onChange={(e: any) => setForm({...form, kkm: e.target.value})} 
                    placeholder="75" 
                  />
                </>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Menyimpan...' : editingId ? <><Icons.Edit /> Perbarui</> : <><Icons.Plus /> Tambah Baru</>}
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm">
                    Batal
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2 w-full min-w-0">
          <Card 
            title={`Daftar ${titleName}`}
            action={
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari data..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
              </div>
            }
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-y border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5">Kode</th>
                    <th className="px-4 sm:px-6 py-3.5">{type === 'ujian' ? 'Nama Ujian' : 'Mata Pelajaran'}</th>
                    {type === 'mapel' && <th className="px-4 sm:px-6 py-3.5 text-center">KKM</th>}
                    <th className="px-4 sm:px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Memuat data...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada data ditemukan</td></tr>
                  ) : (
                    filteredData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-mono text-xs font-bold text-indigo-600">{item.kode}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-slate-900">{type === 'ujian' ? item.nama_ujian : item.nama_mapel}</td>
                        {type === 'mapel' && <td className="px-4 sm:px-6 py-3.5 text-center font-bold text-slate-700">{item.kkm || 75}</td>}
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><Icons.Edit /></button>
                            <button onClick={() => setDeleteTarget(item)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl"><Icons.Trash /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title={`Impor Data ${titleName}`}
        templateFileName={`Template_${type}.xlsx`}
        templateHeaders={type === 'ujian' ? ['Kode', 'Nama Ujian'] : ['Kode', 'Nama Mapel', 'KKM']}
        templateSamples={type === 'ujian' ? [['PTS', 'Penilaian Tengah Semester']] : [['KIM', 'Kimia', '75']]}
        validatorAndMapper={validateRow}
        onImport={handleImport}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Data?"
        message={`Apakah Anda yakin ingin menghapus data ini?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}