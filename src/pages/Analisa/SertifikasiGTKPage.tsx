import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/common/Pagination";
import ComponentCard from "../../components/common/ComponentCard";
import { DownloadIcon, PrinterIcon, SearchIcon, EyeIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";
import { exportToExcel } from "../../utils/exportUtils";
import Avatar from "../../components/ui/avatar/Avatar";
import { getFotoUrl } from "../../utils/image";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

export default function SertifikasiGTKPage() {
  const navigate = useNavigate();
  const { role } = useParams();

  // States
  const [schools, setSchools] = useState<any[]>([]);
  const [gtkData, setGtkData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"certified" | "uncertified">("certified");
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const schoolRes = await dapodikService.getSekolah();
        let schoolList = [];
        if (schoolRes.status === "success" || schoolRes.success === true) {
          schoolList = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schoolList = schoolRes;
        } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
          schoolList = schoolRes.data;
        }
        setSchools(schoolList);

        const maxLimit = 100;
        const firstPageGTK = await dapodikService.getGTK(maxLimit, "", 1, undefined, "aktif");
        
        let dataList = [];
        let totalCount = 0;
        if (firstPageGTK.status === "success" || firstPageGTK.success === true) {
          dataList = firstPageGTK.data || [];
          totalCount = firstPageGTK.meta?.total_data || firstPageGTK.meta?.total || firstPageGTK.total || dataList.length;
        } else if (Array.isArray(firstPageGTK)) {
          dataList = firstPageGTK;
          totalCount = firstPageGTK.length;
        } else if (firstPageGTK.data && Array.isArray(firstPageGTK.data)) {
          dataList = firstPageGTK.data;
          totalCount = firstPageGTK.meta?.total_data || firstPageGTK.total || dataList.length;
        }

        const totalPages = Math.ceil(totalCount / maxLimit);

        if (totalPages > 1) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(dapodikService.getGTK(maxLimit, "", p, undefined, "aktif"));
          }
          const otherPages = await Promise.all(pagePromises);
          otherPages.forEach((pageRes) => {
            let pageData = [];
            if (pageRes.status === "success" || pageRes.success === true) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
            dataList = [...dataList, ...pageData];
          });
        }

        // Filter only those whose ptk_induk is "Ya" / true / 1 / "ya"
        const filteredGtkData = dataList.filter((item: any) => {
          const val = item.kepegawaian?.ptk_induk;
          if (val === null || val === undefined) return false;
          const str = String(val).trim().toLowerCase();
          return str === "1" || str === "true" || str === "ya";
        });

        setGtkData(filteredGtkData);
      } catch (err) {
        console.error("Gagal memuat data sertifikasi GTK:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Safe parse function for certification
  const parseSertifikasi = (item: any) => {
    let certs = item.sertifikasi || item.riwayat_sertifikasi || item.rwy_sertifikasi || item.rawItem?.sertifikasi || item.rawItem?.riwayat_sertifikasi || item.rawItem?.rwy_sertifikasi;
    if (!certs) return [];
    if (typeof certs === "string") {
      try {
        certs = JSON.parse(certs);
      } catch (e) {
        return [];
      }
    }
    if (!Array.isArray(certs)) return [];

    const mapped = certs.map((s: any) => {
      const tglB = s.tgl_berlaku || s.tgl_sert || s.tglBerlaku || "";
      const tglH = s.tgl_habis_berlaku || s.tgl_exp_sert || s.tglHabisBerlaku || "";
      return {
        lembagaSertifikasi: s.lembaga_sertifikasi_nama || s.lembaga_sertifikasi || s.lemb_sertifikasi?.nm_lemb_sert || s.kode_lemb_sert || s.lembagaSertifikasi || "",
        bidangStudi: s.bidang_studi_nama || s.bidang_studi?.bidang_studi || s.bidang_studi || s.bidang_studi_id_str || s.bidangStudi || "",
        jenisSertifikasi: s.jenis_sertifikasi_nama || s.jenis_sertifikasi || s.id_jenis_sertifikasi || s.jenisSertifikasi || "",
        tglBerlaku: tglB ? tglB.split('T')[0] : "",
        tglHabisBerlaku: tglH ? tglH.split('T')[0] : "",
        noSertifikasi: s.no_sertifikasi || s.nomor_sertifikat || s.no_sertifikat || s.nomor_sert || s.noSertifikasi || "",
        noRegistrasi: s.no_registrasi || s.nomer_registrasi || s.noRegistrasi || "",
        nomorPeserta: s.nomor_peserta || s.no_peserta || s.nomorPeserta || "",
        kualifikasi: s.kualifikasi || ""
      };
    });

    return mapped.filter((c: any) => 
      c.lembagaSertifikasi?.toLowerCase().includes("sertifikasi pendidik")
    );
  };

  // Group GTK profiles by school to calculate stats for the summary table
  const schoolSummaryData = useMemo(() => {
    return schools.map((school) => {
      const schoolId = school.sekolah_id || school.id;
      
      const schoolGtk = gtkData.filter((item) => {
        const itemSchoolId = item.identitas?.sekolah_id || item.sekolah_id;
        return itemSchoolId === schoolId;
      });

      // Filter only Guru for certification stats
      const gurus = schoolGtk.filter((item) => {
        const roleStr = (item.kepegawaian?.jenis_ptk || item.role || "").toLowerCase();
        return roleStr.includes("guru") || item.type === "guru";
      });

      const certifiedGurus = gurus.filter(item => parseSertifikasi(item).length > 0);
      const uncertifiedGurus = gurus.filter(item => parseSertifikasi(item).length === 0);

      return {
        sekolah_id: schoolId,
        npsn: school.npsn || "-",
        nama: school.nama || "-",
        wilayah: `${school.kecamatan || "-"}, ${school.kabupaten_kota || school.kabupate_kota || "-"}`,
        totalGuru: gurus.length,
        certifiedCount: certifiedGurus.length,
        uncertifiedCount: uncertifiedGurus.length,
        percentage: gurus.length > 0 ? Math.round((certifiedGurus.length / gurus.length) * 100) : 0,
        gurus,
        certifiedGurus,
        uncertifiedGurus
      };
    });
  }, [schools, gtkData]);

  // Global Statistics
  const globalStats = useMemo(() => {
    let totalGuru = 0;
    let totalCertified = 0;
    let totalUncertified = 0;

    schoolSummaryData.forEach((s) => {
      totalGuru += s.totalGuru;
      totalCertified += s.certifiedCount;
      totalUncertified += s.uncertifiedCount;
    });

    const certifiedPercentage = totalGuru > 0 ? Math.round((totalCertified / totalGuru) * 100) : 0;
    const uncertifiedPercentage = totalGuru > 0 ? Math.round((totalUncertified / totalGuru) * 100) : 0;

    return {
      totalGuru,
      totalCertified,
      totalUncertified,
      certifiedPercentage,
      uncertifiedPercentage
    };
  }, [schoolSummaryData]);

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

  // Pagination for schools
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage) || 1;
  const paginatedSchools = useMemo(() => {
    return filteredSchools.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredSchools, currentPage, itemsPerPage]);

  // Selected School Detail
  const selectedSchool = useMemo(() => {
    if (!selectedSchoolId) return null;
    return schoolSummaryData.find(s => s.sekolah_id === selectedSchoolId) || null;
  }, [schoolSummaryData, selectedSchoolId]);

  // Filtered Gurus inside Selected School
  const filteredGurus = useMemo(() => {
    if (!selectedSchool) return [];
    const sourceList = activeDetailTab === "certified" 
      ? selectedSchool.certifiedGurus 
      : selectedSchool.uncertifiedGurus;

    return sourceList.filter((g: any) => {
      const nama = g.identitas?.nama || g.nama || "";
      const nuptk = g.identitas?.nuptk || g.nuptk || "";
      const nip = g.identitas?.nip || g.nip || "";
      const roleStr = g.kepegawaian?.jenis_ptk || g.role || "";
      
      const q = detailSearchQuery.toLowerCase();
      return (
        nama.toLowerCase().includes(q) ||
        nuptk.toLowerCase().includes(q) ||
        nip.toLowerCase().includes(q) ||
        roleStr.toLowerCase().includes(q)
      );
    });
  }, [selectedSchool, activeDetailTab, detailSearchQuery]);

  // Pagination for selected school detail list
  const detailTotalPages = Math.ceil(filteredGurus.length / 10) || 1;
  const paginatedDetailGurus = useMemo(() => {
    return filteredGurus.slice(
      (detailCurrentPage - 1) * 10,
      detailCurrentPage * 10
    );
  }, [filteredGurus, detailCurrentPage]);

  // Export to Excel
  const handleExport = () => {
    if (selectedSchool) {
      // Export detail list of selected school
      const tabLabel = activeDetailTab === "certified" ? "Sudah Sertifikasi" : "Belum Sertifikasi";
      Swal.fire({
        title: `Export Data Guru ${tabLabel}?`,
        text: `Data guru untuk ${selectedSchool.nama} akan diunduh dalam format Excel.`,
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
            "NIP",
            "NUPTK",
            "Nama Lengkap",
            "L/P",
            "Lembaga Sertifikasi",
            "Jenis PTK",
            "Bidang Studi Sertifikasi",
            "Nomor Sertifikat"
          ];

          const rows = filteredGurus.map((g, index) => {
            const certList = parseSertifikasi(g);
            const bidangStudi = certList.map((c: any) => c.bidangStudi || c.bidang_studi_id_str).filter(Boolean).join(", ") || "-";
            const noSert = certList.map((c: any) => c.noSertifikasi || c.nomor_sertifikat).filter(Boolean).join(", ") || "-";
            const lembSert = certList.map((c: any) => c.lembagaSertifikasi).filter(Boolean).join(", ") || "-";

            return [
              index + 1,
              g.identitas?.nip || g.nip || "-",
              g.identitas?.nuptk || g.nuptk || "-",
              g.identitas?.nama || g.nama || "-",
              g.identitas?.jenis_kelamin || "-",
              lembSert,
              g.kepegawaian?.jenis_ptk || g.role || "-",
              bidangStudi,
              noSert
            ];
          });

          exportToExcel(
            `Detail_Sertifikasi_Guru_${selectedSchool.nama.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`,
            tabLabel,
            `Daftar Guru ${tabLabel} - ${selectedSchool.nama.toUpperCase()}`,
            headers,
            rows
          );
        }
      });
    } else {
      // Export summary of all schools
      Swal.fire({
        title: "Export Rekapitulasi Sertifikasi Guru?",
        text: "Ringkasan data seluruh sekolah akan diunduh dalam format Excel.",
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
            "NPSN",
            "Nama Sekolah",
            "Wilayah",
            "Total Guru",
            "Sudah Sertifikasi",
            "Belum Sertifikasi",
            "Persentase Sertifikasi"
          ];

          const rows = filteredSchools.map((s, index) => [
            index + 1,
            s.npsn,
            s.nama,
            s.wilayah,
            s.totalGuru,
            s.certifiedCount,
            s.uncertifiedCount,
            `${s.percentage}%`
          ]);

          exportToExcel(
            `Rekapitulasi_Sertifikasi_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`,
            "Sertifikasi Guru",
            "Rekapitulasi Kualifikasi Sertifikasi Pendidik per Sekolah",
            headers,
            rows
          );
        }
      });
    }
  };

  // Print PDF Handler
  const handlePrint = () => {
    Swal.fire({
      title: "Mempersiapkan Cetak PDF",
      text: "Menyelaraskan data laporan...",
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

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  return (
    <>
      <PageMeta
        title="Sertifikasi Guru | SIMAK"
        description="Analisa Kualifikasi Sertifikasi Guru dan Tenaga Kependidikan"
      />

      <PrintReportLayout
        title={selectedSchool 
          ? `LAPORAN DETAIL SERTIFIKASI GURU - ${selectedSchool.nama.toUpperCase()}`
          : "LAPORAN REKAPITULASI SERTIFIKASI GURU KANTOR DINAS PENDIDIKAN"
        }
        sekolahFilter={selectedSchoolId || "all"}
        schools={schools}
        extraFilters={selectedSchool ? [
          { label: "Status Sertifikasi", value: activeDetailTab === "certified" ? "SUDAH SERTIFIKASI" : "BELUM SERTIFIKASI" }
        ] : []}
      />

      <div className="space-y-6 font-outfit no-print">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Analisa Sertifikasi Guru
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedSchool 
                ? `Detail status sertifikasi pendidik untuk ${selectedSchool.nama}.`
                : "Analisa persentase dan jumlah sertifikasi pendidik per satuan pendidikan."}
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

        {/* Global Statistics Cards (Only on summary view) */}
        {!selectedSchool && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 no-print">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Guru</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800 dark:text-white">{loading ? "..." : globalStats.totalGuru}</span>
                <span className="text-xs text-gray-500 font-medium">Orang</span>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs text-success-600 uppercase font-bold">Sudah Sertifikasi</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-success-600 dark:text-success-400">{loading ? "..." : globalStats.totalCertified}</span>
                <span className="text-sm font-semibold text-success-500">{loading ? "" : `(${globalStats.certifiedPercentage}%)`}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-xs text-red-500 uppercase font-bold">Belum Sertifikasi</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-500 dark:text-red-400">{loading ? "..." : globalStats.totalUncertified}</span>
                <span className="text-sm font-semibold text-red-400">{loading ? "" : `(${globalStats.uncertifiedPercentage}%)`}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected School Banner */}
        {selectedSchool && (
          <div className="mb-4 flex items-center justify-between no-print border-b border-gray-200 dark:border-white/[0.05] pb-4 bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setSelectedSchoolId(null);
                setDetailSearchQuery("");
                setDetailCurrentPage(1);
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors cursor-pointer"
            >
              <ArrowLeftIcon className="size-4" />
              Kembali ke Daftar Sekolah
            </button>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Sekolah Terpilih</span>
              <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                {selectedSchool.nama} ({selectedSchool.npsn})
              </span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {!selectedSchool ? (
          /* Summary View (School List) */
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
            {/* Search and Limit Selector */}
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
              <div className="relative max-w-sm w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-5" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari Sekolah, NPSN, atau Wilayah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* School Table */}
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
                      <TableCell isHeader className="px-5 py-3.5 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32">NPSN</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-60">Nama Sekolah</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-48">Wilayah</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-28 font-bold">Total Guru</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-28 text-success-600 font-bold">Sertifikasi</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-28 text-red-500 font-bold">Belum Sertifikasi</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-40 font-bold">Rasio Sertifikasi</TableCell>
                      <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-right text-theme-xs dark:text-gray-400 w-24">Aksi</TableCell>
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
                            <TableCell className="px-5 py-4 text-center text-theme-sm font-bold text-gray-700 dark:text-gray-300">{school.totalGuru}</TableCell>
                            <TableCell className="px-5 py-4 text-center text-theme-sm">
                              <Badge color="success" size="sm">
                                {school.certifiedCount} Guru
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center text-theme-sm">
                              <Badge color="error" size="sm">
                                {school.uncertifiedCount} Guru
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-brand-500 h-2 rounded-full" 
                                    style={{ width: `${school.percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[32px] text-right">{school.percentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSchoolId(school.sekolah_id);
                                  setActiveDetailTab("certified");
                                  setDetailSearchQuery("");
                                  setDetailCurrentPage(1);
                                }}
                                className="p-2 text-gray-500 hover:text-brand-500 transition-colors cursor-pointer"
                                title="Lihat Detail"
                              >
                                <EyeIcon className="size-5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          {loading ? "Sedang memuat..." : "Tidak ada data sertifikasi sekolah ditemukan."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
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
        ) : (
          /* Drill-down Detail View (School Teachers List) */
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
            {/* Detail Navigation Tabs */}
            <div className="mb-6 flex border-b border-gray-100 dark:border-white/[0.05] pb-px justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setActiveDetailTab("certified");
                    setDetailCurrentPage(1);
                  }}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeDetailTab === "certified" 
                      ? "border-success-500 text-success-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Sudah Sertifikasi ({selectedSchool.certifiedCount})
                </button>
                <button
                  onClick={() => {
                    setActiveDetailTab("uncertified");
                    setDetailCurrentPage(1);
                  }}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeDetailTab === "uncertified" 
                      ? "border-red-500 text-red-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Belum Sertifikasi ({selectedSchool.uncertifiedCount})
                </button>
              </div>
              
              <div className="relative max-w-xs w-full mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-4" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari Guru..."
                  value={detailSearchQuery}
                  onChange={(e) => {
                    setDetailSearchQuery(e.target.value);
                    setDetailCurrentPage(1);
                  }}
                  className="pl-9 py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Selected School Teachers Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <Table className="min-w-full">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-60">Nama Guru</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-44">NIP / NUPTK</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-40">Jabatan / Jenis PTK</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 w-24">L/P</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-44">Lembaga Sertifikasi</TableCell>
                    {activeDetailTab === "certified" ? (
                      <>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Bidang Studi Sertifikasi</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">No. Sertifikat</TableCell>
                      </>
                    ) : (
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedDetailGurus.length > 0 ? (
                    paginatedDetailGurus.map((g, index) => {
                      const globalIndex = (detailCurrentPage - 1) * 10 + index + 1;
                      const certList = parseSertifikasi(g);
                      
                      const avatarUrl = g.identitas?.foto 
                        ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://centralsimak.smakniscjr.sch.id'}/storage/${g.identitas.foto}` 
                        : "";

                      return (
                        <TableRow key={g.ptk_id || g.id || index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <div className="flex items-center gap-3">
                              <Avatar src={getFotoUrl(g.identitas?.foto || g.foto)} size="small" />
                              <span className="font-semibold text-gray-800 dark:text-white/90">{g.identitas?.nama || g.nama || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>NIP: {g.identitas?.nip || g.nip || "-"}</span>
                              <span className="text-xs text-gray-400 mt-0.5">NUPTK: {g.identitas?.nuptk || g.nuptk || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 font-medium">{g.kepegawaian?.jenis_ptk || g.role || "-"}</TableCell>
                          <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-600 dark:text-gray-400">{g.identitas?.jenis_kelamin || "-"}</TableCell>
                           <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-700 dark:text-gray-300 font-medium">
                            {certList.map((c: any) => c.lembagaSertifikasi).filter(Boolean).join(", ") || "-"}
                          </TableCell>
                          {activeDetailTab === "certified" ? (
                            <>
                              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-700 dark:text-gray-300 font-semibold">
                                {certList.map((c: any) => c.bidangStudi || c.bidang_studi_id_str).filter(Boolean).join(", ") || "-"}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start text-theme-sm font-mono text-gray-600 dark:text-gray-400">
                                {certList.map((c: any) => c.noSertifikasi || c.nomor_sertifikat).filter(Boolean).join(", ") || "-"}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="px-5 py-4 text-start">
                              <Badge color="error" size="sm">Belum Sertifikasi</Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={activeDetailTab === "certified" ? 8 : 7} className="px-5 py-10 text-center text-gray-400">
                        Tidak ada data guru.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Detail Pagination */}
            {filteredGurus.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={detailCurrentPage}
                  totalPages={detailTotalPages}
                  onPageChange={(page) => setDetailCurrentPage(page)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Table (Only Visible in Print - renders all items without pagination) */}
      <div className="print-only">
        {!selectedSchool ? (
          /* Summary print table */
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>NPSN</th>
                <th>Nama Sekolah</th>
                <th>Wilayah</th>
                <th>Total Guru</th>
                <th>Sudah Sertifikasi</th>
                <th>Belum Sertifikasi</th>
                <th>Rasio (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.length > 0 ? (
                filteredSchools.map((s, index) => (
                  <tr key={s.sekolah_id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontFamily: "monospace" }}>{s.npsn}</td>
                    <td style={{ fontWeight: "bold" }}>{s.nama}</td>
                    <td>{s.wilayah}</td>
                    <td style={{ textAlign: "center" }}>{s.totalGuru}</td>
                    <td style={{ textAlign: "center", color: "#10b981" }}>{s.certifiedCount}</td>
                    <td style={{ textAlign: "center", color: "#ef4444" }}>{s.uncertifiedCount}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{s.percentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center" }}>
                    Tidak ada data sertifikasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Detail print table */
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Guru</th>
                <th>NIP / NUPTK</th>
                <th>Jabatan / Jenis PTK</th>
                <th>L/P</th>
                <th>Lembaga Sertifikasi</th>
                {activeDetailTab === "certified" ? (
                  <>
                    <th>Bidang Studi Sertifikasi</th>
                    <th>No. Sertifikat</th>
                  </>
                ) : (
                  <th>Status</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredGurus.length > 0 ? (
                filteredGurus.map((g, index) => {
                  const certList = parseSertifikasi(g);
                  return (
                    <tr key={g.ptk_id || index}>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td style={{ fontWeight: "bold" }}>{g.identitas?.nama || g.nama || "-"}</td>
                      <td>
                        NIP: {g.identitas?.nip || g.nip || "-"} <br/>
                        NUPTK: {g.identitas?.nuptk || g.nuptk || "-"}
                      </td>
                      <td>{g.kepegawaian?.jenis_ptk || g.role || "-"}</td>
                      <td style={{ textAlign: "center" }}>{g.identitas?.jenis_kelamin || "-"}</td>
                      <td>{certList.map((c: any) => c.lembagaSertifikasi).filter(Boolean).join(", ") || "-"}</td>
                      {activeDetailTab === "certified" ? (
                        <>
                          <td style={{ fontWeight: "bold" }}>{certList.map((c: any) => c.bidangStudi || c.bidang_studi_id_str).filter(Boolean).join(", ") || "-"}</td>
                          <td style={{ fontFamily: "monospace" }}>{certList.map((c: any) => c.noSertifikasi || c.nomor_sertifikat).filter(Boolean).join(", ") || "-"}</td>
                        </>
                      ) : (
                        <td style={{ textAlign: "center", color: "#ef4444", fontWeight: "bold" }}>Belum Sertifikasi</td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={activeDetailTab === "certified" ? 8 : 7} style={{ textAlign: "center" }}>
                    Tidak ada data guru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <PrintSignature />
    </>
  );
}
