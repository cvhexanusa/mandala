import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, UserCircleIcon, CheckCircleIcon, SearchIcon, PencilIcon } from "../../icons";
import Swal from "sweetalert2";
import RombelTable from "../../components/school/RombelTable";
import WaliTable from "../../components/school/WaliTable";
import EkskulTable from "../../components/school/EkskulTable";
import RekapRombelKategoriTable from "../../components/school/RekapRombelKategoriTable";
import RekapRombelKompetensiTable from "../../components/school/RekapRombelKompetensiTable";
import { exportToCSV } from "../../utils/exportUtils";
import { dapodikService } from "../../services/dapodikService";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";

export default function ClassData() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as "reguler" | "praktik" | "ekskul" | "pilihan" | "wali" | "rekap";
  
  const [activeTab, setActiveTab] = useState<"reguler" | "praktik" | "ekskul" | "pilihan" | "wali" | "rekap">(
    tabParam || "reguler"
  );

  // Sync state with URL parameter
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [printData, setPrintData] = useState<any[] | null>(null);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewingSiswa, setIsViewingSiswa] = useState(false);

  const gradeOptions = [
    { value: "all", label: "Semua Tingkat" },
    { value: "10", label: "Tingkat 10" },
    { value: "11", label: "Tingkat 11" },
    { value: "12", label: "Tingkat 12" },
  ];

  const rowsPerPageOptions = [
    { value: "10", label: "10" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleEditData = () => {
    Swal.fire({
      title: "Ubah Data?",
      text: `Anda akan mengubah data untuk ${selectedIds.length} item yang dipilih.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#465fff",
      confirmButtonText: "Ya, Ubah!",
    });
  };

  const handleRegister = () => {
    Swal.fire({
      title: `Registrasi ${activeTab === 'wali' ? 'Wali Kelas' : 'Rombel'}?`,
      text: `Anda akan meregistrasi ${selectedIds.length} data yang dipilih.`,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#465fff",
      confirmButtonText: "Ya, Registrasi!",
    });
  };

  const handleShowProfile = () => {
    Swal.fire({
      title: "Lihat Profil?",
      text: `Menampilkan profil untuk ${selectedIds.length} data yang dipilih.`,
      icon: "info",
      confirmButtonColor: "#465fff",
    });
  };

  const handleExport = async () => {
    const labelMap: Record<string, string> = {
      reguler: "Rombel Reguler",
      praktik: "Rombel Praktik",
      ekskul: "Rombel Ekskul",
      pilihan: "Rombel Pilihan",
      wali: "Wali Kelas",
      rekap: "Rekap Rombel",
    };

    const labelTab = labelMap[activeTab] || "Rombongan Belajar";

    Swal.fire({
      title: `Export Data ${labelTab}?`,
      text: `Data ${labelTab} akan diunduh dalam format CSV (Kompatibel dengan Excel).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Mempersiapkan Data",
          text: "Mohon tunggu, sedang mengambil data...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        try {
          let headers: string[] = [];
          let rows: any[][] = [];

          if (activeTab === "reguler" || activeTab === "praktik" || activeTab === "pilihan") {
            const apiType = activeTab === "pilihan" ? "pilihan" : "reguler";
            const response = await dapodikService.getRombonganBelajar(apiType, 1000, 1, searchQuery, gradeFilter === "all" ? "" : gradeFilter);
            const dataArray = (response && Array.isArray(response.data)) ? response.data : [];

            headers = ["No", "Nama Rombel", "Wali Kelas", "Tingkat", "Kurikulum", "Ruang", "Jumlah PD", "Moving Kelas", "Kebutuhan Khusus"];
            rows = dataArray.map((item: any, index: number) => [
              index + 1,
              item.nama || "-",
              item.ptk_id_str || "-",
              item.tingkat_pendidikan_id_str || "-",
              item.kurikulum_id_str || "-",
              item.id_ruang_str || "-",
              item.jumlah_siswa || 0,
              item.movingKelas || "Tidak",
              item.kebutuhanKhusus || "Tidak"
            ]);
          } else if (activeTab === "ekskul") {
            const response = await dapodikService.getEkstrakurikuler(searchQuery);
            const dataArray = (response && Array.isArray(response.data)) ? response.data : [];

            headers = ["No", "Nama Ekskul", "Pembina", "Prasarana"];
            rows = dataArray.map((item: any, index: number) => [
              index + 1,
              item.nama || "-",
              item.ptk_id_str || "-",
              item.id_ruang_str || "-"
            ]);
          } else if (activeTab === "wali") {
            // Local waliData representation
            const localWali = [
              { namaRombel: "X RPL 1", namaWali: "H. Ahmad Subardjo, M.Pd.", ruang: "Lab Komp 1", anggotaRombel: 36 },
              { namaRombel: "X RPL 2", namaWali: "Siti Aminah, S.Pd.", ruang: "Lab Komp 2", anggotaRombel: 34 },
              { namaRombel: "X TKJ 1", namaWali: "Abdul Gani, S.Ag.", ruang: "Lab Cisco 1", anggotaRombel: 32 },
              { namaRombel: "X TKJ 2", namaWali: "Rina Widia, S.Si.", ruang: "Lab Cisco 2", anggotaRombel: 30 },
              { namaRombel: "X AK 1", namaWali: "Meli Rosdiana, S.Pd.", ruang: "R. Teori 1", anggotaRombel: 35 },
              { namaRombel: "XI RPL 1", namaWali: "Bambang Herlambang, S.T.", ruang: "Lab Komp 3", anggotaRombel: 32 },
              { namaRombel: "XI RPL 2", namaWali: "Toto Raharjo, S.Or.", ruang: "Lab Komp 4", anggotaRombel: 33 },
              { namaRombel: "XI TKJ 1", namaWali: "Yuni Kartika, S.Pd.", ruang: "Lab Jaringan", anggotaRombel: 31 },
              { namaRombel: "XI MM 1", namaWali: "Dadan Ramdan, M.T.", ruang: "Studio TV", anggotaRombel: 34 },
              { namaRombel: "XI AK 1", namaWali: "Endang Suherman", ruang: "R. Peraga", anggotaRombel: 36 },
              { namaRombel: "XII RPL 1", namaWali: "Dewi Sartika, S.Pd.", ruang: "Lab RPL Baru", anggotaRombel: 35 },
              { namaRombel: "XII RPL 2", namaWali: "Farida Utami, S.Pd.", ruang: "R. Proyek", anggotaRombel: 34 },
              { namaRombel: "XII TKJ 1", namaWali: "Ginanjar Saputra", ruang: "Lab Server", anggotaRombel: 32 },
              { namaRombel: "XII MM 1", namaWali: "Hendra Wijaya, S.Kom.", ruang: "Studio Foto", anggotaRombel: 35 },
              { namaRombel: "XII MM 2", namaWali: "Iis Dahlia, S.Pd.", ruang: "Lab Animasi", anggotaRombel: 33 },
              { namaRombel: "XII AK 1", namaWali: "Jaka Tarub, M.Si.", ruang: "Bank Mini", anggotaRombel: 36 },
              { namaRombel: "X MM 1", namaWali: "Kiki Amalia, S.Pd.", ruang: "R. Multimedia", anggotaRombel: 34 },
              { namaRombel: "XI TKJ 2", namaWali: "Lukman Hakim", ruang: "R. Network", anggotaRombel: 30 },
              { namaRombel: "XII TKJ 2", namaWali: "Mira Setiawati", ruang: "Lab Fiber Optic", anggotaRombel: 31 },
              { namaRombel: "X RPL 3", namaWali: "Nadia Utami", ruang: "Lab Mobile", anggotaRombel: 35 }
            ];

            const filteredWali = localWali.filter(item => 
              item.namaRombel.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.namaWali.toLowerCase().includes(searchQuery.toLowerCase())
            );

            headers = ["No", "Nama Rombel", "Nama Wali", "Ruang", "Anggota Rombel"];
            rows = filteredWali.map((item, index) => [
              index + 1,
              item.namaRombel,
              item.namaWali,
              item.ruang,
              item.anggotaRombel
            ]);
          } else if (activeTab === "rekap") {
            // Summary export
            headers = ["No", "Kategori Rekapitulasi", "Keterangan"];
            rows = [
              [1, "Rekap Rombel berdasarkan Kategori", "Tersedia di tabel dashboard"],
              [2, "Rekap Rombel berdasarkan Kompetensi", "Tersedia di tabel dashboard"]
            ];
          }

          Swal.close();
          const filename = `Data_${labelTab.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
          exportToCSV(filename, headers, rows);
        } catch (error) {
          console.error("Gagal mengambil data untuk export:", error);
          Swal.close();
          Swal.fire({
            title: "Error",
            text: "Gagal mengambil data dari server.",
            icon: "error",
            confirmButtonColor: "#ef4444"
          });
        }
      }
    });
  };

  const handlePrint = async () => {
    if (activeTab === "rekap") {
      window.print();
      return;
    }

    Swal.fire({
      title: "Mempersiapkan Cetak PDF",
      text: "Sedang memuat seluruh data laporan...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      let fetchedData: any[] = [];

      if (activeTab === "reguler" || activeTab === "praktik" || activeTab === "pilihan") {
        const apiType = activeTab === "pilihan" ? "pilihan" : "reguler";
        const response = await dapodikService.getRombonganBelajar(apiType, 1000, 1, searchQuery, gradeFilter === "all" ? "" : gradeFilter);
        fetchedData = (response && Array.isArray(response.data)) ? response.data : [];
      } else if (activeTab === "ekskul") {
        const response = await dapodikService.getEkstrakurikuler(searchQuery);
        fetchedData = (response && Array.isArray(response.data)) ? response.data : [];
      } else if (activeTab === "wali") {
        const localWali = [
          { namaRombel: "X RPL 1", namaWali: "H. Ahmad Subardjo, M.Pd.", ruang: "Lab Komp 1", anggotaRombel: 36 },
          { namaRombel: "X RPL 2", namaWali: "Siti Aminah, S.Pd.", ruang: "Lab Komp 2", anggotaRombel: 34 },
          { namaRombel: "X TKJ 1", namaWali: "Abdul Gani, S.Ag.", ruang: "Lab Cisco 1", anggotaRombel: 32 },
          { namaRombel: "X TKJ 2", namaWali: "Rina Widia, S.Si.", ruang: "Lab Cisco 2", anggotaRombel: 30 },
          { namaRombel: "X AK 1", namaWali: "Meli Rosdiana, S.Pd.", ruang: "R. Teori 1", anggotaRombel: 35 },
          { namaRombel: "XI RPL 1", namaWali: "Bambang Herlambang, S.T.", ruang: "Lab Komp 3", anggotaRombel: 32 },
          { namaRombel: "XI RPL 2", namaWali: "Toto Raharjo, S.Or.", ruang: "Lab Komp 4", anggotaRombel: 33 },
          { namaRombel: "XI TKJ 1", namaWali: "Yuni Kartika, S.Pd.", ruang: "Lab Jaringan", anggotaRombel: 31 },
          { namaRombel: "XI MM 1", namaWali: "Dadan Ramdan, M.T.", ruang: "Studio TV", anggotaRombel: 34 },
          { namaRombel: "XI AK 1", namaWali: "Endang Suherman", ruang: "R. Peraga", anggotaRombel: 36 },
          { namaRombel: "XII RPL 1", namaWali: "Dewi Sartika, S.Pd.", ruang: "Lab RPL Baru", anggotaRombel: 35 },
          { namaRombel: "XII RPL 2", namaWali: "Farida Utami, S.Pd.", ruang: "R. Proyek", anggotaRombel: 34 },
          { namaRombel: "XII TKJ 1", namaWali: "Ginanjar Saputra", ruang: "Lab Server", anggotaRombel: 32 },
          { namaRombel: "XII MM 1", namaWali: "Hendra Wijaya, S.Kom.", ruang: "Studio Foto", anggotaRombel: 35 },
          { namaRombel: "XII MM 2", namaWali: "Iis Dahlia, S.Pd.", ruang: "Lab Animasi", anggotaRombel: 33 },
          { namaRombel: "XII AK 1", namaWali: "Jaka Tarub, M.Si.", ruang: "Bank Mini", anggotaRombel: 36 },
          { namaRombel: "X MM 1", namaWali: "Kiki Amalia, S.Pd.", ruang: "R. Multimedia", anggotaRombel: 34 },
          { namaRombel: "XI TKJ 2", namaWali: "Lukman Hakim", ruang: "R. Network", anggotaRombel: 30 },
          { namaRombel: "XII TKJ 2", namaWali: "Mira Setiawati", ruang: "Lab Fiber Optic", anggotaRombel: 31 },
          { namaRombel: "X RPL 3", namaWali: "Nadia Utami", ruang: "Lab Mobile", anggotaRombel: 35 }
        ];

        fetchedData = localWali.filter(item => 
          item.namaRombel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.namaWali.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setPrintData(fetchedData);
      Swal.close();

      setTimeout(() => {
        const handleAfterPrint = () => {
          setPrintData(null);
          window.removeEventListener("afterprint", handleAfterPrint);
        };
        window.addEventListener("afterprint", handleAfterPrint);
        window.print();
      }, 500);
    } catch (error) {
      console.error("Gagal mengambil data cetak:", error);
      Swal.close();
      Swal.fire("Error", "Gagal memuat data cetak dari server.", "error");
    }
  };

  return (
    <>
      <PageMeta
        title="Rombongan Belajar | SIMAK Admin Panel"
        description="Rombongan Belajar management page"
      />

      <PrintReportLayout
        title={
          activeTab === "reguler" ? "LAPORAN DATA ROMBONGAN BELAJAR REGULER" :
          activeTab === "praktik" ? "LAPORAN DATA ROMBONGAN BELAJAR PRAKTIK" :
          activeTab === "ekskul" ? "LAPORAN DATA ROMBONGAN BELAJAR EKSTRAKURIKULER" :
          activeTab === "pilihan" ? "LAPORAN DATA ROMBONGAN BELAJAR PILIHAN" :
          activeTab === "wali" ? "LAPORAN DATA WALI KELAS" : "LAPORAN REKAPITULASI ROMBONGAN BELAJAR"
        }
        sekolahFilter="all"
      />

      <div className="space-y-6 no-print">
        {/* Header Section */}
        {!isViewingSiswa && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Rombongan Belajar (Rombel)
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Kelola informasi rombongan belajar, praktik, dan wali kelas di sini.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {selectedIds.length > 0 && (
                <>
                  <Button
                    variant="error-outline"
                    size="sm"
                    className="min-w-[110px]"
                    startIcon={<CheckCircleIcon className="size-4" />}
                    onClick={handleRegister}
                  >
                    Register
                  </Button>
                  <Button
                    variant="primary-outline"
                    size="sm"
                    className="min-w-[110px]"
                    startIcon={<UserCircleIcon className="size-4" />}
                    onClick={handleShowProfile}
                  >
                    Profil
                  </Button>
                  <Button
                    variant="warning-outline"
                    size="sm"
                    className="min-w-[110px]"
                    startIcon={<PencilIcon className="size-4" />}
                    onClick={handleEditData}
                  >
                    Ubah
                  </Button>
                </>
              )}
              <Button
                variant="success-outline"
                size="sm"
                className="min-w-[110px]"
                startIcon={<DownloadIcon className="size-4" />}
                onClick={handleExport}
              >
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[110px]"
                startIcon={<PrinterIcon className="size-4" />}
                onClick={handlePrint}
              >
                Cetak
              </Button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          {activeTab !== "rekap" && (
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
              <div className="w-20">
                <Select
                  options={rowsPerPageOptions}
                  defaultValue={itemsPerPage.toString()}
                  onChange={(value) => setItemsPerPage(parseInt(value))}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 max-w-2xl w-full lg:justify-end">
                <div className="relative max-w-sm w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <SearchIcon className="size-5" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Cari Rombel atau Wali..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {(activeTab === "reguler" || activeTab === "praktik") && (
                  <div className="w-full sm:w-56">
                      <Select
                          options={gradeOptions}
                          defaultValue={gradeFilter}
                          onChange={(value) => setGradeFilter(value)}
                      />
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === "reguler" || activeTab === "praktik" || activeTab === "pilihan") && (
            <RombelTable 
              type={activeTab}
              onSelectionChange={handleSelectionChange} 
              searchTerm={searchQuery} 
              gradeFilter={gradeFilter}
              itemsPerPage={itemsPerPage}
              onViewingStateChange={setIsViewingSiswa}
            />
          )}

          {activeTab === "ekskul" && (
            <EkskulTable 
              onSelectionChange={handleSelectionChange} 
              searchTerm={searchQuery}
              itemsPerPage={itemsPerPage}
            />
          )}

          {activeTab === "wali" && (
            <WaliTable 
              onSelectionChange={handleSelectionChange} 
              searchTerm={searchQuery}
              itemsPerPage={itemsPerPage}
            />
          )}

          {activeTab === "rekap" && (
            <div className="space-y-8">
              <div>
                <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                  Rekap Rombel berdasarkan Kategori
                </h4>
                <RekapRombelKategoriTable />
              </div>
              <div className="pt-6 border-t border-gray-100 dark:border-white/[0.05]">
                <h4 className="mb-4 text-md font-semibold text-gray-800 dark:text-white/90">
                  Rekap Rombel berdasarkan Kompetensi Keahlian
                </h4>
                <RekapRombelKompetensiTable />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Table (Only Visible in Print) */}
      {printData && (
        <div className="print-only">
          {activeTab === "ekskul" ? (
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Ekskul</th>
                  <th>Pembina Ekskul</th>
                  <th>Prasarana / Ruangan</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{item.nama || "-"}</td>
                    <td>{item.ptk_id_str || "-"}</td>
                    <td>{item.id_ruang_str || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "wali" ? (
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Rombel</th>
                  <th>Nama Wali Kelas</th>
                  <th>Ruangan</th>
                  <th>Jumlah Anggota Rombel</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{item.namaRombel}</td>
                    <td>{item.namaWali}</td>
                    <td>{item.ruang}</td>
                    <td style={{ textAlign: "center" }}>{item.anggotaRombel} Siswa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Rombel</th>
                  <th>Wali Kelas</th>
                  <th>Tingkat</th>
                  <th>Kurikulum</th>
                  <th>Ruang Kelas</th>
                  <th>Jumlah Siswa</th>
                  <th>Moving Kelas</th>
                  <th>Kebutuhan Khusus</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((item, index) => (
                  <tr key={item.rombel_id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{item.nama || "-"}</td>
                    <td>{item.ptk_id_str || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.tingkat_pendidikan_id_str || "-"}</td>
                    <td>{item.kurikulum_id_str || "-"}</td>
                    <td>{item.id_ruang_str || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.jumlah_siswa || 0}</td>
                    <td style={{ textAlign: "center" }}>{item.movingKelas || "Tidak"}</td>
                    <td style={{ textAlign: "center" }}>{item.kebutuhanKhusus || "Tidak"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab !== "rekap" && <PrintSignature />}
    </>
  );
}
