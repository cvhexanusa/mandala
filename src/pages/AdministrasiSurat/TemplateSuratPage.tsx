import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Swal from "sweetalert2";
import { PlusIcon, TrashBinIcon, PencilIcon, EyeIcon } from "../../icons";
import { suratService, TemplateSurat } from "../../services/suratService";
import { useAuth } from "../../context/AuthContext";

export default function TemplateSuratPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState<TemplateSurat[]>([]);

  // Selection & Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [namaTemplate, setNamaTemplate] = useState("");
  const [kategori, setKategori] = useState(1);
  const [konten, setKonten] = useState("");
  const [marginTop, setMarginTop] = useState(20);
  const [marginBottom, setMarginBottom] = useState(20);
  const [marginLeft, setMarginLeft] = useState(25);
  const [marginRight, setMarginRight] = useState(20);
  const [ukuranKertas, setUkuranKertas] = useState("A4");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewMargins, setPreviewMargins] = useState({ t: 20, b: 20, l: 25, r: 20 });

  const getCategoryLabel = (cat?: number) => {
    const labels: Record<number, string> = {
      1: "Surat Dinas",
      2: "Surat Keputusan (SK)",
      3: "Surat Tugas (ST)",
      4: "Surat Undangan",
      5: "Surat Keterangan",
      6: "Surat Pengantar",
      7: "Surat Edaran",
      8: "Surat Kuasa",
      9: "Surat Lainnya"
    };
    return labels[cat || 1] || "Surat Dinas";
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await suratService.getTemplate();
      let templates: TemplateSurat[] = [];
      if (res.status === "success" || res.success === true) {
        templates = res.data || [];
      } else if (Array.isArray(res)) {
        templates = res;
      } else if (res.data && Array.isArray(res.data)) {
        templates = res.data;
      }
      setDataList(templates);
    } catch (err) {
      console.error("Gagal memuat template surat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    resetToNewForm();
  }, []);

  const resetToNewForm = () => {
    setEditingId(null);
    setNamaTemplate("");
    setKategori(1);
    setMarginTop(20);
    setMarginBottom(20);
    setMarginLeft(25);
    setMarginRight(20);
    setUkuranKertas("A4");
    setKonten(`<div>
  <p style="text-align: right;">Cianjur, {tanggal_surat}</p>
  <br/>
  <table style="width: 100%;">
    <tr>
      <td style="width: 15%; vertical-align: top;">Nomor</td>
      <td style="width: 2%; vertical-align: top;">:</td>
      <td style="width: 83%; vertical-align: top;">{nomor_surat}</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">Sifat</td>
      <td style="vertical-align: top;">:</td>
      <td style="vertical-align: top;">Biasa</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">Lampiran</td>
      <td style="vertical-align: top;">:</td>
      <td style="vertical-align: top;">-</td>
    </tr>
    <tr>
      <td style="vertical-align: top;">Perihal</td>
      <td style="vertical-align: top;">:</td>
      <td style="vertical-align: top;"><strong>{perihal_surat}</strong></td>
    </tr>
  </table>
  <br/>
  <p>Kepada Yth.<br/><strong>{tujuan_surat}</strong><br/>di Tempat</p>
  <br/>
  <div style="text-align: justify; line-height: 1.5;">
    {isi_surat}
  </div>
</div>`);
  };

  const selectTemplateForEdit = (item: TemplateSurat) => {
    setEditingId(item.id || null);
    setNamaTemplate(item.nama_template);
    setKategori(item.kategori || 1);
    setKonten(item.konten);
    setMarginTop(item.margin_top);
    setMarginBottom(item.margin_bottom);
    setMarginLeft(item.margin_left);
    setMarginRight(item.margin_right);
    setUkuranKertas(item.ukuran_kertas || "A4");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTemplate || !konten) {
      Swal.fire("Peringatan", "Nama Template dan Konten surat tidak boleh kosong", "warning");
      return;
    }

    try {
      const payload: TemplateSurat = {
        nama_template: namaTemplate,
        konten,
        margin_top: Number(marginTop),
        margin_bottom: Number(marginBottom),
        margin_left: Number(marginLeft),
        margin_right: Number(marginRight),
        ukuran_kertas: ukuranKertas,
        kategori: Number(kategori),
        cadisdik_id: user?.cadisdik_id
      };

      if (editingId) {
        await suratService.updateTemplate(editingId, payload);
        Swal.fire("Berhasil", "Template surat berhasil diperbarui", "success");
      } else {
        await suratService.createTemplate(payload);
        Swal.fire("Berhasil", "Template surat baru berhasil disimpan", "success");
      }
      loadData();
      resetToNewForm();
    } catch (err: any) {
      console.error("Gagal menyimpan template:", err);
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan template", "error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting for edit
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Template surat ini akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await suratService.deleteTemplate(id);
          Swal.fire("Dihapus!", "Template berhasil dihapus", "success");
          if (editingId === id) {
            resetToNewForm();
          }
          loadData();
        } catch (err) {
          console.error("Gagal menghapus template:", err);
          Swal.fire("Error", "Gagal menghapus data dari server", "error");
        }
      }
    });
  };

  const openPreview = (item: TemplateSurat, e: React.MouseEvent) => {
    e.stopPropagation();
    let demoHtml = item.konten
      .replace(/{tanggal_surat}/g, new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))
      .replace(/{nomor_surat}/g, "421.5/001/Cadisdik-VI/" + new Date().getFullYear())
      .replace(/{perihal_surat}/g, "Undangan Rapat Koordinasi Wilayah VI")
      .replace(/{tujuan_surat}/g, "Kepala Sekolah SMA/SMK se-Wilayah VI")
      .replace(/{isi_surat}/g, `<p>Sehubungan dengan pelaksanaan evaluasi program kerja triwulan kedua, dengan ini kami mengundang Saudara untuk menghadiri rapat koordinasi yang akan dilaksanakan pada:</p>
      <table style="margin-left: 20px; margin-top: 10px; margin-bottom: 10px;">
        <tr><td>Hari / Tanggal</td><td>:</td><td>Senin, 6 Juli 2026</td></tr>
        <tr><td>Waktu</td><td>:</td><td>09.00 WIB s.d Selesai</td></tr>
        <tr><td>Tempat</td><td>:</td><td>Aula KCD Wilayah VI</td></tr>
      </table>
      <p>Demikian undangan ini kami sampaikan, atas kehadiran dan kerjasamanya kami ucapkan terima kasih.</p>`);

    setPreviewContent(demoHtml);
    setPreviewMargins({
      t: item.margin_top,
      b: item.margin_bottom,
      l: item.margin_left,
      r: item.margin_right
    });
    setIsPreviewOpen(true);
  };

  // execCommand for custom rich-text actions
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    const editor = document.getElementById("word-editor");
    if (editor) {
      setKonten(editor.innerHTML);
    }
  };

  // Insert dynamic tag values at kursor position
  const insertTag = (tag: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
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

    const editor = document.getElementById("word-editor");
    if (editor) {
      setKonten(editor.innerHTML);
    }
  };

  const insertTable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
      <tbody>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt;">Kolom 1</td>
          <td style="border: 1px solid #d1d5db; padding: 6px; font-size: 11pt;">Kolom 2</td>
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

    const editor = document.getElementById("word-editor");
    if (editor) {
      setKonten(editor.innerHTML);
    }
  };

  return (
    <>
      <PageMeta
        title="Template Surat | SIMAK Admin Panel"
        description="Manage school letter layout templates"
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT COLUMN: Template Editor Workspace */}
          <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.04] pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-850 dark:text-white/90">
                  {editingId ? "Edit Template Surat" : "Buat Baru"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visual template designer dengan variabel dinamis untuk Cadisdik.
                </p>
              </div>
              {editingId && (
                <Button variant="outline" size="sm" onClick={resetToNewForm}>
                  Batal / Tambah Baru
                </Button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Form Input fields: Judul, Kategori & Ukuran Kertas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>JUDUL TEMPLATE *</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Surat Keterangan Lulus"
                    value={namaTemplate}
                    onChange={(e) => setNamaTemplate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>KATEGORI SURAT *</Label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-800 bg-transparent py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white/90"
                    required
                  >
                    <option value={1} className="dark:bg-gray-900">Surat Dinas</option>
                    <option value={2} className="dark:bg-gray-900">Surat Keputusan (SK)</option>
                    <option value={3} className="dark:bg-gray-900">Surat Tugas (ST)</option>
                    <option value={4} className="dark:bg-gray-900">Surat Undangan</option>
                    <option value={5} className="dark:bg-gray-900">Surat Keterangan</option>
                    <option value={6} className="dark:bg-gray-900">Surat Pengantar</option>
                    <option value={7} className="dark:bg-gray-900">Surat Edaran</option>
                    <option value={8} className="dark:bg-gray-900">Surat Kuasa</option>
                    <option value={9} className="dark:bg-gray-900">Surat Lainnya</option>
                  </select>
                </div>
                <div>
                  <Label>UKURAN KERTAS</Label>
                  <select
                    value={ukuranKertas}
                    onChange={(e) => setUkuranKertas(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-800 bg-transparent py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white/90"
                  >
                    <option value="A4" className="dark:bg-gray-900">A4</option>
                    <option value="F4" className="dark:bg-gray-900">F4 (Folio)</option>
                    <option value="Letter" className="dark:bg-gray-900">Letter</option>
                  </select>
                </div>
              </div>

              {/* Margins configuration input fields */}
              <div>
                <Label>⚡ MARGIN (MM)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex rounded-xl border border-gray-300 dark:border-gray-850 bg-gray-50 dark:bg-white/[0.01] items-center">
                    <span className="text-xs font-semibold px-3 text-gray-500">Atas</span>
                    <input
                      type="number"
                      value={marginTop}
                      onChange={(e) => setMarginTop(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent p-2 text-sm focus:outline-none text-right pr-3 font-semibold text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex rounded-xl border border-gray-300 dark:border-gray-850 bg-gray-50 dark:bg-white/[0.01] items-center">
                    <span className="text-xs font-semibold px-3 text-gray-500">Kanan</span>
                    <input
                      type="number"
                      value={marginRight}
                      onChange={(e) => setMarginRight(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent p-2 text-sm focus:outline-none text-right pr-3 font-semibold text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex rounded-xl border border-gray-300 dark:border-gray-850 bg-gray-50 dark:bg-white/[0.01] items-center">
                    <span className="text-xs font-semibold px-3 text-gray-500">Bawah</span>
                    <input
                      type="number"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent p-2 text-sm focus:outline-none text-right pr-3 font-semibold text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex rounded-xl border border-gray-300 dark:border-gray-850 bg-gray-50 dark:bg-white/[0.01] items-center">
                    <span className="text-xs font-semibold px-3 text-gray-500">Kiri</span>
                    <input
                      type="number"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(parseInt(e.target.value) || 0)}
                      className="w-full bg-transparent p-2 text-sm focus:outline-none text-right pr-3 font-semibold text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Variabel Cepat - quick variables insertion */}
              <div>
                <Label>VARIABEL CEPAT:</Label>
                <div className="flex flex-wrap gap-2 pt-1 select-none">
                  {[
                    { tag: "{nomor_surat}", label: "Nomor Surat Resmi" },
                    { tag: "{tanggal_surat}", label: "Tanggal Cetak (Indo)" },
                    { tag: "{tujuan_surat}", label: "Tujuan Surat" },
                    { tag: "{perihal_surat}", label: "Perihal / Hal" },
                    { tag: "{isi_surat}", label: "Isi Surat" },
                    { tag: "{nama_instansi}", label: "Nama Instansi" }
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
                </div>
              </div>

              {/* A4 Workspace Page Wrapper */}
              <div className="border border-gray-300 dark:border-gray-850 rounded-2xl overflow-hidden flex flex-col bg-gray-50/50 dark:bg-black/10">
                
                {/* PAGE TAB HEADER */}
                <div className="flex bg-gray-200/50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.05] px-4 py-2 select-none">
                  <span className="text-[10px] font-bold bg-gray-750 dark:bg-gray-800 text-white dark:text-gray-300 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    HALAMAN 1
                  </span>
                </div>

                {/* WORD-LIKE WYSIWYG EDITOR FORMATTING MENUS */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.05] text-xs select-none">
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded">File</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded">Edit</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded">View</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={insertTable}>Insert</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={() => execCmd('bold')}>Format</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded">Tools</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded" onClick={insertTable}>Table</button>
                  <button type="button" className="px-2 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded">Help</button>

                  <span className="w-px h-5 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                  {/* Formatting buttons */}
                  <button
                    type="button"
                    onClick={() => execCmd('undo')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-600 dark:text-gray-300"
                    title="Undo"
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('redo')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-600 dark:text-gray-300"
                    title="Redo"
                  >
                    ↷
                  </button>

                  <select
                    onChange={(e) => execCmd('formatBlock', e.target.value)}
                    className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                  </select>

                  <select
                    onChange={(e) => execCmd('fontName', e.target.value)}
                    className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                  </select>

                  <select
                    onChange={(e) => execCmd('fontSize', e.target.value)}
                    className="bg-transparent border-0 font-medium py-1 px-1 focus:outline-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer"
                  >
                    <option value="3">12pt (Normal)</option>
                    <option value="4">14pt</option>
                    <option value="5">18pt</option>
                    <option value="2">10pt</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => execCmd('bold')}
                    className="w-7 h-7 font-bold flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('italic')}
                    className="w-7 h-7 italic flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('underline')}
                    className="w-7 h-7 underline flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    U
                  </button>

                  <span className="w-px h-5 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                  <button
                    type="button"
                    onClick={() => execCmd('justifyLeft')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Align Left"
                  >
                    左
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('justifyCenter')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Align Center"
                  >
                    中
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('justifyRight')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Align Right"
                  >
                    右
                  </button>
                  <button
                    type="button"
                    onClick={() => execCmd('justifyFull')}
                    className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded text-gray-700 dark:text-gray-300 cursor-pointer"
                    title="Justify"
                  >
                    ≡
                  </button>
                </div>

                {/* Editor A4 Canvas */}
                <div className="p-6 bg-gray-700/10 dark:bg-black/30 flex justify-center max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div
                    key={editingId || "new"}
                    id="word-editor"
                    contentEditable
                    suppressContentEditableWarning
                    className="bg-white shadow-xl border border-gray-200 text-gray-950 w-[210mm] min-h-[297mm] focus:outline-none"
                    style={{
                      paddingTop: `${marginTop}mm`,
                      paddingBottom: `${marginBottom}mm`,
                      paddingLeft: `${marginLeft}mm`,
                      paddingRight: `${marginRight}mm`,
                      fontFamily: "Times New Roman, serif",
                      fontSize: "11pt",
                      lineHeight: "1.5"
                    }}
                    onInput={(e) => setKonten(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: konten }}
                  />
                </div>

              </div>

              {/* Form submit buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" variant="primary" size="sm">
                  {editingId ? "Perbarui Template" : "Simpan Template"}
                </Button>
              </div>

            </form>
          </div>

          {/* RIGHT COLUMN: Sidebar List Templates */}
          <div className="xl:col-span-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.04] pb-3">
              <h3 className="text-md font-bold text-gray-850 dark:text-white/90">
                Daftar Template
              </h3>
              <button
                onClick={resetToNewForm}
                className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer"
              >
                + Buat Baru
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {dataList.length > 0 ? (
                  dataList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => selectTemplateForEdit(item)}
                      className={`group p-4 border rounded-xl cursor-pointer transition-all hover:shadow-sm flex items-center justify-between ${
                        editingId === item.id 
                          ? "border-brand-500 bg-brand-500/[0.03] dark:bg-brand-500/[0.02]" 
                          : "border-gray-200 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.01] hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="text-xs font-semibold text-gray-850 dark:text-white/80 group-hover:text-brand-600 dark:group-hover:text-brand-400 block truncate">
                          {item.nama_template}
                        </span>
                        <div className="flex gap-2 items-center text-[10px] text-gray-400 font-mono mt-1">
                          <span className="px-1.5 py-0.2 bg-gray-100 dark:bg-white/[0.05] rounded text-gray-500">
                            {getCategoryLabel(item.kategori)}
                          </span>
                          <span>
                            M: {item.margin_top}/{item.margin_right}/{item.margin_bottom}/{item.margin_left}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openPreview(item, e)}
                          className="p-1 text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                          title="Pratinjau Layout"
                        >
                          <EyeIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id || "", e)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Hapus"
                        >
                          <TrashBinIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-gray-400">
                    Belum ada template peserta didik.
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Pratinjau Layout Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Pratinjau Layout Template Surat
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulating Page Sheet view */}
            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/20 p-6 rounded-xl custom-scrollbar flex justify-center">
              <div
                className="bg-white shadow-sm border border-gray-200 text-gray-950 w-[210mm] min-h-[297mm] p-8"
                style={{
                  paddingTop: `${previewMargins.t}mm`,
                  paddingBottom: `${previewMargins.b}mm`,
                  paddingLeft: `${previewMargins.l}mm`,
                  paddingRight: `${previewMargins.r}mm`,
                  fontFamily: "Times New Roman, serif",
                  fontSize: "11pt"
                }}
              >
                {/* Mock Kop Surat for visual feedback */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: "3px double black",
                  paddingBottom: "10px",
                  marginBottom: "20px",
                  textAlign: "center"
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: "12pt", textTransform: "uppercase", fontWeight: "bold" }}>Pemerintah Provinsi Jawa Barat</h3>
                    <h2 style={{ margin: "2px 0", fontSize: "14pt", textTransform: "uppercase", fontWeight: "bold" }}>Cabang Dinas Pendidikan Wilayah VI</h2>
                    <p style={{ margin: 0, fontSize: "9pt", fontStyle: "italic" }}>Jalan Raya Karangtengah No. 21, Cianjur Telp: (0263) 2913036</p>
                  </div>
                </div>

                {/* Actual Template HTML */}
                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
