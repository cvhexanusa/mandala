import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Pagination from "../common/Pagination";
import { dapodikService } from "../../services/dapodikService";
import { EyeIcon } from "../../icons";
import { useNavigate, useParams } from "react-router";
import { formatJenjang } from "../../utils/dapodikUtils";

interface SchoolTableProps {
  searchQuery: string;
  kabKotaFilter: string;
  kecamatanFilter: string;
  statusFilter: string;
  jenjangFilter: string;
}

const getSyncStatus = (dateStr: string) => {
  if (!dateStr) return { text: "Belum pernah", isWarning: true };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const isWarning = diffMs > oneWeekMs || diffMs < 0;
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  let text = "";
  if (diffSec < 60) {
    text = "Baru saja";
  } else if (diffMin < 60) {
    text = `${diffMin} menit yang lalu`;
  } else if (diffHour < 24) {
    text = `${diffHour} jam yang lalu`;
  } else if (diffDay < 7) {
    text = `${diffDay} hari yang lalu`;
  } else if (diffWeek < 4) {
    text = `${diffWeek} minggu yang lalu`;
  } else if (diffMonth < 12) {
    text = `${diffMonth} bulan yang lalu`;
  } else {
    text = `${diffYear} tahun yang lalu`;
  }
  
  return { text, isWarning };
};

export default function SchoolTable({ 
  searchQuery: searchTerm, 
  kabKotaFilter, 
  kecamatanFilter, 
  statusFilter, 
  jenjangFilter 
}: SchoolTableProps) {
  const navigate = useNavigate();
  const { role } = useParams();
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      try {
        const response = await dapodikService.getSekolah();
        let sekolahData = [];
        
        if (response.status === 'success' || response.success === true) {
          sekolahData = response.data || [];
        } else if (Array.isArray(response)) {
          sekolahData = response;
        } else if (response.data && Array.isArray(response.data)) {
          sekolahData = response.data;
        }
        setAllSchools(sekolahData);
      } catch (error) {
        console.error("Gagal mengambil data sekolah:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kabKotaFilter, kecamatanFilter, statusFilter, jenjangFilter]);

  // Client-side filtering & search
  const filteredData = useMemo(() => {
    let filtered = allSchools;
    
    if (kabKotaFilter !== "all") {
      filtered = filtered.filter((s: any) => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
    }
    if (kecamatanFilter !== "all") {
      filtered = filtered.filter((s: any) => s.kecamatan === kecamatanFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((s: any) => String(s.status_sekolah) === statusFilter);
    }
    if (jenjangFilter !== "all") {
      filtered = filtered.filter((s: any) => formatJenjang(s) === jenjangFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((s: any) => 
        s.nama?.toLowerCase().includes(lowerSearch) || 
        s.npsn?.includes(lowerSearch)
      );
    }
    return filtered;
  }, [allSchools, searchTerm, kabKotaFilter, kecamatanFilter, statusFilter, jenjangFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusLabel = (status: any) => {
    if (status === "1" || status === 1 || status === "Negeri") return "Negeri";
    if (status === "2" || status === 2 || status === "Swasta") return "Swasta";
    return status || "-";
  };

  const getStatusColor = (status: any) => {
    const label = getStatusLabel(status);
    return label === "Negeri" ? "success" : "warning";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        </div>
      )}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Sekolah</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NPSN</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jenjang</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kab/Kota</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kecamatan</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Terakhir Sinkron</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {currentData.length > 0 ? currentData.map((school) => (
              <TableRow key={school.sekolah_id || school.id}>
                <TableCell className="px-5 py-4 text-start">
                  <span className="font-medium text-gray-800 dark:text-white/90">{school.nama}</span>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono">{school.npsn}</TableCell>
                <TableCell className="px-5 py-4 text-start">
                  <Badge size="sm" color={getStatusColor(school.status_sekolah)}>
                    {getStatusLabel(school.status_sekolah)}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatJenjang(school)}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{school.kabupaten_kota || school.kabupate_kota || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{school.kecamatan || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-start">
                  {(() => {
                    const { text, isWarning } = getSyncStatus(school.last_update);
                    return isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-800/20">
                        ⚠️ {text}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/20">
                        {text}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="px-5 py-4 text-right">
                  <button 
                    onClick={() => navigate(`/${role}/satuan-pendidikan/detail/${school.sekolah_id}`)}
                    className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                    title="Lihat Detail"
                  >
                    <EyeIcon className="size-5" />
                  </button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada data sekolah ditemukan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
