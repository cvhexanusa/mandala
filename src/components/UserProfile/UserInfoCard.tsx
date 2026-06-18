import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

interface Pegawai {
  pegawai_id: string;
  cadisdik_id: string;
  nama_lengkap: string;
  nip: string;
  nik?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat_lengkap?: string;
  email: string;
  jabatan: number;
  jenis_kelamin: number;
  nomor_telepon: string | null;
  foto: string | null;
  aktif: boolean;
}

interface UserInfoCardProps {
  pegawaiData: Pegawai | null;
}

export default function UserInfoCard({ pegawaiData }: UserInfoCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  if (!pegawaiData) return null;

  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === "-") return "-";
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('id-ID', options);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-7 relative overflow-hidden">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-50 rounded-full opacity-50 dark:bg-brand-500/10 blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col gap-6 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Informasi Pribadi
          </h4>
          <button 
            onClick={openModal}
            className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-lg dark:bg-brand-500/10 dark:hover:bg-brand-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Lengkapi
          </button>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-2">
          {/* NIK */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-brand-50 dark:bg-white/5 dark:group-hover:bg-brand-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">NIK Kependudukan</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-mono tracking-wide">{pegawaiData.nik || <span className="text-error-400 italic font-sans text-xs">Belum diisi</span>}</p>
            </div>
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-brand-50 dark:bg-white/5 dark:group-hover:bg-brand-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Tempat, Tanggal Lahir</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {pegawaiData.tempat_lahir || "-"}, {formatDate(pegawaiData.tanggal_lahir)}
              </p>
            </div>
          </div>

          {/* Jenis Kelamin */}
          <div className="flex items-start gap-3.5 group">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-brand-50 dark:bg-white/5 dark:group-hover:bg-brand-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Jenis Kelamin</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {pegawaiData.jenis_kelamin === 0 ? "Laki-laki" : "Perempuan"}
              </p>
            </div>
          </div>

          {/* Alamat */}
          <div className="flex items-start gap-3.5 group md:col-span-2">
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-brand-50 dark:bg-white/5 dark:group-hover:bg-brand-500/10 transition-colors">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Alamat Lengkap</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-relaxed">
                {pegawaiData.alamat_lengkap && pegawaiData.alamat_lengkap !== "-" 
                  ? pegawaiData.alamat_lengkap 
                  : <span className="text-error-400 italic text-xs">Alamat belum dilengkapi. Silakan lengkapi profil Anda.</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              Lengkapi Informasi Pribadi
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Lengkapi data NIK, Tempat/Tanggal Lahir, dan Alamat Anda.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-2">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Nomor Induk Kependudukan (NIK)</Label>
                    <Input type="text" value={pegawaiData.nik || ""} placeholder="16 Digit NIK" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Tempat Lahir</Label>
                    <Input type="text" value={pegawaiData.tempat_lahir || ""} placeholder="Contoh: Bandung" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Tanggal Lahir</Label>
                    <Input type="date" value={pegawaiData.tanggal_lahir || ""} />
                  </div>

                  <div className="col-span-2">
                    <Label>Alamat Lengkap</Label>
                    <textarea 
                      className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-500"
                      rows={3}
                      placeholder="Jalan, RT/RW, Desa/Kelurahan..."
                      value={pegawaiData.alamat_lengkap || ""}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} className="rounded-xl">
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} className="rounded-xl shadow-lg shadow-brand-500/20">
                Simpan Data
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
