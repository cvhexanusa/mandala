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

interface ScheduleItem {
  id: number;
  hari: string;
  jam: string;
  mataPelajaran: string;
  guru: string;
  guruAvatar: string;
  ruang: string;
  kelas: string;
}

export const scheduleData: ScheduleItem[] = [
  { id: 1, hari: "Senin", jam: "07:00 - 08:30", mataPelajaran: "Pemrograman Web", guru: "Hendra Wijaya, S.Kom.", guruAvatar: "/images/user/user-01.jpg", ruang: "Lab Komp 1", kelas: "X RPL 1" },
  { id: 2, hari: "Senin", jam: "08:30 - 10:00", mataPelajaran: "Basis Data", guru: "Siti Aminah, S.Pd.", guruAvatar: "/images/user/user-02.jpg", ruang: "Lab Komp 2", kelas: "X RPL 1" },
  { id: 3, hari: "Senin", jam: "10:30 - 12:00", mataPelajaran: "Pendidikan Agama", guru: "Abdul Gani, S.Ag.", guruAvatar: "/images/user/user-03.jpg", ruang: "R. Teori 1", kelas: "X RPL 1" },
  { id: 4, hari: "Selasa", jam: "07:00 - 08:30", mataPelajaran: "Matematika", guru: "Rina Widia, S.Si.", guruAvatar: "/images/user/user-04.jpg", ruang: "R. Teori 2", kelas: "X RPL 1" },
  { id: 5, hari: "Selasa", jam: "08:30 - 10:00", mataPelajaran: "B. Indonesia", guru: "Meli Rosdiana, S.Pd.", guruAvatar: "/images/user/user-05.jpg", ruang: "R. Teori 3", kelas: "X RPL 1" },
  { id: 6, hari: "Rabu", jam: "07:00 - 10:00", mataPelajaran: "Produktif RPL", guru: "Bambang Herlambang, S.T.", guruAvatar: "/images/user/user-06.jpg", ruang: "Lab Komp 3", kelas: "X RPL 1" },
  { id: 7, hari: "Kamis", jam: "07:00 - 08:30", mataPelajaran: "PJOK", guru: "Toto Raharjo, S.Or.", guruAvatar: "/images/user/user-07.jpg", ruang: "Lapangan", kelas: "X RPL 1" },
  { id: 8, hari: "Jumat", jam: "07:00 - 09:00", mataPelajaran: "Sejarah", guru: "Yuni Kartika, S.Pd.", guruAvatar: "/images/user/user-08.jpg", ruang: "R. Teori 1", kelas: "X RPL 1" },
];

interface ScheduleTableProps {
  searchTerm: string;
  dayFilter: string;
  classFilter: string;
}

export default function ScheduleTable({ searchTerm, dayFilter, classFilter }: ScheduleTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = scheduleData.filter(item => {
    const matchesSearch = item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.guru.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = dayFilter === "all" || item.hari === dayFilter;
    const matchesClass = classFilter === "all" || item.kelas === classFilter;
    
    return matchesSearch && matchesDay && matchesClass;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const currentData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table className="min-w-[1000px]">
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Hari</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Jam</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mata Pelajaran</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Guru Pengampu</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ruang</TableCell>
              <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Kelas</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {currentData.length > 0 ? currentData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{item.hari}</TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.jam}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-semibold">{item.mataPelajaran}</TableCell>
                <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <Avatar src={item.guruAvatar} size="small" />
                        <span className="font-medium text-gray-800 dark:text-white/90">{item.guru}</span>
                    </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.ruang}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-white/90 font-medium">{item.kelas}</TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada jadwal ditemukan
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
