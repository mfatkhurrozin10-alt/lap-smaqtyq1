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
import DashboardPantauanView from './views/DashboardPantauanView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard-pantauan');
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // STATE BARU: Untuk menyimpan ID program dan settingan tab saat diklik dari Laporan
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

  // Fungsi baru: Menangani pergantian tab dari sidebar agar mereset navParams
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setNavParams(null); // Reset parameter saat klik menu reguler di sidebar
  };

  // Fungsi baru: Menangkap sinyal klik dari tabel Laporan IKU
  const handleNavigateToKegiatan = (params: any) => {
    // 1. Simpan pengaturan untuk View Divisi
    setNavParams({
      initialProgramId: params.programId,
      initialTimeframe: params.timeframe,
      initialTab: 'riwayat' // Paksa langsung ke tab riwayat
    });
    
    // 2. Baca nama divisi dari parameter, lalu arahkan ke activeTab yang tepat
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
            onNavigateToDivisi={handleNavigateToKegiatan} // Menggunakan fungsi navigasi yang sudah ada!
          />
        );
      
      case 'laporan-iku':
        return (
          <LaporanIkuUnitView 
            showNotification={showNotification} 
            onNavigateToKegiatan={handleNavigateToKegiatan} // <- DISISIPKAN DI SINI
          />
        );

      case 'rekap-penilaian':
        return <KelolaNilaiView user={currentUser} showNotification={showNotification} />;
      
      case 'presensi-absensi':
        return <SistemAbsensiView user={currentUser} showNotification={showNotification} />;

      case 'tabungan-santri':
        return <KelolaTabunganAdminView user={currentUser} showNotification={showNotification} />;

      case 'poin-santri':
        return <KelolaPoinAdminView user={currentUser} showNotification={showNotification} />;

      case 'kelola-divisi':
        return <KelolaDivisiView showNotification={showNotification} />;

      // DIVISI KERJA (Tiap View ditambahkan props 'initialTab', 'initialTimeframe', dan 'initialProgramId')
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
      
      {/* Oper handleTabChange sebagai ganti setActiveTab agar state kereset saat pindah menu reguler */}
      <DashboardLayout activeTab={activeTab} setActiveTab={handleTabChange}>
        {renderContent()}
      </DashboardLayout>
    </>
  );
}