import React, { createContext, useContext, useState } from 'react';
import { dapodikService } from '../services/dapodikService';
import { mandalaService } from '../services/mandalaService';
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

const cleanPersonName = (rawName: string): string => {
  if (!rawName) return '';
  let name = rawName.split(',')[0].trim();
  name = name.replace(/^(Dr\.|Drs\.|Dra\.|H\.|Hj\.|Ir\.|Prof\.)\s+/gi, '').trim();
  return name;
};

export const SekolahProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshSekolah = async () => {
    setLoading(true);
    try {
      const response = await dapodikService.getSekolah();
      let schoolData: any[] = [];

      if (response && (response.status === 'success' || response.success === true)) {
        schoolData = response.data || [];
      } else if (response && response.data) {
        schoolData = response.data;
      } else if (Array.isArray(response)) {
        schoolData = response;
      }

      let targetId = user?.instansi_id || (user as any)?.sekolah_id || (user as any)?.sekolahId;

      // 1. Jika targetId belum ada pada user, cari dari data GTK (Dapodik GTK)
      if (!targetId && user) {
        try {
          const rawName = (user as any).nama_lengkap || user.nama || '';
          const cleanedName = cleanPersonName(rawName);

          if (cleanedName) {
            const gtkRes = await dapodikService.getGTK(10, cleanedName, 1);
            const gtkList = gtkRes?.data || (Array.isArray(gtkRes) ? gtkRes : []);
            if (Array.isArray(gtkList) && gtkList.length > 0) {
              const matchedGtk = gtkList[0];
              targetId = matchedGtk?.identitas?.sekolah_id || matchedGtk?.sekolah_id;
            }
          }

          // Fallback 1b: search by first word of name if cleaned name returned no results
          if (!targetId && cleanedName) {
            const firstWord = cleanedName.split(' ')[0];
            if (firstWord && firstWord.length > 2) {
              const gtkResWord = await dapodikService.getGTK(10, firstWord, 1);
              const gtkListWord = gtkResWord?.data || (Array.isArray(gtkResWord) ? gtkResWord : []);
              if (Array.isArray(gtkListWord) && gtkListWord.length > 0) {
                const matchedGtk = gtkListWord[0];
                targetId = matchedGtk?.identitas?.sekolah_id || matchedGtk?.sekolah_id;
              }
            }
          }
        } catch (gtkErr) {
          console.error('Gagal pencarian sekolah_id via GTK:', gtkErr);
        }
      }

      // 2. Jika masih belum ada, cari dari mapping pengawas jika user adalah pengawas
      if (!targetId && user) {
        try {
          const mapRes = await mandalaService.getMappingPengawas();
          const mapList = mapRes?.data || (Array.isArray(mapRes) ? mapRes : []);
          if (Array.isArray(mapList)) {
            const userNip = user.nip || (user as any).nip;
            const myMap = mapList.find((m: any) => m.pegawai_id === user.id || (userNip && m.pegawai?.nip === userNip));
            if (myMap) {
              targetId = myMap.sekolah_id;
            }
          }
        } catch (mapErr) {
          console.error('Gagal pencarian sekolah_id via mapping pengawas:', mapErr);
        }
      }

      if (Array.isArray(schoolData) && schoolData.length > 0) {
        let matched = null;
        if (targetId) {
          matched = schoolData.find((s: any) => (s.sekolah_id || s.id) === targetId);
        }
        if (!matched && (user as any)?.sekolah) {
          const userSchoolStr = String((user as any).sekolah).toLowerCase();
          matched = schoolData.find((s: any) => s.nama && s.nama.toLowerCase().includes(userSchoolStr));
        }

        // Standard fallback ONLY for non-operators
        if (!matched && !user?.role?.toLowerCase().includes("operator")) {
          matched = schoolData[0];
        }

        if (matched) {
          setSekolah({
            sekolah_id: matched.sekolah_id || matched.id,
            nama: matched.nama,
            npsn: matched.npsn,
            logo: matched.logo ? getLogoUrl(matched.logo) : null
          });
        } else if (user?.role?.toLowerCase().includes("operator")) {
          // If operator has no matched school, DO NOT default to schoolData[0] (SMA IT Al-Asnawiyyah)!
          setSekolah({
            sekolah_id: targetId || "operator-sekolah",
            nama: (user as any)?.sekolah || "Sekolah Operator",
            npsn: "-",
            logo: null
          });
        } else {
          setSekolah(null);
        }
      } else if (schoolData && typeof schoolData === 'object' && !Array.isArray(schoolData)) {
        const single = schoolData as any;
        setSekolah({
            sekolah_id: single.sekolah_id || single.id,
            nama: single.nama,
            npsn: single.npsn,
            logo: single.logo ? getLogoUrl(single.logo) : null
        });
      } else {
        setSekolah(null);
      }
    } catch (error) {
      console.error('Gagal mengambil data sekolah di context:', error);
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
      // Only set loading to false if there is no token in storage (truly logged out)
      if (!localStorage.getItem('auth_token')) {
        setLoading(false);
      }
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
