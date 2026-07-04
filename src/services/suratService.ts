import api from './api';

export interface PengaturanPenomoran {
  id?: string;
  nama: string;
  prefix: string;
  suffix: string;
  counter: number;
  format: string;
  aktif: boolean;
  cadisdik_id?: string;
  created_at?: string;
}

export interface TemplateSurat {
  id?: string;
  nama_template: string;
  konten: string;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  cadisdik_id?: string;
  created_at?: string;
}

export interface SuratMasuk {
  id?: string;
  nomor_surat: string;
  pengirim: string;
  perihal: string;
  tanggal_surat: string;
  tanggal_terima: string;
  file_surat?: string;
  ringkasan?: string;
  cadisdik_id?: string;
  created_at?: string;
}

export interface SuratKeluar {
  id?: string;
  nomor_surat?: string | null;
  tujuan: string;
  perihal: string;
  tanggal_surat: string;
  template_id: string;
  isi_surat: string;
  status: 'draft' | 'terbit';
  nomor_pengaturan_id?: string;
  cadisdik_id?: string;
  created_at?: string;
  template?: TemplateSurat;
  nomor_pengaturan?: PengaturanPenomoran;
}

export const suratService = {
  // 1. Pengaturan Penomoran Surat
  getPengaturan: async () => {
    const response = await api.get('/mandala/surat/pengaturan');
    return response.data;
  },
  createPengaturan: async (data: PengaturanPenomoran) => {
    const response = await api.post('/mandala/surat/pengaturan', data);
    return response.data;
  },
  updatePengaturan: async (id: string, data: Partial<PengaturanPenomoran>) => {
    const response = await api.patch(`/mandala/surat/pengaturan/${id}`, data);
    return response.data;
  },
  deletePengaturan: async (id: string) => {
    const response = await api.delete(`/mandala/surat/pengaturan/${id}`);
    return response.data;
  },

  // 2. Template Surat
  getTemplate: async () => {
    const response = await api.get('/mandala/surat/template');
    return response.data;
  },
  getTemplateDetail: async (id: string) => {
    const response = await api.get(`/mandala/surat/template/${id}`);
    return response.data;
  },
  createTemplate: async (data: TemplateSurat) => {
    const response = await api.post('/mandala/surat/template', data);
    return response.data;
  },
  updateTemplate: async (id: string, data: Partial<TemplateSurat>) => {
    const response = await api.patch(`/mandala/surat/template/${id}`, data);
    return response.data;
  },
  deleteTemplate: async (id: string) => {
    const response = await api.delete(`/mandala/surat/template/${id}`);
    return response.data;
  },

  // 3. Surat Masuk
  getSuratMasuk: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/mandala/surat/masuk', { params });
    return response.data;
  },
  createSuratMasuk: async (data: SuratMasuk) => {
    const response = await api.post('/mandala/surat/masuk', data);
    return response.data;
  },
  updateSuratMasuk: async (id: string, data: Partial<SuratMasuk>) => {
    const response = await api.patch(`/mandala/surat/masuk/${id}`, data);
    return response.data;
  },
  deleteSuratMasuk: async (id: string) => {
    const response = await api.delete(`/mandala/surat/masuk/${id}`);
    return response.data;
  },

  // 4. Surat Keluar
  getSuratKeluar: async () => {
    const response = await api.get('/mandala/surat/keluar');
    return response.data;
  },
  getSuratKeluarDetail: async (id: string) => {
    const response = await api.get(`/mandala/surat/keluar/${id}`);
    return response.data;
  },
  createSuratKeluar: async (data: Partial<SuratKeluar>) => {
    const response = await api.post('/mandala/surat/keluar', data);
    return response.data;
  },
  updateSuratKeluar: async (id: string, data: Partial<SuratKeluar>) => {
    const response = await api.patch(`/mandala/surat/keluar/${id}`, data);
    return response.data;
  },
  terbitkanSuratKeluar: async (id: string) => {
    const response = await api.post(`/mandala/surat/keluar/${id}/terbitkan`);
    return response.data;
  },
  getSuratKeluarPreview: async (id: string) => {
    const response = await api.get(`/mandala/surat/keluar/${id}/preview`);
    return response.data;
  },
  deleteSuratKeluar: async (id: string) => {
    const response = await api.delete(`/mandala/surat/keluar/${id}`);
    return response.data;
  },
};
