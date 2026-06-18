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
    const response = await api.post('/mandala/kategori-keperluan', data);
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
    kategori_id: string; 
    nama_tamu: string; 
    instansi_tamu?: string; 
    keperluan: string; 
    nomor_telepon?: string;
  }) => {
    const response = await api.post('/mandala/antrian', data);
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
};

export interface KategoriKeperluan {
  kategori_id: string;
  cadisdik_id: string;
  nama: string;
  created_at: string;
}

export interface Antrian {
  antrian_id: string;
  cadisdik_id: string;
  kategori_id: string;
  nomor_antrian: number;
  nama_tamu: string;
  instansi_tamu: string | null;
  keperluan: string;
  nomor_telepon: string | null;
  status: number; // 0=Menunggu, 1=Dipanggil, 2=Dilayani, 3=Selesai, 4=Batal
  tanggal_kunjungan: string;
  created_at: string;
  kategori?: KategoriKeperluan;
}

export interface AntrianRekap {
  total: number;
  menunggu: number;
  dipanggil: number;
  dilayani: number;
  selesai: number;
  batal: number;
}
