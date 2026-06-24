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
import Badge from "../ui/badge/Badge";

interface AttendanceRecord {
  id: number;
  nama: string;
  avatar: string;
  nipd: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alfa";
  keterangan: string;
}

export const attendanceData: AttendanceRecord[] = [
  { id: 1, nama: "Aditya Pratama", avatar: "/images/user/user-01.jpg", nipd: "1001", status: "Hadir", keterangan: "-" },
  { id: 2, nama: "Bella Safira", avatar: "/images/user/user-02.jpg", nipd: "1002", status: "Hadir", keterangan: "-" },
  { id: 3, nama: "Candra Wijaya", avatar: "/images/user/user-03.jpg", nipd: "1003", status: "Sakit", keterangan: "Demam" },
  { id: 4, nama: "Dian Pelangi", avatar: "/images/user/user-04.jpg", nipd: "1004", status: "Hadir", keterangan: "-" },
  { id: 5, nama: "Erlangga Putra", avatar: "/images/user/user-05.jpg", nipd: "1005", status: "Izin", keterangan: "Acara Keluarga" },
  { id: 6, nama: "Fania Rahma", avatar: "/images/user/user-06.jpg", nipd: "1006", status: "Hadir", keterangan: "-" },
  { id: 7, nama: "Gilang Dirga", avatar: "/images/user/user-07.jpg", nipd: "1007", status: "Alfa", keterangan: "Tanpa Keterangan" },
];

interface AttendanceTableProps {
  searchTerm: string;
  statusFilter: string;
}

export default function AttendanceTable({ searchTerm, statusFilter }: AttendanceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = attendanceData.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.nipd.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hadir": return "success";
      case "Sakit": return "warning";
      case "Izin": return "primary";
      case "Alfa": return "error";
      default: return "light";
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nama Siswa</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">NIPD</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">Status Kehadiran</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Keterangan</TableCell>
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
                <TableCell className="px-5 py-4 text-center">
                  <Badge size="sm" color={getStatusColor(item.status)}>
                    {item.status}
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
