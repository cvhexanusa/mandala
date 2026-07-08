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
  kategori?: number;
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
  ukuran_kertas: string;
  kategori?: number;
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
  nomor_agenda?: string;
  tujuan_disposisi?: string;
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
  kategori?: number;
  cadisdik_id?: string;
  created_at?: string;
  template?: TemplateSurat;
  nomor_pengaturan?: PengaturanPenomoran;
}

// ----------------------------------------------------
// MAPPER UTILITIES
// ----------------------------------------------------

const paperSizeMap: Record<string, number> = {
  'A4': 1,
  'F4': 2,
  'Letter': 3
};

const revPaperSizeMap: Record<number, string> = {
  1: 'A4',
  2: 'F4',
  3: 'Letter'
};

export const mapPengaturanToFrontend = (data: any): PengaturanPenomoran => {
  if (!data) return data;
  
  let prefix = '';
  let suffix = '';
  let format = '{prefix}/{counter}/{suffix}/{year}';
  const formatNomor = data.format_nomor || '';
  
  const nomorIdx = formatNomor.indexOf('{nomor}');
  if (nomorIdx !== -1) {
    prefix = formatNomor.substring(0, nomorIdx);
    if (prefix.endsWith('/')) {
      prefix = prefix.slice(0, -1);
    }
    
    const rest = formatNomor.substring(nomorIdx + '{nomor}'.length);
    const tahunIdx = rest.indexOf('{tahun}');
    if (tahunIdx !== -1) {
      suffix = rest.substring(0, tahunIdx);
      if (suffix.startsWith('/')) {
        suffix = suffix.slice(1);
      }
    } else {
      suffix = rest;
    }
  } else {
    prefix = '';
    suffix = '';
    format = formatNomor;
  }

  return {
    id: data.pengaturan_nomor_surat_id || data.id,
    nama: data.nama_label || data.nama || '',
    prefix,
    suffix,
    counter: data.counter !== undefined ? Number(data.counter) : 1,
    format,
    aktif: !!data.aktif,
    cadisdik_id: data.cadisdik_id,
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    created_at: data.created_at
  };
};

export const mapPengaturanToBackend = (data: any) => {
  let formatNomor = data.format || '';
  const prefix = data.prefix || '';
  const suffix = data.suffix || '';
  
  formatNomor = formatNomor.replace(/{prefix}/g, prefix);
  formatNomor = formatNomor.replace(/{suffix}/g, suffix);
  formatNomor = formatNomor.replace(/{counter}/g, '{nomor}');
  formatNomor = formatNomor.replace(/{year}/g, '{tahun}');
  formatNomor = formatNomor.replace(/\/\/+/g, '/');

  return {
    pengaturan_nomor_surat_id: data.id,
    cadisdik_id: data.cadisdik_id,
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    nama_label: data.nama,
    format_nomor: formatNomor,
    counter: data.counter !== undefined ? Number(data.counter) : 0,
    aktif: !!data.aktif
  };
};

export const mapTemplateToFrontend = (data: any): TemplateSurat => {
  if (!data) return data;
  return {
    id: data.template_surat_id || data.id,
    nama_template: data.nama_template || '',
    konten: data.konten_html || data.konten || '',
    margin_top: data.margin_atas !== undefined ? Number(data.margin_atas) : 20,
    margin_bottom: data.margin_bawah !== undefined ? Number(data.margin_bawah) : 20,
    margin_left: data.margin_kiri !== undefined ? Number(data.margin_kiri) : 20,
    margin_right: data.margin_kanan !== undefined ? Number(data.margin_kanan) : 20,
    ukuran_kertas: revPaperSizeMap[data.ukuran_kertas] || 'A4',
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    cadisdik_id: data.cadisdik_id,
    created_at: data.created_at
  };
};

