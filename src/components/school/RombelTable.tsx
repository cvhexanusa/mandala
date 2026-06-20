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
import Badge from "../ui/badge/Badge";
import { Modal } from "../ui/modal";
import { useModal } from "../../hooks/useModal";
import Avatar from "../ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";

interface Rombel {
  rombongan_belajar_id: string;
  nama: string;
  tingkat_pendidikan_id_str: string;
  ptk_id_str: string;
  kurikulum_id_str: string;
  id_ruang_str: string;
  jumlah_siswa: number;
  movingKelas?: string;
  kebutuhanKhusus?: "Ya" | "Tidak";
  lengkapData?: number;
}

interface RombelTableProps {
  type: "reguler" | "praktik" | "ekskul" | "pilihan";
  onSelectionChange: (selectedIds: string[]) => void;
  searchTerm: string;
  gradeFilter: string;
  itemsPerPage: number;
}

export default function RombelTable({ type, onSelectionChange, searchTerm, gradeFilter, itemsPerPage }: RombelTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedRombelId, setSelectedRombelId] = useState("");
  const [selectedRombelName, setSelectedRombelName] = useState("");
  
  const [rombelList, setRombelList] = useState<Rombel[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [modalStudents, setModalStudents] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Reset page to 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, type, gradeFilter]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const apiType = type === "pilihan" ? "pilihan" : "reguler";
        const response = await dapodikService.getRombonganBelajar(apiType, itemsPerPage, currentPage, searchTerm, gradeFilter);
        
        if (response) {
          const dataArray = Array.isArray(response.data) ? response.data : [];
          setRombelList(dataArray);
          setTotalItems(response.meta?.total || dataArray.length || 0);
        }
      } catch (error) {
        console.error("Failed to fetch rombel data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [type, itemsPerPage, currentPage, searchTerm, gradeFilter]);

  // Fetch real student members when modal is open
  useEffect(() => {
    if (!isOpen || !selectedRombelId) return;

    const fetchAnggota = async () => {
      setIsModalLoading(true);
      try {
        const response = await dapodikService.getRombelAnggota(selectedRombelId);
        if (response && response.data) {
          setModalStudents(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch class members:", error);
      } finally {
        setIsModalLoading(false);
      }
    };

    fetchAnggota();
  }, [isOpen, selectedRombelId]);
  
  // Modal Pagination State
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 10;
  
  const currentData = rombelList;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handleSelectAll = (checked: boolean) => {
    let newSelected: string[];
    if (checked) {
      newSelected = [...new Set([...selectedRows, ...currentData.map((item) => item.rombongan_belajar_id)])];
    } else {
      const currentIds = currentData.map((item) => item.rombongan_belajar_id);
      newSelected = selectedRows.filter((id) => !currentIds.includes(id));
    }
    setSelectedRows(newSelected);
    onSelectionChange(newSelected);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    let newSelected: string[];
    if (checked) {
      newSelected = [...selectedRows, id];
    } else {
      newSelected = selectedRows.filter((rowId) => rowId !== id);
    }
    setSelectedRows(newSelected);
    onSelectionChange(newSelected);
  };

  const handleRombelClick = (id: string, name: string) => {
    setSelectedRombelId(id);
    setSelectedRombelName(name);
    setModalPage(1);
    openModal();
  };

  const isAllSelected = currentData.length > 0 && currentData.every((item) => selectedRows.includes(item.rombongan_belajar_id));
  const hideCheckbox = type === "reguler" || type === "praktik" || type === "pilihan";

  const totalModalPages = Math.ceil(modalStudents.length / modalItemsPerPage) || 1;
  const currentModalData = modalStudents.slice(
    (modalPage - 1) * modalItemsPerPage,
    modalPage * modalItemsPerPage
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1300px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {!hideCheckbox && (
                <TableCell isHeader className="px-5 py-3 text-start">
                    <Checkbox
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    />
                </TableCell>
              )}
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Rombel</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Wali Kelas</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tingkat</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kurikulum</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ruang</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 text-center">Jumlah PD</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Moving Kelas</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Kebutuhan Khusus</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className={`divide-y divide-gray-100 dark:divide-white/[0.05] ${isLoading && currentData.length > 0 ? "opacity-50 pointer-events-none transition-opacity duration-200" : ""}`}>
            {isLoading && currentData.length === 0 ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={rIdx} className="animate-pulse">
                  {!hideCheckbox && (
                    <TableCell className="px-5 py-4 text-start">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4"></div>
                    </TableCell>
                  )}
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-8 mx-auto"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12"></div></TableCell>
                </TableRow>
              ))
            ) : currentData.length > 0 ? currentData.map((item, index) => (
              <TableRow key={item.rombongan_belajar_id || index} className={`${selectedRows.includes(item.rombongan_belajar_id) ? "bg-gray-50 dark:bg-white/[0.02]" : ""}`}>
                {!hideCheckbox && (
                    <TableCell className="px-5 py-4 text-start">
                        <Checkbox
                            checked={selectedRows.includes(item.rombongan_belajar_id)}
                            onChange={(checked) => handleSelectRow(item.rombongan_belajar_id, checked)}
                        />
                    </TableCell>
                )}
                <TableCell className="px-5 py-4 text-start">
                    <button 
                        onClick={() => handleRombelClick(item.rombongan_belajar_id, item.nama)}
                        className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 whitespace-nowrap"
                    >
                        {item.nama}
                    </button>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 whitespace-nowrap">{item.ptk_id_str || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.tingkat_pendidikan_id_str || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.kurikulum_id_str || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.id_ruang_str || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 text-center font-medium">{item.jumlah_siswa || 0}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.movingKelas || "Tidak"}</TableCell>
                <TableCell className="px-5 py-4 text-start">
                  <Badge size="sm" color={item.kebutuhanKhusus === "Ya" ? "warning" : "light"}>
                    {item.kebutuhanKhusus || "Tidak"}
                  </Badge>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={hideCheckbox ? 8 : 9} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-8">
        <div className="mb-6">
          <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Daftar Siswa - {selectedRombelName}
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Berikut adalah daftar siswa yang terdaftar dalam rombel ini.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">NISN</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">NIPD</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">JK</TableCell>
                </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isModalLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                            Loading...
                        </TableCell>
                    </TableRow>
                ) : currentModalData.length > 0 ? currentModalData.map((student) => (
                    <TableRow key={student.peserta_didik_id}>
                    <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            <Avatar src={getFotoUrl(student.foto, "/images/user/user-01.jpg")} size="small" />
                            <span className="font-medium text-gray-800 dark:text-white/90">{student.nama}</span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{student.nisn || "-"}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{student.nipd || "-"}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400">{student.jenis_kelamin || "-"}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                            Tidak ada siswa terdaftar di rombel ini
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={modalPage}
            totalPages={totalModalPages}
            onPageChange={(page) => setModalPage(page)}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={closeModal}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  );
}
