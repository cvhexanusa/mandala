import React, { createContext, useContext, useState } from 'react';
import { dapodikService } from '../services/dapodikService';
import { getLogoUrl } from '../utils/image';
import { useAuth } from './AuthContext';

interface Sekolah {
  sekolah_id: string;
  nama: string;
  npsn: string;
  logo: string | null;
}

interface SekolahContextType {
  sekolah: Sekolah | null;
  loading: boolean;
  refreshSekolah: () => Promise<void>;
}

const SekolahContext = createContext<SekolahContextType | undefined>(undefined);

export const SekolahProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshSekolah = async () => {
    setLoading(true);
    try {
      const response = await dapodikService.getSekolah();
      let schoolData = null;

      if (response && (response.status === 'success' || response.success === true)) {
        schoolData = response.data;
      } else if (response && response.data) {
        schoolData = response.data;
      } else {
        schoolData = response;
      }

      // Jika data adalah array, ambil item pertama sebagai default
      if (Array.isArray(schoolData) && schoolData.length > 0) {
        const first = schoolData[0];
        setSekolah({
            sekolah_id: first.sekolah_id || first.id,
            nama: first.nama,
            npsn: first.npsn,
            logo: first.logo ? getLogoUrl(first.logo) : null
        });
      } else if (schoolData && typeof schoolData === 'object' && !Array.isArray(schoolData)) {
        setSekolah({
            sekolah_id: schoolData.sekolah_id || schoolData.id,
            nama: schoolData.nama,
            npsn: schoolData.npsn,
            logo: schoolData.logo ? getLogoUrl(schoolData.logo) : null
        });
      } else {
        // Fallback jika data kosong/tidak ada dari backend
        setSekolah({
            sekolah_id: "dummy-sekolah-id",
            nama: "Sekolah Simulasi (Demo)",
            npsn: "12345678",
            logo: null
        });
      }
    } catch (error) {
      console.error('Gagal mengambil data sekolah di context:', error);
      // Fallback jika API error/belum siap
      setSekolah({
          sekolah_id: "dummy-sekolah-id",
          nama: "Sekolah Simulasi (Demo)",
          npsn: "12345678",
          logo: null
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      refreshSekolah();
    } else {
      setSekolah(null);
      setLoading(false);
    }
  }, [user]);

  return (
    <SekolahContext.Provider value={{ sekolah, loading, refreshSekolah }}>
      {children}
    </SekolahContext.Provider>
  );
};

export const useSekolah = () => {
  const context = useContext(SekolahContext);
  if (context === undefined) {
    throw new Error('useSekolah must be used within a SekolahProvider');
  }
  return context;
};