export const mapTemplateToBackend = (data: any) => {
  return {
    template_surat_id: data.id,
    cadisdik_id: data.cadisdik_id,
    nama_template: data.nama_template,
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    ukuran_kertas: paperSizeMap[data.ukuran_kertas] || 1,
    margin_atas: data.margin_top !== undefined ? Number(data.margin_top) : 20,
    margin_bawah: data.margin_bottom !== undefined ? Number(data.margin_bottom) : 20,
    margin_kiri: data.margin_left !== undefined ? Number(data.margin_left) : 20,
    margin_kanan: data.margin_right !== undefined ? Number(data.margin_right) : 20,
    konten_html: data.konten,
    aktif: data.aktif !== undefined ? !!data.aktif : true
  };
};

export const mapSuratMasukToFrontend = (data: any): SuratMasuk => {
  if (!data) return data;
  return {
    id: data.surat_masuk_id || data.id,
    nomor_surat: data.nomor_surat || '',
    pengirim: data.asal_surat || data.pengirim || '',
    perihal: data.perihal || '',
    tanggal_surat: data.tanggal_surat || '',
    tanggal_terima: data.tanggal_diterima || data.tanggal_terima || '',
    file_surat: data.file_url || data.file_surat || '',
    ringkasan: data.keterangan || data.ringkasan || '',
    nomor_agenda: data.nomor_agenda,
    tujuan_disposisi: data.tujuan_disposisi,
    cadisdik_id: data.cadisdik_id,
    created_at: data.created_at
  };
};

export const mapSuratMasukToBackend = (data: any) => {
  return {
    surat_masuk_id: data.id,
    cadisdik_id: data.cadisdik_id,
    tanggal_surat: data.tanggal_surat,
    tanggal_diterima: data.tanggal_terima,
    nomor_agenda: data.nomor_agenda || '',
    nomor_surat: data.nomor_surat,
    asal_surat: data.pengirim,
    tujuan_disposisi: data.tujuan_disposisi || '',
    perihal: data.perihal,
    keterangan: data.ringkasan || '',
    file_url: data.file_surat || ''
  };
};

export const mapSuratKeluarToFrontend = (data: any): SuratKeluar => {
  if (!data) return data;
  return {
    id: data.surat_keluar_id || data.id,
    nomor_surat: data.nomor_surat,
    tujuan: data.tujuan || '',
    perihal: data.perihal || '',
    tanggal_surat: data.tanggal_surat || '',
    template_id: data.template_surat_id || data.template_id || '',
    isi_surat: data.isi_final_html || data.isi_surat || '',
    status: data.status === 2 || data.status === 'terbit' ? 'terbit' : 'draft',
    nomor_pengaturan_id: data.pengaturan_nomor_surat_id || data.nomor_pengaturan_id || '',
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    cadisdik_id: data.cadisdik_id,
    created_at: data.created_at,
    template: data.template ? mapTemplateToFrontend(data.template) : undefined,
    nomor_pengaturan: data.nomor_pengaturan ? mapPengaturanToFrontend(data.nomor_pengaturan) : undefined
  };
};

export const mapSuratKeluarToBackend = (data: any) => {
  return {
    surat_keluar_id: data.id,
    cadisdik_id: data.cadisdik_id,
    template_surat_id: data.template_id,
    pengaturan_nomor_surat_id: data.nomor_pengaturan_id,
    kategori: data.kategori !== undefined ? Number(data.kategori) : 1,
    tujuan: data.tujuan,
    perihal: data.perihal,
    tanggal_surat: data.tanggal_surat,
    isi_final_html: data.isi_surat,
    status: data.status === 'terbit' ? 2 : 1
  };
};

// ----------------------------------------------------
// SERVICE OBJECT
// ----------------------------------------------------

