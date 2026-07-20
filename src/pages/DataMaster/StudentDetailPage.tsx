import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Avatar from "../../components/ui/avatar/Avatar";
import useGoBack from "../../hooks/useGoBack";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";

export default function StudentDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useGoBack();
  
  // Data passed from selection
  const selectedStudents = location.state?.students || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    if (!selectedStudents || selectedStudents.length === 0) {
      navigate(-1);
    }
  }, [selectedStudents, navigate]);

  const currentStudent = selectedStudents[currentIndex];

  // Fetch school name based on sekolah_id
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (currentStudent?.identitas?.sekolah_id) {
        try {
          const response = await dapodikService.getSekolah();
          let schools = [];
          if (response.status === 'success' || response.success === true) {
            schools = response.data || [];
          } else if (Array.isArray(response)) {
            schools = response;
          } else if (response.data && Array.isArray(response.data)) {
            schools = response.data;
          }

          const school = schools.find((s: any) => s.sekolah_id === currentStudent.identitas.sekolah_id);
          if (school) {
            setSchoolName(school.nama);
          } else {
            setSchoolName(currentStudent.identitas.sekolah_id); // Fallback to ID
          }
        } catch (err) {
          console.error("Gagal mengambil nama sekolah:", err);
          setSchoolName(currentStudent.identitas.sekolah_id);
        }
      }
    };
    fetchSchoolName();
  }, [currentStudent]);

  if (selectedStudents.length === 0) return null;

  const { identitas, akademik, data_pendukung } = currentStudent;

  const handleNext = () => {
    if (currentIndex < selectedStudents.length - 1) {
      setCurrentIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      <PageMeta
        title={`Profil - ${identitas?.nama} | SIMAK`}
        description="Detail profil peserta didik"
      />
      <div className="space-y-6">
        {/* Modern Header Navigation */}
        <div className="flex items-center justify-between no-print bg-white dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBack}
              className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-all active:scale-95 border border-gray-200/60 dark:border-gray-800"
              title="Kembali"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Profil Peserta Didik
              </h3>
              {selectedStudents.length > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Siswa {currentIndex + 1} dari {selectedStudents.length} terpilih
                </p>
              )}
            </div>
          </div>
          
          {selectedStudents.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="rounded-xl border-gray-200/80 dark:border-gray-800 shadow-sm hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={currentIndex === selectedStudents.length - 1}
                onClick={handleNext}
                className="rounded-xl shadow-sm shadow-brand-500/10"
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>

        {/* Minimalist Content Layout */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {/* Top Identity Row */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start border-b border-gray-100 dark:border-white/5">
            <Avatar 
                src={getFotoUrl(identitas?.foto)} 
                size="4xlarge" 
                shape="portrait"
                className="border border-gray-200 dark:border-gray-800 shadow-sm shrink-0" 
            />
            
            <div className="space-y-2.5 text-center md:text-left flex-grow w-full md:pt-2">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
                  {identitas?.nama}
                </h1>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  NISN: {identitas?.nisn || '-'}
                </p>
              </div>

              {/* Minimal Badges */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                <span className="px-2.5 py-1 bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-lg border border-gray-200/60 dark:border-gray-800">
                  Tingkat {akademik?.tingkat || '-'}
                </span>
                <span className="px-2.5 py-1 bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-lg border border-gray-200/60 dark:border-gray-800">
                  Rombel {akademik?.nama_rombel || '-'}
                </span>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                {schoolName || "-"}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            {/* Left Section: Identitas */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-500 dark:text-brand-400 border-b border-gray-100 dark:border-white/5 pb-2 uppercase tracking-wider">Identitas Diri</h4>
              <div className="space-y-3">
                <DataRow label="Nama Lengkap" value={identitas?.nama} />
                <DataRow label="Jenis Kelamin" value={identitas?.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'} />
                <DataRow label="NIK" value={identitas?.nik} />
                <DataRow label="Tempat Lahir" value={identitas?.tempat_lahir} />
                <DataRow label="Tanggal Lahir" value={identitas?.tanggal_lahir ? new Date(identitas.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
                <DataRow label="Agama" value={identitas?.agama} />
              </div>
            </div>

            {/* Right Section: Akademik & Orang Tua */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-500 dark:text-brand-400 border-b border-gray-100 dark:border-white/5 pb-2 uppercase tracking-wider">Akademik & Keluarga</h4>
              <div className="space-y-3">
                <DataRow label="Nama Sekolah" value={schoolName} />
                <DataRow label="Tingkat" value={akademik?.tingkat} />
                <DataRow label="Rombel" value={akademik?.nama_rombel} />
                <DataRow label="Jurusan" value={akademik?.jurusan} />
                <div className="pt-2.5 space-y-3 border-t border-gray-100 dark:border-white/5">
                  <DataRow label="Nama Ayah" value={data_pendukung?.nama_ayah} />
                  <DataRow label="Nama Ibu" value={data_pendukung?.nama_ibu} />
                  <DataRow label="HP Orang Tua" value={data_pendukung?.hp_orang_tua} />
                </div>
              </div>
            </div>

            {/* Full Width: Alamat */}
            <div className="md:col-span-2 space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
              <h4 className="text-sm font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider">Alamat Lengkap</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">
                {data_pendukung?.alamat_lengkap || "Informasi alamat tidak tersedia."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center gap-4 py-2 border-b border-gray-50 dark:border-white/[0.02] last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-semibold text-gray-800 dark:text-white/90 text-right">{value || "-"}</span>
    </div>
  );
}
