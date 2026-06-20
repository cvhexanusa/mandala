import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import Avatar from "../ui/avatar/Avatar";
import Button from "../ui/button/Button";
import { PrinterIcon } from "../../icons";
import { useModal } from "../../hooks/useModal";
import PrintGTKCardPreview from "./PrintGTKCardPreview";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";

interface GTKCard {
  ptk_id: string;
  nama: string;
  foto?: string;
  nuptk: string;
  nik?: string;
  jabatan_ptk_id_str: string;
  jenis_ptk_id_str: string;
}

interface GTKCardTableProps {
  type: "guru" | "tendik";
  searchTerm: string;
}

export default function GTKCardTable({ type, searchTerm }: GTKCardTableProps) {
  const [data, setData] = useState<GTKCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await dapodikService.getGTK(itemsPerPage, searchTerm, currentPage, type);
        if (result.status === 'success') {
          setData(result.data);
          setTotalPages(result.meta.total_pages);
        }
      } catch (error) {
        console.error("Gagal memuat data GTK:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, searchTerm, currentPage]);

  const handlePrintClick = (person: GTKCard) => {
    setSelectedPerson({
      ...person,
      avatar: getFotoUrl(person.foto, ""),
      jabatan: person.jabatan_ptk_id_str || person.jenis_ptk_id_str,
      jenis: type === "guru" ? "Guru" : "Tendik",
    });
    openModal();
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table className="min-w-[600px]">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">NUPTK</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : data.length > 0 ? data.map((item) => (
                <TableRow key={item.ptk_id}>
                  <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                      <div className="flex items-center gap-3">
                           <Avatar src={getFotoUrl(item.foto, "")} size="small" />
                          <span className="font-medium text-gray-800 dark:text-white/90">{item.nama}</span>
                      </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.nuptk || "-"}</TableCell>
                  <TableCell className="px-5 py-4 text-center">
                    <div className="flex justify-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 min-w-[110px]"
                            onClick={() => handlePrintClick(item)}
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Cetak
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                  <TableRow>
                      <TableCell colSpan={3} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
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

      {/* Print Preview Modal */}
      <PrintGTKCardPreview 
        isOpen={isOpen}
        onClose={closeModal}
        person={selectedPerson}
      />
    </>
  );
}

