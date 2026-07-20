import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Input from "../../components/form/input/InputField";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { SearchIcon, PrinterIcon, ChevronLeftIcon } from "../../icons";
import { dapodikService } from "../../services/dapodikService";
import { mandalaService } from "../../services/mandalaService";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";

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

// Helper to format semester name dynamically
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

// Helper to check if a date falls within a specific school year based on semesterId (e.g. '20252')
// The school year starts on July 1 of baseYear and ends on August 31 of baseYear + 1 (the cut-off date)
function isDateInSchoolYear(dateInput: any, semesterId: string): boolean {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;

  // Extract baseYear from semesterId (e.g., '20252' -> 2025)
  const baseYear = parseInt(semesterId.substring(0, 4));

  const startDate = new Date(baseYear, 6, 1); // July 1, baseYear
  const endDate = new Date(baseYear + 1, 7, 31, 23, 59, 59); // August 31, baseYear + 1

  return date >= startDate && date <= endDate;
}

export default function SptjmDapodikDetailPage() {
  const { role, sekolahId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any | null>(null);
  const [activeTp, setActiveTp] = useState<any | null>(null);
  const [printData, setPrintData] = useState<any | null>(null);

  // Lists for display
  const [pdMasukList, setPdMasukList] = useState<any[]>([]);
  const [pdKeluarList, setPdKeluarList] = useState<any[]>([]);
  
  // Tab control & search
  const [activeTab, setActiveTab] = useState<"masuk" | "keluar">("masuk");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadDetails = async () => {
      if (!sekolahId) return;
      setLoading(true);
      try {
        // 1. Fetch School
        const schoolRes = await dapodikService.getSekolah().catch(() => ({ data: [] }));
        const schoolList = schoolRes.data || [];
        const matchedSchool = schoolList.find((s: any) => (s.sekolah_id || s.id) === sekolahId);
        if (!matchedSchool) {
          Swal.fire("Error", "Satuan Pendidikan tidak ditemukan.", "error");
          navigate(`/${role || "admin"}/analisa/sptjm-dapodik`);
          return;
        }
        setSchool(matchedSchool);

        // 2. Fetch active semester directly from the semester_id API
        const semRes = await dapodikService.getSemesterAktif().catch(() => null);
        const semestersData = semRes?.data || semRes;
        const activeSem = Array.isArray(semestersData) ? semestersData[0] : (semestersData || {});
        
        const matchedTp = {
          semester_id: activeSem.semester_id || "20252",
          tahun_pelajaran: activeSem.tahun_ajaran || activeSem.tahun_pelajaran || "2025/2026",
          semester: activeSem.semester || "Genap",
          status: "Aktif"
        };
        setActiveTp(matchedTp);

        let cutOffYear = new Date().getFullYear() - 1;
        if (matchedTp && matchedTp.tahun_pelajaran) {
          const match = matchedTp.tahun_pelajaran.match(/^(\d{4})/);
          if (match && match[1]) {
            cutOffYear = parseInt(match[1]);
          }
        }
        const cutOffText = `31 Agustus ${cutOffYear}`;

        const startOfSchoolYear = new Date(cutOffYear, 6, 1);
        const endOfSchoolYear = new Date(cutOffYear + 1, 6, 1);

        // 3. Fetch Mapping Pengawas
        const mappingRes = await mandalaService.getMappingPengawas().catch(() => ({ data: [] }));
        const mappings = mappingRes.data || [];
        const matchedMapping = mappings.find((m: any) => m.sekolah_id === sekolahId);
        const pengawasName = matchedMapping?.pegawai?.nama_lengkap || "-";
        const pengawasNip = matchedMapping?.pegawai?.nip || "-";

        // 4. Fetch Kepala Sekolah (GTK)
        const gtkRes = await dapodikService.getGTK(100, "", 1, undefined, "aktif", sekolahId).catch(() => ({ data: [] }));
        const gtkList = gtkRes.data || [];
        const matchedPrincipal = gtkList.find((g: any) =>
          g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
          g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
        );
        const principalName = matchedPrincipal?.identitas?.nama || "-";
        const principalNip = matchedPrincipal?.identitas?.nip || "-";

        // 5. Fetch KCD (Pegawai with jabatan === 3)
        const pegawaiRes = await dapodikService.getPegawai().catch(() => ({ data: [] }));
        const pegawaiList = pegawaiRes.data || [];
        const matchedKcd = pegawaiList.find((p: any) => 
          Number(p.jabatan) === 3 && 
          (matchedSchool.cadisdik_id ? p.cadisdik_id === matchedSchool.cadisdik_id : true)
        ) || pegawaiList.find((p: any) => Number(p.jabatan) === 3);
        const kcdName = matchedKcd?.nama_lengkap || "-";
        const kcdNip = matchedKcd?.nip || "-";

        // Fetch Cadisdik instansi
        const cadisdikRes = await dapodikService.getCadisdik().catch(() => ({ data: [] }));
        const cadisdikList = cadisdikRes.data || [];
        const matchedCadisdik = cadisdikList.find((c: any) => 
          (matchedKcd && (c.id === matchedKcd.cadisdik_id || c.cadisdik_id === matchedKcd.cadisdik_id)) ||
          (matchedSchool.cadisdik_id && (c.id === matchedSchool.cadisdik_id || c.cadisdik_id === matchedSchool.cadisdik_id))
        );
        let instansiKcdName = matchedCadisdik?.nama_instansi || "Cabang Dinas Pendidikan Wilayah VI";
        if (instansiKcdName.toLowerCase().startsWith("kepala ")) {
          instansiKcdName = instansiKcdName.substring(7);
        }

        const matchedLoginCadisdik = cadisdikList.find((c: any) => 
          user?.cadisdik_id && (c.id === user.cadisdik_id || c.cadisdik_id === user.cadisdik_id)
        ) || matchedCadisdik;
        let instansiLoginName = matchedLoginCadisdik?.nama_instansi || instansiKcdName;
        if (instansiLoginName.toLowerCase().startsWith("kepala ")) {
          instansiLoginName = instansiLoginName.substring(7);
        }

        // 6. Fetch Active Students
        const firstPagePd = await dapodikService.getPesertaDidik(100, "", 1, undefined, "aktif", undefined, sekolahId, undefined);
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
            pagePromises.push(dapodikService.getPesertaDidik(100, "", p, undefined, "aktif", undefined, sekolahId, undefined));
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

        // 7. Fetch Inactive Students
        const firstPagePdKeluar = await dapodikService.getPesertaDidik(100, "", 1, undefined, "non-aktif", undefined, sekolahId, undefined);
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
            pagePromises.push(dapodikService.getPesertaDidik(100, "", p, undefined, "non-aktif", undefined, sekolahId, undefined));
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

        // 8. Calculations & Filter Lists
        // Debug: Log all inactive students to help trace filtering
        console.log(`[SPTJM Debug] Total inactive students fetched: ${inactiveStudents.length}`);
        console.log(`[SPTJM Debug] Active semester_id: ${matchedTp?.semester_id}`);
        const activeBaseYear = matchedTp?.semester_id ? String(matchedTp.semester_id).substring(0, 4) : "";

        // Debug: Dump raw data of first 5 inactive students
        inactiveStudents.slice(0, 5).forEach((s: any, i: number) => {
          console.log(`[SPTJM Raw Inactive #${i}]`, JSON.stringify({
            nama: s.identitas?.nama,
            jenis_keluar_id: s.identitas?.jenis_keluar_id,
            jenis_keluar_id_str: s.identitas?.jenis_keluar_id_str,
            tanggal_keluar_identitas: s.identitas?.tanggal_keluar,
            tanggal_keluar_root: s.tanggal_keluar,
            tanggal_keluar_akademik: s.akademik?.tanggal_keluar,
            tanggal_meninggalkan_sekolah: s.identitas?.tanggal_meninggalkan_sekolah,
            last_update_identitas: s.identitas?.last_update,
            updated_at_root: s.updated_at,
            semester_id_akademik: s.akademik?.semester_id,
            semester_id_root: s.semester_id,
            semester_id_identitas: s.identitas?.semester_id,
            root_keys: Object.keys(s),
            identitas_keys: s.identitas ? Object.keys(s.identitas) : [],
            akademik_keys: s.akademik ? Object.keys(s.akademik) : [],
          }, null, 2));
        });

        // Exits list: inactive, within active school year, NOT graduated
        const filteredExits = inactiveStudents.filter((student: any) => {
          const nama = student.identitas?.nama || "-";
          const jenisKeluarId = student.akademik?.jenis_keluar_id ?? student.jenis_keluar_id ?? student.identitas?.jenis_keluar_id;
          const jenisKeluarIdStr = student.akademik?.jenis_keluar_id_str ?? student.jenis_keluar_id_str ?? student.identitas?.jenis_keluar_id_str;
          
          // Only exclude if jenis_keluar_id is EXPLICITLY "1" (Lulus)
          // If jenis_keluar_id is undefined/null/empty, do NOT treat as Lulus
          const hasExplicitKeluarId = jenisKeluarId !== undefined && jenisKeluarId !== null && String(jenisKeluarId).trim() !== "";
          const isLulus = hasExplicitKeluarId && (
            jenisKeluarId === 1 || 
            String(jenisKeluarId) === "1" || 
            String(jenisKeluarIdStr).toLowerCase().includes("lulus")
          );

          if (isLulus) {
            console.log(`[SPTJM Keluar ✗] ${nama} - excluded: Lulus (jenis_keluar_id=${jenisKeluarId})`);
            return false;
          }

          // Try ALL possible exit date fields
          const exitDateStr = 
            student.akademik?.tanggal_keluar ?? 
            student.tanggal_keluar ?? 
            student.identitas?.tanggal_keluar ?? 
            student.akademik?.tanggal_meninggalkan_sekolah ?? 
            student.tanggal_meninggalkan_sekolah ?? 
            student.identitas?.tanggal_meninggalkan_sekolah;

          // If exit date exists, it MUST be within the school year. No fallback.
          if (exitDateStr) {
            if (matchedTp?.semester_id && isDateInSchoolYear(exitDateStr, matchedTp.semester_id)) {
              console.log(`[SPTJM Keluar ✓] ${nama} - matched by tanggal_keluar: ${exitDateStr}`);
              return true;
            } else {
              console.log(`[SPTJM Keluar ✗] ${nama} - excluded: tanggal_keluar ${exitDateStr} is outside active school year`);
              return false;
            }
          }

          // Fallback 1: Check semester_id match (same school year) - only if no exit date is recorded
          const studentSemesterId = student.akademik?.semester_id ?? student.semester_id ?? student.identitas?.semester_id;
          if (studentSemesterId && activeBaseYear) {
            const studentBaseYear = String(studentSemesterId).substring(0, 4);
            if (studentBaseYear === activeBaseYear) {
              console.log(`[SPTJM Keluar ✓] ${nama} - matched by semester_id: ${studentSemesterId}`);
              return true;
            }
          }

          // Fallback 2: Check last_update / updated_at as proxy for recent exit - only if no exit date is recorded
          const lastUpdateStr = 
            student.updated_at ?? 
            student.identitas?.last_update ?? 
            student.identitas?.updated_at ?? 
            student.last_update;
          if (lastUpdateStr && matchedTp?.semester_id && isDateInSchoolYear(lastUpdateStr, matchedTp.semester_id)) {
            console.log(`[SPTJM Keluar ✓] ${nama} - matched by last_update: ${lastUpdateStr}, jenis_keluar: ${jenisKeluarId ?? "N/A"}`);
            return true;
          }

          // Log why this student was rejected
          console.log(`[SPTJM Keluar ✗] ${nama} - NOT matched. exitDate=${exitDateStr || "none"}, semesterId=${studentSemesterId || "none"}, lastUpdate=${lastUpdateStr || "none"}, jenisKeluarId=${jenisKeluarId || "none"}`);
          return false;
        });

        console.log(`[SPTJM Debug] Filtered exits (keluar): ${filteredExits.length}`);

        // Debug: Log active students info
        console.log(`[SPTJM Debug] Total active students fetched: ${activeStudents.length}`);
        activeStudents.slice(0, 3).forEach((s: any, i: number) => {
          console.log(`[SPTJM Raw Active #${i}]`, JSON.stringify({
            nama: s.identitas?.nama,
            jenis_pendaftaran_id_str: s.identitas?.jenis_pendaftaran_id_str,
            jenis_pendaftaran_id: s.identitas?.jenis_pendaftaran_id,
            tanggal_masuk_sekolah: s.identitas?.tanggal_masuk_sekolah,
            tanggal_masuk_root: s.tanggal_masuk,
            tanggal_masuk_akademik: s.akademik?.tanggal_masuk,
            semester_id_akademik: s.akademik?.semester_id,
            semester_id_root: s.semester_id,
            created_at: s.created_at,
            updated_at: s.updated_at,
            last_update: s.identitas?.last_update,
            root_keys: Object.keys(s),
          }, null, 2));
        });

        // Count jenis_pendaftaran_id_str distribution among active students
        const pendaftaranDistribution: Record<string, number> = {};
        activeStudents.forEach((s: any) => {
          const val = String(s.identitas?.jenis_pendaftaran_id_str ?? s.jenis_pendaftaran_id_str ?? s.identitas?.jenis_pendaftaran_id ?? "").trim();
          pendaftaranDistribution[val] = (pendaftaranDistribution[val] || 0) + 1;
        });
        console.log(`[SPTJM Debug] jenis_pendaftaran_id_str distribution:`, pendaftaranDistribution);
        const filteredEntries = activeStudents.filter((student: any) => {
          const nama = student.identitas?.nama || "-";
          const pendaftaranVal = String(
            student.identitas?.jenis_pendaftaran_id_str ?? 
            student.jenis_pendaftaran_id_str ?? 
            student.akademik?.jenis_pendaftaran_id_str ?? 
            student.identitas?.jenis_pendaftaran_id ?? 
            student.jenis_pendaftaran_id ?? 
            student.akademik?.jenis_pendaftaran_id ?? 
            ""
          ).trim();

          const isPindahan = 
            pendaftaranVal === "2" || 
            pendaftaranVal.toLowerCase().includes("pindahan") || 
            pendaftaranVal.toLowerCase().includes("transfer");

          if (!isPindahan) return false;

          // Try ALL possible entry date fields
          const entryDateStr = 
            student.akademik?.tanggal_masuk ?? 
            student.tanggal_masuk ?? 
            student.identitas?.tanggal_masuk ?? 
            student.akademik?.tanggal_masuk_sekolah ?? 
            student.tanggal_masuk_sekolah ?? 
            student.identitas?.tanggal_masuk_sekolah;

          // If entry date exists, it MUST be within the school year. No fallback.
          if (entryDateStr) {
            if (matchedTp?.semester_id && isDateInSchoolYear(entryDateStr, matchedTp.semester_id)) {
              console.log(`[SPTJM Masuk ✓] ${nama} - matched by tanggal_masuk: ${entryDateStr}`);
              return true;
            } else {
              console.log(`[SPTJM Masuk ✗] ${nama} - excluded: tanggal_masuk ${entryDateStr} is outside active school year`);
              return false;
            }
          }

          return false;
        });

        console.log(`[SPTJM Debug] Filtered entries (masuk): ${filteredEntries.length}`);

        setPdMasukList(filteredEntries);
        setPdKeluarList(filteredExits);

        // Aggregate statistics for SPTJM layout
        const rombelSets: Record<string, Set<string>> = { X: new Set(), XI: new Set(), XII: new Set() };
        const counts = {
          rombel: { X: 0, XI: 0, XII: 0, Total: 0 },
          active: { X: 0, XI: 0, XII: 0, Total: 0 },
          keluar: { X: 0, XI: 0, XII: 0, Total: 0 },
          masuk: { X: 0, XI: 0, XII: 0, Total: 0 },
          baseline: { X: 0, XI: 0, XII: 0, Total: 0 },
        };

        activeStudents.forEach((student: any) => {
          const tingkatRaw = String(student.akademik?.tingkat || "").toUpperCase();
          let k = "";
          if (tingkatRaw.includes("10") || tingkatRaw === "X") k = "X";
          else if (tingkatRaw.includes("11") || tingkatRaw === "XI") k = "XI";
          else if (tingkatRaw.includes("12") || tingkatRaw === "XII") k = "XII";
          else return;

          counts.active[k]++;
          counts.active.Total++;

          const rombelVal = student.akademik?.rombongan_belajar_id || student.akademik?.nama_rombel;
          if (rombelVal) {
            rombelSets[k].add(rombelVal);
          }
        });

        filteredEntries.forEach((student: any) => {
          const tingkatRaw = String(student.akademik?.tingkat || "").toUpperCase();
          let k = "";
          if (tingkatRaw.includes("10") || tingkatRaw === "X") k = "X";
          else if (tingkatRaw.includes("11") || tingkatRaw === "XI") k = "XI";
          else if (tingkatRaw.includes("12") || tingkatRaw === "XII") k = "XII";
          else return;
          counts.masuk[k]++;
          counts.masuk.Total++;
        });

        filteredExits.forEach((student: any) => {
          const tingkatRaw = String(student.akademik?.tingkat || "").toUpperCase();
          let k = "";
          if (tingkatRaw.includes("10") || tingkatRaw === "X") k = "X";
          else if (tingkatRaw.includes("11") || tingkatRaw === "XI") k = "XI";
          else if (tingkatRaw.includes("12") || tingkatRaw === "XII") k = "XII";
          else return;
          counts.keluar[k]++;
          counts.keluar.Total++;
        });

        counts.rombel.X = rombelSets.X.size;
        counts.rombel.XI = rombelSets.XI.size;
        counts.rombel.XII = rombelSets.XII.size;
        counts.rombel.Total = counts.rombel.X + counts.rombel.XI + counts.rombel.XII;

        ["X", "XI", "XII", "Total"].forEach((k) => {
          counts.baseline[k] = counts.active[k] + counts.keluar[k] - counts.masuk[k];
        });

        const now = new Date();
        const dayName = DAYS_INDO[now.getDay()];
        const daySpelled = terbilangAngka(now.getDate());
        const monthName = MONTHS_INDO[now.getMonth()];
        const yearSpelled = terbilangAngka(now.getFullYear());
        const spelledDateText = `Pada hari ini ${dayName} tanggal ${daySpelled} bulan ${monthName} tahun ${yearSpelled}, yang bertanda tangan di bawah ini :`;

        setPrintData({
          school: matchedSchool,
          pengawasName,
          pengawasNip,
          principalName,
          principalNip,
          kcdName,
          kcdNip,
          instansiKcdName,
          instansiLoginName,
          spelledDateText,
          cutOffText,
          counts,
          activeStudents,
          activeTp: matchedTp,
          pdMasukList: filteredEntries,
          pdKeluarList: filteredExits
        });

      } catch (err) {
        console.error("Gagal menarik data rincian SPTJM:", err);
        Swal.fire("Error", "Gagal memuat rincian data satuan pendidikan.", "error");
        navigate(`/${role || "admin"}/analisa/sptjm-dapodik`);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [sekolahId]);

  // Client-side search filters
  const filteredPdMasuk = useMemo(() => {
    if (!searchQuery) return pdMasukList;
    const q = searchQuery.toLowerCase();
    return pdMasukList.filter(
      (s) =>
        (s.identitas?.nama || "").toLowerCase().includes(q) ||
        (s.identitas?.nisn || "").includes(q) ||
        (s.akademik?.nama_rombel || "").toLowerCase().includes(q)
    );
  }, [pdMasukList, searchQuery]);

  const filteredPdKeluar = useMemo(() => {
    if (!searchQuery) return pdKeluarList;
    const q = searchQuery.toLowerCase();
    return pdKeluarList.filter(
      (s) =>
        (s.identitas?.nama || "").toLowerCase().includes(q) ||
        (s.identitas?.nisn || "").includes(q) ||
        (s.akademik?.nama_rombel || "").toLowerCase().includes(q)
    );
  }, [pdKeluarList, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memuat analisis data peserta didik...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Rincian SPTJM - ${school?.nama || "SIMAK"}`}
        description="Detail analisis data rombel, siswa masuk dan siswa keluar"
      />

      {/* Modern UI Section (Hidden in print) */}
      <div className="space-y-6 font-outfit no-print">
        {/* Breadcrumbs and Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <PageBreadcrumb pageTitle="Rincian SPTJM Satuan Pendidikan" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 mt-1">
              {school?.nama || "-"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              NPSN: {school?.npsn || "-"} | Wilayah: {school?.kecamatan || "-"}, {school?.kabupaten_kota || school?.kabupate_kota || "-"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/${role || "admin"}/analisa/sptjm-dapodik`)}
              startIcon={<ChevronLeftIcon className="size-4" />}
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              onClick={() => window.print()}
              startIcon={<PrinterIcon className="size-4" />}
            >
              Cetak SPTJM
            </Button>
          </div>
        </div>

        {/* Aggregate statistics row */}
        {printData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Rombongan Belajar</span>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 mt-1">{printData.counts.rombel.Total}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Siswa Awal (Baseline)</span>
              <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 mt-1">{printData.counts.baseline.Total}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Siswa Masuk</span>
              <h4 className="text-xl font-bold text-brand-500 mt-1">{printData.counts.masuk.Total}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Siswa Keluar</span>
              <h4 className="text-xl font-bold text-error-500 mt-1">{printData.counts.keluar.Total}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Siswa Aktif Akhir</span>
              <h4 className="text-xl font-bold text-success-500 mt-1">{printData.counts.active.Total}</h4>
            </div>
          </div>
        )}

        {/* Tab Controls and Search */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 dark:border-gray-800 pb-4 mb-6">
            <div className="flex space-x-6">
              <button
                onClick={() => {
                  setActiveTab("masuk");
                  setSearchQuery("");
                }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "masuk"
                    ? "border-brand-500 text-brand-500 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Siswa Masuk ({pdMasukList.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("keluar");
                  setSearchQuery("");
                }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "keluar"
                    ? "border-brand-500 text-brand-500 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Siswa Keluar ({pdKeluarList.length})
              </button>
            </div>
            
            <div className="relative max-w-xs w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-4" />
              </span>
              <Input
                type="text"
                placeholder="Cari nama, NISN, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tables */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              {activeTab === "masuk" ? (
                <Table className="min-w-[800px]">
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Lengkap</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-20">JK</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32">NISN</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-24">Tingkat</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Rombel/Kelas</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Tanggal Masuk</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Jenis Pendaftaran</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filteredPdMasuk.length > 0 ? (
                      filteredPdMasuk.map((student, idx) => {
                        let regName = student.identitas?.jenis_pendaftaran_id_str ?? student.jenis_pendaftaran_id_str ?? student.akademik?.jenis_pendaftaran_id_str;
                        if (!regName || regName === "2" || String(regName) === "2") {
                          regName = "Pindahan";
                        }
                        const entryDateVal = 
                          student.identitas?.tanggal_masuk_sekolah ?? 
                          student.akademik?.tanggal_masuk ?? 
                          student.tanggal_masuk ?? 
                          student.identitas?.tanggal_masuk ?? 
                          student.akademik?.tanggal_masuk_sekolah ?? 
                          student.tanggal_masuk_sekolah ?? 
                          student.identitas?.tanggal_masuk_sekolah ?? 
                          student.created_at;
                        return (
                          <TableRow key={student.identitas?.id || idx}>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{idx + 1}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm font-bold text-gray-800 dark:text-white/90">{student.identitas?.nama || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">{student.identitas?.jenis_kelamin || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.identitas?.nisn || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.akademik?.tingkat || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.akademik?.nama_rombel || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                              {entryDateVal ? new Date(entryDateVal).toLocaleDateString("id-ID") : "-"}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {regName}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          Tidak ada data rincian siswa masuk ditemukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table className="min-w-[800px]">
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Lengkap</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-20">JK</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32">NISN</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-24">Tingkat</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Rombel/Kelas</TableCell>
                      <TableCell isHeader className="px-5 py-3 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Tanggal Keluar</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filteredPdKeluar.length > 0 ? (
                      filteredPdKeluar.map((student, idx) => {
                        const exitDateVal = 
                          student.identitas?.tanggal_keluar ?? 
                          student.akademik?.tanggal_keluar ?? 
                          student.tanggal_keluar ?? 
                          student.akademik?.tanggal_meninggalkan_sekolah ?? 
                          student.tanggal_meninggalkan_sekolah ?? 
                          student.identitas?.tanggal_meninggalkan_sekolah ?? 
                          student.updated_at ?? 
                          student.identitas?.updated_at;
                        return (
                          <TableRow key={student.identitas?.id || idx}>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{idx + 1}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm font-bold text-gray-800 dark:text-white/90">{student.identitas?.nama || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">{student.identitas?.jenis_kelamin || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.identitas?.nisn || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.akademik?.tingkat || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{student.akademik?.nama_rombel || "-"}</TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                              {exitDateVal ? new Date(exitDateVal).toLocaleDateString("id-ID") : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          Tidak ada data rincian siswa keluar ditemukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
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

              table.student-list-table td.nowrap {
                white-space: nowrap !important;
              }
            }
          `}} />

          {/* Document Header (Kop & Title) */}
          <div className="text-center mb-3">
            <h2 className="text-[12.5pt] font-bold uppercase tracking-wide leading-snug">BERITA ACARA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">VERIFIKASI DAN VALIDASI DATA FAKTUAL SISWA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">JENJANG SMK NEGERI DAN SWASTA</h2>
            <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-snug">{printData.instansiLoginName.toUpperCase()}</h2>
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

          {/* Daftar Peserta Didik Masuk & Keluar */}
          {(() => {
            let tpYearFallback = "-";
            if (printData.cutOffText) {
              const match = printData.cutOffText.match(/(\d{4})/);
              if (match && match[1]) {
                const year = parseInt(match[1]);
                tpYearFallback = `${year}/${year + 1}`;
              }
            }

            return (
              <>
                {printData.pdMasukList && printData.pdMasukList.length > 0 && (
                  <div className="print-page-break-before">
                    <div className="text-center mb-3">
                      <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-tight">DAFTAR PESERTA DIDIK MASUK (MUTASI MASUK)</h2>
                      <h3 className="text-[11pt] font-bold uppercase tracking-wide leading-tight">{printData.school.nama}</h3>
                      <p className="text-[9.5pt] font-semibold mt-0.5">Tahun Pelajaran: {printData.activeTp?.tahun_pelajaran || tpYearFallback}</p>
                      <div className="w-full border-b border-black mt-1 mb-2"></div>
                    </div>

                    <div className="flex justify-between mb-2 text-[9.5pt] font-semibold px-1">
                      <div>Jenis Pendaftaran: Pindahan</div>
                      <div>Semester: {formatSemester(printData.activeTp)}</div>
                    </div>

                    <table className="student-list-table">
                      <thead>
                        <tr>
                          <th className="w-12 text-center" style={{ width: '5%' }}>No</th>
                          <th className="text-left" style={{ width: '40%' }}>Nama</th>
                          <th className="w-12 text-center" style={{ width: '5%' }}>JK</th>
                          <th className="w-32 text-center" style={{ width: '15%' }}>NISN</th>
                          <th className="text-center" style={{ width: '15%' }}>Kelas/Rombel</th>
                          <th className="w-32 text-center" style={{ width: '10%' }}>Tanggal Masuk</th>
                          <th className="w-32 text-center" style={{ width: '10%' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printData.pdMasukList.map((student: any, idx: number) => {
                          const entryDateVal = 
                            student.identitas?.tanggal_masuk_sekolah ?? 
                            student.akademik?.tanggal_masuk ?? 
                            student.tanggal_masuk ?? 
                            student.identitas?.tanggal_masuk ?? 
                            student.akademik?.tanggal_masuk_sekolah ?? 
                            student.tanggal_masuk_sekolah ?? 
                            student.identitas?.tanggal_masuk_sekolah ?? 
                            student.created_at;
                          return (
                            <tr key={student.identitas?.id || idx}>
                              <td className="text-center">{idx + 1}</td>
                              <td className="nowrap">{student.identitas?.nama || "-"}</td>
                              <td className="text-center">{student.identitas?.jenis_kelamin || "-"}</td>
                              <td className="text-center font-mono">{student.identitas?.nisn || "-"}</td>
                              <td className="text-center">{student.akademik?.nama_rombel || "-"}</td>
                              <td className="text-center">
                                {entryDateVal ? new Date(entryDateVal).toLocaleDateString("id-ID") : "-"}
                              </td>
                              <td className="text-center">Pindahan</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {printData.pdKeluarList && printData.pdKeluarList.length > 0 && (
                  <div className="print-page-break-before">
                    <div className="text-center mb-3">
                      <h2 className="text-[11.5pt] font-bold uppercase tracking-wide leading-tight">DAFTAR PESERTA DIDIK KELUAR (MUTASI KELUAR)</h2>
                      <h3 className="text-[11pt] font-bold uppercase tracking-wide leading-tight">{printData.school.nama}</h3>
                      <p className="text-[9.5pt] font-semibold mt-0.5">Tahun Pelajaran: {printData.activeTp?.tahun_pelajaran || tpYearFallback}</p>
                      <div className="w-full border-b border-black mt-1 mb-2"></div>
                    </div>

                    <div className="flex justify-between mb-2 text-[9.5pt] font-semibold px-1">
                      <div>Status: Non-Aktif</div>
                      <div>Semester: {formatSemester(printData.activeTp)}</div>
                    </div>

                    <table className="student-list-table">
                      <thead>
                        <tr>
                          <th className="w-12 text-center" style={{ width: '5%' }}>No</th>
                          <th className="text-left" style={{ width: '40%' }}>Nama</th>
                          <th className="w-12 text-center" style={{ width: '5%' }}>JK</th>
                          <th className="w-32 text-center" style={{ width: '15%' }}>NISN</th>
                          <th className="text-center" style={{ width: '15%' }}>Kelas/Rombel Terakhir</th>
                          <th className="w-32 text-center" style={{ width: '10%' }}>Tanggal Keluar</th>
                          <th className="w-32 text-center" style={{ width: '10%' }}>Alasan Keluar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printData.pdKeluarList.map((student: any, idx: number) => {
                          const exitDateVal = 
                            student.akademik?.tanggal_keluar ?? 
                            student.tanggal_keluar ?? 
                            student.identitas?.tanggal_keluar ?? 
                            student.akademik?.tanggal_meninggalkan_sekolah ?? 
                            student.tanggal_meninggalkan_sekolah ?? 
                            student.identitas?.tanggal_meninggalkan_sekolah;
                          const jenisKeluarId = student.akademik?.jenis_keluar_id ?? student.jenis_keluar_id ?? student.identitas?.jenis_keluar_id;
                          const mapping: Record<string, string> = {
                            "1": "Lulus",
                            "2": "Mutasi",
                            "3": "Dikeluarkan",
                            "4": "Mengundurkan diri",
                            "5": "Putus Sekolah",
                            "6": "Wafat",
                            "7": "Hilang",
                            "8": "Alih Fungsi",
                            "9": "Pensiun",
                            "Z": "Lainnya"
                          };
                          const alasan = mapping[String(jenisKeluarId)] || "Mutasi";
                          return (
                            <tr key={student.identitas?.id || idx}>
                              <td className="text-center">{idx + 1}</td>
                              <td className="nowrap">{student.identitas?.nama || "-"}</td>
                              <td className="text-center">{student.identitas?.jenis_kelamin || "-"}</td>
                              <td className="text-center font-mono">{student.identitas?.nisn || "-"}</td>
                              <td className="text-center">{student.akademik?.nama_rombel || "-"}</td>
                              <td className="text-center">
                                {exitDateVal ? new Date(exitDateVal).toLocaleDateString("id-ID") : "-"}
                              </td>
                              <td className="text-center">{alasan}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}

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
                    <div>Semester: {formatSemester(printData.activeTp)}</div>
                  </div>

                  <table className="student-list-table">
                    <thead>
                      <tr>
                        <th className="w-12 text-center" style={{ width: '5%' }}>No</th>
                        <th className="text-left" style={{ width: '55%' }}>Nama</th>
                        <th className="w-12 text-center" style={{ width: '5%' }}>JK</th>
                        <th className="w-32 text-center" style={{ width: '15%' }}>NISN</th>
                        <th className="text-center" style={{ width: '15%' }}>Kelas</th>
                        <th className="w-20 text-center" style={{ width: '5%' }}>Ket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <tr key={student.identitas?.id || idx}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="nowrap">{student.identitas?.nama || "-"}</td>
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
