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
import Checkbox from "../form/input/Checkbox";
import Avatar from "../ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { EyeIcon } from "../../icons";
import { getFotoUrl } from "../../utils/image";
import { formatPtkInduk } from "../../utils/dapodikUtils";

interface TendikTableProps {
  onSelectionChange: (selectedIds: string[], selectedObjects: any[]) => void;
  onDetail?: (item: any) => void;
  searchTerm: string;
  completenessFilter?: string;
  itemsPerPage: number;
  sekolahId?: string;
}

export default function TendikTable({ onSelectionChange, onDetail, searchTerm, completenessFilter, itemsPerPage, sekolahId }: TendikTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [allTendik, setAllTendik] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await dapodikService.getSekolah();
        let schoolList = [];
        if (response.status === 'success' || response.success === true) {
          schoolList = response.data || [];
        } else if (Array.isArray(response)) {
          schoolList = response;
        } else if (response.data && Array.isArray(response.data)) {
          schoolList = response.data;
        }
        setSchools(schoolList);
      } catch (error) {
        console.error("Gagal mengambil daftar sekolah:", error);
      }
    };
    fetchSchools();
  }, []);

  const getSchoolName = (sekolahId: string) => {
    const school = schools.find((s) => s.sekolah_id === sekolahId);
    return school ? school.nama : sekolahId || "-";
  };
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllTendik = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === 'all' || !sekolahId) ? undefined : sekolahId;
        const maxLimit = 100;

        const firstPage = await dapodikService.getGTK(
          maxLimit, 
          "", 
          1, 
          'tendik', 
          'aktif',
          targetSekolahId
        );
        
        let fetchedData = [];
        let totalCount = 0;
        if (firstPage && (firstPage.status === 'success' || firstPage.success === true)) {
          fetchedData = firstPage.data || [];
          totalCount = firstPage.meta?.total_data || firstPage.meta?.total || firstPage.total || fetchedData.length;
        } else if (Array.isArray(firstPage)) {
          fetchedData = firstPage;
          totalCount = firstPage.length;
        } else if (firstPage && firstPage.data && Array.isArray(firstPage.data)) {
          fetchedData = firstPage.data;
          totalCount = firstPage.meta?.total_data || firstPage.total || fetchedData.length;
        }

        const totalPages = Math.ceil(totalCount / maxLimit);

        if (totalPages > 1) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              dapodikService.getGTK(
                maxLimit,
                "",
                p,
                'tendik',
                'aktif',
                targetSekolahId
              )
            );
          }
          const otherPages = await Promise.all(pagePromises);
          otherPages.forEach((pageRes) => {
            let pageData = [];
            if (pageRes && (pageRes.status === 'success' || pageRes.success === true)) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes && pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
            fetchedData = [...fetchedData, ...pageData];
          });
        }

        setAllTendik(fetchedData);
      } catch (error) {
        console.error("Gagal mengambil data tendik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTendik();
  }, [sekolahId]);

  // Client-side filtering & search
  const filteredTendik = useMemo(() => {
    let list = allTendik;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter((item: any) => 
        item.identitas?.nama?.toLowerCase().includes(lowerSearch) ||
        item.identitas?.nuptk?.includes(lowerSearch) ||
        item.identitas?.nip?.includes(lowerSearch)
      );
    }
    return list;
  }, [allTendik, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const total = filteredTendik.length;
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const data = useMemo(() => {
    return filteredTendik.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredTendik, currentPage, itemsPerPage]);

  useEffect(() => {
    // Reset selection when filters change
    setSelectedRows([]);
    setSelectedObjects([]);
    onSelectionChange([], []);
  }, [itemsPerPage, searchTerm, sekolahId, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item) => item.identitas?.id);
      const newSelectedIds = [...new Set([...selectedRows, ...allIds])];
      
      const newSelectedObjects = [...selectedObjects];
      data.forEach(item => {
        if (!selectedRows.includes(item.identitas?.id)) {
            newSelectedObjects.push(item);
        }
      });
      
      setSelectedRows(newSelectedIds);
      setSelectedObjects(newSelectedObjects);
      onSelectionChange(newSelectedIds, newSelectedObjects);
    } else {
      const currentIds = data.map((item) => item.identitas?.id);
      const newSelectedIds = selectedRows.filter((id) => !currentIds.includes(id));
      const newSelectedObjects = selectedObjects.filter((obj) => !currentIds.includes(obj.identitas?.id));
      
      setSelectedRows(newSelectedIds);
      setSelectedObjects(newSelectedObjects);
      onSelectionChange(newSelectedIds, newSelectedObjects);
    }
  };

  const handleSelectRow = (item: any, checked: boolean) => {
    const id = item.identitas?.id;
    let newIds: string[];
    let newObjects: any[];

    if (checked) {
      newIds = [...selectedRows, id];
      newObjects = [...selectedObjects, item];
    } else {
      newIds = selectedRows.filter((rowId) => rowId !== id);
      newObjects = selectedObjects.filter((obj) => obj.identitas?.id !== id);
    }
    
    setSelectedRows(newIds);
    setSelectedObjects(newObjects);
    onSelectionChange(newIds, newObjects);
  };

  const isAllSelected = data.length > 0 && data.every((item) => selectedRows.includes(item.identitas?.id));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        )}
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-start">
                <Checkbox
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">PTK Induk</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Tendik</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Sekolah</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NUPTK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status Kepegawaian</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jenis GTK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {data.length > 0 ? data.map((item) => (
              <TableRow key={item.identitas?.id} className={`${selectedRows.includes(item.identitas?.id) ? "bg-gray-50 dark:bg-white/[0.02]" : ""}`}>
                <TableCell className="px-5 py-4 text-start">
                  <Checkbox
                    checked={selectedRows.includes(item.identitas?.id)}
                    onChange={(checked) => handleSelectRow(item, checked)}
                  />
                </TableCell>
                <TableCell className="px-5 py-4 text-center">
                  <Badge size="sm" color={formatPtkInduk(item.kepegawaian?.ptk_induk) === "Ya" ? "success" : "light"}>
                    {formatPtkInduk(item.kepegawaian?.ptk_induk)}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Avatar src={getFotoUrl(item.identitas?.foto, "")} size="small" />
                        <span className="font-medium text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                    </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{getSchoolName(item.identitas?.sekolah_id)}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400">{item.identitas?.jenis_kelamin}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.nuptk || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-start">
                  <Badge size="sm" color={item.kepegawaian?.status_kepegawaian === "PNS" ? "success" : item.kepegawaian?.status_kepegawaian === "PPPK" ? "warning" : "light"}>
                    {item.kepegawaian?.status_kepegawaian || "-"}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.kepegawaian?.jenis_ptk || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-right">
                  <button 
                    onClick={() => onDetail?.(item)}
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
                        Tidak ada data ditemukan untuk "{searchTerm}"
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
