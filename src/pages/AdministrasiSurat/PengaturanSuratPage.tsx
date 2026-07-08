import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Swal from "sweetalert2";
import { PlusIcon, TrashBinIcon, PencilIcon } from "../../icons";
import { suratService, PengaturanPenomoran } from "../../services/suratService";
import { useAuth } from "../../context/AuthContext";

export default function PengaturanSuratPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState<PengaturanPenomoran[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [counter, setCounter] = useState(1);
  const [format, setFormat] = useState("{prefix}/{counter}/{suffix}/{year}");
  const [aktif, setAktif] = useState(true);

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
      const res = await suratService.getPengaturan();
      if (res.status === "success" || res.success === true) {
        setDataList(res.data || []);
      } else if (Array.isArray(res)) {
        setDataList(res);
      } else if (res.data && Array.isArray(res.data)) {
        setDataList(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat pengaturan penomoran:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNama("");
    setKategori(1);
    setPrefix("");
    setSuffix("");
    setCounter(1);
    setFormat("{prefix}/{counter}/{suffix}/{year}");
    setAktif(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PengaturanPenomoran) => {
    setEditingId(item.id || null);
    setNama(item.nama);
    setKategori(item.kategori || 1);
    setPrefix(item.prefix || "");
    setSuffix(item.suffix || "");
    setCounter(item.counter);
    setFormat(item.format);
    setAktif(item.aktif);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !format) {
      Swal.fire("Peringatan", "Nama dan Format wajib diisi", "warning");
      return;
    }

    try {
      const payload: PengaturanPenomoran = {
        nama,
        prefix,
        suffix,
        counter: Number(counter),
        format,
        aktif,
        cadisdik_id: user?.cadisdik_id,
        kategori: Number(kategori)
      };

      if (editingId) {
        await suratService.updatePengaturan(editingId, payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Konfigurasi penomoran berhasil diperbarui",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      } else {
        await suratService.createPengaturan(payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Konfigurasi penomoran baru telah dibuat",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Gagal menyimpan konfigurasi penomoran:", err);
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan data ke server", "error");
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Konfigurasi penomoran ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await suratService.deletePengaturan(id);
          Swal.fire("Dihapus!", "Konfigurasi penomoran berhasil dihapus", "success");
          loadData();
        } catch (err: any) {
          console.error("Gagal menghapus konfigurasi:", err);
          Swal.fire("Error", "Gagal menghapus data dari server", "error");
        }
      }
    });
  };

  const getPreviewFormat = (pref: string, cnt: number, suff: string, fmt: string) => {
    const year = new Date().getFullYear();
    const formattedCounter = String(cnt).padStart(3, "0");
    return fmt
      .replace("{prefix}", pref)
      .replace("{counter}", formattedCounter)
      .replace("{suffix}", suff)
      .replace("{year}", String(year));
  };

  return (
    <>
      <PageMeta
        title="Pengaturan Penomoran Surat | SIMAK Admin Panel"
        description="Manage letter numbering configurations"
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Pengaturan Penomoran Surat
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kelola format penomoran otomatis untuk penomoran surat resmi Cadisdik.
            </p>
          </div>
          <div>
            <Button
              variant="primary"
              size="sm"
              startIcon={<PlusIcon className="size-4" />}
              onClick={openAddModal}
            >
              Tambah Pengaturan
            </Button>
          </div>
        </div>

        {/* Configurations List */}
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
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nama Format</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Format Pola</th>
                      <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Pratinjau Nomor</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Counter</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                    {dataList.length > 0 ? (
                      dataList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-5 py-4 text-start text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-5 py-4 text-start text-sm font-semibold text-gray-850 dark:text-white/90">{item.nama}</td>
                          <td className="px-5 py-4 text-start text-sm text-gray-500">{getCategoryLabel(item.kategori)}</td>
                          <td className="px-5 py-4 text-start text-sm font-mono text-gray-500">{item.format}</td>
                          <td className="px-5 py-4 text-start text-sm font-mono text-brand-600 dark:text-brand-400">
                            {getPreviewFormat(item.prefix || "", item.counter, item.suffix || "", item.format)}
                          </td>
                          <td className="px-5 py-4 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">{item.counter}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.aktif 
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" 
                                : "bg-gray-100 text-gray-700 dark:bg-white/[0.05] dark:text-gray-400"
                            }`}>
                              {item.aktif ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Edit"
                            >
                              <PencilIcon className="size-4.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id || "")}
                              className="p-1.5 text-gray-500 hover:text-red-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Hapus"
                            >
                              <TrashBinIcon className="size-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                          Belum ada konfigurasi penomoran surat.
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-white/[0.05]">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white/90">
              {editingId ? "Edit Konfigurasi Penomoran" : "Tambah Konfigurasi Baru"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Nama Format Penomoran *</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Format Surat Dinas"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prefix (Kode Depan)</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: 421.5"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Suffix (Kode Belakang)</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: /Cadisdik-VI"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Format / Pola Penomoran</Label>
                  <Input
                    type="text"
                    placeholder="{prefix}/{counter}/{suffix}/{year}"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Counter Awal</Label>
                  <Input
                    type="number"
                    min="1"
                    value={counter}
                    onChange={(e) => setCounter(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Preview Section */}
              <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.04] space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Pratinjau Hasil</span>
                <span className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400 block break-all">
                  {getPreviewFormat(prefix, counter, suffix, format)}
                </span>
                <p className="text-[10px] text-gray-500">
                  Variabel yang didukung: <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded font-mono">{`{prefix}`}</code>, <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded font-mono">{`{counter}`}</code>, <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded font-mono">{`{suffix}`}</code>, <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded font-mono">{`{year}`}</code>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="aktif-checkbox"
                  checked={aktif}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-800 text-brand-500 focus:ring-brand-500 cursor-pointer h-4 w-4"
                />
                <label htmlFor="aktif-checkbox" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Aktifkan konfigurasi penomoran ini
                </label>
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
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
