import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { mandalaService, MandalaSchool } from "../../services/mandalaService";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import Swal from "sweetalert2";

export default function CreatePelaporanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<MandalaSchool[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchSchool, setSearchSchool] = useState("");

  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
  });

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await mandalaService.getSchools();
        if (response.status === "success") {
          setSchools(response.data);
        }
      } catch (error) {
        console.error("Gagal mengambil data sekolah:", error);
      }
    };
    fetchSchools();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSchool = (id: string) => {
    setSelectedSchools((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedSchools.length === filteredSchools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(filteredSchools.map((s) => s.sekolah_id));
    }
  };

  const filteredSchools = schools.filter((s) =>
    s.nama.toLowerCase().includes(searchSchool.toLowerCase()) ||
    s.npsn.includes(searchSchool)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchools.length === 0) {
      Swal.fire("Peringatan", "Pilih minimal satu sekolah", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await mandalaService.createPelaporan({
        ...formData,
        cadisdik_id: user?.cadisdik_id || "",
        sekolah_ids: selectedSchools,
      });

      if (response.status === "success") {
        Swal.fire("Berhasil", "Permintaan pelaporan berhasil dibuat", "success");
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
        description="Buat permintaan pelaporan dokumen baru"
      />
      <PageBreadcrumb pageTitle="Buat Permintaan Pelaporan" />

      <div className="max-w-4xl mx-auto">
        <ComponentCard title="Form Permintaan Pelaporan">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label>Judul Pelaporan <span className="text-error-500">*</span></Label>
                <Input
                  name="judul"
                  value={formData.judul}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Laporan Dana BOS Tahap 1 2026"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Deskripsi</Label>
                <textarea
                  name="deskripsi"
                  value={formData.deskripsi}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-white/[0.03] dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-gray-800 dark:text-white/90"
                  placeholder="Tambahkan detail atau instruksi pelaporan..."
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
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <Label className="mb-0">Pilih Sekolah <span className="text-error-500">*</span></Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <SearchIcon className="size-4" />
                     </span>
                     <input
                        type="text"
                        placeholder="Cari sekolah..."
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg dark:bg-white/[0.02] dark:border-gray-700 outline-none"
                        value={searchSchool}
                        onChange={(e) => setSearchSchool(e.target.value)}
                     />
                  </div>
                  <button 
                    type="button" 
                    onClick={toggleAll}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    {selectedSchools.length === filteredSchools.length ? "Batal Pilih Semua" : "Pilih Semua Terfilter"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                {filteredSchools.map((s) => (
                  <div 
                    key={s.sekolah_id}
                    onClick={() => toggleSchool(s.sekolah_id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedSchools.includes(s.sekolah_id)
                        ? "bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30"
                        : "bg-white border-gray-100 dark:bg-white/[0.02] dark:border-white/5 hover:border-brand-500/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                       selectedSchools.includes(s.sekolah_id) ? "bg-brand-500 border-brand-500" : "border-gray-300 dark:border-gray-600"
                    }`}>
                       {selectedSchools.includes(s.sekolah_id) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                       )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-gray-800 dark:text-white/90 truncate">{s.nama}</span>
                      <span className="text-[10px] text-gray-500">{s.npsn}</span>
                    </div>
                  </div>
                ))}
                {filteredSchools.length === 0 && (
                  <div className="col-span-full py-10 text-center text-gray-500 text-sm italic">
                    Sekolah tidak ditemukan.
                  </div>
                )}
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                Terpilih: <span className="font-bold text-brand-500">{selectedSchools.length}</span> sekolah
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={() => navigate(-1)} type="button">
                Batal
              </Button>
              <Button type="submit" loading={loading}>
                Simpan Permintaan
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}

// Minimal Icons if not imported globally
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
