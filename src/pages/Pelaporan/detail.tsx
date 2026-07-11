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
        <ComponentCard title="Informasi Pelaporan">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Judul Pelaporan</label>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{detail.judul}</p>
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

        {roleSlug === "operator-sekolah" ? (
          <ComponentCard title="Unggah Berkas Laporan Sekolah Anda">
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-gray-700 dark:text-white/90">Petunjuk Pengumpulan Berkas:</h4>
                <ul className="list-disc list-inside text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <li>Unggah file Excel laporan (.xlsx) atau dokumen pendukung lain (.pdf, .docx, .jpg, .png, .zip).</li>
                  <li>Jika Anda mengunggah <strong>Excel (.xlsx)</strong>, pastikan struktur kolom A1 adalah <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">nisn</code> dan B1 adalah <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">nama siswa</code>.</li>
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
        ) : (
          <ComponentCard title="Status Pengumpulan per Sekolah">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto custom-scrollbar relative">
                 <Table className="min-w-full">
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                       <TableRow>
                          <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Nama Sekolah</TableCell>
                          <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Jumlah Dokumen</TableCell>
                          <TableCell isHeader className="px-5 py-3.5 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                       </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                       {detail.daftar_sekolah.map((s) => (
                          <TableRow key={s.sekolah_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                             <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">{s.nama_sekolah}</TableCell>
                             <TableCell className="px-5 py-4 text-center">
                                <Badge color={s.jumlah_dokumen > 0 ? "success" : "light"} size="sm">
                                   {s.jumlah_dokumen} Dokumen
                                </Badge>
                             </TableCell>
                              <TableCell className="px-5 py-4 text-center">
                                 <div className="flex justify-center items-center gap-3">
                                    <button 
                                      onClick={() => handleLihatDokumen(s.sekolah_id, s.nama_sekolah)}
                                      className="text-brand-500 hover:text-brand-600 font-semibold text-sm cursor-pointer"
                                    >
                                       Lihat Dokumen
                                    </button>
                                    <span className="text-gray-200 dark:text-gray-800">|</span>
                                    <button 
                                      onClick={() => handlePratinjauLaporan(s.sekolah_id, s.nama_sekolah)}
                                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-sm cursor-pointer"
                                    >
                                       Pratinjau Laporan
                                    </button>
                                 </div>
                              </TableCell>
                          </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>
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
                sandbox="allow-same-origin"
              />
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const iframe = document.querySelector('iframe[title="Laporan Preview"]') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
                }
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
