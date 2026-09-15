// src/App.tsx
import { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import { Notification } from './components/UIComponents';

// Mengimpor View 
import KelolaNilaiView from './views/KelolaNilaiView';
import KelolaKehadiranAdminView from './views/KelolaKehadiranAdminView';
import KelolaTabunganAdminView from './views/KelolaTabunganAdminView';
import KelolaPoinAdminView from './views/KelolaPoinAdminView';
import KelolaDivisiView from './views/KelolaDivisiView';
import DivisiKurikulumView from './views/DivisiKurikulumView';

export default function App() {
  // Kita set default langsung ke divisi-kurikulum agar langsung terlihat
  const [activeTab, setActiveTab] = useState('divisi-kurikulum');
  const [notification, setNotification] = useState({ message: '', type: '' });

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const currentUser = {
    id: 'admin-123',
    nama: 'Administrator',
    role: 'admin'
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard-pantauan':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Dashboard Pantauan Sekolah</h2>
              <p className="text-slate-500 mt-2">Tampilan Dashboard utama akan didesain di sini...</p>
            </div>
          </div>
        );
      
      case 'rekap-penilaian':
        return <KelolaNilaiView user={currentUser} showNotification={showNotification} />;
      
      case 'presensi-absensi':
        return <KelolaKehadiranAdminView user={currentUser} showNotification={showNotification} />;

      case 'tabungan-santri':
        return <KelolaTabunganAdminView user={currentUser} showNotification={showNotification} />;

      case 'poin-santri':
        return <KelolaPoinAdminView user={currentUser} showNotification={showNotification} />;

      case 'kelola-divisi':
        return <KelolaDivisiView showNotification={showNotification} />;

      // ROUTE UTAMA DIVISI KURIKULUM YANG SEBELUMNYA TERLEWAT
      case 'divisi-kurikulum':
        return <DivisiKurikulumView showNotification={showNotification} />;

      case 'laporan-iku':
      case 'divisi-kesiswaan':
      case 'divisi-humas':
      case 'divisi-sarpras':
      case 'divisi-bahasa':
      case 'divisi-tata-usaha':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Sedang Dalam Pengembangan</h2>
              <p className="text-slate-500 mt-2">Menu divisi ini akan segera menyusul dengan sistem yang serupa.</p>
            </div>
          </div>
        );

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
      
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </DashboardLayout>
    </>
  );
}