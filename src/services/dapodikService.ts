import api from './api';

export const dapodikService = {
  getPesertaDidik: async (limit: number = 10, search: string = '', page: number = 1, rombelName?: string, status?: 'aktif' | 'non-aktif', tingkat?: string, sekolahId?: string, semesterId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/peserta-didik', {
        params: {
          limit,
          page,
          search,
          rombel: rombelName,
          status,
          tingkat,
          sekolah_id: sekolahId,
          semester_id: semesterId
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data peserta didik:', error);
      throw error;
    }
  },

  getSummary: async () => {
    try {
      const response = await api.get('/mandala/dapodik/summary');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data summary:', error);
      throw error;
    }
  },

  getSekolah: async () => {
    try {
      const response = await api.get('/mandala/sekolah');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data sekolah:', error?.response?.data || error.message);
      throw error;
    }
  },

  validateSyncKey: async (key: string, domain: string) => {
    try {
      const response = await api.post('/sync/validate', { key, domain });
      return response.data;
    } catch (error: any) {
      console.error('Gagal validasi API Key:', error);
      throw error;
    }
  },

  getGTK: async (limit: number = 10, search: string = '', page: number = 1, type?: 'guru' | 'tendik', status?: 'aktif' | 'non-aktif', sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/gtk', {
        params: {
          limit,
          page,
          search,
          type,
          status,
          sekolah_id: sekolahId
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data GTK:', error);
      throw error;
    }
  },

  getGtkRekapKategori: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/gtk/rekap-kategori', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil rekap kategori GTK:', error);
      throw error;
    }
  },

  getGtkRekapPendidikan: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/gtk/rekap-pendidikan', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil rekap pendidikan GTK:', error);
      throw error;
    }
  },

  getGtkRekapUsia: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/gtk/rekap-usia', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil rekap usia GTK:', error);
      throw error;
    }
  },

  getMataPelajaran: async (limit: number = 10, search: string = '', page: number = 1) => {
    try {
      const response = await api.get(`/mandala/dapodik/mata-pelajaran?limit=${limit}&page=${page}&search=${search}`);
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data mata pelajaran:', error);
      throw error;
    }
  },

  getRombonganBelajar: async (type: 'reguler' | 'pilihan' = 'reguler', limit: number = 10, page: number = 1, search: string = '', tingkat: string = '') => {
    try {
      let url = `/mandala/dapodik/rombongan-belajar?type=${type}&limit=${limit}&page=${page}&search=${search}`;
      if (tingkat) url += `&tingkat=${tingkat}`;
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data rombongan belajar:', error);
      throw error;
    }
  },

  getEkstrakurikuler: async (search: string = '') => {
    try {
      const response = await api.get(`/dapodik/ekstrakurikuler?search=${search}`);
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data ekstrakurikuler:', error);
      throw error;
    }
  },

  getJurusan: async () => {
    try {
      const response = await api.get('/dapodik/jurusan');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data jurusan:', error);
      throw error;
    }
  },

  getTahunPelajaran: async () => {
    try {
      const response = await api.get('/dapodik/tahun-pelajaran');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data tahun pelajaran:', error);
      throw error;
    }
  },

  getSemesterAktif: async () => {
    try {
      const response = await api.get('/mandala/dapodik/semester_id');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data semester aktif:', error);
      throw error;
    }
  },

  getTanah: async () => {
    try {
      const response = await api.get('/dapodik/tanah');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data tanah:', error);
      throw error;
    }
  },

  getRombelAnggota: async (rombelId: string) => {
    try {
      const response = await api.get(`/dapodik/rombongan-belajar/${rombelId}/anggota`);
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil anggota rombel:', error);
      throw error;
    }
  },

  getRombelPembelajaran: async (rombelId: string) => {
    try {
      const response = await api.get(`/dapodik/rombongan-belajar/${rombelId}/pembelajaran`);
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil pembelajaran rombel:', error);
      throw error;
    }
  },

  getAllPembelajaran: async () => {
    try {
      const response = await api.get('/dapodik/pembelajaran');
      return response.data;
    } catch (error: any) {
      console.error('Gagal mengambil data semua pembelajaran:', error);
      throw error;
    }
  },

  getPdRekapTingkat: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/peserta-didik/rekap-tingkat', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pd rekap tingkat:', error);
      throw error;
    }
  },

  getPdRekapKompetensi: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/peserta-didik/rekap-kompetensi', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pd rekap kompetensi:', error);
      throw error;
    }
  },

  getPdRekapUsia: async (sekolahId?: string) => {
    try {
      const response = await api.get('/mandala/dapodik/peserta-didik/rekap-usia', {
        params: { sekolah_id: sekolahId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pd rekap usia:', error);
      throw error;
    }
  },

  getGtkDetail: async (id: string) => {
    try {
      const response = await api.get(`/dapodik/gtk/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching gtk detail for ${id}:`, error);
      throw error;
    }
  },

  updateGtk: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/dapodik/gtk/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating gtk ${id}:`, error);
      throw error;
    }
  },

  getPesertaDidikDetail: async (id: string) => {
    try {
      const response = await api.get(`/dapodik/peserta-didik/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching peserta didik detail for ${id}:`, error);
      throw error;
    }
  },

  updatePesertaDidik: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/dapodik/peserta-didik/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating peserta didik ${id}:`, error);
      throw error;
    }
  },

  // --- Geography / Wilayah ---
  getProvinsiList: async () => {
    try {
      const response = await api.get('/mandala/wilayah/provinsi');
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data provinsi:', error);
      throw error;
    }
  },

  getKabupatenList: async (provinsi: string) => {
    try {
      const response = await api.get('/mandala/wilayah/kabupaten', {
        params: { provinsi }
      });
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data kabupaten:', error);
      throw error;
    }
  },

  // --- Cadisdik / Profil Instansi CRUD ---
  getCadisdik: async () => {
    try {
      const response = await api.get('/mandala/cadisdik');
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data cadisdik:', error);
      throw error;
    }
  },

  createCadisdik: async (data: any) => {
    try {
      const response = await api.post('/mandala/cadisdik', data);
      return response.data;
    } catch (error) {
      console.error('Gagal membuat cadisdik:', error);
      throw error;
    }
  },

  updateCadisdik: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/mandala/cadisdik/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Gagal update cadisdik ${id}:`, error);
      throw error;
    }
  },

  deleteCadisdik: async (id: string) => {
    try {
      const response = await api.delete(`/mandala/cadisdik/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Gagal menghapus cadisdik ${id}:`, error);
      throw error;
    }
  },

  // --- Pegawai CRUD ---
  getPegawai: async () => {
    try {
      const response = await api.get('/mandala/pegawai');
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data pegawai:', error);
      throw error;
    }
  },

  createPegawai: async (data: any) => {
    try {
      const response = await api.post('/mandala/pegawai', data);
      return response.data;
    } catch (error) {
      console.error('Gagal membuat pegawai:', error);
      throw error;
    }
  },

  updatePegawai: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/mandala/pegawai/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Gagal update pegawai ${id}:`, error);
      throw error;
    }
  },

  deletePegawai: async (id: string) => {
    try {
      const response = await api.delete(`/mandala/pegawai/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Gagal menghapus pegawai ${id}:`, error);
      throw error;
    }
  },

  getGolongan: async () => {
    try {
      const response = await api.get('/mandala/pegawai/golongan');
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data golongan:', error);
      throw error;
    }
  },

  // --- Jenis Jabatan CRUD ---
  getJenisJabatan: async () => {
    try {
      const response = await api.get('/mandala/jenis-jabatan');
      return response.data;
    } catch (error) {
      console.error('Gagal mengambil data jenis jabatan:', error);
      throw error;
    }
  },

  createJenisJabatan: async (data: any) => {
    try {
      const response = await api.post('/mandala/jenis-jabatan', data);
      return response.data;
    } catch (error) {
      console.error('Gagal membuat jenis jabatan:', error);
      throw error;
    }
  },

  updateJenisJabatan: async (id: string, data: any) => {
    try {
      const response = await api.patch(`/mandala/jenis-jabatan/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Gagal update jenis jabatan ${id}:`, error);
      throw error;
    }
  },

  deleteJenisJabatan: async (id: string) => {
    try {
      const response = await api.delete(`/mandala/jenis-jabatan/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Gagal menghapus jenis jabatan ${id}:`, error);
      throw error;
    }
  }
};
