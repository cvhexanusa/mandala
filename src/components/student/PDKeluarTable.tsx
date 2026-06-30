import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import Checkbox from "../form/input/Checkbox";
import { dapodikService } from "../../services/dapodikService";
import { EyeIcon } from "../../icons";

interface PDKeluarTableProps {
  onSelectionChange: (selectedIds: string[], selectedObjects: any[]) => void;
  onDetail?: (item: any) => void;
  searchTerm: string;
  itemsPerPage: number;
  sekolahId?: string;
}

export default function PDKeluarTable({ onSelectionChange, onDetail, searchTerm, itemsPerPage, sekolahId }: PDKeluarTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoading(true);
      try {
        const targetSekolahId = (sekolahId === 'all' || !sekolahId) ? undefined : sekolahId;
        const maxLimit = 100;

        const firstPage = await dapodikService.getPesertaDidik(
          maxLimit, 
          "", 
          1, 
          undefined, 
          'non-aktif',
          undefined,
          targetSekolahId
        );

        let fetchedData = [];
        let totalCount = 0;
        if (firstPage.status === 'success' || firstPage.success === true) {
          fetchedData = firstPage.data || [];
          totalCount = firstPage.meta?.total_data || firstPage.meta?.total || firstPage.total || fetchedData.length;
        } else if (Array.isArray(firstPage)) {
          fetchedData = firstPage;
          totalCount = firstPage.length;
        } else if (firstPage.data && Array.isArray(firstPage.data)) {
          fetchedData = firstPage.data;
          totalCount = firstPage.meta?.total_data || firstPage.total || fetchedData.length;
        }

        const totalPages = Math.ceil(totalCount / maxLimit);

        if (totalPages > 1) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              dapodikService.getPesertaDidik(
                maxLimit,
                "",
                p,
                undefined,
                'non-aktif',
                undefined,
                targetSekolahId
              )
            );
          }
          const otherPages = await Promise.all(pagePromises);
          otherPages.forEach((pageRes) => {
            let pageData = [];
            if (pageRes.status === 'success' || pageRes.success === true) {
              pageData = pageRes.data || [];
            } else if (Array.isArray(pageRes)) {
              pageData = pageRes;
            } else if (pageRes.data && Array.isArray(pageRes.data)) {
              pageData = pageRes.data;
            }
            fetchedData = [...fetchedData, ...pageData];
          });
        }

        setAllStudents(fetchedData);
      } catch (error) {
        console.error("Gagal mengambil data PD keluar:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllStudents();
  }, [sekolahId]);

  // Client-side filtering & search
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter((item: any) => 
        item.identitas?.nama?.toLowerCase().includes(lowerSearch) ||
        item.identitas?.nisn?.includes(lowerSearch)
      );
    }
    return list;
  }, [allStudents, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const total = filteredStudents.length;
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  const data = useMemo(() => {
    return filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  useEffect(() => {
    setSelectedRows([]);
    setSelectedObjects([]);
    onSelectionChange([], []);
  }, [searchTerm, itemsPerPage, sekolahId, currentPage]);

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
        <Table className="min-w-[1500px]">
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
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NISN</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tempat Lahir</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tanggal Lahir</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Tingkat</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Rombel</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status</TableCell>
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
                  <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{item.identitas?.nama}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 text-center">{item.identitas?.jenis_kelamin}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.nisn || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.tempat_lahir || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {item.identitas?.tanggal_lahir ? new Date(item.identitas?.tanggal_lahir).toLocaleDateString('id-ID') : "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 text-center">{item.akademik?.tingkat || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 whitespace-nowrap">{item.akademik?.nama_rombel || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Non-Aktif
                    </span>
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
                <TableCell colSpan={11} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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
