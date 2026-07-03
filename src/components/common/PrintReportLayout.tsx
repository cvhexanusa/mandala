import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { dapodikService } from "../../services/dapodikService";

interface PrintReportLayoutProps {
  title: string;
  sekolahFilter?: string;
  schools?: any[];
  extraFilters?: { label: string; value: string }[];
}

// Global cache variables to prevent multiple network requests and enable immediate render
let cachedCadisdikList: any[] | null = null;
let cachedPegawaiList: any[] | null = null;

export default function PrintReportLayout({
  title,
  sekolahFilter,
  schools = [],
  extraFilters = [],
}: PrintReportLayoutProps) {
  const { user } = useAuth();
  const [currentCadisdik, setCurrentCadisdik] = useState<any | null>(null);

  useEffect(() => {
    const fetchCadisdik = async () => {
      try {
        let list = cachedCadisdikList;
        if (!list) {
          const response = await dapodikService.getCadisdik();
          list = response.data || [];
          cachedCadisdikList = list;
        }
        
        let targetCadisdikId = user?.cadisdik_id;
        if (sekolahFilter && sekolahFilter !== "all" && schools && schools.length > 0) {
          const school = schools.find((s) => s.sekolah_id === sekolahFilter || s.id === sekolahFilter);
          if (school) {
            if (school.cadisdik_id) {
              targetCadisdikId = school.cadisdik_id;
            } else {
              // Fallback lookup via KCD pegawai
              let pegawaiList = cachedPegawaiList;
              if (!pegawaiList) {
                const pRes = await dapodikService.getPegawai().catch(() => ({ data: [] }));
                pegawaiList = pRes.data || [];
                cachedPegawaiList = pegawaiList;
              }
              const matchedKcd = pegawaiList.find((p: any) => Number(p.jabatan) === 3);
              if (matchedKcd && matchedKcd.cadisdik_id) {
                targetCadisdikId = matchedKcd.cadisdik_id;
              }
            }
          }
        }

        if (targetCadisdikId) {
          const found = list.find((c: any) => c.id === targetCadisdikId || c.cadisdik_id === targetCadisdikId);
          if (found) {
            setCurrentCadisdik(found);
            return;
          }
        }
        
        setCurrentCadisdik(null);
      } catch (err) {
        console.error("Gagal mengambil data cadisdik untuk layout cetak:", err);
      }
    };
    fetchCadisdik();
  }, [user, sekolahFilter, schools]);

  const getSchoolName = () => {
    if (!sekolahFilter || sekolahFilter === "all") return "Semua Sekolah";
    const school = schools.find((s) => s.sekolah_id === sekolahFilter || s.id === sekolahFilter);
    return school ? school.nama : sekolahFilter;
  };

  const instansiName = currentCadisdik?.nama_instansi || "Dinas Pendidikan Provinsi Jawa Barat";
  const instansiAddress = currentCadisdik?.alamat || "Jalan Dr. Radjiman No. 6, Pasir Kaliki, Kec. Cicendo, Kota Bandung, Jawa Barat 40171";

  return (
    <div className="print-only w-full text-black font-serif mt-0 mb-4">
      {/* Style overrides to enforce professional print layouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force standard margins and white background */
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 20mm 15mm;
          }
          
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Times New Roman", Times, serif !important;
          }

          /* Hide UI wrappers and components */
          aside, header, nav, button, .no-print, .flex.border-b, .mb-6.flex, .rows-per-page, .pagination {
            display: none !important;
          }

          /* Force print block visibility */
          .print-only {
            display: block !important;
          }

          /* Official styling for table in print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            font-size: 10.5px !important;
          }

          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            text-align: left;
            color: #000000 !important;
            white-space: normal !important;
            word-wrap: break-word !important;
          }

          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
            text-align: center !important;
            text-transform: uppercase !important;
          }

          /* Avoid breaking rows across pages */
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Kop Surat Dinas Pendidikan Jabar */}
      <div className="flex items-center justify-between border-b-[3px] border-black pb-2.5 mb-5">
        {/* Left Side: West Java Logo / Emblem SVG */}
        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
          <svg className="w-14 h-14 text-black" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M50 12 L80 27 L80 60 C80 76 50 87 50 87 C50 87 20 76 20 60 L20 27 Z" fill="#f9fafb" />
            <circle cx="50" cy="45" r="11" fill="none" />
            <path d="M50 20 L50 45" />
            <path d="M35 56 Q50 66 65 56" />
          </svg>
        </div>

        {/* Center: Text Headers */}
        <div className="text-center flex-1 px-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide leading-tight text-gray-900">Pemerintah Provinsi Jawa Barat</h3>
          <h1 className="text-lg font-extrabold uppercase tracking-widest leading-none my-1 text-gray-950">{instansiName}</h1>
          <p className="text-[10px] text-gray-600 leading-tight">
            {instansiAddress}
          </p>
        </div>

        {/* Right Side Spacer for balancing alignment */}
        <div className="w-16 h-16 flex-shrink-0"></div>
      </div>

      {/* Document Title & Metadata */}
      <div className="text-center mb-6">
        <h2 className="text-md font-bold uppercase underline tracking-wider">{title}</h2>
        <div className="mt-3 text-xs space-y-1 text-gray-700">
          <p>
            Satuan Pendidikan: <span className="font-semibold">{getSchoolName()}</span>
          </p>
          {extraFilters.map((f, i) => (
            <p key={i}>
              {f.label}: <span className="font-semibold">{f.value}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reusable Official Signature Component
export function PrintSignature() {
  const { user } = useAuth();
  const [currentCadisdik, setCurrentCadisdik] = useState<any | null>(null);
  const [kepalaCabangDinas, setKepalaCabangDinas] = useState<any | null>(null);

  useEffect(() => {
    const loadSignatureData = async () => {
      try {
        let cadisdikList = cachedCadisdikList;
        if (!cadisdikList) {
          const response = await dapodikService.getCadisdik();
          cadisdikList = response.data || [];
          cachedCadisdikList = cadisdikList;
        }
        
        const targetCadisdikId = user?.cadisdik_id;
        if (targetCadisdikId) {
          const found = cadisdikList.find((c: any) => c.id === targetCadisdikId || c.cadisdik_id === targetCadisdikId);
          if (found) {
            setCurrentCadisdik(found);
          }
        }

        let pegawaiList = cachedPegawaiList;
        if (!pegawaiList) {
          const response = await dapodikService.getPegawai();
          pegawaiList = response.data || [];
          cachedPegawaiList = pegawaiList;
        }
        
        // Find employee with jabatan === 3 (Kepala Cabang Dinas) who belongs to the login user's instansi
        let kepala = null;
        if (targetCadisdikId) {
          kepala = pegawaiList.find((p: any) => 
            Number(p.jabatan) === 3 && 
            p.cadisdik_id === targetCadisdikId
          );
        }
        
        if (!kepala) {
          // Fallback to any Kepala Cabang Dinas in case of no matched cadisdik ID
          kepala = pegawaiList.find((p: any) => Number(p.jabatan) === 3);
        }

        if (kepala) {
          setKepalaCabangDinas(kepala);
        }
      } catch (err) {
        console.error("Gagal mengambil data tanda tangan:", err);
      }
    };
    loadSignatureData();
  }, [user]);

  let signerName = kepalaCabangDinas?.nama_lengkap;
  let signerNip = kepalaCabangDinas?.nip;

  // If logged-in user is the Kepala Cabang Dinas, use their credentials
  if (!signerName && Number(user?.jabatan) === 3) {
    signerName = user?.nama_lengkap || user?.nama;
    signerNip = (user as any)?.nip;
  }

  // Final fallback to blank dotted lines to avoid printing system admin name
  if (!signerName) {
    signerName = "..........................................";
    signerNip = "..........................................";
  }
  
  const currentDateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getCityFromAddress = (address?: string) => {
    if (!address) return "Bandung";
    const match = address.match(/(kabupaten|kab\.|kota)\s+([A-Za-z]+)/i);
    if (match && match[2]) {
      const cityName = match[2].trim();
      return cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    }
    if (address.toLowerCase().includes("cianjur")) return "Cianjur";
    if (address.toLowerCase().includes("bandung")) return "Bandung";
    if (address.toLowerCase().includes("sukabumi")) return "Sukabumi";
    if (address.toLowerCase().includes("bogor")) return "Bogor";
    return "Bandung";
  };

  const instansiName = currentCadisdik?.nama_instansi || "Dinas Pendidikan Provinsi Jawa Barat";
  const instansiAddress = currentCadisdik?.alamat || "Jalan Dr. Radjiman No. 6, Pasir Kaliki, Kec. Cicendo, Kota Bandung, Jawa Barat 40171";
  const city = getCityFromAddress(instansiAddress);

  return (
    <div className="print-only mt-12 flex justify-end text-xs font-serif page-break-inside-avoid">
      <div className="text-center w-64">
        <p>{city}, {currentDateStr}</p>
        <p className="font-semibold mt-1">Kepala {instansiName}</p>
        <div className="h-16"></div>
        <p className="font-bold underline uppercase">{signerName}</p>
        <p className="text-gray-600 mt-0.5">NIP. {signerNip}</p>
      </div>
    </div>
  );
}
