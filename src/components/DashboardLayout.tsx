// src/components/DashboardLayout.tsx
import { useState } from 'react';
import { Icons } from '../Icons';
import { getCurrentAcademicYear } from '../services/supabase';

export default function DashboardLayout({ user, activeTab, setActiveTab, navSections, onLogout, children }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isWaliKelas = user?.role === 'wali_kelas';
  const isBk = user?.role === 'bk';
  const isSiswa = user?.role === 'siswa';

  const getRoleBadgeInfo = () => {
    if (isAdmin) return { label: 'Administrator', color: 'text-purple-600' };
    if (isWaliKelas) return { label: `Wali Kelas ${user?.kelas_binaan || ''}`, color: 'text-emerald-600' };
    if (isBk) return { label: 'Guru BK', color: 'text-blue-600' };
    if (isSiswa) return { label: `Siswa Kelas ${user?.kelas || ''}`, color: 'text-indigo-600' };
    return { label: 'Guru Pengajar', color: 'text-indigo-600' };
  };
  const roleInfo = getRoleBadgeInfo();

  const getActiveLabel = () => {
    if (!navSections) return 'Portal Akademik';
    for (const section of navSections) {
      const found = section.items?.find((i: any) => i.id === activeTab);
      if (found) return found.label;
    }
    return 'Portal Akademik';
  };

  return (
    <div className="flex h-screen bg-slate-100/60 text-slate-900 font-sans overflow-hidden text-left w-full relative">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="h-20 flex items-center px-5 sm:px-6 border-b border-slate-100 gap-3.5 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center p-2 overflow-hidden shrink-0">
            <img src="/logo-sekolah.png" alt="Logo Sekolah" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate block">SIAKAD<span className="text-indigo-600">.</span></span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
              {isAdmin ? 'Admin Panel' : isBk ? 'Portal BK' : isSiswa ? 'Portal Siswa' : 'Portal Guru'}
            </p>
          </div>
          <button className="ml-auto lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg shrink-0 cursor-pointer" onClick={() => setSidebarOpen(false)}>
            <Icons.X />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3.5 space-y-4">
          {navSections && navSections.map((section: any, sIdx: number) => (
            <div key={sIdx} className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-1">
                {section.category}
              </div>
              
              {section.items.map((item: any) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.icon}</div>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.nama ? user.nama.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="min-w-0 text-left flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.nama || 'Pengguna'}</p>
              <p className={`text-[10px] font-semibold truncate ${roleInfo.color}`}>{roleInfo.label}</p>
            </div>
          </div>
          <button onClick={onLogout} title="Keluar" className="p-2 text-slate-400 hover:text-rose-600 rounded-lg shrink-0 cursor-pointer">
            <Icons.LogOut />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-100/50 w-full">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30 w-full gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 lg:hidden shrink-0 cursor-pointer"><Icons.Menu /></button>
            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{getActiveLabel()}</span>
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 shrink-0 hidden sm:inline">Tahun Akademik: <strong className="text-slate-700">{getCurrentAcademicYear()}</strong></span>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 w-full">
          <div className="w-full pb-12">{children}</div>
        </div>
      </main>
    </div>
  );
}