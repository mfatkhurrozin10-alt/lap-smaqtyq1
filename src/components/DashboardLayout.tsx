// src/components/DashboardLayout.tsx
import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserCheck, 
  CreditCard, 
  Star, 
  Settings,
  BookOpen,
  Briefcase,
  Globe,
  Archive,
  Award,
  ShieldCheck,
  Library, 
  Menu,
  X
} from 'lucide-react';

export default function DashboardLayout({ activeTab, setActiveTab, children }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isExpanded = isHovered;

  const MenuItem = ({ id, icon, label }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setIsMobileOpen(false); 
        }}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all mb-1 overflow-hidden ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        title={!isExpanded ? label : ''}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0">{icon}</div>
          <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100 md:opacity-100' : 'opacity-100 md:opacity-0 md:w-0'} pointer-events-auto md:pointer-events-none`}>
            {label}
          </span>
        </div>
      </button>
    );
  };

  const SubMenuItem = ({ id, icon, label }: any) => {
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => {
          setActiveTab(id);
          setIsMobileOpen(false); 
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left overflow-hidden mb-1 ${
          isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title={!isExpanded ? label : ''}
      >
        <div className="shrink-0">{icon}</div>
        <span className={`text-[13px] whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100 md:opacity-100' : 'opacity-100 md:opacity-0 md:w-0'} pointer-events-auto md:pointer-events-none`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden relative">
      
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          ${isExpanded ? 'w-72' : 'w-20 md:w-20'} 
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          bg-[#1e1e2f] flex flex-col h-full border-r border-slate-800 shrink-0 
          transition-all duration-300 ease-in-out shadow-xl
        `}
      >
        <div className="h-20 flex items-center px-4 border-b border-slate-800 justify-between shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
            </div>
            <div className={`flex flex-col text-left overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100 md:opacity-100' : 'opacity-100 md:opacity-0 md:w-0'}`}>
              <h1 className="font-bold text-white text-xs tracking-wide truncate">SMA QT Yanbuul Quran 1</h1>
              <p className="text-[9px] text-blue-300 font-semibold uppercase tracking-wider truncate">Ledger Akademik</p>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar overflow-x-hidden">
          <MenuItem id="dashboard-pantauan" icon={<LayoutDashboard size={20} />} label="Dashboard Pantauan" />
          <MenuItem id="laporan-iku" icon={<FileText size={20} />} label="Laporan IKU Unit" />
          <MenuItem id="rekap-penilaian" icon={<Users size={20} />} label="Rekap Penilaian" />
          
          {/* Menu yang diubah & ditambahkan */}
          <MenuItem id="presensi-absensi" icon={<UserCheck size={20} />} label="Presensi Siswa" />
          <MenuItem id="rekap-global-guru" icon={<FileText size={20} />} label="Presensi Guru dan Tendik" />

          <MenuItem id="tabungan-santri" icon={<CreditCard size={20} />} label="Tabungan Santri (NFC)" />
          <MenuItem id="poin-santri" icon={<Star size={20} />} label="Poin Santri" />
          <MenuItem id="kelola-divisi" icon={<Settings size={20} />} label="Kelola Divisi, IKU & Program" />

          {/* Sub Menu Divisi Kerja (IKU) */}
          <div className="mt-8 text-left">
            <p className={`text-[10px] font-bold text-slate-500 mb-3 px-3 uppercase tracking-wider transition-opacity duration-200 ${isExpanded ? 'opacity-100 md:opacity-100' : 'opacity-100 md:opacity-0 md:h-0 md:overflow-hidden'}`}>
              DIVISI KERJA (IKU)
            </p>
            <SubMenuItem id="divisi-kepala-sekolah" icon={<ShieldCheck size={18} />} label="Kepala Sekolah" />
            <SubMenuItem id="divisi-kurikulum" icon={<BookOpen size={18} />} label="Kurikulum" />
            <SubMenuItem id="divisi-kesiswaan" icon={<Users size={18} />} label="Kesiswaan" />
            <SubMenuItem id="divisi-humas" icon={<Globe size={18} />} label="Humas" />
            <SubMenuItem id="divisi-sarpras" icon={<Archive size={18} />} label="Sarpras dan Bendahara" />
            <SubMenuItem id="divisi-bahasa" icon={<Award size={18} />} label="Bahasa & Prestasi" />
            <SubMenuItem id="divisi-tata-usaha" icon={<Briefcase size={18} />} label="Tata Usaha" />
            <SubMenuItem id="divisi-perpustakaan" icon={<Library size={18} />} label="Perpustakaan" />
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#161623] shrink-0 text-left overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-amber-950 font-black text-sm flex items-center justify-center shadow-md shrink-0">
              AD
            </div>
            <div className={`overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100 md:opacity-100' : 'opacity-100 md:opacity-0 md:w-0'}`}>
              <p className="text-sm font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-amber-400 font-semibold truncate">Akses Penuh</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 w-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 md:hidden transition-colors"
              title="Buka Menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-xs md:text-sm font-semibold text-slate-600">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as any)}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}