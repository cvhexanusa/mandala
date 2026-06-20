import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import Checkbox from "../form/input/Checkbox";
import Avatar from "../ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { EyeIcon } from "../../icons";
import { getFotoUrl } from "../../utils/image";

interface StudentTableProps {
  type?: "aktif" | "alumni";
  onSelectionChange: (selectedIds: string[], selectedObjects: any[]) => void;
  onDetail?: (item: any) => void;
  searchTerm: string;
  completenessFilter: string;
  gradeFilter: string;
  itemsPerPage: number;
  sekolahId?: string;
  onDataLoaded?: (data: any[]) => void;
}

export default function StudentTable({ onSelectionChange, onDetail, searchTerm, completenessFilter: _completenessFilter, gradeFilter, itemsPerPage, sekolahId, onDataLoaded }: StudentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  
  useEffect(() => {
    // Reset selection when filters change to avoid stale data
    setSelectedRows([]);
    setSelectedObjects([]);
    onSelectionChange([], []);
  }, [searchTerm, gradeFilter, sekolahId, currentPage, itemsPerPage]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === 'all' || !sekolahId) ? undefined : sekolahId;
        
        const result = await dapodikService.getPesertaDidik(
          itemsPerPage, 
          searchTerm, 
          currentPage, 
          undefined, 
          'aktif', 
          gradeFilter === 'all' ? undefined : gradeFilter,
          targetSekolahId
        );
        
        let fetchedData = [];
        let totalCount = 0;

        if (result && (result.status === 'success' || result.success === true)) {
          fetchedData = result.data || [];
          totalCount = result.meta?.total_data || result.meta?.total || result.total || fetchedData.length;
        } else if (Array.isArray(result)) {
          fetchedData = result;
          totalCount = result.length;
        } else if (result && result.data && Array.isArray(result.data)) {
          fetchedData = result.data;
          totalCount = result.meta?.total_data || result.total || fetchedData.length;
        }
          
        setData(fetchedData);
        setTotal(totalCount);
        if (onDataLoaded) onDataLoaded(fetchedData);
      } catch (error) {
        console.error("Gagal mengambil data peserta didik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemsPerPage, searchTerm, currentPage, gradeFilter, sekolahId]);
  
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

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
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Siswa</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NISN</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Rombel/Kelas</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {data.length > 0 ? data.map((item) => (
              <TableRow 
                key={item.identitas?.id} 
                className={`${selectedRows.includes(item.identitas?.id) ? "bg-gray-50 dark:bg-white/[0.02]" : "hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"}`}
              >
                <TableCell className="px-5 py-4 text-start">
                  <Checkbox
                    checked={selectedRows.includes(item.identitas?.id)}
                    onChange={(checked) => handleSelectRow(item, checked)}
                  />
                </TableCell>
                <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Avatar src={getFotoUrl(item.identitas?.foto, "")} size="small" />
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {item.identitas?.nama}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 text-center">{item.identitas?.jenis_kelamin}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-mono text-xs">{item.identitas?.nisn || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-theme-xs font-medium">
                        {item.akademik?.nama_rombel || "-"}
                    </span>
                </TableCell>
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
                    <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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
