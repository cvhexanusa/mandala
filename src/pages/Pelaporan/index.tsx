import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import Badge from "../../components/ui/badge/Badge";
import { SearchIcon, PlusIcon, BoltIcon } from "../../icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Pagination from "../../components/common/Pagination";
import { mandalaService, Pelaporan } from "../../services/mandalaService";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";

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
    if (!user?.cadisdik_id) {
      console.warn("Fetch pelaporan dibatalkan: user.cadisdik_id tidak ditemukan");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("Requesting pelaporan for cadisdik_id:", user.cadisdik_id);
      const response = await mandalaService.getPelaporan(user.cadisdik_id, currentPage, itemsPerPage);
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
        <div className="flex justify-end">
          <Link to={`/${roleSlug}/pelaporan-dokumen/create`}>
            <Button size="sm" startIcon={<PlusIcon />}>
              Buat Permintaan Pelaporan
            </Button>
          </Link>
        </div>

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
                          <Link to={`/${roleSlug}/pelaporan-dokumen/detail/${item.pelaporan_id}`}>
                            <button className="text-brand-500 hover:text-brand-600 font-semibold text-theme-sm transition-colors cursor-pointer">
                              Detail
                            </button>
                          </Link>
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
