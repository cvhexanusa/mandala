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

export default function DetailPelaporanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PelaporanDetail | null>(null);
  
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedSekolah, setSelectedSekolah] = useState<{ id: string, nama: string } | null>(null);
  const [documents, setDocuments] = useState<PelaporanDokumen[]>([]);
  const [docLoading, setDocLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Gagal mengambil detail pelaporan:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user?.cadisdik_id]);

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

        <ComponentCard title="Status Pengumpulan per Sekolah">
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
                            <button 
                              onClick={() => handleLihatDokumen(s.sekolah_id, s.nama_sekolah)}
                              className="text-brand-500 hover:text-brand-600 font-medium text-sm"
                            >
                               Lihat Dokumen
                            </button>
                         </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
             </Table>
          </div>
        </ComponentCard>
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
