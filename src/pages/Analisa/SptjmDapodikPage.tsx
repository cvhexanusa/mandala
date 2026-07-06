import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Pagination from "../../components/common/Pagination";
import { SearchIcon, PrinterIcon } from "../../icons";
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

export default function SptjmDapodikPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // State for print template data
  const [printData, setPrintData] = useState<any | null>(null);

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

  // Print PDF Handler
  const handlePrint = async (school: any) => {
    const schoolId = school.sekolah_id || school.id;

    Swal.fire({
      title: "Mempersiapkan Cetak",
      text: `Menarik data pendukung untuk ${school.nama}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // 1. Fetch Mapping Pengawas
      const mappingRes = await mandalaService.getMappingPengawas().catch(() => ({ data: [] }));
      const mappings = mappingRes.data || [];
      const matchedMapping = mappings.find((m: any) => m.sekolah_id === schoolId);

      const pengawasName = matchedMapping?.pegawai?.nama_lengkap || "-";
      const pengawasNip = matchedMapping?.pegawai?.nip || "-";

      // 2. Fetch Kepala Sekolah (GTK)
      const gtkRes = await dapodikService.getGTK(100, "", 1, undefined, "aktif", schoolId).catch(() => ({ data: [] }));
      const gtkList = gtkRes.data || [];
      const matchedPrincipal = gtkList.find((g: any) =>
        g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
        g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
      );

      const principalName = matchedPrincipal?.identitas?.nama || "-";
      const principalNip = matchedPrincipal?.identitas?.nip || "-";

      // 3. Fetch KCD (Pegawai with jabatan === 3) and find their Cadisdik Instansi name
      const pegawaiRes = await dapodikService.getPegawai().catch(() => ({ data: [] }));
      const pegawaiList = pegawaiRes.data || [];
      
      const matchedKcd = pegawaiList.find((p: any) => 
        Number(p.jabatan) === 3 && 
        (school.cadisdik_id ? p.cadisdik_id === school.cadisdik_id : true)
      ) || pegawaiList.find((p: any) => Number(p.jabatan) === 3);

      const kcdName = matchedKcd?.nama_lengkap || "Dr. Nonong Winarni, S.Pd., M.Pd.";
      const kcdNip = matchedKcd?.nip || "1970012210 199303 2 003";

      const cadisdikRes = await dapodikService.getCadisdik().catch(() => ({ data: [] }));
      const cadisdikList = cadisdikRes.data || [];
      const matchedCadisdik = cadisdikList.find((c: any) => 
        (matchedKcd && (c.id === matchedKcd.cadisdik_id || c.cadisdik_id === matchedKcd.cadisdik_id)) ||
        (school.cadisdik_id && (c.id === school.cadisdik_id || c.cadisdik_id === school.cadisdik_id))
      );

      let instansiKcdName = matchedCadisdik?.nama_instansi || "Cabang Dinas Pendidikan Wilayah VI";
      if (instansiKcdName.toLowerCase().startsWith("kepala ")) {
        instansiKcdName = instansiKcdName.substring(7);
      }

      // 4. Fetch Active Students (Page-by-page)
      const firstPagePd = await dapodikService.getPesertaDidik(100, "", 1, undefined, "aktif", undefined, schoolId);
      let activeStudents = [];
      let totalCount = 0;
      if (firstPagePd) {
        if (firstPagePd.status === "success" || firstPagePd.success === true) {
          activeStudents = firstPagePd.data || [];
          totalCount = firstPagePd.meta?.total_data || firstPagePd.meta?.total || firstPagePd.total || activeStudents.length;
        } else if (Array.isArray(firstPagePd)) {
          activeStudents = firstPagePd;
          totalCount = firstPagePd.length;
        } else if (firstPagePd.data && Array.isArray(firstPagePd.data)) {
          activeStudents = firstPagePd.data;
          totalCount = firstPagePd.meta?.total_data || firstPagePd.total || activeStudents.length;
        }
      }
      const totalPagesPd = Math.ceil(totalCount / 100);

      if (totalPagesPd > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPagesPd; p++) {
          pagePromises.push(dapodikService.getPesertaDidik(100, "", p, undefined, "aktif", undefined, schoolId));
        }
        const otherPages = await Promise.all(pagePromises);
        otherPages.forEach((pageRes) => {
          let pageData = [];
          if (pageRes) {
            if (pageRes.status === "success" || pageRes.success === true) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
          }
          activeStudents = [...activeStudents, ...pageData];
        });
      }

      // 5. Fetch Inactive Students (Page-by-page)
      const firstPagePdKeluar = await dapodikService.getPesertaDidik(100, "", 1, undefined, "non-aktif", undefined, schoolId);
      let inactiveStudents = [];
      let totalCountKeluar = 0;
      if (firstPagePdKeluar) {
        if (firstPagePdKeluar.status === "success" || firstPagePdKeluar.success === true) {
          inactiveStudents = firstPagePdKeluar.data || [];
          totalCountKeluar = firstPagePdKeluar.meta?.total_data || firstPagePdKeluar.meta?.total || firstPagePdKeluar.total || inactiveStudents.length;
        } else if (Array.isArray(firstPagePdKeluar)) {
          inactiveStudents = firstPagePdKeluar;
          totalCountKeluar = firstPagePdKeluar.length;
        } else if (firstPagePdKeluar.data && Array.isArray(firstPagePdKeluar.data)) {
          inactiveStudents = firstPagePdKeluar.data;
          totalCountKeluar = firstPagePdKeluar.meta?.total_data || firstPagePdKeluar.total || inactiveStudents.length;
        }
      }
      const totalPagesPdKeluar = Math.ceil(totalCountKeluar / 100);

      if (totalPagesPdKeluar > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPagesPdKeluar; p++) {
          pagePromises.push(dapodikService.getPesertaDidik(100, "", p, undefined, "non-aktif", undefined, schoolId));
        }
        const otherPages = await Promise.all(pagePromises);
        otherPages.forEach((pageRes) => {
          let pageData = [];
          if (pageRes) {
            if (pageRes.status === "success" || pageRes.success === true) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
          }
          inactiveStudents = [...inactiveStudents, ...pageData];
        });
      }

      // 6. Fetch active Tahun Pelajaran to determine school year dates and cut-off year dynamically
      const tpRes = await dapodikService.getTahunPelajaran().catch(() => ({ data: [] }));
      const tpList = tpRes.data || [];
      const activeTp = tpList.find((t: any) => t.status === "Aktif") || tpList[0];
      
      let cutOffYear = new Date().getFullYear() - 1;
      if (activeTp && activeTp.tahun_pelajaran) {
        const match = activeTp.tahun_pelajaran.match(/^(\d{4})/);
        if (match && match[1]) {
          cutOffYear = parseInt(match[1]);
        }
      }
      const cutOffText = `31 Agustus ${cutOffYear}`;

      // Determine school year date range (July 1st of cutOffYear to July 1st of next year)
      const startOfSchoolYear = new Date(cutOffYear, 6, 1);
      const endOfSchoolYear = new Date(cutOffYear + 1, 6, 1);

      // 7. Aggregate calculations per Tingkat X, XI, XII
      const rombelSets: Record<string, Set<string>> = { X: new Set(), XI: new Set(), XII: new Set() };
      const counts = {
        rombel: { X: 0, XI: 0, XII: 0, Total: 0 },
        active: { X: 0, XI: 0, XII: 0, Total: 0 },
        keluar: { X: 0, XI: 0, XII: 0, Total: 0 },
        masuk: { X: 0, XI: 0, XII: 0, Total: 0 },
        baseline: { X: 0, XI: 0, XII: 0, Total: 0 },
      };

      // Aggregate Active Students (JUMLAH row, rombels, and masuk counts)
      activeStudents.forEach((student: any) => {
        const tingkatRaw = String(student.akademik?.tingkat || "").toUpperCase();
        let k = "";
        if (tingkatRaw.includes("10") || tingkatRaw === "X") k = "X";
        else if (tingkatRaw.includes("11") || tingkatRaw === "XI") k = "XI";
        else if (tingkatRaw.includes("12") || tingkatRaw === "XII") k = "XII";
        else return; // Ignore other grades if any

        counts.active[k]++;
        counts.active.Total++;

        // Add rombel unique ID or name to set
        const rombelVal = student.akademik?.rombongan_belajar_id || student.akademik?.nama_rombel;
        if (rombelVal) {
          rombelSets[k].add(rombelVal);
        }

        // Check if transfer student (masuk) who entered within the active school year
        const pendaftaranId = student.identitas?.jenis_pendaftaran_id ?? student.jenis_pendaftaran_id ?? student.akademik?.jenis_pendaftaran_id;
        const pendaftaranIdStr = student.identitas?.jenis_pendaftaran_id_str ?? student.jenis_pendaftaran_id_str ?? student.akademik?.jenis_pendaftaran_id_str;
        const isTransfer = 
          pendaftaranId === 2 || 
          String(pendaftaranId) === "2" || 
          String(pendaftaranIdStr).toLowerCase().includes("pindahan") || 
          String(pendaftaranIdStr).toLowerCase().includes("masuk") || 
          String(pendaftaranIdStr).toLowerCase().includes("transfer");
        if (isTransfer) {
          const entryTime = student.created_at || student.identitas?.created_at;
          if (entryTime) {
            const entryDate = new Date(entryTime);
            if (entryDate >= startOfSchoolYear && entryDate < endOfSchoolYear) {
              counts.masuk[k]++;
              counts.masuk.Total++;
            }
          } else {
            counts.masuk[k]++;
            counts.masuk.Total++;
          }
        }
      });

      // Calculate Rombel counts
      counts.rombel.X = rombelSets.X.size;
      counts.rombel.XI = rombelSets.XI.size;
      counts.rombel.XII = rombelSets.XII.size;
      counts.rombel.Total = counts.rombel.X + counts.rombel.XI + counts.rombel.XII;

      // Aggregate Inactive Students (Keluar) who left within the active school year
      inactiveStudents.forEach((student: any) => {
        const tingkatRaw = String(student.akademik?.tingkat || "").toUpperCase();
        let k = "";
        if (tingkatRaw.includes("10") || tingkatRaw === "X") k = "X";
        else if (tingkatRaw.includes("11") || tingkatRaw === "XI") k = "XI";
        else if (tingkatRaw.includes("12") || tingkatRaw === "XII") k = "XII";
        else return;

        const exitTime = student.updated_at || student.identitas?.updated_at;
        if (exitTime) {
          const exitDate = new Date(exitTime);
          if (exitDate >= startOfSchoolYear && exitDate < endOfSchoolYear) {
            counts.keluar[k]++;
            counts.keluar.Total++;
          }
        } else {
          counts.keluar[k]++;
          counts.keluar.Total++;
        }
      });

      // Calculate Baseline ("Jumlah Peserta Didik" row)
      // baseline = active + keluar - masuk
      ["X", "XI", "XII", "Total"].forEach((k) => {
        counts.baseline[k] = counts.active[k] + counts.keluar[k] - counts.masuk[k];
      });

      // 8. Get spelled out printing date
      const printDate = new Date();
      const dayName = DAYS_INDO[printDate.getDay()];
      const daySpelled = terbilangAngka(printDate.getDate());
      const monthName = MONTHS_INDO[printDate.getMonth()];
      const yearSpelled = terbilangAngka(printDate.getFullYear());

      const spelledDateText = `Pada hari ini ${dayName} tanggal ${daySpelled} bulan ${monthName} tahun ${yearSpelled}, yang bertanda tangan di bawah ini :`;

      // Set state to trigger render
      setPrintData({
        school,
        pengawasName,
        pengawasNip,
        principalName,
        principalNip,
        kcdName,
        kcdNip,
        instansiKcdName,
        spelledDateText,
        cutOffText,
        counts,
        activeStudents,
        activeTp
      });

      Swal.close();

      // Trigger print after state update is applied
      setTimeout(() => {
        window.print();
      }, 500);

    } catch (err) {
      console.error("Gagal menarik data cetak:", err);
      Swal.close();
      Swal.fire("Error", "Gagal mengumpulkan data pendukung untuk cetak.", "error");
    }
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
                              startIcon={<PrinterIcon className="size-4" />}
                              onClick={() => handlePrint(school)}
                            >
                              Cetak
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

      {/* Official Print Layout (Only visible during print) */}
      {printData && (
        <div className="print-only w-full text-black font-serif my-2">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 15mm 10mm 15mm;
              }
              
              body {
                background-color: #ffffff !important;
                color: #000000 !important;
                font-family: "Times New Roman", Times, serif !important;
                font-size: 10.5pt !important;
                line-height: 1.3 !important;
              }

              .no-print {
                display: none !important;
              }

              .print-only {
                display: block !important;
              }

              .print-page-break-before {
                page-break-before: always !important;
                break-before: page !important;
              }

              table.print-report-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 8px !important;
                margin-bottom: 8px !important;
                font-size: 10pt !important;
              }

              table.print-report-table th, table.print-report-table td {
                border: 1px solid #000000 !important;
                padding: 4px 6px !important;
                text-align: left;
                color: #000000 !important;
              }

              table.print-report-table th {
                font-weight: bold !important;
                text-align: center !important;
                background-color: transparent !important;
              }

              table.print-report-table td.center {
                text-align: center !important;
              }

              table.student-list-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 6px !important;
                font-size: 9.5pt !important;
              }

              table.student-list-table th, table.student-list-table td {
                border: 1px solid #000000 !important;
                padding: 3px 5px !important;
              }

              table.student-list-table th {
                font-weight: bold !important;
                text-align: center !important;
              }
            }
          `}} />

          {/* Document Header (Kop & Title) */}
          <div className="text-center mb-3">
            <h2 className="text-[12.5pt] font-bold uppercase tracking-wide leading-snug">BERITA ACARA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">VERIFIKASI DAN VALIDASI DATA FAKTUAL SISWA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">JENJANG SMK NEGERI DAN SWASTA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">DILINGKUNGAN DINAS PENDIDIKAN PROVINSI JAWA BARAT</h2>
            <div className="w-full border-b-[2.5px] border-double border-black mt-1.5 mb-2"></div>
          </div>

          {/* Opening Paragraph */}
          <p className="mb-2 text-justify">
            {printData.spelledDateText}
          </p>

          {/* Pihak Pertama (Pengawas) */}
          <div className="mb-2 pl-4 space-y-0.5">
            <div className="flex">
              <span className="w-24">Nama</span>
              <span>: <span className="font-bold">{printData.pengawasName}</span></span>
            </div>
            <div className="flex">
              <span className="w-24">NIP</span>
              <span>: {printData.pengawasNip}</span>
            </div>
            <div className="flex">
              <span className="w-24">Jabatan</span>
              <span>: Pengawas Tingkat/IV.a</span>
            </div>
            <p className="mt-0.5 font-semibold">Selanjutnya disebut PIHAK PERTAMA</p>
          </div>

          {/* Pihak Kedua (Kepala Sekolah) */}
          <div className="mb-2 pl-4 space-y-0.5">
            <div className="flex">
              <span className="w-24">Nama</span>
              <span>: <span className="font-bold">{printData.principalName}</span></span>
            </div>
            <div className="flex">
              <span className="w-24">NIP</span>
              <span>: {printData.principalNip === "-" ? "-" : printData.principalNip}</span>
            </div>
            <div className="flex">
              <span className="w-24">Jabatan</span>
              <span>: Kepala {printData.school.nama}</span>
            </div>
            <p className="mt-0.5 font-semibold">Selanjutnya disebut PIHAK KEDUA</p>
          </div>

          {/* Main Statement */}
          <p className="mb-2 text-justify">
            PIHAK PERTAMA telah melakukan Verifikasi dan Validasi Data Faktual Siswa terhadap PIHAK KEDUA. Berdasarkan data <strong>Cut-Off {printData.cutOffText}</strong> dan hasil Verifikasi dan Validasi Data Faktual Siswa didapatkan data rombel and jumlah siswa sebagai berikut:
          </p>

          {/* Rombel & Student Breakdown Table */}
          <table className="print-report-table">
            <thead>
              <tr>
                <th rowSpan={2} className="w-12 text-center">No</th>
                <th rowSpan={2} className="text-center">Uraian</th>
                <th colSpan={3} className="text-center">VERIFIKASI DAN VALIDASI DATA FAKTUAL SISWA<br />(KELAS)</th>
                <th rowSpan={2} className="w-24 text-center">TOTAL</th>
              </tr>
              <tr>
                <th className="w-16 text-center">X</th>
                <th className="w-16 text-center">XI</th>
                <th className="w-16 text-center">XII</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">1</td>
                <td>Jumlah Rombel</td>
                <td className="center">{printData.counts.rombel.X}</td>
                <td className="center">{printData.counts.rombel.XI}</td>
                <td className="center">{printData.counts.rombel.XII}</td>
                <td className="center font-semibold">{printData.counts.rombel.Total}</td>
              </tr>
              <tr>
                <td className="center">2</td>
                <td>Jumlah Peserta Didik</td>
                <td className="center">{printData.counts.baseline.X}</td>
                <td className="center">{printData.counts.baseline.XI}</td>
                <td className="center">{printData.counts.baseline.XII}</td>
                <td className="center font-semibold">{printData.counts.baseline.Total}</td>
              </tr>
              <tr>
                <td className="center">3</td>
                <td>Jumlah Peserta didik keluar</td>
                <td className="center">{printData.counts.keluar.X}</td>
                <td className="center">{printData.counts.keluar.XI}</td>
                <td className="center">{printData.counts.keluar.XII}</td>
                <td className="center font-semibold">{printData.counts.keluar.Total}</td>
              </tr>
              <tr>
                <td className="center">4</td>
                <td>Jumlah peserta didik masuk</td>
                <td className="center">{printData.counts.masuk.X}</td>
                <td className="center">{printData.counts.masuk.XI}</td>
                <td className="center">{printData.counts.masuk.XII}</td>
                <td className="center font-semibold">{printData.counts.masuk.Total}</td>
              </tr>
              <tr className="font-bold">
                <td className="center"></td>
                <td>JUMLAH (2 - 3 + 4)</td>
                <td className="center">{printData.counts.active.X}</td>
                <td className="center">{printData.counts.active.XI}</td>
                <td className="center">{printData.counts.active.XII}</td>
                <td className="center">{printData.counts.active.Total}</td>
              </tr>
            </tbody>
          </table>

          {/* Closing Paragraph */}
          <p className="mb-2 text-justify">
            Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
          </p>

          {/* Signature Block */}
          <div className="mt-3 space-y-2.5 page-break-inside-avoid">
            {/* First Row Signatures (Pihak Pertama & Pihak Kedua) */}
            <div className="flex justify-between text-center text-[10pt]">
              <div className="w-72">
                <p className="font-semibold">PIHAK PERTAMA</p>
                <p>Pengawas,</p>
                <div className="h-18"></div>
                <p className="font-bold underline">{printData.pengawasName}</p>
                <p>NIP. {printData.pengawasNip}</p>
              </div>

              <div className="w-72">
                <p className="font-semibold">PIHAK KEDUA</p>
                <p>Kepala Sekolah,</p>
                <div className="h-18"></div>
                <p className="font-bold underline">{printData.principalName}</p>
                <p>NIP. {printData.principalNip === "-" ? "-" : printData.principalNip}</p>
              </div>
            </div>

            {/* Second Row Signature (KCD Centered Bottom) */}
            <div className="flex justify-center text-center text-[10pt] pt-1">
              <div className="w-96">
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala {printData.instansiKcdName}</p>
                <p className="font-semibold">Dinas Pendidikan Provinsi Jawa Barat</p>
                <div className="h-18"></div>
                <p className="font-bold underline">{printData.kcdName}</p>
                <p>NIP. {printData.kcdNip}</p>
              </div>
            </div>
          </div>

          {/* Student Lists grouped by Rombel */}
          {(() => {
            const grouped: Record<string, any[]> = {};
            (printData.activeStudents || []).forEach((student: any) => {
              const rombelName = student.akademik?.nama_rombel || "Tanpa Rombel";
              if (!grouped[rombelName]) {
                grouped[rombelName] = [];
              }
              grouped[rombelName].push(student);
            });

            const rombels = Object.keys(grouped).sort();
            
            // Extract cut-off year to fall back for school year label
            let tpYearFallback = "-";
            if (printData.cutOffText) {
              const match = printData.cutOffText.match(/(\d{4})/);
              if (match && match[1]) {
                const year = parseInt(match[1]);
                tpYearFallback = `${year}/${year + 1}`;
              }
            }

            return rombels.map((rombelName) => {
              const students = grouped[rombelName];
              return (
                <div key={rombelName} className="print-page-break-before">
                  {/* Document Header (Lampiran) */}
                  <div className="text-center mb-3">
                    <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-tight">DAFTAR PESERTA DIDIK</h2>
                    <h3 className="text-[11pt] font-bold uppercase tracking-wide leading-tight">{printData.school.nama}</h3>
                    <p className="text-[9.5pt] font-semibold mt-0.5">Tahun Pelajaran: {printData.activeTp?.tahun_pelajaran || tpYearFallback}</p>
                    <div className="w-full border-b border-black mt-1 mb-2"></div>
                  </div>

                  <div className="flex justify-between mb-2 text-[9.5pt] font-semibold px-1">
                    <div>Kelas: {rombelName}</div>
                    <div>Semester: {printData.activeTp?.semester || "1 (Ganjil)"}</div>
                  </div>

                  <table className="student-list-table">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">No</th>
                        <th>Nama</th>
                        <th className="w-12 text-center">JK</th>
                        <th className="w-32 text-center">NISN</th>
                        <th className="text-center">Kelas</th>
                        <th className="w-20 text-center">Ket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <tr key={student.identitas?.id || idx}>
                          <td className="text-center">{idx + 1}</td>
                          <td>{student.identitas?.nama || "-"}</td>
                          <td className="text-center">{student.identitas?.jenis_kelamin || "-"}</td>
                          <td className="text-center font-mono">{student.identitas?.nisn || "-"}</td>
                          <td className="text-center">{student.akademik?.nama_rombel || "-"}</td>
                          <td className="text-center"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            });
          })()}
        </div>
      )}
    </>
  );
}
