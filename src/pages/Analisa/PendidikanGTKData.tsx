import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon, EyeIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/common/Pagination";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";

interface PendidikanGTKDataProps {
  type?: "guru" | "tendik";
}

export default function PendidikanGTKData({ type }: PendidikanGTKDataProps) {
  const navigate = useNavigate();
  const { role } = useParams();

  // States
  const [schools, setSchools] = useState<any[]>([]);
  const [gtkData, setGtkData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [schoolRes, gtkRes] = await Promise.all([
          dapodikService.getSekolah(),
          dapodikService.getGTK(3000, "", 1, type, "aktif")
        ]);

        let schoolList = [];
        if (schoolRes.status === 'success' || schoolRes.success === true) {
          schoolList = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schoolList = schoolRes;
        } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
          schoolList = schoolRes.data;
        }
        setSchools(schoolList);

        let dataList = [];
        if (gtkRes.status === 'success' || gtkRes.success === true) {
          dataList = gtkRes.data || [];
        } else if (Array.isArray(gtkRes)) {
          dataList = gtkRes;
        } else if (gtkRes.data && Array.isArray(gtkRes.data)) {
          dataList = gtkRes.data;
        }
        setGtkData(dataList);
      } catch (err) {
        console.error("Gagal memuat data latar belakang pendidikan GTK:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  // Group GTK profiles by school to calculate stats for the summary table
  const schoolSummaryData = useMemo(() => {
    return schools.map((school) => {
      const schoolId = school.sekolah_id || school.id;
      
      const schoolGtk = gtkData.filter((item) => {
        const itemSchoolId = item.identitas?.sekolah_id || item.sekolah_id;
        return itemSchoolId === schoolId;
      });

      let higherEd = 0;
      let bachelor = 0;
      let diploma = 0;
      let slta = 0;

      schoolGtk.forEach((item) => {
        const edu = (item.kepegawaian?.pendidikan_terakhir || item.identitas?.pendidikan_terakhir || "").toUpperCase();
        if (edu.includes("S3") || edu.includes("S2") || edu.includes("MAGISTER") || edu.includes("DOKTOR")) {
          higherEd++;
        } else if (edu.includes("S1") || edu.includes("D4") || edu.includes("SARJANA")) {
          bachelor++;
        } else if (edu.includes("D3") || edu.includes("D2") || edu.includes("D1") || edu.includes("DIPLOMA")) {
          diploma++;
        } else if (edu.includes("SMA") || edu.includes("SMK") || edu.includes("SLTA") || edu.includes("MA")) {
          slta++;
        }
      });

      return {
        sekolah_id: schoolId,
        npsn: school.npsn || "-",
        nama: school.nama || "-",
        wilayah: `${school.kecamatan || "-"}, ${school.kabupaten_kota || school.kabupate_kota || "-"}`,
        totalGtk: schoolGtk.length,
        higherEd,
        bachelor,
        diploma,
        slta
      };
    });
  }, [schools, gtkData]);

  // Filter schools list
  const filteredSchools = useMemo(() => {
    return schoolSummaryData.filter((school) => {
      return (
        school.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        school.npsn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.wilayah.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [schoolSummaryData, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage) || 1;
  const paginatedSchools = useMemo(() => {
    return filteredSchools.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredSchools, currentPage, itemsPerPage]);

  const handleExport = () => {
    Swal.fire({
      title: "Export Data Rekapitulasi Pendidikan GTK?",
      text: "Data akan diunduh dalam format Excel.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Berhasil!",
          text: "File sedang diunduh...",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <PageMeta
        title={type === "guru" ? "Pendidikan Guru | SIMAK" : type === "tendik" ? "Pendidikan Tendik | SIMAK" : "Pendidikan GTK | SIMAK"}
        description={type === "guru" ? "Analisa Kualifikasi Pendidikan Guru" : type === "tendik" ? "Analisa Kualifikasi Pendidikan Tendik" : "Analisa Kualifikasi Pendidikan GTK"}
      />
      <div className="space-y-6 font-outfit">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {type === "guru" ? "Latar Belakang Pendidikan Guru" : type === "tendik" ? "Latar Belakang Pendidikan Tendik" : "Latar Belakang Pendidikan GTK"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {type === "guru" 
                ? "Analisa kualifikasi pendidikan formal dan kualifikasi Guru per sekolah." 
                : type === "tendik" 
                ? "Analisa kualifikasi pendidikan formal dan kualifikasi Tenaga Kependidikan per sekolah." 
                : "Analisa kualifikasi pendidikan formal dan kualifikasi Guru dan Tenaga Kependidikan per sekolah."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="success-outline"
              size="sm"
              className="min-w-[110px]"
              startIcon={<DownloadIcon className="size-4" />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[110px]"
              startIcon={<PrinterIcon className="size-4" />}
              onClick={handlePrint}
            >
              Cetak
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-5" />
              </span>
              <Input
                type="text"
                placeholder="Cari berdasarkan Nama Sekolah, NPSN, atau Wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Table Content Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          {/* Rows Per Page Selector */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
            <div className="w-20">
              <Select
                options={rowsPerPageOptions}
                defaultValue={itemsPerPage.toString()}
                onChange={(value) => setItemsPerPage(parseInt(value))}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center min-h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              )}
              <Table className="min-w-[900px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-32">NPSN</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-60">Nama Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-48">Wilayah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-28 font-bold">
                      {type === "guru" ? "Total Guru" : type === "tendik" ? "Total Tendik" : "Total GTK"}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap w-28">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedSchools.length > 0 ? (
                    paginatedSchools.map((school, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;

                      return (
                        <TableRow key={school.sekolah_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-mono font-medium text-gray-700 dark:text-gray-300">{school.npsn}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-bold text-gray-800 dark:text-white/90">{school.nama}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 font-medium">{school.wilayah}</TableCell>
                          <TableCell className="px-5 py-4 text-center text-theme-sm font-bold text-brand-600 dark:text-brand-400">{school.totalGtk}</TableCell>
                          <TableCell className="px-5 py-4 text-right">
                            <button
                              onClick={() => navigate(`/${role}/analisa/pendidikan-gtk/audit/${school.sekolah_id}${type ? `?type=${type}` : ""}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/10 dark:border-brand-400/20 rounded-xl transition-all cursor-pointer shadow-sm"
                              title="Periksa Kualifikasi Pendidikan"
                            >
                              <EyeIcon className="size-4" />
                              Periksa
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        {loading ? "Sedang memuat..." : "Tidak ada data kualifikasi pendidikan sekolah ditemukan."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredSchools.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
