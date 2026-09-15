// src/components/UIComponents.tsx
import { Icons } from '../Icons';

// Re-export komponen dan utilitas yang sudah dipisah agar file lain tidak error
export { downloadExcelTemplate, loadSheetJS } from '../utils/excel';
export { ImportModal } from './ImportModal';
export { ConfirmModal } from './ConfirmModal';

export const Notification = ({ message, type, onClose }: any) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className="fixed top-5 right-5 z-50">
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md max-w-md ${isError ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
        {isError ? <Icons.AlertCircle /> : <Icons.CheckCircle />}
        <p className="flex-1 text-xs md:text-sm font-semibold">{message}</p>
        <button onClick={onClose}><Icons.X /></button>
      </div>
    </div>
  );
};

export const Card = ({ title, subtitle, children, action }: any) => (
  <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden text-left">
    {(title || action) && (
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-slate-50/70 to-white">
        <div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-full sm:w-auto">{action}</div>
      </div>
    )}
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

export const Input = ({ label, helper, icon, ...props }: any) => (
  <div className="space-y-1.5 w-full text-left">
    {label && <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600`} {...props} />
    </div>
    {helper && <p className="text-[11px] text-slate-400">{helper}</p>}
  </div>
);

export const Select = ({ label, options = [], ...props }: any) => (
  <div className="space-y-1.5 w-full text-left">
    {label && <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</label>}
    <div className="relative">
      <select className="w-full px-4 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none pr-10 cursor-pointer" {...props}>
        <option value="" disabled>-- Pilih {label} --</option>
        {options.map((opt: any, i: number) => (<option key={i} value={opt.value}>{opt.label}</option>))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
    </div>
  </div>
);