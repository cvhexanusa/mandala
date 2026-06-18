import api from "./api";

export interface LayananMaster {
  layanan_id: string;
  nama_layanan: string;
  kategori: number; // 0 = GTK, 1 = PD, 2 = Sekolah
  aktif: boolean;
  syarat: LayananSyarat[];
}

export interface LayananSyarat {
  layanan_syarat_id: string;
  nama_syarat: string;
  wajib: boolean;
  urutan: number;
}

export interface PermohonanLayanan {
  permohonan_layanan_id: string;
  layanan_id: string;
  sekolah_id: string;
  ptk_id?: string;
  peserta_didik_id?: string;
  nomor_permohonan: string;
  keterangan?: string;
  status: number;
  tanggal_pengajuan: string;
  created_at: string;
  layanan?: LayananMaster;
  sekolah?: {
    nama: string;
    npsn: string;
  };
  ptk?: {
    nama: string;
    nuptk: string;
    foto?: string;
  };
  peserta_didik?: {
    nama: string;
    nisn: string;
    foto?: string;
  };
  permohonan_layanan_file?: any[];
  permohonan_layanan_log?: any[];
}

export const layananMandalaService = {
  getMasterLayanan: async (kategori?: number) => {
    const response = await api.get("/layanan-mandala/master", {
      params: { kategori }
    });
    return response.data;
  },

  getPermohonan: async (params: { 
    sekolah_id?: string; 
    status?: number; 
    kategori?: number 
  }) => {
    const response = await api.get("/layanan-mandala/permohonan", { params });
    return response.data;
  },

  getPermohonanById: async (id: string) => {
    const response = await api.get(`/layanan-mandala/permohonan/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, data: { status: number; catatan?: string; pegawai_id: string }) => {
    const response = await api.patch(`/layanan-mandala/permohonan/${id}/status`, data);
    return response.data;
  },

  updateFileStatus: async (fileId: string, data: { status: number; catatan?: string }) => {
    const response = await api.patch(`/layanan-mandala/file/${fileId}/status`, data);
    return response.data;
  },

  // --- CRUD Master Layanan ---
  createLayanan: async (data: { nama_layanan: string; kategori: number; aktif?: boolean }) => {
    const response = await api.post("/layanan-mandala/master", data);
    return response.data;
  },

  updateLayanan: async (id: string, data: Partial<LayananMaster>) => {
    const response = await api.patch(`/layanan-mandala/master/${id}`, data);
    return response.data;
  },

  deleteLayanan: async (id: string) => {
    const response = await api.delete(`/layanan-mandala/master/${id}`);
    return response.data;
  },

  // --- CRUD Master Syarat ---
  createSyarat: async (layananId: string, data: { nama_syarat: string; wajib: boolean; urutan: number }) => {
    const response = await api.post(`/layanan-mandala/master/${layananId}/syarat`, data);
    return response.data;
  },

  updateSyarat: async (syaratId: string, data: Partial<LayananSyarat>) => {
    // Note: I need to ensure this endpoint exists in backend controller
    const response = await api.patch(`/layanan-mandala/syarat/${syaratId}`, data);
    return response.data;
  },

  deleteSyarat: async (syaratId: string) => {
    // Note: I need to ensure this endpoint exists in backend controller
    const response = await api.delete(`/layanan-mandala/syarat/${syaratId}`);
    return response.data;
  },
};
