import React from "react";
import PageBreadcrumb from "../common/PageBreadCrumb";
import PageMeta from "../common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useSekolah } from "../../context/SekolahContext";

export default function ProfileView() {
  const { user } = useAuth();
  const { sekolah } = useSekolah();

  return (
    <div>
      <PageMeta title="Profil Saya | SIMAK" description="Halaman Profil Pengguna" />
      <PageBreadcrumb pageTitle="Profil Saya" />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-24 w-24 rounded-full bg-brand-500 flex items-center justify-center text-white text-3xl font-bold">
              {user?.nama?.charAt(0) || "U"}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {user?.nama || "User Name"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {user?.role || "Role"}
            </p>
          </div>
          
          <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
            <h4 className="mb-4 text-sm font-medium text-gray-800 dark:text-white/90 uppercase tracking-wider">
              Kontak
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">{user?.email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Telepon</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">0812-3456-7890</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
              Informasi Pribadi
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">NIK</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">3275000000000001</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Usia</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">35 Tahun</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Username</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user?.email?.split('@')[0] || "admin"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Domisili</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">Bandung, Jawa Barat</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
              Data Kepegawaian
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">NIP / NIY</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">198901012015011001</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Instansi</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{sekolah?.nama || "Mandala Internal"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status Kepegawaian</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">PNS / Tetap</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Jabatan</label>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">Administrator Sistem</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
