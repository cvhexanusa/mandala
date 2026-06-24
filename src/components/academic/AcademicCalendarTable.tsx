import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import Badge from "../ui/badge/Badge";

interface CalendarEvent {
  id: number;
  tanggal: string;
  kegiatan: string;
  kategori: "Akademik" | "Libur" | "Ujian" | "Lainnya";
  keterangan: string;
}

export const calendarData: CalendarEvent[] = [
  { id: 1, tanggal: "10 Juli 2026", kegiatan: "Hari Pertama Masuk Sekolah", kategori: "Akademik", keterangan: "Masa Pengenalan Lingkungan Sekolah (MPLS)" },
  { id: 2, tanggal: "17 Agustus 2026", kegiatan: "HUT RI ke-81", kategori: "Libur", keterangan: "Upacara Bendera & Libur Nasional" },
  { id: 3, tanggal: "21 September 2026", kegiatan: "Penilaian Tengah Semester (PTS)", kategori: "Ujian", keterangan: "Semester Ganjil" },
  { id: 4, tanggal: "25 November 2026", kegiatan: "Hari Guru Nasional", kategori: "Lainnya", keterangan: "Peringatan Hari Guru" },
  { id: 5, tanggal: "07 Desember 2026", kegiatan: "Penilaian Akhir Semester (PAS)", kategori: "Ujian", keterangan: "Semester Ganjil" },
  { id: 6, tanggal: "21 Desember 2026", kegiatan: "Pembagian Raport Semester Ganjil", kategori: "Akademik", keterangan: "Tahun Pelajaran 2026/2027" },
  { id: 7, tanggal: "22 Des 2026 - 03 Jan 2027", kegiatan: "Libur Akhir Semester Ganjil", kategori: "Libur", keterangan: "Libur Sekolah" },
];

interface AcademicCalendarTableProps {
  searchTerm: string;
  categoryFilter: string;
}

export default function AcademicCalendarTable({ searchTerm, categoryFilter }: AcademicCalendarTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = calendarData.filter(item => {
    const matchesSearch = item.kegiatan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.kategori === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Akademik": return "primary";
      case "Libur": return "error";
      case "Ujian": return "warning";
      default: return "light";
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tanggal</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kegiatan</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Kategori</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Keterangan</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{item.tanggal}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-semibold">{item.kegiatan}</TableCell>
                <TableCell className="px-5 py-4 text-center">
                  <Badge size="sm" color={getCategoryColor(item.kategori)}>
                    {item.kategori}
                  </Badge>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.keterangan}</TableCell>
              </TableRow>
            ))}
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
