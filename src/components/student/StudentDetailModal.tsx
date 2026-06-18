import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Avatar from "../../components/ui/avatar/Avatar";

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  student,
}: StudentDetailModalProps) {
  if (!isOpen || !student) return null;

  const { identitas, akademik, data_pendukung } = student;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Detail Peserta Didik
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          {/* Top Section: Photo & Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex-shrink-0">
                <Avatar src={identitas?.foto} size="xlarge" className="h-32 w-32 rounded-2xl shadow-md border-4 border-white dark:border-gray-800" />
            </div>
            <div className="flex-grow text-center sm:text-left space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{identitas?.nama}</h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium">
                  {akademik?.nama_rombel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                  NISN: {identitas?.nisn}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Identitas Section */}
            <section className="space-y-4">
              <h4 className="text-sm font-bold text-brand-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-px bg-brand-500/30"></span>
                Identitas Pribadi
              </h4>
              <div className="space-y-3">
                <DetailRow label="Nama Lengkap" value={identitas?.nama} />
                <DetailRow label="Jenis Kelamin" value={identitas?.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'} />
                <DetailRow label="NISN" value={identitas?.nisn} />
                <DetailRow label="NIK" value={identitas?.nik} />
                <DetailRow label="Tempat Lahir" value={identitas?.tempat_lahir} />
                <DetailRow label="Tanggal Lahir" value={identitas?.tanggal_lahir ? new Date(identitas.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
                <DetailRow label="Agama" value={identitas?.agama} />
              </div>
            </section>

            {/* Akademik Section */}
            <section className="space-y-4">
              <h4 className="text-sm font-bold text-brand-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-px bg-brand-500/30"></span>
                Informasi Akademik
              </h4>
              <div className="space-y-3">
                <DetailRow label="Rombongan Belajar" value={akademik?.nama_rombel} />
                <DetailRow label="Tingkat" value={akademik?.tingkat} />
                <DetailRow label="Jurusan" value={akademik?.jurusan} />
                <DetailRow label="Status" value="Aktif" />
              </div>
            </section>

            {/* Data Pendukung Section */}
            <section className="col-span-full space-y-4">
              <h4 className="text-sm font-bold text-brand-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-px bg-brand-500/30"></span>
                Data Orang Tua & Alamat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <DetailRow label="Nama Ayah" value={data_pendukung?.nama_ayah} />
                <DetailRow label="Nama Ibu" value={data_pendukung?.nama_ibu} />
                <DetailRow label="HP Orang Tua" value={data_pendukung?.hp_orang_tua} />
                <DetailRow label="Alamat Lengkap" value={data_pendukung?.alamat_lengkap} className="md:col-span-2" />
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, className = "" }: { label: string; value: string | undefined; className?: string }) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <span className="text-xs font-medium text-gray-400 uppercase">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
        {value || "-"}
      </span>
    </div>
  );
}
