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

interface StudentAttendance {
  peserta_didik_id: string;
  tanggal: string;
  sekolah_id: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status_masuk: number | null;
  status_pulang: number | null;
  peserta_didik: {
    nama: string;
    nisn: string | null;
    nipd: string | null;
    foto: string | null;
    rombongan_belajar: {
      nama: string | null;
      tingkat_pendidikan_id_str: string | null;
    } | null;
  } | null;
}

const PresensiPD: React.FC = () => {
  const { sekolah: currentSekolah } = useSekolah();
  const [data, setData] = useState<StudentAttendance[]>([]);
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
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
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
      const response = await presensiService.getMandalaPresensiPD({
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
      
      // Extract unique classes for filter if not searching
      if (!searchTerm && fetchedData.length > 0) {
        const uniqueClasses: string[] = Array.from(
          new Set(
            fetchedData
              .map((item: StudentAttendance) => item.peserta_didik?.rombongan_belajar?.nama)
              .filter((c: any): c is string => !!c)
          )
        );
        if (uniqueClasses.length > 0) {
            setClasses(prev => Array.from(new Set([...prev, ...uniqueClasses])).sort());
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengambil data kehadiran.");
    } finally {
      setLoading(false);
    }
  }, [sekolahFilter, kabKotaFilter, kecamatanFilter, selectedDate, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Client-side class filter (since API might not support it directly yet)
  const displayData = selectedClass 
    ? data.filter(item => item.peserta_didik?.rombongan_belajar?.nama === selectedClass)
    : data;

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;


  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    // Check if it's a full ISO string or just time
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

  const classOptions = [
    { value: "", label: "Semua Rombel" },
    ...classes.map((cls) => ({ value: cls, label: cls })),
  ];

  return (
    <>
      <PageMeta
        title="Presensi Peserta Didik | SIMAK"
        description="Halaman presensi peserta didik"
      />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Laporan Presensi Peserta Didik
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pantau data kehadiran harian peserta didik di seluruh kelas.
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

        <ComponentCard title="Daftar Kehadiran Peserta Didik">
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
            
            <div className="flex flex-col sm:flex-row gap-3 max-w-3xl w-full lg:justify-end">
              <div className="relative max-w-sm w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-5" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari Nama atau NISN..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="w-full sm:w-48">
                <Select
                  options={classOptions}
                  defaultValue={selectedClass}
                  onChange={(value) => {
                    setSelectedClass(value);
                    setCurrentPage(1);
                  }}
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
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
             <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>
             </div>
             <p className="text-gray-500 font-medium">Data kehadiran peserta didik tidak ditemukan</p>
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
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NISN</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Rombel</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Masuk</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Pulang</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {displayData.map((item, index) => {
                    const student = item.peserta_didik;
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

                    const fotoUrl = getFotoUrl(student?.foto, '');

                    return (
                      <TableRow key={item.peserta_didik_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-start whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar src={fotoUrl} size="small" />
                            <span className="font-medium text-gray-800 dark:text-white/90">{student?.nama || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">{student?.nisn || "-"}</TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">{student?.rombongan_belajar?.nama || "-"}</TableCell>
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

export default PresensiPD;
