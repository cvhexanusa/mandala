import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Badge from "../ui/badge/Badge";

interface Pegawai {
  pegawai_id: string;
  cadisdik_id: string;
  nama_lengkap: string;
  nip: string;
  email: string;
  jabatan: number;
  jenis_kelamin: number;
  nomor_telepon: string | null;
  foto: string | null;
  aktif: boolean;
}

interface UserAddressCardProps {
  pegawaiData: Pegawai | null;
}

export default function UserAddressCard({ pegawaiData }: UserAddressCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  if (!pegawaiData) return null;

  return (
    <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7 relative overflow-hidden h-full">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 dark:bg-blue-500/10 blur-2xl pointer-events-none"></div>

      <div className="flex flex-col gap-6 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Data Kepegawaian
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2">
          {/* NIP */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">NIP / NUPTK</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-mono tracking-wide">{pegawaiData.nip || "-"}</p>
            </div>
          </div>

          {/* Instansi */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Unit Kerja / Instansi</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">CADISDIK WILAYAH {pegawaiData.cadisdik_id || "-"}</p>
            </div>
          </div>

          {/* ID Pegawai */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">ID Sistem Pegawai</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-mono">
                {pegawaiData.pegawai_id.substring(0, 8)}...
              </p>
            </div>
          </div>

          {/* Status Akun */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 dark:bg-white/5 dark:group-hover:bg-blue-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Status Kepegawaian</p>
              <div className="mt-1">
                 <Badge color={pegawaiData.aktif ? "success" : "error"} variant="light" size="sm">
                    {pegawaiData.aktif ? "Aktif Bertugas" : "Non-Aktif"}
                 </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
