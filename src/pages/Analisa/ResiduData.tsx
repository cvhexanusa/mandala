import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon } from "../../icons";
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
  const [sekolahFilter, setSekolahFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getTypeName = () => {
    if (type === "guru") return "Guru";
    if (type === "tendik") return "Tendik";
    return "Peserta Didik";
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setRawData([]);
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

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sekolahFilter, type]);

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

  const schoolOptions = [
    { value: "all", label: "Pilih Sekolah" },
    ...schools.map((s) => ({ value: s.sekolah_id, label: s.nama }))
  ];

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  // Filter raw data to residu only and match search/school filter
  const residuData = rawData.filter((item) => {
    if (!isResiduRecord(item)) return false;

    const schoolInfo = getSchoolInfo(item.identitas?.sekolah_id);
    const hmName = item.identitas?.nama || "";
    const nik = item.identitas?.nik || "";
    const nisn = item.identitas?.nisn || "";

    const matchesSearch = 
      hmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolInfo.nama.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool = sekolahFilter === "all" || item.identitas?.sekolah_id === sekolahFilter;

    return matchesSearch && matchesSchool;
  });

  // Calculate pagination values
  const totalPages = Math.ceil(residuData.length / itemsPerPage) || 1;
  const paginatedData = residuData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    Swal.fire({
      title: `Export Data Residu ${getTypeName()}?`,
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
        <span className="text-red-500 font-semibold text-xs bg-red-50 dark:bg-red-500/10 px-2.5 py-0.5 rounded-md border border-red-200 dark:border-red-500/20">
          Kosong
        </span>
      );
    }
    return <span className="text-gray-700 dark:text-gray-300 font-medium">{val}</span>;
  };

  return (
    <>
      <PageMeta
        title={`Residu ${getTypeName()} | SIMAK`}
        description={`Halaman Analisa Residu Data ${getTypeName()}`}
      />
      <div className="space-y-6 font-outfit">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Analisa Residu - {getTypeName()}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Menampilkan data {getTypeName()} yang memiliki atribut kosong/belum lengkap.
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative col-span-1 sm:col-span-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-5" />
              </span>
              <Input
                type="text"
                placeholder={`Cari Nama ${getTypeName()}, NIK, NISN, atau Sekolah...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select
                options={schoolOptions}
                defaultValue={sekolahFilter}
                onChange={(value) => setSekolahFilter(value)}
              />
            </div>
          </div>
        </div>

        {/* Table Content Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          
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
              <Table className="min-w-[1300px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-32">NPSN</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap w-48">Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama</TableCell>
                    {type === "peserta-didik" && (
                      <>
                        <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NISN</TableCell>
                        <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Rombel</TableCell>
                      </>
                    )}
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NIK</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tempat Lahir</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tanggal Lahir</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Ibu Kandung</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Desa</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const schoolInfo = getSchoolInfo(item.identitas?.sekolah_id);
                      const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <TableRow key={item.identitas?.id || index} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-mono">{renderValue(schoolInfo.npsn)}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm">{renderValue(schoolInfo.nama)}</TableCell>
                          <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar src={item.identitas?.foto} size="small" />
                              <span className="font-medium text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                            </div>
                          </TableCell>
                          {type === "peserta-didik" && (
                            <>
                              <TableCell className="px-5 py-4 text-start text-theme-sm font-mono">{renderValue(item.identitas?.nisn)}</TableCell>
                              <TableCell className="px-5 py-4 text-start text-theme-sm">
                                {isFieldEmpty(item.akademik?.nama_rombel || item.akademik?.rombel) ? (
                                  renderValue(null)
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-theme-xs font-medium text-gray-700 dark:text-gray-300">
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
                      <TableCell colSpan={type === "peserta-didik" ? 12 : 10} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        {loading ? "Sedang memuat..." : "Tidak ada data residu ditemukan."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && residuData.length > 0 && (
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
