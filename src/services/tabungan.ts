// src/services/tabungan.ts

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHUXa_QVXNShAOBG3ywrdg3XnPmzSNWB0uPL3qEP3dlC-AmQZQzjOcIn6qIaXXk1qO/exec'; 

// Fungsi untuk mengambil data tabungan per siswa (mendukung nis & nisn)
export const fetchTabunganData = async (identifier: string | number) => {
  if (!identifier) return null;
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getTabungan&nis=${identifier}&nisn=${identifier}`);
    const result = await response.json();
    if (result.status === 'success') {
      return { info: result.student, history: result.history || [] };
    }
    return null;
  } catch (error) {
    console.error('Gagal mengambil data tabungan:', error);
    throw error;
  }
};

// Fungsi untuk mengambil seluruh data sekaligus (Super Cepat)
export const fetchAllTabunganData = async () => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAllTabungan`);
    const result = await response.json();

    if (result.status === 'success') {
      return result.data || [];
    }
    throw new Error(result.message || 'Gagal memuat data dari Google Sheets');
  } catch (error) {
    console.error('Gagal mengambil seluruh data tabungan:', error);
    throw error;
  }
};