import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import { Modal } from "../ui/modal";
import { useModal } from "../../hooks/useModal";
import Avatar from "../ui/avatar/Avatar";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";

interface Ekskul {
  rombongan_belajar_id: string;
  nm_ekskul: string;
  nama: string;
  ptk_id_str: string;
  id_ruang_str: string;
  anggotaRombel?: number;
}

interface EkskulTableProps {
  onSelectionChange?: (selectedIds: string[]) => void;
  searchTerm: string;
  itemsPerPage: number;
}

export default function EkskulTable({ onSelectionChange: _, searchTerm, itemsPerPage }: EkskulTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [ekskulData, setEkskulData] = useState<Ekskul[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedEkskulId, setSelectedEkskulId] = useState("");
  const [selectedEkskul, setSelectedEkskul] = useState("");

  const [modalStudents, setModalStudents] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Reset page to 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await dapodikService.getEkstrakurikuler(searchTerm);
        if (response && response.data) {
          setEkskulData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch ekskul data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchTerm]);
  
  // Modal Pagination State
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 10;
  
  const sortedData = [...ekskulData].sort((a, b) => 
    (a.nm_ekskul || a.nama || "").localeCompare(b.nm_ekskul || b.nama || "")
  );
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const currentData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEkskulClick = (id: string, nama: string) => {
    setSelectedEkskulId(id);
    setSelectedEkskul(nama);
    setModalPage(1);
    openModal();
  };

  // Fetch real student members when modal is open
  useEffect(() => {
    if (!isOpen || !selectedEkskulId) return;

    const fetchAnggota = async () => {
      setIsModalLoading(true);
      try {
        const response = await dapodikService.getRombelAnggota(selectedEkskulId);
        if (response && response.data) {
          setModalStudents(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch ekskul members:", error);
      } finally {
        setIsModalLoading(false);
      }
    };

    fetchAnggota();
  }, [isOpen, selectedEkskulId]);

  const totalModalPages = Math.ceil(modalStudents.length / modalItemsPerPage) || 1;
  const currentModalData = modalStudents.slice(
    (modalPage - 1) * modalItemsPerPage,
    modalPage * modalItemsPerPage
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Ekskul</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Pembina</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Prasarana</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className={`divide-y divide-gray-100 dark:divide-white/[0.05] ${isLoading && currentData.length > 0 ? "opacity-50 pointer-events-none transition-opacity duration-200" : ""}`}>
            {isLoading && currentData.length === 0 ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={rIdx} className="animate-pulse">
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></TableCell>
                </TableRow>
              ))
            ) : currentData.length > 0 ? currentData.map((item, index) => (
              <TableRow key={item.rombongan_belajar_id || index}>
                <TableCell className="px-5 py-4 text-start">
                  <button 
                    onClick={() => handleEkskulClick(item.rombongan_belajar_id, item.nama)}
                    className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 whitespace-nowrap"
                  >
                    {item.nama}
                  </button>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 whitespace-nowrap">{item.ptk_id_str || "-"}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.id_ruang_str || "-"}</TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada data ekskul ditemukan untuk "{searchTerm}"
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

      {/* Modal Anggota Ekskul */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-8">
        <div className="mb-6">
          <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Daftar Anggota - {selectedEkskul}
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Berikut adalah daftar siswa yang mengikuti kegiatan ekskul ini.
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
