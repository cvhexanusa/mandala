import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Swal from "sweetalert2";
import { mandalaService } from "../../services/mandalaService";

export default function MandalaConnectionPage() {
  const [formData, setFormData] = useState({
    key: "",
    url_mandala: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchConnection();
  }, []);

  const fetchConnection = async () => {
    try {
      setFetching(true);
      const response = await mandalaService.getConnection();
      if (response.status === "success" && response.data) {
        setFormData({
          key: response.data.key || "",
          url_mandala: response.data.url_mandala || "",
        });
      }
    } catch (err) {
      console.error("Gagal mengambil detail koneksi:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key || !formData.url_mandala) {
      Swal.fire({
        title: "Error",
        text: "Key dan URL wajib diisi",
        icon: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await mandalaService.updateConnection(formData);
      if (response.status === "success") {
        Swal.fire({
          title: "Berhasil!",
          text: "Konfigurasi koneksi Mandala berhasil diperbarui.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      Swal.fire({
        title: "Gagal",
        text: err.response?.data?.message || "Gagal memperbarui koneksi.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Koneksi Mandala | SIMAK Integration"
        description="Configure your bridge between SIMAK and Mandala Schema"
      />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
          <div className="mb-8 text-center">
            <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
              Pengaturan Koneksi Mandala
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Konfigurasikan jembatan integrasi data sekolah dari sistem SIMAK ke aplikasi luar (Mandala).
            </p>
          </div>

          {fetching ? (
            <div className="flex justify-center py-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : (
            <form onSubmit={handleUpdate}>
              <div className="space-y-6">
                <div>
                  <Label>Mandala API Key</Label>
                  <Input
                    type="text"
                    placeholder="Masukkan API Key (x-mandala-key)..."
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Key ini digunakan oleh aplikasi klien untuk otentikasi.</p>
                </div>

                <div>
                  <Label>URL Tujuan Mandala</Label>
                  <Input
                    type="url"
                    placeholder="Contoh: https://mandala-app.com"
                    value={formData.url_mandala}
                    onChange={(e) => setFormData({ ...formData, url_mandala: e.target.value })}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Endpoint tujuan pengiriman atau referensi aplikasi Mandala.</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
            <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-400">
              Informasi Keamanan
            </h4>
            <ul className="list-disc pl-5 text-xs text-blue-600 dark:text-blue-500/80 space-y-1">
              <li>Endpoint dilindungi oleh <strong>MandalaKeyGuard</strong>.</li>
              <li>Sertakan Key di atas pada Header <code>x-mandala-key</code> setiap kali melakukan request.</li>
              <li>Akses schema <code>simak</code> sekarang dimungkinkan secara lintas-schema melalui prefix <code>/mandala</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
