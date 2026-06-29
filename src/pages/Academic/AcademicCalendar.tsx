import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, PlusIcon, SearchIcon } from "../../icons";
import Swal from "sweetalert2";
import AcademicCalendarTable, { calendarData } from "../../components/academic/AcademicCalendarTable";
import { exportToExcel } from "../../utils/exportUtils";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";

export default function AcademicCalendar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredCalendar = calendarData.filter(item => {
    const matchesSearch = item.kegiatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.kategori === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handlePrint = () => {
    Swal.fire({
      title: "Mempersiapkan Cetak PDF",
      text: "Menyelaraskan data instansi...",
      timer: 700,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    setTimeout(() => {
      Swal.close();
      setTimeout(() => {
        window.print();
      }, 600);
    }, 700);
  };

  const categoryOptions = [
    { value: "all", label: "Semua Kategori" },
    { value: "Akademik", label: "Akademik" },
    { value: "Libur", label: "Libur" },
    { value: "Ujian", label: "Ujian" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  const handleRegister = () => {
    Swal.fire({
      title: "Tambah Kegiatan?",
      text: "Anda akan menambah kegiatan baru ke kalender akademik.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#465fff",
      confirmButtonText: "Ya, Tambah!",
    });
  };

  const handleExport = () => {
    Swal.fire({
      title: "Export Kalender Akademik?",
      text: `Sebanyak ${filteredCalendar.length} kegiatan akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["Tanggal", "Kegiatan", "Kategori", "Keterangan"];
        const rows = filteredCalendar.map((item) => [
          item.tanggal,
          item.kegiatan,
          item.kategori,
          item.keterangan
        ]);
        exportToExcel(
          `Kalender_Akademik_${new Date().toISOString().slice(0, 10)}.xlsx`,
          "Kalender Akademik",
          "Kalender Akademik Sekolah",
          headers,
          rows
        );
      }
    });
  };

  return (
    <>
      <PageMeta
        title="SIMAK | Kalender Akademik"
        description="Halaman pengelolaan agenda akademik sekolah"
      />

      <PrintReportLayout
        title="LAPORAN KALENDER AKADEMIK SEKOLAH"
        sekolahFilter="all"
        extraFilters={[
          { label: "Kategori", value: categoryFilter === "all" ? "Semua Kategori" : categoryFilter }
        ]}
      />

      <div className="space-y-6 no-print">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Kalender Akademik
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola agenda, ujian, dan hari libur sekolah.
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
              Tambah Kegiatan
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 min-w-[110px]"
                onClick={handlePrint}
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Cetak Kalender
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Cari Kegiatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Table Section */}
        <AcademicCalendarTable 
          searchTerm={searchQuery}
          categoryFilter={categoryFilter}
        />
      </div>

      {/* Print Table (Only Visible in Print) */}
      <div className="print-only">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Kegiatan</th>
              <th>Kategori</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalendar.length > 0 ? (
              filteredCalendar.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{item.tanggal}</td>
                  <td style={{ fontWeight: "bold" }}>{item.kegiatan}</td>
                  <td style={{ textAlign: "center" }}>{item.kategori}</td>
                  <td>{item.keterangan || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  Tidak ada agenda/kegiatan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PrintSignature />
    </>
  );
}
