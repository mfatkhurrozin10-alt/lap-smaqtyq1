import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { saveUserSession } from '../services/auth';

export default function LoginView({ onLoginSuccess, showNotification }: any) {
  const [roleType, setRoleType] = useState<'admin' | 'guru' | 'siswa'>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      showNotification('Mohon masukkan identitas login', 'error');
      return;
    }

    setLoading(true);
    try {
      if (roleType === 'admin') {
        if (identifier === 'admin' && password === 'admin123') {
          const adminData = { role: 'admin', nama: 'Administrator' };
          saveUserSession(adminData);
          onLoginSuccess(adminData);
          showNotification('Berhasil masuk sebagai Admin', 'success');
        } else {
          showNotification('Username atau password admin salah', 'error');
        }
      } else if (roleType === 'guru') {
        const { data, error } = await supabase
          .from('guru')
          .select('*')
          .eq('niy', identifier.trim());

        if (error || !data || data.length === 0) {
          showNotification('NIY Guru tidak terdaftar di sistem', 'error');
        } else {
          const guruData = data[0];
          
          if (guruData.password && guruData.password !== password) {
            showNotification('Password guru salah', 'error');
            setLoading(false);
            return;
          }

          const sessionData = { role: 'guru', ...guruData };
          saveUserSession(sessionData);
          onLoginSuccess(sessionData);
          showNotification(`Selamat datang, ${guruData.nama}`, 'success');
        }
      } else if (roleType === 'siswa') {
        // Login Siswa menggunakan NIS tanpa password
        const { data, error } = await supabase
          .from('siswa')
          .select('*')
          .eq('nis', identifier.trim());

        if (error || !data || data.length === 0) {
          showNotification('NIS Siswa tidak terdaftar di sistem', 'error');
        } else {
          const siswaData = data[0];
          const sessionData = { role: 'siswa', ...siswaData };
          saveUserSession(sessionData);
          onLoginSuccess(sessionData);
          showNotification(`Selamat datang, ${siswaData.nama}`, 'success');
        }
      }
    } catch (err: any) {
      showNotification(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-left space-y-6 my-auto">
        
        {/* HEADER LOGO DIPERBESAR 2X & NAMA SEKOLAH */}
        <div className="text-center space-y-2">
          <div className="w-32 h-32 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center p-3.5 mx-auto mb-2">
            <img src="/logo-sekolah.png" alt="Logo Sekolah" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">SMA QT Yanbuul Quran 1</h2>
          <p className="text-xs text-slate-400 font-medium">Silakan masuk sesuai hak akses akun Anda</p>
        </div>

        {/* TAB ROLE SELECTOR */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full">
          <button
            type="button"
            onClick={() => setRoleType('admin')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${roleType === 'admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRoleType('guru')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${roleType === 'guru' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
          >
            Guru
          </button>
          <button
            type="button"
            onClick={() => setRoleType('siswa')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${roleType === 'siswa' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
          >
            Siswa
          </button>
        </div>

        {/* FORM LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4 w-full">
          <div className="w-full">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {roleType === 'admin' ? 'Username Admin' : roleType === 'guru' ? 'Nomor Induk Yayasan (NIY)' : 'Nomor Induk Siswa Nasional (NISN)'}
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={roleType === 'admin' ? 'Contoh: admin' : roleType === 'guru' ? 'Contoh: 1993080420220134' : 'Contoh: 2024101'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {roleType !== 'siswa' && (
            <div className="w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}