import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { DownloadIcon, PrinterIcon, SearchIcon, EyeIcon } from "../../icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Avatar from "../../components/ui/avatar/Avatar";
import Badge from "../../components/ui/badge/Badge";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";
import { exportToExcel } from "../../utils/exportUtils";
import PrintReportLayout, { PrintSignature } from "../../components/common/PrintReportLayout";

export default function KepalaSekolahData() {
  const navigate = useNavigate();
  const { role } = useParams();
  
  const [schools, setSchools] = useState<any[]>([]);
  const [headmasters, setHeadmasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sekolahFilter, setSekolahFilter] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [schoolRes, gtkRes] = await Promise.all([
          dapodikService.getSekolah(),
          dapodikService.getGTK(500, "", 1, "tendik", "aktif")
        ]);

        let schoolList = [];
        if (schoolRes.status === 'success' || schoolRes.success === true) {
          schoolList = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schoolList = schoolRes;
        } else if (schoolRes.data && Array.isArray(schoolRes.data)) {
          schoolList = schoolRes.data;
        }
        setSchools(schoolList);

        let gtkList = [];
        if (gtkRes.status === 'success' || gtkRes.success === true) {
          gtkList = gtkRes.data || [];
        } else if (Array.isArray(gtkRes)) {
          gtkList = gtkRes;
        } else if (gtkRes.data && Array.isArray(gtkRes.data)) {
          gtkList = gtkRes.data;
        }

        // Filter headmasters: jenis_ptk or tugas_tambahan contains "kepala sekolah"
        const ksList = gtkList.filter((g: any) => 
          g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
          g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
        );
        setHeadmasters(ksList);
      } catch (err) {
        console.error("Gagal memuat data Kepala Sekolah:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const schoolOptions = [
    { value: "all", label: "Pilih Sekolah" },
    ...schools.map((s) => ({ value: s.sekolah_id, label: s.nama }))
  ];

  const filteredHeadmasters = headmasters.filter((hm) => {
    const school = schools.find((s) => s.sekolah_id === hm.identitas?.sekolah_id);
    const schoolName = school ? school.nama : "";
    const hmName = hm.identitas?.nama || "";
    const nuptk = hm.identitas?.nuptk || "";

    const matchesSearch = 
      hmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nuptk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool = sekolahFilter === "all" || hm.identitas?.sekolah_id === sekolahFilter;

    return matchesSearch && matchesSchool;
  });

  const getSchoolName = (sekolahId: string) => {
    const school = schools.find((s) => s.sekolah_id === sekolahId);
    return school ? school.nama : sekolahId || "-";
  };

  const handleExport = () => {
    if (filteredHeadmasters.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data kepala sekolah yang dapat diekspor.",
        icon: "warning",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    Swal.fire({
      title: "Export Data Kepala Sekolah?",
      text: "Data Kepala Sekolah akan diunduh dalam format Excel.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = [
          "No",
          "Nama Kepala Sekolah",
          "JK",
          "Nama Instansi / Sekolah",
          "NUPTK",
          "Status Kepegawaian",
          "Nomor Telepon"
        ];

        const rows = filteredHeadmasters.map((item, index) => {
          const no = (index + 1).toString();
          const nama = item.identitas?.nama || "-";
          const jk = item.identitas?.jenis_kelamin || "-";
          const sekolah = getSchoolName(item.identitas?.sekolah_id);
          const nuptk = item.identitas?.nuptk || "-";
          const status = item.kepegawaian?.status_kepegawaian || "-";
          const telpRaw = item.data_pendukung?.no_hp || item.no_hp || item.identitas?.no_hp || item.data_pendukung?.no_telepon_rumah || item.no_telepon_rumah || "-";
          const telp = telpRaw || "-";

          return [no, nama, jk, sekolah, nuptk, status, telp];
        });

        const filename = `Data_Kepala_Sekolah_${new Date().toISOString().slice(0, 10)}.xlsx`;
        exportToExcel(filename, "Kepala Sekolah", "Data Kepala Sekolah", headers, rows);
      }
    });
  };

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

  return (
    <>
      <PageMeta
        title="Kepala Sekolah | SIMAK Admin Panel"
        description="Kepala Sekolah management page"
      />

      <PrintReportLayout
        title="LAPORAN DATA INDUK KEPALA SEKOLAH"
        sekolahFilter={sekolahFilter}
        schools={schools}
      />

      <div className="space-y-6 no-print">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Kepala Sekolah
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Lihat dan kelola informasi Kepala Sekolah dari masing-masing instansi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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

        {/* Filters Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative col-span-1 sm:col-span-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-5" />
              </span>
              <Input
                type="text"
                placeholder="Cari Nama Kepala Sekolah, NUPTK, atau Nama Sekolah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select
                options={schoolOptions}
                defaultValue={sekolahFilter}
                onChange={(value) => setSekolahFilter(value)}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 print-area">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto custom-scrollbar relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center min-h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              )}
              <Table className="min-w-[1000px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400 whitespace-nowrap w-16">No</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Kepala Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 whitespace-nowrap">JK</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nama Instansi / Sekolah</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">NUPTK</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Status Kepegawaian</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 whitespace-nowrap">Nomor Telepon</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 whitespace-nowrap w-24">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {filteredHeadmasters.length > 0 ? (
                    filteredHeadmasters.map((item, index) => (
                      <TableRow key={item.identitas?.id || index}>
                        <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{index + 1}</TableCell>
                        <TableCell className="px-5 py-4 text-start whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar src={item.identitas?.foto} size="small" />
                            <span className="font-medium text-gray-800 dark:text-white/90">{item.identitas?.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-center text-theme-sm dark:text-gray-400">{item.identitas?.jenis_kelamin}</TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 font-medium">
                          {getSchoolName(item.identitas?.sekolah_id)}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.identitas?.nuptk || "-"}</TableCell>
                        <TableCell className="px-5 py-4 text-start">
                          <Badge size="sm" color={item.kepegawaian?.status_kepegawaian === "PNS" ? "success" : item.kepegawaian?.status_kepegawaian === "PPPK" ? "warning" : "light"}>
                            {item.kepegawaian?.status_kepegawaian || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {item.data_pendukung?.no_hp || item.no_hp || item.identitas?.no_hp || item.data_pendukung?.no_telepon_rumah || item.no_telepon_rumah || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          <button
                            onClick={() => navigate(`/${role}/gtk/detail`, { state: { gtkList: [item] } })}
                            className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                            title="Lihat Detail"
                          >
                            <EyeIcon className="size-5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                        {loading ? "Sedang memuat..." : "Tidak ada data kepala sekolah ditemukan."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Print Table (Only Visible in Print) */}
      <div className="print-only">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Kepala Sekolah</th>
              <th>JK</th>
              <th>Nama Instansi / Sekolah</th>
              <th>NUPTK</th>
              <th>Status Kepegawaian</th>
              <th>Nomor Telepon</th>
            </tr>
          </thead>
          <tbody>
            {filteredHeadmasters.length > 0 ? (
              filteredHeadmasters.map((item, index) => {
                const school = schools.find((s) => s.sekolah_id === item.identitas?.sekolah_id);
                const schoolName = school ? school.nama : item.identitas?.sekolah_id || "-";
                const telp = item.data_pendukung?.no_hp || item.no_hp || item.identitas?.no_hp || "-";
                
                return (
                  <tr key={item.identitas?.id || index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{item.identitas?.nama || "-"}</td>
                    <td style={{ textAlign: "center" }}>{item.identitas?.jenis_kelamin || "-"}</td>
                    <td>{schoolName}</td>
                    <td>{item.identitas?.nuptk || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{item.kepegawaian?.status_kepegawaian || "-"}</td>
                    <td>{telp}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>
                  Tidak ada data kepala sekolah ditemukan.
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
