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
};
