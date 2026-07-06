import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon, GroupIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/common/Pagination";
import Avatar from "../../components/ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";
import Swal from "sweetalert2";
import { exportToExcel } from "../../utils/exportUtils";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";
import { formatPtkInduk } from "../../utils/dapodikUtils";

interface GTKItem {
  identitas?: {
    id: string;
    nama: string;
    foto?: string;
    nuptk?: string;
    nip?: string;
    tanggal_lahir?: string;
    sekolah_id?: string;
    jenis_kelamin?: string;
  };
  kepegawaian?: {
    status_kepegawaian?: string;
    jenis_ptk?: string;
    ptk_induk?: any;
  };
}

export default function PensiunPage() {
  const { role } = useParams();

  // States
  const [schools, setSchools] = useState<any[]>([]);
  const [gtkData, setGtkData] = useState<GTKItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sekolahFilter, setSekolahFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // default to Semua (>=57)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [sekolahOptions, setSekolahOptions] = useState([{ value: "all", label: "Semua Sekolah" }]);

  // Calculate age details: years and months
  const calculateAgeDetails = (birthDateString?: string) => {
    if (!birthDateString) return { years: 0, months: 0, totalMonths: 0 };
    const today = new Date();
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return { years: 0, months: 0, totalMonths: 0 };
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    
    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return {
      years,
      months,
      totalMonths: years * 12 + months
    };
  };

  const getRemainingTimeText = (years: number, months: number) => {
    const totalMonths = years * 12 + months;
    const targetMonths = 60 * 12; // 720 months
    const diff = targetMonths - totalMonths;
    
    if (diff <= 0) return "Sudah melewati batas usia pensiun";
    
    const diffYears = Math.floor(diff / 12);
    const diffMonths = diff % 12;
    
    const yearPart = diffYears > 0 ? `${diffYears} Tahun` : "";
    const monthPart = diffMonths > 0 ? `${diffMonths} Bulan` : "";
    
    return [yearPart, monthPart].filter(Boolean).join(" ");
  };

  // Load Initial Data (Schools & GTK)
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [schoolRes, gtkRes] = await Promise.all([
          dapodikService.getSekolah(),
          dapodikService.getGTK(3000, "", 1, undefined, "aktif") // fetch up to 3000 active GTK
        ]);

        let schoolList = [];
        if (schoolRes.status === "success" || schoolRes.success === true) {
          schoolList = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schoolList = schoolRes;
        } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
          schoolList = schoolRes.data;
        }
        setSchools(schoolList);

        if (schoolList.length > 0) {
          setSekolahOptions([
            { value: "all", label: "Semua Sekolah" },
            ...schoolList.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))
          ]);
        }

        let dataList = [];
        if (gtkRes.status === "success" || gtkRes.success === true) {
          dataList = gtkRes.data || [];
        } else if (Array.isArray(gtkRes)) {
          dataList = gtkRes;
        } else if (gtkRes.data && Array.isArray(gtkRes.data)) {
          dataList = gtkRes.data;
        }
        setGtkData(dataList);
      } catch (err) {
        console.error("Gagal memuat data pensiun GTK:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sekolahFilter, statusFilter]);

  const getSchoolName = (sekolahId?: string) => {
    if (!sekolahId) return "-";
    const school = schools.find((s) => (s.sekolah_id === sekolahId || s.id === sekolahId));
    return school ? school.nama : sekolahId;
  };

  // 1. Process and compute metrics for all targeted GTK (PNS, PPPK, P3K)
  const processedGTKData = useMemo(() => {
    return gtkData
      .filter((item) => {
        const status = item.kepegawaian?.status_kepegawaian?.toUpperCase() || "";
        const isTargetStatus = status === "PNS" || status === "PPPK" || status === "P3K";
        const isPtkInduk = formatPtkInduk(item.kepegawaian?.ptk_induk) === "Ya";
        return isTargetStatus && isPtkInduk;
      })
      .map((item) => {
        const ageDetails = calculateAgeDetails(item.identitas?.tanggal_lahir);
        const age = ageDetails.years;
        const months = ageDetails.months;
        const totalMonths = ageDetails.totalMonths;
        
        let statusPensiun: "harus_pensiun" | "menuju_pensiun" | "persiapan" | "pra_persiapan" | "normal" = "normal";
        
        if (age >= 60) {
          statusPensiun = "harus_pensiun";
        } else if (age === 59 && months >= 9) {
          statusPensiun = "menuju_pensiun"; // 3 bulan menuju 60 tahun (59 tahun 9, 10, atau 11 bulan)
        } else if (totalMonths >= 696 && totalMonths < 717) { // 58 tahun s/d 59 tahun 8 bulan (58 * 12 = 696)
          statusPensiun = "persiapan";
        } else if (age === 57) {
          statusPensiun = "pra_persiapan";
        }

        return {
          ...item,
          age,
          months,
          statusPensiun,
        };
      });
  }, [gtkData]);

  // Statistics
  const stats = useMemo(() => {
    const totalGTK = processedGTKData.length;
    const harusPensiun = processedGTKData.filter((i) => i.statusPensiun === "harus_pensiun").length;
    const menujuPensiun = processedGTKData.filter((i) => i.statusPensiun === "menuju_pensiun").length;
    const persiapan = processedGTKData.filter((i) => i.statusPensiun === "persiapan").length;
    const praPersiapan = processedGTKData.filter((i) => i.statusPensiun === "pra_persiapan").length;

    return {
      totalGTK,
      harusPensiun,
      menujuPensiun,
      persiapan: persiapan + praPersiapan, // combine 57-59 for display card
    };
  }, [processedGTKData]);

  // 2. Filter data based on dropdown/search inputs
  const filteredGTKList = useMemo(() => {
    return processedGTKData.filter((item) => {
      // 1. Search Query filter (Name, NUPTK)
      const name = item.identitas?.nama || "";
      const nuptk = item.identitas?.nuptk || "";
      const nip = item.identitas?.nip || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nuptk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nip.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. School Filter
      const matchesSchool =
        sekolahFilter === "all" || item.identitas?.sekolah_id === sekolahFilter;

      // 3. Retirement Status Filter
      const matchesStatus =
        statusFilter === "all"
          ? item.statusPensiun !== "normal" // show only >=57 (excludes normal)
          : item.statusPensiun === statusFilter;

      return matchesSearch && matchesSchool && matchesStatus;
    });
  }, [processedGTKData, searchQuery, sekolahFilter, statusFilter]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredGTKList.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    return filteredGTKList.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredGTKList, currentPage, itemsPerPage]);

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const statusOptions = [
    { value: "all", label: "Semua Masa Pensiun (≥ 57 Tahun)" },
    { value: "harus_pensiun", label: "Harus Segera Pensiun (≥ 60 Tahun)" },
    { value: "menuju_pensiun", label: "Menuju Pensiun (≤ 3 Bulan)" },
    { value: "persiapan", label: "Persiapan Pensiun (58-59 Tahun)" },
    { value: "pra_persiapan", label: "Pra-Persiapan Pensiun (57 Tahun)" },
  ];

  const handleExport = () => {
    Swal.fire({
      title: "Export Data GTK Masa Pensiun?",
      text: "Data akan diunduh dalam format Excel.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = [
          "No",
          "Nama Lengkap",
          "NIP",
          "NUPTK",
          "Status Kepegawaian",
          "Jenis PTK",
          "Satuan Pendidikan",
          "Tanggal Lahir",
          "Usia",
          "Status Pensiun",
          "Keterangan"
        ];

        const rows = filteredGTKList.map((item, index) => {
          const birthDateStr = item.identitas?.tanggal_lahir
            ? new Date(item.identitas.tanggal_lahir).toLocaleDateString("id-ID")
            : "-";
          
          let statusText = "Persiapan Pensiun";
          let descriptionText = `Usia ${item.age} tahun. Memasuki masa persiapan pensiun.`;
          
          if (item.statusPensiun === "harus_pensiun") {
            statusText = "Harus Segera Pensiun";
            descriptionText = `Usia telah mencapai ${item.age} tahun. Harus segera pensiun demi menghindari anomali data kepegawaian.`;
          } else if (item.statusPensiun === "menuju_pensiun") {
            statusText = "Menuju Pensiun (<= 3 Bulan)";
            descriptionText = `Usia ${item.age} tahun ${item.months} bulan. Tinggal ${getRemainingTimeText(item.age, item.months)} menuju 60 tahun.`;
          } else if (item.statusPensiun === "pra_persiapan") {
            statusText = "Pra-Persiapan Pensiun";
            descriptionText = `Usia ${item.age} tahun. Masa pra-persiapan pensiun.`;
          }

          return [
            index + 1,
            item.identitas?.nama || "-",
            item.identitas?.nip || "-",
            item.identitas?.nuptk || "-",
            item.kepegawaian?.status_kepegawaian || "-",
            item.kepegawaian?.jenis_ptk || "-",
            getSchoolName(item.identitas?.sekolah_id),
            birthDateStr,
            `${item.age} Tahun ${item.months} Bulan`,
            statusText,
            descriptionText
          ];
        });

        exportToExcel(
          `Data_Pensiun_GTK_${new Date().toISOString().slice(0, 10)}.xlsx`,
          "Pensiun GTK",
          `Analitik & Evaluasi Masa Pensiun GTK (${sekolahFilter === "all" ? "Semua Sekolah" : getSchoolName(sekolahFilter)})`,
          headers,
          rows
        );
      }
    });
  };

  const handlePrint = () => {
    Swal.fire({
      title: "Mempersiapkan Cetak PDF",
      text: "Menyelaraskan data instansi...",
      timer: 700,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    setTimeout(() => {
      Swal.close();
      setTimeout(() => {
        window.print();
      }, 600);
    }, 700);
  };

  return (
    <>
      <PageMeta
        title="Analisa Masa Pensiun GTK | SIMAK"
        description="Analisis daftar Guru dan Tenaga Kependidikan PNS & PPPK yang memasuki masa pensiun."
      />
      <div className="space-y-6 font-outfit">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Analisa Masa Pensiun GTK
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Analisis daftar Guru dan Tenaga Kependidikan (PNS & PPPK/P3K) yang telah berusia ≥ 57 tahun untuk menghindari anomali status aktif.
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print animate-[fadeIn_0.3s_ease-out]">
          {/* Card 1: Total Retiree Target */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
            <div className="p-3 bg-brand-500/10 dark:bg-brand-500/15 text-brand-500 dark:text-brand-400 rounded-xl">
              <GroupIcon className="size-6" />
            </div>
            <div>
              <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total GTK Terpantau</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{stats.totalGTK}</span>
            </div>
          </div>

          {/* Card 2: Harus Segera Pensiun */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
            <div className="p-3 bg-error-500/10 dark:bg-error-500/15 text-error-500 dark:text-error-400 rounded-xl">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Harus Pensiun (≥60)</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.harusPensiun}</span>
            </div>
          </div>

          {/* Card 3: Menuju Pensiun (<= 3 Bulan) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
            <div className="p-3 bg-warning-500/10 dark:bg-warning-500/15 text-amber-600 dark:text-amber-500 rounded-xl">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Menuju Pensiun (≤3 Bln)</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">{stats.menujuPensiun}</span>
            </div>
          </div>

          {/* Card 4: Masa Persiapan Pensiun */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
            <div className="p-3 bg-blue-light-500/10 dark:bg-blue-light-500/15 text-blue-light-600 dark:text-blue-light-400 rounded-xl">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Masa Persiapan (57-59)</span>
              <span className="text-2xl font-bold text-blue-light-600 dark:text-blue-light-400">{stats.persiapan}</span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-5" />
              </span>
              <Input
                type="text"
                placeholder="Cari Nama, NIP, atau NUPTK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={sekolahOptions}
              defaultValue={sekolahFilter}
              onChange={(value) => setSekolahFilter(value)}
            />
            <Select
              options={statusOptions}
              defaultValue={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            />
          </div>
        </div>

        {/* Table Content Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area shadow-sm">
          {/* Printable Header Section (Only visible during print) */}
          <PrintReportLayout
            title="LAPORAN ANALITIK MASA PENSIUN GTK"
            sekolahFilter={sekolahFilter}
            schools={schools}
            extraFilters={[
              { label: "Status Kepegawaian", value: statusFilter === "all" ? "PNS & PPPK/P3K" : statusFilter.toUpperCase() }
            ]}
          />

          {/* Rows Per Page Selector */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
            <div className="w-20">
              <Select
                options={rowsPerPageOptions}
                defaultValue={itemsPerPage.toString()}
                onChange={(value) => setItemsPerPage(parseInt(value))}
              />
            </div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Menampilkan {filteredGTKList.length} data Guru/Tendik (PNS & PPPK)
            </div>
          </div>

          {/* Screen Table (Hidden in Print) */}
          <div className="no-print overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center min-h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              )}
              <Table className="min-w-[1000px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-56">Nama</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-44">NIP</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-44">NUPTK</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-48">Satuan Pendidikan</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-36">Status / Kepegawaian</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-24">Usia</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-36">Status Pensiun</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Keterangan Analitik</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      const birthDateStr = item.identitas?.tanggal_lahir
                        ? new Date(item.identitas.tanggal_lahir).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <TableRow key={item.identitas?.id || index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                          <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar src={getFotoUrl(item.identitas?.foto, "")} size="small" />
                              <span className="font-semibold text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 font-mono">
                            {item.identitas?.nip || "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 font-mono">
                            {item.identitas?.nuptk || "-"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 font-medium">
                            {getSchoolName(item.identitas?.sekolah_id)}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 font-medium">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 dark:text-white/90">{item.kepegawaian?.status_kepegawaian || "-"}</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{item.kepegawaian?.jenis_ptk || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-gray-800 dark:text-white/90">{item.age} Th {item.months} Bln</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5">{birthDateStr}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            {item.statusPensiun === "harus_pensiun" && (
                              <Badge color="error" size="sm" variant="light">
                                Harus Pensiun
                              </Badge>
                            )}
                            {item.statusPensiun === "menuju_pensiun" && (
                              <Badge color="warning" size="sm" variant="solid" className="bg-amber-600 text-white dark:bg-amber-600 dark:text-white animate-pulse">
                                Menuju Pensiun
                              </Badge>
                            )}
                            {item.statusPensiun === "persiapan" && (
                              <Badge color="warning" size="sm" variant="light">
                                Persiapan Pensiun
                              </Badge>
                            )}
                            {item.statusPensiun === "pra_persiapan" && (
                              <Badge color="info" size="sm" variant="light">
                                Pra-Persiapan
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm">
                            {item.statusPensiun === "harus_pensiun" && (
                              <span className="text-red-600 dark:text-red-400 font-medium animate-pulse">
                                Usia telah mencapai {item.age} tahun. Harap segera proses administrasi pensiun untuk menghindari anomali data kepegawaian aktif.
                              </span>
                            )}
                            {item.statusPensiun === "menuju_pensiun" && (
                              <span className="text-amber-700 dark:text-amber-500 font-semibold">
                                Sisa {getRemainingTimeText(item.age, item.months)} menuju usia 60 tahun. Persiapkan berkas administrasi pensiun sekarang.
                              </span>
                            )}
                            {item.statusPensiun === "persiapan" && (
                              <span className="text-amber-600 dark:text-orange-400 font-medium">
                                Memasuki masa persiapan pensiun. Sisa {getRemainingTimeText(item.age, item.months)} lagi.
                              </span>
                            )}
                            {item.statusPensiun === "pra_persiapan" && (
                              <span className="text-blue-light-600 dark:text-blue-light-400 font-medium">
                                Masa pra-persiapan pensiun awal. Sisa {getRemainingTimeText(item.age, item.months)} lagi.
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        {loading ? "Sedang memuat..." : "Tidak ada data GTK (PNS & PPPK) yang memasuki masa pensiun."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Print Table (Only Visible in Print - renders all items without pagination) */}
          <div className="print-only">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>NIP</th>
                  <th>NUPTK</th>
                  <th>Satuan Pendidikan</th>
                  <th>Status / Kepegawaian</th>
                  <th>Usia</th>
                  <th>Status Pensiun</th>
                  <th>Keterangan Analitik</th>
                </tr>
              </thead>
              <tbody>
                {filteredGTKList.length > 0 ? (
                  filteredGTKList.map((item, index) => {
                    const birthDateStr = item.identitas?.tanggal_lahir
                      ? new Date(item.identitas.tanggal_lahir).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-";
                    let statusLabel = "";
                    if (item.statusPensiun === "harus_pensiun") statusLabel = "Harus Pensiun";
                    else if (item.statusPensiun === "menuju_pensiun") statusLabel = "Menuju Pensiun";
                    else if (item.statusPensiun === "persiapan") statusLabel = "Persiapan Pensiun";
                    else if (item.statusPensiun === "pra_persiapan") statusLabel = "Pra-Persiapan";

                    let reasonLabel = "";
                    if (item.statusPensiun === "harus_pensiun") {
                      reasonLabel = `Usia telah mencapai ${item.age} tahun. Harap segera proses administrasi pensiun untuk menghindari anomali data kepegawaian aktif.`;
                    } else if (item.statusPensiun === "menuju_pensiun") {
                      reasonLabel = `Sisa ${getRemainingTimeText(item.age, item.months)} menuju usia 60 tahun. Persiapkan berkas administrasi pensiun sekarang.`;
                    } else if (item.statusPensiun === "persiapan") {
                      reasonLabel = `Memasuki masa persiapan pensiun. Sisa ${getRemainingTimeText(item.age, item.months)} lagi.`;
                    } else if (item.statusPensiun === "pra_persiapan") {
                      reasonLabel = `Masa pra-persiapan pensiun awal. Sisa ${getRemainingTimeText(item.age, item.months)} lagi.`;
                    }

                    return (
                      <tr key={item.identitas?.id || index}>
                        <td style={{ textAlign: "center" }}>{index + 1}</td>
                        <td style={{ fontWeight: "bold" }}>{item.identitas?.nama}</td>
                        <td>{item.identitas?.nip || "-"}</td>
                        <td>{item.identitas?.nuptk || "-"}</td>
                        <td>{getSchoolName(item.identitas?.sekolah_id)}</td>
                        <td>
                          {item.kepegawaian?.status_kepegawaian || "-"} - {item.kepegawaian?.jenis_ptk || "-"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {item.age} Th {item.months} Bln ({birthDateStr})
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>
                          {statusLabel}
                        </td>
                        <td>{reasonLabel}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center" }}>
                      Tidak ada data GTK (PNS & PPPK) yang memasuki masa pensiun.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredGTKList.length > 0 && (
            <div className="mt-6 no-print">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}

          <PrintSignature />
        </div>
      </div>
    </>
  );
}
