import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { useAuth } from "../../context/AuthContext";
import { layananMandalaService, PermohonanLayanan, LayananMaster, LayananSyarat } from "../../services/layananMandalaService";
import { Modal } from "../../components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Pagination from "../../components/common/Pagination";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import Avatar from "../../components/ui/avatar/Avatar";
import { SearchIcon, BoltIcon, CheckCircleIcon, PlusIcon, PencilIcon, TrashBinIcon, ListIcon } from "../../icons";
import Swal from "sweetalert2";

export default function LayananMandalaPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Detect category from URL path (GTK vs PD)
  const categoryParam = location.pathname.includes("peserta-didik") ? "pesertadidik" : "gtk";
  const categoryInt = categoryParam === "gtk" ? 0 : 1;

  // Internal Tab State: "permohonan" or "master"
  const [activeTab, setActiveTab] = useState("permohonan");

  const [loading, setLoading] = useState(true);
  const [permohonanList, setPermohonanList] = useState<PermohonanLayanan[]>([]);
  const [masterList, setMasterList] = useState<LayananMaster[]>([]);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isSyaratModalOpen, setIsSyaratModalOpen] = useState(false);
  
  const [selectedPermohonan, setSelectedPermohonan] = useState<PermohonanLayanan | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<LayananMaster | null>(null);

  // Form States
  const [statusUpdate, setStatusUpdate] = useState({ status: 0, catatan: "" });
  const [masterForm, setMasterForm] = useState({ nama_layanan: "", aktif: true });
  const [syaratForm, setSyaratForm] = useState({ nama_syarat: "", wajib: true, urutan: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "permohonan") {
        const response = await layananMandalaService.getPermohonan({ kategori: categoryInt });
        setPermohonanList(response.data || []);
      } else {
        const response = await layananMandalaService.getMasterLayanan(categoryInt);
        setMasterList(response.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryInt, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Permohonan Handlers ---
  const handleUpdateStatus = async () => {
    if (!selectedPermohonan || !user?.id || statusUpdate.status === 0) return;
    try {
      await layananMandalaService.updateStatus(selectedPermohonan.permohonan_layanan_id, {
        status: statusUpdate.status,
        catatan: statusUpdate.catatan,
        pegawai_id: user.id
      });
      Swal.fire("Berhasil", "Status permohonan berhasil diperbarui.", "success");
      setIsDetailModalOpen(false);
      fetchData();
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan.", "error");
    }
  };

  // --- Master Layanan Handlers ---
  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedMaster) {
        await layananMandalaService.updateLayanan(selectedMaster.layanan_id, masterForm);
        Swal.fire("Berhasil", "Layanan master berhasil diperbarui.", "success");
      } else {
        await layananMandalaService.createLayanan({ ...masterForm, kategori: categoryInt });
        Swal.fire("Berhasil", "Layanan master berhasil ditambahkan.", "success");
      }
      setIsMasterModalOpen(false);
      fetchData();
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan.", "error");
    }
  };

  const handleDeleteMaster = async (id: string) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data layanan ini akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await layananMandalaService.deleteLayanan(id);
        Swal.fire("Dihapus!", "Layanan berhasil dihapus.", "success");
        fetchData();
      } catch (error: any) {
        Swal.fire("Gagal", "Gagal menghapus data. Pastikan tidak ada permohonan yang menggunakan layanan ini.", "error");
      }
    }
  };

  // --- Syarat Handlers ---
  const handleAddSyarat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaster) return;
    try {
      await layananMandalaService.createSyarat(selectedMaster.layanan_id, syaratForm);
      setSyaratForm({ nama_syarat: "", wajib: true, urutan: (selectedMaster.syarat?.length || 0) + 1 });
      const updated = await layananMandalaService.getMasterLayanan(categoryInt);
      setMasterList(updated.data);
      const newMaster = updated.data.find((l: any) => l.layanan_id === selectedMaster.layanan_id);
      setSelectedMaster(newMaster);
      Swal.fire("Berhasil", "Syarat berhasil ditambahkan.", "success");
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan.", "error");
    }
  };

  const handleDeleteSyarat = async (syaratId: string) => {
    try {
      await layananMandalaService.deleteSyarat(syaratId);
      const updated = await layananMandalaService.getMasterLayanan(categoryInt);
      setMasterList(updated.data);
      if (selectedMaster) {
         setSelectedMaster(updated.data.find((l: any) => l.layanan_id === selectedMaster.layanan_id));
      }
    } catch (err) {
      Swal.fire("Gagal", "Gagal menghapus syarat.", "error");
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1: return <Badge color="light">Diajukan</Badge>;
      case 2: return <Badge color="info">Diverifikasi</Badge>;
      case 3: return <Badge color="primary">Diproses</Badge>;
      case 4: return <Badge color="success">Selesai</Badge>;
      case 5: return <Badge color="error">Ditolak</Badge>;
      case 9: return <Badge color="warning">Dibatalkan</Badge>;
      default: return <Badge color="light">Draft</Badge>;
    }
  };

  const filteredPermohonan = permohonanList.filter((item) => {
    const search = searchTerm.toLowerCase();
    return item.ptk?.nama?.toLowerCase().includes(search) ||
           item.peserta_didik?.nama?.toLowerCase().includes(search) ||
           item.layanan?.nama_layanan?.toLowerCase().includes(search) ||
           item.nomor_permohonan?.toLowerCase().includes(search) ||
           item.sekolah?.nama?.toLowerCase().includes(search);
  });

  const filteredMaster = masterList.filter((item) => 
    item.nama_layanan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedData = activeTab === "permohonan" 
    ? filteredPermohonan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredMaster.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil((activeTab === "permohonan" ? filteredPermohonan.length : filteredMaster.length) / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, activeTab]);

  return (
    <>
      <PageMeta
        title={`Layanan Mandala ${categoryParam === "gtk" ? "GTK" : "Peserta Didik"} | MANDALA`}
        description="Portal Layanan Terpadu Mandala"
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manajemen Layanan {categoryParam === "gtk" ? "GTK" : "Peserta Didik"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Verifikasi permohonan dan kelola master jenis layanan administrasi.
            </p>
          </div>
          {activeTab === "master" && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => {
                setSelectedMaster(null);
                setMasterForm({ nama_layanan: "", aktif: true });
                setIsMasterModalOpen(true);
              }}
              startIcon={<PlusIcon className="size-4 fill-current" />}
            >
              Tambah Layanan
            </Button>
          )}
        </div>

        {/* Tabs Internal Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("permohonan")}
            className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all ${
              activeTab === "permohonan"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
            }`}
          >
            Daftar Permohonan
          </button>
          <button
            onClick={() => setActiveTab("master")}
            className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all ${
              activeTab === "master"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
            }`}
          >
            Master Layanan (Kategori)
          </button>
        </div>

        <ComponentCard title={activeTab === "permohonan" ? "Riwayat Permohonan Layanan" : "Daftar Jenis Layanan"}>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
            <div className="w-20">
              <Select
                options={rowsPerPageOptions}
                defaultValue={itemsPerPage.toString()}
                onChange={(value) => setItemsPerPage(parseInt(value))}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 max-w-sm w-full lg:justify-end">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-5" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
              <p className="text-gray-400 italic text-sm">Tidak ada data ditemukan</p>
            </div>
          ) : activeTab === "permohonan" ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-transparent">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-xs dark:text-gray-400 whitespace-nowrap">Nomor & Tanggal</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-xs dark:text-gray-400 whitespace-nowrap">Asal Sekolah</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-xs dark:text-gray-400 whitespace-nowrap">Pemohon</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-xs dark:text-gray-400 whitespace-nowrap">Jenis Layanan</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {paginatedData.map((item: any) => {
                      const subject = categoryInt === 0 ? item.ptk : item.peserta_didik;
                      return (
                        <TableRow key={item.permohonan_layanan_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 dark:text-white/90">{item.nomor_permohonan}</span>
                              <span className="text-xs text-gray-500">{new Date(item.tanggal_pengajuan || item.created_at).toLocaleDateString("id-ID")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 dark:text-white/90">{item.sekolah?.nama}</span>
                              <span className="text-xxs text-gray-400 uppercase">NPSN: {item.sekolah?.npsn}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar src={subject?.foto} size="small" />
                              <div>
                                <span className="font-semibold text-gray-800 dark:text-white/90">{subject?.nama || "Umum"}</span>
                                <p className="text-xxs text-gray-400 font-medium">
                                  {categoryInt === 0 ? subject?.nuptk || "Pegawai" : subject?.nisn || "PD"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/85">{item.layanan?.nama_layanan}</TableCell>
                          <TableCell className="px-5 py-3.5 text-center">{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedPermohonan(item);
                                setStatusUpdate({ status: item.status, catatan: "" });
                                setIsDetailModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-bold rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/5 transition"
                            >
                              Detail & Proses
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-transparent">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-xs dark:text-gray-400 whitespace-nowrap">Nama Layanan</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-xs dark:text-gray-400 whitespace-nowrap">Jml Syarat</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedData.map((item: any) => (
                    <TableRow key={item.layanan_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-3.5 font-bold text-gray-800 dark:text-white/90">{item.nama_layanan}</TableCell>
                      <TableCell className="px-5 py-3.5 text-center font-medium">{item.syarat?.length || 0} Syarat</TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <Badge color={item.aktif ? "success" : "light"}>{item.aktif ? "Aktif" : "Non-Aktif"}</Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedMaster(item);
                              setMasterForm({ nama_layanan: item.nama_layanan, aktif: item.aktif });
                              setIsMasterModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-brand-500 transition"
                            title="Edit Layanan"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMaster(item);
                              setSyaratForm({ nama_syarat: "", wajib: true, urutan: (item.syarat?.length || 0) + 1 });
                              setIsSyaratModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-500 transition"
                            title="Kelola Syarat"
                          >
                            <ListIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaster(item.layanan_id)}
                            className="p-1.5 text-gray-500 hover:text-error-500 transition"
                            title="Hapus"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </ComponentCard>
      </div>

      {/* Modal: Detail & Proses Permohonan */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} className="max-w-[800px] p-6 bg-white dark:bg-gray-900 rounded-3xl">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Detail Permohonan Layanan</h3>
        {selectedPermohonan && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
             <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Nomor Permohonan</span>
                <p className="font-bold text-gray-800 dark:text-white">{selectedPermohonan.nomor_permohonan}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Status Saat Ini</span>
                <div className="mt-1">{getStatusBadge(selectedPermohonan.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold border-b pb-2 flex items-center gap-2">
                  <BoltIcon className="size-4 text-brand-500" /> Informasi Pengajuan
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase">Sekolah</span>
                    <p className="text-sm font-bold">{selectedPermohonan.sekolah?.nama}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase">Jenis Layanan</span>
                    <p className="text-sm font-medium">{selectedPermohonan.layanan?.nama_layanan}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase">Pemohon</span>
                    <p className="text-sm font-medium">{categoryInt === 0 ? selectedPermohonan.ptk?.nama : selectedPermohonan.peserta_didik?.nama}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold border-b pb-2 flex items-center gap-2">
                  <CheckCircleIcon className="size-4 text-brand-500" /> Verifikasi Dokumen
                </h4>
                <div className="space-y-2">
                  {selectedPermohonan.permohonan_layanan_file?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Tidak ada dokumen yang diunggah</p>
                  ) : (
                    selectedPermohonan.permohonan_layanan_file?.map((f) => (
                      <div key={f.permohonan_layanan_file_id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 dark:text-white/80">{f.layanan_syarat?.nama_syarat || "File Pendukung"}</span>
                          <span className="text-[10px] text-brand-500 cursor-pointer hover:underline" onClick={() => window.open(f.file_url, '_blank')}>Lihat Dokumen</span>
                        </div>
                        <Badge color={f.status === 1 ? "success" : f.status === 2 ? "error" : "light"}>
                          {f.status === 1 ? "Valid" : f.status === 2 ? "Revisi" : "Menunggu"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t dark:border-gray-800">
              <h4 className="text-sm font-bold mb-4">Proses Permohonan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Update Status</label>
                  <select
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: parseInt(e.target.value) })}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent py-2.5 px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
                  >
                    <option value={1}>Diajukan</option>
                    <option value={2}>Diverifikasi Mandala</option>
                    <option value={3}>Menunggu Perbaikan</option>
                    <option value={4}>Menunggu Persetujuan Kasubag</option>
                    <option value={5}>Disetujui / Approved</option>
                    <option value={6}>Ditolak / Rejected</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                   <Input 
                    placeholder="Catatan petugas (opsional)..."
                    value={statusUpdate.catatan}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, catatan: e.target.value })}
                    className="flex-1"
                   />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
              <Button variant="primary" size="sm" onClick={handleUpdateStatus} startIcon={<CheckCircleIcon className="size-4 fill-current" />}>Update Status</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create/Edit Master Layanan */}
      <Modal isOpen={isMasterModalOpen} onClose={() => setIsMasterModalOpen(false)} className="max-w-[500px] p-6 bg-white dark:bg-gray-900 rounded-3xl">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
          {selectedMaster ? "Edit Layanan Master" : "Tambah Layanan Master"}
        </h3>
        <form onSubmit={handleSaveMaster} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nama Layanan</label>
            <Input
              value={masterForm.nama_layanan}
              onChange={(e) => setMasterForm({ ...masterForm, nama_layanan: e.target.value })}
              required
              placeholder="Contoh: Mutasi GTK, Legalisir Ijazah"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="master_aktif"
              checked={masterForm.aktif}
              onChange={(e) => setMasterForm({ ...masterForm, aktif: e.target.checked })}
              className="size-4 accent-brand-500"
            />
            <label htmlFor="master_aktif" className="text-sm font-medium">Layanan ini aktif</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsMasterModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" type="submit">Simpan Layanan</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kelola Syarat */}
      <Modal isOpen={isSyaratModalOpen} onClose={() => setIsSyaratModalOpen(false)} className="max-w-[700px] p-6 bg-white dark:bg-gray-900 rounded-3xl">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Persyaratan Layanan</h3>
        <p className="text-sm text-gray-500 mb-6">{selectedMaster?.nama_layanan}</p>

        <div className="space-y-6">
          <form onSubmit={handleAddSyarat} className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Tambah Syarat Baru</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nama Syarat (e.g. KTP, SK)"
                value={syaratForm.nama_syarat}
                onChange={(e) => setSyaratForm({ ...syaratForm, nama_syarat: e.target.value })}
                required
              />
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="wajib" checked={syaratForm.wajib} onChange={(e) => setSyaratForm({...syaratForm, wajib: e.target.checked})} className="accent-brand-500" />
                    <label htmlFor="wajib" className="text-xs font-semibold">Wajib</label>
                 </div>
                 <Button variant="primary" size="sm" type="submit" className="flex-1">Tambah</Button>
              </div>
            </div>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedMaster?.syarat?.map((s: LayananSyarat, idx: number) => (
              <div key={s.layanan_syarat_id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/20">
                <div className="flex items-center gap-3">
                  <span className="text-xxs font-bold text-gray-400 w-4">{idx + 1}.</span>
                  <span className="text-sm font-medium">{s.nama_syarat} {s.wajib && <span className="text-red-500">*</span>}</span>
                </div>
                <button onClick={() => handleDeleteSyarat(s.layanan_syarat_id)} className="text-gray-400 hover:text-error-500">
                   <TrashBinIcon className="size-4" />
                </button>
              </div>
            ))}
            {(!selectedMaster?.syarat || selectedMaster.syarat.length === 0) && (
              <p className="text-center py-4 text-xs text-gray-400 italic">Belum ada persyaratan</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t dark:border-gray-800">
           <Button variant="outline" size="sm" onClick={() => setIsSyaratModalOpen(false)}>Tutup</Button>
        </div>
      </Modal>
    </>
  );
}
