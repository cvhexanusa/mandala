import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, PlusIcon, SearchIcon } from "../../icons";
import Swal from "sweetalert2";
import ScheduleTable, { scheduleData } from "../../components/academic/ScheduleTable";
import { exportToExcel } from "../../utils/exportUtils";

export default function Schedule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const dayOptions = [
    { value: "all", label: "Semua Hari" },
    { value: "Senin", label: "Senin" },
    { value: "Selasa", label: "Selasa" },
    { value: "Rabu", label: "Rabu" },
    { value: "Kamis", label: "Kamis" },
    { value: "Jumat", label: "Jumat" },
  ];

  const classOptions = [
    { value: "all", label: "Semua Kelas" },
    { value: "X RPL 1", label: "X RPL 1" },
    { value: "X RPL 2", label: "X RPL 2" },
    { value: "XI TKJ 1", label: "XI TKJ 1" },
  ];

  const handleRegister = () => {
    Swal.fire({
      title: "Tambah Jadwal?",
      text: "Anda akan menambah jadwal pelajaran baru.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#465fff",
      confirmButtonText: "Ya, Tambah!",
    });
  };

  const handleExport = () => {
    const filtered = scheduleData.filter(item => {
      const matchesSearch = item.mataPelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.guru.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDay = dayFilter === "all" || item.hari === dayFilter;
      const matchesClass = classFilter === "all" || item.kelas === classFilter;
      return matchesSearch && matchesDay && matchesClass;
    });

    Swal.fire({
      title: "Export Jadwal Pelajaran?",
      text: `Sebanyak ${filtered.length} data jadwal akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["Hari", "Jam", "Mata Pelajaran", "Guru Pengampu", "Ruang", "Kelas"];
        const rows = filtered.map((item) => [
          item.hari,
          item.jam,
          item.mataPelajaran,
          item.guru,
          item.ruang,
          item.kelas
        ]);
        exportToExcel(
          `Jadwal_Pelajaran_${classFilter.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          "Jadwal Pelajaran",
          `Jadwal Pelajaran Kelas ${classFilter === 'all' ? 'Semua' : classFilter}`,
          headers,
          rows
        );
      }
    });
  };

  return (
    <>
      <PageMeta
        title="SIMAK | Jadwal Pelajaran"
        description="Halaman pengelolaan jadwal pelajaran sekolah"
      />
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Jadwal Pelajaran
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola waktu dan distribusi mata pelajaran di sekolah.
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
              Register
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 min-w-[110px]"
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Cetak
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-success-600 border-success-600 hover:bg-success-50 dark:text-success-400 dark:border-success-400 dark:hover:bg-success-950 min-w-[110px]"
                onClick={handleExport}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export
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
                placeholder="Cari Mata Pelajaran atau Guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={dayOptions}
              value={dayFilter}
              onChange={(value) => setDayFilter(value)}
              className="w-full"
            />
            <Select
              options={classOptions}
              value={classFilter}
              onChange={(value) => setClassFilter(value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Table Section */}
        <ScheduleTable 
          searchTerm={searchQuery}
          dayFilter={dayFilter}
          classFilter={classFilter}
        />
      </div>
    </>
  );
}
