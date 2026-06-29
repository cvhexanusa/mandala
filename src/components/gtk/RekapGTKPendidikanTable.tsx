import { useState, useEffect } from "react";
import { dapodikService } from "../../services/dapodikService";
import { formatPendidikan } from "../../utils/dapodikUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RekapGTKPendidikan {
  id: number;
  pendidikan: string;
  lakiLaki: number;
  perempuan: number;
  totalJK: number;
  asn: number;
  nonAsn: number;
  totalStatus: number;
}

export default function RekapGTKPendidikanTable({ sekolahId }: { sekolahId?: string }) {
  const [rekapData, setRekapData] = useState<RekapGTKPendidikan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === "all" || !sekolahId) ? undefined : sekolahId;
        let mappedData: RekapGTKPendidikan[] = [];
        
        try {
          // Attempt Strategy 1: Specialized endpoint
          const result = await dapodikService.getGtkRekapPendidikan(targetSekolahId);
          const responseData = result?.data ?? result;

          if (Array.isArray(responseData) && responseData.length > 0) {
            mappedData = responseData.map((item: any, index: number) => ({
              id: item.id || index,
              pendidikan: formatPendidikan(item.pendidikan || item.nama_pendidikan || item.jenjang),
              lakiLaki: item.lakiLaki ?? item.laki_laki ?? item.L ?? 0,
              perempuan: item.perempuan ?? item.P ?? 0,
              totalJK: item.totalJK ?? ( (item.laki_laki||0) + (item.perempuan||0) ),
              asn: item.asn ?? item.status_asn ?? 0,
              nonAsn: item.nonAsn ?? item.status_non_asn ?? 0,
              totalStatus: item.totalStatus ?? ( (item.asn||0) + (item.nonAsn||0) ),
            }));
          } else {
              throw new Error("No rekap data found");
          }
        } catch (apiError) {
          console.warn("Rekap GTK Pendidikan API failed, fetching ALL pages for accuracy...");
          
          // Strategy 2: Fetch ALL pages and aggregate manually
          const firstPage = await dapodikService.getGTK(100, "", 1, undefined, "aktif", targetSekolahId);
          const totalGTK = firstPage.meta?.total_data || firstPage.total || 0;
          
          let allGTK: any[] = firstPage.data || [];
          const totalPages = Math.ceil(totalGTK / 100);

          if (totalPages > 1) {
              const promises = [];
              for (let i = 2; i <= totalPages; i++) {
                  promises.push(dapodikService.getGTK(100, "", i, undefined, "aktif", targetSekolahId));
              }
              const otherPages = await Promise.all(promises);
              otherPages.forEach(p => allGTK = [...allGTK, ...(p.data || [])]);
          }

          if (allGTK.length > 0) {
            const groups: Record<string, RekapGTKPendidikan> = {};
            allGTK.forEach((gtk: any) => {
              const pendidikan = formatPendidikan(gtk.kepegawaian?.pendidikan_terakhir || gtk.identitas?.pendidikan_terakhir || gtk.pendidikan_terakhir || "S1");
              const jk = (gtk.identitas?.jenis_kelamin || "").toUpperCase();
              const status = (gtk.kepegawaian?.status_kepegawaian || "").toUpperCase();
              const isAsn = status === "PNS" || status === "PPPK";
              
              if (!groups[pendidikan]) {
                groups[pendidikan] = { id: Object.keys(groups).length + 1, pendidikan, lakiLaki: 0, perempuan: 0, totalJK: 0, asn: 0, nonAsn: 0, totalStatus: 0 };
              }
              if (jk === "L") groups[pendidikan].lakiLaki++; else groups[pendidikan].perempuan++;
              groups[pendidikan].totalJK++;
              if (isAsn) groups[pendidikan].asn++; else groups[pendidikan].nonAsn++;
              groups[pendidikan].totalStatus++;
            });
            mappedData = Object.values(groups).sort((a, b) => b.pendidikan.localeCompare(a.pendidikan));
          }
        }

        setRekapData(mappedData);
      } catch (err) {
        console.error("Gagal mengambil rekap pendidikan GTK:", err);
        setRekapData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sekolahId]);

  const totals = rekapData.reduce((acc, curr) => ({
    lakiLaki: acc.lakiLaki + (curr.lakiLaki || 0),
    perempuan: acc.perempuan + (curr.perempuan || 0),
    totalJK: acc.totalJK + (curr.totalJK || 0),
    asn: acc.asn + (curr.asn || 0),
    nonAsn: acc.nonAsn + (curr.nonAsn || 0),
    totalStatus: acc.totalStatus + (curr.totalStatus || 0),
  }), { lakiLaki: 0, perempuan: 0, totalJK: 0, asn: 0, nonAsn: 0, totalStatus: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader rowSpan={2} className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Pendidikan Terakhir</TableCell>
              <TableCell isHeader colSpan={3} className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Jenis Kelamin</TableCell>
              <TableCell isHeader colSpan={3} className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Status Kepegawaian</TableCell>
            </TableRow>
            <TableRow>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">L</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">P</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Total</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">ASN</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Non ASN</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">JML</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {rekapData.length > 0 ? (
              rekapData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.pendidikan}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.lakiLaki.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.perempuan.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-semibold border-l border-gray-100 dark:border-white/[0.05]">{item.totalJK.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.asn.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.nonAsn.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-semibold border-l border-gray-100 dark:border-white/[0.05]">{item.totalStatus.toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada data rekap ditemukan.
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-gray-50 dark:bg-white/[0.02] font-bold">
              <TableCell className="px-5 py-4 text-start text-gray-800 dark:text-white/90">Jumlah Total</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{totals.lakiLaki.toLocaleString()}</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{totals.perempuan.toLocaleString()}</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-brand-500 font-bold">{totals.totalJK.toLocaleString()}</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{totals.asn.toLocaleString()}</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{totals.nonAsn.toLocaleString()}</TableCell>
              <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-brand-500 font-extrabold">{totals.totalStatus.toLocaleString()}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
