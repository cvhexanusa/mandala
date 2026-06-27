import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import ComponentCard from "../../../components/common/ComponentCard";
import { presensiService } from "../../../services/presensiService";
import { dapodikService } from "../../../services/dapodikService";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import Avatar from "../../../components/ui/avatar/Avatar";
import Select from "../../../components/form/Select";
import Pagination from "../../../components/common/Pagination";
import Badge from "../../../components/ui/badge/Badge";
import { SearchIcon, SchoolIcon, UserIcon, PrinterIcon, DownloadIcon } from "../../../icons";
import Swal from "sweetalert2";
import { exportToCSV } from "../../../utils/exportUtils";

interface SchoolRecap {
  sekolah_id: string;
  npsn: string;
  nama: string;
  kabupaten: string;
  kecamatan: string;
  kepalaSekolah: string;
  statusPenilaian: "Aman" | "Perhatian" | "Anomali";
  keteranganStatus: string;
  gtk: {
    total: number;
    hadir: number;
    terlambat: number;
    izinSakit: number;
    alpha: number;
    belum: number;
    persentase: number;
  };
  siswa: {
    total: number;
    hadir: number;
    terlambat: number;
    izinSakit: number;
    alpha: number;
    belum: number;
    persentase: number;
  };
}

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const AuditPresensiPD: React.FC = () => {
  const { role, sekolahId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get today's date string in local YYYY-MM-DD
  const todayDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Search date
  const selectedDate = useMemo(() => {
    const tanggalParam = searchParams.get("tanggal");
    if (tanggalParam) return tanggalParam;
    return todayDate;
  }, [searchParams, todayDate]);

  const isToday = selectedDate === todayDate;

  // States
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  const [kepalaSekolah, setKepalaSekolah] = useState("Belum Ditentukan");
  const [allPdRecords, setAllPdRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<SchoolRecap | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<"all_absent" | "belum" | "alpha" | "izin" | "sudah_absen">("all_absent");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load School Details & Attendance
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

        // Fetch Headmaster
        let gtkList = [];
        try {
          const gtkRes = await dapodikService.getGTK(1000, "", 1, "tendik", "aktif", sekolahId);
          if (gtkRes.status === 'success' || gtkRes.success === true) {
            gtkList = gtkRes.data || [];
          } else if (Array.isArray(gtkRes)) {
            gtkList = gtkRes;
          } else if (gtkRes.data && Array.isArray(gtkRes.data)) {
            gtkList = gtkRes.data;
          }
        } catch (e) {
          console.error("Gagal mengambil data GTK kepala sekolah:", e);
        }

        const ks = gtkList.find((g: any) => 
          g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
          g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
        );
        const hmName = ks?.identitas?.nama || "Belum Ditentukan";
        setKepalaSekolah(hmName);

        // Fetch Active Counts and Full Active Student List
        let pdTotal = currentSch?.total_siswa || currentSch?.jumlah_siswa || 0;
        let gtkTotal = currentSch?.total_gtk || 0;
        let activeStudents: any[] = [];
        try {
          const [pdCountRes, gtkCountRes, pdActiveRes] = await Promise.all([
            dapodikService.getPesertaDidik(1, "", 1, undefined, "aktif", undefined, sekolahId),
            dapodikService.getGTK(1, "", 1, undefined, "aktif", sekolahId),
            dapodikService.getPesertaDidik(3000, "", 1, undefined, "aktif", undefined, sekolahId)
          ]);
          pdTotal = pdCountRes?.meta?.total_data || pdCountRes?.meta?.total || pdCountRes?.total || pdTotal;
          gtkTotal = gtkCountRes?.meta?.total_data || gtkCountRes?.meta?.total || gtkCountRes?.total || gtkTotal;
          
          if (pdActiveRes && (pdActiveRes.status === 'success' || pdActiveRes.success === true)) {
            activeStudents = pdActiveRes.data || [];
          } else if (Array.isArray(pdActiveRes)) {
            activeStudents = pdActiveRes;
          } else if (pdActiveRes && pdActiveRes.data && Array.isArray(pdActiveRes.data)) {
            activeStudents = pdActiveRes.data;
          }
        } catch (e) {
          console.error("Gagal mengambil active counts/student list:", e);
        }

        // Fetch Attendance Details
        const params = {
          sekolah_id: sekolahId,
          tanggal: selectedDate,
          limit: 1000,
        };

        let attendanceGtk: any[] = [];
        try {
          const gtkRes = await presensiService.getMandalaPresensiGTK(params);
          if (gtkRes && (gtkRes.status === 'success' || gtkRes.success === true)) {
            attendanceGtk = gtkRes.data || [];
          } else if (Array.isArray(gtkRes)) {
            attendanceGtk = gtkRes;
          }
        } catch (e) {
          console.error("Gagal mengambil data presensi GTK:", e);
        }

        let attendancePd: any[] = [];
        try {
          const pdRes = await presensiService.getMandalaPresensiPD(params);
          if (pdRes && (pdRes.status === 'success' || pdRes.success === true)) {
            attendancePd = pdRes.data || [];
          } else if (Array.isArray(pdRes)) {
            attendancePd = pdRes;
          }
        } catch (e) {
          console.error("Gagal mengambil data presensi PD:", e);
        }

        // Format checked-in student records
        const checkedInIds = new Set<string>();
        const checkedInNisns = new Set<string>();

        const formattedPD = attendancePd.map((item: any) => {
          const pd = item.peserta_didik;
          const hasMasuk = !!item.jam_masuk;
          const hasPulang = !!item.jam_pulang;
          let statusBadge = "Belum Presensi";
          
          if (item.status_masuk === 3) statusBadge = "Izin";
          else if (item.status_masuk === 4) statusBadge = "Sakit";
          else if (item.status_masuk === 5) statusBadge = "Alpha";
          else if (hasMasuk || hasPulang) {
            statusBadge = item.status_masuk === 2 ? "Terlambat" : "Hadir";
          }

          const formatTime = (isoString: string | null) => {
            if (!isoString) return "-";
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
          };

          const fotoUrl = pd?.foto 
            ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://centralsimak.smakniscjr.sch.id'}/storage/${pd.foto}` 
            : '';

          const recordId = item.peserta_didik_id || pd?.id || pd?.identitas?.id;
          const recordNisn = pd?.nisn || pd?.nipd || pd?.identitas?.nisn;

          if (recordId) checkedInIds.add(recordId);
          if (recordNisn) checkedInNisns.add(recordNisn);

          return {
            id: recordId || Math.random().toString(),
            nama: pd?.nama || pd?.identitas?.nama || "-",
            rombel: pd?.rombongan_belajar?.nama || pd?.akademik?.nama_rombel || "-",
            jamMasuk: formatTime(item.jam_masuk),
            jamPulang: formatTime(item.jam_pulang),
            statusMasuk: item.status_masuk || 0,
            statusBadge,
            nisn: recordNisn || "-",
            foto: fotoUrl
          };
        });

        // Generate virtual records for active students not in attendance logs
        const virtualPD: any[] = [];
        activeStudents.forEach((student: any) => {
          const studentId = student.identitas?.id || student.id;
          const studentNisn = student.identitas?.nisn || student.nisn || student.identitas?.nipd;

          const isAlreadyCheckedIn = 
            (studentId && checkedInIds.has(studentId)) ||
            (studentNisn && checkedInNisns.has(studentNisn));

          if (!isAlreadyCheckedIn) {
            const fotoUrl = student.identitas?.foto 
              ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'https://centralsimak.smakniscjr.sch.id'}/storage/${student.identitas.foto}` 
              : '';

            virtualPD.push({
              id: studentId || Math.random().toString(),
              nama: student.identitas?.nama || student.nama || "-",
              rombel: student.akademik?.nama_rombel || student.rombongan_belajar?.nama || student.rombongan_belajar || "-",
              jamMasuk: "-",
              jamPulang: "-",
              statusMasuk: 0,
              statusBadge: "Belum Presensi",
              nisn: studentNisn || "-",
              foto: fotoUrl
            });
          }
        });

        const mergedPD = [...formattedPD, ...virtualPD];

        // Process stats
        let gtkHadir = 0;
        let gtkTerlambat = 0;
        let gtkIzinSakit = 0;
        let gtkAlpha = 0;
        attendanceGtk.forEach((r: any) => {
          const status = r.status_masuk;
          if (status === 1 || status === 2) {
            gtkHadir++;
            if (status === 2) gtkTerlambat++;
          } else if (status === 3 || status === 4) {
            gtkIzinSakit++;
          } else if (status === 5) {
            gtkAlpha++;
          } else if (r.jam_masuk) {
            gtkHadir++;
          }
        });

        let pdHadir = 0;
        let pdTerlambat = 0;
        let pdIzinSakit = 0;
        let pdAlpha = 0;
        let pdBelum = 0;
        mergedPD.forEach((r: any) => {
          if (r.statusBadge === "Hadir") {
            pdHadir++;
          } else if (r.statusBadge === "Terlambat") {
            pdHadir++;
            pdTerlambat++;
          } else if (r.statusBadge === "Izin" || r.statusBadge === "Sakit") {
            pdIzinSakit++;
          } else if (r.statusBadge === "Alpha") {
            pdAlpha++;
          } else if (r.statusBadge === "Belum Presensi") {
            pdBelum++;
          }
        });

        const totalGtk = Math.max(gtkTotal, attendanceGtk.length, 25);
        const totalSiswa = Math.max(activeStudents.length, pdTotal, mergedPD.length, 250);

        const gtkBelum = Math.max(0, totalGtk - (gtkHadir + gtkIzinSakit + gtkAlpha));
        
        // If activeStudents was not loaded, fall back to old math calculation for pdBelum
        if (activeStudents.length === 0 && mergedPD.length === formattedPD.length) {
          pdBelum = Math.max(0, totalSiswa - (pdHadir + pdIzinSakit + pdAlpha));
        }

        const gtkPersentase = totalGtk > 0 ? Math.round((gtkHadir / totalGtk) * 100) : 0;
        const pdPersentase = totalSiswa > 0 ? Math.round((pdHadir / totalSiswa) * 100) : 0;

        // Evaluasi Penilaian
        let statusPenilaian: "Aman" | "Perhatian" | "Anomali" = "Aman";
        let keteranganStatus = "Tingkat kehadiran stabil dan wajar.";

        if (pdPersentase === 100 && gtkPersentase === 0 && totalSiswa > 5) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Anomali Tinggi: Kehadiran siswa 100% sedangkan kehadiran GTK/Guru 0%. Indikasi presensi robotik/manipulatif.";
        } else if (pdPersentase === 100 && totalSiswa > 15) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Waspada Siswa Palsu: Kehadiran siswa 100.0% secara terus-menerus tanpa deviasi absen/sakit pada rombel besar.";
        } else if (pdPersentase === 0 && gtkPersentase === 0 && attendancePd.length === 0) {
          statusPenilaian = "Perhatian";
          keteranganStatus = "Data Kosong: Tidak ada log presensi tercatat hari ini.";
        } else if (pdPersentase < 65 || gtkPersentase < 65) {
          statusPenilaian = "Perhatian";
          keteranganStatus = "Kehadiran Rendah: Persentase kehadiran di bawah standar operasional (65%).";
        } else if (Math.abs(pdPersentase - gtkPersentase) > 40) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Deviasi Ekstrim: Selisih tingkat kehadiran GTK dan Siswa terlalu jauh (>40%). Perlu audit sistem.";
        }

        setStats({
          sekolah_id: sekolahId,
          npsn: currentSch?.npsn || "-",
          nama: currentSch?.nama || "Sekolah Mandiri",
          kabupaten: currentSch?.kabupaten_kota || currentSch?.kabupate_kota || "-",
          kecamatan: currentSch?.kecamatan || "-",
          kepalaSekolah: hmName,
          statusPenilaian,
          keteranganStatus,
          gtk: { total: totalGtk, hadir: gtkHadir, terlambat: gtkTerlambat, izinSakit: gtkIzinSakit, alpha: gtkAlpha, belum: gtkBelum, persentase: gtkPersentase },
          siswa: { total: totalSiswa, hadir: pdHadir, terlambat: pdTerlambat, izinSakit: pdIzinSakit, alpha: pdAlpha, belum: pdBelum, persentase: pdPersentase }
        });

        setAllPdRecords(mergedPD);

      } catch (err) {
        console.error("Gagal memuat data audit presensi:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [sekolahId, selectedDate]);

  // Extract unique classes for filter
  const rombelOptions = useMemo(() => {
    const classes = [...new Set(allPdRecords.map(item => item.rombel))].filter(Boolean).sort();
    return [{ value: "all", label: "Semua Rombel" }, ...classes.map(c => ({ value: c, label: c }))];
  }, [allPdRecords]);

  // Filter logs by selected tab (Only non-attendance categories by default), search, and class
  const filteredLogs = useMemo(() => {
    return allPdRecords.filter((item) => {
      // 1. Tab Filter
      let matchTab = false;
      if (activeTab === "all_absent") {
        matchTab = ["Belum Presensi", "Alpha", "Izin", "Sakit"].includes(item.statusBadge);
      } else if (activeTab === "belum") {
        matchTab = item.statusBadge === "Belum Presensi";
      } else if (activeTab === "alpha") {
        matchTab = item.statusBadge === "Alpha";
      } else if (activeTab === "izin") {
        matchTab = ["Izin", "Sakit"].includes(item.statusBadge);
      } else if (activeTab === "sudah_absen") {
        matchTab = ["Hadir", "Terlambat"].includes(item.statusBadge);
      }

      // 2. Search Filter
      const matchSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.nisn.includes(searchTerm);

      // 3. Class Filter
      const matchClass = classFilter === "all" || item.rombel === classFilter;

      return matchTab && matchSearch && matchClass;
    });
  }, [allPdRecords, activeTab, searchTerm, classFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExport = () => {
    Swal.fire({
      title: "Export Audit Presensi Siswa?",
      text: "Data audit siswa akan diexport ke format CSV (Kompatibel dengan Excel).",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["No", "Nama Siswa", "NISN", "Rombongan Belajar", "Jam Masuk", "Jam Pulang", "Status", "Keterangan Audit Log"];
        
        const rows = filteredLogs.map((log, index) => {
          let auditText = "Terdeteksi tidak hadir pada hari belajar.";
          if (log.statusBadge === "Hadir") {
            auditText = "Hadir tepat waktu.";
          } else if (log.statusBadge === "Terlambat") {
            auditText = "Hadir terlambat.";
          } else if (log.statusBadge === "Belum Presensi") {
            auditText = "Tidak ada rekaman log presensi masuk maupun pulang.";
          } else if (log.statusBadge === "Izin") {
            auditText = "Izin secara tertulis/sistem terkonfirmasi.";
          } else if (log.statusBadge === "Sakit") {
            auditText = "Sakit dengan surat keterangan terkonfirmasi.";
          } else if (log.statusBadge === "Alpha") {
            auditText = "Ketidakhadiran tanpa keterangan (Bolos/Alfa). Waspada data anomali.";
          }

          return [
            index + 1,
            log.nama || "-",
            log.nisn ? `="${log.nisn}"` : "-",
            log.rombel || "-",
            log.jamMasuk || "-",
            log.jamPulang || "-",
            log.statusBadge || "-",
            auditText
          ];
        });

        const filename = `Audit_Presensi_Siswa_${school?.nama.replace(/\s+/g, "_") || "Sekolah"}_${selectedDate}.csv`;
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

  const statusPenilaian = stats?.statusPenilaian || "Aman";
  const keteranganStatus = stats?.keteranganStatus || "";

  return (
    <>
      <PageMeta
        title={`Audit Presensi Siswa - ${school?.nama || "SIMAK"}`}
        description="Detail audit kepatuhan absensi siswa untuk pencegahan data palsu."
      />

      {/* Action Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <button
          onClick={() => navigate(`/${role}/laporan-absensi/peserta-didik`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Kembali ke Laporan Presensi
        </button>
        
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

      {/* School Info and Evaluation Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-7 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
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
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tanggal Laporan:</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set("tanggal", e.target.value);
                        navigate(`/${role}/laporan-absensi/peserta-didik/audit/${sekolahId}?${newParams.toString()}`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl focus:border-brand-500 focus:ring-0 cursor-pointer"
                    />
                    {isToday ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20 shadow-sm relative">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 absolute"></span>
                        LIVE (Real-Time)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                        📅 HISTORIS
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  {isToday 
                    ? "Keterangan: Menampilkan log presensi real-time hari ini yang disinkronkan langsung dari server pusat."
                    : `Keterangan: Menampilkan arsip log presensi historis untuk hari ${new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className={`h-full p-6 rounded-2xl border shadow-sm ${
            statusPenilaian === "Anomali" 
              ? "bg-red-50/70 border-red-100 text-red-700 dark:bg-red-500/5 dark:border-red-500/10 dark:text-red-400" 
              : statusPenilaian === "Perhatian"
              ? "bg-amber-50/70 border-amber-100 text-amber-700 dark:bg-amber-500/5 dark:border-amber-500/10 dark:text-amber-400"
              : "bg-emerald-50/70 border-emerald-100 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/10 dark:text-emerald-400"
          }`}>
            <div className="flex gap-3 items-start h-full">
              <span className="text-3xl">
                {statusPenilaian === "Anomali" ? "🚨" : statusPenilaian === "Perhatian" ? "⚠️" : "✅"}
              </span>
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider">Status Evaluasi Kehadiran</h5>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1.5 ${
                  statusPenilaian === "Anomali" 
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : statusPenilaian === "Perhatian"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}>
                  {statusPenilaian}
                </span>
                <p className="text-xs mt-2.5 leading-relaxed opacity-95">{keteranganStatus}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Stats Panels */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Hadir</span>
            <span className="font-extrabold text-emerald-600 text-2xl">{stats.siswa.hadir}</span>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-500/10 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Lambat</span>
            <span className="font-extrabold text-amber-600 text-2xl">{stats.siswa.terlambat}</span>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Izin/Sakit</span>
            <span className="font-extrabold text-blue-600 text-2xl">{stats.siswa.izinSakit}</span>
          </div>
          <div className="bg-red-50/50 dark:bg-red-500/5 p-4 rounded-2xl border border-red-100/50 dark:border-red-500/10 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Alpha</span>
            <span className="font-extrabold text-red-600 text-2xl">{stats.siswa.alpha}</span>
          </div>
          <div className="bg-gray-100/50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Belum Absen</span>
            <span className="font-extrabold text-gray-500 text-2xl">{stats.siswa.belum}</span>
          </div>
        </div>
      )}

      {/* Main Audit List Card */}
      <ComponentCard title="Audit Siswa Tidak Hadir (Ketidakpatuhan Absensi)">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 no-print">
          
          {/* Custom Audit Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-full md:w-auto">
            <button 
              onClick={() => { setActiveTab("all_absent"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all_absent"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Semua Tidak Hadir
            </button>
            <button 
              onClick={() => { setActiveTab("belum"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "belum"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Belum Presensi
            </button>
            <button 
              onClick={() => { setActiveTab("alpha"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "alpha"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Alpha
            </button>
            <button 
              onClick={() => { setActiveTab("izin"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "izin"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Izin / Sakit
            </button>
            <button 
              onClick={() => { setActiveTab("sudah_absen"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "sudah_absen"
                  ? "bg-white text-gray-800 dark:bg-gray-700 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Sudah Absen (Log)
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* Class Filter */}
            <div className="w-full md:w-40">
              <Select
                options={rombelOptions}
                defaultValue={classFilter}
                onChange={(value) => {
                  setClassFilter(value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-60">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama atau NISN..."
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
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Siswa / NISN</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Rombongan Belajar</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jam Masuk</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Jam Pulang</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Keterangan / Audit Log</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log, index) => {
                    let statusColor: "success" | "warning" | "error" | "info" = "error";
                    if (log.statusBadge === "Hadir") {
                      statusColor = "success";
                    } else if (log.statusBadge === "Terlambat") {
                      statusColor = "warning";
                    } else if (log.statusBadge === "Izin" || log.statusBadge === "Sakit") {
                      statusColor = "info";
                    } else if (log.statusBadge === "Belum Presensi") {
                      statusColor = "warning";
                    }

                    // Audit compliance warnings helper
                    let auditText = "Terdeteksi tidak hadir pada hari belajar.";
                    if (log.statusBadge === "Hadir") {
                      auditText = "Hadir tepat waktu.";
                    } else if (log.statusBadge === "Terlambat") {
                      auditText = "Hadir terlambat.";
                    } else if (log.statusBadge === "Belum Presensi") {
                      auditText = "Tidak ada rekaman log presensi masuk maupun pulang.";
                    } else if (log.statusBadge === "Izin") {
                      auditText = "Izin secara tertulis/sistem terkonfirmasi.";
                    } else if (log.statusBadge === "Sakit") {
                      auditText = "Sakit dengan surat keterangan terkonfirmasi.";
                    } else if (log.statusBadge === "Alpha") {
                      auditText = "Ketidakhadiran tanpa keterangan (Bolos/Alfa). Waspada data anomali.";
                    }

                    return (
                      <TableRow key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005]">
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/95">
                          <div className="flex items-center gap-3">
                            <Avatar src={log.foto} size="medium" />
                            <div className="flex flex-col">
                              <span>{log.nama}</span>
                              <span className="text-xs text-gray-400 font-mono mt-0.5">{log.nisn}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {log.rombel}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                          {log.jamMasuk}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                          {log.jamPulang}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge color={statusColor} size="sm">
                            {log.statusBadge}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 italic">
                          {auditText}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Tidak ada data siswa tidak hadir yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
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

export default AuditPresensiPD;
