import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import ComponentCard from "../../../components/common/ComponentCard";
import { presensiService } from "../../../services/presensiService";
import { dapodikService } from "../../../services/dapodikService";
import { useSekolah } from "../../../context/SekolahContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import Avatar from "../../../components/ui/avatar/Avatar";
import Select from "../../../components/form/Select";
import Input from "../../../components/form/input/InputField";
import Pagination from "../../../components/common/Pagination";
import Badge from "../../../components/ui/badge/Badge";
import { SearchIcon, SchoolIcon, UserIcon, PrinterIcon, DownloadIcon, EyeIcon } from "../../../icons";
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

const PresensiPD: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useParams();
  const { sekolah: currentSekolah } = useSekolah();
  const [schools, setSchools] = useState<any[]>([]);
  const [headmasters, setHeadmasters] = useState<any[]>([]);
  const [activeCounts, setActiveCounts] = useState<Record<string, { siswa: number; gtk: number }>>({});
  const [recapData, setRecapData] = useState<SchoolRecap[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inspection State
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecap | null>(null);
  const [inspectSearchTerm, setInspectSearchTerm] = useState("");
  const [inspectClassFilter, setInspectClassFilter] = useState("all");
  const [inspectPage, setInspectPage] = useState(1);
  const itemsPerPage = 10;
  
  // Complete attendance list
  const [allGtkRecords, setAllGtkRecords] = useState<any[]>([]);
  const [allPdRecords, setAllPdRecords] = useState<any[]>([]);

  // REGIONAL & SCHOOL FILTERS
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sekolahFilter, setSekolahFilter] = useState(currentSekolah?.sekolah_id || "all");
  
  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Semua Kab/Kota" }]);
  const [kecamatanOptions, setKecamatanOptions] = useState([{ value: "all", label: "Semua Kecamatan" }]);
  const [sekolahOptions, setSekolahOptions] = useState([{ value: "all", label: "Semua Sekolah" }]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Load School List, Headmasters and Setup Filters
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        let schoolList = [];
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
        setSchools(schoolList);

        let gtkList = [];
        try {
          const gtkRes = await dapodikService.getGTK(1000, "", 1, "tendik", "aktif");
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

        const ksList = gtkList.filter((g: any) => 
          g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
          g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
        );
        setHeadmasters(ksList);

        if (schoolList.length > 0) {
          const uniqueKab = [...new Set(schoolList.map((s: any) => s.kabupaten_kota || s.kabupate_kota))].filter(Boolean).sort();
          setKabKotaOptions([{ value: "all", label: "Semua Kab/Kota" }, ...uniqueKab.map(k => ({ value: k, label: k }))]);
          setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...schoolList.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
        }
      } catch (err) {
        console.error("Gagal memuat filter sekolah:", err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // Load Active counts of GTK & Siswa
  useEffect(() => {
    if (schools.length === 0) return;
    
    const fetchActiveTotals = async () => {
      try {
        const activeCountsPromises = schools.map(async (sch) => {
          const schId = sch.sekolah_id || sch.id;
          try {
            const [pdRes, gtkRes] = await Promise.all([
              dapodikService.getPesertaDidik(1, "", 1, undefined, "aktif", undefined, schId),
              dapodikService.getGTK(1, "", 1, undefined, "aktif", schId)
            ]);
            
            const pdTotal = pdRes?.meta?.total_data || pdRes?.meta?.total || pdRes?.total || sch.total_siswa || sch.jumlah_siswa || 0;
            const gtkTotal = gtkRes?.meta?.total_data || gtkRes?.meta?.total || gtkRes?.total || sch.total_gtk || 0;

            return {
              sekolah_id: schId,
              siswa: pdTotal,
              gtk: gtkTotal
            };
          } catch (e) {
            console.error("Gagal mengambil active counts untuk school", schId, e);
            return {
              sekolah_id: schId,
              siswa: sch.total_siswa || sch.jumlah_siswa || 0,
              gtk: sch.total_gtk || 0
            };
          }
        });

        const results = await Promise.all(activeCountsPromises);
        const map: Record<string, { siswa: number; gtk: number }> = {};
        results.forEach(res => {
          map[res.sekolah_id] = {
            siswa: res.siswa,
            gtk: res.gtk
          };
        });
        setActiveCounts(map);
      } catch (err) {
        console.error("Gagal memproses total aktif:", err);
      }
    };

    fetchActiveTotals();
  }, [schools]);

  // Update Kecamatan and Sekolah options when Kab/Kota changes
  useEffect(() => {
    if (kabKotaFilter === "all") {
      setKecamatanOptions([{ value: "all", label: "Semua Kecamatan" }]);
      setKecamatanFilter("all");
      setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...schools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    } else {
      const filteredSchools = schools.filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
      const uniqueKec = [...new Set(filteredSchools.map(s => s.kecamatan))].filter(Boolean).sort();
      setKecamatanOptions([{ value: "all", label: "Semua Kecamatan" }, ...uniqueKec.map(k => ({ value: k, label: k }))]);
      setKecamatanFilter("all");
      setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    }
  }, [kabKotaFilter, schools]);

  // Update Sekolah options when Kecamatan changes
  useEffect(() => {
    if (kecamatanFilter === "all") {
      const filteredSchools = kabKotaFilter === "all" 
        ? schools 
        : schools.filter(s => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
      setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    } else {
      const filteredSchools = schools.filter(s => s.kecamatan === kecamatanFilter);
      setSekolahOptions([{ value: "all", label: "Semua Sekolah" }, ...filteredSchools.map((s: any) => ({ value: s.sekolah_id || s.id, label: s.nama }))]);
    }
  }, [kecamatanFilter, kabKotaFilter, schools]);

  // Fetch presensi list and evaluate metrics
  const fetchAttendance = useCallback(async () => {
    if (schools.length === 0) return;
    setLoading(true);
    try {
      const params = {
        sekolah_id: sekolahFilter === "all" ? undefined : sekolahFilter,
        kabupaten_kota: kabKotaFilter === "all" ? undefined : kabKotaFilter,
        kecamatan: kecamatanFilter === "all" ? undefined : kecamatanFilter,
        tanggal: selectedDate,
        limit: 1000,
      };

      let gtkList: any[] = [];
      try {
        const gtkRes = await presensiService.getMandalaPresensiGTK(params);
        if (gtkRes && (gtkRes.status === 'success' || gtkRes.success === true)) {
          gtkList = gtkRes.data || [];
        } else if (Array.isArray(gtkRes)) {
          gtkList = gtkRes;
        }
      } catch (e) {
        console.error("Gagal mengambil data kehadiran GTK dari backend:", e);
      }

      let pdList: any[] = [];
      try {
        const pdRes = await presensiService.getMandalaPresensiPD(params);
        if (pdRes && (pdRes.status === 'success' || pdRes.success === true)) {
          pdList = pdRes.data || [];
        } else if (Array.isArray(pdRes)) {
          pdList = pdRes;
        }
      } catch (e) {
        console.error("Gagal mengambil data kehadiran siswa dari backend:", e);
      }

      setAllGtkRecords(gtkList);

      // Format individual log data for PD
      const formattedPD = pdList.map((item: any) => {
        const pd = item.peserta_didik;
        const school = schools.find(s => (s.sekolah_id || s.id) === item.sekolah_id);
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

        return {
          id: item.peserta_didik_id || Math.random().toString(),
          nama: pd?.nama || "-",
          rombel: pd?.rombongan_belajar?.nama || "-",
          sekolah: school?.nama || "Sekolah Mandiri",
          sekolah_id: item.sekolah_id,
          kabupaten: school?.kabupaten_kota || school?.kabupate_kota || "-",
          kecamatan: school?.kecamatan || "-",
          jamMasuk: formatTime(item.jam_masuk),
          jamPulang: formatTime(item.jam_pulang),
          statusMasuk: item.status_masuk || 0,
          statusBadge,
          nisn: pd?.nisn || pd?.nipd || "-",
          foto: fotoUrl
        };
      });

      setAllPdRecords(formattedPD);

      // Group recap per school
      const newRecap: SchoolRecap[] = schools.map((sch) => {
        const schId = sch.sekolah_id || sch.id;
        const schoolGtkRecords = gtkList.filter((r: any) => r.sekolah_id === schId);
        const schoolPdRecords = pdList.filter((r: any) => r.sekolah_id === schId);

        let gtkHadir = 0;
        let gtkTerlambat = 0;
        let gtkIzinSakit = 0;
        let gtkAlpha = 0;

        schoolGtkRecords.forEach((r: any) => {
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

        schoolPdRecords.forEach((r: any) => {
          const status = r.status_masuk;
          if (status === 1 || status === 2) {
            pdHadir++;
            if (status === 2) pdTerlambat++;
          } else if (status === 3 || status === 4) {
            pdIzinSakit++;
          } else if (status === 5) {
            pdAlpha++;
          } else if (r.jam_masuk) {
            pdHadir++;
          }
        });

        const schoolActive = activeCounts[schId];
        const totalGtk = schoolActive?.gtk || sch.total_gtk || Math.max(schoolGtkRecords.length, 25);
        const totalSiswa = schoolActive?.siswa || sch.total_siswa || sch.jumlah_siswa || Math.max(schoolPdRecords.length, 250);

        const gtkBelum = Math.max(0, totalGtk - (gtkHadir + gtkIzinSakit + gtkAlpha));
        const pdBelum = Math.max(0, totalSiswa - (pdHadir + pdIzinSakit + pdAlpha));

        const gtkPersentase = totalGtk > 0 ? Math.round((gtkHadir / totalGtk) * 100) : 0;
        const pdPersentase = totalSiswa > 0 ? Math.round((pdHadir / totalSiswa) * 100) : 0;

        // Anomaly & Status Determination Rules
        let statusPenilaian: "Aman" | "Perhatian" | "Anomali" = "Aman";
        let keteranganStatus = "Tingkat kehadiran stabil dan wajar.";

        if (pdPersentase === 100 && gtkPersentase === 0 && totalSiswa > 5) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Anomali Tinggi: Kehadiran siswa 100% sedangkan kehadiran GTK/Guru 0%. Indikasi presensi robotik/manipulatif.";
        } else if (pdPersentase === 100 && totalSiswa > 15) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Waspada Siswa Palsu: Kehadiran siswa 100.0% secara terus-menerus tanpa deviasi absen/sakit pada rombel besar.";
        } else if (pdPersentase === 0 && gtkPersentase === 0 && schoolPdRecords.length === 0) {
          statusPenilaian = "Perhatian";
          keteranganStatus = "Data Kosong: Tidak ada log presensi tercatat hari ini.";
        } else if (pdPersentase < 65 || gtkPersentase < 65) {
          statusPenilaian = "Perhatian";
          keteranganStatus = "Kehadiran Rendah: Persentase kehadiran di bawah standar operasional (65%).";
        } else if (Math.abs(pdPersentase - gtkPersentase) > 40) {
          statusPenilaian = "Anomali";
          keteranganStatus = "Deviasi Ekstrim: Selisih tingkat kehadiran GTK dan Siswa terlalu jauh (>40%). Perlu audit sistem.";
        }

        const hm = headmasters.find((h) => h.identitas?.sekolah_id === schId);
        const kepalaSekolah = hm?.identitas?.nama || "Belum Ditentukan";

        return {
          sekolah_id: schId,
          npsn: sch.npsn || "-",
          nama: sch.nama,
          kabupaten: sch.kabupaten_kota || sch.kabupate_kota || "-",
          kecamatan: sch.kecamatan || "-",
          kepalaSekolah,
          statusPenilaian,
          keteranganStatus,
          gtk: {
            total: totalGtk,
            hadir: gtkHadir,
            terlambat: gtkTerlambat,
            izinSakit: gtkIzinSakit,
            alpha: gtkAlpha,
            belum: gtkBelum,
            persentase: gtkPersentase,
          },
          siswa: {
            total: totalSiswa,
            hadir: pdHadir,
            terlambat: pdTerlambat,
            izinSakit: pdIzinSakit,
            alpha: pdAlpha,
            belum: pdBelum,
            persentase: pdPersentase,
          }
        };
      });

      setRecapData(newRecap);
    } catch (err) {
      console.error("Gagal mengambil data presensi:", err);
    } finally {
      setLoading(false);
    }
  }, [schools, selectedDate, kabKotaFilter, kecamatanFilter, sekolahFilter, activeCounts, headmasters]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Filtered recap list based on selected filters
  const filteredRecap = useMemo(() => {
    return recapData.filter((item) => {
      const matchKab = kabKotaFilter === "all" || item.kabupaten === kabKotaFilter;
      const matchKec = kecamatanFilter === "all" || item.kecamatan === kecamatanFilter;
      const matchSch = sekolahFilter === "all" || item.sekolah_id === sekolahFilter;
      return matchKab && matchKec && matchSch;
    });
  }, [recapData, kabKotaFilter, kecamatanFilter, sekolahFilter]);

  const handleInspect = (school: SchoolRecap) => {
    navigate(`/${role}/laporan-absensi/peserta-didik/audit/${school.sekolah_id}?tanggal=${selectedDate}`);
  };

  const handleExport = () => {
    Swal.fire({
      title: "Export Data Presensi Peserta Didik?",
      text: "Data kehadiran peserta didik akan diunduh dalam format CSV (Kompatibel dengan Excel).",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = [
          "No", "NPSN", "Satuan Pendidikan", "Kabupaten", "Kecamatan", "Kepala Sekolah", 
          "Kehadiran GTK (%)", "Kehadiran Siswa (%)", 
          "Siswa Total", "Siswa Hadir", "Siswa Terlambat", "Siswa Izin/Sakit", "Siswa Tanpa Keterangan", "Siswa Belum Presensi",
          "Status Penilaian", "Keterangan Status"
        ];
        
        const rows = filteredRecap.map((sch, index) => [
          index + 1,
          sch.npsn ? `="${sch.npsn}"` : "-",
          sch.nama || "-",
          sch.kabupaten || "-",
          sch.kecamatan || "-",
          sch.kepalaSekolah || "-",
          sch.gtk.persentase,
          sch.siswa.persentase,
          sch.siswa.total,
          sch.siswa.hadir,
          sch.siswa.terlambat,
          sch.siswa.izinSakit,
          sch.siswa.alpha,
          sch.siswa.belum,
          sch.statusPenilaian,
          sch.keteranganStatus
        ]);

        const filename = `Presensi_Siswa_${selectedDate}_${new Date().toISOString().slice(0, 10)}.csv`;
        exportToCSV(filename, headers, rows);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <PageMeta
        title="Laporan Presensi Peserta Didik | SIMAK"
        description="Analisis status presensi siswa harian dan pencegahan siswa palsu."
      />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">
            Laporan Presensi Peserta Didik
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Audit kehadiran harian Peserta Didik (Siswa) per instansi sekolah untuk pencegahan anomali siswa palsu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 no-print">
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

      <div className="space-y-6">
        {/* Filters Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kabupaten/Kota</label>
              <Select
                options={kabKotaOptions}
                defaultValue={kabKotaFilter}
                onChange={(value) => {
                  setKabKotaFilter(value);
                  setInspectPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kecamatan</label>
              <Select
                options={kecamatanOptions}
                defaultValue={kecamatanFilter}
                onChange={(value) => {
                  setKecamatanFilter(value);
                  setInspectPage(1);
                }}
                disabled={kabKotaFilter === "all"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Satuan Pendidikan</label>
              <Select
                options={sekolahOptions}
                defaultValue={sekolahFilter}
                onChange={(value) => {
                  setSekolahFilter(value);
                  setInspectPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal Laporan</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setInspectPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* School audit list */}
            <div className="col-span-12">
              <ComponentCard title="Kepatuhan Presensi Siswa Satuan Pendidikan">
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto custom-scrollbar">
                    <Table className="min-w-[700px] xl:min-w-full">
                      <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                          <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Sekolah / NPSN</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Kepala Sekolah</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase bg-brand-500/5">Kehadiran GTK (%)</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase bg-emerald-500/5">Kehadiran Siswa (%)</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</TableCell>
                          <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {filteredRecap.length > 0 ? (
                          filteredRecap.map((sch, index) => {
                            let statusBadge = <Badge color="success">Aman</Badge>;
                            if (sch.statusPenilaian === "Anomali") {
                              statusBadge = <Badge color="error">Anomali</Badge>;
                            } else if (sch.statusPenilaian === "Perhatian") {
                              statusBadge = <Badge color="warning">Perhatian</Badge>;
                            }

                            return (
                              <TableRow 
                                key={sch.sekolah_id} 
                                className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005] transition-colors"
                              >
                                <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-gray-800 dark:text-white/95 leading-tight">{sch.nama}</span>
                                    <span className="text-xs text-gray-400 font-mono mt-0.5">{sch.npsn}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">{sch.kepalaSekolah}</TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <span className="font-bold text-sm text-brand-600 dark:text-brand-400">{sch.gtk.persentase}%</span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{sch.siswa.persentase}%</span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">{statusBadge}</TableCell>
                                <TableCell className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleInspect(sch)}
                                    className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                                    title="Lihat Detail"
                                  >
                                    <EyeIcon className="size-5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-400">
                              Tidak ada data instansi sekolah ditemukan.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ComponentCard>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PresensiPD;
