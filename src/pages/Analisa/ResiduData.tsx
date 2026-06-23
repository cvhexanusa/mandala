import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon, AngleLeftIcon, EyeIcon, SchoolIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Avatar from "../../components/ui/avatar/Avatar";
import Badge from "../../components/ui/badge/Badge";
import Pagination from "../../components/common/Pagination";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";

export default function ResiduData() {
  const { type } = useParams<{ type: string }>();
  
  const [schools, setSchools] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const getTypeName = () => {
    if (type === "guru") return "Guru";
    if (type === "tendik") return "Tendik";
    return "Peserta Didik";
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setRawData([]);
      setSelectedSchoolId(null); // Reset detail view when type/category changes
      try {
        const schoolRes = await dapodikService.getSekolah();
        let schoolList = [];
        if (schoolRes.status === 'success' || schoolRes.success === true) {
          schoolList = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schoolList = schoolRes;
        } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
          schoolList = schoolRes.data;
        }
        setSchools(schoolList);

        let dataList: any[] = [];
        if (type === "guru") {
          const res = await dapodikService.getGTK(500, "", 1, "guru", "aktif");
          dataList = res.status === 'success' || res.success === true ? res.data : (Array.isArray(res) ? res : (res.data || []));
        } else if (type === "tendik") {
          const res = await dapodikService.getGTK(500, "", 1, "tendik", "aktif");
          dataList = res.status === 'success' || res.success === true ? res.data : (Array.isArray(res) ? res : (res.data || []));
        } else {
          const res = await dapodikService.getPesertaDidik(1000, "", 1, undefined, "aktif");
          dataList = res.status === 'success' || res.success === true ? res.data : (Array.isArray(res) ? res : (res.data || []));
        }

        setRawData(dataList);
      } catch (err) {
        console.error("Gagal memuat data residu:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type]);

  // Reset to page 1 on filter or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSchoolId, type]);

  const isFieldEmpty = (val: any) => {
    return val === null || val === undefined || String(val).trim() === "" || String(val).trim() === "-";
  };

  // Residu Checkers
  const isResiduRecord = (item: any) => {
    const identitas = item.identitas || {};
    const dataPendukung = item.data_pendukung || {};
    const akademik = item.akademik || {};

    const npsnEmpty = isFieldEmpty(identitas.sekolah_id);
    const namaEmpty = isFieldEmpty(identitas.nama);
    const nikEmpty = isFieldEmpty(identitas.nik);
    const tempatLahirEmpty = isFieldEmpty(identitas.tempat_lahir);
    const tanggalLahirEmpty = isFieldEmpty(identitas.tanggal_lahir);
    
    const ibuKandungEmpty = isFieldEmpty(
      identitas.nama_ibu_kandung || 
      identitas.ibu_kandung || 
      dataPendukung.nama_ibu || 
      dataPendukung.nama_ibu_kandung ||
      item.nama_ibu_kandung
    );

    const jkEmpty = isFieldEmpty(identitas.jenis_kelamin);
    
    const desaEmpty = isFieldEmpty(
      item.desa_kelurahan || 
      dataPendukung.desa_kelurahan || 
      item.desa || 
      dataPendukung.desa ||
      dataPendukung.alamat_jalan ||
      item.alamat_jalan
    );

    if (type === "peserta-didik") {
      const nisnEmpty = isFieldEmpty(identitas.nisn);
      const rombelEmpty = isFieldEmpty(akademik.nama_rombel || akademik.rombel);

      return npsnEmpty || namaEmpty || nisnEmpty || rombelEmpty || nikEmpty || tempatLahirEmpty || tanggalLahirEmpty || ibuKandungEmpty || jkEmpty || desaEmpty;
    }

    return npsnEmpty || namaEmpty || nikEmpty || tempatLahirEmpty || tanggalLahirEmpty || ibuKandungEmpty || jkEmpty || desaEmpty;
  };

  const getSchoolInfo = (sekolahId: string) => {
    const school = schools.find((s) => s.sekolah_id === sekolahId);
    return {
      nama: school ? school.nama : sekolahId || "-",
      npsn: school ? school.npsn : "-"
    };
  };

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  // 1. Group data per school and calculate statistics
  const schoolResiduData = schools.map((school) => {
    const schoolResiduItems = rawData.filter(
      (item) => item.identitas?.sekolah_id === school.sekolah_id && isResiduRecord(item)
    );
    return {
      ...school,
      residuCount: schoolResiduItems.length,
      residuItems: schoolResiduItems
    };
  });

  // 2. Filter and sort schools for list view
  const filteredSchools = schoolResiduData
    .filter((school) => {
      const nameMatch = school.nama.toLowerCase().includes(searchQuery.toLowerCase());
      const npsnMatch = (school.npsn || "").toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || npsnMatch;
    })
    .sort((a, b) => b.residuCount - a.residuCount);

  // 3. Drill-down filtering for the selected school
  const selectedSchool = schools.find((s) => s.sekolah_id === selectedSchoolId);
  const selectedSchoolResiduItems = rawData.filter((item) => {
    if (item.identitas?.sekolah_id !== selectedSchoolId) return false;
    if (!isResiduRecord(item)) return false;

    const hmName = item.identitas?.nama || "";
    const nik = item.identitas?.nik || "";
    const nisn = item.identitas?.nisn || "";

    const matchesSearch =
      hmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nisn.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Determine active dataset and pagination
  const isDetailView = selectedSchoolId !== null;
  const activeDataLength = isDetailView ? selectedSchoolResiduItems.length : filteredSchools.length;
  const totalPages = Math.ceil(activeDataLength / itemsPerPage) || 1;

  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedResiduItems = selectedSchoolResiduItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats computation
  const totalSchools = schools.length;
  const schoolsWithResidu = schoolResiduData.filter((s) => s.residuCount > 0).length;
  const cleanSchools = totalSchools - schoolsWithResidu;
  const totalResiduCount = rawData.filter((item) => isResiduRecord(item)).length;

  const handleExport = () => {
    const title = isDetailView
      ? `Export Data Residu ${getTypeName()} Sekolah ${selectedSchool?.nama}?`
      : `Export Rangkuman Residu ${getTypeName()} Semua Sekolah?`;

    Swal.fire({
      title: title,
      text: "Data residu akan diunduh dalam format Excel.",
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

  // Helper to render value or "Kosong" badge
  const renderValue = (val: any) => {
    if (isFieldEmpty(val)) {
      return (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20">
          <svg className="size-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Kosong
        </span>
      );
    }
    return <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">{val}</span>;
  };

  return (
    <>
      <PageMeta
        title={`Residu ${getTypeName()} | SIMAK`}
        description={`Halaman Analisa Residu Data ${getTypeName()}`}
      />
      <div className="space-y-6 font-outfit">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              {isDetailView && (
                <button
                  onClick={() => {
                    setSelectedSchoolId(null);
                    setSearchQuery("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors mr-1 cursor-pointer flex items-center justify-center border border-gray-200 dark:border-gray-700"
                  title="Kembali ke Daftar Sekolah"
                >
                  <AngleLeftIcon className="size-5" />
                </button>
              )}
              Analisa Residu - {getTypeName()}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isDetailView
                ? `Menampilkan data residu lengkap untuk ${selectedSchool?.nama}`
                : `Menampilkan ringkasan data ${getTypeName()} yang memiliki atribut kosong/belum lengkap per sekolah.`}
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

        {/* Quick Stats Grid */}
        {!isDetailView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print animate-[fadeIn_0.3s_ease-out]">
            {/* Card 1: Total Schools */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
              <div className="p-3 bg-brand-500/10 dark:bg-brand-500/15 text-brand-500 dark:text-brand-400 rounded-xl">
                <SchoolIcon className="size-6" />
              </div>
              <div>
                <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Sekolah</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{totalSchools}</span>
              </div>
            </div>

            {/* Card 2: Schools needing repair */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
              <div className="p-3 bg-warning-500/10 dark:bg-warning-500/15 text-warning-500 dark:text-orange-400 rounded-xl">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Butuh Perbaikan</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{schoolsWithResidu}</span>
              </div>
            </div>

            {/* Card 3: Clean Schools */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
              <div className="p-3 bg-success-500/10 dark:bg-success-500/15 text-success-500 dark:text-success-400 rounded-xl">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sekolah Bersih</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{cleanSchools}</span>
              </div>
            </div>

            {/* Card 4: Total Residu Items */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300 shadow-sm">
              <div className="p-3 bg-error-500/10 dark:bg-error-500/15 text-error-500 dark:text-error-400 rounded-xl">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-theme-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Residu</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{totalResiduCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected School Info Card */}
        {isDetailView && (
          <div className="rounded-2xl border border-brand-100 dark:border-brand-500/10 bg-brand-50/30 dark:bg-brand-500/5 p-5 md:p-6 no-print flex flex-col md:flex-row md:items-center justify-between gap-4 animate-[fadeIn_0.3s_ease-out] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 rounded-2xl hidden sm:block">
                <SchoolIcon className="size-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white/90">{selectedSchool?.nama}</h4>
                  <Badge color="primary" variant="solid" className="text-xs px-2 py-0.5 rounded-md font-semibold">
                    NPSN: {selectedSchool?.npsn || "-"}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Berikut adalah daftar rincian data residu {getTypeName()} yang perlu dilengkapi.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-start md:text-end">
                <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Jumlah Residu Sekolah</span>
                <span className="text-2xl font-extrabold text-amber-600 dark:text-orange-400">
                  {selectedSchoolResiduItems.length} Data
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print shadow-sm">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon className="size-5" />
            </span>
            <Input
              type="text"
              placeholder={
                isDetailView
                  ? `Cari Nama ${getTypeName()}, NIK, atau NISN...`
                  : "Cari Nama Sekolah atau NPSN..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table Content Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area shadow-sm">
          {/* Table Items Per Page Selector */}
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
              <Table className={isDetailView ? "min-w-[1300px]" : "min-w-[800px]"}>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  {isDetailView ? (
                    <TableRow>
                      <TableCell isHeader className="px-5 py-4 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama</TableCell>
                      {type === "peserta-didik" && (
                        <>
                          <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NISN</TableCell>
                          <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Rombel</TableCell>
                        </>
                      )}
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NIK</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tempat Lahir</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tanggal Lahir</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Ibu Kandung</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Desa</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell isHeader className="px-5 py-4 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-48">NPSN</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Sekolah</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-48">Jumlah Residu</TableCell>
                      <TableCell isHeader className="px-5 py-4 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-32 no-print">Aksi</TableCell>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isDetailView ? (
                    // Render detailed school residu records
                    paginatedResiduItems.length > 0 ? (
                      paginatedResiduItems.map((item, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <TableRow key={item.identitas?.id || index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors duration-200">
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                            <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar src={item.identitas?.foto} size="small" />
                                <span className="font-semibold text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                              </div>
                            </TableCell>
                            {type === "peserta-didik" && (
                              <>
                                <TableCell className="px-5 py-4 text-start text-theme-sm font-mono">{renderValue(item.identitas?.nisn)}</TableCell>
                                <TableCell className="px-5 py-4 text-start text-theme-sm">
                                  {isFieldEmpty(item.akademik?.nama_rombel || item.akademik?.rombel) ? (
                                    renderValue(null)
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                      {item.akademik?.nama_rombel || item.akademik?.rombel}
                                    </span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="px-5 py-4 text-start text-theme-sm font-mono">{renderValue(item.identitas?.nik)}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm">{renderValue(item.identitas?.tempat_lahir)}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm">
                              {renderValue(item.identitas?.tanggal_lahir ? new Date(item.identitas.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm">
                              {renderValue(
                                item.identitas?.nama_ibu_kandung || 
                                item.identitas?.ibu_kandung || 
                                item.data_pendukung?.nama_ibu || 
                                item.data_pendukung?.nama_ibu_kandung ||
                                item.nama_ibu_kandung
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center text-theme-sm">{renderValue(item.identitas?.jenis_kelamin)}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm">
                              {renderValue(
                                item.desa_kelurahan || 
                                item.data_pendukung?.desa_kelurahan || 
                                item.desa || 
                                item.data_pendukung?.desa ||
                                item.data_pendukung?.alamat_jalan ||
                                item.alamat_jalan
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={type === "peserta-didik" ? 10 : 8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          {loading ? "Sedang memuat..." : "Tidak ada data residu ditemukan untuk sekolah ini."}
                        </TableCell>
                      </TableRow>
                    )
                  ) : (
                    // Render schools list summary
                    paginatedSchools.length > 0 ? (
                      paginatedSchools.map((school, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <TableRow key={school.sekolah_id || index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors duration-200">
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm font-mono font-medium text-gray-700 dark:text-gray-300">{school.npsn || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-lg">
                                  <SchoolIcon className="size-4.5" />
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-white/90">{school.nama}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center">
                              {school.residuCount > 0 ? (
                                <Badge color="warning" variant="light" className="px-2.5 py-0.5 rounded-full font-bold">
                                  {school.residuCount} Residu
                                </Badge>
                              ) : (
                                <Badge color="success" variant="light" className="px-2.5 py-0.5 rounded-full font-bold">
                                  Lengkap
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center no-print">
                              <Button
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-1.5 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 cursor-pointer"
                                onClick={() => {
                                  setSelectedSchoolId(school.sekolah_id);
                                  setSearchQuery("");
                                  setCurrentPage(1);
                                }}
                                startIcon={<EyeIcon className="size-3.5" />}
                              >
                                Lihat Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          {loading ? "Sedang memuat..." : "Tidak ada data sekolah ditemukan."}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && activeDataLength > 0 && (
            <div className="no-print mt-6">
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
