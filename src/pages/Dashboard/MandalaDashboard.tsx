import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import PageMeta from '../../components/common/PageMeta';
import { mandalaService, MandalaSchool, Pelaporan, Antrian, AntrianRekap } from '../../services/mandalaService';
import { dapodikService } from '../../services/dapodikService';
import { useAuth } from '../../context/AuthContext';
import { useSekolah } from '../../context/SekolahContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { 
  SchoolIcon, 
  GroupIcon, 
  UserIcon, 
  BoxIcon, 
  GridIcon, 
  ArrowRightIcon,
  TimeIcon
} from '../../icons';

// Status color mapping for guest queue
const QUEUE_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Menunggu", color: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" },
  1: { label: "Dipanggil", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  2: { label: "Dilayani", color: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400" },
  3: { label: "Selesai", color: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400" },
  4: { label: "Batal", color: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400" },
};

const getRelativeTimeString = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return "Baru saja";
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) {
    return "Baru saja";
  } else if (diffMin < 60) {
    return `${diffMin} menit yang lalu`;
  } else if (diffHour < 24) {
    return `${diffHour} jam yang lalu`;
  } else if (diffDay < 7) {
    return `${diffDay} hari yang lalu`;
  } else if (diffWeek < 4) {
    return `${diffWeek} minggu yang lalu`;
  } else if (diffMonth < 12) {
    return `${diffMonth} bulan yang lalu`;
  } else {
    return `${diffYear} tahun yang lalu`;
  }
};

export default function MandalaDashboard() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { user } = useAuth();
  const { sekolah } = useSekolah();
  const { settings } = useSystemSettings();
  const roleSlug = role || 'admin';
  const isOperator = user?.role?.toLowerCase().includes("operator");

  // Global School List
  const [schools, setSchools] = useState<MandalaSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest Queue (Antrian) States
  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [antrianRekap, setAntrianRekap] = useState<AntrianRekap | null>(null);
  const [loadingAntrian, setLoadingAntrian] = useState(false);

  // Document Reporting (Pelaporan) States
  const [pelaporan, setPelaporan] = useState<Pelaporan[]>([]);
  const [loadingPelaporan, setLoadingPelaporan] = useState(false);

  // Global statistics totals
  const [globalGuru, setGlobalGuru] = useState<number | null>(null);
  const [globalTendik, setGlobalTendik] = useState<number | null>(null);
  const [globalSiswa, setGlobalSiswa] = useState<number | null>(null);
  const [globalRombel, setGlobalRombel] = useState<number | null>(null);

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Instansi Name Resolution State
  const [instansiName, setInstansiName] = useState<string>("Mandala Internal");

  useEffect(() => {
    if (user) {
      const userObj = user as any;
      const isOperatorUser = user.role?.toLowerCase().includes("operator");
      if (isOperatorUser) {
        if (sekolah?.nama) {
          setInstansiName(sekolah.nama);
        } else if (userObj.sekolah) {
          setInstansiName(userObj.sekolah);
        } else if (userObj.cadisdik) {
          setInstansiName(userObj.cadisdik);
        } else {
          setInstansiName("Sekolah Anda");
        }
      } else {
        if (userObj.cadisdik) {
          setInstansiName(userObj.cadisdik);
        } else if (userObj.sekolah) {
          setInstansiName(userObj.sekolah);
        } else if (sekolah?.nama) {
          setInstansiName(sekolah.nama);
        } else {
          setInstansiName("Mandala Internal");
        }
      }
    }
  }, [user, sekolah]);

  // Operator School Summary State
  const [operatorSummary, setOperatorSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const getCountHelper = (res: unknown) => {
    if (!res) return 0;
    const r = res as { meta?: { total_data?: number; total?: number }; total?: number; data?: unknown[] };
    if (r.meta?.total_data) return r.meta.total_data;
    if (r.meta?.total) return r.meta.total;
    if (r.total) return r.total;
    if (Array.isArray(r.data)) return r.data.length;
    return 0;
  };

  const fetchGlobalActiveStats = useCallback(async () => {
    try {
      const isOperator = user?.role?.toLowerCase().includes("operator");
      const targetSekolahId = isOperator ? (sekolah?.sekolah_id || user?.instansi_id) : user?.instansi_id;

      const [resSiswa, resGuru, resTendik, resRombel] = await Promise.all([
        dapodikService.getPesertaDidik(1, '', 1, undefined, 'aktif', undefined, targetSekolahId),
        dapodikService.getGTK(1, '', 1, 'guru', 'aktif', targetSekolahId),
        dapodikService.getGTK(1, '', 1, 'tendik', 'aktif', targetSekolahId),
        dapodikService.getRombonganBelajar('reguler', 1, 1, '', '', targetSekolahId).catch(() => null)
      ]);

      setGlobalSiswa(getCountHelper(resSiswa));
      setGlobalGuru(getCountHelper(resGuru));
      setGlobalTendik(getCountHelper(resTendik));
      setGlobalRombel(getCountHelper(resRombel));
    } catch (err) {
      console.error("Gagal menarik metadata global statistik aktif:", err);
    }
  }, [user, sekolah]);

  const fetchSchools = useCallback(async () => {
    try {
      setLoadingSchools(true);
      setError(null);
      const response = await mandalaService.getSchools();
      
      let fetchedSchools: MandalaSchool[] = [];
      if (response && (response.status === 'success' || response.success === true)) {
        fetchedSchools = response.data || [];
      } else if (Array.isArray(response)) {
        fetchedSchools = response;
      }

      const isOperator = user?.role?.toLowerCase().includes("operator");
      const targetSekolahId = isOperator ? (sekolah?.sekolah_id || user?.instansi_id) : user?.instansi_id;
      if (isOperator && targetSekolahId) {
        fetchedSchools = fetchedSchools.filter(s => s.sekolah_id === targetSekolahId);
      }

      // Fetch accurate real-time active student & GTK counts for each school
      const schoolsWithStats = await Promise.all(
        fetchedSchools.map(async (school) => {
          try {
            const [aktifRes, gtkRes] = await Promise.all([
              dapodikService.getPesertaDidik(1, "", 1, undefined, "aktif", undefined, school.sekolah_id),
              dapodikService.getGTK(1, "", 1, undefined, "aktif", school.sekolah_id)
            ]);
            
            const totalActiveStudents = getCountHelper(aktifRes);
            const totalActiveGTK = getCountHelper(gtkRes);
            
            return {
              ...school,
              total_siswa: totalActiveStudents,
              total_gtk: totalActiveGTK
            };
          } catch (err) {
            console.error(`Gagal mengambil data riil dapodik untuk sekolah ${school.sekolah_id}:`, err);
            return school;
          }
        })
      );

      setSchools(schoolsWithStats);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 401 ? "Otentikasi Gagal: Silakan periksa API Key Anda." : "Gagal memuat data dari server pusat.");
    } finally {
      setLoadingSchools(false);
    }
  }, [user, sekolah]);

  const fetchAntrianData = useCallback(async (cId: string) => {
    try {
      setLoadingAntrian(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [antrianRes, rekapRes] = await Promise.all([
        mandalaService.getAntrian({ 
          cadisdik_id: cId,
          start_date: todayStr,
          end_date: todayStr
        }),
        mandalaService.getAntrianRekap(cId)
      ]);
      setAntrian(antrianRes.data || []);
      setAntrianRekap(rekapRes.data || null);
    } catch (err) {
      console.error("Gagal memuat antrean di dashboard:", err);
    } finally {
      setLoadingAntrian(false);
    }
  }, []);

  const fetchPelaporanData = useCallback(async (cId: string) => {
    try {
      setLoadingPelaporan(true);
      const response = await mandalaService.getPelaporan(cId, 1, 5);
      
      let list: Pelaporan[] = [];
      if (Array.isArray(response)) {
        list = response;
      } else if (response && response.data) {
        if (Array.isArray(response.data)) {
          list = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          list = response.data.data;
        }
      }
      setPelaporan(list.slice(0, 4));
    } catch (err) {
      console.error("Gagal memuat pelaporan di dashboard:", err);
    } finally {
      setLoadingPelaporan(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
    fetchGlobalActiveStats();

    // Update clock every second
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchSchools, fetchGlobalActiveStats]);

  // Fetch Operator School Summary
  useEffect(() => {
    const fetchSummary = async () => {
      const targetSekolahId = isOperator ? (sekolah?.sekolah_id || user?.instansi_id) : user?.instansi_id;
      if (isOperator && targetSekolahId) {
        setLoadingSummary(true);
        try {
          const res = await mandalaService.getSchoolSummary(targetSekolahId);
          setOperatorSummary(res.data || res);
        } catch (err) {
          console.error("Gagal memuat ringkasan sekolah operator:", err);
        } finally {
          setLoadingSummary(false);
        }
      }
    };
    fetchSummary();
  }, [isOperator, user, sekolah]);

  // Fetch operational guest queues and document compliance list based on user's branch
  useEffect(() => {
    const initBranchData = async () => {
      const cadisdikId = user?.cadisdik_id;
      if (cadisdikId) {
        fetchAntrianData(cadisdikId);
        fetchPelaporanData(cadisdikId);
      } else {
        try {
          // If user doesn't have a designated branch, query list and use first branch
          const instansiRes = await dapodikService.getCadisdik();
          if (instansiRes?.data && instansiRes.data.length > 0) {
            const firstId = instansiRes.data[0].cadisdik_id;
            fetchAntrianData(firstId);
            fetchPelaporanData(firstId);
          }
        } catch (err) {
          console.error("Gagal inisialisasi instansi cadisdik:", err);
        }
      }
    };

    if (user) {
      initBranchData();
    }
  }, [user, fetchAntrianData, fetchPelaporanData]);

  const displaySiswa = globalSiswa !== null ? globalSiswa : 0;
  const displayGuru = globalGuru !== null ? globalGuru : 0;
  const displayTendik = globalTendik !== null ? globalTendik : 0;

  // Get Greeting based on current local hour
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Kecamatan Distribution Stats
  const kecamatanCounts = schools.reduce((acc: Record<string, number>, curr) => {
    const kec = curr.kecamatan || 'Tidak Diketahui';
    acc[kec] = (acc[kec] || 0) + 1;
    return acc;
  }, {});

  const kecamatanStats = Object.entries(kecamatanCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const maxKecamatanCount = kecamatanStats.length > 0 ? kecamatanStats[0].count : 1;

  // Accumulate totals for active students and GTK across all schools
  const totalSiswaAll = schools.reduce((acc, s) => acc + (s.total_siswa || s.jumlah_siswa || 0), 0);
  const totalGTKAll = schools.reduce((acc, s) => acc + (s.total_gtk || s.jumlah_guru || 0), 0);

  const siswaChartOptions: ApexOptions = {
    colors: ["#3b82f6"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 240,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%",
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString() + " Orang",
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
        fontWeight: "600",
        colors: ["#ffffff"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Semua Sekolah"],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "12px",
          fontFamily: "Outfit",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val.toLocaleString(),
        style: {
          fontFamily: "Outfit",
        },
      },
    },
    fill: {
      opacity: 0.9,
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toLocaleString() + " Siswa",
      },
    },
    grid: {
      borderColor: "#f2f4f7",
      strokeDashArray: 4,
    }
  };

  const siswaChartSeries = [
    {
      name: "Siswa Aktif",
      data: [totalSiswaAll],
    },
  ];

  const gtkChartOptions: ApexOptions = {
    colors: ["#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 240,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%",
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString() + " Orang",
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
        fontWeight: "600",
        colors: ["#ffffff"],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Semua Sekolah"],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "12px",
          fontFamily: "Outfit",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val.toLocaleString(),
        style: {
          fontFamily: "Outfit",
        },
      },
    },
    fill: {
      opacity: 0.9,
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toLocaleString() + " Orang GTK",
      },
    },
    grid: {
      borderColor: "#f2f4f7",
      strokeDashArray: 4,
    }
  };

  const gtkChartSeries = [
    {
      name: "GTK Aktif",
      data: [totalGTKAll],
    },
  ];

  // School Operational Status Ratio (Negeri vs Swasta)
  const negeriCount = schools.filter(s => s.status_sekolah === "1" || s.status_sekolah === 1 || s.status_sekolah?.toLowerCase() === "negeri").length;
  const swastaCount = schools.length - negeriCount;

  const donutChartOptions: ApexOptions = {
    colors: ["#10b981", "#f79009"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 220,
    },
    labels: ["Negeri", "Swasta"],
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Sekolah",
              fontSize: "12px",
              fontFamily: "Outfit",
              fontWeight: 600,
              color: "#667085",
              formatter: () => schools.length.toString(),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit",
    },
    tooltip: {
      y: {
        formatter: (val: number) => val + " Sekolah",
      },
    },
  };

  const donutChartSeries = [negeriCount, swastaCount];

  if (isOperator) {
    return (
      <OperatorDashboard 
        user={user} 
        sekolah={sekolah} 
        summary={operatorSummary} 
        loading={loadingSummary || loadingSchools} 
        timeString={timeString}
        dateString={dateString}
        getGreeting={getGreeting}
        roleSlug={roleSlug}
        schools={schools}
        siswaCount={globalSiswa || 0}
        guruCount={globalGuru || 0}
        tendikCount={globalTendik || 0}
        rombelCount={globalRombel || 0}
        instansiName={instansiName}
      />
    );
  }

  return (
    <>
      <PageMeta
        title="Mandala Dashboard | SIMAK Central"
        description="Monitoring multi-school via Mandala Schema"
      />
      
      <div className="space-y-6 pb-10">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-brand-500 p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm mb-3">
              📅 {instansiName}
            </span>
            <h1 className="text-2xl font-bold md:text-3xl tracking-tight">{getGreeting()}, {user?.nama || 'Administrator'}</h1>
            <p className="mt-2 max-w-xl text-brand-100 text-sm leading-relaxed">
              {isOperator 
                ? `Selamat datang di dashboard pemantauan sekolah ${sekolah?.nama || ''}. Kelola dan monitor data profil, GTK, dan peserta didik Anda secara real-time.`
                : `Selamat datang di dashboard pemantauan terpusat. Kelola dan monitor seluruh satuan pendidikan yang terintegrasi di bawah ekosistem ${settings?.appShortName || "Mandala"} secara real-time.`
              }
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-start md:items-end text-left md:text-right min-w-[220px]">
            <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl md:text-4xl font-mono font-bold tracking-tighter">{timeString}</span>
                <div className="h-10 w-[1px] bg-white/20 hidden md:block"></div>
                <div className="flex flex-col items-start text-left leading-none">
                    <span className="text-[10px] uppercase opacity-70 font-bold tracking-widest mb-1">WIB</span>
                    <span className="text-lg font-bold">29°C</span>
                </div>
            </div>
            <p className="text-xs md:text-sm text-brand-100 font-medium capitalize">{dateString}</p>
            <div className="flex items-center gap-2 mt-3 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm">
                <svg className="size-4 text-yellow-300 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
                <span className="text-[10px] uppercase font-bold tracking-wider">Cerah Berawan</span>
            </div>
          </div>

          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl"></div>
        </div>

        {/* Global Overview Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard 
            title="Satuan Pendidikan" 
            value={schools.length} 
            icon={<SchoolIcon className="size-6" />} 
            color="purple" 
          />
          <OverviewCard 
            title="Total Siswa (Aktif)" 
            value={displaySiswa.toLocaleString()} 
            icon={<UserIcon className="size-6" />} 
            color="blue" 
          />
          <OverviewCard 
            title="Total Guru (Aktif)" 
            value={displayGuru.toLocaleString()} 
            icon={<GroupIcon className="size-6" />} 
            color="emerald" 
          />
          <OverviewCard 
            title="Total Tendik (Aktif)" 
            value={displayTendik.toLocaleString()} 
            icon={<BoxIcon className="size-6" />} 
            color="orange" 
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800/30 dark:bg-red-500/10">
            <p className="flex items-center gap-2 font-medium">
              <span className="text-xl">⚠️</span> {error}
            </p>
          </div>
        )}

        {/* Cohesive Analytics Grid (Replacing School Exploration Directory) */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Column Left: Visual Analytics & Campaign Tracker (7/12) */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
                 {/* Split Charts (Siswa and GTK) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Siswa Chart */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <UserIcon className="size-4.5 text-blue-500" />
                      Grafik Total Siswa Aktif
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400">Total akumulasi seluruh siswa aktif dari semua sekolah.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      Total: {totalSiswaAll.toLocaleString()} Orang
                    </span>
                  </div>
                </div>
                <div className="h-[240px] w-full mt-4">
                  {loadingSchools ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                  ) : schools.length > 0 ? (
                    <div className="-ml-3">
                      <Chart options={siswaChartOptions} series={siswaChartSeries} type="bar" height={240} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                      Data sekolah tidak ditemukan.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: GTK Chart */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <GroupIcon className="size-4.5 text-emerald-500" />
                      Grafik Total GTK Aktif
                    </h3>
                  </div>
                  <p className="text-[10px] text-gray-400">Total akumulasi seluruh GTK aktif dari semua sekolah.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Total: {totalGTKAll.toLocaleString()} Orang
                    </span>
                  </div>
                </div>
                <div className="h-[240px] w-full mt-4">
                  {loadingSchools ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                    </div>
                  ) : schools.length > 0 ? (
                    <div className="-ml-3">
                      <Chart options={gtkChartOptions} series={gtkChartSeries} type="bar" height={240} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                      Data sekolah tidak ditemukan.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 10 Sekolah Terakhir Sinkron */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <SchoolIcon className="size-5 text-brand-500" />
                    10 Sekolah Terakhir Sinkron
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Daftar satuan pendidikan yang terakhir kali melakukan sinkronisasi data.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {loadingSchools ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-gray-50 dark:bg-gray-800/40"></div>
                  ))
                ) : schools.length > 0 ? (
                  schools
                    .slice()
                    .sort((a, b) => {
                      const timeA = a.last_update ? new Date(a.last_update).getTime() : 0;
                      const timeB = b.last_update ? new Date(b.last_update).getTime() : 0;
                      return timeB - timeA;
                    })
                    .slice(0, 10)
                    .map((school) => {
                      const relativeTime = getRelativeTimeString(school.last_update);
                      return (
                        <div 
                          key={school.sekolah_id}
                          className="p-4 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-gray-800/80 hover:border-brand-300 dark:hover:border-brand-500/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate" title={school.nama}>
                              {school.nama}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                              <span>NPSN: {school.npsn}</span>
                              <span>•</span>
                              <span>{school.kecamatan || school.kabupaten_kota}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                            <div className="text-right">
                              <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 rounded-full">
                                {relativeTime}
                              </span>
                              <span className="text-[9px] text-gray-400 block font-medium mt-1">Terakhir Update</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-8 text-center text-gray-400 text-xs italic">
                    Belum ada data sekolah yang melakukan sinkronisasi.
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* Column Right: School Ratios, Kecamatan Bars & Real-Time Queue Monitor (5/12) */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            
            {/* Sebaran Status Sekolah */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              
              {/* Ratio Status Donut Chart */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                  <GridIcon className="size-4.5 text-brand-500" />
                  Rasio Status Satuan Pendidikan (Negeri & Swasta)
                </h3>
                <div className="h-[220px] flex items-center justify-center">
                  {loadingSchools ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                  ) : schools.length > 0 ? (
                    <Chart options={donutChartOptions} series={donutChartSeries} type="donut" height={220} />
                  ) : (
                    <div className="text-gray-400 text-xs italic">Data sekolah kosong</div>
                  )}
                </div>
              </div>
            </div>

            {/* Monitor Real-time Antrian Tamu */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <TimeIcon className="size-4.5 text-brand-500" />
                    Monitor Real-time Antrian Tamu
                  </h3>
                  <span className="text-[10px] bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 font-bold px-2 py-0.5 rounded-full animate-pulse">
                    Live
                  </span>
                </div>

                {/* mini rekap cards grid */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div className="p-2 bg-gray-50/50 dark:bg-white/[0.01] rounded-lg border border-gray-100 dark:border-gray-800 text-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Antrean</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">{antrianRekap?.total || 0}</span>
                  </div>
                  <div className="p-2 bg-blue-50/20 dark:bg-blue-500/5 rounded-lg border border-blue-100/30 dark:border-blue-500/10 text-center">
                    <span className="text-[9px] text-blue-500 font-bold uppercase block tracking-wider">Menunggu</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">{antrianRekap?.menunggu || 0}</span>
                  </div>
                  <div className="p-2 bg-warning-50/20 dark:bg-warning-500/5 rounded-lg border border-warning-100/30 dark:border-warning-500/10 text-center">
                    <span className="text-[9px] text-warning-500 font-bold uppercase block tracking-wider">Dilayani</span>
                    <span className="text-base font-bold text-warning-600 dark:text-warning-400">{antrianRekap?.dilayani || 0}</span>
                  </div>
                </div>

                {/* Queue list feed */}
                <div className="space-y-2.5">
                  {loadingAntrian ? (
                    <div className="py-8 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                    </div>
                  ) : antrian.length > 0 ? (
                    antrian.slice(0, 3).map((item) => (
                      <div 
                        key={item.id || item.antrian_id}
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="text-base font-extrabold text-brand-500 shrink-0">#{item.nomor_antrian}</span>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                              {item.nama_lengkap}
                            </h4>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.unit_instansi || "Pribadi/Umum"}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium shrink-0 ${QUEUE_STATUS_MAP[item.status]?.color || 'bg-gray-100'}`}>
                          {QUEUE_STATUS_MAP[item.status]?.label || 'Menunggu'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-xs italic bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-dashed border-gray-100 dark:border-gray-800">
                      Belum ada antrian tamu hari ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => navigate(`/${roleSlug}/daftar-antrian`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md hover:shadow-lg active:scale-95 duration-150 cursor-pointer text-xs"
                >
                  <span>Kelola Antrian Tamu</span>
                  <ArrowRightIcon className="size-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

function OverviewCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const iconThemes: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconThemes[color] || iconThemes.blue}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h4>
      </div>
    </div>
  );
}

interface OperatorDashboardProps {
  user: any;
  sekolah: any;
  summary: any;
  loading: boolean;
  timeString: string;
  dateString: string;
  getGreeting: () => string;
  roleSlug: string;
  schools: any[];
  siswaCount: number;
  guruCount: number;
  tendikCount: number;
  rombelCount: number;
  instansiName: string;
}

function OperatorDashboard({
  user,
  sekolah,
  summary,
  loading,
  timeString,
  dateString,
  getGreeting,
  roleSlug,
  schools,
  siswaCount,
  guruCount,
  tendikCount,
  rombelCount,
  instansiName,
}: OperatorDashboardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  // 1. Guru vs Tendik Donut Chart Configuration
  const jumlahGuru = guruCount || summary?.statistik?.jumlah_guru || 0;
  const jumlahTendik = tendikCount || summary?.statistik?.jumlah_tendik || 0;
  const totalGtk = jumlahGuru + jumlahTendik;

  const donutOptions: ApexOptions = {
    colors: ["#10b981", "#f79009"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 260,
    },
    labels: ["Guru", "Tendik"],
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total GTK",
              fontSize: "12px",
              fontFamily: "Outfit",
              fontWeight: 600,
              color: "#667085",
              formatter: () => totalGtk.toString(),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit",
    },
    tooltip: {
      y: {
        formatter: (val: number) => val + " Orang",
      },
    },
  };
  const donutSeries = [jumlahGuru, jumlahTendik];

  // 2. Student vs GTK Bar Chart Configuration
  const totalSiswa = siswaCount || summary?.statistik?.jumlah_siswa || 0;

  const barOptions: ApexOptions = {
    colors: ["#3b82f6"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 240,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "50%",
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString(),
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
        fontWeight: "600",
        colors: ["#ffffff"],
      },
    },
    xaxis: {
      categories: ["Siswa", "GTK"],
      labels: {
        style: {
          fontFamily: "Outfit",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          fontFamily: "Outfit",
          fontWeight: 600,
        },
      },
    },
    grid: {
      borderColor: "#f2f4f7",
      strokeDashArray: 4,
    }
  };
  const barSeries = [
    {
      name: "Total",
      data: [totalSiswa, totalGtk],
    },
  ];

  const targetSekolahId = sekolah?.sekolah_id || user?.instansi_id;
  const mySchoolObj = schools.find((s: any) => s.sekolah_id === targetSekolahId);
  const lastSyncTime = mySchoolObj?.last_update ? getRelativeTimeString(mySchoolObj.last_update) : "1 hari yang lalu";

  return (
    <>
      <PageMeta
        title={`Dashboard Operator | ${sekolah?.nama || "SIMAK"}`}
        description="Bespoke School Operator Command Center"
      />

      <div className="space-y-6 pb-10">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-brand-500 p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm mb-3">
              🏫 {instansiName}
            </span>
            <h1 className="text-2xl font-bold md:text-3xl tracking-tight">
              {getGreeting()}, {user?.nama || "Operator"}
            </h1>
            <p className="mt-2 max-w-xl text-brand-100 text-sm leading-relaxed">
              Anda login sebagai Operator Sekolah untuk <strong>{sekolah?.nama || (user as any)?.sekolah || "Sekolah Anda"}</strong>. Kelola dan monitor data profil, GTK, serta peserta didik Anda secara real-time.
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-start md:items-end text-left md:text-right min-w-[220px]">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl md:text-4xl font-mono font-bold tracking-tighter">
                {timeString}
              </span>
              <div className="h-10 w-[1px] bg-white/20 hidden md:block"></div>
              <div className="flex flex-col items-start text-left leading-none">
                <span className="text-[10px] uppercase opacity-70 font-bold tracking-widest mb-1">
                  WIB
                </span>
                <span className="text-lg font-bold">29°C</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-brand-100 font-medium capitalize">
              {dateString}
            </p>
            <div className="flex items-center gap-2 mt-3 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm">
              <svg className="size-4 text-yellow-300 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Cerah Berawan
              </span>
            </div>
          </div>

          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl"></div>
        </div>

        {/* Scoped Overview Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            title="Total Siswa Aktif"
            value={totalSiswa.toLocaleString()}
            icon={<UserIcon className="size-6" />}
            color="blue"
          />
          <OverviewCard
            title="Total Guru Aktif"
            value={jumlahGuru.toLocaleString()}
            icon={<GroupIcon className="size-6" />}
            color="emerald"
          />
          <OverviewCard
            title="Total Tendik Aktif"
            value={jumlahTendik.toLocaleString()}
            icon={<BoxIcon className="size-6" />}
            color="orange"
          />
          <OverviewCard
            title="Rombongan Belajar"
            value={(rombelCount || summary?.statistik?.jumlah_rombel || 0).toLocaleString()}
            icon={<SchoolIcon className="size-6" />}
            color="purple"
          />
        </div>

        {/* Visual Charts & Facility Information Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Column Left: Facility & Quick Links (7/12) */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Siswa & GTK Chart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                <BoxIcon className="size-4.5 text-blue-500" />
                Grafik Jumlah Siswa & GTK
              </h3>
              <p className="text-xs text-gray-400">
                Data sebaran jumlah total siswa aktif dan tenaga pendidik/kependidikan.
              </p>
              <div className="h-[240px] w-full mt-4">
                <Chart options={barOptions} series={barSeries} type="bar" height={240} />
              </div>
            </div>

            {/* Quick Links Menu */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <GridIcon className="size-4.5 text-brand-500" />
                Pintasan Pintar (Quick Shortcuts)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickLinkButton
                  title="Kelola Guru"
                  description="Akses daftar, edit, dan tambah guru aktif."
                  onClick={() => navigate(`/${roleSlug}/gtk/guru?tab=guru`)}
                  color="emerald"
                />
                <QuickLinkButton
                  title="Kelola Tendik"
                  description="Kelola tenaga administrasi sekolah."
                  onClick={() => navigate(`/${roleSlug}/gtk/tendik?tab=tendik`)}
                  color="orange"
                />
                <QuickLinkButton
                  title="Peserta Didik"
                  description="Akses registrasi dan data induk siswa."
                  onClick={() => navigate(`/${roleSlug}/peserta-didik/data?tab=aktif`)}
                  color="blue"
                />
                <QuickLinkButton
                  title="Profil Instansi"
                  description="Lihat & cetak detail identitas satuan pendidikan."
                  onClick={() => navigate(`/${roleSlug}/profil-instansi`)}
                  color="purple"
                />
              </div>
            </div>
          </div>

          {/* Column Right: Donut Chart & Connection Summary (5/12) */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Donut Chart: Guru & Tendik */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <GroupIcon className="size-4.5 text-brand-500" />
                Rasio Kepegawaian (Guru & Tendik)
              </h3>
              <div className="h-[260px] flex items-center justify-center">
                <Chart options={donutOptions} series={donutSeries} type="donut" height={260} />
              </div>
            </div>

            {/* Terakhir Sinkron Sekolah Ini */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <TimeIcon className="size-4.5 text-brand-500" />
                Terakhir Sinkron Sekolah Ini
              </h3>

              <div className="p-4 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Waktu Sinkronisasi</span>
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {lastSyncTime}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  Sinkron
                </span>
              </div>

              <div className="p-4 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Status Integrasi</span>
                  <span className="text-sm font-bold text-success-600 dark:text-success-400">
                    Koneksi Aktif
                  </span>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-success-500 animate-pulse"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickLinkButton({
  title,
  description,
  onClick,
  color,
}: {
  title: string;
  description: string;
  onClick: () => void;
  color: "blue" | "emerald" | "orange" | "purple";
}) {
  const borderColors = {
    blue: "hover:border-blue-500/30 hover:bg-blue-50/10 dark:hover:bg-blue-500/5",
    emerald: "hover:border-emerald-500/30 hover:bg-emerald-50/10 dark:hover:bg-emerald-500/5",
    orange: "hover:border-orange-500/30 hover:bg-orange-50/10 dark:hover:bg-orange-500/5",
    purple: "hover:border-purple-500/30 hover:bg-purple-50/10 dark:hover:bg-purple-500/5",
  };

  const badgeColors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-left transition-all duration-200 flex flex-col justify-between h-28 cursor-pointer ${borderColors[color]}`}
    >
      <div className="flex justify-between items-start w-full">
        <span className="font-bold text-sm text-gray-800 dark:text-white">{title}</span>
        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${badgeColors[color]}`}>
          Akses
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate w-full">
        {description}
      </p>
    </button>
  );
}
