import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, PlusIcon, SearchIcon } from "../../icons";
import Swal from "sweetalert2";
import AttendanceTable, { attendanceData } from "../../components/academic/AttendanceTable";
import { exportToExcel } from "../../utils/exportUtils";

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("X RPL 1");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "Hadir", label: "Hadir" },
    { value: "Sakit", label: "Sakit" },
    { value: "Izin", label: "Izin" },
    { value: "Alfa", label: "Alfa" },
  ];

  const classOptions = [
    { value: "X RPL 1", label: "X RPL 1" },
    { value: "X RPL 2", label: "X RPL 2" },
    { value: "XI TKJ 1", label: "XI TKJ 1" },
  ];

  const handleRegister = () => {
    Swal.fire({
      title: "Input Presensi?",
      text: `Membuka form presensi untuk kelas ${classFilter} tanggal ${dateFilter}.`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#465fff",
      confirmButtonText: "Ya, Input!",
    });
  };

  const handleExport = () => {
    const filtered = attendanceData.filter(item => {
      const matchesSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.nipd.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    Swal.fire({
      title: "Export Presensi Siswa?",
      text: `Sebanyak ${filtered.length} data presensi akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["Nama Siswa", "NIPD", "Status Kehadiran", "Keterangan"];
        const rows = filtered.map((item) => [
          item.nama,
          item.nipd,
          item.status,
          item.keterangan
        ]);
        exportToExcel(
          `Presensi_Siswa_${classFilter.replace(/\s+/g, '_')}_${dateFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          "Presensi Siswa",
          `Presensi Siswa Kelas ${classFilter} Tanggal ${dateFilter}`,
          headers,
          rows
        );
      }
    });
  };

  return (
    <>
      <PageMeta
        title="SIMAK | Presensi Peserta Didik"
        description="Halaman pengelolaan kehadiran peserta didik"
      />
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Presensi Peserta Didik
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pantau dan kelola tingkat kehadiran peserta didik.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                className="text-error-600 border-error-600 hover:bg-error-50 dark:text-error-400 dark:border-error-400 dark:hover:bg-error-950 min-w-[110px]"
                onClick={handleRegister}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Input Presensi
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 min-w-[110px]"
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Cetak Laporan
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-success-600 border-success-600 hover:bg-success-50 dark:text-success-400 dark:border-success-400 dark:hover:bg-success-950 min-w-[110px]"
                onClick={handleExport}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Rekap Bulanan
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03] md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Cari Nama Peserta Didik atau NIPD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={classOptions}
              value={classFilter}
              onChange={(value) => setClassFilter(value)}
              className="w-full"
            />
            <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Table Section */}
        <AttendanceTable 
          searchTerm={searchQuery}
          statusFilter={statusFilter}
        />
      </div>
    </>
  );
}
