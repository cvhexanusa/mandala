import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import { useState, useEffect } from "react";
import { dapodikService } from "../../services/dapodikService";

interface RekapPDKompetensi {
  kompetensi: string;
  lakiLaki: number;
  perempuan: number;
  totalJK: number;
  siswaBaru: number;
  pindahan: number;
  totalStatus: number;
}

interface RekapPDKompetensiTableProps {
  searchTerm: string;
  sekolahId?: string;
}

export default function RekapPDKompetensiTable({ searchTerm, sekolahId }: RekapPDKompetensiTableProps) {
  const [rekapData, setRekapData] = useState<RekapPDKompetensi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const targetSekolahId = (sekolahId === "all" || !sekolahId) ? undefined : sekolahId;
        let mapped: RekapPDKompetensi[] = [];
        
        try {
          const response = await dapodikService.getPdRekapKompetensi(targetSekolahId);
          const dataArray = response?.data ?? response;
          if (Array.isArray(dataArray) && dataArray.length > 0) {
            mapped = dataArray.map((item: any) => ({
              kompetensi: item.kompetensi || item.nama_kompetensi || item.jurusan || "-",
              lakiLaki: item.l ?? item.laki_laki ?? 0,
              perempuan: item.p ?? item.perempuan ?? 0,
              totalJK: item.total ?? item.jumlah ?? ((item.l||0) + (item.p||0)),
              siswaBaru: item.baru ?? 0,
              pindahan: item.pindahan ?? 0,
              totalStatus: item.total ?? item.jumlah ?? 0,
            }));
          } else {
            throw new Error("Invalid API data");
          }
        } catch (apiError) {
          console.warn("Rekap PD Kompetensi API failed, falling back to client-side aggregation:", apiError);
          
          const result = await dapodikService.getPesertaDidik(5000, "", 1, undefined, "aktif", undefined, targetSekolahId);
          const pdData = result?.data || (Array.isArray(result) ? result : []);
          
          if (pdData.length > 0) {
            const groups: Record<string, RekapPDKompetensi> = {};
            
            pdData.forEach((pd: any) => {
              const kompetensi = pd.akademik?.jurusan || "Lainnya";
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
              
              if (!groups[kompetensi]) {
                groups[kompetensi] = {
                  kompetensi,
                  lakiLaki: 0,
                  perempuan: 0,
                  totalJK: 0,
                  siswaBaru: 0,
                  pindahan: 0,
                  totalStatus: 0
                };
              }
              
              const g = groups[kompetensi];
              if (jk === "L") g.lakiLaki++; else g.perempuan++;
              g.totalJK++;
              if (isBaru) g.siswaBaru++; else g.pindahan++;
              g.totalStatus++;
            });
            
            mapped = Object.values(groups).sort((a, b) => a.kompetensi.localeCompare(b.kompetensi));
          }
        }
        
        setRekapData(mapped);
      } catch (error) {
        console.error("Failed to fetch pd rekap kompetensi:", error);
        setRekapData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [sekolahId]);

  const filteredData = rekapData.filter(item => 
    item.kompetensi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotal = filteredData.reduce((acc, curr) => ({
    lakiLaki: acc.lakiLaki + curr.lakiLaki,
    perempuan: acc.perempuan + curr.perempuan,
    totalJK: acc.totalJK + curr.totalJK,
    siswaBaru: acc.siswaBaru + curr.siswaBaru,
    pindahan: acc.pindahan + curr.pindahan,
    totalStatus: acc.totalStatus + curr.totalStatus,
  }), { lakiLaki: 0, perempuan: 0, totalJK: 0, siswaBaru: 0, pindahan: 0, totalStatus: 0 });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader rowSpan={2} className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kompetensi Keahlian (Jurusan)</TableCell>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500 mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredData.length > 0 ? (
              <>
                {filteredData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.kompetensi}</TableCell>
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
