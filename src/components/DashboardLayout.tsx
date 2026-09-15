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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ activeTab, setActiveTab, children }: any) {
  // State untuk melacak apakah mouse sedang di atas sidebar atau sidebar dikunci terbuka
  const [isHovered, setIsHovered] = useState(false);
  const [isLockedOpen, setIsLockedOpen] = useState(false);

  // Sidebar aktif melebar jika sedang di-hover ATAU sedang dikunci
  const isExpanded = isHovered || isLockedOpen;

  const MenuItem = ({ id, icon, label }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all mb-1 overflow-hidden ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        title={!isExpanded ? label : ''}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0">{icon}</div>
          <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
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
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg transition-colors text-left overflow-hidden mb-1 ${
          isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title={!isExpanded ? label : ''}
      >
        <div className="shrink-0">{icon}</div>
        <span className={`text-[13px] whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      {/* SIDEBAR DENGAN EFEK HOVER MELEBAR & MENYEMPIT OTOMATIS */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${isExpanded ? 'w-72' : 'w-20'} bg-[#1e1e2f] flex flex-col h-full border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out z-30 shadow-xl`}
      >
        
        {/* Logo & Header Sidebar */}
        <div className="h-20 flex items-center px-4 border-b border-slate-800 justify-between shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
            </div>
            <div className={`flex flex-col text-left overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
              <h1 className="font-bold text-white text-xs tracking-wide truncate">SMA QT Yanbuul Quran 1</h1>
              <p className="text-[9px] text-blue-300 font-semibold uppercase tracking-wider truncate">Ledger Akademik</p>
            </div>
          </div>

          {/* Tombol Kunci Buka/Tutup Sidebar */}
          <button 
            onClick={() => setIsLockedOpen(!isLockedOpen)}
            className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shrink-0 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            title={isLockedOpen ? "Kunci Sidebar Tertutup" : "Kunci Sidebar Terbuka"}
          >
            {isLockedOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Menu Navigasi Utama */}
        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar overflow-x-hidden">
          
          <MenuItem id="dashboard-pantauan" icon={<LayoutDashboard size={20} />} label="Dashboard Pantauan" />
          <MenuItem id="laporan-iku" icon={<FileText size={20} />} label="Laporan IKU Unit" />
          
          <MenuItem id="rekap-penilaian" icon={<Users size={20} />} label="Rekap Penilaian" />
          <MenuItem id="presensi-absensi" icon={<UserCheck size={20} />} label="Presensi & Absensi" />
          
          <MenuItem id="tabungan-santri" icon={<CreditCard size={20} />} label="Tabungan Santri (NFC)" />
          <MenuItem id="poin-santri" icon={<Star size={20} />} label="Poin Santri" />
          <MenuItem id="kelola-divisi" icon={<Settings size={20} />} label="Kelola Divisi, IKU & Program" />

          {/* Sub Menu Divisi Kerja (IKU) */}
          <div className="mt-8 text-left">
            <p className={`text-[10px] font-bold text-slate-500 mb-3 px-3 uppercase tracking-wider transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              DIVISI KERJA (IKU)
            </p>
            <SubMenuItem id="divisi-kurikulum" icon={<BookOpen size={18} />} label="Kurikulum" />
            <SubMenuItem id="divisi-kesiswaan" icon={<Users size={18} />} label="Kesiswaan" />
            <SubMenuItem id="divisi-humas" icon={<Globe size={18} />} label="Humas" />
            <SubMenuItem id="divisi-sarpras" icon={<Archive size={18} />} label="Sarpras dan Bendahara" />
            <SubMenuItem id="divisi-bahasa" icon={<Award size={18} />} label="Bahasa & Prestasi" />
            <SubMenuItem id="divisi-tata-usaha" icon={<Briefcase size={18} />} label="Tata Usaha" />
          </div>
        </div>

        {/* Profil Admin Bawah */}
        <div className="p-3 border-t border-slate-800 bg-[#161623] shrink-0 text-left overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-amber-950 font-black text-sm flex items-center justify-center shadow-md shrink-0">
              AD
            </div>
            <div className={`overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
              <p className="text-sm font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-amber-400 font-semibold truncate">Akses Penuh</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        
        {/* Topbar Simulasi Browser */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
             <span className="text-sm font-semibold text-slate-600">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Area Konten Utama */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
          {children}
        </div>

      </main>
    </div>
  );
}