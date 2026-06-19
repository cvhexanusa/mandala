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
import Checkbox from "../form/input/Checkbox";
import Avatar from "../ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { EyeIcon } from "../../icons";
import { getFotoUrl } from "../../utils/image";

interface NonAktifTableProps {
  onSelectionChange: (selectedIds: string[], selectedObjects: any[]) => void;
  onDetail?: (item: any) => void;
  searchTerm: string;
  completenessFilter: string;
  itemsPerPage: number;
  sekolahId?: string;
}

export default function NonAktifTable({ onSelectionChange, onDetail, searchTerm, completenessFilter: _completenessFilter, itemsPerPage, sekolahId }: NonAktifTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);

  useEffect(() => {
    setSelectedRows([]);
    setSelectedObjects([]);
    onSelectionChange([], []);
  }, [searchTerm, itemsPerPage, sekolahId, currentPage]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await dapodikService.getGTK(
          itemsPerPage, 
          searchTerm, 
          currentPage, 
          undefined, 
          'non-aktif',
          sekolahId === 'all' ? undefined : sekolahId
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
      } catch (error) {
        console.error("Gagal mengambil data GTK non-aktif:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemsPerPage, searchTerm, currentPage, sekolahId]);

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
        <Table className="min-w-[1900px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-start">
                <Checkbox
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status Kepegawaian</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jenis GTK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Jabatan GTK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tempat Lahir</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tanggal Lahir</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Alamat</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NUPTK</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NIP</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Alasan</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tgl Keluar</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.identitas?.id} className={`${selectedRows.includes(item.identitas?.id) ? "bg-gray-50 dark:bg-white/[0.02]" : ""}`}>
                  <TableCell className="px-5 py-4 text-start">
                    <Checkbox
                      checked={selectedRows.includes(item.identitas?.id)}
                      onChange={(checked) => handleSelectRow(item, checked)}
                    />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Avatar src={getFotoUrl(item.identitas?.foto, "")} size="small" />
                        <span className="font-medium text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 text-center">{item.identitas?.jenis_kelamin}</TableCell>
                  <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.kepegawaian?.status_kepegawaian || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.kepegawaian?.jenis_ptk || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.kepegawaian?.jabatan || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.tempat_lahir || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {item.identitas?.tanggal_lahir ? new Date(item.identitas?.tanggal_lahir).toLocaleDateString('id-ID') : "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 min-w-[200px]">{item.data_pendukung?.alamat_lengkap || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.nuptk || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.nip || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <Badge size="sm" color="error">
                      {item.kepegawaian?.status || "Non-Aktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID') : "-"}
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={14} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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
