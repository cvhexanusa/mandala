import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Button from "../../components/ui/button/Button";
import api from "../../services/api";
import Swal from "sweetalert2";

interface MenuItem {
  key: string;
  name: string;
  desc?: string;
  subItems?: MenuItem[];
}

const MENU_HIERARCHY: MenuItem[] = [
  { key: "dashboard", name: "Dashboard", desc: "Akses ke halaman dashboard utama" },
  { key: "profil-instansi", name: "Profil Instansi", desc: "Informasi profil dinas / cabang dinas" },
  {
    key: "kepegawaian",
    name: "Kepegawaian",
    desc: "Menu induk kelola data kepegawaian",
    subItems: [
      { key: "data-pegawai", name: "Data Pegawai", desc: "Kelola data pegawai" },
      { key: "tugas-pegawai", name: "Tugas Pegawai", desc: "Kelola penugasan/jabatan pegawai" },
      { key: "mapping-pengawas", name: "Mapping Pengawas Pembina", desc: "Pemetaan pengawas pembina sekolah" },
      { key: "pegawai-non-aktif", name: "Pegawai Non Aktif", desc: "Daftar pegawai yang sudah non-aktif" }
    ]
  },
  {
    key: "data-master",
    name: "Data Master",
    desc: "Menu induk data pokok pendidikan",
    subItems: [
      {
        key: "satuan-pendidikan",
        name: "Satuan Pendidikan",
        desc: "Kelola data sekolah",
        subItems: [
          { key: "satuan-pendidikan-data", name: "Data Satuan Pendidikan", desc: "Daftar sekolah aktif" },
          { key: "satuan-pendidikan-spasial", name: "Data Spasial", desc: "Peta lokasi koordinat sekolah" },
          { key: "satuan-pendidikan-rekapitulasi", name: "Rekapitulasi Sekolah", desc: "Rekap data sekolah" }
        ]
      },
      { key: "kepala-sekolah", name: "Kepala Sekolah", desc: "Daftar kepala sekolah aktif" },
      {
        key: "gtk",
        name: "GTK",
        desc: "Kelola data guru dan tenaga kependidikan",
        subItems: [
          { key: "gtk-guru", name: "Guru", desc: "Daftar guru aktif" },
          { key: "gtk-tendik", name: "Tendik", desc: "Daftar tenaga kependidikan aktif" },
          { key: "gtk-rekapitulasi", name: "Rekapitulasi GTK", desc: "Rekap data guru & tendik" },
          { key: "gtk-non-aktif", name: "GTK Non Aktif", desc: "Daftar GTK non-aktif" }
        ]
      },
      {
        key: "peserta-didik",
        name: "Peserta Didik",
        desc: "Kelola data siswa sekolah",
        subItems: [
          { key: "peserta-didik-data", name: "Peserta Didik", desc: "Daftar siswa aktif" },
          { key: "peserta-didik-rekapitulasi", name: "Rekapitulasi Siswa", desc: "Rekap data siswa" },
          { key: "peserta-didik-non-aktif", name: "PD Non Aktif", desc: "Daftar siswa keluar / lulus" }
        ]
      }
    ]
  },
  {
    key: "analitik-evaluasi",
    name: "Analisa & Evaluasi",
    desc: "Menu induk pelaporan analitik",
    subItems: [
      {
        key: "residu",
        name: "Residu",
        desc: "Visualisasi residu data dapodik",
        subItems: [
          { key: "residu-guru", name: "Guru", desc: "Residu data guru" },
          { key: "residu-tendik", name: "Tendik", desc: "Residu data tendik" },
          { key: "residu-peserta-didik", name: "Peserta Didik", desc: "Residu data siswa" }
        ]
      },
      {
        key: "pendidikan-gtk",
        name: "Pendidikan GTK",
        desc: "Kualifikasi pendidikan GTK",
        subItems: [
          { key: "pendidikan-gtk-guru", name: "Guru", desc: "Kualifikasi pendidikan guru" },
          { key: "pendidikan-gtk-tendik", name: "Tendik", desc: "Kualifikasi pendidikan tendik" }
        ]
      },
      {
        key: "laporan-presensi",
        name: "Laporan Presensi",
        desc: "Laporan kehadiran GTK & siswa",
        subItems: [
          { key: "laporan-presensi-gtk", name: "GTK", desc: "Kehadiran GTK" },
          { key: "laporan-presensi-peserta-didik", name: "Peserta Didik", desc: "Kehadiran siswa" },
          { key: "laporan-presensi-rekap-terpadu", name: "Rekap Terpadu", desc: "Rekap absen bulanan" }
        ]
      },
      { key: "pensiun", name: "Pensiun", desc: "Prakiraan masa pensiun GTK" },
      { key: "sertifikasi-guru", name: "Sertifikasi Guru", desc: "Daftar guru tersertifikasi" },
      { key: "sptjm-dapodik", name: "SPTJM Dapodik", desc: "Laporan SPTJM Dapodik dari sekolah" }
    ]
  },
  {
    key: "pkks",
    name: "PKKS",
    desc: "Penilaian Kinerja Kepala Sekolah",
    subItems: [
      { key: "pkks-instrumen", name: "Instrumen Penilaian", desc: "Kelola instrumen PKKS" },
      { key: "pkks-bank-soal", name: "Bank Soal PKKS", desc: "Kelola bank soal penilaian" }
    ]
  },
  {
    key: "layanan",
    name: "Layanan",
    desc: "Menu induk loket layanan kepegawaian",
    subItems: [
      { key: "layanan-gtk", name: "Layanan GTK", desc: "Daftar pengajuan mutasi/cuti guru" },
      { key: "layanan-peserta-didik", name: "Layanan Peserta Didik", desc: "Daftar pengajuan mutasi siswa" }
    ]
  },
  { key: "dokumen-layanan", name: "Dokumen Layanan", desc: "Arsip berkas SK / dokumen resmi" },
  {
    key: "administrasi-surat",
    name: "Administrasi Surat",
    desc: "Menu induk tata usaha surat menyurat",
    subItems: [
      { key: "administrasi-surat-masuk", name: "Surat Masuk", desc: "Agenda surat masuk" },
      { key: "administrasi-surat-keluar", name: "Surat Keluar", desc: "Agenda surat keluar" },
      { key: "administrasi-surat-template", name: "Template Surat", desc: "Daftar format draf surat" },
      { key: "administrasi-surat-pengaturan", name: "Pengaturan Penomoran", desc: "Konfigurasi nomor otomatis" }
    ]
  },
  { key: "daftar-antrian", name: "Daftar Antrian", desc: "Monitoring loket fisik antrian pelayanan" },
  { key: "pelaporan-dokumen", name: "Pelaporan dan Dokumen", desc: "Permintaan laporan dari instansi ke sekolah" },
  {
    key: "pengaturan",
    name: "Pengaturan",
    desc: "Menu induk konfigurasi sistem",
    subItems: [
      { key: "pengaturan-sistem", name: "Pengaturan Sistem", desc: "Nama aplikasi, logo, dan footer" },
      { key: "pengaturan-koneksi", name: "Koneksi Mandala", desc: "Integrasi API SIMAK Mandala" },
      { key: "pengaturan-hak-akses", name: "Pengaturan Hak Akses", desc: "Atur hak akses menu ini" }
    ]
  }
];

