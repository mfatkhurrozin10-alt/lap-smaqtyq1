// src/App.tsx
import { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import { Notification } from './components/UIComponents';
import KelolaDivisiView from './views/KelolaDivisiView';

// Mengimpor View dari file lama Anda
import KelolaNilaiView from './views/KelolaNilaiView';
import KelolaKehadiranAdminView from './views/KelolaKehadiranAdminView';
import KelolaTabunganAdminView from './views/KelolaTabunganAdminView';
import KelolaPoinAdminView from './views/KelolaPoinAdminView';

export default function App() {
  // Set default menu yang terbuka
  const [activeTab, setActiveTab] = useState('tabungan-santri');
  
  // State untuk notifikasi 
  const [notification, setNotification] = useState({ message: '', type: '' });

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  // Akun admin default agar komponen lama tetap berjalan normal tanpa login
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
        return (
          <KelolaNilaiView 
            user={currentUser} 
            showNotification={showNotification} 
          />
        );
      
      case 'presensi-absensi':
        return (
          <KelolaKehadiranAdminView 
            user={currentUser} 
            showNotification={showNotification} 
          />
        );

      case 'tabungan-santri':
        // Memanggil komponen Tabungan yang sudah terhubung ke Google Sheets & Supabase
        return (
          <KelolaTabunganAdminView 
            user={currentUser} 
            showNotification={showNotification} 
          />
        );

      case 'poin-santri':
        // Memanggil komponen Poin BK/Pelanggaran yang sudah terhubung ke Supabase
        return (
          <KelolaPoinAdminView 
            user={currentUser} 
            showNotification={showNotification} 
          />
        );

      case 'laporan-iku':
      case 'kelola-divisi':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Sedang Dalam Pengembangan</h2>
              <p className="text-slate-500 mt-2">Menu ini akan dirakit pada tahap selanjutnya.</p>
            </div>
          </div>
        );

      default:
        return null;
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