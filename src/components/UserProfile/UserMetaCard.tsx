import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Badge from "../ui/badge/Badge";

interface Pegawai {
  pegawai_id: string;
  nama_lengkap: string;
  nip: string;
  email: string;
  jabatan: number;
  jenis_kelamin: number;
  nomor_telepon: string | null;
  foto: string | null;
  aktif: boolean;
}

const JABATAN_MAP: Record<number, string> = {
  0: "Super Admin",
  1: "Admin",
  3: "Kepala Cabang Dinas",
  4: "Kasubag",
  5: "Staf",
  6: "Pengawas",
};

interface UserMetaCardProps {
  pegawaiData: Pegawai | null;
}

export default function UserMetaCard({ pegawaiData }: UserMetaCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  if (!pegawaiData) return null;

  return (
    <>
      <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="relative h-28 w-full bg-gradient-to-r from-brand-500 to-brand-300">
           {/* Decorative background */}
        </div>
        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
          <div className="relative flex flex-col items-center -mt-12 xl:flex-row xl:items-end xl:gap-6">
            <div className="w-24 h-24 overflow-hidden border-4 border-white rounded-full dark:border-gray-900 shadow-lg">
              <img 
                src={pegawaiData.foto || "/images/user/owner.jpg"} 
                alt="user" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/user/owner.jpg";
                }}
              />
            </div>
            
            <div className="mt-4 flex flex-col items-center xl:mt-0 xl:items-start grow">
              <div className="flex flex-col items-center xl:flex-row xl:gap-3">
                <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  {pegawaiData.nama_lengkap}
                </h4>
                <Badge color="primary" variant="solid" size="sm">
                   {JABATAN_MAP[pegawaiData.jabatan] || "Pegawai"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {pegawaiData.email}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 xl:mt-0">
              <button
                onClick={openModal}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit Profil
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Informasi Profil
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Perbarui detail Anda untuk menjaga profil tetap mutakhir.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-2">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Informasi Utama
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Nama Lengkap</Label>
                    <Input type="text" value={pegawaiData.nama_lengkap} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email</Label>
                    <Input type="text" value={pegawaiData.email || ""} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Nomor Telepon</Label>
                    <Input type="text" value={pegawaiData.nomor_telepon || ""} />
                  </div>

                  <div className="col-span-2">
                    <Label>NIP</Label>
                    <Input type="text" value={pegawaiData.nip || ""} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSave}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
