import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import Swal from "sweetalert2";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { mandalaService, KategoriKeperluan } from "../../../services/mandalaService";

export default function IsiAntrian() {
  const [searchParams] = useSearchParams();
  const cadisdik_id = searchParams.get("cadisdik_id") || "";

  const [kategori, setKategori] = useState<KategoriKeperluan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    cadisdik_id: cadisdik_id,
    kategori_keperluan_id: "",
    nama_lengkap: "",
    instansi_tamu: "",
    keperluan: "",
    nomor_telepon: "",
  });

  useEffect(() => {
    if (!cadisdik_id) {
      Swal.fire("Akses Ditolak", "ID Instansi tidak ditemukan. Silakan *scan QR Code* atau gunakan *link* yang valid.", "error");
      setLoading(false);
      return;
    }

    const fetchKategori = async () => {
      try {
        const res = await mandalaService.getKategoriKeperluan(cadisdik_id);
        setKategori(res.data || []);
      } catch (error) {
        console.error("Gagal memuat kategori:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKategori();
  }, [cadisdik_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kategori_keperluan_id) {
        Swal.fire("Peringatan", "Pilih kategori keperluan terlebih dahulu", "warning");
        return;
    }

    setIsSubmitting(true);
    try {
      const response = await mandalaService.createAntrian(formData);
      // Biasanya backend mengembalikan data antrian yang baru dibuat, termasuk nomor antrian.
      const nomorAntrian = response?.data?.nomor_antrian || "-";

      Swal.fire({
        icon: "success",
        title: "Antrian Berhasil Dibuat!",
        html: `Nomor Antrian Anda:<br><br><strong style="font-size: 3rem; color: #3b82f6;">#${nomorAntrian}</strong><br><br>Silakan tunggu nomor Anda dipanggil.`,
        confirmButtonText: "Tutup",
        confirmButtonColor: "#3b82f6"
      });

      // Reset Form
      setFormData({
        cadisdik_id: cadisdik_id,
        kategori_keperluan_id: "",
        nama_lengkap: "",
        instansi_tamu: "",
        keperluan: "",
        nomor_telepon: "",
      });
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan sistem.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;
  }

  if (!cadisdik_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Tidak Valid</h2>
          <p className="text-gray-500 mb-6">Link form antrian ini memerlukan parameter instansi yang valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-8 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Buku Tamu Instansi</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">Silakan lengkapi formulir di bawah ini untuk mengambil nomor antrian pelayanan.</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Layanan yang Dituju <span className="text-error-500">*</span>
              </label>
              <Select 
                options={kategori.map(k => ({ value: k.id || k.kategori_id, label: k.nama }))}
                onChange={(val) => setFormData(prev => ({ ...prev, kategori_keperluan_id: val }))}
                placeholder="Pilih Kategori Layanan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Lengkap <span className="text-error-500">*</span>
              </label>
              <Input 
                name="nama_lengkap" 
                value={formData.nama_lengkap} 
                onChange={handleInputChange} 
                required 
                placeholder="Masukkan nama lengkap sesuai identitas" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Asal Instansi / Keterangan
              </label>
              <Input 
                name="instansi_tamu" 
                value={formData.instansi_tamu} 
                onChange={handleInputChange} 
                placeholder="Contoh: PT. Maju Jaya / Masyarakat Umum" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Maksud dan Tujuan Kunjungan <span className="text-error-500">*</span>
              </label>
              <textarea 
                name="keperluan" 
                className="w-full px-4 py-3 text-sm bg-transparent border border-gray-300 rounded-xl dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-gray-800 dark:text-white/90 transition-all resize-none" 
                rows={3}
                value={formData.keperluan}
                onChange={handleInputChange}
                required
                placeholder="Jelaskan maksud kedatangan Anda secara singkat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <Input 
                name="nomor_telepon" 
                type="tel"
                value={formData.nomor_telepon} 
                onChange={handleInputChange} 
                placeholder="Contoh: 081234567890" 
              />
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full py-4 text-base font-bold shadow-md hover:shadow-lg transition-shadow"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Ambil Nomor Antrian"}
              </Button>
            </div>
            
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-center text-xs text-gray-400 font-medium">
        &copy; {new Date().getFullYear()} MANDALA. Sistem Informasi Manajemen Antrian.
      </p>
    </div>
  );
}
