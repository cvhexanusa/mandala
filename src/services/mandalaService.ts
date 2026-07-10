import api from './api';

export interface MandalaConnection {
  id: string;
  key: string;
  url_mandala: string;
}

export interface SchoolSummary {
  sekolah_id: string;
  nama: string;
  npsn: string;
  statistik: {
    jumlah_guru: number;
    jumlah_tendik: number;
    jumlah_siswa: number;
    jumlah_rombel: number;
    jumlah_tanah: number;
    jumlah_bangunan: number;
    jumlah_ruang: number;
    presensi_hari_ini: number;
  };
}

export interface MandalaSchool {
  sekolah_id: string;
  nama: string;
  npsn: string;
  alamat?: string;
  status_sekolah?: string;
  bentuk_pendidikan_id_str?: string;
  bentuk_pendidikan_is_str?: string;
  kabupate_kota?: string;
  kabupaten_kota?: string;
  kecamatan?: string;
  desa_kelurahan?: string;
  lintang?: string | number;
  bujur?: string | number;
  total_siswa?: number;
  total_gtk?: number;
  jumlah_siswa?: number;
  jumlah_guru?: number;
}

export const mandalaService = {
  // A. Mendapatkan Detail Koneksi
  getConnection: async () => {
    const response = await api.get('/mandala/connection');
    return response.data;
  },

  // B. Update/Setup Koneksi
  updateConnection: async (data: { key: string; url_mandala: string }) => {
    const response = await api.post('/mandala/connection', data);
    return response.data;
  },

  // C. Daftar Sekolah (Integrasi Simak)
  getSchools: async () => {
    const response = await api.get('/mandala/sekolah');
    return response.data;
  },

  // D. Detail Sekolah
  getSchoolDetail: async (id: string) => {
    const response = await api.get(`/mandala/sekolah/${id}`);
    return response.data;
  },

  // E. Ringkasan/Summary Sekolah
  getSchoolSummary: async (id: string) => {
    const response = await api.get(`/mandala/sekolah/${id}/summary`);
    return response.data;
  },

  // F. Mapping Pengawas Pembina CRUD
  getMappingPengawas: async () => {
    const response = await api.get('/mandala/mapping-pengawas');
    return response.data;
  },

  createMappingPengawas: async (data: { pegawai_id: string; sekolah_id: string }) => {
    const response = await api.post('/mandala/mapping-pengawas', data);
    return response.data;
  },

  deleteMappingPengawas: async (id: string) => {
    const response = await api.delete(`/mandala/mapping-pengawas/${id}`);
    return response.data;
  },

  // G. Kategori Keperluan (Antrian)
  getKategoriKeperluan: async (cadisdik_id?: string) => {
    const params: any = {};
    if (cadisdik_id) params.cadisdik_id = cadisdik_id;
    const response = await api.get('/mandala/kategori-keperluan', { params });
    return response.data;
  },

  createKategoriKeperluan: async (data: { cadisdik_id: string; nama: string; }) => {
    const cleanedData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== ""));
    const response = await api.post('/mandala/kategori-keperluan', cleanedData);
    return response.data;
  },

  updateKategoriKeperluan: async (id: string, data: { nama?: string; }) => {
    const response = await api.patch(`/mandala/kategori-keperluan/${id}`, data);
    return response.data;
  },

  deleteKategoriKeperluan: async (id: string) => {
    const response = await api.delete(`/mandala/kategori-keperluan/${id}`);
    return response.data;
  },

  // H. Antrian Tamu
  getAntrian: async (params: { cadisdik_id?: string; status?: number | string; start_date?: string; end_date?: string }) => {
    // Filter out empty strings or null values
    const queryParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
    );
    const response = await api.get('/mandala/antrian', { params: queryParams });
    return response.data;
  },

  createAntrian: async (data: { 
    cadisdik_id: string; 
    kategori_keperluan_id: string; 
    nama_lengkap: string; 
    unit_instansi?: string; 
    keperluan: string; 
    nomor_hp?: string;
  }) => {
    const cleanedData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== ""));
    const response = await api.post('/mandala/antrian', cleanedData);
    return response.data;
  },

  updateAntrianStatus: async (id: string, status: number) => {
    const response = await api.patch(`/mandala/antrian/${id}/status`, { status });
    return response.data;
  },

  getAntrianRekap: async (cadisdik_id?: string) => {
    const params: any = {};
    if (cadisdik_id) params.cadisdik_id = cadisdik_id;
    const response = await api.get('/mandala/antrian/rekap', { params });
    return response.data;
  },

  // I. Pelaporan Dokumen
  getPelaporan: async (cadisdik_id: string, page: number = 1, limit: number = 10) => {
    const response = await api.get('/mandala/pelaporan', {
      params: { cadisdik_id, page, limit }
    });
    return response.data;
  },

  createPelaporan: async (data: {
    cadisdik_id: string;
    judul: string;
    deskripsi?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    sekolah_ids?: string[];
  }) => {
    const response = await api.post('/mandala/pelaporan', data);
    return response.data;
  },

  getPelaporanDetail: async (id: string, cadisdik_id: string) => {
    const response = await api.get(`/mandala/pelaporan/${id}`, {
      params: { cadisdik_id }
    });
    return response.data;
  },

  getPelaporanDokumenSekolah: async (id: string, sekolahId: string, cadisdik_id: string) => {
    const response = await api.get(`/mandala/pelaporan/${id}/sekolah/${sekolahId}`, {
      params: { cadisdik_id }
    });
    return response.data;
  },

  deletePelaporan: async (id: string, cadisdik_id: string) => {
    const response = await api.delete(`/mandala/pelaporan/${id}`, {
      params: { cadisdik_id }
    });
    return response.data;
  },

  // J. Pengaturan Sistem (System Settings)
  getSystemSettings: async (cadisdikId?: string) => {
    const url = cadisdikId
      ? `/mandala/cadisdik/${cadisdikId}/system-settings`
      : `/mandala/system-settings`;
    const response = await api.get(url);
    return response.data;
  },

  updateSystemSettings: async (cadisdikId: string, formData: FormData) => {
    const response = await api.put(`/mandala/cadisdik/${cadisdikId}/system-settings`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export interface Pelaporan {
  pelaporan_id: string;
  judul: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  jumlah_sekolah: number;
  jumlah_dokumen: number;
  aktif: boolean;
  created_at: string;
}

export interface PelaporanDetail {
  pelaporan_id: string;
  judul: string;
  deskripsi: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  aktif: boolean;
  daftar_sekolah: {
    pelaporan_sekolah_id: string;
    sekolah_id: string;
    nama_sekolah: string;
    jumlah_dokumen: number;
  }[];
}

export interface PelaporanDokumen {
  pelaporan_dokumen_id: string;
  nama_file: string;
  file_url: string;
  ukuran_file: number | null;
  created_at: string;
}

export interface KategoriKeperluan {
  id?: string;
  kategori_id?: string;
  kategori_keperluan_id?: string;
  cadisdik_id: string;
  nama: string;
  created_at: string;
}

export interface Antrian {
  id?: string;
  antrian_id?: string;
  cadisdik_id: string;
  kategori_id?: string;
  kategori_keperluan_id?: string;
  nomor_antrian: number;
  nama_tamu?: string;
  nama_lengkap?: string;
  instansi_tamu?: string | null;
  unit_instansi?: string | null;
  keperluan: string;
  nomor_hp?: string | null;
  nomor_telepon?: string | null;
  status: number; // 0=Menunggu, 1=Dipanggil, 2=Dilayani, 3=Selesai, 4=Batal
  tanggal_kunjungan?: string;
  created_at: string;
  kategori?: KategoriKeperluan;
  kategori_keperluan?: KategoriKeperluan;
}

export interface AntrianRekap {
  total: number;
  menunggu: number;
  dipanggil: number;
  dilayani: number;
  selesai: number;
  batal: number;
}
