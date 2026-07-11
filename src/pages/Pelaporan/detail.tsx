import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { mandalaService, PelaporanDetail, PelaporanDokumen } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { getRoleSlug } from "../../services/roleUtils";
import Swal from "sweetalert2";
import { exportToExcel, exportCleanTemplate } from "../../utils/exportUtils";

export default function DetailPelaporanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PelaporanDetail | null>(null);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedSekolah, setSelectedSekolah] = useState<{ id: string, nama: string } | null>(null);
  const [documents, setDocuments] = useState<PelaporanDokumen[]>([]);
  const [docLoading, setDocLoading] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"laporan" | "sekolah">("laporan");

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (roleSlug === "operator-sekolah") {
        const response = await mandalaService.getSimakDetailPelaporan(id);
        if (response.status === "success") {
          setDetail({
            pelaporan_id: response.data.pelaporan_id,
            judul: response.data.judul,
            deskripsi: response.data.deskripsi,
            template_konten: response.data.template_konten,
            tanggal_mulai: response.data.tanggal_mulai,
            tanggal_selesai: response.data.tanggal_selesai,
            aktif: true,
            daftar_sekolah: []
          });
          setDocuments(response.data.dokumen || []);
        }
      } else {
        let cadisdikId = user?.cadisdik_id;
        if (!cadisdikId) {
          const instansiRes = await dapodikService.getCadisdik().catch(() => null);
          if (instansiRes?.data && instansiRes.data.length > 0) {
            cadisdikId = instansiRes.data[0].cadisdik_id;
          }
        }
        if (!cadisdikId) return;

        const response = await mandalaService.getPelaporanDetail(id, cadisdikId);
        if (response.status === "success") {
          setDetail(response.data);
        }
      }
    } catch (error) {
      console.error("Gagal mengambil detail pelaporan:", error);
    } finally {
      setLoading(false);
    }
  }, [id, roleSlug, user?.cadisdik_id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const { excelHeaders, pdfGuideHtml } = React.useMemo(() => {
    const html = detail?.template_konten || "";
    const excelMatch = html.match(/data-excel-headers="([^"]+)"/);
    const headers = excelMatch ? excelMatch[1].split(",").map(h => h.trim()).filter(Boolean) : null;

    let guideHtml = html;
    const excelWrapperIndex = html.indexOf('<div class="excel-template-wrapper"');
    if (excelWrapperIndex !== -1) {
      guideHtml = html.substring(0, excelWrapperIndex);
    }

    return {
      excelHeaders: headers,
      pdfGuideHtml: guideHtml.trim() ? guideHtml : null
    };
  }, [detail?.template_konten]);

  const handleDownloadTemplate = () => {
    if (!excelHeaders || !detail?.judul) return;

    // Full headers array starting with "No"
    const headers = ["No", ...excelHeaders];

    // Example row prepopulating the format
    const sampleRow = ["1"];
    excelHeaders.forEach(h => {
      const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      const autoFields = [
        "cadisdikwilayah", "cadisdik", "provinsi", "kabupatenkota", "kabupaten", "kota", "kecamatan",
        "desakelurahan", "desa", "kelurahan", "npsn", "npsnsekolah", "namasekolah", "sekolah", "nama",
        "bentukpendidikan", "statussekolah", "alamatjalan", "alamat", "emailsekolah", "email",
        "nomortelepon", "telepon", "website", "totalsiswa", "siswa", "totalgurugtk", "gtk", "guru"
      ];
      if (autoFields.includes(norm)) {
        sampleRow.push("[OTOMATIS DARI DB]");
      } else {
        sampleRow.push("");
      }
    });

    const safeTitle = detail.judul.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `template_${safeTitle}.xlsx`;

    const rows = [sampleRow];
    for (let i = 2; i <= 101; i++) {
      const emptyRow = [""];
      excelHeaders.forEach(() => {
        emptyRow.push("");
      });
      rows.push(emptyRow);
    }

    exportCleanTemplate(
      filename,
      headers,
      rows
    );
  };

  const handleLihatDokumen = async (sekolahId: string, namaSekolah: string) => {
    if (!id) return;
    setSelectedSekolah({ id: sekolahId, nama: namaSekolah });
    setIsDocModalOpen(true);
    setDocLoading(true);
    try {
      let cadisdikId = user?.cadisdik_id;
      if (!cadisdikId) {
        const instansiRes = await dapodikService.getCadisdik().catch(() => null);
        if (instansiRes?.data && instansiRes.data.length > 0) {
          cadisdikId = instansiRes.data[0].cadisdik_id;
        }
      }
      if (!cadisdikId) return;

      const response = await mandalaService.getPelaporanDokumenSekolah(id, sekolahId, cadisdikId);
      if (response.status === "success") {
        setDocuments(response.data.dokumen);
      }
    } catch (error) {
      console.error("Gagal mengambil dokumen sekolah:", error);
    } finally {
      setDocLoading(false);
    }
  };

  const handlePratinjauLaporan = async (sekolahId: string, namaSekolah: string) => {
    if (!id) return;
    setSelectedSekolah({ id: sekolahId, nama: namaSekolah });
    setIsPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      let cadisdikId = user?.cadisdik_id;
      if (!cadisdikId) {
        const instansiRes = await dapodikService.getCadisdik().catch(() => null);
        if (instansiRes?.data && instansiRes.data.length > 0) {
          cadisdikId = instansiRes.data[0].cadisdik_id;
        }
      }
      if (!cadisdikId) return;

      const response = await api.get(`/mandala/pelaporan/${id}/sekolah/${sekolahId}/preview`, {
        params: { cadisdik_id: cadisdikId },
        responseType: "text"
      });
      setPreviewHtml(response.data);
    } catch (error) {
      console.error("Gagal mengambil pratinjau laporan:", error);
      setPreviewHtml(`
        <div style="padding: 25px; font-family: Arial, sans-serif; color: #b91c1c; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; text-align: center; max-width: 500px; margin: 40px auto;">
          <h3 style="margin-top: 0; font-size: 18px;">Gagal Memuat Pratinjau</h3>
          <p style="font-size: 14px; color: #7f1d1d;">Terjadi kesalahan saat memproses data laporan sekolah. Pastikan berkas yang diunggah valid.</p>
        </div>
      `);
    } finally {
      setPreviewLoading(false);
    }
  };

  const [uploadLoading, setUploadLoading] = useState(false);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!id) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setUploadLoading(true);
    try {
      const response = await mandalaService.uploadDokumenSimak(id, formData);
      if (response.status === "success" || response.success === true) {
        Swal.fire("Berhasil", response.message || "Dokumen berhasil diunggah", "success");
        fetchDetail();
      } else {
        Swal.fire("Gagal", response.message || "Gagal mengunggah dokumen", "error");
      }
    } catch (error: any) {
      console.error("Gagal mengunggah dokumen:", error);
      Swal.fire(
        "Gagal",
        error.response?.data?.message || "Terjadi kesalahan saat mengunggah berkas. Pastikan struktur kolom Excel benar.",
        "error"
      );
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDokumen = async (dokumenId: string) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Berkas lampiran ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        const response = await mandalaService.deleteDokumenSimak(dokumenId);
        if (response.status === "success" || response.success === true) {
          Swal.fire("Berhasil", "Berkas lampiran berhasil dihapus", "success");
          fetchDetail();
        } else {
          Swal.fire("Gagal", response.message || "Gagal menghapus berkas", "error");
        }
      } catch (error: any) {
        console.error("Gagal menghapus dokumen:", error);
        Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan saat menghapus", "error");
      }
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) return <div className="p-10 text-center">Memuat detail...</div>;
  if (!detail) return <div className="p-10 text-center text-error-500">Data tidak ditemukan.</div>;

  return (
    <>
      <PageMeta
        title={`Detail Pelaporan - ${detail.judul} | MANDALA`}
        description={`Detail permintaan pelaporan dokumen ${detail.judul}`}
      />
      <PageBreadcrumb pageTitle="Detail Pelaporan" />

      <div className="space-y-6">
        {roleSlug !== "operator-sekolah" && (
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("laporan")}
              className={`pb-3 px-6 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "laporan"
                  ? "border-brand-600 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Informasi & Format Laporan
            </button>
            <button
              onClick={() => setActiveTab("sekolah")}
              className={`pb-3 px-6 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "sekolah"
                  ? "border-brand-600 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Daftar Pengumpulan Sekolah
            </button>
          </div>
        )}

        {/* Tab 1: Laporan Info */}
        {(roleSlug === "operator-sekolah" || activeTab === "laporan") && (
          <>
            <ComponentCard title="Informasi Pelaporan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Judul Pelaporan</label>
                <p className="text-lg font-bold text-gray-800 dark:text-white/90">{detail.judul}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deskripsi</label>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{detail.deskripsi || "-"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-12">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal Mulai</label>
                  <p className="text-sm font-semibold">{detail.tanggal_mulai ? new Date(detail.tanggal_mulai).toLocaleDateString("id-ID") : "-"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal Selesai</label>
                  <p className="text-sm font-semibold">{detail.tanggal_selesai ? new Date(detail.tanggal_selesai).toLocaleDateString("id-ID") : "-"}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                <div className="mt-1">
                  {detail.aktif ? (
                    <Badge color="success">Aktif</Badge>
                  ) : (
                    <Badge color="error">Non-aktif</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Pratinjau Template & Panduan Visual */}
        {(excelHeaders || pdfGuideHtml) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {excelHeaders && (
              <ComponentCard title="Format Excel yang Dipersyaratkan">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3.5 bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/50 rounded-xl">
                    <p className="text-xs text-brand-700 dark:text-brand-300 font-medium max-w-prose">
                      Sekolah harus mengunggah file Excel dengan susunan kolom di bawah ini. Kolom berlabel <span className="bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 px-1 py-0.5 rounded font-bold">DB</span> akan diisi otomatis dari database Dapodik.
                    </p>
                    <Button
                      onClick={handleDownloadTemplate}
                      size="sm"
                      variant="primary"
                      className="whitespace-nowrap flex items-center gap-1.5 shadow-sm text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Template
                    </Button>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-white/[0.01]">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-xs font-medium text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-150 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
                            <th className="w-10 px-2 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 text-gray-455 bg-gray-100 dark:bg-white/[0.02]"></th>
                            <th className="px-4 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 text-gray-455 bg-gray-100 dark:bg-white/[0.02]">A</th>
                            {excelHeaders.map((_, i) => (
                              <th key={i} className="px-4 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 text-gray-455 bg-gray-100 dark:bg-white/[0.02]">
                                {String.fromCharCode(66 + i)}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-gray-50 dark:bg-white/[0.01] border-b border-gray-200 dark:border-gray-800">
                            <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-white/[0.02] text-gray-450 font-bold select-none">1</td>
                            <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 font-bold text-gray-850 dark:text-white bg-gray-50/50">No</td>
                            {excelHeaders.map((h, i) => (
                              <td key={i} className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 font-bold text-gray-850 dark:text-white bg-gray-50/50">
                                {h}
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100 dark:border-gray-900/50 hover:bg-gray-50/40 dark:hover:bg-white/[0.005]">
                            <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-gray-100/30 dark:bg-white/[0.01] text-gray-400 font-bold select-none">2</td>
                            <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 text-gray-400 italic">1</td>
                            {excelHeaders.map((h, i) => {
                              const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                              const autoFields = [
                                "cadisdikwilayah", "cadisdik", "provinsi", "kabupatenkota", "kabupaten", "kota", "kecamatan",
                                "desakelurahan", "desa", "kelurahan", "npsn", "npsnsekolah", "namasekolah", "sekolah", "nama",
                                "bentukpendidikan", "statussekolah", "alamatjalan", "alamat", "emailsekolah", "email",
                                "nomortelepon", "telepon", "website", "totalsiswa", "siswa", "totalgurugtk", "gtk", "guru"
                              ];
                              const isAuto = autoFields.includes(norm);
                              return (
                                <td key={i} className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 text-xs">
                                  {isAuto ? (
                                    <span className="text-brand-600 dark:text-brand-400 font-semibold">[DB: Otomatis]</span>
                                  ) : (
                                    <span className="text-gray-400 italic">[Wajib Diisi]</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ComponentCard>
            )}

            {pdfGuideHtml && (
              <ComponentCard title="File Pengantar / Panduan Visual Laporan">
                <div className="max-h-[360px] overflow-y-auto p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-black/10 custom-scrollbar">
                  <div dangerouslySetInnerHTML={{ __html: pdfGuideHtml }} />
                </div>
              </ComponentCard>
            )}
          </div>
        )}

        {roleSlug === "operator-sekolah" ? (
          <ComponentCard title="Unggah Berkas Laporan Sekolah Anda">
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Petunjuk Pengumpulan Berkas:</h4>
                <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>Unggah file Excel laporan (.xlsx) atau dokumen pendukung lain (.pdf).</li>
                  {excelHeaders ? (
                    <li>
                      Pastikan file Excel yang diunggah memiliki kolom wajib berikut: <code className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded font-mono text-xs text-amber-900 dark:text-amber-200">{excelHeaders.filter(h => {
                        const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const autoFields = [
                          "cadisdikwilayah", "cadisdik", "provinsi", "kabupatenkota", "kabupaten", "kota", "kecamatan",
                          "desakelurahan", "desa", "kelurahan", "npsn", "npsnsekolah", "namasekolah", "sekolah", "nama",
                          "bentukpendidikan", "statussekolah", "alamatjalan", "alamat", "emailsekolah", "email",
                          "nomortelepon", "telepon", "website", "totalsiswa", "siswa", "totalgurugtk", "gtk", "guru"
                        ];
                        return !autoFields.includes(norm);
                      }).join(", ")}</code>.
                    </li>
                  ) : (
                    <li>Jika Anda mengunggah <strong>Excel (.xlsx)</strong>, pastikan struktur kolom A1 adalah <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono text-amber-900 dark:text-amber-200">nisn</code> dan B1 adalah <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono text-amber-900 dark:text-amber-200">nama siswa</code>.</li>
                  )}
                  {excelHeaders && excelHeaders.some(h => {
                    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const autoFields = [
                      "cadisdikwilayah", "cadisdik", "provinsi", "kabupatenkota", "kabupaten", "kota", "kecamatan",
                      "desakelurahan", "desa", "kelurahan", "npsn", "npsnsekolah", "namasekolah", "sekolah", "nama",
                      "bentukpendidikan", "statussekolah", "alamatjalan", "alamat", "emailsekolah", "email",
                      "nomortelepon", "telepon", "website", "totalsiswa", "siswa", "totalgurugtk", "gtk", "guru"
                    ];
                    return autoFields.includes(norm);
                  }) && (
                      <li>Kolom otomatis database (seperti Nama Sekolah, NPSN, Kabupaten/Kota, dll.) boleh dikosongkan atau diabaikan karena akan terisi otomatis oleh sistem.</li>
                    )}
                  <li>Sistem akan mendeteksi berkas Excel secara otomatis untuk mengisi pratinjau format laporan di Pusat/Cadisdik.</li>
                </ul>
              </div>

              {/* Upload Input */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-brand-500 transition-colors bg-white dark:bg-transparent">
                <input
                  type="file"
                  id="file-upload-input"
                  multiple
                  onChange={handleUploadFile}
                  disabled={uploadLoading}
                  className="hidden"
                />
                <label htmlFor="file-upload-input" className="flex flex-col items-center justify-center cursor-pointer space-y-2">
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/20 rounded-full text-brand-600 dark:text-brand-400">
                    {uploadLoading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
                    ) : (
                      <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {uploadLoading ? "Mengunggah Berkas..." : "Klik untuk Pilih Berkas Laporan"}
                  </span>
                  <span className="text-xs text-gray-400">Dukung berkas .xlsx, .pdf, .docx, .png, .jpg (Maks 10MB)</span>
                </label>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-white/90">Berkas yang Sudah Diunggah ({documents.length}):</h4>
                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {documents.map((doc) => {
                      const isExcel = doc.nama_file.toLowerCase().endsWith(".xlsx");
                      return (
                        <div key={doc.pelaporan_dokumen_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`p-2.5 rounded-lg shadow-sm ${isExcel ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400" : "bg-white dark:bg-gray-800 text-gray-400"}`}>
                              {isExcel ? (
                                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <FileIcon className="size-6" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{doc.nama_file}</span>
                                {isExcel && <Badge color="success" size="sm">Valid Excel</Badge>}
                              </div>
                              <div className="flex gap-3 text-[10px] text-gray-500">
                                <span>{formatFileSize(doc.ukuran_file)}</span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleString("id-ID")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                              title="Download"
                            >
                              <DownloadIcon className="size-5" />
                            </a>
                            <button
                              onClick={() => handleDeleteDokumen(doc.pelaporan_dokumen_id)}
                              className="p-2 text-gray-400 hover:text-error-500 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 italic text-sm border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    Belum ada dokumen yang diunggah. Silakan pilih dokumen di atas untuk mengunggah.
                  </div>
                )}
              </div>
            </div>
          </ComponentCard>
        ) : null}
      </>
    )}

        {/* Tab 2: Daftar Sekolah */}
        {roleSlug !== "operator-sekolah" && activeTab === "sekolah" && (
          <ComponentCard 
            title="Status Pengumpulan per Sekolah"
            action={
              <Button
                variant="success-outline"
                size="sm"
                onClick={async () => {
                  if (!id) return;
                  try {
                    let cadisdikId = user?.cadisdik_id;
                    if (!cadisdikId) {
                      const instansiRes = await dapodikService.getCadisdik().catch(() => null);
                      if (instansiRes?.data && instansiRes.data.length > 0) {
                        cadisdikId = instansiRes.data[0].cadisdik_id;
                      }
                    }
                    if (!cadisdikId) return;

                    const response = await api.get(`/mandala/pelaporan/${id}/export`, {
                      params: { cadisdik_id: cadisdikId },
                      responseType: 'blob'
                    });
                    
                    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `rekap_laporan_${detail?.judul.toLowerCase().replace(/[^a-z0-9]/g, "_") || id}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode?.removeChild(link);
                  } catch (error) {
                    console.error("Gagal mendownload rekap excel:", error);
                    Swal.fire("Gagal", "Terjadi kesalahan saat mengekspor rekapitulasi data sekolah.", "error");
                  }
                }}
                className="flex items-center gap-2"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Rekap Excel
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>Nama Sekolah</TableCell>
                    <TableCell isHeader className="text-center">Jumlah Dokumen</TableCell>
                    <TableCell isHeader className="text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.daftar_sekolah.map((s) => (
                    <TableRow key={s.sekolah_id}>
                      <TableCell className="font-medium text-gray-800 dark:text-white/90">{s.nama_sekolah}</TableCell>
                      <TableCell className="text-center">
                        <Badge color={s.jumlah_dokumen > 0 ? "success" : "light"} size="sm">
                          {s.jumlah_dokumen} Dokumen
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleLihatDokumen(s.sekolah_id, s.nama_sekolah)}
                            className="p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-lg transition-all cursor-pointer"
                            title="Lihat Berkas Dokumen"
                          >
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handlePratinjauLaporan(s.sekolah_id, s.nama_sekolah)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-lg transition-all cursor-pointer"
                            title="Pratinjau Cetak Laporan"
                          >
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ComponentCard>
        )}
      </div>

      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={`Dokumen dari ${selectedSekolah?.nama}`}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {docLoading ? (
            <div className="py-10 text-center">Memuat dokumen...</div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc) => (
                <div key={doc.pelaporan_dokumen_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <FileIcon className="size-6 text-gray-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{doc.nama_file}</span>
                      <div className="flex gap-3 text-[10px] text-gray-500">
                        <span>{formatFileSize(doc.ukuran_file)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                      title="Preview / Download"
                    >
                      <DownloadIcon className="size-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500 italic text-sm">
              Belum ada dokumen yang diunggah oleh sekolah.
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="sm" onClick={() => setIsDocModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={`Pratinjau Laporan - ${selectedSekolah?.nama}`}
        className="max-w-4xl w-full"
      >
        <div className="space-y-4">
          {previewLoading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="text-sm text-gray-500">Menghasilkan pratinjau dokumen...</span>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white">
              <iframe
                title="Laporan Preview"
                srcDoc={previewHtml}
                className="w-full h-[600px] border-0"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!previewHtml) return;
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                  Swal.fire("Gagal", "Popup blocker aktif. Mohon izinkan popup untuk mencetak.", "error");
                  return;
                }

                // Extract the inner content from the backend HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(previewHtml, "text/html");
                const pageContent = doc.querySelector(".document-page")?.innerHTML || previewHtml;

                // Split content into pages by page-break dividers
                const pageBreakRegex = /<div\s+style\s*=\s*["']page-break-after:\s*always;?\s*(?:break-after:\s*page;?)?\s*["']\s*>\s*<\/div>/gi;
                const pages = pageContent.split(pageBreakRegex).map(p => p.trim()).filter(p => p.length > 0);

                const title = `Laporan - ${selectedSekolah?.nama || "Sekolah"}`;

                // Build pages HTML and thumbnails HTML
                let mainPagesHtml = "";
                let sidebarHtml = "";
                pages.forEach((pg, idx) => {
                  const num = idx + 1;
                  mainPagesHtml += `<div class="page-container" id="page-container-${num}">${pg}</div>\n`;
                  sidebarHtml += `
                    <div class="thumbnail-wrapper" onclick="goToPage(${num})">
                      <div class="thumbnail-container${num === 1 ? ' active' : ''}" id="thumb-${num}">
                        <div class="thumbnail-page">
                          <div class="page-container">${pg}</div>
                        </div>
                      </div>
                      <span class="thumbnail-number">${num}</span>
                    </div>`;
                });

                const viewerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; overflow: hidden; background-color: #323639; font-family: Arial, sans-serif; }

  .pdf-toolbar {
    height: 40px; background-color: #323639; display: flex; align-items: center;
    justify-content: space-between; padding: 0 8px; border-bottom: 1px solid #202124;
    position: sticky; top: 0; z-index: 100; user-select: none;
  }
  .pdf-title-container { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  .pdf-hamburger {
    background: none; border: none; color: #e8eaed; cursor: pointer;
    padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; outline: none; transition: background-color 0.2s;
  }
  .pdf-hamburger:hover { background-color: rgba(255,255,255,0.1); }
  .pdf-title {
    color: #e8eaed; font-size: 14px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pdf-controls { display: flex; align-items: center; gap: 4px; }
  .pdf-page-indicator { display: flex; align-items: center; gap: 4px; color: #bdc1c6; font-size: 13px; }
  .pdf-page-input {
    width: 40px; text-align: center; background: #3c4043; border: 1px solid #5f6368;
    color: #e8eaed; font-size: 13px; padding: 2px 4px; border-radius: 4px; outline: none;
  }
  .pdf-page-input:focus { border-color: #8ab4f8; }
  .pdf-control-btn {
    background: none; border: none; color: #bdc1c6; cursor: pointer;
    padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;
    transition: background-color 0.2s; outline: none;
  }
  .pdf-control-btn:hover { background-color: rgba(255,255,255,0.1); }
  .pdf-zoom-text { font-size: 13px; min-width: 48px; text-align: center; color: #bdc1c6; }
  .pdf-actions { display: flex; align-items: center; gap: 8px; }
  .pdf-btn {
    background: none; border: none; color: #f1f1f1; cursor: pointer;
    padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; outline: none; transition: background-color 0.2s;
  }
  .pdf-btn:hover { background-color: rgba(255,255,255,0.1); }
  .pdf-btn svg { width: 20px; height: 20px; fill: currentColor; }

  .pdf-content-wrapper { display: flex; flex: 1; overflow: hidden; position: relative; height: calc(100vh - 40px); }

  .pdf-sidebar {
    width: 200px; background-color: #323639; border-right: 1px solid #1c1f21;
    overflow-y: auto; padding: 20px 10px; display: flex; flex-direction: column;
    align-items: center; gap: 24px; transition: width 0.2s;
  }
  .pdf-main-pane {
    flex: 1; background-color: #525659; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; align-items: center; scroll-behavior: smooth;
  }

  .page-container {
    width: 210mm; min-height: 297mm; margin-bottom: 24px; background: white;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.2);
    padding: 20mm; box-sizing: border-box; position: relative;
    border-radius: 2px; flex-shrink: 0; transform-origin: top center;
    font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #333;
  }

  .thumbnail-wrapper {
    display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; width: 100%;
  }
  .thumbnail-container {
    width: 110px; height: 156px; border: 3px solid transparent; border-radius: 4px;
    background-color: #fff; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    transition: border-color 0.2s, transform 0.2s; position: relative;
    display: flex; align-items: center; justify-content: center;
  }
  .thumbnail-container:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); }
  .thumbnail-container.active { border-color: #8ab4f8; box-shadow: 0 0 0 1px #8ab4f8, 0 4px 12px rgba(0,0,0,0.4); }
  .thumbnail-page {
    width: 210mm; height: 297mm; transform: scale(0.138); transform-origin: top left;
    pointer-events: none; position: absolute; top: 0; left: 0; background: white;
  }
  .thumbnail-page .page-container {
    zoom: 1 !important; width: 210mm !important; min-height: 297mm !important;
    margin: 0 !important; box-shadow: none !important; border: none !important;
    padding: 20mm !important;
  }
  .thumbnail-number { color: #bdc1c6; font-size: 12px; font-family: Arial, sans-serif; font-weight: 500; }

  @media print {
    html, body { background-color: white !important; overflow: visible !important; height: auto !important; }
    .pdf-toolbar, .pdf-sidebar { display: none !important; }
    .pdf-content-wrapper { display: block !important; overflow: visible !important; }
    .pdf-main-pane {
      display: block !important; overflow: visible !important;
      padding: 0 !important; background-color: transparent !important;
    }
    .page-container {
      width: 210mm !important; min-height: 297mm !important; padding: 20mm !important;
      page-break-after: always !important; background: transparent !important;
      box-shadow: none !important; margin: 0 auto !important;
    }
    .page-container:last-of-type { page-break-after: avoid !important; }
    .page-container.image-page { padding: 0 !important; }
  }

  table { border-collapse: collapse; }
  .page-container img { max-width: 100%; height: auto; display: block; }
  .page-container.image-page { padding: 0 !important; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .page-container.image-page img { width: 100%; height: 100%; object-fit: contain; margin: 0; padding: 0; }
</style>
</head>
<body>
  <div class="pdf-toolbar">
    <div class="pdf-title-container">
      <button class="pdf-hamburger" onclick="toggleSidebar()" title="Toggle Sidebar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
      </button>
      <div class="pdf-title">${title}</div>
    </div>
    <div class="pdf-controls">
      <div class="pdf-page-indicator">
        <input type="text" id="current-page-num" class="pdf-page-input" value="1" onchange="goToPage(this.value)">
        <span>/</span>
        <span id="total-pages-num">${pages.length}</span>
      </div>
      <div style="border-left: 1px solid #555; height: 18px; margin: 0 4px;"></div>
      <button class="pdf-control-btn" onclick="changeZoom(-0.1)" title="Zoom Out">−</button>
      <span class="pdf-zoom-text" id="zoom-val">100%</span>
      <button class="pdf-control-btn" onclick="changeZoom(0.1)" title="Zoom In">+</button>
    </div>
    <div class="pdf-actions">
      <button class="pdf-btn" onclick="window.print()" title="Cetak">
        <svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
      </button>
    </div>
  </div>
  <div class="pdf-content-wrapper">
    <div class="pdf-sidebar">
      ${sidebarHtml}
    </div>
    <div class="pdf-main-pane">
      ${mainPagesHtml}
    </div>
  </div>

  <script>
    let currentZoom = 1.0;
    function changeZoom(delta) {
      currentZoom = Math.min(2.0, Math.max(0.5, currentZoom + delta));
      document.querySelectorAll('.pdf-main-pane .page-container').forEach(function(el) {
        el.style.transform = 'scale(' + currentZoom + ')';
      });
      document.getElementById('zoom-val').innerText = Math.round(currentZoom * 100) + '%';
    }
    function toggleSidebar() {
      var sb = document.querySelector('.pdf-sidebar');
      if (sb) sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
    }
    function goToPage(n) {
      n = parseInt(n);
      var el = document.getElementById('page-container-' + n);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.addEventListener('load', function() {
      var pane = document.querySelector('.pdf-main-pane');
      var containers = document.querySelectorAll('.pdf-main-pane .page-container');
      var thumbs = document.querySelectorAll('.thumbnail-container');

      // Auto-detect image-only pages and add image-page class
      var allPageContainers = document.querySelectorAll('.page-container');
      allPageContainers.forEach(function(pc) {
        var imgs = pc.querySelectorAll('img');
        var tables = pc.querySelectorAll('table');
        var textContent = pc.textContent.trim();
        if (imgs.length > 0 && tables.length === 0 && textContent.length < 10) {
          pc.classList.add('image-page');
        }
      });

      var updateActiveThumb = function() {
        if (!pane) return;
        var activeIndex = 0;
        var minDiff = Infinity;
        var paneTop = pane.getBoundingClientRect().top;
        containers.forEach(function(el, idx) {
          var diff = Math.abs(el.getBoundingClientRect().top - paneTop);
          if (diff < minDiff) { minDiff = diff; activeIndex = idx; }
        });
        thumbs.forEach(function(th, idx) {
          if (idx === activeIndex) {
            th.classList.add('active');
            th.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            th.classList.remove('active');
          }
        });
        var pageNumEl = document.getElementById('current-page-num');
        if (pageNumEl) pageNumEl.value = activeIndex + 1;
      };

      if (pane) {
        pane.addEventListener('scroll', updateActiveThumb);
        updateActiveThumb();
      }

      var pageInput = document.getElementById('current-page-num');
      if (pageInput) {
        pageInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') goToPage(e.target.value);
        });
      }
    });
  </script>
</body>
</html>`;

                printWindow.document.write(viewerHtml);
                printWindow.document.close();
              }}
              disabled={previewLoading || !previewHtml}
            >
              Cetak Laporan
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Icons
function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
