// src/App.tsx
import { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import { Notification } from './components/UIComponents';

// Mengimpor View Utama & Divisi Kerja
import KelolaNilaiView from './views/KelolaNilaiView';
import SistemAbsensiView from './views/SistemAbsensiView'; 
import KelolaTabunganAdminView from './views/KelolaTabunganAdminView';
import KelolaPoinAdminView from './views/KelolaPoinAdminView';
import KelolaDivisiView from './views/KelolaDivisiView';
import LaporanIkuUnitView from './views/LaporanIkuUnitView';

// Mengimpor Masing-Masing View Divisi Kerja (IKU)
import DivisiKepalaSekolahView from './views/DivisiKepalaSekolahView';
import DivisiKurikulumView from './views/DivisiKurikulumView';
import DivisiKesiswaanView from './views/DivisiKesiswaanView';
import DivisiHumasView from './views/DivisiHumasView';
import DivisiSarprasView from './views/DivisiSarprasView';
import DivisiBahasaView from './views/DivisiBahasaView';
import DivisiTataUsahaView from './views/DivisiTataUsahaView';
import DivisiPerpustakaanView from './views/DivisiPerpustakaanView'; // <-- Import View Perpustakaan
import DashboardPantauanView from './views/DashboardPantauanView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard-pantauan');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [sharedNilaiProgress, setSharedNilaiProgress] = useState({ persentase: '0.0', terpenuhi: 0, totalTarget: 0 });

  const [navParams, setNavParams] = useState<any>(null);

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const currentUser = {
    id: 'admin-123',
    nama: 'Administrator',
    role: 'admin'
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setNavParams(null);
  };

  const handleNavigateToKegiatan = (params: any) => {
    setNavParams({
      initialProgramId: params.programId,
      initialTimeframe: params.timeframe,
      initialTab: 'riwayat'
    });
    
    const divName = (params.namaDivisi || '').toLowerCase();
    
    if (divName.includes('kepala sekolah')) {
      setActiveTab('divisi-kepala-sekolah');
    } else if (divName.includes('kurikulum')) {
      setActiveTab('divisi-kurikulum');
    } else if (divName.includes('kesiswaan')) {
      setActiveTab('divisi-kesiswaan');
    } else if (divName.includes('humas')) {
      setActiveTab('divisi-humas');
    } else if (divName.includes('sarpras') || divName.includes('bendahara')) {
      setActiveTab('divisi-sarpras');
    } else if (divName.includes('bahasa') || divName.includes('prestasi')) {
      setActiveTab('divisi-bahasa');
    } else if (divName.includes('tata usaha') || divName.includes('tu')) {
      setActiveTab('divisi-tata-usaha');
    } else if (divName.includes('perpustakaan') || divName.includes('perpus')) {
      setActiveTab('divisi-perpustakaan'); // <-- Mapping navigasi perpustakaan
    } else {
      showNotification(`Menu untuk divisi "${params.namaDivisi}" belum dipetakan.`, 'error');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard-pantauan':
        return (
          <DashboardPantauanView 
            showNotification={showNotification} 
            onNavigateToDivisi={handleNavigateToKegiatan} 
            onNavigateToNilai={() => setActiveTab('rekap-penilaian')}
            sharedNilaiProgress={sharedNilaiProgress} 
          />
        );
      
      case 'laporan-iku':
        return (
          <LaporanIkuUnitView 
            showNotification={showNotification} 
            onNavigateToKegiatan={handleNavigateToKegiatan} 
          />
        );

      case 'rekap-penilaian':
        return (
          <KelolaNilaiView 
            user={currentUser} 
            showNotification={showNotification} 
            onUpdateProgress={(prog: any) => setSharedNilaiProgress(prog)} 
          />
        );
      
      case 'presensi-absensi':
        return <SistemAbsensiView user={currentUser} showNotification={showNotification} />;

      case 'tabungan-santri':
        return <KelolaTabunganAdminView user={currentUser} showNotification={showNotification} />;

      case 'poin-santri':
        return <KelolaPoinAdminView user={currentUser} showNotification={showNotification} />;

      case 'kelola-divisi':
        return <KelolaDivisiView showNotification={showNotification} />;

      case 'divisi-kepala-sekolah':
        return <DivisiKepalaSekolahView showNotification={showNotification} {...navParams} />;

      case 'divisi-kurikulum':
        return <DivisiKurikulumView showNotification={showNotification} {...navParams} />;

      case 'divisi-kesiswaan':
        return <DivisiKesiswaanView showNotification={showNotification} {...navParams} />;

      case 'divisi-humas':
        return <DivisiHumasView showNotification={showNotification} {...navParams} />;

      case 'divisi-sarpras':
        return <DivisiSarprasView showNotification={showNotification} {...navParams} />;

      case 'divisi-bahasa':
        return <DivisiBahasaView showNotification={showNotification} {...navParams} />;

      case 'divisi-tata-usaha':
        return <DivisiTataUsahaView showNotification={showNotification} {...navParams} />;

      case 'divisi-perpustakaan': // <-- Render View Perpustakaan
        return <DivisiPerpustakaanView showNotification={showNotification} {...navParams} />;

      default:
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onClose={() => setNotification({ message: '', type: '' })} 
      />
      
      <DashboardLayout activeTab={activeTab} setActiveTab={handleTabChange}>
        {renderContent()}
      </DashboardLayout>
    </>
  );
}