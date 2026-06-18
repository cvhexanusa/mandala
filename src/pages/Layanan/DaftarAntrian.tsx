import React, { useState, useEffect, useCallback } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { Modal } from "../../components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { TrashBinIcon, PlusIcon, TimeIcon, CheckCircleIcon, CloseIcon } from "../../icons";
import Swal from "sweetalert2";
import { mandalaService, Antrian, KategoriKeperluan, AntrianRekap } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Menunggu", color: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" },
  1: { label: "Dipanggil", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  2: { label: "Dilayani", color: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400" },
  3: { label: "Selesai", color: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400" },
  4: { label: "Batal", color: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400" },
};

export default function DaftarAntrian() {
  const { user } = useAuth();
  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [kategori, setKategori] = useState<KategoriKeperluan[]>([]);
  const [rekap, setRekap] = useState<AntrianRekap | null>(null);
  const [instansiList, setInstansiList] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [filters, setFilters] = useState({
    cadisdik_id: "",
    status: "" as any,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState({
    cadisdik_id: "",
    kategori_keperluan_id: "",
    nama_lengkap: "",
    unit_instansi: "",
    keperluan: "",
    nomor_hp: "",
  });

  const [katFormData, setKatFormData] = useState({
    cadisdik_id: "",
    nama: "",
    deskripsi: "",
  });

  // Fungsi Fetch Data Utama
  const fetchData = useCallback(async (currentFilters: typeof filters, silent = false) => {
    if (!currentFilters.cadisdik_id) return;
    
    if (!silent) setLoading(true);
    try {
      const [antrianRes, kategoriRes, rekapRes] = await Promise.all([
        mandalaService.getAntrian(currentFilters),
        mandalaService.getKategoriKeperluan(currentFilters.cadisdik_id),
        mandalaService.getAntrianRekap(currentFilters.cadisdik_id)
      ]);
      
      setAntrian(antrianRes.data || []);
      setKategori(kategoriRes.data || []);
      setRekap(rekapRes.data || null);
    } catch (error: any) {
      console.error("Failed to fetch queue data:", error);
      // Hanya tampilkan alert jika bukan error yang sudah ditangani global
      if (error.response?.status !== 401) {
          Swal.fire({
              icon: "error",
              title: "Gagal Memuat Data",
              text: "Terjadi kesalahan saat mengambil data dari server. Hubungi administrator.",
              timer: 3000,
              showConfirmButton: false
          });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Inisialisasi Data
  useEffect(() => {
    const init = async () => {
      try {
        const instansiRes = await dapodikService.getCadisdik();
        const list = (instansiRes.data || []).map((i: any) => ({ 
          value: i.cadisdik_id, 
          label: i.nama_instansi 
        }));
        setInstansiList(list);
        
        const userCadisdikId = (user as any)?.cadisdik_id;
        const initialId = userCadisdikId || (list.length > 0 ? list[0].value : "");

        if (initialId) {
          const newFilters = { ...filters, cadisdik_id: initialId };
          setFilters(newFilters);
          setFormData(prev => ({ ...prev, cadisdik_id: initialId }));
          setKatFormData(prev => ({ ...prev, cadisdik_id: initialId, nama: "", deskripsi: "" }));
          setIsInitialized(true);
          
          // Jalankan fetch pertama kali
          fetchData(newFilters);
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
      }
    };

    if (user) {
      init();
    }
  }, [user, fetchData]);

  // Re-fetch saat filter berubah (kecuali inisialisasi) dan Auto-Refresh
  useEffect(() => {
    if (isInitialized) {
      fetchData(filters);

      // Polling setiap 5 detik untuk sinkronisasi real-time dengan buku tamu
      const interval = setInterval(() => {
        fetchData(filters, true); // true = silent fetch, tanpa loading spinner
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [filters, isInitialized, fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleKatInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setKatFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAntrian = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.kategori_keperluan_id) {
          Swal.fire("Peringatan", "Pilih kategori keperluan terlebih dahulu", "warning");
          return;
      }
      
      const payload = {
          ...formData,
          cadisdik_id: formData.cadisdik_id || filters.cadisdik_id
      };

      await mandalaService.createAntrian(payload);
      Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Antrian berhasil ditambahkan",
          timer: 2000,
          showConfirmButton: false,
      });
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, nama_lengkap: "", unit_instansi: "", keperluan: "", nomor_hp: "" }));
      fetchData(filters);
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Gagal menambah antrian", "error");
    }
  };

  const handleSubmitKategori = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
          ...katFormData,
          cadisdik_id: katFormData.cadisdik_id || filters.cadisdik_id
      };

      await mandalaService.createKategoriKeperluan(payload);
      Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Kategori berhasil ditambahkan",
          timer: 2000,
          showConfirmButton: false,
      });
      setIsKategoriModalOpen(false);
      setKatFormData(prev => ({ ...prev, nama: "" }));
      fetchData(filters);
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Gagal menambah kategori", "error");
    }
  };

  const handleUpdateStatus = async (id: string, status: number, isRecall: boolean = false) => {
    try {
      if (isRecall) {
        // Gunakan localStorage untuk mengirim sinyal "Panggil Ulang" antar tab ke MonitorAntrian
        localStorage.setItem('recall_antrian_id', `${id}_${Date.now()}`);
      }
      await mandalaService.updateAntrianStatus(id, status);
      fetchData(filters);
    } catch (error: any) {
      Swal.fire("Error", "Gagal memperbarui status", "error");
    }
  };

  return (
    <div>
      <PageMeta title="Daftar Antrian | SIMAK" description="Manajemen Antrian Tamu" />
      <PageBreadcrumb pageTitle="Daftar Antrian Tamu" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <RekapCard title="Total Antrian" value={rekap?.total || 0} subtitle="Hari ini" />
        <RekapCard title="Menunggu" value={rekap?.menunggu || 0} subtitle="Belum dipanggil" variant="brand" />
        <RekapCard title="Dilayani" value={rekap?.dilayani || 0} subtitle="Sedang proses" variant="warning" />
        <RekapCard title="Selesai" value={rekap?.selesai || 0} subtitle="Sudah selesai" variant="success" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="w-64">
              <Select 
                options={instansiList} 
                defaultValue={filters.cadisdik_id}
                onChange={(val) => setFilters(f => ({ ...f, cadisdik_id: val }))}
              />
            </div>
            <input 
              type="date" 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              value={filters.start_date}
              onChange={(e) => setFilters(f => ({ ...f, start_date: e.target.value, end_date: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              if (filters.cadisdik_id) window.open(`/monitor-antrian?cadisdik_id=${filters.cadisdik_id}`, '_blank');
              else Swal.fire("Peringatan", "Pilih instansi terlebih dahulu", "warning");
            }}>
              Layar Monitor
            </Button>
            <Button variant="outline" onClick={() => {
              if (filters.cadisdik_id) window.open(`/isi-antrian?cadisdik_id=${filters.cadisdik_id}`, '_blank');
              else Swal.fire("Peringatan", "Pilih instansi terlebih dahulu", "warning");
            }}>
              Buku Tamu
            </Button>
            <Button variant="outline" onClick={() => setIsKategoriModalOpen(true)}>
              Kelola Kategori
            </Button>
            <Button startIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
              Tambah Antrian
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          )}
          <div className="overflow-x-auto custom-scrollbar">
            <Table className="min-w-[1000px]">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">No. Antrian</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Informasi Tamu</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Tujuan & Keperluan</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Status</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {antrian.length > 0 ? (
                  antrian.map((item) => (
                    <TableRow key={item.id || item.antrian_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-xl font-semibold text-brand-500">#{item.nomor_antrian}</span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 dark:text-white/90">{item.nama_lengkap}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.unit_instansi || "Pribadi / Umum"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-0.5">{item.kategori_keperluan?.nama}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{item.keperluan}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${STATUS_MAP[item.status]?.color}`}>
                          {STATUS_MAP[item.status]?.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {item.status === 0 && (
                            <button onClick={() => handleUpdateStatus(item.id || item.antrian_id as string, 1)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Panggil Tamu">
                              <TimeIcon className="size-4" />
                            </button>
                          )}
                          {item.status === 1 && (
                            <>
                              <button onClick={() => handleUpdateStatus(item.id || item.antrian_id as string, 1)} className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors" title="Panggil Ulang">
                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                              </button>
                              <button onClick={() => handleUpdateStatus(item.id || item.antrian_id as string, 2)} className="p-2 text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg transition-colors" title="Mulai Layani">
                                <CheckCircleIcon className="size-4" />
                              </button>
                            </>
                          )}
                          {item.status === 2 && (
                            <button onClick={() => handleUpdateStatus(item.id || item.antrian_id as string, 3)} className="p-2 text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-lg transition-colors" title="Selesaikan">
                              <CheckCircleIcon className="size-4" />
                            </button>
                          )}
                          {item.status < 3 && (
                            <button onClick={() => handleUpdateStatus(item.id || item.antrian_id as string, 4)} className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors" title="Batalkan">
                              <CloseIcon className="size-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                      {loading ? "Memuat data..." : "Tidak ada antrian untuk tanggal ini."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Antrian */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-lg">
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            Tambah Antrian Baru
          </h3>
          <form onSubmit={handleSubmitAntrian} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Kategori Keperluan <span className="text-error-500">*</span></label>
              <Select 
                options={kategori.map(k => ({ value: k.kategori_keperluan_id || k.id || k.kategori_id || "", label: k.nama }))}
                onChange={(val) => setFormData(prev => ({ ...prev, kategori_keperluan_id: val }))}
                placeholder="Pilih Kategori"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap Tamu <span className="text-error-500">*</span></label>
              <Input name="nama_lengkap" value={formData.nama_lengkap} onChange={handleInputChange} required placeholder="Masukkan nama lengkap tamu" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asal Instansi</label>
              <Input name="unit_instansi" value={formData.unit_instansi} onChange={handleInputChange} placeholder="Contoh: PT. Maju Jaya / Umum" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Detail Keperluan <span className="text-error-500">*</span></label>
              <textarea 
                name="keperluan" 
                className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90" 
                rows={3}
                value={formData.keperluan}
                onChange={handleInputChange}
                required
                placeholder="Jelaskan maksud dan tujuan kunjungan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nomor Telepon (WhatsApp)</label>
              <Input name="nomor_hp" value={formData.nomor_hp} onChange={handleInputChange} placeholder="08xxxxxxxx" />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">Batal</Button>
              <Button type="submit">Simpan Antrian</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Kelola Kategori */}
      <Modal isOpen={isKategoriModalOpen} onClose={() => setIsKategoriModalOpen(false)} className="max-w-lg">
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            Kelola Kategori Keperluan
          </h3>
          
          <form onSubmit={handleSubmitKategori} className="space-y-4 mb-8 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Tambah Kategori Baru</h4>
            <div>
              <Input name="nama" value={katFormData.nama} onChange={handleKatInputChange} required placeholder="Nama Kategori (Contoh: Legalisir)" />
            </div>
            <Button type="submit" className="w-full" size="sm">Simpan Kategori</Button>
          </form>
          
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 px-1">Daftar Kategori Aktif</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {kategori.length > 0 ? kategori.map(k => (
              <div key={k.kategori_keperluan_id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl dark:bg-white/[0.03] dark:border-white/5 hover:border-brand-500/50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{k.nama}</span>
                </div>
                <button 
                  onClick={async () => {
                    Swal.fire({
                      title: "Hapus Kategori?",
                      text: "Kategori tidak bisa dihapus jika masih ada antrian yang menggunakannya.",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#d33",
                      cancelButtonColor: "#3085d6",
                      confirmButtonText: "Ya, Hapus!",
                      cancelButtonText: "Batal"
                    }).then(async (result) => {
                      if (result.isConfirmed) {
                        try {
                          await mandalaService.deleteKategoriKeperluan(k.kategori_keperluan_id || "");
                          fetchData(filters);
                        } catch (e: any) {
                          Swal.fire("Gagal", e.response?.data?.message || "Kategori tidak bisa dihapus karena masih digunakan", "error");
                        }
                      }
                    });
                  }}
                  className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                >
                  <TrashBinIcon className="size-4" />
                </button>
              </div>
            )) : (
              <p className="text-center py-4 text-xs text-gray-500">Belum ada kategori yang ditambahkan.</p>
            )}
          </div>
          
          <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setIsKategoriModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RekapCard({ title, value, subtitle, variant = "default" }: { title: string; value: number; subtitle: string; variant?: "default" | "brand" | "warning" | "success" | "error" }) {
  const colors = {
    default: "text-gray-800 dark:text-white border-gray-200",
    brand: "text-brand-500 border-brand-200 dark:border-brand-500/20",
    warning: "text-warning-500 border-warning-200 dark:border-warning-500/20",
    success: "text-success-500 border-success-200 dark:border-success-500/20",
    error: "text-error-500 border-error-200 dark:border-error-500/20",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800 shadow-sm">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className={`text-3xl font-bold leading-none ${colors[variant]}`}>{value}</h3>
        <span className="text-[10px] text-gray-400 mb-1 font-medium">{subtitle}</span>
      </div>
    </div>
  );
}
