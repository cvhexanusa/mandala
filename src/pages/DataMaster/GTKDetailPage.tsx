import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Avatar from "../../components/ui/avatar/Avatar";
import useGoBack from "../../hooks/useGoBack";
import { dapodikService } from "../../services/dapodikService";
import { getFotoUrl } from "../../utils/image";

export default function GTKDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useGoBack();
  
  // Data passed from selection (matching state key from GTKData)
  const gtkList = location.state?.gtkList || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    if (!gtkList || gtkList.length === 0) {
      navigate(-1);
    }
  }, [gtkList, navigate]);

  const currentGTK = gtkList[currentIndex];

  // Fetch school name based on sekolah_id
  useEffect(() => {
    const fetchSchoolName = async () => {
      if (currentGTK?.identitas?.sekolah_id) {
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

          const school = schools.find((s: any) => s.sekolah_id === currentGTK.identitas.sekolah_id);
          if (school) {
            setSchoolName(school.nama);
          } else {
            setSchoolName(currentGTK.identitas.sekolah_id); // Fallback to ID
          }
        } catch (err) {
          console.error("Gagal mengambil nama sekolah:", err);
          setSchoolName(currentGTK.identitas.sekolah_id);
        }
      }
    };
    fetchSchoolName();
  }, [currentGTK]);

  if (gtkList.length === 0) return null;

  const { identitas, kepegawaian, data_pendukung } = currentGTK;

  const handleNext = () => {
    if (currentIndex < gtkList.length - 1) {
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
        title={`Profil GTK - ${identitas?.nama} | SIMAK`}
        description="Detail profil Guru dan Tenaga Kependidikan"
      />
      <div className="space-y-6">
        {/* Simple Header Navigation */}
        <div className="flex items-center justify-between no-print bg-white dark:bg-white/[0.03] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBack}
              className="text-gray-500 hover:text-brand-500 transition-colors"
            >
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Profil GTK {gtkList.length > 1 && `(${currentIndex + 1} dari ${gtkList.length})`}
            </h3>
          </div>
          
          {gtkList.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={handlePrev}
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={currentIndex === gtkList.length - 1}
                onClick={handleNext}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>

        {/* Simplified Content Layout */}
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Top Identity Row */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start border-b border-gray-100 dark:border-white/5">
            <Avatar 
                src={getFotoUrl(identitas?.foto)} 
                size="large" 
                className="h-28 w-28 rounded-xl border border-gray-200 dark:border-gray-700" 
            />
            <div className="space-y-1">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{identitas?.nama}</h1>
                <p className="text-sm text-gray-500">NUPTK: {identitas?.nuptk || '-'} | NIP: {identitas?.nip || '-'}</p>
                <div className="pt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {kepegawaian?.status_kepegawaian}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {kepegawaian?.jenis_ptk}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {kepegawaian?.jabatan}
                    </span>
                </div>
            </div>
          </div>

          {/* List Data Sections */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {/* Left Section: Identitas */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-500 border-b border-gray-50 dark:border-white/5 pb-2">Identitas GTK</h4>
              <DataRow label="Nama Lengkap" value={identitas?.nama} />
              <DataRow label="Jenis Kelamin" value={identitas?.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'} />
              <DataRow label="NIK" value={identitas?.nik} />
              <DataRow label="NUPTK" value={identitas?.nuptk} />
              <DataRow label="NIP" value={identitas?.nip} />
              <DataRow label="Tempat Lahir" value={identitas?.tempat_lahir} />
              <DataRow label="Tanggal Lahir" value={identitas?.tanggal_lahir ? new Date(identitas.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
              <DataRow label="Agama" value={identitas?.agama} />
            </div>

            {/* Right Section: Kepegawaian & Instansi */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-500 border-b border-gray-50 dark:border-white/5 pb-2">Data Kepegawaian & Instansi</h4>
              <DataRow label="Nama Sekolah" value={schoolName} />
              <DataRow label="Status Kepegawaian" value={kepegawaian?.status_kepegawaian} />
              <DataRow label="Jenis PTK" value={kepegawaian?.jenis_ptk} />
              <DataRow label="Jabatan" value={kepegawaian?.jabatan} />
              <DataRow label="Pendidikan Terakhir" value={kepegawaian?.pendidikan_terakhir || identitas?.pendidikan_terakhir} />
              <div className="pt-4 space-y-4">
                  <DataRow label="Ibu Kandung" value={identitas?.ibu_kandung} />
                  <DataRow label="Email" value={data_pendukung?.email} />
              </div>
            </div>

            {/* Full Width: Alamat */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-50 dark:border-white/5 mt-4">
               <h4 className="text-sm font-semibold text-brand-500 pb-2">Alamat Lengkap</h4>
               <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
    <div className="flex justify-between items-center gap-4 py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-right">{value || "-"}</span>
    </div>
  );
}
