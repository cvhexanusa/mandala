import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Pagination from "../../components/common/Pagination";
import { SearchIcon, PrinterIcon, EyeIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { dapodikService } from "../../services/dapodikService";
import { mandalaService } from "../../services/mandalaService";
import Swal from "sweetalert2";
import { Modal } from "../../components/ui/modal";

// Helper to convert numbers to Indonesian spelled-out words (terbilang)
function terbilangAngka(n: number): string {
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (n < 12) return satuan[n];
  if (n < 20) return terbilangAngka(n - 10) + " Belas";
  if (n < 100) return satuan[Math.floor(n / 10)] + " Puluh " + terbilangAngka(n % 10);
  if (n < 200) return "Seratus " + terbilangAngka(n - 100);
  if (n < 1000) return satuan[Math.floor(n / 100)] + " Ratus " + terbilangAngka(n % 100);
  if (n < 2000) return "Seribu " + terbilangAngka(n - 1000);
  if (n < 1000000) return terbilangAngka(Math.floor(n / 1000)) + " Ribu " + terbilangAngka(n % 1000);
  return n.toString();
}

// Helper to spell out month in Indonesian
const MONTHS_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Helper to get Indonesian day name
const DAYS_INDO = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

// Helper to format semester name dynamically based on semester or semester_id
function formatSemester(tp: any): string {
  if (!tp) return "1 (Ganjil)";
  const sem = String(tp.semester || "").toLowerCase();
  if (sem.includes("genap") || sem === "2") {
    return "2 (Genap)";
  }
  if (sem.includes("ganjil") || sem === "1") {
    return "1 (Ganjil)";
  }
  const semId = String(tp.semester_id || "");
  if (semId.endsWith("2")) {
    return "2 (Genap)";
  }
  if (semId.endsWith("1")) {
    return "1 (Ganjil)";
  }
  return tp.semester || "1 (Ganjil)";
}

export default function SptjmDapodikPage() {
  const navigate = useNavigate();
  const { role } = useParams();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State for print template data
  const [printData, setPrintData] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load School List
  useEffect(() => {
    const loadSchools = async () => {
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
      } catch (err) {
        console.error("Gagal memuat data sekolah:", err);
        Swal.fire("Error", "Gagal memuat data sekolah", "error");
      } finally {
        setLoading(false);
      }
    };
    loadSchools();
  }, []);

  // Filter school list
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const name = school.nama || "";
      const npsn = school.npsn || "";
      const kec = school.kecamatan || "";
      const kab = school.kabupaten_kota || school.kabupate_kota || "";
      const query = searchQuery.toLowerCase();
      return (
        name.toLowerCase().includes(query) ||
        npsn.toLowerCase().includes(query) ||
        kec.toLowerCase().includes(query) ||
        kab.toLowerCase().includes(query)
      );
    });
  }, [schools, searchQuery]);

  // Pagination for school list
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage) || 1;
  const paginatedSchools = useMemo(() => {
    return filteredSchools.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredSchools, currentPage, itemsPerPage]);

  // Detail Preview Handler - redirects to the new detailed page
  const handleShowDetail = (school: any) => {
    const schoolId = school.sekolah_id || school.id;
    navigate(`/${role || "admin"}/analisa/sptjm-dapodik/detail/${schoolId}`);
  };

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  return (
    <>
      <PageMeta
        title="SPTJM Dapodik | SIMAK"
        description="Pencetakan SPTJM Dapodik Berita Acara Verifikasi Data Faktual Siswa"
      />

      {/* Modern UI Section (Hidden in print) */}
      <div className="space-y-6 font-outfit no-print">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              SPTJM Dapodik
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Daftar Satuan Pendidikan untuk mencetak Berita Acara Verifikasi dan Validasi Data Faktual Siswa.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Cari nama sekolah, NPSN atau wilayah..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
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
              <Table className="min-w-[800px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3.5 text-start font-semibold text-gray-500 text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32">NPSN</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-60">Nama Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-60">Wilayah</TableCell>
                    <TableCell isHeader className="px-5 py-3.5 font-semibold text-gray-500 text-right text-theme-xs dark:text-gray-400 w-28">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedSchools.length > 0 ? (
                    paginatedSchools.map((school, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      const wilayah = [school.kecamatan, school.kabupaten_kota || school.kabupate_kota].filter(Boolean).join(", ");
                      return (
                        <TableRow key={school.sekolah_id || school.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{globalIndex}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-mono font-medium text-gray-700 dark:text-gray-300">{school.npsn || "-"}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-bold text-gray-800 dark:text-white/90">{school.nama || "-"}</TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">{wilayah || "-"}</TableCell>
                          <TableCell className="px-5 py-4 text-right">
                            <Button
                              variant="primary"
                              size="sm"
                              startIcon={<EyeIcon className="size-4" />}
                              onClick={() => handleShowDetail(school)}
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
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

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
