import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../common/PageBreadCrumb";
import PageMeta from "../common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useSekolah } from "../../context/SekolahContext";
import { dapodikService } from "../../services/dapodikService";
import Swal from "sweetalert2";
import { CopyIcon, SchoolIcon, EnvelopeIcon, UserCircleIcon } from "../../icons";

const JABATAN_MAP: Record<number, string> = {
  0: "Super Admin",
  1: "Admin",
  3: "Kepala Cabang Dinas",
  4: "Kasubag",
  5: "Staf",
  6: "Pengawas",
};

export default function ProfileView() {
  const { user } = useAuth();
  const { sekolah } = useSekolah();
  
  const [instansiName, setInstansiName] = useState<string>("Mandala Internal");

  useEffect(() => {
    if (user) {
      const userObj = user as any;
      if (userObj.cadisdik) {
        setInstansiName(userObj.cadisdik);
      } else if (userObj.sekolah) {
        setInstansiName(userObj.sekolah);
      } else if (sekolah?.nama) {
        setInstansiName(sekolah.nama);
      } else {
        setInstansiName("Mandala Internal");
      }
    }
  }, [user, sekolah]);

  // Cast user to record for safe dynamic access
  const userObj = user as unknown as Record<string, unknown>;

  // Derived user details
  const displayJabatan = JABATAN_MAP[Number(userObj?.jabatan)] || user?.role || "Staf";
  const displayJK = Number(userObj?.jenis_kelamin) === 1 ? "Perempuan" : "Laki-laki";
  const displayLahir = `${(userObj?.tempat_lahir as string) || "Tidak Diketahui"}, ${
    userObj?.tanggal_lahir 
      ? new Date(userObj.tanggal_lahir as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : "1 Januari 1980"
  }`;

  return (
    <>
      <PageMeta title="Profil Saya | SIMAK" description="Halaman Profil Pengguna SIMAK" />
      <PageBreadcrumb pageTitle="Profil Saya" />
      
      <div className="space-y-6 pb-12">
        {/* Dynamic & Modern Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 to-indigo-600 p-8 md:p-10 rounded-3xl text-white shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-28 w-28 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center text-white text-4xl font-extrabold shadow-lg shrink-0 overflow-hidden backdrop-blur-sm">
                {user?.foto ? (
                  <img src={user.foto} alt={user.nama} className="w-full h-full object-cover" />
                ) : (
                  user?.nama?.charAt(0).toUpperCase() || "A"
                )}
              </div>
              
              <div className="text-center md:text-start space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm uppercase tracking-wider">
                  👤 {user?.role || "Pengguna"}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{user?.nama || "User Name"}</h2>
                <p className="text-brand-100 text-sm font-medium">{user?.email || "email@example.com"}</p>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end justify-center md:text-right text-center shrink-0">
              <span className="text-[10px] uppercase text-brand-100 font-bold tracking-widest block mb-1">Status Kepegawaian</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm uppercase tracking-wider">
                ● Aktif Bertugas
              </span>
            </div>
          </div>

          {/* Abstract aesthetic shapes */}
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-10 right-20 h-40 w-40 rounded-full bg-brand-400/20 blur-2xl"></div>
        </div>

        {/* Dynamic Details Grid Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Column Left: Contact Info (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Contact Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] space-y-6">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider pb-3 border-b border-gray-100 dark:border-gray-800">
                Hubungi Saya
              </h3>
              
              <div className="space-y-4">
                <ContactRow 
                  icon={<EnvelopeIcon className="size-5" />} 
                  label="Email Resmi" 
                  value={user?.email || "-"} 
                />
                
                <ContactRow 
                  icon={
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  } 
                  label="Nomor Telepon" 
                  value={(userObj?.nomor_telepon as string) || "0812-3456-7890"} 
                />

                <ContactRow 
                  icon={<UserCircleIcon className="size-5" />} 
                  label="Username" 
                  value={user?.email?.split('@')[0] || "admin"} 
                />
              </div>
            </div>

            {/* Account Level Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                Konektivitas Akun
              </h3>
              
              <div className="space-y-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Level Sistem</span>
                  <span className="px-2.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-mono uppercase text-[10px]">
                    {user?.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Instansi Level</span>
                  <span className="text-gray-800 dark:text-white/90">
                    {user?.cadisdik_id ? "Kantor Cabang Dinas" : "Satuan Pendidikan"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Column Right: Profile Details (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Card 1: Personal Details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider pb-3 border-b border-gray-100 dark:border-gray-800 mb-4 flex items-center gap-2">
                <span className="text-lg">📋</span> Informasi Pribadi
              </h3>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <InfoRow label="Nomor Induk Kependudukan (NIK)" value={(userObj?.nik as string) || "3275000000000001"} showCopy />
                <InfoRow label="Jenis Kelamin" value={displayJK} />
                <InfoRow label="Tempat & Tanggal Lahir" value={displayLahir} />
                <InfoRow label="Domisili / Alamat Lengkap" value={(userObj?.alamat_lengkap as string) || "Bandung, Jawa Barat"} />
              </div>
            </div>

            {/* Card 2: Employment Details */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider pb-3 border-b border-gray-100 dark:border-gray-800 mb-4 flex items-center gap-2">
                <SchoolIcon className="size-5 text-gray-800 dark:text-white" /> Data Kepegawaian
              </h3>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <InfoRow label="NIP / NIY Resmi" value={user?.nip || "198901012015011001"} showCopy />
                <InfoRow 
                  label="Instansi Penugasan" 
                  value={instansiName} 
                />
                <InfoRow label="Jabatan Kepegawaian" value={displayJabatan} />
                <InfoRow label="Status Kerja" value="Pegawai Negeri Sipil (PNS) / Tetap" />
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all group border border-transparent hover:border-gray-100 dark:hover:border-gray-800/50">
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="overflow-hidden">
        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</span>
        <span className="block text-xs font-bold text-gray-800 dark:text-white/90 truncate mt-0.5" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, showCopy = false }: { label: string; value: string; showCopy?: boolean }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    Swal.fire({
      title: "Tersalin!",
      text: `${label} telah disalin ke papan klip.`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/[0.005] px-2 rounded-xl transition-all duration-150 gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2 mt-1 sm:mt-0">
        <span className="text-xs font-bold text-gray-800 dark:text-white/90 break-all">{value || "-"}</span>
        {showCopy && value && (
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-brand-500 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            title={`Salin ${label}`}
          >
            <CopyIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
