import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import { dapodikService } from "../../services/dapodikService";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import Avatar from "../../components/ui/avatar/Avatar";
import Select from "../../components/form/Select";
import Pagination from "../../components/common/Pagination";
import Badge from "../../components/ui/badge/Badge";
import Swal from "sweetalert2";
import { exportToCSV } from "../../utils/exportUtils";
import { DownloadIcon, PrinterIcon, SchoolIcon, SearchIcon, UserIcon } from "../../icons";


const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const AuditPendidikanGTK: React.FC = () => {
  const { role, sekolahId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");

  // States
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  const [kepalaSekolah, setKepalaSekolah] = useState("Belum Ditentukan");
  const [gtkRecords, setGtkRecords] = useState<any[]>([]);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<"all" | "higher_ed" | "bachelor" | "diploma" | "slta">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [ptkFilter, setPtkFilter] = useState(
    typeParam === "guru" ? "Guru" : typeParam === "tendik" ? "Tendik" : "all"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadAuditData = async () => {
      if (!sekolahId) return;
      setLoading(true);
      try {
        // Fetch Schools
        let schoolList: any[] = [];
        try {
          const schoolRes = await dapodikService.getSekolah();
          if (schoolRes.status === 'success' || schoolRes.success === true) {
            schoolList = schoolRes.data || [];
          } else if (Array.isArray(schoolRes)) {
            schoolList = schoolRes;
          } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
            schoolList = schoolRes.data;
          }
        } catch (e) {
          console.error("Gagal mengambil data sekolah:", e);
        }

        const currentSch = schoolList.find((s: any) => (s.sekolah_id || s.id) === sekolahId);
        setSchool(currentSch);

        // Fetch Headmaster and GTK members
        let gtkList: any[] = [];
        try {
          const gtkRes = await dapodikService.getGTK(1000, "", 1, undefined, "aktif", sekolahId);
          if (gtkRes.status === 'success' || gtkRes.success === true) {
            gtkList = gtkRes.data || [];
          } else if (Array.isArray(gtkRes)) {
            gtkList = gtkRes;
          } else if (gtkRes.data && Array.isArray(gtkRes.data)) {
            gtkList = gtkRes.data;
          }
        } catch (e) {
          console.error("Gagal mengambil data GTK:", e);
        }

        const ks = gtkList.find((g: any) => 
          g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
          g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
        );
        const hmName = ks?.identitas?.nama || "Belum Ditentukan";
        setKepalaSekolah(hmName);

        // Format GTK members
        const formattedGTK = gtkList.map((item: any) => {
          const fotoUrl = item.identitas?.foto 
            ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://centralsimak.smakniscjr.sch.id'}/storage/${item.identitas.foto}` 
            : '';

          return {
            id: item.ptk_id || item.identitas?.id || Math.random().toString(),
            nama: item.identitas?.nama || "-",
            nuptk: item.identitas?.nuptk || item.identitas?.nip || "-",
            role: item.kepegawaian?.jenis_ptk || "-",
            pendidikan: item.kepegawaian?.pendidikan_terakhir || item.identitas?.pendidikan_terakhir || "-",
            bidangStudi: item.identitas?.bidang_studi_terakhir || item.kepegawaian?.bidang_studi_terakhir || item.kepegawaian?.jabatan || "-",
            foto: fotoUrl,
            rawItem: item
          };
        });

        setGtkRecords(formattedGTK);

      } catch (err) {
        console.error("Gagal memuat data audit pendidikan GTK:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [sekolahId]);

  const ptkOptions = [
    { value: "all", label: "Semua Jenis PTK" },
    { value: "Guru", label: "Guru" },
    { value: "Tendik", label: "Tendik" }
  ];

  // Helper for education badges
  const getEducationColor = (edu: string): any => {
    if (!edu) return "light";
    const e = edu.toUpperCase();
    if (e.includes("S3") || e.includes("DOKTOR")) return "dark";
    if (e.includes("S2") || e.includes("MAGISTER")) return "info";
    if (e.includes("S1") || e.includes("D4") || e.includes("SARJANA")) return "primary";
    if (e.includes("D3") || e.includes("D2") || e.includes("D1") || e.includes("DIPLOMA")) return "warning";
    if (e.includes("SMA") || e.includes("SMK") || e.includes("SLTA") || e.includes("MA")) return "success";
    return "light";
  };

  // Educational breakdown calculation for metrics cards
  const stats = useMemo(() => {
    let higherEd = 0;
    let bachelor = 0;
    let diploma = 0;
    let slta = 0;

    const filteredForStats = gtkRecords.filter((item) => {
      return ptkFilter === "all" || 
        (ptkFilter === "Guru" && item.role.toLowerCase().includes("guru")) ||
        (ptkFilter === "Tendik" && !item.role.toLowerCase().includes("guru"));
    });

    filteredForStats.forEach((r) => {
      const e = r.pendidikan.toUpperCase();
      if (e.includes("S3") || e.includes("S2") || e.includes("MAGISTER") || e.includes("DOKTOR")) {
        higherEd++;
      } else if (e.includes("S1") || e.includes("D4") || e.includes("SARJANA")) {
        bachelor++;
      } else if (e.includes("D3") || e.includes("D2") || e.includes("D1") || e.includes("DIPLOMA")) {
        diploma++;
      } else if (e.includes("SMA") || e.includes("SMK") || e.includes("SLTA") || e.includes("MA")) {
        slta++;
      }
    });

    return {
      total: filteredForStats.length,
      higherEd,
      bachelor,
      diploma,
      slta
    };
  }, [gtkRecords, ptkFilter]);

  // Filter list
  const filteredRecords = useMemo(() => {
    return gtkRecords.filter((item) => {
      // 1. Tab Filter
      let matchTab = false;
      const e = item.pendidikan.toUpperCase();
      if (activeTab === "all") {
        matchTab = true;
      } else if (activeTab === "higher_ed") {
        matchTab = e.includes("S3") || e.includes("S2") || e.includes("MAGISTER") || e.includes("DOKTOR");
      } else if (activeTab === "bachelor") {
        matchTab = e.includes("S1") || e.includes("D4") || e.includes("SARJANA");
      } else if (activeTab === "diploma") {
        matchTab = e.includes("D3") || e.includes("D2") || e.includes("D1") || e.includes("DIPLOMA");
      } else if (activeTab === "slta") {
        matchTab = e.includes("SMA") || e.includes("SMK") || e.includes("SLTA") || e.includes("MA");
      }

      // 2. Search Filter
      const matchSearch = 
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.nuptk.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bidangStudi.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. PTK Type Filter
      const matchPtk = ptkFilter === "all" || 
        (ptkFilter === "Guru" && item.role.toLowerCase().includes("guru")) ||
        (ptkFilter === "Tendik" && !item.role.toLowerCase().includes("guru"));

      return matchTab && matchSearch && matchPtk;
    });
  }, [gtkRecords, activeTab, searchTerm, ptkFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleExport = () => {
    Swal.fire({
      title: "Export Data Kualifikasi GTK?",
      text: "Data latar belakang pendidikan GTK sekolah ini akan diexport ke format CSV (Kompatibel dengan Excel).",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["No", "Nama Pegawai", "NUPTK / NIP", "Jabatan / Jenis PTK", "Pendidikan Terakhir", "Bidang Studi / Jurusan"];
        
        const rows = filteredRecords.map((log, index) => [
          index + 1,
          log.nama || "-",
          log.nuptk ? `="${log.nuptk}"` : "-",
          log.role || "-",
          log.pendidikan || "-",
          log.bidangStudi || "-"
        ]);

        const filename = `Kualifikasi_GTK_${school?.nama.replace(/\s+/g, "_") || "Sekolah"}_${new Date().toISOString().slice(0, 10)}.csv`;
        exportToCSV(filename, headers, rows);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Riwayat Pendidikan GTK - ${school?.nama || "SIMAK"}`}
        description="Analisa riwayat pendidikan formal Guru dan Tenaga Kependidikan."
      />

      {/* Action Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <button
          onClick={() => navigate(`/${role}/analisa/pendidikan-gtk${typeParam ? `/${typeParam}` : ""}`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Kembali ke Rekap Pendidikan
        </button>
        
        <div className="flex flex-wrap items-center gap-3">
          <ButtonWithTheme variant="success-outline" onClick={handleExport}>
            <DownloadIcon className="size-4 mr-2" /> Export
          </ButtonWithTheme>
          <ButtonWithTheme variant="outline" onClick={handlePrint}>
            <PrinterIcon className="size-4 mr-2" /> Cetak
          </ButtonWithTheme>
        </div>
      </div>

      {/* School Info Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400">
            <SchoolIcon className="size-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 leading-tight">
              {school?.nama || "Sekolah Mandiri"}
            </h3>
            <p className="text-sm text-gray-400 font-mono mt-1">NPSN: {school?.npsn || "-"}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-semibold text-gray-400 dark:text-gray-500">Kepala Sekolah: </span>
                {kepalaSekolah}
              </div>
              <div>
                <span className="font-semibold text-gray-400 dark:text-gray-500">Wilayah: </span>
                {school?.kecamatan || "-"}, {school?.kabupaten_kota || school?.kabupate_kota || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-brand-50/50 dark:bg-brand-500/5 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-500/10 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            {ptkFilter === "Guru" ? "Total Guru" : ptkFilter === "Tendik" ? "Total Tendik" : "Total GTK"}
          </span>
          <span className="font-extrabold text-brand-600 text-2xl">{stats.total}</span>
        </div>
        <div className="bg-purple-50/50 dark:bg-purple-500/5 p-4 rounded-2xl border border-purple-100/50 dark:border-purple-500/10 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Pascasarjana (S2/S3)</span>
          <span className="font-extrabold text-purple-600 text-2xl">{stats.higherEd}</span>
        </div>
        <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Sarjana (S1/D4)</span>
          <span className="font-extrabold text-blue-600 text-2xl">{stats.bachelor}</span>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-500/10 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Diploma (D1-D3)</span>
          <span className="font-extrabold text-amber-600 text-2xl">{stats.diploma}</span>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Pendidikan Menengah</span>
          <span className="font-extrabold text-emerald-600 text-2xl">{stats.slta}</span>
        </div>
      </div>

      {/* Main Audit List Card */}
      <ComponentCard title="Riwayat Pendidikan Guru & Tenaga Kependidikan">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 no-print">
          
          {/* Custom Audit Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-full md:w-auto">
            <button 
              onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Semua
            </button>
            <button 
              onClick={() => { setActiveTab("higher_ed"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "higher_ed"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              S2 / S3
            </button>
            <button 
              onClick={() => { setActiveTab("bachelor"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "bachelor"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              S1 / D4
            </button>
            <button 
              onClick={() => { setActiveTab("diploma"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "diploma"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Diploma
            </button>
            <button 
              onClick={() => { setActiveTab("slta"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "slta"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              SMA / SMK / MA
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* PTK Type Filter */}
            <div className="w-full md:w-40">
              <Select
                options={ptkOptions}
                defaultValue={ptkFilter}
                onChange={(value) => {
                  setPtkFilter(value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-60">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama, NUPTK, jurusan..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] py-2 pl-9 pr-4 text-xs focus:border-brand-500 focus:ring-0 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Audit Details Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <Table className="min-w-[650px] xl:min-w-full">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase w-16">No</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Pegawai / NUPTK</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Jabatan / Jenis PTK</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-40">Pendidikan Terakhir</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Bidang Studi / Jurusan</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-24">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((log, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <TableRow key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005]">
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/95">
                          <div className="flex items-center gap-3">
                            <Avatar src={log.foto} size="medium" />
                            <div className="flex flex-col">
                              <span>{log.nama}</span>
                              <span className="text-xs text-gray-400 font-mono mt-0.5">{log.nuptk}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {log.role}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center font-semibold">
                          <div className="flex flex-col items-center gap-1.5">
                            {log.role.toLowerCase().includes("guru") ? (
                              (() => {
                                const edu = log.pendidikan.toUpperCase();
                                const isBelowS1 = !(edu.includes("S1") || edu.includes("D4") || edu.includes("SARJANA") || edu.includes("S2") || edu.includes("S3") || edu.includes("MAGISTER") || edu.includes("DOKTOR"));
                                return (
                                  <>
                                    <Badge color={isBelowS1 ? "error" : "success"} size="sm">
                                      {log.pendidikan}
                                    </Badge>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      isBelowS1 
                                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" 
                                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    }`}>
                                      {isBelowS1 ? "Anomali (Di bawah S1)" : "Sesuai (≥ S1)"}
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <Badge color={getEducationColor(log.pendidikan)} size="sm">
                                {log.pendidikan}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {log.bidangStudi}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/${role}/gtk/detail`, { state: { gtkList: [log.rawItem] } })}
                            className="p-2 text-gray-500 hover:text-brand-500 transition-colors cursor-pointer"
                            title="Lihat Profil Detail"
                          >
                            <UserIcon className="size-5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Tidak ada data riwayat pendidikan GTK yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="mt-6 no-print">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </ComponentCard>
    </>
  );
};

// UI helper components
interface ButtonWithThemeProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "success-outline";
  children: React.ReactNode;
}

const ButtonWithTheme: React.FC<ButtonWithThemeProps> = ({ variant = "primary", children, ...props }) => {
  const variantClasses = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.02]",
    "success-outline": "border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
  };

  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 inline-flex items-center justify-center cursor-pointer ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};

export default AuditPendidikanGTK;
