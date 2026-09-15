// src/components/ImportModal.tsx
import { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { loadSheetJS, downloadExcelTemplate } from '../utils/excel';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  templateFileName: string;
  templateHeaders: string[];
  templateSamples: string[][];
  onImport: (rows: any[]) => Promise<{ successCount: number; errorCount: number; message?: string }>;
  validatorAndMapper: (rawRow: string[]) => { valid: boolean; data?: any; error?: string };
}

export const ImportModal = ({
  isOpen, onClose, title, templateFileName, templateHeaders, templateSamples, onImport, validatorAndMapper
}: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedRows([]);
      setParseError(null);
      setImporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    const XLSX = await loadSheetJS();
    if (XLSX) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const matrix: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!matrix || matrix.length <= 1) {
            setParseError('File kosong atau hanya berisi baris judul header.');
            setParsedRows([]);
            return;
          }

          const dataLines = matrix.slice(1).filter((r: any[]) => r.some((c: any) => String(c).trim() !== ''));
          const mapped = dataLines.map((row: any[], index: number) => {
            const strRow = row.map((cell: any) => String(cell).trim());
            const result = validatorAndMapper(strRow);
            return { rowIndex: index + 2, raw: strRow, ...result };
          });

          setParsedRows(mapped);
        } catch (err: any) {
          setParseError('Gagal membaca berkas Excel: ' + (err.message || 'Format tidak didukung'));
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleProcessImport = async () => {
    const validItems = parsedRows.filter(r => r.valid).map(r => r.data);
    if (validItems.length === 0) {
      setParseError('Tidak ada baris data yang valid untuk diimpor.');
      return;
    }

    setImporting(true);
    setParseError(null);
    try {
      const res = await onImport(validItems);
      if (res.errorCount === 0) {
        onClose();
      } else {
        setParseError(`Berhasil mengimpor ${res.successCount} data. Ditemukan ${res.errorCount} data bermasalah.`);
      }
    } catch (err: any) {
      setParseError('Gagal memproses data: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden text-left">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Icons.FileSpreadsheet />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{title}</h3>
              <p className="text-xs text-slate-500">Unggah berkas Microsoft Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700">
            <Icons.X />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 rounded-xl border border-indigo-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Format Kolom Resmi</span>
              <p className="text-xs text-indigo-800">Unduh template Microsoft Excel yang telah disesuaikan.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadExcelTemplate(templateFileName, templateHeaders, templateSamples)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-lg border border-indigo-200 shadow-sm"
            >
              <Icons.Download /> Unduh Template
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icons.Upload /></div>
            <p className="text-sm font-semibold text-slate-800">{file ? file.name : 'Klik atau seret berkas Excel (.xlsx) ke sini'}</p>
          </div>

          {parseError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2"><Icons.AlertCircle />{parseError}</div>}

          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Preview Data ({parsedRows.length} Baris):</span>
                <div className="flex gap-2">
                  <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">{validCount} Valid</span>
                  {invalidCount > 0 && <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded">{invalidCount} Error</span>}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 font-semibold text-slate-500">
                    <tr><th className="px-3 py-2">Baris</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Data</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.valid ? '' : 'bg-rose-50/30'}>
                        <td className="px-3 py-2 font-mono">#{r.rowIndex}</td>
                        <td className="px-3 py-2">{r.valid ? 'Valid' : r.error}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{r.raw.join(' | ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600">Tutup</button>
          <button type="button" onClick={handleProcessImport} disabled={validCount === 0 || importing} className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">
            {importing ? 'Menyimpan...' : `Impor (${validCount}) Data`}
          </button>
        </div>
      </div>
    </div>
  );
};