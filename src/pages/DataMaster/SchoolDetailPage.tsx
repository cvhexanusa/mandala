import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { mandalaService } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { 
  SchoolIcon, 
  ChevronLeftIcon, 
  BoxIcon, 
  UserIcon, 
  GroupIcon, 
  GridIcon
} from "../../icons";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [principal, setPrincipal] = useState<string>("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // AMBIL DETAIL, SUMMARY, DAN GTK SECARA PARALEL
        const [detailRes, summaryRes, gtkRes] = await Promise.all([
            mandalaService.getSchoolDetail(id),
            mandalaService.getSchoolSummary(id).catch(() => null),
            dapodikService.getGTK(50, "", 1, undefined, "aktif", id).catch(() => null)
        ]);
        
        console.log("RAW Detail Response:", detailRes);
        console.log("RAW Summary Response:", summaryRes);
        console.log("RAW GTK Response:", gtkRes);
        
        let detailData = null;
        // Ekstraksi Detail
        if (detailRes?.data !== undefined) detailData = detailRes.data;
        else if (detailRes?.status === "success" || detailRes?.success === true) detailData = detailRes.data;
        else detailData = detailRes;

        if (Array.isArray(detailData)) detailData = detailData[0];

        // Ekstraksi Summary
        let summaryData = null;
        if (summaryRes?.data !== undefined) summaryData = summaryRes.data;
        else if (summaryRes?.status === "success" || summaryRes?.success === true) summaryData = summaryRes.data;
        else summaryData = summaryRes;

        if (Array.isArray(summaryData)) summaryData = summaryData[0];

        // Ekstraksi Kepala Sekolah dari GTK
        let foundPrincipal = "-";
        if (gtkRes?.data && Array.isArray(gtkRes.data)) {
            const ks = gtkRes.data.find((g: any) => 
                g.kepegawaian?.jenis_ptk?.toLowerCase().includes("kepala sekolah") ||
                g.tugas_tambahan?.toLowerCase().includes("kepala sekolah")
            );
            if (ks) foundPrincipal = ks.identitas?.nama || "-";
        }
        setPrincipal(foundPrincipal);

        if (detailData && typeof detailData === 'object') {
          // GABUNGKAN DATA (Prioritaskan statistik dari summary jika tersedia)
          const mergedData = {
            ...detailData,
            // Jika di detail data tidak ada statistik, ambil dari summary
            total_gtk: detailData.total_gtk || summaryData?.jumlah_guru || summaryData?.total_gtk || detailData.jumlah_guru || 0,
            total_siswa: detailData.total_siswa || summaryData?.jumlah_siswa || summaryData?.total_siswa || detailData.jumlah_siswa || 0,
            // Tambahkan field statistik lain dari summary jika ada
            statistik: {
                ...(detailData.statistik || {}),
                ...(summaryData || {})
            }
          };
          setData(mergedData);
        } else {
          setError("Gagal memproses detail sekolah: Format data tidak dikenali.");
        }
      } catch (err) {
        console.error("Fetch detail error:", err);
        setError("Terjadi kesalahan saat memuat data sekolah.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const getStatusLabel = (status: any) => {
    if (status === "1" || status === 1 || status === "Negeri") return "Negeri";
    if (status === "2" || status === 2 || status === "Swasta") return "Swasta";
    return status || "-";
  };

  const getStatusColor = (status: any) => {
    const label = getStatusLabel(status);
    return label === "Negeri" ? "success" : "warning";
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-500 text-center px-4">
        <p className="mb-4">{error || "Data sekolah tidak ditemukan."}</p>
        <button onClick={handleBack} className="text-brand-500 hover:underline font-medium">Kembali ke Daftar</button>
      </div>
    );
  }

  // PEMETAAN FIELD PRESISI BERDASARKAN SAMPEL JSON USER
  // Menggunakan logical OR (||) agar jika salah satu field 0/null/undefined tetap mencari di field alternatif
  const total_guru = Number(data.total_gtk || data.statistik?.jumlah_guru || data.statistik?.total_gtk || data.jumlah_guru || 0);
  const total_siswa = Number(data.total_siswa || data.statistik?.jumlah_siswa || data.statistik?.total_siswa || data.jumlah_siswa || 0);
  const alamat_korespondensi = data.alamat || data.alamat_jalan || data.alamat_lengkap || data.identitas?.alamat || "-";

  return (
    <>
      <PageMeta
        title={`Detail ${data.nama} | SIMAK`}
        description={`Informasi detail untuk ${data.nama}`}
      />
      <PageBreadcrumb pageTitle="Detail Satuan Pendidikan" />

      <div className="space-y-6 pb-10">
        {/* Header Action */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 text-gray-500 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 leading-tight">
              {data.nama}
            </h3>
            <p className="text-sm text-gray-500 font-mono">NPSN: {data.npsn}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Summary & Status */}
          <div className="md:col-span-1 space-y-6">
            <ComponentCard title="Status Sekolah">
              <div className="space-y-5">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 uppercase font-medium tracking-wider">Bentuk Pendidikan</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{data.bentuk_pendidikan_id_str || data.bentuk_pendidikan_is_str || "-"}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 uppercase font-medium tracking-wider">Status Operasional</span>
                    <div className="mt-1">
                        <Badge color={getStatusColor(data.status_sekolah)}>
                            {getStatusLabel(data.status_sekolah)}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 uppercase font-medium tracking-wider">Wilayah Administrasi</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {data.kabupaten_kota || "-"}
                    </span>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard title="Statistik Terpadu">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10 text-center md:text-left">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold mb-1 tracking-widest">Total Guru</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{total_guru?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10 text-center md:text-left">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold mb-1 tracking-widest">Total Siswa</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{total_siswa?.toLocaleString()}</p>
                    </div>
                </div>
                <p className="mt-4 text-[10px] text-gray-400 italic text-center">* Data ditarik langsung dari response API pusat.</p>
            </ComponentCard>
          </div>

          {/* Right Column: Detailed Information */}
          <div className="md:col-span-2 space-y-6">
            <ComponentCard title="Informasi Identitas Satuan Pendidikan">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                    <DetailRow label="Nama Resmi Sekolah" value={data.nama} icon={<SchoolIcon className="size-4 text-brand-500" />} />
                    <DetailRow label="Nomor Pokok Sekolah Nasional (NPSN)" value={data.npsn} icon={<BoxIcon className="size-4 text-brand-500" />} />
                    <DetailRow label="Jenjang Pendidikan" value={data.bentuk_pendidikan_id_str || data.bentuk_pendidikan_is_str} icon={<GridIcon className="size-4 text-brand-500" />} />
                    <DetailRow label="Kepala Sekolah" value={principal} icon={<UserIcon className="size-4 text-brand-500" />} />
                    <DetailRow label="Email Instansi" value={data.email || "-"} icon={<Badge color="light" size="sm">@</Badge>} />
                    <DetailRow label="Website Sekolah" value={data.website || "-"} icon={<GridIcon className="size-4 text-brand-500" />} />
                </div>
            </ComponentCard>

            <ComponentCard title="Lokasi dan Kontak Kewilayahan">
                <div className="grid grid-cols-1 gap-8">
                    <DetailRow 
                        label="Alamat Korespondensi" 
                        value={alamat_korespondensi} 
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <DetailRow label="Kecamatan" value={data.kecamatan} />
                        <DetailRow label="Kabupaten/Kota" value={data.kabupaten_kota} />
                        <DetailRow label="Desa/Kelurahan" value={data.desa_kelurahan} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <DetailRow label="Nomor Telepon" value={data.nomor_telepon || "-"} />
                        <DetailRow label="Kode Wilayah" value={data.kode_wilayah || "-"} />
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Koordinat Lintang</span>
                            <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{data.lintang || "-"}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Koordinat Bujur</span>
                            <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{data.bujur || "-"}</span>
                        </div>
                    </div>
                </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                {icon}
                {label}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                {value || "-"}
            </span>
        </div>
    );
}
