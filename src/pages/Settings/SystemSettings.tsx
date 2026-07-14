import React, { useState, useEffect, useRef } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import { ArrowUpIcon, CheckCircleIcon, AlertIcon, SchoolIcon, UserIcon, InfoIcon } from "../../icons";
import Swal from "sweetalert2";

export default function SystemSettingsPage() {
  const { settings, updateSettings, getStorageUrl, loading: settingsLoading } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    appName: "SIMAK",
    appShortName: "Mandala",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    copyrightText: "© 2026 SIMAK. All Rights Reserved.",
    metaDescription: "",
    metaKeywords: "",
    maintenanceMode: false,
  });

  // Files State
  const [appLogoFile, setAppLogoFile] = useState<File | null>(null);
  const [appLogoDarkFile, setAppLogoDarkFile] = useState<File | null>(null);
  const [appFaviconFile, setAppFaviconFile] = useState<File | null>(null);

  // Previews State
  const [appLogoPreview, setAppLogoPreview] = useState<string>("");
  const [appLogoDarkPreview, setAppLogoDarkPreview] = useState<string>("");
  const [appFaviconPreview, setAppFaviconPreview] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Inputs Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        appName: settings.appName || "SIMAK",
        appShortName: settings.appShortName || "Mandala",
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        copyrightText: settings.copyrightText || "© 2026 SIMAK. All Rights Reserved.",
        metaDescription: settings.metaDescription || "",
        metaKeywords: settings.metaKeywords || "",
        maintenanceMode: settings.maintenanceMode || false,
      });

      // Clear local file states when new settings load
      setAppLogoFile(null);
      setAppLogoDarkFile(null);
      setAppFaviconFile(null);

      // Pre-populate previews from storage URLs if available
      setAppLogoPreview(settings.appLogo ? getStorageUrl(settings.appLogo) : "");
      setAppLogoDarkPreview(settings.appLogoDark ? getStorageUrl(settings.appLogoDark) : "");
      setAppFaviconPreview(settings.appFavicon ? getStorageUrl(settings.appFavicon) : "");
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "logoDark" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      Swal.fire("Format Tidak Valid", "Mohon pilih file gambar (PNG, JPG, SVG, atau ICO)", "error");
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire("Ukuran File Terlalu Besar", "Maksimal ukuran file adalah 2MB", "error");
      return;
    }

    // Set file object and preview URL
    const previewUrl = URL.createObjectURL(file);
    if (type === "logo") {
      setAppLogoFile(file);
      setAppLogoPreview(previewUrl);
    } else if (type === "logoDark") {
      setAppLogoDarkFile(file);
      setAppLogoDarkPreview(previewUrl);
    } else if (type === "favicon") {
      setAppFaviconFile(file);
      setAppFaviconPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const uploadData = new FormData();
      uploadData.append("appName", formData.appName.trim());
      uploadData.append("appShortName", formData.appShortName.trim());
      uploadData.append("contactEmail", formData.contactEmail.trim());
      uploadData.append("contactPhone", formData.contactPhone.trim());
      uploadData.append("contactAddress", formData.contactAddress.trim());
      uploadData.append("copyrightText", formData.copyrightText.trim());
      uploadData.append("metaDescription", formData.metaDescription.trim());
      uploadData.append("metaKeywords", formData.metaKeywords.trim());
      uploadData.append("maintenanceMode", String(formData.maintenanceMode));

      if (appLogoFile) uploadData.append("appLogo", appLogoFile);
      if (appLogoDarkFile) uploadData.append("appLogoDark", appLogoDarkFile);
      if (appFaviconFile) uploadData.append("appFavicon", appFaviconFile);

      await updateSettings(uploadData);

      Swal.fire({
        icon: "success",
        title: "Berhasil Disimpan",
        text: "Pengaturan sistem berhasil diperbarui",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Save settings failed:", err);
      Swal.fire("Gagal Menyimpan", err.response?.data?.message || "Terjadi kesalahan saat menyimpan pengaturan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Pengaturan Sistem | SIMAK"
        description="Atur nama aplikasi, logo, footer, dan informasi SEO instansi Anda"
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Pengaturan Sistem
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Atur konfigurasi branding instansi, metadata SEO, aset logo, dan status pemeliharaan sistem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main settings column */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Branding & Identitas */}
            <ComponentCard title="Identitas & Branding Aplikasi">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nama Aplikasi <span className="text-error-500">*</span>
                  </label>
                  <Input
                    name="appName"
                    value={formData.appName}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: SIMAK - Cabang Dinas Pendidikan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nama Pendek (Singkatan) <span className="text-error-500">*</span>
                  </label>
                  <Input
                    name="appShortName"
                    value={formData.appShortName}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: SIMAK"
                  />
                </div>
              </div>
            </ComponentCard>

            {/* 2. Kontak & Footer */}
            <ComponentCard title="Informasi Instansi & Footer">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Kontak
                    </label>
                    <Input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="email@instansi.go.id"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Nomor Telepon
                    </label>
                    <Input
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="0812xxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Alamat Lengkap Kantor
                  </label>
                  <textarea
                    name="contactAddress"
                    value={formData.contactAddress}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white"
                    placeholder="Tulis alamat kantor Cabang Dinas Pendidikan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Teks Hak Cipta (Copyright) <span className="text-error-500">*</span>
                  </label>
                  <Input
                    name="copyrightText"
                    value={formData.copyrightText}
                    onChange={handleInputChange}
                    required
                    placeholder="Contoh: © 2026 SIMAK. All Rights Reserved."
                  />
                </div>
              </div>
            </ComponentCard>

            {/* 3. SEO & Metadata */}
            <ComponentCard title="Pengaturan Meta SEO (Search Engine Optimization)">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Deskripsi Meta Aplikasi
                  </label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 dark:text-white"
                    placeholder="Penjelasan ringkas aplikasi yang akan terindeks Google..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Kata Kunci Meta (Keywords)
                  </label>
                  <Input
                    name="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={handleInputChange}
                    placeholder="Contoh: simak, cadisdik, sekolah, mandala (pisahkan dengan koma)"
                  />
                </div>
              </div>
            </ComponentCard>
          </div>

          {/* Sidebar options column */}
          <div className="lg:col-span-4 space-y-6">
            {/* A. Upload Assets (Logo & Favicon) */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] space-y-6">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Aset Media & Logo
              </h4>

              {/* 1. App Logo Upload */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo Utama (Light Theme)</span>
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="group relative h-32 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all overflow-hidden"
                >
                  {appLogoPreview ? (
                    <img src={appLogoPreview} alt="Logo Preview" className="h-20 object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 group-hover:text-brand-500">
                      <ArrowUpIcon className="size-6 mb-1" />
                      <span className="text-[10px]">Pilih File Gambar</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={(e) => handleFileChange(e, "logo")}
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg"
                  />
                </div>
              </div>

              {/* 2. App Logo Dark Mode Upload */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Logo Mode Gelap (Dark Theme)</span>
                <div 
                  onClick={() => logoDarkInputRef.current?.click()}
                  className="group relative h-32 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.01] bg-gray-950 dark:bg-transparent transition-all overflow-hidden"
                >
                  {appLogoDarkPreview ? (
                    <img src={appLogoDarkPreview} alt="Logo Dark Preview" className="h-20 object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-brand-500">
                      <ArrowUpIcon className="size-6 mb-1" />
                      <span className="text-[10px]">Pilih Logo Mode Gelap</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={logoDarkInputRef}
                    onChange={(e) => handleFileChange(e, "logoDark")}
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg"
                  />
                </div>
              </div>

              {/* 3. App Favicon Upload */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Favicon (.ico atau .png)</span>
                <div 
                  onClick={() => faviconInputRef.current?.click()}
                  className="group relative h-24 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all overflow-hidden"
                >
                  {appFaviconPreview ? (
                    <img src={appFaviconPreview} alt="Favicon Preview" className="size-10 object-contain" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 group-hover:text-brand-500">
                      <ArrowUpIcon className="size-5 mb-1" />
                      <span className="text-[10px]">Upload Favicon</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={faviconInputRef}
                    onChange={(e) => handleFileChange(e, "favicon")}
                    className="hidden"
                    accept=".ico,.png,.png"
                  />
                </div>
              </div>
            </div>

            {/* B. Technical & Mode Settings */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] space-y-5">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Teknis & Pemeliharaan
              </h4>

              <div className="flex items-start gap-3 p-3 bg-warning-50 dark:bg-warning-500/10 rounded-xl border border-warning-100 dark:border-warning-500/20">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  name="maintenanceMode"
                  checked={formData.maintenanceMode}
                  onChange={handleInputChange}
                  className="w-4.5 h-4.5 text-warning-600 border-gray-300 rounded focus:ring-warning-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="maintenanceMode" className="text-xs font-semibold text-warning-800 dark:text-orange-400 cursor-pointer select-none">
                  Mode Pemeliharaan (Maintenance)
                  <span className="block font-normal text-[10px] text-warning-600 dark:text-warning-400/80 mt-1 leading-relaxed">
                    Centang untuk menutup akses panel utama dari publik. Hanya administrator terdaftar yang dapat login dan mengakses dashboard.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
      </div>
    </>
  );
}
