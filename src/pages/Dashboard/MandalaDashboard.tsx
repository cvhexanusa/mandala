import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import PageMeta from '../../components/common/PageMeta';
import { mandalaService, MandalaSchool, Pelaporan, Antrian, AntrianRekap } from '../../services/mandalaService';
import { dapodikService } from '../../services/dapodikService';
import { useAuth } from '../../context/AuthContext';
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

export default function MandalaDashboard() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { user } = useAuth();
  const roleSlug = role || 'admin';

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

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

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
      const [resSiswa, resGuru, resTendik] = await Promise.all([
        dapodikService.getPesertaDidik(1, '', 1, undefined, 'aktif'),
        dapodikService.getGTK(1, '', 1, 'guru', 'aktif'),
        dapodikService.getGTK(1, '', 1, 'tendik', 'aktif')
      ]);

      setGlobalSiswa(getCountHelper(resSiswa));
      setGlobalGuru(getCountHelper(resGuru));
      setGlobalTendik(getCountHelper(resTendik));
    } catch (err) {
      console.error("Gagal menarik metadata global statistik aktif:", err);
    }
  }, []);

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
  }, []);

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

  const barChartOptions: ApexOptions = {
    colors: ["#465fff", "#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 310,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%",
        borderRadius: 8,
        distributed: true,
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
      categories: ["Total Siswa Aktif", "Total GTK"],
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
      opacity: 1,
    },
    legend: {
      show: false,
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toLocaleString() + " Orang",
      },
    },
    grid: {
      borderColor: "#f2f4f7",
      strokeDashArray: 4,
    }
  };

  const barChartSeries = [
    {
      name: "Jumlah",
      data: [totalSiswaAll, totalGTKAll],
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
              📅 SIMAK Central Command Center
            </span>
            <h1 className="text-2xl font-bold md:text-3xl tracking-tight">{getGreeting()}, {user?.nama || 'Administrator'}</h1>
            <p className="mt-2 max-w-xl text-brand-100 text-sm leading-relaxed">
              Selamat datang di dashboard pemantauan terpusat. Kelola dan monitor seluruh satuan pendidikan yang terintegrasi di bawah ekosistem Mandala secara real-time.
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
            
            {/* Academic Comparison Chart (ApexCharts Bar) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <UserIcon className="size-5 text-brand-500" />
                  Grafik Seluruh Siswa dan GTK
                </h3>
                <p className="text-xs text-gray-400 mt-1">Total akumulasi seluruh siswa aktif dan GTK dari semua sekolah.</p>
              </div>
              <div className="h-[310px] w-full">
                {loadingSchools ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                  </div>
                ) : schools.length > 0 ? (
                  <div className="-ml-4">
                    <Chart options={barChartOptions} series={barChartSeries} type="bar" height={310} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Data sekolah tidak ditemukan.
                  </div>
                )}
              </div>
            </div>

            {/* Document Compliance Campaigns Tracker */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <BoxIcon className="size-5 text-brand-500" />
                    Tracker Kepatuhan Pelaporan Dokumen
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Daftar kampanye pelaporan aktif dan ringkasan dokumen terunggah.</p>
                </div>
                <Link 
                  to={`/${roleSlug}/pelaporan-dokumen`}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1"
                >
                  Lihat Semua
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
              
              <div className="space-y-3">
                {loadingPelaporan ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-gray-50 dark:bg-gray-800/40"></div>
                  ))
                ) : pelaporan.length > 0 ? (
                  pelaporan.map((item) => (
                    <div 
                      key={item.pelaporan_id}
                      className="p-4 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-gray-800/80 hover:border-brand-300 dark:hover:border-brand-500/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="overflow-hidden">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.aktif 
                            ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' 
                            : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                        } mb-1.5`}>
                          {item.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate" title={item.judul}>
                          {item.judul}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Batas Waktu: {item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString("id-ID") : "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {item.jumlah_dokumen}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium">Dokumen Terkumpul</span>
                        </div>
                        <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-800 hidden sm:block"></div>
                        <Link 
                          to={`/${roleSlug}/pelaporan-dokumen/detail/${item.pelaporan_id}`}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                        >
                          Detail
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 text-xs italic">
                    Belum ada kampanye pelaporan dokumen aktif.
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
