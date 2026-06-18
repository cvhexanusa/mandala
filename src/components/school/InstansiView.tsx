import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../common/PageBreadCrumb";
import PageMeta from "../common/PageMeta";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import { Modal } from "../ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { PencilIcon, TrashBinIcon, PlusIcon, EyeIcon, CopyIcon } from "../../icons";
import Swal from "sweetalert2";
import { dapodikService } from "../../services/dapodikService";

interface Cadisdik {
  cadisdik_id: string;
  nama_instansi: string;
  alamat: string;
  email: string;
  nomor_telepon: string | null;
  website: string | null;
  aktif: boolean;
}

export default function InstansiView() {
  const [data, setData] = useState<Cadisdik[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Cadisdik | null>(null);
  
  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingData, setViewingData] = useState<Cadisdik | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama_instansi: "",
    alamat: "",
    email: "",
    nomor_telepon: "",
    website: "",
    aktif: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await dapodikService.getCadisdik();
      setData(response.data || []);
    } catch (error) {
      console.error("Failed to fetch cadisdik:", error);
      Swal.fire("Error", "Gagal memuat data instansi", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item?: Cadisdik) => {
    if (item) {
      setEditingData(item);
      setFormData({
        nama_instansi: item.nama_instansi || "",
        alamat: item.alamat || "",
        email: item.email || "",
        nomor_telepon: item.nomor_telepon || "",
        website: item.website || "",
        aktif: item.aktif,
      });
    } else {
      setEditingData(null);
      setFormData({
        nama_instansi: "",
        alamat: "",
        email: "",
        nomor_telepon: "",
        website: "",
        aktif: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingData(null);
  };

  const handleOpenDetail = (item: Cadisdik) => {
    setViewingData(item);
    setIsDetailModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        nomor_telepon: formData.nomor_telepon || null,
        website: formData.website || null,
      };

      if (editingData) {
        await dapodikService.updateCadisdik(editingData.cadisdik_id, payload);
        Swal.fire("Berhasil", "Data instansi berhasil diperbarui", "success");
      } else {
        await dapodikService.createCadisdik(payload);
        Swal.fire("Berhasil", "Data instansi baru berhasil ditambahkan", "success");
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error("Save error:", error);
      Swal.fire("Error", error.response?.data?.message || "Gagal menyimpan data", "error");
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "Hapus Instansi?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dapodikService.deleteCadisdik(id);
          Swal.fire("Terhapus!", "Data instansi telah dihapus.", "success");
          fetchData();
        } catch (error: any) {
          console.error("Delete error:", error);
          Swal.fire("Error", error.response?.data?.message || "Gagal menghapus data", "error");
        }
      }
    });
  };

  return (
    <div>
      <PageMeta title="Profil Instansi | SIMAK" description="Manajemen Profil Instansi" />
      <PageBreadcrumb pageTitle="Daftar Instansi (Cadisdik)" />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manajemen Profil Instansi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data profil Cadisdik Wilayah.</p>
          </div>
          <Button startIcon={<PlusIcon />} onClick={() => handleOpenModal()}>
            Tambah Instansi
          </Button>
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
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Nama Instansi</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Email</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">No. Telepon</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Alamat</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Status</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.length > 0 ? (
                  data.map((item) => (
                    <TableRow key={item.cadisdik_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
                        {item.nama_instansi}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        {item.email}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        {item.nomor_telepon || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        <div className="truncate max-w-[250px]" title={item.alamat}>
                          {item.alamat}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${item.aktif ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'}`}>
                          {item.aktif ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenDetail(item)}
                            className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                            title="Detail"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-2 text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.cadisdik_id)}
                            className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                      Belum ada data instansi yang terdaftar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        className="max-w-2xl"
      >
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            {editingData ? "Ubah Data Instansi" : "Tambah Instansi Baru"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Instansi <span className="text-error-500">*</span></label>
                <Input 
                  name="nama_instansi"
                  value={formData.nama_instansi}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Cadisdik Wilayah VII"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-error-500">*</span></label>
                <Input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="email@instansi.go.id"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nomor Telepon</label>
                <Input 
                  name="nomor_telepon"
                  value={formData.nomor_telepon}
                  onChange={handleInputChange}
                  placeholder="08xxxxxxxx / (022) xxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website</label>
                <Input 
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alamat Lengkap <span className="text-error-500">*</span></label>
                <Input 
                  name="alamat"
                  value={formData.alamat}
                  onChange={handleInputChange}
                  required
                  placeholder="Jl. Ahmad Yani..."
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 mt-2 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800">
                <input 
                  type="checkbox" 
                  id="aktif" 
                  name="aktif"
                  checked={formData.aktif}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="aktif" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Instansi Aktif <span className="text-xs text-gray-500 block">Tandai jika instansi ini sedang beroperasi</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={handleCloseModal} type="button">
                Batal
              </Button>
              <Button variant="primary" type="submit">
                {editingData ? "Simpan Perubahan" : "Tambah Instansi"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        className="max-w-2xl"
      >
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            Detail Profil Instansi
          </h3>
          {viewingData && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Profil Instansi</h4>
                <DataRow label="Nama Instansi" value={viewingData.nama_instansi} />
                <DataRow label="Email" value={viewingData.email} />
                <DataRow label="Nomor Telepon" value={viewingData.nomor_telepon} />
                <DataRow label="Website" value={viewingData.website} />
                <DataRow label="Alamat Lengkap" value={viewingData.alamat} />
                <DataRow label="Status" value={viewingData.aktif ? "Aktif" : "Non-Aktif"} />
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informasi Sistem</h4>
                <p className="text-[10px] text-gray-400 mb-2 italic">* ID ini digunakan otomatis oleh sistem untuk referensi database.</p>
                <DataRow label="ID Referensi Sistem" value={viewingData.cadisdik_id} isID />
              </div>
            </div>
          )}
          <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DataRow({ label, value, isID = false }: { label: string; value: any; isID?: boolean }) {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
        title: "Tersalin!",
        text: "ID telah disalin ke papan klip",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[150px]">{label}</span>
      <div className="flex items-center gap-2 sm:justify-end flex-1">
        <span className={`text-sm font-semibold text-gray-800 dark:text-gray-200 break-all ${isID ? 'font-mono bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded text-xs' : ''}`}>
          {isID && value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : (value || "-")}
        </span>
        {isID && value && (
          <button 
            onClick={() => handleCopy(value)}
            className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            title="Salin ID"
          >
            <CopyIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
