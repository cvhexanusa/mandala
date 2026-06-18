import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, UserCircleIcon, SearchIcon } from "../../icons";
import StudentTable from "../../components/student/StudentTable";
import PDKeluarTable from "../../components/student/PDKeluarTable";
import RekapPDTable from "../../components/student/RekapPDTable";
import RekapPDUsiaTable from "../../components/student/RekapPDUsiaTable";
import { useModal } from "../../hooks/useModal";
import EditStudentModal from "../../components/student/EditStudentModal";
import { dapodikService } from "../../services/dapodikService";

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

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

          const uniqueJenjang = [...new Set(schools.map((s: any) => s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str))].filter(Boolean).sort();
          setJenjangOptions([{ value: "all", label: "Jenjang" }, ...uniqueJenjang.map(j => ({ value: j, label: j }))]);
        }
      } catch (err) {
        console.error("Gagal memuat filter:", err);
      }
    };
    fetchFilterData();
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
    if (jenjangFilter !== "all") filtered = filtered.filter(s => (s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str) === jenjangFilter);
    
    setSekolahOptions([{ value: "all", label: "Pilih Sekolah" }, ...filtered.map(s => ({ value: s.sekolah_id, label: s.nama }))]);
    
    if (sekolahFilter !== "all" && !filtered.some(s => s.sekolah_id === sekolahFilter)) {
        setSekolahFilter("all");
    }
  }, [kabKotaFilter, kecamatanFilter, statusFilter, jenjangFilter, allSchools]);

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

  const handleExport = () => {
    Swal.fire({
      title: "Export Data?",
      text: `Data ${activeTab === 'aktif' ? 'Peserta Didik' : activeTab === 'rekap' ? 'Rekap PD' : 'PD Keluar'} akan diunduh dalam format Excel.`,
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
        title="Peserta Didik | SIMAK Admin Panel"
        description="Student data management page"
      />
      <div className="space-y-6">
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
                    defaultValue={sekolahFilter}
                    onChange={(value) => setSekolahFilter(value)}
                    disabled={kabKotaFilter === "all"}
                />
            </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
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
                    placeholder="Cari Nama atau NISN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {activeTab === "aktif" && (
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
            <StudentTable 
                type="aktif" 
                onSelectionChange={handleSelectionChange} 
                onDetail={(item) => navigate(`/${role}/peserta-didik/detail`, { state: { students: [item] } })}
                searchTerm={searchQuery}
                completenessFilter="all"
                gradeFilter={gradeFilter}
                itemsPerPage={itemsPerPage}
                sekolahId={sekolahFilter}
            />
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
              <PDKeluarTable 
                onSelectionChange={handleSelectionChange} 
                onDetail={(item) => navigate(`/${role}/peserta-didik/detail`, { state: { students: [item] } })}
                searchTerm={searchQuery} 
                itemsPerPage={itemsPerPage}
                sekolahId={sekolahFilter}
              />
            </div>
          )}
        </div>
      </div>

      <EditStudentModal 
        isOpen={isOpen}
        onClose={closeModal}
        selectedIds={selectedStudentIds}
      />
    </>
  );
}