export const suratService = {
  // 1. Pengaturan Penomoran Surat
  getPengaturan: async () => {
    const response = await api.get('/mandala/surat/pengaturan');
    const items = response.data.data || response.data || [];
    return Array.isArray(items) ? items.map(mapPengaturanToFrontend) : items;
  },
  createPengaturan: async (data: PengaturanPenomoran) => {
    const payload = mapPengaturanToBackend(data);
    const response = await api.post('/mandala/surat/pengaturan', payload);
    return mapPengaturanToFrontend(response.data.data || response.data);
  },
  updatePengaturan: async (id: string, data: Partial<PengaturanPenomoran>) => {
    const payload = mapPengaturanToBackend({ ...data, id });
    const response = await api.patch(`/mandala/surat/pengaturan/${id}`, payload);
    return mapPengaturanToFrontend(response.data.data || response.data);
  },
  deletePengaturan: async (id: string) => {
    const response = await api.delete(`/mandala/surat/pengaturan/${id}`);
    return response.data;
  },

  // 2. Template Surat
  getTemplate: async () => {
    const response = await api.get('/mandala/surat/template');
    const items = response.data.data || response.data || [];
    return Array.isArray(items) ? items.map(mapTemplateToFrontend) : items;
  },
  getTemplateDetail: async (id: string) => {
    const response = await api.get(`/mandala/surat/template/${id}`);
    return mapTemplateToFrontend(response.data.data || response.data);
  },
  createTemplate: async (data: TemplateSurat) => {
    const payload = mapTemplateToBackend(data);
    const response = await api.post('/mandala/surat/template', payload);
    return mapTemplateToFrontend(response.data.data || response.data);
  },
  updateTemplate: async (id: string, data: Partial<TemplateSurat>) => {
    const payload = mapTemplateToBackend({ ...data, id });
    const response = await api.patch(`/mandala/surat/template/${id}`, payload);
    return mapTemplateToFrontend(response.data.data || response.data);
  },
  deleteTemplate: async (id: string) => {
    const response = await api.delete(`/mandala/surat/template/${id}`);
    return response.data;
  },

  // 3. Surat Masuk
  getSuratMasuk: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/mandala/surat/masuk', { params });
    const resData = response.data;
    if (resData && Array.isArray(resData.data)) {
      resData.data = resData.data.map(mapSuratMasukToFrontend);
    } else if (Array.isArray(resData)) {
      return resData.map(mapSuratMasukToFrontend);
    }
    return resData;
  },
  createSuratMasuk: async (data: SuratMasuk) => {
    const payload = mapSuratMasukToBackend(data);
    const response = await api.post('/mandala/surat/masuk', payload);
    return mapSuratMasukToFrontend(response.data.data || response.data);
  },
  updateSuratMasuk: async (id: string, data: Partial<SuratMasuk>) => {
    const payload = mapSuratMasukToBackend({ ...data, id });
    const response = await api.patch(`/mandala/surat/masuk/${id}`, payload);
    return mapSuratMasukToFrontend(response.data.data || response.data);
  },
  deleteSuratMasuk: async (id: string) => {
    const response = await api.delete(`/mandala/surat/masuk/${id}`);
    return response.data;
  },

  // 4. Surat Keluar
  getSuratKeluar: async () => {
    const response = await api.get('/mandala/surat/keluar');
    const items = response.data.data || response.data || [];
    return Array.isArray(items) ? items.map(mapSuratKeluarToFrontend) : items;
  },
  getSuratKeluarDetail: async (id: string) => {
    const response = await api.get(`/mandala/surat/keluar/${id}`);
    return mapSuratKeluarToFrontend(response.data.data || response.data);
  },
  createSuratKeluar: async (data: Partial<SuratKeluar>) => {
    const payload = mapSuratKeluarToBackend(data);
    const response = await api.post('/mandala/surat/keluar', payload);
    return mapSuratKeluarToFrontend(response.data.data || response.data);
  },
  updateSuratKeluar: async (id: string, data: Partial<SuratKeluar>) => {
    const payload = mapSuratKeluarToBackend({ ...data, id });
    const response = await api.patch(`/mandala/surat/keluar/${id}`, payload);
    return mapSuratKeluarToFrontend(response.data.data || response.data);
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

