import api from './api';

export const presensiService = {
  // Config & Lookup
  getAttendanceConfig: async () => {
    const response = await api.get('/kurikulum/presensi/config');
    return response.data;
  },

  lookupUser: async (token: string) => {
    const response = await api.post('/kurikulum/presensi/lookup', { token });
    return response.data;
  },

  // Scanning
  scanAttendance: async (token: string, latitude?: number, longitude?: number) => {
    const response = await api.post('/kurikulum/presensi/scan', { token, latitude, longitude });
    return response.data;
  },

  // Manual Presensi
  presensiPesertaDidik: async (sekolahId: string, data: any) => {
    const response = await api.post(`/kurikulum/presensi/peserta-didik/${sekolahId}`, data);
    return response.data;
  },

  presensiGtk: async (sekolahId: string, data: any) => {
    const response = await api.post(`/kurikulum/presensi/gtk/${sekolahId}`, data);
    return response.data;
  },

  presensiMapel: async (sekolahId: string, data: any) => {
    const response = await api.post(`/kurikulum/presensi/mapel/${sekolahId}`, data);
    return response.data;
  },

  // Hari Libur
  getHariLibur: async (sekolahId: string) => {
    const response = await api.get(`/kurikulum/presensi/hari-libur/${sekolahId}`);
    return response.data;
  },

  createHariLibur: async (sekolahId: string, data: any) => {
    const response = await api.post(`/kurikulum/presensi/hari-libur/${sekolahId}`, data);
    return response.data;
  },

  deleteHariLibur: async (sekolahId: string, id: string) => {
    const response = await api.delete(`/kurikulum/presensi/hari-libur/${sekolahId}/${id}`);
    return response.data;
  },

  // Izin
  createIzin: async (sekolahId: string, data: any) => {
    const response = await api.post(`/kurikulum/presensi/izin/${sekolahId}`, data);
    return response.data;
  },

  getRekapPesertaDidik: async (sekolahId: string, tanggal?: string) => {
    const response = await api.get(`/kurikulum/presensi/rekap-pd/${sekolahId}`, {
      params: tanggal ? { tanggal } : {},
    });
    return response.data;
  },

  getRekapGtk: async (sekolahId: string, tanggal?: string) => {
    const response = await api.get(`/kurikulum/presensi/rekap-gtk/${sekolahId}`, {
      params: tanggal ? { tanggal } : {},
    });
    return response.data;
  },

  // Mandala Presensi (New Endpoints)
  getMandalaPresensiPD: async (params: { 
    sekolah_id?: string; 
    tanggal?: string; 
    limit?: number; 
    page?: number; 
    search?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
  }) => {
    const response = await api.get('/mandala/presensi/peserta-didik', { params });
    return response.data;
  },

  getMandalaPresensiGTK: async (params: { 
    sekolah_id?: string; 
    tanggal?: string; 
    limit?: number; 
    page?: number; 
    search?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
  }) => {
    const response = await api.get('/mandala/presensi/gtk', { params });
    return response.data;
  },
};
