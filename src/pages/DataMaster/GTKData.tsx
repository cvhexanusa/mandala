import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, UserCircleIcon, SearchIcon, EyeIcon } from "../../icons";
import GuruTable from "../../components/gtk/GuruTable";
import TendikTable from "../../components/gtk/TendikTable";
import NonAktifTable from "../../components/gtk/NonAktifTable";
import RekapGTKTable from "../../components/gtk/RekapGTKTable";
import RekapGTKPendidikanTable from "../../components/gtk/RekapGTKPendidikanTable";
import RekapGTKUsiaTable from "../../components/gtk/RekapGTKUsiaTable";
import { useModal } from "../../hooks/useModal";
import EditGTKModal from "../../components/gtk/EditGTKModal";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";
import { exportToExcel } from "../../utils/exportUtils";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";
import { formatJenjang, formatPtkInduk } from "../../utils/dapodikUtils";
import { useAuth } from "../../context/AuthContext";
import { useSekolah } from "../../context/SekolahContext";

export default function GTKData() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useParams();
  const tabParam = searchParams.get("tab");
  const isRekapRoute = window.location.pathname.includes("/rekapitulasi");

  const { user } = useAuth();
  const { sekolah } = useSekolah();
  const isOperator = user?.role?.toLowerCase().includes("operator");
  const mySchoolId = isOperator ? (sekolah?.sekolah_id || user?.instansi_id) : user?.instansi_id;
  
  // Initialize active tab safely
  const [activeTab, setActiveTab] = useState<"guru" | "tendik" | "rekap" | "nonaktif">(
    (tabParam as any) || (isRekapRoute ? "rekap" : "guru")
  );

  // Drill-down selected school state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(isOperator ? mySchoolId : null);
  const [gtkCounts, setGtkCounts] = useState<Record<string, { guru: number; tendik: number }>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Sync state with URL parameter
  useEffect(() => {
    if (tabParam && (tabParam === "guru" || tabParam === "tendik" || tabParam === "rekap" || tabParam === "nonaktif")) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam as any);
      }
    } else if (!tabParam && isRekapRoute && activeTab !== "rekap") {
      setActiveTab("rekap");
    }
  }, [tabParam, isRekapRoute, activeTab]);

  // Reset drill-down selected school on tab changes
  useEffect(() => {
    if (!isOperator) {
      setSelectedSchoolId(null);
      setSekolahFilter("all");
    }
    setSearchQuery("");
  }, [activeTab, isOperator]);

  // Sync selectedSchoolId with operator's school ID on load or profile resolution
  useEffect(() => {
    if (isOperator && mySchoolId) {
      setSelectedSchoolId(mySchoolId);
      setSekolahFilter(mySchoolId);
    }
  }, [isOperator, mySchoolId]);

  const [selectedGTKIds, setSelectedGTKIds] = useState<string[]>([]);
  const [selectedGTKObjects, setSelectedGTKObjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [printData, setPrintData] = useState<any[] | null>(null);
  const [completenessFilter, setCompletenessFilter] = useState("all");
  
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

  // Fetch GTK counts to show in schools list directory
  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const response = await dapodikService.getGTK(2000, "", 1, undefined, "aktif");
        let data = [];
        if (response && (response.status === 'success' || response.success === true)) {
          data = response.data || [];
        } else if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
        }

        const counts: Record<string, { guru: number; tendik: number }> = {};
        data.forEach((item: any) => {
          const schoolId = item.identitas?.sekolah_id;
          if (!schoolId) return;
          if (!counts[schoolId]) {
            counts[schoolId] = { guru: 0, tendik: 0 };
          }
          
          const isGuru = item.kepegawaian?.jenis_ptk?.toLowerCase().includes("guru") || item.type === "guru";
          if (isGuru) {
            counts[schoolId].guru++;
          } else {
            counts[schoolId].tendik++;
          }
        });
        setGtkCounts(counts);
      } catch (err) {
        console.error("Gagal menghitung statistik GTK:", err);
      } finally {
        setLoadingCounts(false);
      }
    };
    fetchCounts();
  }, []);

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
    
    // Reset school filter if it's no longer in the filtered list
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

  const completenessOptions = [
    { value: "all", label: "Semua Kelengkapan" },
    { value: "100", label: "Lengkap Data 100%" },
    { value: "99", label: "Lengkap Data < 100%" },
    { value: "50", label: "Lengkap Data < 50%" },
  ];

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const handleSelectionChange = (selectedIds: string[], selectedObjs: any[]) => {
    setSelectedGTKIds(selectedIds);
    setSelectedGTKObjects(selectedObjs);
  };

  const handleShowProfile = () => {
    if (selectedGTKObjects.length > 0) {
      navigate(`/${role}/gtk/detail`, { state: { gtkList: selectedGTKObjects } });
    }
  };

  const handleExport = async () => {
    let exportData = [];
    
    if (selectedGTKObjects.length > 0) {
      exportData = selectedGTKObjects;
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
        const type = activeTab === 'guru' ? 'guru' : activeTab === 'tendik' ? 'tendik' : undefined;
        const status = activeTab === 'nonaktif' ? 'non-aktif' : 'aktif';
        
        const firstPage = await dapodikService.getGTK(
          100, 
          searchQuery, 
          1, 
          type, 
          status, 
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
              dapodikService.getGTK(
                maxLimit,
                searchQuery,
                p,
                type,
                status,
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
        text: "Tidak ada data GTK yang dapat diekspor.",
        icon: "warning",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }

    const labelTab = activeTab === 'guru' ? 'Guru' : activeTab === 'tendik' ? 'Tendik' : activeTab === 'nonaktif' ? 'GTK Non Aktif' : 'GTK';
    
    const activeSchoolId = selectedSchoolId || ((sekolahFilter === 'all' || !sekolahFilter) ? undefined : sekolahFilter);
    const activeSchoolObj = allSchools.find(s => s.sekolah_id === activeSchoolId);
    const schoolSuffix = activeSchoolObj ? ` - ${activeSchoolObj.nama.toUpperCase()}` : "";
    
    let excelTitle = "";
    if (activeTab === 'guru') {
      excelTitle = `DATA GURU${schoolSuffix}`;
    } else if (activeTab === 'tendik') {
      excelTitle = `DATA TENAGA KEPENDIDIKAN (TENDIK)${schoolSuffix}`;
    } else if (activeTab === 'nonaktif') {
      excelTitle = `DATA GTK NON AKTIF${schoolSuffix}`;
    } else {
      excelTitle = `DATA GURU DAN TENAGA KEPENDIDIKAN${schoolSuffix}`;
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
         const headers = [
          "No",
          "PTK Induk",
          "Nama Lengkap",
          "JK",
          "NUPTK",
          "Status Kepegawaian",
          "Jenis GTK",
          "Nama Instansi / Sekolah",
          "No HP / Telepon"
        ];

        const rows = exportData.map((item, index) => {
          const no = (index + 1).toString();
          const ptkInduk = formatPtkInduk(item.kepegawaian?.ptk_induk);
          const nama = item.identitas?.nama || "-";
          const jk = item.identitas?.jenis_kelamin || "-";
          const nuptk = item.identitas?.nuptk || "-";
          const status = item.kepegawaian?.status_kepegawaian || "-";
          const jenisGtk = item.kepegawaian?.jenis_ptk || "-";
          
          const schoolId = item.identitas?.sekolah_id;
          const schoolObj = allSchools.find(s => s.sekolah_id === schoolId);
          const sekolah = schoolObj ? schoolObj.nama : schoolId || "-";
          
          const telpRaw = item.data_pendukung?.no_hp || item.no_hp || item.identitas?.no_hp || item.data_pendukung?.no_telepon_rumah || item.no_telepon_rumah || "-";
          const telp = telpRaw || "-";

          return [no, ptkInduk, nama, jk, nuptk, status, jenisGtk, sekolah, telp];
        });

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
      const typeParam = activeTab === 'guru' ? 'guru' : activeTab === 'tendik' ? 'tendik' : undefined;
      const statusParam = activeTab === 'nonaktif' ? 'non-aktif' : 'aktif';
      
      const firstPage = await dapodikService.getGTK(
        100, 
        searchQuery, 
        1, 
        typeParam, 
        statusParam, 
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
            dapodikService.getGTK(
              maxLimit,
              searchQuery,
              p,
              typeParam,
              statusParam,
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
    
    if (activeTab === "guru") return `LAPORAN DATA INDUK GURU${schoolSuffix}`;
    if (activeTab === "tendik") return `LAPORAN DATA INDUK TENAGA KEPENDIDIKAN${schoolSuffix}`;
    if (activeTab === "nonaktif") return `LAPORAN DATA INDUK GTK NON-AKTIF${schoolSuffix}`;
    return "LAPORAN REKAPITULASI GURU & TENAGA KEPENDIDIKAN";
  };

  return (
    <>
      <PageMeta
        title="GTK | SIMAK Admin Panel"
        description="GTK management page"
      />

      <PrintReportLayout
        title={getPrintTitle()}
        sekolahFilter={selectedSchoolId || sekolahFilter}
        schools={allSchools}
      />

      <div className="space-y-6 no-print">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Guru dan Tenaga Kependidikan (GTK)
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola dan lihat informasi GTK di sini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedGTKIds.length > 0 && (
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
        {!isOperator && (
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
        )}

        {/* Tab Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          
          {/* Selected School Banner & Back Button */}
          {activeTab !== "rekap" && selectedSchoolId !== null && (
            <div className="mb-6 flex items-center justify-between no-print border-b border-gray-100 dark:border-white/[0.05] pb-4">
              {!isOperator ? (
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
              ) : (
                <div />
              )}
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
                    placeholder={selectedSchoolId === null ? "Cari Nama Sekolah atau NPSN..." : "Cari Nama atau NUPTK..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedSchoolId !== null && (
                  <div className="w-full sm:w-56">
                    <Select
                      options={completenessOptions}
                      defaultValue={completenessFilter}
                      onChange={(value) => setCompletenessFilter(value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Guru rendering */}
          {activeTab === "guru" && (
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
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Guru</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Tendik</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                        {filteredSchoolsList.length > 0 ? (
                          filteredSchoolsList.map((school, index) => {
                            const counts = gtkCounts[school.sekolah_id] || { guru: 0, tendik: 0 };
                            return (
                              <tr key={school.sekolah_id}>
                                <td className="px-5 py-4 text-start text-sm text-gray-500">{index + 1}</td>
                                <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{school.npsn || "-"}</td>
                                <td className="px-5 py-4 text-start text-sm font-semibold text-gray-800 dark:text-white/90">{school.nama || "-"}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-success-600 dark:text-success-400">{counts.guru}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-warning-600 dark:text-warning-400">{counts.tendik}</td>
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
                            <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                              Tidak ada data sekolah ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected School GTK List */
                <GuruTable 
                  onSelectionChange={handleSelectionChange} 
                  onDetail={(item) => navigate(`/${role}/gtk/detail`, { state: { gtkList: [item] } })}
                  searchTerm={searchQuery} 
                  completenessFilter={completenessFilter}
                  itemsPerPage={itemsPerPage}
                  sekolahId={selectedSchoolId}
                />
              )}
            </div>
          )}

          {/* Tab Tendik rendering */}
          {activeTab === "tendik" && (
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
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Guru</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Tendik</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                        {filteredSchoolsList.length > 0 ? (
                          filteredSchoolsList.map((school, index) => {
                            const counts = gtkCounts[school.sekolah_id] || { guru: 0, tendik: 0 };
                            return (
                              <tr key={school.sekolah_id}>
                                <td className="px-5 py-4 text-start text-sm text-gray-500">{index + 1}</td>
                                <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{school.npsn || "-"}</td>
                                <td className="px-5 py-4 text-start text-sm font-semibold text-gray-800 dark:text-white/90">{school.nama || "-"}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-success-600 dark:text-success-400">{counts.guru}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-warning-600 dark:text-warning-400">{counts.tendik}</td>
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
                            <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                              Tidak ada data sekolah ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected School GTK List */
                <TendikTable 
                  onSelectionChange={handleSelectionChange} 
                  onDetail={(item) => navigate(`/${role}/gtk/detail`, { state: { gtkList: [item] } })}
                  searchTerm={searchQuery} 
                  completenessFilter={completenessFilter}
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
                  Rekap GTK berdasarkan Kategori
                </h4>
                <RekapGTKTable 
                  searchTerm={searchQuery} 
                  sekolahId={sekolahFilter}
                />
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/[0.05]">
                <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                  Rekap GTK berdasarkan Pendidikan
                </h4>
                <RekapGTKPendidikanTable 
                  sekolahId={sekolahFilter}
                />
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/[0.05]">
                <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                  Rekap GTK berdasarkan Usia
                </h4>
                <RekapGTKUsiaTable 
                  sekolahId={sekolahFilter}
                />
              </div>
            </div>
          )}

          {activeTab === "nonaktif" && (
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
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Guru</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jumlah Tendik</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                        {filteredSchoolsList.length > 0 ? (
                          filteredSchoolsList.map((school, index) => {
                            const counts = gtkCounts[school.sekolah_id] || { guru: 0, tendik: 0 };
                            return (
                              <tr key={school.sekolah_id}>
                                <td className="px-5 py-4 text-start text-sm text-gray-500">{index + 1}</td>
                                <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{school.npsn || "-"}</td>
                                <td className="px-5 py-4 text-start text-sm font-semibold text-gray-800 dark:text-white/90">{school.nama || "-"}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-success-600 dark:text-success-400">{counts.guru}</td>
                                <td className="px-5 py-4 text-center text-sm font-bold text-warning-600 dark:text-warning-400">{counts.tendik}</td>
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
                            <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                              Tidak ada data sekolah ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected School GTK List */
                <NonAktifTable 
                  onSelectionChange={handleSelectionChange} 
                  onDetail={(item) => navigate(`/${role}/gtk/detail`, { state: { gtkList: [item] } })}
                  searchTerm={searchQuery} 
                  completenessFilter={completenessFilter}
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
                <th>PTK Induk</th>
                <th>Nama Lengkap</th>
                <th>JK</th>
                <th>NUPTK/NIP</th>
                <th>Status Kepegawaian</th>
                <th>Jenis GTK</th>
                <th>Sekolah / Instansi</th>
                <th>Nomor HP</th>
              </tr>
            </thead>
            <tbody>
              {printData.map((item, index) => {
                const schoolId = item.identitas?.sekolah_id;
                const schoolObj = allSchools.find(s => s.sekolah_id === schoolId);
                const sekolah = schoolObj ? schoolObj.nama : schoolId || "-";
                const telp = item.data_pendukung?.no_hp || item.no_hp || item.identitas?.no_hp || "-";
                const ptkInduk = formatPtkInduk(item.kepegawaian?.ptk_induk);
                
                return (
                  <tr key={item.identitas?.id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ textAlign: "center" }}>{ptkInduk}</td>
                    <td style={{ fontWeight: "bold" }}>{item.identitas?.nama || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.identitas?.jenis_kelamin || "-"}</td>
                    <td>{item.identitas?.nuptk || item.identitas?.nip || "-"}</td>
                    <td>{item.kepegawaian?.status_kepegawaian || "-"}</td>
                    <td>{item.kepegawaian?.jenis_ptk || "-"}</td>
                    <td>{sekolah}</td>
                    <td>{telp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== "rekap" && <PrintSignature />}

      <EditGTKModal 
        isOpen={isOpen}
        onClose={closeModal}
        selectedIds={selectedGTKIds}
      />
    </>
  );
}
