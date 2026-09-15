// src/components/ConfirmModal.tsx
import { Icons } from '../Icons';

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Hapus' }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left">
        <div className="flex items-center gap-3 text-rose-600 mb-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center"><Icons.AlertCircle /></div>
          <h4 className="text-lg font-bold text-slate-800">{title}</h4>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium">Batal</button>
          <button onClick={onConfirm} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};