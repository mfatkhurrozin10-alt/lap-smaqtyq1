// src/App.tsx
import { useState } from 'react';
import { getCurrentUser, clearUserSession } from './services/auth';
import { Icons } from './Icons';
import { Notification } from './components/UIComponents';
import LoginView from './auth/LoginView';

// Komponen Layout Terpisah
import { ErrorBoundary } from './components/ErrorBoundary';
import DashboardLayout from './components/DashboardLayout';

// Daftar Views
import DashboardAdminView from './views/DashboardAdminView';
import DashboardWaliKelasView from './views/DashboardWaliKelasView';
import DashboardSiswaView from './views/DashboardSiswaView';
import DataGuruView from './views/DataGuruView';
import DataSiswaView from './views/DataSiswaView';
import DataAkademikView from './views/DataAkademikView';
import DataMasterPoinView from './views/DataMasterPoinView';
import PenugasanGuruView from './views/PenugasanGuruView';
import PenugasanBkView from './views/PenugasanBkView';
import KelolaNilaiView from './views/KelolaNilaiView';
import InputKehadiranView from './views/InputKehadiranView';
import RekapKehadiranView from './views/RekapKehadiranView';
import InputPoinKasusView from './views/InputPoinKasusView';

// View Baru untuk Admin & BK
import KelolaKehadiranAdminView from './views/KelolaKehadiranAdminView';
import KelolaPoinAdminView from './views/KelolaPoinAdminView';
import KelolaTabunganAdminView from './views/KelolaTabunganAdminView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(getCurrentUser());
  const [activeTab, setActiveTab] = useState(
    currentUser?.role && currentUser.role !== 'admin' 
      ? (currentUser.role === 'bk' ? 'bk-kehadiran' : currentUser.role === 'siswa' ? 'siswa-portal' : 'nilai') 
      : 'home'
  );
  const [notification, setNotification] = useState({ message: '', type: '' });

  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
    showNotification('Berhasil keluar dari sistem', 'success');
  };

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
        <LoginView onLoginSuccess={(user: any) => { 
          setCurrentUser(user); 
          setActiveTab(user.role && user.role !== 'admin' ? (user.role === 'bk' ? 'bk-kehadiran' : user.role === 'siswa' ? 'siswa-portal' : 'nilai') : 'home'); 
        }} showNotification={showNotification} />
      </ErrorBoundary>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const isWaliKelas = currentUser.role === 'wali_kelas';
  const isBk = currentUser.role === 'bk';
  const isSiswa = currentUser.role === 'siswa';

  let navSections: any[] = [];
  if (isAdmin) {
    navSections = [
      {
        category: 'Utama',
        items: [
          { id: 'home', label: 'Dashboard Utama', icon: <Icons.Home /> },
        ]
      },
      {
        category: 'Data Induk',
        items: [
          { id: 'guru', label: 'Data Guru', icon: <Icons.Users /> },
          { id: 'siswa', label: 'Data Siswa', icon: <Icons.GraduationCap /> },
          { id: 'mapel', label: 'Data Mata Pelajaran', icon: <Icons.Book /> },
          { id: 'ujian', label: 'Data Jenis Ujian', icon: <Icons.FileText /> },
          { id: 'master-poin', label: 'Data Kriteria Poin BK', icon: <Icons.Award /> },
        ]
      },
      {
        category: 'Penugasan',
        items: [
          { id: 'guru-mapel', label: 'Penugasan Mengajar', icon: <Icons.Book /> },
          { id: 'bk-mapping', label: 'Penugasan Guru BK', icon: <Icons.Users /> },
        ]
      },
      {
        category: 'Akademik & Layanan',
        items: [
          { id: 'nilai', label: 'Kelola Nilai Akademik', icon: <Icons.Award /> },
          { id: 'admin-kehadiran', label: 'Kelola Kehadiran Siswa', icon: <Icons.Users /> },
          { id: 'admin-poin', label: 'Kelola Poin & Pelanggaran', icon: <Icons.Award /> },
          { id: 'admin-tabungan', label: 'Kelola Tabungan Siswa', icon: <Icons.FileSpreadsheet /> },
        ]
      }
    ];
  } else if (isWaliKelas) {
    navSections = [
      {
        category: 'Wali Kelas & Akademik',
        items: [
          { id: 'wali-kelas', label: `Dashboard Kelas (${currentUser.kelas_binaan || 'Binaan'})`, icon: <Icons.GraduationCap /> },
          { id: 'nilai', label: 'Input & Rekap Nilai Mapel', icon: <Icons.Award /> },
        ]
      }
    ];
  } else if (isBk) {
    navSections = [
      {
        category: 'Operasional Harian BK',
        items: [
          { id: 'bk-kehadiran', label: 'Input Kehadiran Harian', icon: <Icons.Users /> },
          { id: 'bk-poin', label: 'Input Poin & Kasus', icon: <Icons.Award /> },
        ]
      },
      {
        category: 'Monitoring & Rekap BK',
        items: [
          { id: 'admin-kehadiran', label: 'Kelola Kehadiran Siswa', icon: <Icons.Users /> },
          { id: 'bk-rekap', label: 'Rekap & Grafik Kehadiran', icon: <Icons.FileText /> },
          { id: 'admin-poin', label: 'Kelola Poin & Pelanggaran', icon: <Icons.Award /> },
        ]
      }
    ];
  } else if (isSiswa) {
    navSections = [
      {
        category: 'Portal Peserta Didik',
        items: [
          { id: 'siswa-portal', label: 'Rapor & Kehadiran Saya', icon: <Icons.GraduationCap /> }
        ]
      }
    ];
  } else {
    navSections = [
      {
        category: 'Portal Pengajar',
        items: [
          { id: 'nilai', label: 'Input & Rekap Nilai', icon: <Icons.Award /> }
        ]
      }
    ];
  }

  const renderContent = () => {
    if (isAdmin) {
      switch(activeTab) {
        case 'guru': return <DataGuruView showNotification={showNotification} />;
        case 'siswa': return <DataSiswaView showNotification={showNotification} />;
        case 'ujian': return <DataAkademikView type="ujian" showNotification={showNotification} />;
        case 'mapel': return <DataAkademikView type="mapel" showNotification={showNotification} />;
        case 'guru-mapel': return <PenugasanGuruView showNotification={showNotification} />;
        case 'master-poin': return <DataMasterPoinView showNotification={showNotification} />;
        case 'bk-mapping': return <PenugasanBkView showNotification={showNotification} />;
        case 'nilai': return <KelolaNilaiView showNotification={showNotification} user={currentUser} />;
        case 'admin-kehadiran': return <KelolaKehadiranAdminView showNotification={showNotification} />;
        case 'admin-poin': return <KelolaPoinAdminView showNotification={showNotification} />;
        case 'admin-tabungan': return <KelolaTabunganAdminView showNotification={showNotification} />;
        default: return <DashboardAdminView onNavigate={(tab: string) => setActiveTab(tab)} />;
      }
    } else if (isWaliKelas) {
      switch(activeTab) {
        case 'wali-kelas': return <DashboardWaliKelasView showNotification={showNotification} user={currentUser} />;
        case 'nilai': return <KelolaNilaiView showNotification={showNotification} user={currentUser} />;
        default: return <DashboardWaliKelasView showNotification={showNotification} user={currentUser} />;
      }
    } else if (isBk) {
      switch(activeTab) {
        case 'admin-kehadiran': return <KelolaKehadiranAdminView showNotification={showNotification} />;
        case 'bk-kehadiran': return <InputKehadiranView showNotification={showNotification} user={currentUser} />;
        case 'bk-rekap': return <RekapKehadiranView showNotification={showNotification} user={currentUser} />;
        case 'admin-poin': return <KelolaPoinAdminView showNotification={showNotification} />;
        case 'bk-poin': return <InputPoinKasusView showNotification={showNotification} user={currentUser} />;
        default: return <InputKehadiranView showNotification={showNotification} user={currentUser} />;
      }
    } else if (isSiswa) {
      return <DashboardSiswaView user={currentUser} />;
    } else {
      return <KelolaNilaiView showNotification={showNotification} user={currentUser} />;
    }
  };

  return (
    <ErrorBoundary>
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
      <DashboardLayout 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        navSections={navSections} 
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>
    </ErrorBoundary>
  );
}