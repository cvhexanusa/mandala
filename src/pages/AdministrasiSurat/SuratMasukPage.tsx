import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Swal from "sweetalert2";
import { PlusIcon, TrashBinIcon, PencilIcon, DownloadIcon } from "../../icons";
import { suratService, SuratMasuk } from "../../services/suratService";

export default function SuratMasukPage() {
  const [loading, setLoading] = useState(true);
  const [dataList, setDataList] = useState<SuratMasuk[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalData, setTotalData] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nomorSurat, setNomorSurat] = useState("");
  const [pengirim, setPengirim] = useState("");
  const [perihal, setPerihal] = useState("");
  const [tanggalSurat, setTanggalSurat] = useState("");
  const [tanggalTerima, setTanggalTerima] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [fileSurat, setFileSurat] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await suratService.getSuratMasuk({
        search: searchQuery,
        page: currentPage,
        limit: itemsPerPage
      });

      if (res.status === "success" || res.success === true) {
        setDataList(res.data || []);
        setTotalData(res.meta?.total_data || res.meta?.total || res.total || (res.data ? res.data.length : 0));
      } else if (Array.isArray(res)) {
        setDataList(res);
        setTotalData(res.length);
      } else if (res.data && Array.isArray(res.data)) {
        setDataList(res.data);
        setTotalData(res.meta?.total_data || res.data.length);
      }
    } catch (err) {
      console.error("Gagal memuat surat masuk:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setEditingId(null);
    setNomorSurat("");
    setPengirim("");
    setPerihal("");
    setTanggalSurat(new Date().toISOString().substring(0, 10));
    setTanggalTerima(new Date().toISOString().substring(0, 10));
    setRingkasan("");
    setFileSurat("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: SuratMasuk) => {
    setEditingId(item.id || null);
    setNomorSurat(item.nomor_surat);
    setPengirim(item.pengirim);
    setPerihal(item.perihal);
    setTanggalSurat(item.tanggal_surat ? item.tanggal_surat.substring(0, 10) : "");
    setTanggalTerima(item.tanggal_terima ? item.tanggal_terima.substring(0, 10) : "");
    setRingkasan(item.ringkasan || "");
    setFileSurat(item.file_surat || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorSurat || !pengirim || !perihal || !tanggalSurat || !tanggalTerima) {
      Swal.fire("Peringatan", "Semua field bertanda bintang (*) wajib diisi", "warning");
      return;
    }

    try {
      const payload: SuratMasuk = {
        nomor_surat: nomorSurat,
        pengirim,
        perihal,
        tanggal_surat: tanggalSurat,
        tanggal_terima: tanggalTerima,
        ringkasan,
        file_surat: fileSurat
      };

      if (editingId) {
        await suratService.updateSuratMasuk(editingId, payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Pencatatan surat masuk berhasil diperbarui",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      } else {
        await suratService.createSuratMasuk(payload);
        Swal.fire({
          title: "Berhasil!",
          text: "Surat masuk baru berhasil dicatat",
          icon: "success",
          confirmButtonColor: "#465fff"
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Gagal menyimpan surat masuk:", err);
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan data ke server", "error");
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Catatan surat masuk ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await suratService.deleteSuratMasuk(id);
          Swal.fire("Dihapus!", "Surat masuk berhasil dihapus", "success");
          loadData();
        } catch (err: any) {
          console.error("Gagal menghapus surat masuk:", err);
          Swal.fire("Error", "Gagal menghapus data dari server", "error");
        }
      }
    });
  };

  const totalPages = Math.ceil(totalData / itemsPerPage);

  return (
    <>
      <PageMeta
        title="Surat Masuk | SIMAK Admin Panel"
        description="Manage school incoming letters log"
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Surat Masuk
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pencatatan dan pengarsipan resmi surat masuk untuk kantor Cadisdik.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs">
              <input
                type="text"
                placeholder="Cari surat..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-800 bg-transparent py-1.5 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white/90"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              startIcon={<PlusIcon className="size-4" />}
              onClick={openAddModal}
            >
              Catat Surat Masuk
            </Button>
          </div>
        </div>

        {/* Letters List */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-white/[0.05]">
                    <thead className="bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">No</th>
                        <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Nomor Surat</th>
                        <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Pengirim</th>
                        <th className="px-5 py-3 text-start text-xs font-semibold text-gray-500 uppercase">Perihal / Hal</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tgl Surat</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tgl Terima</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Berkas</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
                      {dataList.length > 0 ? (
                        dataList.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="px-5 py-4 text-start text-sm text-gray-500">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="px-5 py-4 text-start text-sm font-semibold font-mono text-gray-800 dark:text-white/90">
                              {item.nomor_surat}
                            </td>
                            <td className="px-5 py-4 text-start text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {item.pengirim}
                            </td>
                            <td className="px-5 py-4 text-start text-sm text-gray-500 max-w-xs truncate">
                              <span className="font-semibold text-gray-850 dark:text-white/80 block">{item.perihal}</span>
                              <span className="text-[10px] text-gray-400 block truncate">{item.ringkasan || "Tidak ada ringkasan."}</span>
                            </td>
                            <td className="px-5 py-4 text-center text-sm text-gray-500 font-mono">
                              {item.tanggal_surat ? new Date(item.tanggal_surat).toLocaleDateString('id-ID') : "-"}
                            </td>
                            <td className="px-5 py-4 text-center text-sm text-gray-500 font-mono">
                              {item.tanggal_terima ? new Date(item.tanggal_terima).toLocaleDateString('id-ID') : "-"}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {item.file_surat ? (
                                <a
                                  href={item.file_surat}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                                >
                                  <DownloadIcon className="size-3.5" />
                                  Unduh
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Tidak ada</span>
                              )}
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
                            Tidak ada surat masuk ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Menampilkan Halaman {currentPage} dari {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-white/[0.05]">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white/90">
              {editingId ? "Edit Catatan Surat Masuk" : "Catat Surat Masuk Baru"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Nomor Surat *</Label>
                <Input
                  type="text"
                  placeholder="Contoh: 421.5/012-SMK/2026"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Nama Pengirim / Instansi Pengirim *</Label>
                <Input
                  type="text"
                  placeholder="Contoh: SMK Negeri 1 Cianjur"
                  value={pengirim}
                  onChange={(e) => setPengirim(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Perihal Surat *</Label>
                <Input
                  type="text"
                  placeholder="Contoh: Permohonan Validasi Rencana Anggaran Sekolah"
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Tanggal Diterima *</Label>
                  <Input
                    type="date"
                    value={tanggalTerima}
                    onChange={(e) => setTanggalTerima(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Ringkasan Isi Surat</Label>
                <textarea
                  rows={3}
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-800 bg-transparent p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white/90"
                  placeholder="Deskripsikan secara singkat perihal isi surat masuk ini..."
                />
              </div>

              <div>
                <Label>URL/Link File Surat (PDF)</Label>
                <Input
                  type="text"
                  placeholder="Contoh: https://link-penyimpanan.com/berkas-surat.pdf"
                  value={fileSurat}
                  onChange={(e) => setFileSurat(e.target.value)}
                />
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
                  Simpan Laporan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
