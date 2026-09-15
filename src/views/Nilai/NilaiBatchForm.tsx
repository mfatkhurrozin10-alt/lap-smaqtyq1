// src/views/Nilai/NilaiBatchForm.tsx
import { useState } from 'react';
import { Icons } from '../../Icons';
import { Card, Input, Select } from '../../components/UIComponents';
import { getCurrentAcademicYear } from '../../services/supabase';

export default function NilaiBatchForm({
  form, setForm, handleMapelChange, filteredMapelOptions, options,
  isTeacherRole, availableClasses, studentsInSelectedClass,
  selectedMapel, bulkScore, setBulkScore, handleApplyBulkScore,
  handleDownloadClassTemplate, scores, handleScoreChange,
  setActiveTab, handleBatchSubmit, loading,
  selectedClasses, handleClassCheckboxChange, handleSelectAllClasses
}: any) {
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const onSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClasses.length === 0 || studentsInSelectedClass.length === 0) {
      alert('Pilih minimal satu kelas dan pastikan ada siswa.');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndSubmit = () => {
    setShowConfirmModal(false);
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleBatchSubmit(syntheticEvent);
  };

  return (
    <Card title="Formulir Perekaman Nilai Massal" subtitle="Konfigurasi di sebelah kiri, masukkan nilai banyak siswa dari beberapa kelas sekaligus di sebelah kanan">
      <form onSubmit={onSubmitClick} className="w-full">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
          
          {/* KOLOM KIRI: KONFIGURASI */}
          <div className="xl:col-span-4 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 h-fit w-full">
            <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">1. Konfigurasi Asesmen</h4>
            
            <Input 
              label="Tahun Ajaran" 
              required 
              value={form.tahun_ajaran} 
              onChange={(e: any) => setForm({...form, tahun_ajaran: e.target.value})} 
              placeholder={getCurrentAcademicYear()} 
            />
            
            <Select 
              label="Bulan Asesmen" 
              required 
              value={form.bulan} 
              onChange={(e: any) => setForm({...form, bulan: e.target.value})} 
              options={['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map(b => ({label: b, value: b}))} 
            />
            
            <Select 
              label="Jenis Asesmen" 
              required 
              value={form.ujian_id} 
              onChange={(e: any) => setForm({...form, ujian_id: e.target.value})} 
              options={options.ujian.map((u: any) => ({label: `${u.nama_ujian} (${u.kode || '-'})`, value: u.id}))} 
            />

            <Select 
              label="Mata Pelajaran" 
              required 
              value={form.mapel_id} 
              onChange={handleMapelChange} 
              options={filteredMapelOptions.map((m: any) => ({label: `${m.nama_mapel} (${m.kode || '-'} | KKM: ${m.kkm})`, value: m.id}))} 
            />

            {/* PILIH KELAS TARGET (CHECKBOX MULTI-SELECT) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-700">Pilih Kelas Target</label>
                {availableClasses.length > 0 && form.mapel_id && (
                  <button type="button" onClick={handleSelectAllClasses} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
                    {selectedClasses.length === availableClasses.length ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {!form.mapel_id ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
                  Pilih mata pelajaran terlebih dahulu.
                </div>
              ) : availableClasses.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
                  Tidak ada kelas tersedia.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white border-2 border-indigo-200 rounded-xl">
                  {availableClasses.map((cls: string) => {
                    const isChecked = selectedClasses.includes(cls);
                    return (
                      <label 
                        key={cls} 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleClassCheckboxChange(cls)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kelas {cls}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400">Bisa centang lebih dari 1 kelas untuk input nilai gabungan.</p>
            </div>

            {/* INPUT JUDUL MATERI (WAJIB & MAKSIMAL 25 KARAKTER) */}
            <div className="pt-1">
              <Input 
                label="Judul Materi / Keterangan Tugas" 
                required 
                maxLength={25}
                value={form.judul_materi} 
                onChange={(e: any) => {
                  if (e.target.value.length <= 25) {
                    setForm({...form, judul_materi: e.target.value});
                  }
                }} 
                placeholder="Maks 25 karakter (Cth: Bab 1)" 
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-400">Wajib diisi untuk membedakan nilai per materi.</span>
                <span className={`text-[10px] font-bold ${form.judul_materi.length === 25 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {form.judul_materi.length}/25
                </span>
              </div>
            </div>
            
            <div className="space-y-1.5 w-full text-left pt-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Guru Pengampu</label>
              <div className="relative">
                <select 
                  className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none appearance-none pr-10 ${isTeacherRole ? 'opacity-75 cursor-not-allowed bg-slate-100 font-bold text-indigo-900' : 'cursor-pointer'}`}
                  value={form.guru_id}
                  onChange={(e) => !isTeacherRole && setForm({...form, guru_id: e.target.value})}
                  disabled={isTeacherRole}
                  required
                >
                  <option value="" disabled>-- Pilih Guru Pengampu --</option>
                  {options.guru.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.niy || '-'})</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
              {isTeacherRole && <p className="text-[11px] text-indigo-600 font-medium">🔒 Terkunci otomatis pada akun Anda</p>}
            </div>
          </div>

          {/* KOLOM KANAN: TABEL PENGISIAN */}
          <div className="xl:col-span-8 space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>2. Lembar Input Data Siswa ({selectedClasses.length > 0 ? `Kelas: ${selectedClasses.join(', ')}` : 'Belum ada kelas dipilih'})</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">{studentsInSelectedClass.length} Siswa</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">KKM: <strong className="text-slate-800">{selectedMapel ? (selectedMapel as any).kkm : '-'}</strong></p>
              </div>

              {selectedClasses.length > 0 && studentsInSelectedClass.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    <input
                      type="number"
                      min="0" max="100"
                      placeholder="Skor seragam"
                      value={bulkScore}
                      onChange={(e) => setBulkScore(e.target.value)}
                      className="w-20 text-xs font-semibold px-2 py-1 outline-none"
                    />
                    <button type="button" onClick={handleApplyBulkScore} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded cursor-pointer">Isi Semua</button>
                  </div>
                  <button type="button" onClick={handleDownloadClassTemplate} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-sm cursor-pointer">
                    <Icons.Download /> Template Excel
                  </button>
                </div>
              )}
            </div>

            {selectedClasses.length === 0 ? (
              <div className="p-16 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-xs w-full">
                Silakan centang minimal satu <strong>Kelas Target</strong> di sebelah kiri untuk menampilkan daftar siswa.
              </div>
            ) : studentsInSelectedClass.length === 0 ? (
              <div className="p-16 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-xs w-full">
                Tidak ada data siswa yang terdaftar di kelas yang dipilih.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl max-h-[500px] overflow-auto bg-white shadow-sm w-full">
                <table className="w-full text-left text-xs whitespace-nowrap min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 uppercase tracking-wider z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">NIS</th>
                      <th className="px-4 py-3">Nama Lengkap Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 w-36 text-center">Nilai (0-100)</th>
                      <th className="px-4 py-3 text-center">KKM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsInSelectedClass.map((student: any, idx: number) => {
                      const scoreVal = scores[student.id] || '';
                      const numScore = parseFloat(scoreVal);
                      const kkm = (selectedMapel as any)?.kkm || 75;
                      const hasValue = scoreVal !== '' && !isNaN(numScore);
                      const isPass = hasValue && numScore >= kkm;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-600">{student.nis}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{student.nama}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {student.kelas}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="0" max="100" step="0.1"
                              placeholder="0 - 100"
                              value={scoreVal}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-28 px-3 py-1.5 border border-slate-300 focus:border-indigo-600 rounded-lg text-sm font-bold text-slate-800 text-center outline-none bg-slate-50/50 focus:bg-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasValue ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {isPass ? 'Tuntas' : 'Remedial'}
                              </span>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedClasses.length > 0 && studentsInSelectedClass.length > 0 && (
              <div className="pt-2 flex justify-end gap-3 w-full">
                <button type="button" onClick={() => setActiveTab('dashboard')} className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={loading || studentsInSelectedClass.length === 0} className="py-2.5 px-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                  {loading ? 'Menyimpan Nilai...' : <><Icons.Award /> Simpan Nilai Massal ({studentsInSelectedClass.length} Siswa)</>}
                </button>
              </div>
            )}
          </div>

        </div>
      </form>

      {/* POP-UP MODAL KONFIRMASI SIMPAN NILAI */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Icons.Award />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Konfirmasi Penyimpanan Nilai</h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda akan merekam nilai untuk <strong className="text-indigo-600">{studentsInSelectedClass.length} siswa</strong> dari kelas <strong>{selectedClasses.join(', ')}</strong> dengan judul materi: <span className="italic font-semibold text-slate-800">"{form.judul_materi || '-'}"</span>. Lanjutkan?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button 
                type="button" 
                onClick={confirmAndSubmit}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ya, Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
}