import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import { dapodikService } from "../services/dapodikService";
import { GTK } from "../data/gtkData";

// Define Pegawai interface if not already imported from elsewhere
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

export default function UserProfiles() {
  const [pegawaiData, setPegawaiData] = useState<Pegawai | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await dapodikService.getPegawai();
        if (response && response.data) {
          // Find Super Admin (jabatan 0)
          const superAdmin = response.data.find((p: Pegawai) => p.jabatan === 0);
          setPegawaiData(superAdmin || response.data[0]);
        }
      } catch (error) {
        console.error("Gagal memuat profil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  // Map Pegawai to a format compatible with our components or update components to accept Pegawai
  // For now, let's create a partial GTK-like object to maintain compatibility
  // but I'll update the components to be more flexible.
  
  return (
    <>
      <PageMeta
        title="Profil Saya | SIMAK"
        description="Halaman profil pengguna SIMAK"
      />
      <PageBreadcrumb pageTitle="Profil Saya" />
      <div className="space-y-6">
        <UserMetaCard pegawaiData={pegawaiData} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
           <UserInfoCard pegawaiData={pegawaiData} />
           <UserAddressCard pegawaiData={pegawaiData} />
        </div>
      </div>
    </>
  );
}
