import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon, PencilIcon } from "../../icons";
import Swal from "sweetalert2";
import GradesTable, { gradesData } from "../../components/academic/GradesTable";
import { exportToExcel } from "../../utils/exportUtils";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";

export default function Grades() {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("X RPL 1");
  const [subjectFilter, setSubjectFilter] = useState("Pemrograman Web");

  const filteredGrades = gradesData.filter(item => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nipd.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const classOptions = [
    { value: "X RPL 1", label: "X RPL 1" },
    { value: "X RPL 2", label: "X RPL 2" },
    { value: "XI TKJ 1", label: "XI TKJ 1" },
  ];

  const subjectOptions = [
    { value: "Pemrograman Web", label: "Pemrograman Web" },
    { value: "Basis Data", label: "Basis Data" },
    { value: "Matematika", label: "Matematika" },
  ];

  const handleEditGrades = () => {
    Swal.fire({
      title: "Input Nilai?",
      text: `Membuka form input nilai untuk kelas ${classFilter} mata pelajaran ${subjectFilter}.`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#eab308",
      confirmButtonText: "Ya, Input!",
    });
  };

  const handleExport = () => {
    Swal.fire({
      title: "Export Nilai & Raport?",
      text: `Sebanyak ${filteredGrades.length} data nilai akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = ["Nama Siswa", "NIPD", "Tugas", "UTS", "UAS", "Nilai Akhir", "Predikat"];
        const rows = filteredGrades.map((item) => [
          item.nama,
          item.nipd,
          item.tugas,
          item.uts,
          item.uas,
          item.akhir,
          item.predikat
        ]);
        exportToExcel(
          `Nilai_Siswa_${classFilter.replace(/\s+/g, '_')}_${subjectFilter.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          "Nilai Siswa",
          `Nilai Siswa Kelas ${classFilter} - ${subjectFilter}`,
          headers,
          rows
        );
      }
    });
  };

  return (
    <>
      <PageMeta
        title="SIMAK | Nilai & Raport"
        description="Halaman pengelolaan nilai siswa"
      />

      <PrintReportLayout
        title="LAPORAN DAFTAR KUMPULAN NILAI SISWA (LEGER)"
        sekolahFilter="all"
        extraFilters={[
          { label: "Mata Pelajaran", value: subjectFilter },
          { label: "Kelas/Rombel", value: classFilter }
        ]}
      />

      <div className="space-y-6 no-print">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Nilai & Raport
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola pencapaian akademik dan nilai hasil belajar siswa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                className="text-warning-600 border-warning-600 hover:bg-warning-50 dark:text-warning-400 dark:border-warning-400 dark:hover:bg-warning-950 min-w-[110px]"
                onClick={handleEditGrades}
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Input Nilai
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 min-w-[110px]"
                onClick={handlePrint}
            >
              <PrinterIcon className="mr-2 h-4 w-4" />
              Cetak Raport
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
                placeholder="Cari Nama Siswa atau NIPD..."
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
            <Select
              options={subjectOptions}
              value={subjectFilter}
              onChange={(value) => setSubjectFilter(value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Table Section */}
        <GradesTable 
          searchTerm={searchQuery}
        />
      </div>

      {/* Print Table (Only Visible in Print) */}
      <div className="print-only">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>NIPD</th>
              <th>Tugas</th>
              <th>UTS</th>
              <th>UAS</th>
              <th>Nilai Akhir</th>
              <th>Predikat</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrades.length > 0 ? (
              filteredGrades.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td style={{ fontWeight: "bold" }}>{item.nama}</td>
                  <td style={{ fontFamily: "monospace" }}>{item.nipd}</td>
                  <td style={{ textAlign: "center" }}>{item.tugas}</td>
                  <td style={{ textAlign: "center" }}>{item.uts}</td>
                  <td style={{ textAlign: "center" }}>{item.uas}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{item.akhir}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{item.predikat}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center" }}>
                  Tidak ada data nilai.
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
