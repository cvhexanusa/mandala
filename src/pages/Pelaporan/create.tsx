import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { mandalaService, MandalaSchool } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import Swal from "sweetalert2";

export default function CreatePelaporanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleSlug = user ? getRoleSlug(user.role) : "admin";

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const response = await mandalaService.createPelaporan({
        ...formData,
        cadisdik_id: cadisdikId,
        sekolah_ids: [], // Pass empty array if backend expects the field
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
