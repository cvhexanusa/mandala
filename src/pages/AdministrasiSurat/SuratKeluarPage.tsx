import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Swal from "sweetalert2";
import { PlusIcon, TrashBinIcon, PencilIcon, EyeIcon, TaskIcon, CheckCircleIcon } from "../../icons";
import { suratService, SuratKeluar, TemplateSurat, PengaturanPenomoran } from "../../services/suratService";
import { useAuth } from "../../context/AuthContext";

export default function SuratKeluarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState<SuratKeluar[]>([]);
  const [templates, setTemplates] = useState<TemplateSurat[]>([]);
  const [numberConfigs, setNumberConfigs] = useState<PengaturanPenomoran[]>([]);
  const [activeTab, setActiveTab] = useState<"draft" | "terbit">("draft");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [tujuan, setTujuan] = useState("");
  const [perihal, setPerihal] = useState("");
  const [tanggalSurat, setTanggalSurat] = useState("");
  const [kategori, setKategori] = useState(1);
  const [templateId, setTemplateId] = useState("");
  const [numberConfigId, setNumberConfigId] = useState("");
  const [isiSurat, setIsiSurat] = useState("");

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

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMargins, setPreviewMargins] = useState({ t: 20, b: 20, l: 25, r: 20 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSurat, resTemp, resConfig] = await Promise.all([
        suratService.getSuratKeluar(),
        suratService.getTemplate(),
        suratService.getPengaturan()
      ]);

      if (resSurat.status === "success" || resSurat.success === true) {
        setDataList(resSurat.data || []);
      } else if (Array.isArray(resSurat)) {
        setDataList(resSurat);
      } else if (resSurat.data && Array.isArray(resSurat.data)) {
        setDataList(resSurat.data);
      }

      if (resTemp.status === "success" || resTemp.success === true) {
        setTemplates(resTemp.data || []);
      } else if (Array.isArray(resTemp)) {
        setTemplates(resTemp);
      } else if (resTemp.data && Array.isArray(resTemp.data)) {
        setTemplates(resTemp.data);
      }

      if (resConfig.status === "success" || resConfig.success === true) {
        setNumberConfigs(resConfig.data || []);
      } else if (Array.isArray(resConfig)) {
        setNumberConfigs(resConfig);
      } else if (resConfig.data && Array.isArray(resConfig.data)) {
        setNumberConfigs(resConfig.data);
      }
    } catch (err) {
      console.error("Gagal memuat data surat keluar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setTujuan("");
    setPerihal("");
    setTanggalSurat(new Date().toISOString().substring(0, 10));
    setKategori(1);
    setTemplateId(templates[0]?.id || "");
    setNumberConfigId(numberConfigs.find(c => c.aktif)?.id || numberConfigs[0]?.id || "");
    setIsiSurat(`<p>Dengan hormat,</p>
<p>Dalam rangka meningkatkan efisiensi dan kualitas koordinasi kelembagaan di lingkungan Kantor Cabang Dinas Pendidikan Wilayah VI, kami mengharapkan kehadiran Bapak/Ibu Kepala Sekolah dalam kegiatan...</p>`);
    setIsModalOpen(true);
  };

  const openEditModal = (item: SuratKeluar) => {
    setEditingId(item.id || null);
    setTujuan(item.tujuan);
    setPerihal(item.perihal);
    setTanggalSurat(item.tanggal_surat ? item.tanggal_surat.substring(0, 10) : "");
    setKategori(item.kategori || 1);
    setTemplateId(item.template_id);
    setNumberConfigId(item.nomor_pengaturan_id || "");
    setIsiSurat(item.isi_surat);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tujuan || !perihal || !tanggalSurat || !templateId || !isiSurat) {
      Swal.fire("Peringatan", "Semua kolom bertanda bintang (*) wajib diisi", "warning");
      return;
    }

    try {
      const payload: Partial<SuratKeluar> = {
        tujuan,
        perihal,
        tanggal_surat: tanggalSurat,
        template_id: templateId,
        nomor_pengaturan_id: numberConfigId || undefined,
        isi_surat: isiSurat,
        status: "draft",
        kategori: Number(kategori),
        cadisdik_id: user?.cadisdik_id
      };

      if (editingId) {
        await suratService.updateSuratKeluar(editingId, payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Draft surat keluar berhasil diperbarui",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      } else {
        await suratService.createSuratKeluar(payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Draft surat keluar baru telah dibuat",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Gagal menyimpan surat keluar:", err);
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan data ke server", "error");
    }
  };

  const handlePublish = async (id: string) => {
    Swal.fire({
      title: "Terbitkan Surat Resmi?",
      text: "Setelah diterbitkan, surat akan diberikan nomor urut resmi secara otomatis dan format tidak dapat diubah lagi!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Terbitkan!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: "Memproses Penomoran",
            text: "Sedang mengunci database dan mengambil nomor urut...",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });
          const res = await suratService.terbitkanSuratKeluar(id);
          Swal.close();
          
          Swal.fire({
            title: "Sukses Diterbitkan!",
            html: `Surat resmi berhasil diterbitkan dengan nomor:<br/><strong style="font-family: monospace; font-size: 1.1em; color: #10b981;">${res.nomor_surat || res.data?.nomor_surat || "Terbit"}</strong>`,
            icon: "success"
          });
          loadData();
          setActiveTab("terbit");
        } catch (err: any) {
          Swal.close();
          console.error("Gagal menerbitkan surat:", err);
          Swal.fire("Error", err.response?.data?.message || "Gagal menerbitkan surat keluar", "error");
        }
      }
    });
  };

  const handleOpenPreview = (item: SuratKeluar) => {
    // 1. Get corresponding template
    const matchedTemplate = templates.find(t => t.id === item.template_id);
    if (!matchedTemplate) {
      Swal.fire("Error", "Template surat terkait tidak ditemukan", "error");
      return;
    }

    // 2. Format variables
    const displayNum = item.nomor_surat || "« NOMOR SURAT DRAFT »";
    const formattedDate = new Date(item.tanggal_surat).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let htmlContent = matchedTemplate.konten
      .replace(/{tanggal_surat}/g, formattedDate)
      .replace(/{nomor_surat}/g, displayNum)
      .replace(/{perihal_surat}/g, item.perihal)
      .replace(/{tujuan_surat}/g, item.tujuan)
      .replace(/{isi_surat}/g, item.isi_surat);

    setPreviewHtml(htmlContent);
    setPreviewMargins({
      t: matchedTemplate.margin_top,
      b: matchedTemplate.margin_bottom,
      l: matchedTemplate.margin_left,
      r: matchedTemplate.margin_right
    });
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Draft surat keluar ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await suratService.deleteSuratKeluar(id);
          Swal.fire("Dihapus!", "Draft berhasil dihapus", "success");
          loadData();
        } catch (err: any) {
          console.error("Gagal menghapus draft:", err);
          Swal.fire("Error", "Gagal menghapus data dari server", "error");
        }
      }
    });
  };

  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    const editor = document.getElementById("letter-body-editor");
    if (editor) {
      setIsiSurat(editor.innerHTML);
    }
  };

  const insertTable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px;">
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

    const editor = document.getElementById("letter-body-editor");
    if (editor) {
      setIsiSurat(editor.innerHTML);
    }
  };

  const filteredList = dataList.filter(s => s.status === activeTab);

  return (
    <>
      <PageMeta
        title="Surat Keluar | SIMAK Admin Panel"
        description="Manage school outgoing letters and drafts"
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Surat Keluar
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola penulisan draft surat keluar, pratinjau layout, dan penomoran resmi otomatis.
            </p>
          </div>
          <div>
            <Button
              variant="primary"
              size="sm"
              startIcon={<PlusIcon className="size-4" />}
              onClick={openAddModal}
            >
              Buat Draft Surat
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab("draft")}
            className={`px-5 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "draft"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Draft Surat ({dataList.filter(s => s.status === "draft").length})
          </button>
          <button
            onClick={() => setActiveTab("terbit")}
            className={`px-5 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "terbit"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Surat Terbit ({dataList.filter(s => s.status === "terbit").length})
          </button>
        </div>

        {/* Letters Table List */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/[0.05]">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nomor Surat</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Tujuan Penerima</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Perihal / Hal</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tgl Surat</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Template</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                    {filteredList.length > 0 ? (
                      filteredList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-5 py-4 text-start text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-5 py-4 text-start text-sm font-semibold font-mono text-gray-800 dark:text-white/90">
                            {item.status === "draft" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                DRAFT
                              </span>
                            ) : (
                              item.nomor_surat || "-"
                            )}
                          </td>
                          <td className="px-5 py-4 text-start text-sm text-gray-700 dark:text-gray-300 font-semibold truncate max-w-[180px]">
                            {item.tujuan}
                          </td>
                          <td className="px-5 py-4 text-start text-sm text-gray-500 max-w-xs truncate font-medium">
                            {item.perihal}
                          </td>
                          <td className="px-5 py-4 text-start text-sm text-gray-500">
                            {getCategoryLabel(item.kategori)}
                          </td>
                          <td className="px-5 py-4 text-center text-sm text-gray-500 font-mono">
                            {item.tanggal_surat ? new Date(item.tanggal_surat).toLocaleDateString('id-ID') : "-"}
                          </td>
                          <td className="px-5 py-4 text-center text-xs text-gray-400">
                            {templates.find(t => t.id === item.template_id)?.nama_template || "Default"}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenPreview(item)}
                              className="p-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 transition-colors cursor-pointer"
                              title="Pratinjau Layout Cetak"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            {item.status === "draft" && (
                              <>
                                <button
                                  onClick={() => handlePublish(item.id || "")}
                                  className="p-1.5 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 transition-colors cursor-pointer"
                                  title="Terbitkan Resmi"
                                >
                                  <CheckCircleIcon className="size-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-1.5 bg-gray-100 dark:bg-white/[0.05] text-gray-750 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <PencilIcon className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id || "")}
                                  className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <TrashBinIcon className="size-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          {activeTab === "draft" ? "Tidak ada draft surat keluar." : "Tidak ada surat keluar yang terbit."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-white/[0.05]">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white/90">
              {editingId ? "Edit Draft Surat Keluar" : "Buat Draft Surat Keluar"}
            </h3>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tujuan Surat *</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Kepala Sekolah SMA/SMK se-Kabupaten Cianjur"
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Perihal Surat *</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Evaluasi Administrasi Sarana Prasarana Triwulan III"
                    value={perihal}
                    onChange={(e) => setPerihal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Tanggal Surat *</Label>
                  <Input
                    type="date"
                    value={tanggalSurat}
                    onChange={(e) => setTanggalSurat(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Kategori Surat *</Label>
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
                  <Label>Layout Template Surat *</Label>
                  <Select
                    options={templates.map(t => ({ value: t.id || "", label: t.nama_template }))}
                    defaultValue={templateId}
                    onChange={(value) => setTemplateId(value)}
                  />
                </div>
                <div>
                  <Label>Aturan Penomoran Surat</Label>
                  <Select
                    options={[
                      { value: "", label: "Tanpa Penomoran Otomatis" },
                      ...numberConfigs.map(c => ({ value: c.id || "", label: c.nama }))
                    ]}
                    defaultValue={numberConfigId}
                    onChange={(value) => setNumberConfigId(value)}
                  />
                </div>
              </div>

              <div>
                <Label>Isi / Body Surat Keluar (Gaya Word) *</Label>
                <p className="text-[10px] text-gray-400 mb-1.5">
                  Isi ini akan dimasukkan ke variabel tag <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded font-mono">{`{isi_surat}`}</code> pada layout template terpilih.
                </p>
                
                {/* Word-like Editor Toolbar & Canvas */}
                <div className="border border-gray-300 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col bg-gray-50/50 dark:bg-black/10 mt-1.5">
                  <div className="flex flex-wrap items-center gap-1 p-2 bg-white dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.05] select-none">
                    <button
                      type="button"
                      onClick={() => execCmd('bold')}
                      className="w-8 h-8 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer text-sm"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('italic')}
                      className="w-8 h-8 flex items-center justify-center italic text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer text-sm"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('underline')}
                      className="w-8 h-8 flex items-center justify-center underline text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer text-sm"
                      title="Underline"
                    >
                      U
                    </button>

                    <span className="w-px h-6 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <button
                      type="button"
                      onClick={() => execCmd('justifyLeft')}
                      className="px-2 h-8 flex items-center justify-center text-xs font-semibold text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      Kiri
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyCenter')}
                      className="px-2 h-8 flex items-center justify-center text-xs font-semibold text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      Tengah
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyRight')}
                      className="px-2 h-8 flex items-center justify-center text-xs font-semibold text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      Kanan
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyFull')}
                      className="px-2 h-8 flex items-center justify-center text-xs font-semibold text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      Rata
                    </button>

                    <span className="w-px h-6 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <button
                      type="button"
                      onClick={() => execCmd('insertUnorderedList')}
                      className="px-2 h-8 flex items-center justify-center text-xs text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('insertOrderedList')}
                      className="px-2 h-8 flex items-center justify-center text-xs text-gray-650 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded cursor-pointer"
                    >
                      1. List
                    </button>

                    <span className="w-px h-6 bg-gray-200 dark:bg-white/[0.05] mx-1" />

                    <button
                      type="button"
                      onClick={insertTable}
                      className="px-2.5 h-8 flex items-center justify-center text-xs bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 hover:bg-success-100 rounded cursor-pointer font-bold"
                    >
                      + Tabel
                    </button>
                  </div>

                  <div className="p-4 bg-gray-150 dark:bg-black/30 max-h-[350px] overflow-y-auto custom-scrollbar flex justify-center">
                    <div
                      key={editingId || "new"}
                      id="letter-body-editor"
                      contentEditable
                      suppressContentEditableWarning
                      className="bg-white text-gray-955 p-6 outline-none shadow w-full min-h-[250px]"
                      style={{
                        fontFamily: "Times New Roman, serif",
                        fontSize: "11pt",
                        lineHeight: "1.5"
                      }}
                      onInput={(e) => setIsiSurat(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: isiSurat }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Simpan Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pratinjau Layout Modal Sheet */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Pratinjau Cetak Surat Keluar
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

                {/* Actual Formatted HTML */}
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
