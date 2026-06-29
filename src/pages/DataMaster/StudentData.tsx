import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, UserCircleIcon, SearchIcon, EyeIcon } from "../../icons";
import StudentTable from "../../components/student/StudentTable";
import PDKeluarTable from "../../components/student/PDKeluarTable";
import RekapPDTable from "../../components/student/RekapPDTable";
import RekapPDUsiaTable from "../../components/student/RekapPDUsiaTable";
import { useModal } from "../../hooks/useModal";
import EditStudentModal from "../../components/student/EditStudentModal";
import Swal from "sweetalert2";
import { exportToExcel } from "../../utils/exportUtils";
import { dapodikService } from "../../services/dapodikService";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";
import { formatJenjang } from "../../utils/dapodikUtils";

export default function StudentData() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useParams();
  const tabParam = searchParams.get("tab");
  const isRekapRoute = window.location.pathname.includes("/rekapitulasi");

  // Initialize active tab safely
  const [activeTab, setActiveTab] = useState<"aktif" | "rekap" | "keluar">(
    (tabParam as any) || (isRekapRoute ? "rekap" : "aktif")
  );

  // Drill-down selected school state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [studentCounts, setStudentCounts] = useState<Record<string, { aktif: number; keluar: number }>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Sync state with URL parameter
  useEffect(() => {
    if (tabParam && (tabParam === "aktif" || tabParam === "rekap" || tabParam === "keluar")) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam as any);
      }
    } else if (!tabParam && isRekapRoute && activeTab !== "rekap") {
      setActiveTab("rekap");
    }
  }, [tabParam, isRekapRoute, activeTab]);

  // Reset drill-down selected school on tab changes
  useEffect(() => {
    setSelectedSchoolId(null);
    setSekolahFilter("all");
    setSearchQuery("");
  }, [activeTab]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [printData, setPrintData] = useState<any[] | null>(null);
  const [gradeFilter, setGradeFilter] = useState("all");
  
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [sekolahFilter, setSekolahFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Kab/Kota" }]);
  const [kecamatanOptions, setKecamatanOptions] = useState([{ value: "all", label: "Kecamatan" }]);
  const [statusOptions, setStatusOptions] = useState([{ value: "all", label: "Status" }]);
  const [jenjangOptions, setJenjangOptions] = useState([{ value: "all", label: "Jenjang" }]);
  const [sekolahOptions, setSekolahOptions] = useState([{ value: "all", label: "Pilih Sekolah" }]);
  const [allSchools, setAllSchools] = useState<any[]>([]);

  const { isOpen, openModal, closeModal } = useModal();

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
          setKabKotaOptions([{ value: "all", label: "Kab/Kota" }, ...uniqueKab.map(k => ({ value: k, label: k }))]);

          const uniqueStatus = [...new Set(schools.map((s: any) => s.status_sekolah))].filter(Boolean).sort();
          setStatusOptions([{ value: "all", label: "Status" }, ...uniqueStatus.map(s => ({ value: s, label: s }))]);

          const uniqueJenjang = [...new Set(schools.map((s: any) => formatJenjang(s)))].filter(Boolean).sort();
          setJenjangOptions([{ value: "all", label: "Jenjang" }, ...uniqueJenjang.map(j => ({ value: j, label: j }))]);
        }
      } catch (err) {
        console.error("Gagal memuat filter:", err);
      }
    };
    fetchFilterData();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
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
          const countPromises = schools.map(async (school: any) => {
            try {
              const [aktifRes, keluarRes] = await Promise.all([
                dapodikService.getPesertaDidik(1, "", 1, undefined, "aktif", undefined, school.sekolah_id),
                dapodikService.getPesertaDidik(1, "", 1, undefined, "non-aktif", undefined, school.sekolah_id)
              ]);
              const totalActive = aktifRes.meta?.total_data || aktifRes.meta?.total || aktifRes.total || (aktifRes.data ? aktifRes.data.length : 0);
              const totalKeluar = keluarRes.meta?.total_data || keluarRes.meta?.total || keluarRes.total || (keluarRes.data ? keluarRes.data.length : 0);
              return { sekolah_id: school.sekolah_id, aktif: totalActive, keluar: totalKeluar };
            } catch (err) {
              console.error(`Gagal mengambil count untuk sekolah ${school.sekolah_id}:`, err);
              return { sekolah_id: school.sekolah_id, aktif: 0, keluar: 0 };
            }
          });

          const results = await Promise.all(countPromises);
          const counts: Record<string, { aktif: number; keluar: number }> = {};
          results.forEach((item) => {
            counts[item.sekolah_id] = { aktif: item.aktif, keluar: item.keluar };
          });
          setStudentCounts(counts);
        }
      } catch (err) {
        console.error("Gagal menghitung statistik Peserta Didik:", err);
      } finally {
        setLoadingCounts(false);
      }
    };
    fetchCounts();
  }, [allSchools.length]);

  // Filter Kecamatan based on Kab/Kota
  useEffect(() => {
    if (kabKotaFilter === "all") {
        setKecamatanOptions([{ value: "all", label: "Kecamatan" }]);
        setKecamatanFilter("all");
    } else {
        const filteredKec = [...new Set(allSchools
            .filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter)
            .map(s => s.kecamatan)
        )].filter(Boolean).sort();
        setKecamatanOptions([{ value: "all", label: "Kecamatan" }, ...filteredKec.map(k => ({ value: k, label: k }))]);
    }
  }, [kabKotaFilter, allSchools]);

  // Filter Schools based on all filters
  useEffect(() => {
    let filtered = allSchools;
    if (kabKotaFilter !== "all") filtered = filtered.filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
    if (kecamatanFilter !== "all") filtered = filtered.filter(s => s.kecamatan === kecamatanFilter);
    if (statusFilter !== "all") filtered = filtered.filter(s => s.status_sekolah === statusFilter);
    if (jenjangFilter !== "all") filtered = filtered.filter(s => formatJenjang(s) === jenjangFilter);
    
    setSekolahOptions([{ value: "all", label: "Pilih Sekolah" }, ...filtered.map(s => ({ value: s.sekolah_id, label: s.nama }))]);
    
    if (sekolahFilter !== "all" && !filtered.some(s => s.sekolah_id === sekolahFilter)) {
        setSekolahFilter("all");
    }
  }, [kabKotaFilter, kecamatanFilter, statusFilter, jenjangFilter, allSchools]);

  // Filtered Schools for directory list view
  const filteredSchoolsList = allSchools.filter((school) => {
    const matchesSearch = school.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (school.npsn || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKabKota = kabKotaFilter === "all" || school.kabupaten_kota === kabKotaFilter || school.kabupate_kota === kabKotaFilter;
    const matchesKecamatan = kecamatanFilter === "all" || school.kecamatan === kecamatanFilter;
    const matchesStatus = statusFilter === "all" || school.status_sekolah === statusFilter;
    const matchesJenjang = jenjangFilter === "all" || formatJenjang(school) === jenjangFilter;

    return matchesSearch && matchesKabKota && matchesKecamatan && matchesStatus && matchesJenjang;
  });

  const gradeOptions = [
    { value: "all", label: "Semua Tingkat" },
    { value: "10", label: "Tingkat 10" },
    { value: "11", label: "Tingkat 11" },
    { value: "12", label: "Tingkat 12" },
  ];

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const handleSelectionChange = (selectedIds: string[], selectedObjs: any[]) => {
    setSelectedStudentIds(selectedIds);
    setSelectedStudents(selectedObjs);
  };

  const handleShowProfile = () => {
    if (selectedStudents.length > 0) {
      navigate(`/${role}/peserta-didik/detail`, { state: { students: selectedStudents } });
    }
  };

  const handleExport = async () => {
    let exportData = [];

    if (selectedStudents.length > 0) {
      exportData = selectedStudents;
    } else {
      Swal.fire({
        title: "Mempersiapkan Data",
        text: "Mohon tunggu, sedang mengambil data untuk diekspor...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const targetSekolahId = selectedSchoolId || ((sekolahFilter === 'all' || !sekolahFilter) ? undefined : sekolahFilter);
        const status = activeTab === 'keluar' ? 'non-aktif' : 'aktif';
        
        const firstPage = await dapodikService.getPesertaDidik(
          100,
          searchQuery,
          1,
          undefined,
          status,
          gradeFilter === 'all' ? undefined : gradeFilter,
          targetSekolahId
        );

        let fetchedData = [];
        let totalOverall = 0;

        if (firstPage && (firstPage.status === 'success' || firstPage.success === true)) {
          fetchedData = firstPage.data || [];
          totalOverall = firstPage.meta?.total_data || firstPage.meta?.total || firstPage.total || fetchedData.length;
        } else if (Array.isArray(firstPage)) {
          fetchedData = firstPage;
          totalOverall = firstPage.length;
        } else if (firstPage && firstPage.data && Array.isArray(firstPage.data)) {
          fetchedData = firstPage.data;
          totalOverall = firstPage.meta?.total_data || firstPage.total || fetchedData.length;
        }

        const maxLimit = 100;
        const totalPages = Math.ceil(totalOverall / maxLimit);

        if (totalPages > 1) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              dapodikService.getPesertaDidik(
                maxLimit,
                searchQuery,
                p,
                undefined,
                status,
                gradeFilter === 'all' ? undefined : gradeFilter,
                targetSekolahId
              )
            );
          }
          const otherPages = await Promise.all(pagePromises);
          otherPages.forEach(pageRes => {
            let pageData = [];
            if (pageRes && (pageRes.status === 'success' || pageRes.success === true)) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes && pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
            fetchedData = [...fetchedData, ...pageData];
          });
        }

        exportData = fetchedData;
        Swal.close();
      } catch (error) {
        console.error("Gagal mengambil data untuk export:", error);
        Swal.close();
        Swal.fire({
          title: "Error",
          text: "Gagal mengambil data dari server.",
          icon: "error",
          confirmButtonColor: "#ef4444"
        });
        return;
      }
    }

    if (exportData.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data peserta didik yang dapat diekspor.",
        icon: "warning",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }

    const labelTab = activeTab === 'aktif' ? 'Peserta Didik Aktif' : activeTab === 'keluar' ? 'PD Keluar' : 'Peserta Didik';
    
    const activeSchoolId = selectedSchoolId || ((sekolahFilter === 'all' || !sekolahFilter) ? undefined : sekolahFilter);
    const activeSchoolObj = allSchools.find(s => s.sekolah_id === activeSchoolId);
    const schoolSuffix = activeSchoolObj ? ` - ${activeSchoolObj.nama.toUpperCase()}` : "";
    
    let excelTitle = "";
    if (activeTab === 'aktif') {
      excelTitle = `DATA PESERTA DIDIK AKTIF${schoolSuffix}`;
    } else if (activeTab === 'keluar') {
      excelTitle = `DATA PESERTA DIDIK KELUAR${schoolSuffix}`;
    } else {
      excelTitle = `DATA PESERTA DIDIK${schoolSuffix}`;
    }

    Swal.fire({
      title: `Export Data ${labelTab}?`,
      text: `Sebanyak ${exportData.length} data akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        let headers: string[] = [];
        let rows: any[] = [];

        if (activeTab === 'keluar') {
          headers = [
            "No",
            "Nama Siswa",
            "JK",
            "NISN",
            "Tempat Lahir",
            "Tanggal Lahir",
            "Tingkat",
            "Rombel/Kelas",
            "Status",
            "Tanggal Keluar"
          ];

          rows = exportData.map((item, index) => {
            const no = (index + 1).toString();
            const nama = item.identitas?.nama || "-";
            const jk = item.identitas?.jenis_kelamin || "-";
            const nisn = item.identitas?.nisn || "-";
            const tempatLahir = item.identitas?.tempat_lahir || "-";
            const tglLahir = item.identitas?.tanggal_lahir ? new Date(item.identitas.tanggal_lahir).toLocaleDateString('id-ID') : "-";
            const tingkat = item.akademik?.tingkat || "-";
            const rombel = item.akademik?.nama_rombel || "-";
            const status = "Non-Aktif";
            const tglKeluar = item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : "-";

            return [no, nama, jk, nisn, tempatLahir, tglLahir, tingkat, rombel, status, tglKeluar];
          });
        } else {
          headers = [
            "No",
            "Nama Siswa",
            "JK",
            "NISN",
            "Nama Instansi / Sekolah",
            "Rombel/Kelas"
          ];

          rows = exportData.map((item, index) => {
            const no = (index + 1).toString();
            const nama = item.identitas?.nama || "-";
            const jk = item.identitas?.jenis_kelamin || "-";
            const nisn = item.identitas?.nisn || "-";
            
            const schoolId = item.identitas?.sekolah_id;
            const schoolObj = allSchools.find(s => s.sekolah_id === schoolId);
            const sekolah = schoolObj ? schoolObj.nama : schoolId || "-";

            const rombel = item.akademik?.nama_rombel || "-";

            return [no, nama, jk, nisn, sekolah, rombel];
          });
        }

        const filename = `Data_${labelTab.replace(/\s+/g, '_')}${activeSchoolObj ? `_${activeSchoolObj.nama.replace(/\s+/g, '_')}` : ""}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        exportToExcel(filename, labelTab, excelTitle, headers, rows);
      }
    });
  };

  const handlePrint = async () => {
    if (activeTab === "rekap") {
      window.print();
      return;
    }

    Swal.fire({
      title: "Mempersiapkan Cetak PDF",
      text: "Sedang memuat seluruh data laporan...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const targetSekolahId = selectedSchoolId || ((sekolahFilter === 'all' || !sekolahFilter) ? undefined : sekolahFilter);
      const status = activeTab === 'keluar' ? 'non-aktif' : 'aktif';
      
      const firstPage = await dapodikService.getPesertaDidik(
        100,
        searchQuery,
        1,
        undefined,
        status,
        gradeFilter === 'all' ? undefined : gradeFilter,
        targetSekolahId
      );

      let fetchedData = [];
      let totalOverall = 0;

      if (firstPage && (firstPage.status === 'success' || firstPage.success === true)) {
        fetchedData = firstPage.data || [];
        totalOverall = firstPage.meta?.total_data || firstPage.meta?.total || firstPage.total || fetchedData.length;
      } else if (Array.isArray(firstPage)) {
        fetchedData = firstPage;
        totalOverall = firstPage.length;
      } else if (firstPage.data && Array.isArray(firstPage.data)) {
        fetchedData = firstPage.data;
        totalOverall = firstPage.meta?.total_data || firstPage.total || fetchedData.length;
      }

      const maxLimit = 100;
      const totalPages = Math.ceil(totalOverall / maxLimit);

      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            dapodikService.getPesertaDidik(
              maxLimit,
              searchQuery,
              p,
              undefined,
              status,
              gradeFilter === 'all' ? undefined : gradeFilter,
              targetSekolahId
            )
          );
        }
        const otherPages = await Promise.all(pagePromises);
        otherPages.forEach(pageRes => {
          let pageData = [];
          if (pageRes && (pageRes.status === 'success' || pageRes.success === true)) {
            pageData = pageRes.data || [];
          } else if (Array.isArray(pageRes)) {
            pageData = pageRes;
          } else if (pageRes && pageRes.data && Array.isArray(pageRes.data)) {
            pageData = pageRes.data;
          }
          fetchedData = [...fetchedData, ...pageData];
        });
      }

      setPrintData(fetchedData);
      Swal.close();

      setTimeout(() => {
        const handleAfterPrint = () => {
          setPrintData(null);
          window.removeEventListener("afterprint", handleAfterPrint);
        };
        window.addEventListener("afterprint", handleAfterPrint);
        window.print();
      }, 500);
    } catch (error) {
      console.error("Gagal mengambil data cetak:", error);
      Swal.close();
      Swal.fire("Error", "Gagal memuat data cetak dari server.", "error");
    }
  };

  const getPrintTitle = () => {
    const activeSchoolId = selectedSchoolId || ((sekolahFilter === 'all' || !sekolahFilter) ? undefined : sekolahFilter);
    const activeSchoolObj = allSchools.find(s => s.sekolah_id === activeSchoolId);
    const schoolSuffix = activeSchoolObj ? ` - ${activeSchoolObj.nama.toUpperCase()}` : "";
    
    if (activeTab === "aktif") return `LAPORAN DATA INDUK PESERTA DIDIK${schoolSuffix}`;
    if (activeTab === "keluar") return `LAPORAN DATA INDUK ALUMNI / SISWA KELUAR${schoolSuffix}`;
    return "LAPORAN REKAPITULASI PESERTA DIDIK";
  };

  return (
    <>
      <PageMeta
        title="Peserta Didik | SIMAK Admin Panel"
        description="Student data management page"
      />

      <PrintReportLayout
        title={getPrintTitle()}
        sekolahFilter={selectedSchoolId || sekolahFilter}
        schools={allSchools}
        extraFilters={[
          ...(activeTab !== "rekap" && gradeFilter !== "all" ? [{ label: "Rombel/Tingkat", value: `Tingkat ${gradeFilter}` }] : [])
        ]}
      />

      <div className="space-y-6 no-print">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Peserta Didik (PD)
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola informasi profil sekolah Anda di sini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedStudentIds.length > 0 && (
              <Button
                variant="primary-outline"
                size="sm"
                className="min-w-[110px]"
                startIcon={<UserCircleIcon className="size-4" />}
                onClick={handleShowProfile}
              >
                Profil
              </Button>
            )}
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

        {/* Global Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select
                    options={kabKotaOptions}
                    defaultValue={kabKotaFilter}
                    onChange={(value) => setKabKotaFilter(value)}
                />
                <Select
                    options={kecamatanOptions}
                    defaultValue={kecamatanFilter}
                    onChange={(value) => setKecamatanFilter(value)}
                    disabled={kabKotaFilter === "all"}
                />
                <Select
                    options={statusOptions}
                    defaultValue={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                />
                <Select
                    options={jenjangOptions}
                    defaultValue={jenjangFilter}
                    onChange={(value) => setJenjangFilter(value)}
                />
                <Select
                    options={sekolahOptions}
                    defaultValue={selectedSchoolId || sekolahFilter}
                    onChange={(value) => {
                      if (value === "all") {
                        setSelectedSchoolId(null);
                      } else {
                        setSelectedSchoolId(value);
                      }
                      setSekolahFilter(value);
                    }}
                />
            </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          
          {/* Selected School Banner & Back Button */}
          {activeTab !== "rekap" && selectedSchoolId !== null && (
            <div className="mb-6 flex items-center justify-between no-print border-b border-gray-100 dark:border-white/[0.05] pb-4">
              <button
                onClick={() => {
                  setSelectedSchoolId(null);
                  setSekolahFilter("all");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors cursor-pointer"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Daftar Sekolah
              </button>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Sekolah Terpilih</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                  {allSchools.find(s => s.sekolah_id === selectedSchoolId)?.nama || selectedSchoolId}
                </span>
              </div>
            </div>
          )}

          {activeTab !== "rekap" && (
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
              <div className="w-20">
                <Select
                  options={rowsPerPageOptions}
                  defaultValue={itemsPerPage.toString()}
                  onChange={(value) => setItemsPerPage(parseInt(value))}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full lg:justify-end">
                <div className="relative max-w-sm w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <SearchIcon className="size-5" />
                  </span>
                  <Input
                    type="text"
                    placeholder={selectedSchoolId === null ? "Cari Nama Sekolah atau NPSN..." : "Cari Nama atau NISN..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedSchoolId !== null && activeTab === "aktif" && (
                  <div className="w-full sm:w-56">
                      <Select
                          options={gradeOptions}
                          defaultValue={gradeFilter}
                          onChange={(value) => setGradeFilter(value)}
                      />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "aktif" && (
            <div className="space-y-4">
              {selectedSchoolId === null ? (
                /* Schools directory list */
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto custom-scrollbar relative">
                    {loadingCounts && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                      </div>
                    )}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/[0.05]">
                      <thead className="bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</th>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">NPSN</th>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Sekolah</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Siswa Aktif</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                        {filteredSchoolsList.length > 0 ? (
                          filteredSchoolsList.map((school, index) => {
                            const counts = studentCounts[school.sekolah_id] || { aktif: 0, keluar: 0 };
                            return (
                              <tr key={school.sekolah_id}>
                                <td className="px-5 py-4 text-start text-sm text-gray-500">{index + 1}</td>
                                <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{school.npsn || "-"}</td>
                                <td className="px-5 py-4 text-start text-sm font-semibold text-gray-800 dark:text-white/90">{school.nama || "-"}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-success-600 dark:text-success-400">{counts.aktif}</td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedSchoolId(school.sekolah_id);
                                      setSekolahFilter(school.sekolah_id);
                                    }}
                                    className="p-2 text-gray-500 hover:text-brand-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title="Lihat Detail"
                                  >
                                    <EyeIcon className="size-5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                              Tidak ada data sekolah ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected School Student Table */
                <StudentTable 
                    type="aktif" 
                    onSelectionChange={handleSelectionChange} 
                    onDetail={(item) => navigate(`/${role}/peserta-didik/detail`, { state: { students: [item] } })}
                    searchTerm={searchQuery}
                    completenessFilter="all"
                    gradeFilter={gradeFilter}
                    itemsPerPage={itemsPerPage}
                    sekolahId={selectedSchoolId}
                />
              )}
            </div>
          )}

          {activeTab === "rekap" && (
            <div className="space-y-8">
                <div>
                    <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                        Rekap PD berdasarkan Tingkat
                    </h4>
                    <RekapPDTable 
                        searchTerm={searchQuery}
                        sekolahId={sekolahFilter}
                    />
                </div>
                <div className="pt-6 border-t border-gray-100 dark:border-white/[0.05]">
                    <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                        Rekap PD berdasarkan Usia
                    </h4>
                    <RekapPDUsiaTable 
                        sekolahId={sekolahFilter}
                    />
                </div>
            </div>
          )}

          {activeTab === "keluar" && (
            <div className="space-y-4">
              {selectedSchoolId === null ? (
                /* Schools directory list */
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto custom-scrollbar relative">
                    {loadingCounts && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                      </div>
                    )}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/[0.05]">
                      <thead className="bg-gray-50 dark:bg-white/[0.02]">
                        <tr>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</th>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">NPSN</th>
                          <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Sekolah</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Siswa Non-Aktif</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                        {filteredSchoolsList.length > 0 ? (
                          filteredSchoolsList.map((school, index) => {
                            const counts = studentCounts[school.sekolah_id] || { aktif: 0, keluar: 0 };
                            return (
                              <tr key={school.sekolah_id}>
                                <td className="px-5 py-4 text-start text-sm text-gray-500">{index + 1}</td>
                                <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{school.npsn || "-"}</td>
                                <td className="px-5 py-4 text-start text-sm font-semibold text-gray-800 dark:text-white/90">{school.nama || "-"}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-warning-600 dark:text-warning-400">{counts.keluar}</td>
                                <td className="px-5 py-4 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedSchoolId(school.sekolah_id);
                                      setSekolahFilter(school.sekolah_id);
                                    }}
                                    className="p-2 text-gray-500 hover:text-brand-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title="Lihat Detail"
                                  >
                                    <EyeIcon className="size-5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                              Tidak ada data sekolah ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected School PDKeluarTable */
                <PDKeluarTable 
                  onSelectionChange={handleSelectionChange} 
                  onDetail={(item) => navigate(`/${role}/peserta-didik/detail`, { state: { students: [item] } })}
                  searchTerm={searchQuery} 
                  itemsPerPage={itemsPerPage}
                  sekolahId={selectedSchoolId}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Table (Only Visible in Print) */}
      {printData && (
        <div className="print-only">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>JK</th>
                <th>NISN</th>
                <th>Tingkat</th>
                <th>Rombel / Kelas</th>
                <th>Sekolah / Instansi</th>
                {activeTab === "keluar" && <th>Tanggal Keluar</th>}
              </tr>
            </thead>
            <tbody>
              {printData.map((item, index) => {
                const schoolId = item.identitas?.sekolah_id;
                const schoolObj = allSchools.find(s => s.sekolah_id === schoolId);
                const sekolah = schoolObj ? schoolObj.nama : schoolId || "-";
                const tglKeluar = item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : "-";
                
                return (
                  <tr key={item.identitas?.id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{item.identitas?.nama || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.identitas?.jenis_kelamin || "-"}</td>
                    <td>{item.identitas?.nisn || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.akademik?.tingkat || "-"}</td>
                    <td>{item.akademik?.nama_rombel || "-"}</td>
                    <td>{sekolah}</td>
                    {activeTab === "keluar" && <td>{tglKeluar}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== "rekap" && <PrintSignature />}

      <EditStudentModal 
        isOpen={isOpen}
        onClose={closeModal}
        selectedIds={selectedStudentIds}
      />
    </>
  );
}
