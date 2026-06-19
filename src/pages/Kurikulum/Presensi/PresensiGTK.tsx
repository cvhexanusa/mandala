import React, { useEffect, useState, useCallback } from "react";
import PageMeta from "../../../components/common/PageMeta";
import ComponentCard from "../../../components/common/ComponentCard";
import { presensiService } from "../../../services/presensiService";
import { dapodikService } from "../../../services/dapodikService";
import { useSekolah } from "../../../context/SekolahContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import Avatar from "../../../components/ui/avatar/Avatar";
import Select from "../../../components/form/Select";
import Input from "../../../components/form/input/InputField";
import Pagination from "../../../components/common/Pagination";
import Badge from "../../../components/ui/badge/Badge";
import { SearchIcon } from "../../../icons";
import { getFotoUrl } from "../../../utils/image";

interface GtkAttendance {
  ptk_id: string;
  tanggal: string;
  sekolah_id: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status_masuk: number | null;
  status_pulang: number | null;
  gtk: {
    nama: string;
    nuptk: string | null;
    nip: string | null;
    foto: string | null;
    jenis_ptk_id_str: string | null;
  } | null;
}

const PresensiGTK: React.FC = () => {
  const { sekolah: currentSekolah } = useSekolah();
  const [data, setData] = useState<GtkAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // REGIONAL & SCHOOL FILTERS
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sekolahFilter, setSekolahFilter] = useState(currentSekolah?.sekolah_id || "all");
  
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Semua Kab/Kota" }]);
  const [kecamatanOptions, setKecamatanOptions] = useState([{ value: "all", label: "Semua Kecamatan" }]);
  const [sekolahOptions, setSekolahOptions] = useState([{ value: "all", label: "Semua Sekolah" }]);

  // Filter and pagination states
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // FETCH FILTER DATA (SCHOOLS)
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const response = await dapodikService.getSekolah();
        let schools = [];
        if (response.status === 'success' || response.success === true) {
          schools = response.data || [];
        } else if (Array.isArray(response)) {
          schools = response;
        } else if (response.data && Array.isArray(response.data)) {
          schools = response.data;
        }

        if (schools.length > 0) {
          setAllSchools(schools);
          
          const uniqueKab = [...new Set(schools.map((s: any) => s.kabupaten_kota || s.kabupate_kota))].filter(Boolean).sort();
          setKabKotaOptions([{ value: "all", label: "Semua Kab/Kota" }, ...uniqueKab.map(k => ({ value: k, label: k }))]);

          // Initial Sekolah Options
          setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...schools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
        }
      } catch (err) {
        console.error("Gagal memuat filter sekolah:", err);
      }
    };
    fetchFilterData();
  }, []);

  // Update Kecamatan and Sekolah options when Kab/Kota changes
  useEffect(() => {
    if (kabKotaFilter === "all") {
        setKecamatanOptions([{ value: "all", label: "Semua Kecamatan" }]);
        setKecamatanFilter("all");
        setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...allSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    } else {
        const filteredSchools = allSchools.filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
        
        const uniqueKec = [...new Set(filteredSchools.map(s => s.kecamatan))].filter(Boolean).sort();
        setKecamatanOptions([{ value: "all", label: "Semua Kecamatan" }, ...uniqueKec.map(k => ({ value: k, label: k }))]);
        setKecamatanFilter("all");

        setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    }
  }, [kabKotaFilter, allSchools]);

  // Update Sekolah options when Kecamatan changes
  useEffect(() => {
    if (kecamatanFilter === "all") {
        const filteredSchools = kabKotaFilter === "all" 
            ? allSchools 
            : allSchools.filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
        setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    } else {
        const filteredSchools = allSchools.filter(s => s.kecamatan === kecamatanFilter);
        setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    }
  }, [kecamatanFilter, kabKotaFilter, allSchools]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await presensiService.getMandalaPresensiGTK({
        sekolah_id: sekolahFilter === "all" ? undefined : sekolahFilter,
        kabupaten_kota: kabKotaFilter === "all" ? undefined : kabKotaFilter,
        kecamatan: kecamatanFilter === "all" ? undefined : kecamatanFilter,
        tanggal: selectedDate,
        limit: itemsPerPage,
        page: currentPage,
        search: searchTerm
      });

      let fetchedData = [];
      let totalCount = 0;

      if (response && (response.status === 'success' || response.success === true)) {
        fetchedData = response.data || [];
        totalCount = response.meta?.total || fetchedData.length;
      } else if (Array.isArray(response)) {
        fetchedData = response;
        totalCount = response.length;
      }

      setData(fetchedData);
      setTotalItems(totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data kehadiran GTK.");
    } finally {
      setLoading(false);
    }
  }, [sekolahFilter, kabKotaFilter, kecamatanFilter, selectedDate, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;


  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
  };

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  return (
    <>
      <PageMeta
        title="Presensi GTK | SIMAK"
        description="Halaman presensi GTK"
      />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Laporan Presensi GTK
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pantau kehadiran harian Guru dan Tenaga Kependidikan secara real-time.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Regional & School Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kota/Kabupaten</label>
                    <Select
                        options={kabKotaOptions}
                        defaultValue={kabKotaFilter}
                        onChange={(value) => {
                            setKabKotaFilter(value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kecamatan</label>
                    <Select
                        options={kecamatanOptions}
                        defaultValue={kecamatanFilter}
                        onChange={(value) => {
                            setKecamatanFilter(value);
                            setCurrentPage(1);
                        }}
                        disabled={kabKotaFilter === "all"}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Satuan Pendidikan</label>
                    <Select
                        options={sekolahOptions}
                        defaultValue={sekolahFilter}
                        onChange={(value) => {
                            setSekolahFilter(value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>
        </div>

        <ComponentCard title="Daftar Kehadiran GTK">
          {/* Filters Layout matching student-data */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
            <div className="w-20">
              <Select
                options={rowsPerPageOptions}
                defaultValue={itemsPerPage.toString()}
                onChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full lg:justify-end">
              <div className="relative max-w-sm w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-5" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari nama atau NUPTK..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="w-full sm:w-48">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
             <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             </div>
             <p className="text-gray-500 font-medium">Data kehadiran GTK tidak ditemukan</p>
             <p className="text-xs text-gray-400 mt-1">Belum ada aktivitas presensi pada kriteria ini.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <Table className="min-w-[1000px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">No.</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NUPTK</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jabatan</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Masuk</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Pulang</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {data.map((item, index) => {
                    const gtk = item.gtk;
                    const statusMasuk = item.status_masuk;
                    const hasMasuk = !!item.jam_masuk;
                    const hasPulang = !!item.jam_pulang;

                    // Status determination
                    let statusBadge = <Badge color="light">Belum Presensi</Badge>;

                    if (statusMasuk === 3) {
                      statusBadge = <Badge color="info">Izin</Badge>;
                    } else if (statusMasuk === 4) {
                      statusBadge = <Badge color="warning">Sakit</Badge>;
                    } else if (statusMasuk === 5) {
                      statusBadge = <Badge color="error">Alpha</Badge>;
                    } else if (hasMasuk || hasPulang) {
                      const isTerlambat = statusMasuk === 2;

                      if (hasMasuk && hasPulang) {
                        statusBadge = isTerlambat ? (
                          <Badge color="warning">Terlambat & Pulang</Badge>
                        ) : (
                          <Badge color="success">Lengkap</Badge>
                        );
                      } else if (hasMasuk) {
                        statusBadge = isTerlambat ? (
                          <Badge color="warning">Terlambat</Badge>
                        ) : (
                          <Badge color="primary">Presensi Masuk</Badge>
                        );
                      } else if (hasPulang) {
                        statusBadge = <Badge color="info">Presensi Pulang</Badge>;
                      }
                    }

                    const fotoUrl = getFotoUrl(gtk?.foto, '');

                    return (
                      <TableRow key={item.ptk_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-start whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar src={fotoUrl} size="small" />
                            <span className="font-medium text-gray-800 dark:text-white/90">{gtk?.nama || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">{gtk?.nuptk || "-"}</TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">{gtk?.jenis_ptk_id_str || "-"}</TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">{formatTime(item.jam_masuk)}</TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">{formatTime(item.jam_pulang)}</TableCell>
                        <TableCell className="px-5 py-3.5">{statusBadge}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination component matching student-data */}
            <div className="no-print">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
    </>
  );
};

export default PresensiGTK;