const JABATAN_LIST = [
  { id: 0, name: "Super admin", description: "Akses penuh sistem" },
  { id: 1, name: "Admin", description: "Administrator cabang dinas" },
  { id: 3, name: "Kepala Cabang Dinas", description: "Pimpinan cabang dinas" },
  { id: 4, name: "Kasubag", description: "Kepala sub bagian tata usaha" },
  { id: 5, name: "Staf", description: "Pelaksana dinas / operator cabang" },
  { id: 6, name: "Pengawas", description: "Pengawas pembina sekolah" },
  { id: 99, name: "Operator Sekolah", description: "Operator dapodik tingkat sekolah" }
];

export default function MenuRolesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedJabatanId, setSelectedJabatanId] = useState<number | string>(0);
  const [jenisJabatanList, setJenisJabatanList] = useState<{ jenis_jabatan_id: string; nama: string }[]>([]);

  const combinedRoles = React.useMemo(() => {
    const staticRoles = JABATAN_LIST.map(j => ({
      id: j.id,
      name: j.name,
      description: j.description,
      isDynamic: false
    }));
    const dynamicRoles = jenisJabatanList.map(j => ({
      id: j.jenis_jabatan_id,
      name: j.nama,
      description: "Jabatan Administratif Kustom",
      isDynamic: true
    }));
    return [...staticRoles, ...dynamicRoles];
  }, [jenisJabatanList]);
  
  // Matrix state: Record<jabatanId, Record<menuKey, boolean>>
  const [permissionMatrix, setPermissionMatrix] = useState<Record<number | string, Record<string, boolean>>>(() => {
    const initial: Record<number | string, Record<string, boolean>> = {};
    JABATAN_LIST.forEach(jabatan => {
      initial[jabatan.id] = {};
      const setFalseRecursive = (item: MenuItem) => {
        initial[jabatan.id][item.key] = false;
        if (item.subItems) {
          item.subItems.forEach(sub => setFalseRecursive(sub));
        }
      };
      MENU_HIERARCHY.forEach(menu => setFalseRecursive(menu));
    });
    return initial;
  });

  const loadMenuRoles = async () => {
    setLoading(true);
    try {
      const [menuRolesRes, jenisJabatanRes] = await Promise.all([
        api.get("/mandala/menu-roles"),
        api.get("/mandala/jenis-jabatan")
      ]);

      const activeJenisJabatan = jenisJabatanRes.data?.data || [];
      setJenisJabatanList(activeJenisJabatan);

      if (menuRolesRes.data?.status === "success" || menuRolesRes.data?.data) {
        const roles = menuRolesRes.data.data || [];
        
        // Reset matrix to false first
        const newMatrix: Record<number | string, Record<string, boolean>> = {};
        
        JABATAN_LIST.forEach(jabatan => {
          newMatrix[jabatan.id] = {};
          const setFalseRecursive = (item: MenuItem) => {
            newMatrix[jabatan.id][item.key] = false;
            if (item.subItems) {
              item.subItems.forEach(sub => setFalseRecursive(sub));
            }
          };
          MENU_HIERARCHY.forEach(menu => setFalseRecursive(menu));
        });

        activeJenisJabatan.forEach((jabatan: { jenis_jabatan_id: string }) => {
          newMatrix[jabatan.jenis_jabatan_id] = {};
          const setFalseRecursive = (item: MenuItem) => {
            newMatrix[jabatan.jenis_jabatan_id][item.key] = false;
            if (item.subItems) {
              item.subItems.forEach(sub => setFalseRecursive(sub));
            }
          };
          MENU_HIERARCHY.forEach(menu => setFalseRecursive(menu));
        });

        // Set true for active db mappings
        roles.forEach((item: { menu_key: string; jabatan_id?: number | null; jenis_jabatan_id?: string | null }) => {
          if (item.jenis_jabatan_id && newMatrix[item.jenis_jabatan_id]) {
            newMatrix[item.jenis_jabatan_id][item.menu_key] = true;
          } else if (item.jabatan_id !== undefined && item.jabatan_id !== null && newMatrix[item.jabatan_id]) {
            newMatrix[item.jabatan_id][item.menu_key] = true;
          }
        });

        setPermissionMatrix(newMatrix);
      }
    } catch (error) {
      console.error("Gagal mengambil konfigurasi menu roles:", error);
      Swal.fire("Gagal", "Gagal memuat konfigurasi hak akses menu.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuRoles();
  }, []);

  const findMenuItem = (items: MenuItem[], key: string): MenuItem | null => {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.subItems) {
        const found = findMenuItem(item.subItems, key);
        if (found) return found;
      }
    }
    return null;
  };

  const setPermissionRecursive = (
    item: MenuItem,
    matrixForRole: Record<string, boolean>,
    value: boolean
  ) => {
    matrixForRole[item.key] = value;
    if (item.subItems) {
      item.subItems.forEach(sub => {
        setPermissionRecursive(sub, matrixForRole, value);
      });
    }
  };

  const handleCheckboxChange = (menuKey: string, checked: boolean) => {
    setPermissionMatrix(prev => {
      const updatedMatrixForRole = { ...prev[selectedJabatanId] };
      const menuItem = findMenuItem(MENU_HIERARCHY, menuKey);
      
      if (menuItem) {
        setPermissionRecursive(menuItem, updatedMatrixForRole, checked);
      } else {
        updatedMatrixForRole[menuKey] = checked;
      }

      if (checked) {
        // If checking a child, make sure all its ancestors are checked
        const makeAncestorsActive = (items: MenuItem[], targetKey: string): boolean => {
          for (const item of items) {
            if (item.key === targetKey) {
              return true;
            }
            if (item.subItems) {
              const foundInChild = makeAncestorsActive(item.subItems, targetKey);
              if (foundInChild) {
                updatedMatrixForRole[item.key] = true;
                return true;
              }
            }
          }
          return false;
        };
        makeAncestorsActive(MENU_HIERARCHY, menuKey);
      } else {
        // If unchecking a child/parent, clean up parents if all their children are unchecked
        const cleanParentStates = (items: MenuItem[]) => {
          items.forEach(item => {
            if (item.subItems && item.subItems.length > 0) {
              cleanParentStates(item.subItems);
              const anyChildChecked = item.subItems.some(sub => updatedMatrixForRole[sub.key]);
              if (!anyChildChecked) {
                updatedMatrixForRole[item.key] = false;
              }
            }
          });
        };
        cleanParentStates(MENU_HIERARCHY);
      }

      return {
        ...prev,
        [selectedJabatanId]: updatedMatrixForRole
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setPermissionMatrix(prev => {
      const updatedMatrixForRole = { ...prev[selectedJabatanId] };
      const setValRecursive = (item: MenuItem) => {
        updatedMatrixForRole[item.key] = checked;
        if (item.subItems) {
          item.subItems.forEach(sub => setValRecursive(sub));
        }
      };
      MENU_HIERARCHY.forEach(menu => setValRecursive(menu));
      
      return {
        ...prev,
        [selectedJabatanId]: updatedMatrixForRole
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rolesToSave: Array<{ menu_key: string; jabatan_id?: number | null; jenis_jabatan_id?: string | null; jabatan_nama: string }> = [];
      
      Object.entries(permissionMatrix).forEach(([key, menuMap]) => {
        const isDynamic = key.includes('-');
        
        let jabId: number | null = null;
        let jenisJabId: string | null = null;
        let jabName = "";

        if (isDynamic) {
          jenisJabId = key;
          jabName = jenisJabatanList.find(j => j.jenis_jabatan_id === key)?.nama || "Jabatan Kustom";
        } else {
          jabId = parseInt(key);
          jabName = JABATAN_LIST.find(j => j.id === jabId)?.name || "Pegawai";
        }
        
        Object.entries(menuMap).forEach(([menuKey, isChecked]) => {
          if (isChecked) {
            rolesToSave.push({
              menu_key: menuKey,
              jabatan_id: jabId,
              jenis_jabatan_id: jenisJabId,
              jabatan_nama: jabName
            });
          }
        });
      });

      const response = await api.post("/mandala/menu-roles", { roles: rolesToSave });
      if (response.data?.status === "success") {
        Swal.fire("Berhasil", "Pengaturan hak akses menu berhasil disimpan.", "success");
        loadMenuRoles();
      } else {
        Swal.fire("Gagal", response.data?.message || "Gagal menyimpan konfigurasi", "error");
      }
    } catch (error: any) {
      console.error("Gagal menyimpan konfigurasi:", error);
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan saat menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const countCheckedMenus = (jabatanId: number | string) => {
    const menus = permissionMatrix[jabatanId] || {};
    return Object.values(menus).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  const selectedRole = combinedRoles.find(r => r.id === selectedJabatanId);
  const selectedJabatanName = selectedRole ? selectedRole.name : "";

  const renderMenuNode = (item: MenuItem, level: number = 0) => {
    const isChecked = permissionMatrix[selectedJabatanId]?.[item.key] || false;
    const hasChildren = !!item.subItems?.length;

    return (
      <div key={item.key} className="space-y-1">
        <div 
          className={`flex items-start gap-3.5 p-2.5 rounded-xl border border-transparent transition-all duration-200 ${
            level === 0 
              ? "bg-gray-50/50 dark:bg-white/[0.01] hover:bg-gray-100/50 dark:hover:bg-white/[0.02] border-gray-100 dark:border-white/5" 
              : level === 1
              ? "bg-transparent hover:bg-gray-50/40 dark:hover:bg-white/[0.005]"
              : "bg-transparent hover:bg-gray-50/20 dark:hover:bg-white/[0.002]"
          }`}
          style={{ marginLeft: `${level * 28}px` }}
        >
          <input
            type="checkbox"
            id={`chk-${item.key}`}
            checked={isChecked}
            onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer size-4.5"
          />
          <label htmlFor={`chk-${item.key}`} className="flex flex-col cursor-pointer min-w-0 flex-1">
            <span className={`text-xs font-semibold text-gray-800 dark:text-white/90 ${level === 0 ? "text-sm font-bold text-gray-900 dark:text-white" : ""}`}>
              {item.name}
            </span>
            {item.desc && (
              <span className="text-[10px] text-gray-400 font-normal mt-0.5 leading-tight">
                {item.desc}
              </span>
            )}
          </label>
        </div>
        {hasChildren && (
          <div className="space-y-1">
            {item.subItems!.map(sub => renderMenuNode(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="Pengaturan Hak Akses Menu | MANDALA"
        description="Atur hak akses menu berdasarkan jabatan pegawai dan operator"
      />
      <PageBreadcrumb pageTitle="Pengaturan Hak Akses Menu" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT: Jabatan Card */}
        <div className="lg:col-span-1">
          <ComponentCard
            title="Jabatan & Peran"
            desc="Pilih salah satu jabatan untuk mengatur menu."
          >
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {combinedRoles.map((jabatan) => {
                const isActive = selectedJabatanId === jabatan.id;
                const checkedCount = countCheckedMenus(jabatan.id);

                return (
                  <button
                    key={jabatan.id}
                    onClick={() => setSelectedJabatanId(jabatan.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                      isActive
                        ? "bg-brand-50/70 border-brand-500 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 shadow-sm"
                        : "bg-white border-gray-200 hover:bg-gray-50/50 dark:bg-white/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-800 dark:text-white truncate">
                        {jabatan.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal truncate mt-0.5">
                        {jabatan.description}
                      </span>
                    </div>
                    {checkedCount > 0 ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive 
                          ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                          : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                      }`}>
                        {checkedCount} Menu
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400">
                        Kosong
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </ComponentCard>
        </div>

        {/* RIGHT: Menu Permission Tree Card */}
        <div className="lg:col-span-3">
          <ComponentCard
            title={`Menu Akses: ${selectedJabatanName}`}
            desc="Konfigurasi izin menu navigasi. Pilihan sub-menu otomatis mengaktifkan menu induk."
            action={
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSelectAll(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Pilih Semua
                </Button>
                <Button
                  onClick={() => handleSelectAll(false)}
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-650"
                >
                  Hapus Semua
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  loading={saving}
                  variant="primary"
                  size="sm"
                >
                  Simpan Perubahan
                </Button>
              </div>
            }
          >
            <div className="border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden bg-white dark:bg-transparent">
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {MENU_HIERARCHY.map(menu => renderMenuNode(menu))}
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-4">
              <p className="text-[11px] text-gray-400 italic">
                * Konfigurasi di atas disimpan ke database saat Anda menekan tombol "Simpan Perubahan".
              </p>
              <Button
                onClick={handleSave}
                disabled={saving}
                loading={saving}
                variant="primary"
              >
                Simpan Perubahan
              </Button>
            </div>
          </ComponentCard>
        </div>

      </div>
    </>
  );
}
