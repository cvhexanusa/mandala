import { useState, useEffect } from "react";
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

interface SchoolTableProps {
  searchTerm: string;
  kabKotaFilter: string;
  statusFilter: string;
  jenjangFilter: string;
}

export default function SchoolTable({ searchTerm, kabKotaFilter, statusFilter, jenjangFilter }: SchoolTableProps) {
  const navigate = useNavigate();
  const { role } = useParams();
  const [data, setData] = useState<any[]>([]);
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

        // Client-side filtering as the endpoint might not support all filters yet
        let filtered = sekolahData;
        
        if (kabKotaFilter !== "all") {
          filtered = filtered.filter((s: any) => (s.kabupaten_kota || s.kabupate_kota) === kabKotaFilter);
        }
        if (statusFilter !== "all") {
          filtered = filtered.filter((s: any) => s.status_sekolah === statusFilter);
        }
        if (jenjangFilter !== "all") {
          filtered = filtered.filter((s: any) => (s.bentuk_pendidikan_id_str || s.bentuk_pendidikan_is_str) === jenjangFilter);
        }
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          filtered = filtered.filter((s: any) => 
            s.nama?.toLowerCase().includes(lowerSearch) || 
            s.npsn?.includes(lowerSearch)
          );
        }

        setData(filtered);
      } catch (error) {
        console.error("Gagal mengambil data sekolah:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, [searchTerm, kabKotaFilter, statusFilter, jenjangFilter]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        </div>
      )}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1200px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Sekolah</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NPSN</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jenjang</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kab/Kota</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kecamatan</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap text-center">Total Siswa</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap text-center">Total GTK</TableCell>
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
                  <Badge size="sm" color={school.status_sekolah === "Negeri" ? "success" : "warning"}>
                    {school.status_sekolah}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{school.bentuk_pendidikan_id_str || school.bentuk_pendidikan_is_str}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{school.kabupaten_kota || school.kabupate_kota}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{school.kecamatan}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-bold">{school.total_siswa?.toLocaleString() || 0}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-center text-theme-sm dark:text-white/90 font-bold">{school.total_gtk?.toLocaleString() || 0}</TableCell>
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
                <TableCell colSpan={9} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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
