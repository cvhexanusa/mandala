import { useState, useEffect } from "react";
import { dapodikService } from "../../services/dapodikService";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RekapPDUsia {
  rentangUsia: string;
  lakiLaki: number;
  perempuan: number;
  totalJK: number;
  siswaBaru: number;
  pindahan: number;
  totalStatus: number;
}

export default function RekapPDUsiaTable({ sekolahId }: { sekolahId?: string }) {
  const [rekapData, setRekapData] = useState<RekapPDUsia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === "all" || !sekolahId) ? undefined : sekolahId;
        let mappedData: RekapPDUsia[] = [];
        
        try {
          // Attempt Strategy 1: Specialized endpoint (keep as fallback/try first)
          const result = await dapodikService.getPdRekapUsia(targetSekolahId);
          const responseData = result?.data ?? result;
          
          if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].baru !== undefined) {
            mappedData = responseData.map((item: any) => ({
              rentangUsia: item.usia || item.rentang_usia || "-",
              lakiLaki: item.l ?? item.laki_laki ?? 0,
              perempuan: item.p ?? item.perempuan ?? 0,
              totalJK: item.total ?? item.jumlah ?? ((item.l||0) + (item.p||0)),
              siswaBaru: item.baru ?? 0,
              pindahan: item.pindahan ?? 0,
              totalStatus: item.total ?? item.jumlah ?? 0,
            }));
          } else {
            throw new Error("Invalid or incomplete API rekap data");
          }
        } catch (apiError) {
          console.warn("Rekap PD Usia API incomplete or failed, extracting from student list pages...");
          
          // Strategy 2: Extract from Student List (fetch ALL pages for accurate aggregation)
          const firstPage = await dapodikService.getPesertaDidik(100, "", 1, undefined, "aktif", undefined, targetSekolahId);
          const meta = firstPage?.meta || {};
          const totalOverall = meta.total_data || firstPage.total || meta.total || 0;
          
          let allStudents: any[] = firstPage.data || [];
          const maxLimit = 100;
          const totalPages = Math.ceil(totalOverall / maxLimit);

          // Fetch all remaining pages
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

          if (allStudents.length > 0) {
            const ageGroups: Record<string, RekapPDUsia> = {
              "< 15": { rentangUsia: "< 15 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
              "15": { rentangUsia: "15 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
              "16": { rentangUsia: "16 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
              "17": { rentangUsia: "17 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
              "18": { rentangUsia: "18 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
              "> 18": { rentangUsia: "> 18 Tahun", lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 },
            };
            
            const now = new Date();
            allStudents.forEach((pd: any) => {
              const birthDateStr = pd.identitas?.tanggal_lahir;
              if (!birthDateStr) return;
              
              const birthDate = new Date(birthDateStr);
              let age = now.getFullYear() - birthDate.getFullYear();
              const m = now.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
                age--;
              }
              
              let groupKey = "";
              if (age < 15) groupKey = "< 15";
              else if (age === 15) groupKey = "15";
              else if (age === 16) groupKey = "16";
              else if (age === 17) groupKey = "17";
              else if (age === 18) groupKey = "18";
              else groupKey = "> 18";
              
              const jk = (pd.identitas?.jenis_kelamin || "").toUpperCase();
              const pendaftaranVal = String(
                pd.identitas?.jenis_pendaftaran_id_str ?? 
                pd.jenis_pendaftaran_id_str ?? 
                pd.akademik?.jenis_pendaftaran_id_str ?? 
                pd.identitas?.jenis_pendaftaran_id ?? 
                pd.jenis_pendaftaran_id ?? 
                pd.akademik?.jenis_pendaftaran_id ?? 
                ""
              ).trim();
              const isPindahan = 
                pendaftaranVal === "2" || 
                pendaftaranVal.toLowerCase().includes("pindahan") || 
                pendaftaranVal.toLowerCase().includes("transfer");
              const isBaru = !isPindahan;
              
              const g = ageGroups[groupKey];
              if (g) {
                  if (jk === "L") g.lakiLaki++; else g.perempuan++;
                  g.totalJK++;
                  
                  if (isBaru) g.siswaBaru++; else g.pindahan++;
                  g.totalStatus++;
              }
            });
            
            mappedData = Object.values(ageGroups).filter(g => g.totalStatus > 0);
          }
        }
        
        setRekapData(mappedData);
      } catch (err) {
        console.error("Gagal mengambil rekap usia:", err);
        setRekapData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sekolahId]);

  const grandTotal = rekapData.reduce((acc, curr) => ({
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
        <p className="text-sm text-gray-500 animate-pulse">Menganalisis usia seluruh peserta didik...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader rowSpan={2} className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Rentang Usia</TableCell>
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
            {rekapData.length > 0 ? (
              <>
                {rekapData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.rentangUsia}</TableCell>
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
