// src/components/DashboardLayout.tsx
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
  Award
} from 'lucide-react';

export default function DashboardLayout({ activeTab, setActiveTab, children }: any) {
  
  // Fungsi kecil untuk mempermudah render menu
  const MenuItem = ({ id, icon, label, badge, badgeColor }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor || (isActive ? 'bg-white text-blue-600' : 'bg-slate-700 text-slate-300')}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const SubMenuItem = ({ icon, label }: any) => (
    <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left">
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#1e1e2f] flex flex-col h-full border-r border-slate-800 shrink-0">
        
        {/* Logo & Header Sidebar */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800 gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <h1 className="font-bold text-white text-sm tracking-wide truncate">SMP QTYQ 1 LILBANAT</h1>
            <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider truncate">Ledger Akademik</p>
          </div>
        </div>

        {/* Menu Navigasi Utama */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          
          <MenuItem id="dashboard-pantauan" icon={<LayoutDashboard size={20} />} label="Dashboard Pantauan" />
          <MenuItem id="laporan-iku" icon={<FileText size={20} />} label="Laporan IKU Unit" />
          
          {/* Badge angka dihilangkan agar seragam dan bersih */}
          <MenuItem id="rekap-penilaian" icon={<Users size={20} />} label="Rekap Penilaian" />
          <MenuItem id="presensi-absensi" icon={<UserCheck size={20} />} label="Presensi & Absensi" />
          
          <MenuItem id="tabungan-santri" icon={<CreditCard size={20} />} label="Tabungan Santri (NFC)" />
          <MenuItem id="poin-santri" icon={<Star size={20} />} label="Poin Santri" />
          <MenuItem id="kelola-divisi" icon={<Settings size={20} />} label="Kelola Divisi, IKU & Program" />

          {/* Sub Menu Divisi Kerja (IKU) */}
          <div className="mt-8 text-left">
            <p className="text-xs font-bold text-slate-500 mb-3 px-4 uppercase tracking-wider">DIVISI KERJA (IKU)</p>
            <SubMenuItem icon={<BookOpen size={16} />} label="Kurikulum" />
            <SubMenuItem icon={<Users size={16} />} label="Kesiswaan" />
            <SubMenuItem icon={<Globe size={16} />} label="Humas" />
            <SubMenuItem icon={<Archive size={16} />} label="Sarpras dan Bendahara" />
            <SubMenuItem icon={<Award size={16} />} label="Bahasa & Prestasi" />
            <SubMenuItem icon={<Briefcase size={16} />} label="Tata Usaha" />
          </div>
        </div>

        {/* Profil Admin Bawah */}
        <div className="p-4 border-t border-slate-800 bg-[#161623] shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-amber-950 font-black text-sm flex items-center justify-center shadow-md shrink-0">
              AD
            </div>
            <div className="overflow-hidden">
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
             <span className="text-sm font-semibold text-slate-600">{new Date().toLocaleDateString('id-ID')}</span>
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