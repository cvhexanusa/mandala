import { useState, useEffect } from "react";
import { dapodikService } from "../../services/dapodikService";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RekapPD {
  tingkat: string;
  lakiLaki: number;
  perempuan: number;
  totalJK: number;
  siswaBaru: number;
  pindahan: number;
  totalStatus: number;
}

export default function RekapPDTable({ searchTerm = "", sekolahId }: { searchTerm?: string; sekolahId?: string }) {
  const [rekapData, setRekapData] = useState<RekapPD[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === "all" || !sekolahId) ? undefined : sekolahId;
        let mappedData: RekapPD[] = [];
        
        // Step 1: Fetch first page to get metadata and check for pre-calculated rekap
        const firstPage = await dapodikService.getPesertaDidik(100, "", 1, undefined, "aktif", undefined, targetSekolahId);
        console.log("DEBUG: Full Meta Data Inspect:", firstPage?.meta || firstPage?.summary || "No Meta");
        
        const meta = firstPage?.meta || {};
        const totalOverall = meta.total_data || firstPage.total || meta.total || 0;
        
        // Look for breakdown in metadata first (Strategy 1)
        const rekapRaw = firstPage.rekap_tingkat || meta.rekap_tingkat || firstPage.summary?.rekap_tingkat || firstPage.rekap?.tingkat || meta.rekap?.tingkat;

        if (Array.isArray(rekapRaw) && rekapRaw.length > 0) {
            console.log("DEBUG: Using pre-calculated rekap from metadata");
            mappedData = rekapRaw.map((item: any) => {
                const rawT = String(item.tingkat || item.tingkat_pendidikan || "").toUpperCase();
                let displayT = "Tingkat " + rawT.replace("KELAS", "").trim();
                if (rawT.includes("10") || rawT === "X") displayT = "Tingkat X";
                else if (rawT.includes("11") || rawT === "XI") displayT = "Tingkat XI";
                else if (rawT.includes("12") || rawT === "XII") displayT = "Tingkat XII";

                const l = item.l ?? item.laki_laki ?? item.jumlah_l ?? 0;
                const p = item.p ?? item.perempuan ?? item.jumlah_p ?? 0;
                const total = item.total ?? item.jumlah ?? (l + p);
                const baru = item.baru ?? item.siswa_baru ?? 0;
                const pindahan = item.pindahan ?? (total - baru);

                return { tingkat: displayT, lakiLaki: l, perempuan: p, totalJK: total, siswaBaru: baru, pindahan: pindahan, totalStatus: total };
            });
        } else {
            // Strategy 2: Manual Aggregation by fetching ALL pages (required since limit is capped at 100)
            console.warn(`DEBUG: Metadata breakdown not found. Fetching all ${totalOverall} students in pages...`);
            
            let allStudents: any[] = firstPage.data || [];
            const maxLimit = 100; // Backend usually caps at 100
            const totalPages = Math.ceil(totalOverall / maxLimit);

            // Fetch remaining pages
            if (totalPages > 1) {
                const pagePromises = [];
                for (let p = 2; p <= totalPages; p++) {
                    pagePromises.push(dapodikService.getPesertaDidik(maxLimit, "", p, undefined, "aktif", undefined, targetSekolahId));
                }
                const otherPages = await Promise.all(pagePromises);
                otherPages.forEach(pageRes => {
                    const pageData = pageRes.data || (Array.isArray(pageRes) ? pageRes : []);
                    allStudents = [...allStudents, ...pageData];
                });
            }

            console.log(`DEBUG: Total records fetched for aggregation: ${allStudents.length}`);

            const groups: Record<string, RekapPD> = {
                "Tingkat X": { tingkat: "Tingkat X", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
                "Tingkat XI": { tingkat: "Tingkat XI", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
                "Tingkat XII": { tingkat: "Tingkat XII", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
            };

            allStudents.forEach((pd: any) => {
                const tRaw = (pd.akademik?.tingkat || "").toUpperCase();
                let key = "";
                if (tRaw.includes("10") || tRaw === "X") key = "Tingkat X";
                else if (tRaw.includes("11") || tRaw === "XI") key = "Tingkat XI";
                else if (tRaw.includes("12") || tRaw === "XII") key = "Tingkat XII";
                else return;

                const jk = (pd.identitas?.jenis_kelamin || "").toUpperCase();
                const jenisDaftar = (pd.identitas?.jenis_pendaftaran_id_str || "").toLowerCase();
                const isBaru = jenisDaftar.includes("baru");

                const g = groups[key];
                if (jk === "L") g.lakiLaki++; else g.perempuan++;
                g.totalJK++;
                if (isBaru) g.siswaBaru++; else g.pindahan++;
                g.totalStatus++;
            });

            mappedData = Object.values(groups).filter(g => g.totalStatus > 0);
        }

        // Final Sort & Normalize
        const normalized = mappedData.sort((a, b) => {
            const order: Record<string, number> = { "Tingkat X": 1, "Tingkat XI": 2, "Tingkat XII": 3 };
            return (order[a.tingkat] || 99) - (order[b.tingkat] || 99);
        });

        setRekapData(normalized);
      } catch (err) {
        console.error("Gagal mengambil rekap PD tingkat:", err);
        setRekapData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sekolahId]);

  const safeRekapData = Array.isArray(rekapData) ? rekapData : [];
  const filteredData = safeRekapData.filter(item => 
    (item.tingkat || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  const grandTotal = filteredData.reduce((acc, curr) => ({
    lakiLaki: acc.lakiLaki + curr.lakiLaki,
    perempuan: acc.perempuan + curr.perempuan,
    totalJK: acc.totalJK + curr.totalJK,
    siswaBaru: acc.siswaBaru + curr.siswaBaru,
    pindahan: acc.pindahan + curr.pindahan,
    totalStatus: acc.totalStatus + curr.totalStatus,
  }), { lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        <p className="text-sm text-gray-500 animate-pulse">Menghitung seluruh data peserta didik...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader rowSpan={2} className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tingkat Pendidikan</TableCell>
              <TableCell isHeader colSpan={3} className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Jenis Kelamin</TableCell>
              <TableCell isHeader colSpan={3} className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Status Masuk</TableCell>
            </TableRow>
            <TableRow>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">L</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">P</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Total</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Baru</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">Pindahan</TableCell>
              <TableCell isHeader className="px-5 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">JML</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredData.length > 0 ? (
              <>
                {filteredData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.tingkat}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.lakiLaki.toLocaleString()}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.perempuan.toLocaleString()}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-semibold border-l border-gray-100 dark:border-white/[0.05]">{item.totalJK.toLocaleString()}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.siswaBaru.toLocaleString()}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400 border-l border-gray-100 dark:border-white/[0.05]">{item.pindahan.toLocaleString()}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-semibold border-l border-gray-100 dark:border-white/[0.05]">{item.totalStatus.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 dark:bg-white/[0.02] font-bold">
                  <TableCell className="px-5 py-4 text-start text-gray-800 dark:text-white/90">Jumlah Total</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{grandTotal.lakiLaki.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{grandTotal.perempuan.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-brand-500 font-bold">{grandTotal.totalJK.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{grandTotal.siswaBaru.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-gray-800 dark:text-white/90">{grandTotal.pindahan.toLocaleString()}</TableCell>
                  <TableCell className="px-5 py-4 text-center border-l border-gray-100 dark:border-white/[0.05] text-theme-sm text-brand-500 font-bold">{grandTotal.totalStatus.toLocaleString()}</TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">Tidak ada data rekap ditemukan.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
