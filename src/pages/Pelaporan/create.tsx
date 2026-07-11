import React, { useState } from "react";
import { useNavigate } from "react-router";
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
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(false);

  const defaultTemplate = `<p>&nbsp;</p>`;

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

  const editorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = `<div class="word-page" contenteditable="true" style="background: white; min-height: 297mm; box-shadow: 0 4px 6px rgba(0,0,0,0.1); box-sizing: border-box; outline: none; border: 1px solid #e5e7eb;">${defaultTemplate}</div>`;
    }
  }, []);

  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

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
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(window as any).pdfjsLib) {
      Swal.fire("Error", "PDFJS library belum siap loaded. Silakan tunggu beberapa saat.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      try {
        Swal.fire({
          title: "Sedang memproses PDF...",
          html: "Mengonversi halaman PDF menjadi template kanvas...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const pdf = await (window as any).pdfjsLib.getDocument(typedarray).promise;
        let pdfHtmlContent = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const imgData = canvas.toDataURL("image/png");

            pdfHtmlContent += `
              <div class="word-page" contenteditable="true" style="position: relative; width: 100%; min-height: 297mm; background-image: url(${imgData}); background-size: contain; background-repeat: no-repeat; background-position: center; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); box-sizing: border-box; background-color: white; border: 1px solid #e5e7eb;">
                <p>&nbsp;</p>
              </div>
              ${i < pdf.numPages ? `
              <div class="word-page-break" style="page-break-after: always; break-after: page; height: 30px; background: transparent; border-top: 1px dashed #d1d5db; margin: 20px 0; contenteditable: false; position: relative;">
                <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #bbb; color: white; font-size: 8pt; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-family: sans-serif;">BATAS HALAMAN BARU</span>
              </div>
              ` : ""}
            `;
          }
        }

        Swal.close();
        
        if (editorRef.current) {
          editorRef.current.innerHTML = pdfHtmlContent;
        }

        Swal.fire("Berhasil", "Halaman PDF berhasil dimasukkan ke dalam template sebagai background!", "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Gagal", "Gagal membaca berkas PDF", "error");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const tambahHalaman = () => {
    if (editorRef.current) {
      const pageBreakHtml = `
        <div class="word-page-break" style="page-break-after: always; break-after: page; height: 30px; background: transparent; border-top: 1px dashed #d1d5db; margin: 20px 0; contenteditable: false; position: relative;">
          <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #bbb; color: white; font-size: 8pt; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-family: sans-serif;">BATAS HALAMAN BARU</span>
        </div>
        <div class="word-page" style="background: white; min-height: 297mm; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; box-sizing: border-box; outline: none; border: 1px solid #e5e7eb;">
          <p>&nbsp;</p>
        </div>
      `;
      editorRef.current.innerHTML += pageBreakHtml;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMarginChange = (name: string, val: string) => {
    const num = parseInt(val, 10) || 0;
    setFormData((prev) => ({ ...prev, [name]: num }));
  };

  // execCommand for custom rich-text actions
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
  };

  // Insert dynamic tag values at cursor position
  const insertTag = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    const editor = editorRef.current;
    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      editor?.focus();
      const newSel = window.getSelection();
      if (!newSel || newSel.rangeCount === 0) return;
    }

    range.deleteContents();

    const span = document.createElement("span");
    span.style.color = "#465fff";
    span.style.fontWeight = "bold";
    span.innerText = tag;

    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const insertTable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    const editor = editorRef.current;
    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      editor?.focus();
      const newSel = window.getSelection();
      if (!newSel || newSel.rangeCount === 0) return;
    }

    range.deleteContents();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
      <tbody>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt; font-weight: bold;">Kolom 1</td>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt; font-weight: bold;">Kolom 2</td>
        </tr>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt;">&nbsp;</td>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt;">&nbsp;</td>
        </tr>
      </tbody>
    </table>`;

    const tableNode = wrapper.firstChild;
    if (tableNode) {
      range.insertNode(tableNode);
      range.setStartAfter(tableNode);
      range.setEndAfter(tableNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const loadNotaDinasTemplate = () => {
    Swal.fire({
      title: "Gunakan Template Nota Dinas?",
      text: "Konten editor saat ini akan ditimpa dengan format Nota Dinas Dinas Pendidikan Jawa Barat.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Terapkan!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const notaDinasHtml = `<div style="text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px;">
  <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</h2>
  <h1 style="margin: 3px 0; font-size: 16pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN</h1>
  <p style="margin: 0; font-size: 9pt; color: #333;">Jalan Dr. Radjiman Nomor 6 Telepon: (022) 4261813 Fax: (022) 4261811</p>
  <p style="margin: 0; font-size: 9pt; color: #333;">Website: disdik.jabarprov.go.id, Email: disdik@jabarprov.go.id</p>
  <p style="margin: 0; font-size: 9pt; font-weight: bold;">BANDUNG - 40171</p>
</div>

<h3 style="text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">NOTA DINAS</h3>

<table style="width: 100%; margin-bottom: 20px; font-size: 11pt; border-collapse: collapse;">
  <tr>
    <td style="width: 15%; font-weight: bold; padding: 4px 0; vertical-align: top;">Kepada</td>
    <td style="width: 2%; padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">Yth. Kepala Cabang Dinas Pendidikan Wilayah I s.d. XIII</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Dari</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">Kepala Dinas Pendidikan Provinsi Jawa Barat</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Tembusan</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">
      1. Yth. Sekretaris Dinas Pendidikan;<br>
      2. Yth. Kepala Bidang Pembinaan SMA, SMK, PKLK dan GTK; dan<br>
      3. Yth. Kepala UPTD Tikomdik.
    </td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Tanggal</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">{tanggal_cetak}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Nomor</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">31278/PK.11.01.01/SEKRE</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Sifat</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">Penting</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Lampiran</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top;">1 Berkas</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Hal</td>
    <td style="padding: 4px 0; vertical-align: top;">:</td>
    <td style="padding: 4px 0; vertical-align: top; font-weight: bold;">{judul}</td>
  </tr>
</table>

<hr style="border: 0; border-top: 1px solid #000; margin-bottom: 20px;">

<div style="font-size: 11pt; text-align: justify; margin-bottom: 20px;">
  <p style="text-indent: 40px; margin-bottom: 15px;">Sehubungan dengan pelaksanaan Sistem Penerimaan Murid Baru (SPMB) Tahun Ajaran 2026/2027 pada satuan pendidikan swasta di Provinsi Jawa Barat, terdapat murid baru yang diterima oleh sekolah swasta yang melaksanakan proses pendaftaran secara offline (luar jaringan/non-aplikasi). Sehubungan dengan hal tersebut, dengan ini disampaikan hal-hal sebagai berikut:</p>
  
  <ol style="margin-left: 20px; padding-left: 10px; margin-bottom: 20px; list-style-type: decimal;">
    <li style="margin-bottom: 8px;">Kepala Cabang Dinas Pendidikan Wilayah I s.d. XIII agar melakukan rekapitulasi data murid yang diterima oleh sekolah swasta yang melaksanakan pendaftaran secara offline di wilayah masing-masing;</li>
    <li style="margin-bottom: 8px;">Rekapitulasi data disusun dengan format kolom: No, Cadisdik Wilayah, Kabupaten/Kota, NISN, Nama Murid, NPSN Sekolah Swasta, dan Nama Sekolah Swasta;</li>
    <li style="margin-bottom: 8px;">Format pengisian tabel diisi oleh sekolah pelapor melalui sistem Mandala;</li>
  </ol>

  <p style="margin-bottom: 15px;">Adapun data rekapitulasi adalah sebagai berikut:</p>
</div>

<div style="margin-top: 20px; margin-bottom: 20px;">
  {tabel_siswa}
</div>

<div style="font-size: 11pt; margin-bottom: 40px;">
  <p style="margin-bottom: 5px;">Demikian, atas perhatian dan kerjasamanya disampaikan terima kasih.</p>
</div>

<div style="float: right; width: 300px; text-align: center; font-size: 11pt; margin-top: 20px;">
  <p style="margin-bottom: 70px;">Kepala Dinas Pendidikan Provinsi Jawa Barat,</p>
  <p style="font-weight: bold; text-decoration: underline;">Dr. H. Dedi Supandi, S.STP., M.Si</p>
  <p>Pembina Utama Muda</p>
  <p>NIP. 19760612 199603 1 002</p>
</div>`;
        if (editorRef.current) {
          editorRef.current.innerHTML = notaDinasHtml;
        }
      }
    });
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
      const response = await mandalaService.createPelaporan({
        judul: formData.judul,
        deskripsi: formData.deskripsi,
        template_konten: editorRef.current ? editorRef.current.innerHTML : "",
        tanggal_mulai: formData.tanggal_mulai || undefined,
        tanggal_selesai: formData.tanggal_selesai || undefined,
        cadisdik_id: cadisdikId,
        sekolah_ids: [],
      });

      if (response.status === "success") {
        Swal.fire("Berhasil", "Permintaan pelaporan berhasil dibuat untuk semua sekolah di wilayah Anda", "success");
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
        title="Buat Pelaporan | MANDALA"
        description="Buat permintaan pelaporan dokumen baru dengan template"
      />
      <PageBreadcrumb pageTitle="Buat Permintaan Pelaporan" />

      <div className="max-w-7xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT: Editor & Core Info */}
          <div className="xl:col-span-3 space-y-6">
            <ComponentCard title="Buat Baru Pelaporan">
              <div className="space-y-6">
                
                {/* Judul & Ukuran Kertas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-3">
                    <Label>JUDUL SURAT / LAPORAN <span className="text-error-500">*</span></Label>
                    <Input
                      name="judul"
                      value={formData.judul}
                      onChange={handleInputChange}
                      required
                      placeholder="Contoh: Laporan Dana BOS Tahap 1 2026"
                    />
                  </div>
                  <div>
                    <Label>UKURAN KERTAS</Label>
                    <select
                      name="ukuranKertas"
                      value={formData.ukuranKertas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90"
                    >
                      <option value="A4">A4</option>
                      <option value="F4">F4 / Folio</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
                    </svg>
                    MARGIN (MM)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <span className="bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 px-3 py-2 text-xs font-semibold border-r border-gray-300 dark:border-gray-700 min-w-[70px] text-center">Atas</span>
                      <input
                        type="number"
                        value={formData.marginTop}
                        onChange={(e) => handleMarginChange("marginTop", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-center text-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <span className="bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 px-3 py-2 text-xs font-semibold border-r border-gray-300 dark:border-gray-700 min-w-[70px] text-center">Kanan</span>
                      <input
                        type="number"
                        value={formData.marginRight}
                        onChange={(e) => handleMarginChange("marginRight", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-center text-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <span className="bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 px-3 py-2 text-xs font-semibold border-r border-gray-300 dark:border-gray-700 min-w-[70px] text-center">Bawah</span>
                      <input
                        type="number"
                        value={formData.marginBottom}
                        onChange={(e) => handleMarginChange("marginBottom", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-center text-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <span className="bg-gray-100 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 px-3 py-2 text-xs font-semibold border-r border-gray-300 dark:border-gray-700 min-w-[70px] text-center">Kiri</span>
                      <input
                        type="number"
                        value={formData.marginLeft}
                        onChange={(e) => handleMarginChange("marginLeft", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-center text-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Variabel Cepat */}
                <div>
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">VARIABEL CEPAT:</Label>
                  <div className="flex flex-wrap gap-2 pt-1 select-none items-center">
                    {[
                      { tag: "{judul}", label: "Judul Laporan" },
                      { tag: "{deskripsi}", label: "Deskripsi" },
                      { tag: "{nama_sekolah}", label: "Nama Sekolah" },
                      { tag: "{npsn}", label: "NPSN Sekolah" },
                      { tag: "{tanggal_cetak}", label: "Tanggal Cetak" },
                      { tag: "{tabel_siswa}", label: "Tabel Siswa Lengkap" },
                      { tag: "{tabel_siswa_rows}", label: "Hanya Baris Tabel Siswa" }
                    ].map(btn => (
                      <button
                        key={btn.tag}
                        type="button"
                        onClick={() => insertTag(btn.tag)}
                        className="px-3.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-white/[0.05] transition-all cursor-pointer font-medium"
                      >
                        {btn.label}
                      </button>
                    ))}
                    <span className="w-px h-6 bg-gray-200 dark:bg-white/[0.05] mx-1" />
                    <button
                      type="button"
                      onClick={loadNotaDinasTemplate}
                      className="px-4 py-1.5 text-xs bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 text-white rounded-full transition-all cursor-pointer font-semibold shadow-sm"
                    >
                      + Gunakan Format Nota Dinas Jabar
                    </button>
                  </div>
                </div>

                {/* Word Processor Canvas Editor */}
                <div className="border border-gray-300 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col bg-gray-50/50 dark:bg-black/10">
                  
                  {/* Page Tab Header */}
                  <div className="flex bg-gray-200/50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.05] px-4 py-2 select-none">
                    <span className="text-[10px] font-bold bg-gray-800 text-white dark:text-gray-300 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      HALAMAN 1
                    </span>
                  </div>

                  {/* WYSIWYG Editor Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.05] text-xs select-none">
                    <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={() => execCmd('undo')}>Undo</button>
                    <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={() => execCmd('redo')}>Redo</button>
                    <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={insertTable}>Table</button>
                    
                    <span className="w-px h-5 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <select
                      onChange={(e) => execCmd('formatBlock', e.target.value)}
                      className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer text-xs"
                    >
                      <option value="p">Paragraph</option>
                      <option value="h1">Heading 1</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                    </select>

                    <select
                      onChange={(e) => execCmd('fontName', e.target.value)}
                      className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer text-xs"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                    </select>

                    <select
                      onChange={(e) => execCmd('fontSize', e.target.value)}
                      className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer text-xs"
                    >
                      <option value="3">12pt</option>
                      <option value="4">14pt</option>
                      <option value="5">18pt</option>
                      <option value="2">10pt</option>
                    </select>

                    <span className="w-px h-5 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <button type="button" className="w-7 h-7 font-bold flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('bold')}>B</button>
                    <button type="button" className="w-7 h-7 italic flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('italic')}>I</button>
                    <button type="button" className="w-7 h-7 underline flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('underline')}>U</button>

                    <span className="w-px h-5 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <button type="button" className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('justifyLeft')}>L</button>
                    <button type="button" className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('justifyCenter')}>C</button>
                    <button type="button" className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('justifyRight')}>R</button>
                    <button type="button" className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => execCmd('justifyFull')}>J</button>
                  </div>

                  {/* A4 Workspace Sheet Area */}
                  <div className="p-6 bg-gray-700/10 dark:bg-black/30 flex justify-center max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div>
                      <style dangerouslySetInnerHTML={{ __html: `
                        .word-page {
                          width: 210mm !important;
                          min-height: 297mm !important;
                          box-sizing: border-box !important;
                          padding-top: ${formData.marginTop}mm !important;
                          padding-bottom: ${formData.marginBottom}mm !important;
                          padding-left: ${formData.marginLeft}mm !important;
                          padding-right: ${formData.marginRight}mm !important;
                        }
                      ` }} />
                      <div
                        ref={editorRef}
                        id="word-editor"
                        className="w-[210mm] focus:outline-none flex flex-col gap-4"
                        style={{
                          fontFamily: "Arial, sans-serif",
                          fontSize: "11pt",
                          lineHeight: "1.5"
                        }}
                      />
                    </div>
                  </div>

                  {/* Editor Footer Controls */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="pdf-template-upload"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="pdf-template-upload"
                        className="px-4 py-2 text-xs bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-lg border border-brand-200 dark:border-brand-900/55 transition-all cursor-pointer font-bold inline-flex items-center gap-1.5"
                      >
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload PDF Dinas (Sebagai Template)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={tambahHalaman}
                      className="px-4 py-2 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-bold dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-700 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>+ Tambah Halaman Manual</span>
                    </button>
                  </div>

                </div>

              </div>
            </ComponentCard>
          </div>

          {/* RIGHT: Meta Details (Dates, Description) */}
          <div className="xl:col-span-1 space-y-6">
            <ComponentCard title="Pengaturan Laporan">
              <div className="space-y-4">
                <div>
                  <Label>Deskripsi Ringkas</Label>
                  <textarea
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90"
                    placeholder="Tambahkan petunjuk untuk sekolah..."
                  />
                </div>

                <div>
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    name="tanggal_mulai"
                    value={formData.tanggal_mulai}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="date"
                    name="tanggal_selesai"
                    value={formData.tanggal_selesai}
                    onChange={handleInputChange}
                  />
                </div>

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
