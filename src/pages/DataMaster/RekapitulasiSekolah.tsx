import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { dapodikService } from "../../services/dapodikService";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";

interface RekapItem {
  kecamatan: string;
  negeri: number;
  swasta: number;
  total: number;
}

export default function RekapitulasiSekolah() {
  const [data, setData] = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ negeri: 0, swasta: 0, total: 0 });

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

      // Group by Kecamatan
      const grouped: Record<string, { negeri: number; swasta: number }> = {};
      let totalNegeri = 0;
      let totalSwasta = 0;
      let totalAll = 0;

      schools.forEach((school: any) => {
        const kec = school.kecamatan?.trim() || "Tidak Diketahui";
        const status = school.status_sekolah?.trim().toLowerCase() === "negeri" ? "negeri" : "swasta";
        
        if (!grouped[kec]) {
          grouped[kec] = { negeri: 0, swasta: 0 };
        }
        
        if (status === "negeri") {
          grouped[kec].negeri += 1;
          totalNegeri += 1;
        } else {
          grouped[kec].swasta += 1;
          totalSwasta += 1;
        }
        totalAll += 1;
      });

      // Convert to array and sort by Kecamatan name
      const sortedData: RekapItem[] = Object.keys(grouped)
        .map((kec) => ({
          kecamatan: kec,
          negeri: grouped[kec].negeri,
          swasta: grouped[kec].swasta,
          total: grouped[kec].negeri + grouped[kec].swasta,
        }))
        .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

      setData(sortedData);
      setTotals({ negeri: totalNegeri, swasta: totalSwasta, total: totalAll });
    } catch (error) {
      console.error("Gagal memuat rekapitulasi sekolah:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageMeta
        title="Rekapitulasi Sekolah | SIMAK Admin Panel"
        description="Ringkasan rekapitulasi satuan pendidikan Mandala per kecamatan"
      />
      <PageBreadcrumb pageTitle="Rekapitulasi Sekolah" />

      <div className="space-y-6">
        {/* Header Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
              Rekapitulasi Satuan Pendidikan
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ringkasan persebaran sekolah berdasarkan wilayah kecamatan secara real-time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Total Sekolah</span>
              <span className="text-base font-medium text-gray-800 dark:text-white/90">{totals.total}</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Negeri</span>
              <span className="text-base font-medium text-success-600 dark:text-success-400">{totals.negeri}</span>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col">
              <span className="text-gray-400 uppercase text-[9px] mb-0.5">Swasta</span>
              <span className="text-base font-medium text-warning-600 dark:text-orange-400">{totals.swasta}</span>
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
            <Table className="min-w-[700px]">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-20">No</TableCell>
                  <TableCell isHeader className="px-6 py-3.5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kecamatan</TableCell>
                  <TableCell isHeader className="px-6 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-40">Negeri</TableCell>
                  <TableCell isHeader className="px-6 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-40">Swasta</TableCell>
                  <TableCell isHeader className="px-6 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap w-40">Total</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.length > 0 ? (
                  <>
                    {data.map((item, idx) => (
                      <TableRow key={item.kecamatan} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <TableCell className="px-6 py-3 text-center text-gray-500 dark:text-gray-400 text-sm">{idx + 1}</TableCell>
                        <TableCell className="px-6 py-3 text-start">
                          <span className="text-gray-800 dark:text-white/90">{item.kecamatan}</span>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{item.negeri.toLocaleString()}</TableCell>
                        <TableCell className="px-6 py-3 text-center text-gray-600 dark:text-gray-400">{item.swasta.toLocaleString()}</TableCell>
                        <TableCell className="px-6 py-3 text-center text-gray-800 dark:text-white/90 font-medium bg-gray-50/30 dark:bg-white/[0.01]">{item.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {/* Sum Row */}
                    <TableRow className="bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-gray-800">
                      <TableCell className="px-6 py-4 text-center"></TableCell>
                      <TableCell className="px-6 py-4 text-start">
                        <span className="font-medium text-gray-900 dark:text-white uppercase text-sm">Total Kumulatif</span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center text-gray-900 dark:text-white font-medium">{totals.negeri.toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4 text-center text-gray-900 dark:text-white font-medium">{totals.swasta.toLocaleString()}</TableCell>
                      <TableCell className="px-6 py-4 text-center text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/20 dark:bg-brand-500/[0.02]">{totals.total.toLocaleString()}</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
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
