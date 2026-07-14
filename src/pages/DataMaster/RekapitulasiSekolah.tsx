import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { dapodikService } from "../../services/dapodikService";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { formatJenjang } from "../../utils/dapodikUtils";
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, SchoolIcon, EyeIcon } from "../../icons";

interface SchoolItem {
  sekolah_id: string;
  nama: string;
  npsn: string;
  jenjang: string;
  status: "negeri" | "swasta";
}

interface KecamatanItem {
  kecamatan: string;
  schools: SchoolItem[];
}

interface KabupatenStats {
  kabupaten: string;
  sma: { negeri: number; swasta: number };
  smk: { negeri: number; swasta: number };
  slb: { negeri: number; swasta: number };
  total: number;
  kecamatanList: KecamatanItem[];
}

export default function RekapitulasiSekolah() {
  const { role } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<KabupatenStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKabupaten, setExpandedKabupaten] = useState<Record<string, boolean>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  
  const [totals, setTotals] = useState({
    sma: { negeri: 0, swasta: 0 },
    smk: { negeri: 0, swasta: 0 },
    slb: { negeri: 0, swasta: 0 },
    total: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await dapodikService.getSekolah();
      let schools = [];
      
      if (response.status === 'success' || response.success === true) {
        schools = response.data || [];
      } else if (Array.isArray(response)) {
        schools = response;
      } else if (response.data && Array.isArray(response.data)) {
        schools = response.data;
      }

      // Grouping by Kabupaten
      const kabMap: Record<string, {
        sma: { negeri: number; swasta: number };
        smk: { negeri: number; swasta: number };
        slb: { negeri: number; swasta: number };
        kecamatanMap: Record<string, SchoolItem[]>;
      }> = {};

      schools.forEach((school: any) => {
        const jenjang = formatJenjang(school).toUpperCase();
        // Only include SMA, SMK, and SLB
        if (jenjang !== "SMA" && jenjang !== "SMK" && jenjang !== "SLB") {
          return;
        }

        const kab = school.kabupaten_kota || school.kabupate_kota || "Tidak Diketahui";
        const kec = school.kecamatan || "Tidak Diketahui";
        const status = (school.status_sekolah || "").trim().toLowerCase() === "negeri" || school.status_sekolah === "1" || school.status_sekolah === 1 ? "negeri" : "swasta";

        if (!kabMap[kab]) {
          kabMap[kab] = {
            sma: { negeri: 0, swasta: 0 },
            smk: { negeri: 0, swasta: 0 },
            slb: { negeri: 0, swasta: 0 },
            kecamatanMap: {},
          };
        }

        // Increment stats
        if (jenjang === "SMA") {
          if (status === "negeri") kabMap[kab].sma.negeri++;
          else kabMap[kab].sma.swasta++;
        } else if (jenjang === "SMK") {
          if (status === "negeri") kabMap[kab].smk.negeri++;
          else kabMap[kab].smk.swasta++;
        } else if (jenjang === "SLB") {
          if (status === "negeri") kabMap[kab].slb.negeri++;
          else kabMap[kab].slb.swasta++;
        }

        // Add to Kecamatan
        if (!kabMap[kab].kecamatanMap[kec]) {
          kabMap[kab].kecamatanMap[kec] = [];
        }
        kabMap[kab].kecamatanMap[kec].push({
          sekolah_id: school.sekolah_id,
          nama: school.nama || "Sekolah Tanpa Nama",
          npsn: school.npsn || "-",
          jenjang: jenjang,
          status: status,
        });
      });

      // Format as sorted list
      const sortedData: KabupatenStats[] = Object.keys(kabMap)
        .map((kabName) => {
          const item = kabMap[kabName];
          const total = 
            item.sma.negeri + item.sma.swasta +
            item.smk.negeri + item.smk.swasta +
            item.slb.negeri + item.slb.swasta;

          const kecamatanList = Object.keys(item.kecamatanMap)
            .map((kecName) => ({
              kecamatan: kecName,
              schools: item.kecamatanMap[kecName].sort((a, b) => a.nama.localeCompare(b.nama)),
            }))
            .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

          return {
            kabupaten: kabName,
            sma: item.sma,
            smk: item.smk,
            slb: item.slb,
            total,
            kecamatanList,
          };
        })
        .sort((a, b) => a.kabupaten.localeCompare(b.kabupaten));

      // Calculate overall totals
      const overall = {
        sma: { negeri: 0, swasta: 0 },
        smk: { negeri: 0, swasta: 0 },
        slb: { negeri: 0, swasta: 0 },
        total: 0,
      };

      sortedData.forEach((k) => {
        overall.sma.negeri += k.sma.negeri;
        overall.sma.swasta += k.sma.swasta;
        overall.smk.negeri += k.smk.negeri;
        overall.smk.swasta += k.smk.swasta;
        overall.slb.negeri += k.slb.negeri;
        overall.slb.swasta += k.slb.swasta;
        overall.total += k.total;
      });

      setData(sortedData);
      setTotals(overall);
    } catch (error) {
      console.error("Gagal memuat rekapitulasi sekolah:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (kabName: string) => {
    setExpandedKabupaten((prev) => ({
      ...prev,
      [kabName]: !prev[kabName],
    }));
  };

  const handleSearchChange = (kabName: string, query: string) => {
    setSearchQueries((prev) => ({
      ...prev,
      [kabName]: query,
    }));
  };

  return (
    <div>
      <PageMeta
        title="Rekapitulasi Sekolah | SIMAK Admin Panel"
        description="Ringkasan rekapitulasi satuan pendidikan Mandala per kabupaten, jenjang, dan kecamatan secara detail"
      />

      <div className="space-y-6">
        {/* Header Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Rekapitulasi Satuan Pendidikan (SLB, SMA, SMK)
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ringkasan persebaran sekolah berdasarkan kabupaten, jenjang (SMA, SMK, SLB), status (Negeri/Swasta), dan wilayah kecamatan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Total Sekolah</span>
              <span className="text-base font-bold text-gray-800 dark:text-white/90">{totals.total}</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Total Negeri</span>
              <span className="text-base font-bold text-success-600 dark:text-success-400">
                {totals.sma.negeri + totals.smk.negeri + totals.slb.negeri}
              </span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Total Swasta</span>
              <span className="text-base font-bold text-warning-600 dark:text-orange-400">
                {totals.sma.swasta + totals.smk.swasta + totals.slb.swasta}
              </span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden shadow-sm relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 dark:bg-gray-950/75 backdrop-blur-xs">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-3"></div>
              <p className="font-medium text-gray-600 dark:text-gray-300 text-sm">Memuat rekapitulasi sekolah...</p>
            </div>
          )}

          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <Table className="min-w-[900px]">
              <TableHeader className="border-b border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader rowSpan={2} className="px-6 py-4 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                  <TableCell isHeader rowSpan={2} className="px-6 py-4 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kabupaten / Kota</TableCell>
                  <TableCell isHeader colSpan={2} className="px-6 py-2.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-850">SMA</TableCell>
                  <TableCell isHeader colSpan={2} className="px-6 py-2.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-850">SMK</TableCell>
                  <TableCell isHeader colSpan={2} className="px-6 py-2.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-850">SLB</TableCell>
                  <TableCell isHeader rowSpan={2} className="px-6 py-4 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-24">Total</TableCell>
                </TableRow>
                <TableRow className="bg-gray-50 dark:bg-white/[0.02]">
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-28 border-r border-gray-100 dark:border-white/[0.03]">Negeri</TableCell>
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap border-r border-gray-100 dark:border-white/[0.03]">Swasta</TableCell>
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-28 border-r border-gray-100 dark:border-white/[0.03]">Negeri</TableCell>
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap border-r border-gray-100 dark:border-white/[0.03]">Swasta</TableCell>
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-28 border-r border-gray-100 dark:border-white/[0.03]">Negeri</TableCell>
                  <TableCell isHeader className="px-6 py-2 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">Swasta</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.length > 0 ? (
                  <>
                    {data.map((item, idx) => {
                      const isExpanded = expandedKabupaten[item.kabupaten];
                      const searchQuery = searchQueries[item.kabupaten] || "";
                      
                      // Filtered Kecamatan schools count inside expand section
                      const matchingKecamatans = item.kecamatanList.map(kec => {
                        const filtered = kec.schools.filter(school =>
                          school.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          school.npsn.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        return { ...kec, schools: filtered };
                      }).filter(kec => kec.schools.length > 0);

                      return (
                        <React.Fragment key={item.kabupaten}>
                          {/* Main Row */}
                          <TableRow 
                            onClick={() => toggleExpand(item.kabupaten)}
                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer select-none"
                          >
                            <TableCell className="px-6 py-4.5 text-center text-gray-500 dark:text-gray-400 text-sm">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="px-6 py-4.5 text-start font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 shrink-0">
                                  {isExpanded ? (
                                    <ChevronUpIcon className="size-4.5" />
                                  ) : (
                                    <ChevronDownIcon className="size-4.5" />
                                  )}
                                </span>
                                <span className="text-gray-800 dark:text-white/90">{item.kabupaten}</span>
                              </div>
                            </TableCell>
                            {/* SMA Counts */}
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/[0.03]">
                              {item.sma.negeri.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/[0.03]">
                              {item.sma.swasta.toLocaleString()}
                            </TableCell>
                            {/* SMK Counts */}
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/[0.03]">
                              {item.smk.negeri.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/[0.03]">
                              {item.smk.swasta.toLocaleString()}
                            </TableCell>
                            {/* SLB Counts */}
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-white/[0.03]">
                              {item.slb.negeri.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4.5 text-center text-gray-600 dark:text-gray-400">
                              {item.slb.swasta.toLocaleString()}
                            </TableCell>
                            {/* Kabupaten Total */}
                            <TableCell className="px-6 py-4.5 text-center text-gray-900 dark:text-white font-semibold bg-gray-50/30 dark:bg-white/[0.01]">
                              {item.total.toLocaleString()}
                            </TableCell>
                          </TableRow>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <TableRow className="bg-gray-50/30 dark:bg-white/[0.01] hover:bg-transparent">
                              <TableCell colSpan={9} className="px-8 py-6">
                                <div className="space-y-4">
                                  {/* expanded header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/[0.05]">
                                    <div>
                                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                                        Daftar Sekolah & Kecamatan di {item.kabupaten}
                                      </h4>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        Menampilkan {item.kecamatanList.reduce((sum, k) => sum + k.schools.length, 0)} sekolah di {item.kecamatanList.length} kecamatan.
                                      </p>
                                    </div>
                                    
                                    {/* search schools bar */}
                                    <div className="relative max-w-xs w-full">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <SearchIcon className="size-4" />
                                      </span>
                                      <input
                                        type="text"
                                        placeholder="Cari sekolah atau NPSN..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(item.kabupaten, e.target.value)}
                                        onClick={(e) => e.stopPropagation()} // Prevent close row on click
                                        className="pl-9 pr-4 py-1.5 w-full text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white"
                                      />
                                    </div>
                                  </div>

                                  {/* schools grid list */}
                                  {matchingKecamatans.length > 0 ? (
                                    <div className="space-y-6">
                                      {matchingKecamatans.map((kec) => (
                                        <div key={kec.kecamatan} className="space-y-3">
                                          {/* kecamatan subtitle */}
                                          <div className="flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800/50">
                                            <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                              <SchoolIcon className="size-3.5 text-brand-500" />
                                              Kecamatan {kec.kecamatan}
                                            </h5>
                                            <Badge size="sm" color="primary">
                                              {kec.schools.length} Sekolah
                                            </Badge>
                                          </div>

                                          {/* school table list */}
                                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                                            <div className="max-w-full overflow-x-auto custom-scrollbar">
                                              <Table className="min-w-[600px]">
                                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.01]">
                                                  <TableRow>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-center text-theme-xs dark:text-gray-400 w-16">No</TableCell>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Sekolah</TableCell>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-36">NPSN</TableCell>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-28">Jenjang</TableCell>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-start text-theme-xs dark:text-gray-400 w-28">Status</TableCell>
                                                    <TableCell isHeader className="px-5 py-2.5 font-semibold text-gray-500 text-right text-theme-xs dark:text-gray-400 w-20">Aksi</TableCell>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                                  {kec.schools.map((school, schoolIdx) => (
                                                    <TableRow key={school.sekolah_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                                      <TableCell className="px-5 py-2.5 text-center text-sm text-gray-500">{schoolIdx + 1}</TableCell>
                                                      <TableCell className="px-5 py-2.5 text-start">
                                                        <span className="font-semibold text-gray-800 dark:text-white/90">{school.nama}</span>
                                                      </TableCell>
                                                      <TableCell className="px-5 py-2.5 text-start text-theme-sm text-gray-500 font-mono">{school.npsn}</TableCell>
                                                      <TableCell className="px-5 py-2.5 text-start">
                                                        <Badge 
                                                          size="sm" 
                                                          color={
                                                            school.jenjang === "SMA" ? "primary" : 
                                                            school.jenjang === "SMK" ? "success" : "warning"
                                                          }
                                                        >
                                                          {school.jenjang}
                                                        </Badge>
                                                      </TableCell>
                                                      <TableCell className="px-5 py-2.5 text-start">
                                                        <Badge 
                                                          size="sm" 
                                                          variant="solid" 
                                                          color={school.status === "negeri" ? "success" : "warning"}
                                                        >
                                                          {school.status === "negeri" ? "Negeri" : "Swasta"}
                                                        </Badge>
                                                      </TableCell>
                                                      <TableCell className="px-5 py-2.5 text-right">
                                                        <button 
                                                          onClick={() => navigate(`/${role}/satuan-pendidikan/detail/${school.sekolah_id}`)}
                                                          className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                                                          title="Lihat Detail"
                                                        >
                                                          <EyeIcon className="size-4.5" />
                                                        </button>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50/50 dark:bg-white/[0.01] border border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                                      Tidak ada sekolah yang cocok dengan pencarian di kabupaten ini.
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Cumulative Sum Row */}
                    <TableRow className="bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-gray-850 font-bold text-gray-900 dark:text-white select-none">
                      <TableCell className="px-6 py-4 text-center">{""}</TableCell>
                      <TableCell className="px-6 py-4 text-start">
                        <span className="uppercase text-xs tracking-wider font-extrabold text-gray-700 dark:text-gray-300">Total Kumulatif</span>
                      </TableCell>
                      {/* SMA */}
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.sma.negeri.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.sma.swasta.toLocaleString()}
                      </TableCell>
                      {/* SMK */}
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.smk.negeri.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.smk.swasta.toLocaleString()}
                      </TableCell>
                      {/* SLB */}
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.slb.negeri.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center border-r border-gray-200 dark:border-gray-850 text-sm">
                        {totals.slb.swasta.toLocaleString()}
                      </TableCell>
                      {/* Grand Total */}
                      <TableCell className="px-6 py-4 text-center text-brand-600 dark:text-brand-400 font-extrabold bg-brand-50/20 dark:bg-brand-500/[0.02] text-sm">
                        {totals.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      {!loading && "Tidak ada data rekapitulasi sekolah ditemukan"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
