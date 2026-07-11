import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { mandalaService } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import Swal from "sweetalert2";

export default function CreatePelaporanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(false);

  const [sekolahList, setSekolahList] = useState<any[]>([]);
  const [resolvedCadisdikId, setResolvedCadisdikId] = useState<string>("");

  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedKabupaten, setSelectedKabupaten] = useState<string[]>([]);
  const [selectedSekolahIds, setSelectedSekolahIds] = useState<string[]>([]);
  const [showProvDropdown, setShowProvDropdown] = useState(false);
  const [showKabDropdown, setShowKabDropdown] = useState(false);

  React.useEffect(() => {
    const resolveId = async () => {
      let cadisdikId = user?.cadisdik_id;
      if (!cadisdikId) {
        try {
          const instansiRes = await dapodikService.getCadisdik();
          if (instansiRes?.data && instansiRes.data.length > 0) {
            cadisdikId = instansiRes.data[0].cadisdik_id;
          }
        } catch (err) {
          console.warn("Gagal fetch fallback cadisdik list:", err);
        }
      }
      if (cadisdikId) {
        setResolvedCadisdikId(cadisdikId);
      }
    };
    resolveId();
  }, [user]);

  React.useEffect(() => {
    const loadSekolah = async () => {
      try {
        const res = await dapodikService.getSekolah();
        const list = res.data || res;
        if (Array.isArray(list)) {
          setSekolahList(list);
        }
      } catch (err) {
        console.error("Gagal memuat data sekolah:", err);
      }
    };
    loadSekolah();
  }, []);

  const cadisdikSchools = React.useMemo(() => {
    if (!resolvedCadisdikId) return sekolahList;
    return sekolahList.filter(s => s.cadisdik?.id === resolvedCadisdikId);
  }, [sekolahList, resolvedCadisdikId]);

  const availableProvinces = React.useMemo(() => {
    return Array.from(new Set(cadisdikSchools.map(s => s.provinsi).filter(Boolean))) as string[];
  }, [cadisdikSchools]);

  const availableKabupaten = React.useMemo(() => {
    const list = selectedProvinces.length === 0
      ? cadisdikSchools
      : cadisdikSchools.filter(s => selectedProvinces.includes(s.provinsi));
    return Array.from(new Set(list.map(s => s.kabupaten_kota).filter(Boolean))) as string[];
  }, [cadisdikSchools, selectedProvinces]);

  const filteredSchools = React.useMemo(() => {
    return cadisdikSchools.filter(s => {
      const matchProv = selectedProvinces.length === 0 || selectedProvinces.includes(s.provinsi);
      const matchKab = selectedKabupaten.length === 0 || selectedKabupaten.includes(s.kabupaten_kota);
      return matchProv && matchKab;
    });
  }, [cadisdikSchools, selectedProvinces, selectedKabupaten]);

  const isLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (id && !isLoadedRef.current) return;
    setSelectedSekolahIds(filteredSchools.map(s => s.sekolah_id));
  }, [filteredSchools, id]);

  const toggleProvince = (prov: string) => {
    setSelectedProvinces(prev => 
      prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov]
    );
  };

  const toggleKabupaten = (kab: string) => {
    setSelectedKabupaten(prev => 
      prev.includes(kab) ? prev.filter(k => k !== kab) : [...prev, kab]
    );
  };

  const toggleSekolah = (id: string) => {
    setSelectedSekolahIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const allSelected = filteredSchools.length > 0 && filteredSchools.every(s => selectedSekolahIds.includes(s.sekolah_id));
  
  const toggleSelectAllSchools = () => {
    if (allSelected) {
      const filteredIds = filteredSchools.map(s => s.sekolah_id);
      setSelectedSekolahIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredSchools.map(s => s.sekolah_id);
      setSelectedSekolahIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const defaultTemplate = `<p>&nbsp;</p>`;

  const [isExcelEnabled, setIsExcelEnabled] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>(["NISN", "Nama Siswa", "Kelas", "Keterangan"]);
  const [newHeader, setNewHeader] = useState("");

  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    ukuranKertas: "A4",
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 20,
  });

  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState<Array<{ id: string; name: string; html: string }>>([]);

  React.useEffect(() => {
    if (!id || !resolvedCadisdikId) return;
    const loadDetail = async () => {
      try {
        const res = await mandalaService.getPelaporanDetail(id, resolvedCadisdikId);
        if (res?.data) {
          const detail = res.data;
          setFormData({
            judul: detail.judul || "",
            deskripsi: detail.deskripsi || "",
            tanggal_mulai: detail.tanggal_mulai ? new Date(detail.tanggal_mulai).toISOString().split('T')[0] : "",
            tanggal_selesai: detail.tanggal_selesai ? new Date(detail.tanggal_selesai).toISOString().split('T')[0] : "",
            ukuranKertas: "A4",
            marginTop: 20,
            marginBottom: 20,
            marginLeft: 25,
            marginRight: 20,
          });

          if (Array.isArray(detail.pelaporan_sekolah)) {
            setSelectedSekolahIds(detail.pelaporan_sekolah.map((ps: any) => ps.sekolah_id));
          }

          // Parse template_konten to restore excelHeaders and uploadedPdfs
          const match = detail.template_konten?.match(/data-excel-headers="([^"]+)"/);
          if (match) {
            setIsExcelEnabled(true);
            setExcelHeaders(match[1].split(","));
          } else {
            setIsExcelEnabled(false);
          }

          if (detail.template_konten) {
            const parts = detail.template_konten.split('<div style="page-break-after: always; break-after: page;"></div>');
            const pdfs: any[] = [];
            parts.forEach((part: string, idx: number) => {
              if (part.includes('class="excel-template-wrapper"')) return;
              if (part.trim() !== '') {
                pdfs.push({
                  id: `restored-${idx}`,
                  name: `Halaman Panduan ${idx + 1}`,
                  html: part
                });
              }
            });
            setUploadedPdfs(pdfs);
          }
          
          isLoadedRef.current = true;
        }
      } catch (err) {
        console.error("Gagal memuat detail pelaporan untuk edit:", err);
      }
    };
    loadDetail();
  }, [id, resolvedCadisdikId]);

  React.useEffect(() => {
    if ((window as any).pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      setPdfJsLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!(window as any).pdfjsLib) {
      Swal.fire("Error", "PDFJS library belum siap loaded. Silakan tunggu beberapa saat.", "error");
      return;
    }

    Swal.fire({
      title: "Sedang memproses PDF...",
      html: `Mengonversi ${files.length} berkas PDF menjadi format visual...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const newUploadedPdfs: Array<{ id: string; name: string; html: string }> = [];

    for (let f = 0; f < files.length; f++) {
      const file = files[f];
      const fileId = `${Date.now()}-${f}`;

      try {
        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

        const typedarray = new Uint8Array(fileData);
        const pdf = await (window as any).pdfjsLib.getDocument(typedarray).promise;
        let pdfHtmlContent = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const imgData = canvas.toDataURL("image/png");

            pdfHtmlContent += `<div style="text-align: center; margin: 0; padding: 0;"><img src="${imgData}" style="width: 100%; max-width: 100%; display: block; margin: 0; padding: 0; pointer-events: none; user-select: none;" /></div>`;

            if (i < pdf.numPages) {
              pdfHtmlContent += `<div style="page-break-after: always; break-after: page;"></div>`;
            }
          }
        }

        newUploadedPdfs.push({
          id: fileId,
          name: file.name,
          html: pdfHtmlContent
        });
      } catch (err) {
        console.error(`Gagal membaca berkas PDF ${file.name}:`, err);
        Swal.fire("Gagal", `Gagal membaca berkas PDF: ${file.name}`, "error");
        return;
      }
    }

    Swal.close();
    setUploadedPdfs(prev => [...prev, ...newUploadedPdfs]);

    Swal.fire({
      icon: "success",
      title: "PDF Berhasil Diunggah!",
      text: `${files.length} berkas PDF telah berhasil dikonversi.`,
      confirmButtonText: "Mengerti!"
    });

    e.target.value = "";
  };

  const removePdf = (id: string) => {
    setUploadedPdfs(prev => prev.filter(item => item.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cadisdikId = user?.cadisdik_id;
    if (!cadisdikId) {
      try {
        const instansiRes = await dapodikService.getCadisdik();
        if (instansiRes?.data && instansiRes.data.length > 0) {
          cadisdikId = instansiRes.data[0].cadisdik_id;
        }
      } catch (err) {
        console.warn("Gagal fetch fallback cadisdik list:", err);
      }
    }

    if (!cadisdikId) {
      Swal.fire("Peringatan", "ID Cadisdik tidak ditemukan pada profil Anda. Silakan hubungi administrator.", "warning");
      return;
    }

    setLoading(true);
    try {
      let templateKonten = uploadedPdfs.map(p => p.html).join(`<div style="page-break-after: always; break-after: page;"></div>`);
      if (isExcelEnabled) {
        const excelHtml = `
          <div class="excel-template-wrapper" data-excel-enabled="true" data-excel-headers="${excelHeaders.join(",")}">
            <table class="excel-preview-table" style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-family: sans-serif; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 600; text-align: center; font-size: 14px; width: 8%;">No</th>
                  ${excelHeaders.map(h => `<th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 600; text-align: left; font-size: 14px;">${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 14px; color: #9ca3af;">1</td>
                  ${excelHeaders.map(h => `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 14px; color: #9ca3af;">[Isian ${h}]</td>`).join("")}
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 14px; color: #9ca3af;">2</td>
                  ${excelHeaders.map(h => `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 14px; color: #9ca3af;">[Isian ${h}]</td>`).join("")}
                </tr>
              </tbody>
            </table>
          </div>
        `;
        templateKonten = templateKonten ? `${templateKonten}<div style="page-break-after: always; break-after: page;"></div>${excelHtml}` : excelHtml;
      }

      let response;
      const payload = {
        judul: formData.judul,
        deskripsi: formData.deskripsi,
        template_konten: templateKonten,
        tanggal_mulai: formData.tanggal_mulai || undefined,
        tanggal_selesai: formData.tanggal_selesai || undefined,
        cadisdik_id: cadisdikId,
        sekolah_ids: selectedSekolahIds,
      };

      if (id) {
        response = await mandalaService.updatePelaporan(id, payload);
      } else {
        response = await mandalaService.createPelaporan(payload);
      }

      if (response.status === "success") {
        Swal.fire("Berhasil", id ? "Permintaan pelaporan berhasil diperbarui" : "Permintaan pelaporan berhasil dibuat untuk semua sekolah di wilayah Anda", "success");
        navigate(`/${roleSlug}/pelaporan-dokumen`);
      }
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={id ? "Ubah Pelaporan | MANDALA" : "Buat Pelaporan | MANDALA"}
        description={id ? "Ubah detail permintaan pelaporan dokumen" : "Buat permintaan pelaporan dokumen baru dengan template"}
      />
      <PageBreadcrumb pageTitle={id ? "Ubah Permintaan Pelaporan" : "Buat Permintaan Pelaporan"} />

      <div className="max-w-7xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT: Main Form & Excel Builder */}
          <div className="xl:col-span-3 space-y-6">
            <ComponentCard title={id ? "Ubah Permintaan Pelaporan" : "Buat Baru Pelaporan"}>
              <div className="space-y-6">
                
                {/* Judul Laporan */}
                <div>
                  <Label>JUDUL SURAT / LAPORAN <span className="text-error-500">*</span></Label>
                  <Input
                    name="judul"
                    value={formData.judul}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: Laporan Dana BOS Tahap 1 2026"
                  />
                </div>

                {/* Deskripsi */}
                <div>
                  <Label>DESKRIPSI / PETUNJUK <span className="text-error-500">*</span></Label>
                  <textarea
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90"
                    placeholder="Tambahkan penjelasan atau instruksi detail bagi sekolah..."
                  />
                </div>

                {/* Tanggal Mulai & Selesai */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>TANGGAL MULAI <span className="text-error-500">*</span></Label>
                    <Input
                      type="date"
                      name="tanggal_mulai"
                      value={formData.tanggal_mulai}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label>TANGGAL SELESAI <span className="text-error-500">*</span></Label>
                    <Input
                      type="date"
                      name="tanggal_selesai"
                      value={formData.tanggal_selesai}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Upload PDF */}
                <div className="p-5 bg-gray-55 dark:bg-white/[0.01] border border-gray-200 dark:border-gray-850 rounded-2xl space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Unggah File PDF Panduan (Bisa Multiple)</Label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Anda dapat memilih satu atau beberapa file PDF sekaligus sebagai referensi visual.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="pdf-guide-upload"
                      accept=".pdf"
                      multiple
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="pdf-guide-upload"
                      className="px-4 py-2.5 text-xs bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-lg border border-brand-200 dark:border-brand-900/55 transition-all cursor-pointer font-bold inline-flex items-center gap-1.5"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Pilih & Unggah PDF
                    </label>
                  </div>

                  {/* List of Uploaded PDFs */}
                  {uploadedPdfs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">File PDF Terunggah ({uploadedPdfs.length}):</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {uploadedPdfs.map((pdf) => (
                          <div
                            key={pdf.id}
                            className="flex items-center justify-between p-2.5 bg-white dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800 rounded-lg text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <svg className="size-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="truncate font-medium text-gray-750 dark:text-gray-300">{pdf.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePdf(pdf.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Hapus file"
                            >
                              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Excel Template Toggle */}
                <div className="flex items-center justify-between p-4 bg-brand-50/40 dark:bg-brand-950/10 rounded-xl border border-brand-100 dark:border-brand-900/50">
                  <div>
                    <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-300">Aktifkan Format Input Data (Excel/Tabel)</h4>
                    <p className="text-xs text-brand-700/70 dark:text-brand-400/70 mt-0.5 font-medium">Aktifkan jika sekolah harus mengisi tabel isian dengan kolom yang Anda buat.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isExcelEnabled}
                      onChange={(e) => setIsExcelEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-250 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {/* Optional Excel Builder Panel */}
                {isExcelEnabled && (
                  <div className="space-y-6 pt-2">
                    {/* Column Builder */}
                    <div className="p-5 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-gray-855 rounded-2xl space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Desain Kolom Excel Template</h4>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newHeader}
                          onChange={(e) => setNewHeader(e.target.value)}
                          placeholder="Nama Kolom Baru (contoh: NISN, Nama Lengkap, Keterangan)"
                          className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-750 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newHeader.trim()) {
                                setExcelHeaders([...excelHeaders, newHeader.trim()]);
                                setNewHeader("");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newHeader.trim()) {
                              setExcelHeaders([...excelHeaders, newHeader.trim()]);
                              setNewHeader("");
                            }
                          }}
                          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition-all"
                        >
                          + Tambah Kolom
                        </button>
                      </div>

                      {/* Presets for Auto-filled DB Columns */}
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pilih Kolom Data Sekolah (Terisi Otomatis):</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Cadisdik Wilayah", desc: "Nama Kantor Cabang Dinas Pendidikan terkait" },
                            { name: "Provinsi", desc: "Provinsi domisili sekolah" },
                            { name: "Kabupaten/Kota", desc: "Kabupaten/Kota domisili sekolah" },
                            { name: "Kecamatan", desc: "Kecamatan domisili sekolah" },
                            { name: "Desa/Kelurahan", desc: "Desa atau Kelurahan sekolah" },
                            { name: "NPSN", desc: "Nomor Pokok Sekolah Nasional" },
                            { name: "Nama Sekolah", desc: "Nama lengkap sekolah terkait" },
                            { name: "Bentuk Pendidikan", desc: "Bentuk pendidikan (SMA/SMK/SLB)" },
                            { name: "Status Sekolah", desc: "Status sekolah (Negeri/Swasta)" },
                            { name: "Alamat Jalan", desc: "Alamat jalan sekolah" },
                            { name: "Email Sekolah", desc: "Email resmi sekolah" },
                            { name: "Nomor Telepon", desc: "Nomor telepon sekolah" },
                            { name: "Website", desc: "Alamat website sekolah" },
                            { name: "Total Siswa", desc: "Jumlah total siswa terdaftar" },
                            { name: "Total Guru/GTK", desc: "Jumlah total GTK aktif" }
                          ].map(v => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => {
                                if (!excelHeaders.includes(v.name)) {
                                  setExcelHeaders([...excelHeaders, v.name]);
                                }
                              }}
                              className="px-3.5 py-1.5 text-xs bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-100 dark:border-brand-900/50 transition-all font-semibold flex items-center gap-1.5"
                              title={v.desc}
                            >
                              <span>+ {v.name}</span>
                              <span className="text-[8px] bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-200 px-1 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">DB</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500">
                          <span className="font-semibold text-brand-500">* Catatan:</span> Kolom berlabel <strong className="text-brand-600">DB</strong> akan diisi otomatis oleh sistem dari data dapodik sekolah saat laporan diunduh/diisi, sehingga sekolah tidak perlu menginputnya secara manual.
                        </p>
                      </div>

                      {/* Active Column Badges */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {excelHeaders.map((header, index) => {
                          const norm = header.toLowerCase().replace(/[^a-z0-9]/g, "");
                          const autoFields = [
                            "cadisdikwilayah", "cadisdik", "provinsi", "kabupatenkota", "kabupaten", "kota", "kecamatan",
                            "desakelurahan", "desa", "kelurahan", "npsn", "npsnsekolah", "namasekolah", "sekolah", "nama",
                            "bentukpendidikan", "statussekolah", "alamatjalan", "alamat", "emailsekolah", "email",
                            "nomortelepon", "telepon", "website", "totalsiswa", "siswa", "totalgurugtk", "gtk", "guru"
                          ];
                          const isAuto = autoFields.includes(norm);
                          return (
                            <div
                              key={index}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                                isAuto
                                  ? "bg-brand-50/70 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/50"
                                  : "bg-gray-55 dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800"
                              }`}
                            >
                              <span>{header}</span>
                              {isAuto && <span className="text-[8px] bg-brand-200 dark:bg-brand-900 text-brand-800 dark:text-brand-100 px-1 py-0.5 rounded font-bold uppercase scale-90">DB</span>}
                              <button
                                type="button"
                                onClick={() => setExcelHeaders(excelHeaders.filter((_, i) => i !== index))}
                                className="text-gray-400 hover:text-red-500 font-bold ml-1"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Excel Preview Grid Sheet */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-white/[0.01]">
                      {/* Grid Header */}
                      <div className="flex items-center justify-between px-5 py-4 bg-gray-55 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-gray-800 dark:text-white">Pratinjau Format Lembar Excel</h5>
                            <p className="text-[10px] text-gray-400 font-medium">Tampilan tabel yang akan diisi oleh sekolah</p>
                          </div>
                        </div>
                      </div>

                      {/* Simulated Excel Sheet Grid */}
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-xs font-medium text-left border-collapse">
                          <thead>
                            {/* Column Letters Row */}
                            <tr className="bg-gray-150 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
                              <th className="w-10 px-2 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 text-gray-455 select-none bg-gray-100 dark:bg-white/[0.02]"></th>
                              <th className="px-4 py-1.5 text-center border-r border-gray-200 dark:border-gray-855 text-gray-455 select-none bg-gray-100 dark:bg-white/[0.02]">A</th>
                              {excelHeaders.map((_, i) => (
                                <th key={i} className="px-4 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 text-gray-455 select-none bg-gray-100 dark:bg-white/[0.02]">
                                  {String.fromCharCode(66 + i)}
                                </th>
                              ))}
                            </tr>
                            {/* Header Label Row */}
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
                            {/* Row 1 */}
                            <tr className="border-b border-gray-100 dark:border-gray-900/50 hover:bg-gray-50/40 dark:hover:bg-white/[0.005]">
                              <td className="px-2 py-2 text-center border-r border-gray-200 dark:border-gray-800 bg-gray-100/30 dark:bg-white/[0.01] text-gray-400 select-none font-bold">2</td>
                              <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 text-gray-400 italic">1</td>
                              {excelHeaders.map((h, i) => {
                                const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                                let content: React.ReactNode = <span className="text-gray-400 italic">[Wajib Diisi Sekolah]</span>;
                                if (norm === "cadisdikwilayah" || norm === "cadisdik") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Cadisdik Wilayah VII]</span>;
                                } else if (norm === "provinsi") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Jawa Barat]</span>;
                                } else if (norm === "kabupatenkota" || norm === "kabupaten" || norm === "kota") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Kota Bandung]</span>;
                                } else if (norm === "kecamatan") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Regol]</span>;
                                } else if (norm === "desakelurahan" || norm === "desa" || norm === "kelurahan") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Ciseureuh]</span>;
                                } else if (norm === "npsn" || norm === "npsnsekolah") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: 20220301]</span>;
                                } else if (norm === "namasekolah" || norm === "sekolah" || norm === "nama") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: SMKN 1 Bandung]</span>;
                                } else if (norm === "bentukpendidikan") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: SMK]</span>;
                                } else if (norm === "statussekolah") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Negeri]</span>;
                                } else if (norm === "alamatjalan" || norm === "alamat") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: Jl. Radjiman No. 6]</span>;
                                } else if (norm === "emailsekolah" || norm === "email") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: info@school.sch.id]</span>;
                                } else if (norm === "nomortelepon" || norm === "telepon") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: 022-4261813]</span>;
                                } else if (norm === "website") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: www.school.sch.id]</span>;
                                } else if (norm === "totalsiswa" || norm === "siswa") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: 840 Siswa]</span>;
                                } else if (norm === "totalgurugtk" || norm === "gtk" || norm === "guru") {
                                  content = <span className="text-brand-600 dark:text-brand-400 font-semibold">[Otomatis: 45 GTK]</span>;
                                }
                                return (
                                  <td key={i} className="px-4 py-2 border-r border-gray-200 dark:border-gray-800 text-xs">
                                    {content}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ComponentCard>
          </div>

          {/* RIGHT: Target Recipients & Action Buttons */}
          <div className="xl:col-span-1 space-y-6">
            <ComponentCard title="Target Penerima Laporan">
              <div className="space-y-4">
                
                {/* Provinsi Filter */}
                <div className="relative">
                  <Label>PROVINSI</Label>
                  <button
                    type="button"
                    onClick={() => setShowProvDropdown(!showProvDropdown)}
                    className="w-full px-4 py-2.5 text-left text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none text-gray-800 dark:text-white/90 flex justify-between items-center"
                  >
                    <span>
                      {selectedProvinces.length === 0
                        ? "Semua Provinsi"
                        : `${selectedProvinces.length} Provinsi Terpilih`}
                    </span>
                    <svg className="size-4 text-gray-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showProvDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-1">
                      {availableProvinces.map(prov => (
                        <label key={prov} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-55 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedProvinces.includes(prov)}
                            onChange={() => toggleProvince(prov)}
                            className="rounded border-gray-300 text-brand-650 focus:ring-brand-500"
                          />
                          <span>{prov}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kabupaten Filter */}
                <div className="relative">
                  <Label>KABUPATEN / KOTA</Label>
                  <button
                    type="button"
                    onClick={() => setShowKabDropdown(!showKabDropdown)}
                    className="w-full px-4 py-2.5 text-left text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none text-gray-800 dark:text-white/90 flex justify-between items-center"
                  >
                    <span>
                      {selectedKabupaten.length === 0
                        ? "Semua Kabupaten/Kota"
                        : `${selectedKabupaten.length} Kab/Kota Terpilih`}
                    </span>
                    <svg className="size-4 text-gray-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showKabDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2 space-y-1">
                      {availableKabupaten.map(kab => (
                        <label key={kab} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-55 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-800 dark:text-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedKabupaten.includes(kab)}
                            onChange={() => toggleKabupaten(kab)}
                            className="rounded border-gray-300 text-brand-655 focus:ring-brand-500"
                          />
                          <span>{kab}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Target Sekolah List Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="mb-0">DAFTAR SEKOLAH ({selectedSekolahIds.length} terpilih)</Label>
                    {filteredSchools.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAllSchools}
                        className="text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors uppercase tracking-wider"
                      >
                        {allSelected ? "Hapus Semua" : "Pilih Semua"}
                      </button>
                    )}
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50/50 dark:bg-white/[0.01] space-y-2 custom-scrollbar">
                    {filteredSchools.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">Tidak ada sekolah yang cocok dengan filter wilayah Anda.</p>
                    ) : (
                      filteredSchools.map(sch => (
                        <label key={sch.sekolah_id} className="flex items-start gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                          <input
                            type="checkbox"
                            checked={selectedSekolahIds.includes(sch.sekolah_id)}
                            onChange={() => toggleSekolah(sch.sekolah_id)}
                            className="mt-0.5 rounded border-gray-305 text-brand-600 focus:ring-brand-500"
                          />
                          <div>
                            <p className="font-semibold">{sch.nama}</p>
                            <p className="text-[10px] text-gray-400">{sch.kabupaten_kota} ({sch.npsn})</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex flex-col gap-2">
                  <Button type="submit" loading={loading} className="w-full justify-center">
                    Simpan Laporan
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)} type="button" className="w-full justify-center">
                    Batal
                  </Button>
                </div>
              </div>
            </ComponentCard>
          </div>

        </form>
      </div>
    </>
  );
}
