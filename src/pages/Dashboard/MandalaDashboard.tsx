import React, { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { mandalaService, MandalaSchool, SchoolSummary } from '../../services/mandalaService';
import { dapodikService } from '../../services/dapodikService';
import { 
  SchoolIcon, 
  GroupIcon, 
  UserIcon, 
  BoxIcon, 
  GridIcon, 
  ChevronDownIcon,
  SearchIcon
} from '../../icons';
import Badge from '../../components/ui/badge/Badge';

export default function MandalaDashboard() {
  const [schools, setSchools] = useState<MandalaSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [summary, setSummary] = useState<SchoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchQuery] = useState("");

  const [globalGuru, setGlobalGuru] = useState<number | null>(null);
  const [globalTendik, setGlobalTendik] = useState<number | null>(null);
  const [globalSiswa, setGlobalSiswa] = useState<number | null>(null);

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSchools();
    fetchGlobalActiveStats();

    // Update clock every second
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const fetchGlobalActiveStats = async () => {
    try {
      // Panggil endpoint dengan limit 1 hanya untuk mendapatkan metadata "total_data" status aktif
      const [resSiswa, resGuru, resTendik] = await Promise.all([
        dapodikService.getPesertaDidik(1, '', 1, undefined, 'aktif'),
        dapodikService.getGTK(1, '', 1, 'guru', 'aktif'),
        dapodikService.getGTK(1, '', 1, 'tendik', 'aktif')
      ]);
      
      const getCount = (res: any) => {
        if (res?.meta?.total_data) return res.meta.total_data;
        if (res?.total) return res.total;
        if (Array.isArray(res?.data)) return res.data.length;
        return 0;
      };

      setGlobalSiswa(getCount(resSiswa));
      setGlobalGuru(getCount(resGuru));
      setGlobalTendik(getCount(resTendik));
    } catch (err) {
      console.error("Gagal menarik metadata global statistik aktif:", err);
    }
  };

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mandalaService.getSchools();
      
      let fetchedSchools = [];
      if (response && (response.status === 'success' || response.success === true)) {
        fetchedSchools = response.data || [];
      } else if (Array.isArray(response)) {
        fetchedSchools = response;
      }

      setSchools(fetchedSchools);
      if (fetchedSchools.length > 0) {
        setSelectedSchool(fetchedSchools[0].sekolah_id);
      }
    } catch (err: any) {
      setError(err.response?.status === 401 ? "Otentikasi Gagal: Silakan periksa API Key Anda." : "Gagal memuat data dari server pusat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchool) {
      fetchSummary(selectedSchool);
    }
  }, [selectedSchool]);

  const fetchSummary = async (id: string) => {
    try {
      setSummaryLoading(true);
      const response = await mandalaService.getSchoolSummary(id);
      if (response && (response.status === 'success' || response.success === true)) {
        setSummary(response.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Gagal mengambil ringkasan sekolah:', err);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const filteredSchools = schools.filter(s => 
    s.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.npsn?.includes(searchTerm)
  );

  const totalSiswaGlobal = schools.reduce((acc, curr) => acc + (curr.total_siswa || curr.jumlah_siswa || 0), 0);
  const displaySiswa = globalSiswa !== null ? globalSiswa : 0;
  const displayGuru = globalGuru !== null ? globalGuru : 0;
  const displayTendik = globalTendik !== null ? globalTendik : 0;

  // Statistik Sebaran Kecamatan
  const kecamatanCounts = schools.reduce((acc: Record<string, number>, curr) => {
    const kec = curr.kecamatan || 'Tidak Diketahui';
    acc[kec] = (acc[kec] || 0) + 1;
    return acc;
  }, {});

  const kecamatanStats = Object.entries(kecamatanCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const maxKecamatanCount = kecamatanStats.length > 0 ? kecamatanStats[0].count : 1;

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
            <h1 className="text-2xl font-bold md:text-3xl">Pusat Data Mandala</h1>
            <p className="mt-2 max-w-xl text-brand-100">
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
            color="blue" 
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
            color="blue" 
          />
          <OverviewCard 
            title="Total Tendik (Aktif)" 
            value={displayTendik.toLocaleString()} 
            icon={<BoxIcon className="size-6" />} 
            color="blue" 
          />
        </div>

        {/* Sebaran Kecamatan */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
          <h3 className="mb-5 font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <GridIcon className="size-5 text-brand-500" />
            Sebaran Sekolah Berdasarkan Kecamatan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kecamatanStats.length > 0 ? (
              kecamatanStats.map((stat, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{stat.name}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{stat.count} Sekolah</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-brand-500 transition-all duration-1000 ease-out"
                      style={{ width: `${(stat.count / maxKecamatanCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">Data kecamatan belum tersedia.</p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800/30 dark:bg-red-500/10">
            <p className="flex items-center gap-2 font-medium">
              <span className="text-xl">⚠️</span> {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* School Selector & Explorer */}
          <div className="col-span-12 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Eksplorasi Sekolah</h3>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Cari sekolah atau NPSN..."
                      className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:bg-gray-800"
                      value={searchTerm}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Badge color="light" size="sm" className="whitespace-nowrap">{filteredSchools.length} Sekolah</Badge>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-gray-50 dark:bg-gray-800"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                  {filteredSchools.map((school) => (
                    <div
                      key={school.sekolah_id}
                      className="group w-full rounded-xl p-4 text-left border bg-white border-gray-100 hover:border-brand-300 hover:shadow-sm dark:bg-gray-900/40 dark:border-gray-800 transition-all flex flex-col justify-between h-full"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-gray-800">
                          <SchoolIcon className="size-6" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate font-semibold text-gray-800 dark:text-white" title={school.nama}>
                            {school.nama}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{school.npsn}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-gray-800">
                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <UserIcon className="size-3.5" />
                            <span>{(school.total_siswa || 0).toLocaleString()} Siswa</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <GroupIcon className="size-3.5" />
                            <span>{(school.total_gtk || 0).toLocaleString()} GTK</span>
                         </div>
                      </div>
                    </div>
                  ))}
                  {filteredSchools.length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-400">
                      <p className="text-sm italic">Sekolah tidak ditemukan.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OverviewCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const themes: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
  };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-6 shadow-sm bg-white dark:bg-white/[0.03] ${themes[color]}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${themes[color]} brightness-95`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium opacity-70">{title}</p>
        <h4 className="text-2xl font-bold">{value}</h4>
      </div>
    </div>
  );
}
