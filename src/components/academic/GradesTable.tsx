import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "../common/Pagination";
import Avatar from "../ui/avatar/Avatar";

interface GradeRecord {
  id: number;
  nama: string;
  avatar: string;
  nipd: string;
  tugas: number;
  uts: number;
  uas: number;
  akhir: number;
  predikat: "A" | "B" | "C" | "D";
}

export const gradesData: GradeRecord[] = [
  { id: 1, nama: "Aditya Pratama", avatar: "/images/user/user-01.jpg", nipd: "1001", tugas: 85, uts: 80, uas: 90, akhir: 85, predikat: "A" },
  { id: 2, nama: "Bella Safira", avatar: "/images/user/user-02.jpg", nipd: "1002", tugas: 90, uts: 85, uas: 88, akhir: 88, predikat: "A" },
  { id: 3, nama: "Candra Wijaya", avatar: "/images/user/user-03.jpg", nipd: "1003", tugas: 75, uts: 70, uas: 78, akhir: 74, predikat: "B" },
  { id: 4, nama: "Dian Pelangi", avatar: "/images/user/user-04.jpg", nipd: "1004", tugas: 95, uts: 92, uas: 94, akhir: 94, predikat: "A" },
  { id: 5, nama: "Erlangga Putra", avatar: "/images/user/user-05.jpg", nipd: "1005", tugas: 70, uts: 65, uas: 72, akhir: 69, predikat: "C" },
  { id: 6, nama: "Fania Rahma", avatar: "/images/user/user-06.jpg", nipd: "1006", tugas: 82, uts: 80, uas: 85, akhir: 82, predikat: "B" },
  { id: 7, nama: "Gilang Dirga", avatar: "/images/user/user-07.jpg", nipd: "1007", tugas: 60, uts: 55, uas: 65, akhir: 60, predikat: "D" },
];

interface GradesTableProps {
  searchTerm: string;
}

export default function GradesTable({ searchTerm }: GradesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = gradesData.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nipd.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Siswa</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">NIPD</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Tugas</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">UTS</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">UAS</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Nilai Akhir</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Predikat</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Avatar src={item.avatar} size="small" />
                        <span className="font-medium text-gray-800 dark:text-white/90">{item.nama}</span>
                    </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.nipd}</TableCell>
                <TableCell className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">{item.tugas}</TableCell>
                <TableCell className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">{item.uts}</TableCell>
                <TableCell className="px-5 py-4 text-center text-gray-500 dark:text-gray-400">{item.uas}</TableCell>
                <TableCell className="px-5 py-4 text-center font-bold text-gray-800 dark:text-white/90">{item.akhir}</TableCell>
                <TableCell className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.predikat === 'A' ? 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400' :
                        item.predikat === 'B' ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400' :
                        item.predikat === 'C' ? 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400' :
                        'bg-error-5 text-error-700 dark:bg-error-950 dark:text-error-400'
                    }`}>
                        {item.predikat}
                    </span>
                </TableCell>
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
