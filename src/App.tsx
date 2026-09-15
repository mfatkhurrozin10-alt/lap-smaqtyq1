// src/App.tsx
import { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';

// Nanti kita akan buat komponen-komponen ini satu per satu
// import DashboardPantauanView from './views/DashboardPantauanView';
// import RekapPenilaianView from './views/RekapPenilaianView';
// import PresensiAbsensiView from './views/PresensiAbsensiView';

export default function App() {
  // Set default menu yang terbuka pertama kali
  const [activeTab, setActiveTab] = useState('dashboard-pantauan');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard-pantauan':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">Halaman Dashboard Pantauan</h2>
            <p className="text-slate-500">Tampilan desain segera dibuat di sini...</p>
          </div>
        );
      case 'rekap-penilaian':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">Halaman Rekap Penilaian</h2>
            <p className="text-slate-500">Tampilan tabel nilai Anda yang lama akan dipindah ke sini...</p>
          </div>
        );
      case 'presensi-absensi':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">Halaman Presensi & Absensi</h2>
            <p className="text-slate-500">Sistem absensi Anda yang lama akan dipindah ke sini...</p>
          </div>
        );
      // Tambahkan case lain sesuai menu sidebar nanti
      default:
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">Halaman Belum Tersedia</h2>
          </div>
        );
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}