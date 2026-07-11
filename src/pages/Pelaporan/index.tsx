import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import { SearchIcon, PlusIcon, BoltIcon, EyeIcon, TrashBinIcon, PencilIcon } from "../../icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Pagination from "../../components/common/Pagination";
import { mandalaService, Pelaporan } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import Swal from "sweetalert2";

export default function PelaporanPage() {
  const { user } = useAuth();
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Pelaporan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const fetchPelaporan = useCallback(async () => {
    console.log("fetchPelaporan dipanggil, user:", user);
    setLoading(true);
    try {
      let response;
      if (roleSlug === "operator-sekolah") {
        response = await mandalaService.getSimakListPelaporan(currentPage, itemsPerPage);
      } else {
        let cadisdikId = user?.cadisdik_id;
        if (!cadisdikId) {
          try {
            const instansiRes = await dapodikService.getCadisdik();
            if (instansiRes?.data && instansiRes.data.length > 0) {
              cadisdikId = instansiRes.data[0].cadisdik_id;
            }
          } catch (err) {
            console.warn("Gagal fetch fallback cadisdik list:", err);
          }
        }

        if (!cadisdikId) {
          console.warn("Fetch pelaporan dibatalkan: cadisdik_id tidak ditemukan");
          setLoading(false);
          return;
        }
        console.log("Requesting pelaporan for cadisdik_id:", cadisdikId);
        response = await mandalaService.getPelaporan(cadisdikId, currentPage, itemsPerPage);
      }
      console.log("API Response getPelaporan raw:", response);
      
      let pelaporanData: Pelaporan[] = [];
      let total = 0;

      // Skenario 1: Response adalah array langsung
      if (Array.isArray(response)) {
        pelaporanData = response;
        total = response.length;
      } 
      // Skenario 2: Response memiliki property data (standar axios/service kita)
      else if (response && response.data) {
        if (Array.isArray(response.data)) {
          pelaporanData = response.data;
          total = response.total || response.data.length;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          pelaporanData = response.data.data;
          total = response.data.total || response.data.data.length;
        }
      }
      // Skenario 3: Response sukses tapi format lain
      else if (response && (response.status === "success" || !response.status)) {
        // Coba cari property array apapun
        const possibleArray = Object.values(response).find(v => Array.isArray(v));
        if (possibleArray) {
          pelaporanData = possibleArray as Pelaporan[];
          total = response.total || pelaporanData.length;
        }
      }

      setData(pelaporanData);
      setTotalItems(total);
      
      console.log("Processed Pelaporan Data:", pelaporanData, "Total:", total);
    } catch (error) {
      console.error("Gagal mengambil data pelaporan:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPelaporan();
  }, [fetchPelaporan]);

  const handleDelete = async (pelaporanId: string) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data permintaan pelaporan ini akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      let cadisdikId = user?.cadisdik_id;
      if (!cadisdikId) {
        try {
          const instansiRes = await dapodikService.getCadisdik();
          if (instansiRes?.data && instansiRes.data.length > 0) {
            cadisdikId = instansiRes.data[0].cadisdik_id;
          }
        } catch (err) {
          console.warn("Gagal fetch fallback cadisdik list:", err);
        }
      }

      if (!cadisdikId) {
        Swal.fire("Gagal", "ID Cadisdik tidak ditemukan.", "error");
        return;
      }

      try {
        const response = await mandalaService.deletePelaporan(pelaporanId, cadisdikId);
        if (response.status === "success" || response.success === true) {
          Swal.fire("Berhasil", "Permintaan pelaporan berhasil dihapus.", "success");
          fetchPelaporan();
        } else {
          Swal.fire("Gagal", response.message || "Gagal menghapus data", "error");
        }
      } catch (error: any) {
        console.error("Gagal menghapus pelaporan:", error);
        Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan saat menghapus", "error");
      }
    }
  };

  const filteredData = data.filter((item) =>
    item.judul.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  return (
    <>
      <PageMeta
        title="Pelaporan Dokumen | MANDALA"
        description="Manajemen permintaan pelaporan dokumen ke sekolah"
      />
      <PageBreadcrumb pageTitle="Pelaporan Dokumen" />

      <div className="space-y-6">
        {roleSlug !== "operator-sekolah" && (
          <div className="flex justify-end">
            <Link to={`/${roleSlug}/pelaporan-dokumen/create`}>
              <Button size="sm" startIcon={<PlusIcon />}>
                Buat Permintaan Pelaporan
              </Button>
            </Link>
          </div>
        )}

        <ComponentCard title="Daftar Permintaan Pelaporan">
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
                  placeholder="Cari judul pelaporan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar relative">
              <Table className="min-w-[1000px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Judul Pelaporan</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Periode</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Dokumen</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((item) => (
                      <TableRow key={item.pelaporan_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
                          {item.judul}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                          {item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString("id-ID") : "-"} s/d{" "}
                          {item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString("id-ID") : "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-600 dark:text-gray-400 font-medium">
                          {item.jumlah_sekolah}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          <Badge color="primary" size="sm">{item.jumlah_dokumen}</Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          {item.aktif ? (
                            <Badge color="success" size="sm">Aktif</Badge>
                          ) : (
                            <Badge color="error" size="sm">Non-aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link to={`/${roleSlug}/pelaporan-dokumen/detail/${item.pelaporan_id}`} title="Lihat Detail">
                              <button className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer">
                                <EyeIcon className="size-5" />
                              </button>
                            </Link>
                            {roleSlug !== "operator-sekolah" && item.jumlah_dokumen === 0 && (
                              <Link to={`/${roleSlug}/pelaporan-dokumen/edit/${item.pelaporan_id}`} title="Ubah Laporan">
                                <button className="p-2 text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg transition-colors cursor-pointer">
                                  <PencilIcon className="size-5" />
                                </button>
                              </Link>
                            )}
                            {roleSlug !== "operator-sekolah" && (
                              <button
                                onClick={() => handleDelete(item.pelaporan_id)}
                                className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Laporan"
                              >
                                <TrashBinIcon className="size-5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        Tidak ada data pelaporan ditemukan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
             <p className="text-sm text-gray-500">
                Menampilkan {filteredData.length} dari {totalItems} data
             </p>
             <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
             />
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
