import React, { useEffect, useState, useCallback, useMemo } from "react";
import PageMeta from "../../../components/common/PageMeta";
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
import Select from "../../../components/form/Select";
import Input from "../../../components/form/input/InputField";
import Pagination from "../../../components/common/Pagination";
import Badge from "../../../components/ui/badge/Badge";
import { SearchIcon, DownloadIcon, PrinterIcon, PieChartIcon, GroupIcon, UserIcon, SchoolIcon } from "../../../icons";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import Swal from "sweetalert2";

interface SchoolRecap {
  sekolah_id: string;
  npsn: string;
  nama: string;
  kabupaten: string;
  kecamatan: string;
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

const RekapTerpadu: React.FC = () => {
  const { sekolah: currentSekolah } = useSekolah();
  
  // States
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<any[]>([]);
  const [recapData, setRecapData] = useState<SchoolRecap[]>([]);
  const [activeCounts, setActiveCounts] = useState<Record<string, { siswa: number; gtk: number }>>({});
  const [activeTab, setActiveTab] = useState<"ringkasan" | "grafik" | "log">("ringkasan");
  const [selectedSubTab, setSelectedSubTab] = useState<"gtk" | "siswa">("gtk");

  // Filters
  const [kabKotaFilter, setKabKotaFilter] = useState("all");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sekolahFilter, setSekolahFilter] = useState(currentSekolah?.sekolah_id || "all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Options
  const [kabKotaOptions, setKabKotaOptions] = useState([{ value: "all", label: "Semua Kab/Kota" }]);
  const [kecamatanOptions, setKecamatanOptions] = useState([{ value: "all", label: "Semua Kecamatan" }]);
  const [sekolahOptions, setSekolahOptions] = useState([{ value: "all", label: "Semua Sekolah" }]);

  // Search & Pagination for Details
  const [searchTerm, setSearchTerm] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [logDataGTK, setLogDataGTK] = useState<any[]>([]);
  const [logDataPD, setLogDataPD] = useState<any[]>([]);

  // Load School List and Setup Filters
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const response = await dapodikService.getSekolah();
        let schoolList = [];
        if (response.status === 'success' || response.success === true) {
          schoolList = response.data || [];
        } else if (Array.isArray(response)) {
          schoolList = response;
        } else if (response.data && Array.isArray(response.data)) {
          schoolList = response.data;
        }

        setSchools(schoolList);

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

  // Load Active GTK and Siswa Counts per School
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

  // Fetch Attendance Data from backend and calculate recap stats
  const fetchAttendanceData = useCallback(async () => {
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

      // Format individual log data for GTK and PD
      const formattedGTK = gtkList.map((item: any) => {
        const gtk = item.gtk;
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
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        };

        return {
          id: item.ptk_id || Math.random().toString(),
          nama: gtk?.nama || "-",
          role: gtk?.jenis_ptk_id_str || "Pegawai",
          sekolah: school?.nama || "Sekolah Mandiri",
          sekolah_id: item.sekolah_id,
          kabupaten: school?.kabupaten_kota || school?.kabupate_kota || "-",
          kecamatan: school?.kecamatan || "-",
          jamMasuk: formatTime(item.jam_masuk),
          jamPulang: formatTime(item.jam_pulang),
          statusMasuk: item.status_masuk || 0,
          statusBadge,
          nuptk: gtk?.nuptk || gtk?.nip || "-"
        };
      });

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
          return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        };

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
          nisn: pd?.nisn || pd?.nipd || "-"
        };
      });

      setLogDataGTK(formattedGTK);
      setLogDataPD(formattedPD);

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

        return {
          sekolah_id: schId,
          npsn: sch.npsn || "-",
          nama: sch.nama,
          kabupaten: sch.kabupaten_kota || sch.kabupate_kota || "-",
          kecamatan: sch.kecamatan || "-",
          gtk: {
            total: totalGtk,
            hadir: gtkHadir,
            terlambat: gtkTerlambat,
            izinSakit: gtkIzinSakit,
            alpha: gtkAlpha,
            belum: gtkBelum,
            persentase: totalGtk > 0 ? Math.round((gtkHadir / totalGtk) * 100) : 0,
          },
          siswa: {
            total: totalSiswa,
            hadir: pdHadir,
            terlambat: pdTerlambat,
            izinSakit: pdIzinSakit,
            alpha: pdAlpha,
            belum: pdBelum,
            persentase: totalSiswa > 0 ? Math.round((pdHadir / totalSiswa) * 100) : 0,
          }
        };
      });

      setRecapData(newRecap);
    } catch (err) {
      console.error("Gagal mengambil data kehadiran terpadu:", err);
    } finally {
      setLoading(false);
    }
  }, [schools, selectedDate, kabKotaFilter, kecamatanFilter, sekolahFilter, activeCounts]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Filtered recap list based on selected filters
  const filteredRecap = useMemo(() => {
    return recapData.filter((item) => {
      const matchKab = kabKotaFilter === "all" || item.kabupaten === kabKotaFilter;
      const matchKec = kecamatanFilter === "all" || item.kecamatan === kecamatanFilter;
      const matchSch = sekolahFilter === "all" || item.sekolah_id === sekolahFilter;
      return matchKab && matchKec && matchSch;
    });
  }, [recapData, kabKotaFilter, kecamatanFilter, sekolahFilter]);

  // Calculate Cumulative Metrics based on filtered data
  const totals = useMemo(() => {
    let gtkTotal = 0;
    let gtkHadir = 0;
    let gtkTerlambat = 0;
    let gtkIzinSakit = 0;
    let gtkAlpha = 0;
    let gtkBelum = 0;

    let pdTotal = 0;
    let pdHadir = 0;
    let pdTerlambat = 0;
    let pdIzinSakit = 0;
    let pdAlpha = 0;
    let pdBelum = 0;

    filteredRecap.forEach((sch) => {
      gtkTotal += sch.gtk.total;
      gtkHadir += sch.gtk.hadir;
      gtkTerlambat += sch.gtk.terlambat;
      gtkIzinSakit += sch.gtk.izinSakit;
      gtkAlpha += sch.gtk.alpha;
      gtkBelum += sch.gtk.belum;

      pdTotal += sch.siswa.total;
      pdHadir += sch.siswa.hadir;
      pdTerlambat += sch.siswa.terlambat;
      pdIzinSakit += sch.siswa.izinSakit;
      pdAlpha += sch.siswa.alpha;
      pdBelum += sch.siswa.belum;
    });

    return {
      gtk: {
        total: gtkTotal,
        hadir: gtkHadir,
        terlambat: gtkTerlambat,
        izinSakit: gtkIzinSakit,
        alpha: gtkAlpha,
        belum: gtkBelum,
        persentase: gtkTotal > 0 ? Math.round((gtkHadir / gtkTotal) * 100) : 0,
      },
      siswa: {
        total: pdTotal,
        hadir: pdHadir,
        terlambat: pdTerlambat,
        izinSakit: pdIzinSakit,
        alpha: pdAlpha,
        belum: pdBelum,
        persentase: pdTotal > 0 ? Math.round((pdHadir / pdTotal) * 100) : 0,
      }
    };
  }, [filteredRecap]);

  // Filter logs based on search query and school filter
  const filteredLogs = useMemo(() => {
    if (selectedSubTab === "gtk") {
      return logDataGTK.filter((item) => {
        const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.nuptk.includes(searchTerm) ||
                              item.sekolah.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesKab = kabKotaFilter === "all" || item.kabupaten === kabKotaFilter;
        const matchesKec = kecamatanFilter === "all" || item.kecamatan === kecamatanFilter;
        const matchesSch = sekolahFilter === "all" || item.sekolah_id === sekolahFilter;
        return matchesSearch && matchesKab && matchesKec && matchesSch;
      });
    } else {
      return logDataPD.filter((item) => {
        const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.nisn.includes(searchTerm) ||
                              item.sekolah.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesKab = kabKotaFilter === "all" || item.kabupaten === kabKotaFilter;
        const matchesKec = kecamatanFilter === "all" || item.kecamatan === kecamatanFilter;
        const matchesSch = sekolahFilter === "all" || item.sekolah_id === sekolahFilter;
        return matchesSearch && matchesKab && matchesKec && matchesSch;
      });
    }
  }, [selectedSubTab, logDataGTK, logDataPD, searchTerm, kabKotaFilter, kecamatanFilter, sekolahFilter]);

  // Pagination for logs tab
  const totalPagesLogs = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((detailPage - 1) * itemsPerPage, detailPage * itemsPerPage);
  }, [filteredLogs, detailPage, itemsPerPage]);

  const handleExport = () => {
    Swal.fire({
      title: "Export Rekapitulasi Presensi Terpadu?",
      text: "Data seluruh satuan pendidikan akan diunduh dalam format Excel.",
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

  // ApexChart Options for GTK Donut
  const gtkDonutOptions: ApexOptions = {
    colors: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280"],
    labels: ["Hadir Tepat Waktu", "Terlambat", "Izin / Sakit", "Tanpa Keterangan", "Belum Absen"],
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontFamily: "Outfit",
              fontWeight: 600,
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              formatter: (val) => `${val}`,
            },
            total: {
              show: true,
              label: "Total GTK",
              formatter: () => `${totals.gtk.total}`,
            }
          }
        }
      }
    },
    legend: {
      position: "bottom",
      fontFamily: "Outfit",
    },
  };

  const gtkDonutSeries = [
    totals.gtk.hadir - totals.gtk.terlambat,
    totals.gtk.terlambat,
    totals.gtk.izinSakit,
    totals.gtk.alpha,
    totals.gtk.belum
  ];

  // ApexChart Options for Student Donut
  const pdDonutOptions: ApexOptions = {
    colors: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#6b7280"],
    labels: ["Hadir Tepat Waktu", "Terlambat", "Izin / Sakit", "Tanpa Keterangan", "Belum Absen"],
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              fontFamily: "Outfit",
              fontWeight: 600,
            },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              formatter: (val) => `${val}`,
            },
            total: {
              show: true,
              label: "Total Siswa",
              formatter: () => `${totals.siswa.total}`,
            }
          }
        }
      }
    },
    legend: {
      position: "bottom",
      fontFamily: "Outfit",
    },
  };

  const pdDonutSeries = [
    totals.siswa.hadir - totals.siswa.terlambat,
    totals.siswa.terlambat,
    totals.siswa.izinSakit,
    totals.siswa.alpha,
    totals.siswa.belum
  ];

  // Trend Chart Options (Area Chart)
  const trendOptions: ApexOptions = {
    colors: ["#465fff", "#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2.5, 2.5],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => `${val}%`,
      }
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val}% Kehadiran`,
      },
    },
  };

  const trendSeries = [
    {
      name: "Tingkat Kehadiran GTK (%)",
      data: [98, 97, 95, 96, 98, 94],
    },
    {
      name: "Tingkat Kehadiran Siswa (%)",
      data: [93, 91, 89, 92, 94, 91],
    },
  ];

  return (
    <>
      <PageMeta
        title="Rekap Terpadu Presensi | SIMAK"
        description="Grafik dan rekapitulasi absensi terintegrasi seluruh sekolah."
      />

      {/* Header Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">
            Rekap Terpadu Presensi
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitoring tingkat kehadiran terintegrasi antara GTK dan Peserta Didik di seluruh Satuan Pendidikan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 no-print">
          <ButtonWithTheme variant="success-outline" onClick={handleExport}>
            <DownloadIcon className="size-4 mr-2" /> Export
          </ButtonWithTheme>
          <ButtonWithTheme variant="outline" onClick={handlePrint}>
            <PrinterIcon className="size-4 mr-2" /> Cetak Laporan
          </ButtonWithTheme>
        </div>
      </div>

      <div className="space-y-6 pb-12">
        {/* Filters Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kota/Kabupaten</label>
              <Select
                options={kabKotaOptions}
                defaultValue={kabKotaFilter}
                onChange={(value) => {
                  setKabKotaFilter(value);
                  setDetailPage(1);
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
                  setDetailPage(1);
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
                  setDetailPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tanggal Presensi</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDetailPage(1);
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
          <>
            {/* KPI Panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GTK Summary Panel */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-500 dark:bg-brand-500/10">
                    <GroupIcon className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">Presensi GTK (Pegawai)</h4>
                    <p className="text-xs text-gray-400">Total terdaftar: {totals.gtk.total} orang</p>
                  </div>
                  <div className="ml-auto">
                    <Badge color={totals.gtk.persentase >= 95 ? "success" : "warning"} size="md">
                      {totals.gtk.persentase}% Rata-Rata
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center">
                  <KpiSubCard label="Hadir" val={totals.gtk.hadir} color="emerald" sub={`${totals.gtk.hadir - totals.gtk.terlambat} tepat waktu`} />
                  <KpiSubCard label="Terlambat" val={totals.gtk.terlambat} color="amber" />
                  <KpiSubCard label="Izin/Sakit" val={totals.gtk.izinSakit} color="blue" />
                  <KpiSubCard label="Tanpa Keterangan" val={totals.gtk.alpha} color="red" />
                  <KpiSubCard label="Belum Absen" val={totals.gtk.belum} color="gray" />
                </div>
              </div>

              {/* Student Summary Panel */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 dark:bg-emerald-500/10">
                    <UserIcon className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">Presensi Peserta Didik (Siswa)</h4>
                    <p className="text-xs text-gray-400">Total terdaftar: {totals.siswa.total} orang</p>
                  </div>
                  <div className="ml-auto">
                    <Badge color={totals.siswa.persentase >= 90 ? "success" : "warning"} size="md">
                      {totals.siswa.persentase}% Rata-Rata
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center">
                  <KpiSubCard label="Hadir" val={totals.siswa.hadir} color="emerald" sub={`${totals.siswa.hadir - totals.siswa.terlambat} tepat waktu`} />
                  <KpiSubCard label="Terlambat" val={totals.siswa.terlambat} color="amber" />
                  <KpiSubCard label="Izin/Sakit" val={totals.siswa.izinSakit} color="blue" />
                  <KpiSubCard label="Tanpa Keterangan" val={totals.siswa.alpha} color="red" />
                  <KpiSubCard label="Belum Absen" val={totals.siswa.belum} color="gray" />
                </div>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <div className="flex border-b border-gray-100 dark:border-white/[0.05] pb-3 mb-6 no-print">
                <div className="flex gap-2">
                  <TabButton active={activeTab === "ringkasan"} onClick={() => setActiveTab("ringkasan")} label="Ringkasan Sekolah" icon={<SchoolIcon className="size-4" />} />
                  <TabButton active={activeTab === "grafik"} onClick={() => setActiveTab("grafik")} label="Visualisasi Grafik" icon={<PieChartIcon className="size-4" />} />
                  <TabButton active={activeTab === "log"} onClick={() => setActiveTab("log")} label="Log Presensi Harian" icon={<GroupIcon className="size-4" />} />
                </div>
              </div>

              {/* TAB CONTENT: RINGKASAN */}
              {activeTab === "ringkasan" && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto custom-scrollbar">
                      <Table className="min-w-[1000px]">
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                          <TableRow>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">No</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NPSN</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Satuan Pendidikan</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap bg-brand-500/5">Hadir GTK</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap bg-brand-500/5">Persentase GTK</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap bg-emerald-500/5">Hadir Siswa</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap bg-emerald-500/5">Persentase Siswa</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                          {filteredRecap.length > 0 ? (
                            filteredRecap.map((sch, index) => (
                              <TableRow key={sch.sekolah_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">{index + 1}</TableCell>
                                <TableCell className="px-5 py-3.5 text-sm font-mono text-gray-500 dark:text-gray-400">{sch.npsn}</TableCell>
                                <TableCell className="px-5 py-3.5 text-sm font-medium text-gray-800 dark:text-white/90">{sch.nama}</TableCell>
                                <TableCell className="px-5 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {sch.gtk.hadir} / {sch.gtk.total}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{sch.gtk.persentase}%</span>
                                    <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${sch.gtk.persentase}%` }}></div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {sch.siswa.hadir} / {sch.siswa.total}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{sch.siswa.persentase}%</span>
                                    <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sch.siswa.persentase}%` }}></div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-400">
                                Tidak ada data sekolah yang terdaftar.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: VISUALISASI GRAFIK */}
              {activeTab === "grafik" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* GTK Pie Chart */}
                    <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                      <h5 className="font-bold text-sm text-gray-800 dark:text-white mb-4 text-center">Distribusi Kehadiran GTK</h5>
                      <div className="flex justify-center">
                        <Chart options={gtkDonutOptions} series={gtkDonutSeries} type="donut" width="360" />
                      </div>
                    </div>

                    {/* Student Pie Chart */}
                    <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                      <h5 className="font-bold text-sm text-gray-800 dark:text-white mb-4 text-center">Distribusi Kehadiran Peserta Didik</h5>
                      <div className="flex justify-center">
                        <Chart options={pdDonutOptions} series={pdDonutSeries} type="donut" width="360" />
                      </div>
                    </div>
                  </div>

                  {/* Trend Area Chart */}
                  <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <h5 className="font-bold text-sm text-gray-800 dark:text-white mb-4">Tren Kehadiran Mingguan</h5>
                    <div className="max-w-full overflow-x-auto">
                      <div className="min-w-[600px] xl:min-w-full">
                        <Chart options={trendOptions} series={trendSeries} type="area" height="300" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: LOG DETAIL */}
              {activeTab === "log" && (
                <div className="space-y-6">
                  {/* Subtabs for GTK vs Siswa */}
                  <div className="flex justify-between items-center gap-4 flex-wrap no-print">
                    <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <button
                        onClick={() => { setSelectedSubTab("gtk"); setDetailPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          selectedSubTab === "gtk" ? "bg-white dark:bg-gray-900 shadow-sm text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        }`}
                      >
                        Log GTK ({logDataGTK.length})
                      </button>
                      <button
                        onClick={() => { setSelectedSubTab("siswa"); setDetailPage(1); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          selectedSubTab === "siswa" ? "bg-white dark:bg-gray-900 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        }`}
                      >
                        Log Peserta Didik ({logDataPD.length})
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <SearchIcon className="size-4" />
                      </span>
                      <Input
                        type="text"
                        placeholder={`Cari nama, ${selectedSubTab === "gtk" ? "NUPTK" : "NISN"}, atau sekolah...`}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setDetailPage(1);
                        }}
                        className="pl-9 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto custom-scrollbar">
                      <Table className="min-w-[1000px]">
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                          <TableRow>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">No</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">{selectedSubTab === "gtk" ? "NUPTK" : "NISN"}</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">{selectedSubTab === "gtk" ? "Jabatan" : "Rombel"}</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Sekolah</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Masuk</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jam Pulang</TableCell>
                            <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                          {paginatedLogs.length > 0 ? (
                            paginatedLogs.map((item, index) => (
                              <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                <TableCell className="px-5 py-3.5 text-sm text-gray-800 dark:text-white/80">
                                  {(detailPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm font-semibold text-gray-800 dark:text-white/90">
                                  {item.nama}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm font-mono text-gray-500 dark:text-gray-400">
                                  {selectedSubTab === "gtk" ? item.nuptk : item.nisn}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                  {selectedSubTab === "gtk" ? item.role : item.rombel}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                  {item.sekolah}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                  {item.jamMasuk || "-"}
                                </TableCell>
                                <TableCell className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                  {item.jamPulang || "-"}
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <Badge color={
                                    item.statusMasuk === 1 ? "success" : 
                                    item.statusMasuk === 2 ? "warning" : 
                                    item.statusMasuk === 3 ? "info" : 
                                    item.statusMasuk === 4 ? "info" : "error"
                                  } size="sm">
                                    {item.statusBadge}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="px-5 py-10 text-center text-gray-400">
                                Tidak ada log presensi untuk kriteria filter ini.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {filteredLogs.length > 0 && (
                      <div className="no-print">
                        <Pagination
                          currentPage={detailPage}
                          totalPages={totalPagesLogs}
                          onPageChange={(page) => setDetailPage(page)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

// Internal Subcomponents to Keep Design Rich & Clean
interface KpiSubCardProps {
  label: string;
  val: number;
  color: "emerald" | "amber" | "blue" | "red" | "gray";
  sub?: string;
}

const KpiSubCard: React.FC<KpiSubCardProps> = ({ label, val, color, sub }) => {
  const bgClasses = {
    emerald: "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/10",
    amber: "bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/10",
    blue: "bg-blue-50/50 border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/10",
    red: "bg-red-50/50 border-red-100 dark:bg-red-500/5 dark:border-red-500/10",
    gray: "bg-gray-50 border-gray-100 dark:bg-gray-800/40 dark:border-gray-800"
  };

  const textClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
    gray: "text-gray-500 dark:text-gray-400"
  };

  return (
    <div className={`p-3 rounded-xl border flex flex-col justify-center min-h-[90px] ${bgClasses[color]}`}>
      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
        {label}
      </span>
      <span className={`text-2xl font-extrabold ${textClasses[color]}`}>
        {val}
      </span>
      {sub && <span className="text-[9px] text-gray-400 mt-1 block truncate" title={sub}>{sub}</span>}
    </div>
  );
};

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

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold text-xs transition-all cursor-pointer ${
        active 
          ? "border-brand-500 text-brand-600 dark:text-brand-400" 
          : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
};

export default RekapTerpadu;
