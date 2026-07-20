import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BoxIcon,
  CalenderIcon,
  ChevronDownIcon,
  DocsIcon,
  DotIcon,
  GridIcon,
  HorizontaLDots,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
  BoltIcon,
  SchoolIcon,
  GroupIcon,
  TaskIcon,
  UserIcon,
  MailIcon,
  ListIcon,
  PieChartIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";
import { useSekolah } from "../context/SekolahContext";
import { useAuth } from "../context/AuthContext";
import { getRoleSlug } from "../services/roleUtils";
import { useSystemSettings } from "../context/SystemSettingsContext";
import api from "../services/api";

type NavItem = {
  key?: string;
  name: string;
  icon: React.ReactNode;
  path?: string;
  color?: string;
  subItems?: NavItem[];
  pro?: boolean;
  new?: boolean;
};

const navItems: NavItem[] = [
  {
    key: "dashboard",
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    key: "profil-instansi",
    icon: <SchoolIcon />,
    name: "Profil Instansi",
    path: "/profil-instansi",
  },
  {
    key: "kepegawaian",
    name: "Kepegawaian",
    icon: <GroupIcon />,
    subItems: [
      {
        key: "data-pegawai",
        name: "Data Pegawai",
        path: "/kepegawaian/data-pegawai",
        icon: <DotIcon />,
      },
      {
        key: "tugas-pegawai",
        name: "Tugas Pegawai",
        path: "/kepegawaian/tugas-pegawai",
        icon: <DotIcon />,
      },
      {
        key: "mapping-pengawas",
        name: "Mapping Pengawas Pembina",
        path: "/kepegawaian/mapping-pengawas",
        icon: <DotIcon />,
      },
      {
        key: "pegawai-non-aktif",
        name: "Pegawai Non Aktif",
        path: "/kepegawaian/pegawai-non-aktif",
        icon: <DotIcon />,
        color: "text-red-500 dark:text-red-400",
      },
    ],
  },
  {
    key: "data-master",
    name: "Data Master",
    icon: <BoxIcon />,
    subItems: [
      {
        key: "satuan-pendidikan",
        name: "Satuan Pendidikan",
        icon: <DotIcon />,
        subItems: [
          {
            key: "satuan-pendidikan-data",
            name: "Data Satuan Pendidikan",
            path: "/satuan-pendidikan/data",
            icon: <DotIcon />,
          },
          {
            key: "satuan-pendidikan-spasial",
            name: "Data Spasial",
            path: "/satuan-pendidikan/spasial",
            icon: <DotIcon />,
          },
          {
            key: "satuan-pendidikan-rekapitulasi",
            name: "Rekapitulasi Sekolah",
            path: "/satuan-pendidikan/rekapitulasi",
            icon: <DotIcon />,
          },
        ],
      },
      {
        key: "kepala-sekolah",
        name: "Kepala Sekolah",
        path: "/kepala-sekolah",
        icon: <DotIcon />,
      },
      {
        key: "gtk",
        name: "GTK",
        icon: <DotIcon />,
        subItems: [
          {
            key: "gtk-guru",
            name: "Guru",
            path: "/gtk/guru?tab=guru",
            icon: <DotIcon />,
          },
          {
            key: "gtk-tendik",
            name: "Tendik",
            path: "/gtk/tendik?tab=tendik",
            icon: <DotIcon />,
          },
          {
            key: "gtk-rekapitulasi",
            name: "Rekapitulasi GTK",
            path: "/gtk/rekapitulasi?tab=rekap",
            icon: <DotIcon />,
          },
          {
            key: "gtk-non-aktif",
            name: "GTK Non Aktif",
            path: "/gtk/non-aktif?tab=nonaktif",
            icon: <DotIcon />,
            color: "text-red-500 dark:text-red-400",
          },
        ],
      },
      {
        key: "peserta-didik",
        name: "Peserta Didik",
        icon: <DotIcon />,
        subItems: [
          {
            key: "peserta-didik-data",
            name: "Peserta Didik",
            path: "/peserta-didik/data?tab=aktif",
            icon: <DotIcon />,
          },
          {
            key: "peserta-didik-rekapitulasi",
            name: "Rekapitulasi Siswa",
            path: "/peserta-didik/rekapitulasi?tab=rekap",
            icon: <DotIcon />,
          },
          {
            key: "peserta-didik-non-aktif",
            name: "PD Non Aktif",
            path: "/peserta-didik/non-aktif?tab=keluar",
            icon: <DotIcon />,
            color: "text-red-500 dark:text-red-400",
          },
        ],
      },
    ],
  },
  {
    key: "analitik-evaluasi",
    name: "Analitik & Evaluasi",
    icon: <PieChartIcon />,
    subItems: [
      {
        key: "residu",
        name: "Residu",
        icon: <DotIcon />,
        subItems: [
          {
            key: "residu-guru",
            name: "Guru",
            path: "/analisa/residu/guru",
            icon: <DotIcon />,
          },
          {
            key: "residu-tendik",
            name: "Tendik",
            path: "/analisa/residu/tendik",
            icon: <DotIcon />,
          },
          {
            key: "residu-peserta-didik",
            name: "Peserta Didik",
            path: "/analisa/residu/peserta-didik",
            icon: <DotIcon />,
          },
        ],
      },
      {
        key: "pendidikan-gtk",
        name: "Pendidikan GTK",
        icon: <DotIcon />,
        subItems: [
          {
            key: "pendidikan-gtk-guru",
            name: "Guru",
            path: "/analisa/pendidikan-gtk/guru",
            icon: <DotIcon />,
          },
          {
            key: "pendidikan-gtk-tendik",
            name: "Tendik",
            path: "/analisa/pendidikan-gtk/tendik",
            icon: <DotIcon />,
          },
        ],
      },
      {
        key: "laporan-presensi",
        name: "Laporan Presensi",
        icon: <DotIcon />,
        subItems: [
          {
            key: "laporan-presensi-gtk",
            name: "GTK",
            path: "/laporan-absensi/gtk",
            icon: <DotIcon />,
          },
          {
            key: "laporan-presensi-peserta-didik",
            name: "Peserta Didik",
            path: "/laporan-absensi/peserta-didik",
            icon: <DotIcon />,
          },
          {
            key: "laporan-presensi-rekap-terpadu",
            name: "Rekap Terpadu",
            path: "/laporan-absensi/rekap-terpadu",
            icon: <DotIcon />,
          },
        ],
      },
      {
        key: "pensiun",
        name: "Pensiun",
        path: "/analisa/pensiun",
        icon: <DotIcon />,
      },
      {
        key: "sertifikasi-guru",
        name: "Sertifikasi Guru",
        path: "/analisa/sertifikasi",
        icon: <DotIcon />,
      },
      {
        key: "sptjm-dapodik",
        name: "SPTJM Dapodik",
        path: "/analisa/sptjm-dapodik",
        icon: <DotIcon />,
      },
    ],
  },
  {
    key: "monitoring",
    name: "Monitoring",
    icon: <CalenderIcon />,
    subItems: [
      {
        key: "monitoring-jadwal",
        name: "Jadwal Monitoring",
        path: "/monitoring/jadwal",
        icon: <DotIcon />,
      },
    ],
  },
  {
    key: "pkks",
    name: "PKKS",
    icon: <TaskIcon />,
    subItems: [
      {
        key: "pkks-instrumen",
        name: "Instrumen Penilaian",
        path: "/pkks/instrumen",
        icon: <DotIcon />,
      },
      {
        key: "pkks-bank-soal",
        name: "Bank Soal PKKS",
        path: "/pkks/bank-soal",
        icon: <DotIcon />,
      },
    ],
  },
  {
    key: "layanan",
    name: "Layanan",
    icon: <PlugInIcon />,
    subItems: [
      {
        key: "layanan-gtk",
        name: "Layanan GTK",
        path: "/layanan/gtk",
        icon: <DotIcon />,
      },
      {
        key: "layanan-peserta-didik",
        name: "Layanan Peserta Didik",
        path: "/layanan/peserta-didik",
        icon: <DotIcon />,
      },
    ],
  },
  {
    key: "dokumen-layanan",
    icon: <DocsIcon />,
    name: "Dokumen Layanan",
    path: "/dokumen-layanan",
  },
  {
    key: "administrasi-surat",
    name: "Administrasi Surat",
    icon: <MailIcon />,
    subItems: [
      {
        key: "administrasi-surat-masuk",
        name: "Surat Masuk",
        path: "/administrasi-surat/masuk",
        icon: <DotIcon />,
      },
      {
        key: "administrasi-surat-keluar",
        name: "Surat Keluar",
        path: "/administrasi-surat/keluar",
        icon: <DotIcon />,
      },
      {
        key: "administrasi-surat-template",
        name: "Template Surat",
        path: "/administrasi-surat/template",
        icon: <DotIcon />,
      },
      {
        key: "administrasi-surat-pengaturan",
        name: "Pengaturan Penomoran",
        path: "/administrasi-surat/pengaturan",
        icon: <DotIcon />,
      },
    ],
  },
  {
    key: "daftar-antrian",
    icon: <ListIcon />,
    name: "Daftar Antrian",
    path: "/daftar-antrian",
  },
  {
    key: "pelaporan-dokumen",
    icon: <PieChartIcon />,
    name: "Pelaporan dan Dokumen",
    path: "/pelaporan-dokumen",
  },
  {
    key: "pengaturan",
    name: "Pengaturan",
    icon: <PlugInIcon />,
    subItems: [
      {
        key: "pengaturan-sistem",
        name: "Pengaturan Sistem",
        path: "/pengaturan/sistem",
        icon: <UserCircleIcon />,
      },
      {
        key: "pengaturan-koneksi",
        name: "Koneksi Mandala",
        path: "/sync-api",
        icon: <BoltIcon />,
      },
      {
        key: "pengaturan-hak-akses",
        name: "Pengaturan Hak Akses",
        path: "/pengaturan/menu",
        icon: <DocsIcon />,
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { sekolah } = useSekolah();
  const { user } = useAuth();
  const { settings, getStorageUrl } = useSystemSettings();
  const location = useLocation();

  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [hasConfigs, setHasConfigs] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await api.get("/mandala/menu-roles");
        if (response.data?.status === "success" || response.data?.data) {
          const roles = response.data.data || [];
          setHasConfigs(roles.length > 0);
          
          const isOperator = user?.role?.toLowerCase().includes("operator");
          const userJabatanId = isOperator ? 99 : (user as any)?.jabatan ?? 5;
          const userJenisJabatanId = (user as any)?.jenis_jabatan_id;

          const keys = roles
            .filter((r: { jabatan_id?: number | null; jenis_jabatan_id?: string | null; menu_key: string }) => {
              if (userJenisJabatanId && r.jenis_jabatan_id === userJenisJabatanId) return true;
              return r.jabatan_id === userJabatanId;
            })
            .map((r: { menu_key: string }) => r.menu_key);

          setAllowedKeys(keys);
        }
      } catch (err) {
        console.error("Gagal mengambil hak akses menu:", err);
      }
    };
    
    if (user) {
      fetchPermissions();
    }
  }, [user]);

  const rolePrefix = user ? `/${getRoleSlug(user.role)}` : "";

  // Helper to prepend role prefix to path
  const getFullPath = (path?: string) => {
    if (!path || path === "/" || path.startsWith("/signin") || path.startsWith("/signup")) return path;
    if (path.startsWith(rolePrefix)) return path;
    return `${rolePrefix}${path}`;
  };

  const isOperator = user?.role?.toLowerCase().includes("operator");

  const getFilteredNavItems = () => {
    if (!sekolah) {
      return navItems.filter(item => item.name === "Dashboard" || item.name === "Pengaturan");
    }

    let items = navItems;

    if (hasConfigs) {
      const filterMenuItems = (menuList: NavItem[]): NavItem[] => {
        return menuList
          .filter(item => {
            if (!item.key) return true;
            return allowedKeys.includes(item.key);
          })
          .map(item => {
            if (item.subItems) {
              return {
                ...item,
                subItems: filterMenuItems(item.subItems)
              };
            }
            return item;
          })
          .filter(item => {
            if (item.subItems && item.subItems.length === 0) {
              return false;
            }
            return true;
          });
      };
      items = filterMenuItems(navItems);
    } else if (isOperator) {
      // Default fallback operator filter if no db configuration is present
      return navItems
        .filter(item => ["Dashboard", "Profil Instansi", "Data Master", "Pelaporan dan Dokumen"].includes(item.name))
        .map(item => {
          if (item.name === "Data Master") {
            const filteredSub = (item.subItems || [])
              .filter(sub => ["GTK", "Peserta Didik"].includes(sub.name))
              .map(sub => {
                if (sub.name === "GTK") {
                  return {
                    ...sub,
                    subItems: (sub.subItems || []).filter(s => s.name !== "Rekapitulasi GTK")
                  };
                }
                if (sub.name === "Peserta Didik") {
                  return {
                    ...sub,
                    subItems: (sub.subItems || []).filter(s => s.name !== "Rekapitulasi Siswa")
                  };
                }
                return sub;
              });
            return {
              ...item,
              subItems: filteredSub
            };
          }
          return item;
        });
    }

    return items;
  };

  const filteredNavItems = getFilteredNavItems();

  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => {
      const fullPath = getFullPath(path);
      const currentFullPath = location.pathname + location.search;
      return currentFullPath === fullPath || location.pathname === fullPath;
    },
    [location.pathname, location.search, rolePrefix]
  );

  const isSubItemActive = useCallback(
    (item: NavItem): boolean => {
      if (item.path && isActive(item.path)) return true;
      if (item.subItems) {
        return item.subItems.some((sub) => isSubItemActive(sub));
      }
      return false;
    },
    [isActive]
  );

  useEffect(() => {
    const findActiveMenus = (items: NavItem[], prefix: string): string[] => {
      for (const item of items) {
        const key = `${prefix}-${item.name}`;
        if (item.subItems) {
          if (isSubItemActive(item)) {
            return [key, ...findActiveMenus(item.subItems, key)];
          }
        }
      }
      return [];
    };

    const activeMain = findActiveMenus(navItems, "main");
    setOpenSubmenus(activeMain);
  }, [location, isSubItemActive]);

  const toggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderMenuItems = (
    items: NavItem[],
    prefix: string,
    level: number = 0
  ) => (
    <ul className={`flex flex-col gap-1 ${level > 0 ? "mt-2 ml-4" : "gap-4"}`}>
      {items.map((nav) => {
        const key = `${prefix}-${nav.name}`;
        const isOpen = openSubmenus.includes(key);
        const hasSubItems = !!nav.subItems?.length;
        const active = isSubItemActive(nav);

        return (
          <li key={nav.name}>
            {hasSubItems ? (
              <>
                <button
                  onClick={() => toggleSubmenu(key)}
                  className={`menu-item group w-full ${
                    active ? "menu-item-active" : "menu-item-inactive"
                  } cursor-pointer ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                  } ${level > 0 ? "pl-4" : ""}`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                    } ${nav.color || ""}`}
                  >
                    {React.cloneElement(nav.icon as React.ReactElement<any>, {
                      className: level > 0 ? "w-4 h-4" : "w-6 h-6",
                    })}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`menu-item-text ${nav.color || ""}`}>
                      {nav.name}
                    </span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <ChevronDownIcon
                      className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      } ${active ? "text-brand-500" : ""}`}
                    />
                  )}
                </button>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div
                    ref={(el) => {
                      subMenuRefs.current[key] = el;
                    }}
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-[1000px]" : "max-h-0"
                    }`}
                  >
                    {renderMenuItems(nav.subItems!, key, level + 1)}
                  </div>
                )}
              </>
            ) : (
              nav.path && (
                <Link
                  to={getFullPath(nav.path) || ""}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  } ${
                    level > 0 ? "pl-4" : ""
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    } ${nav.color || ""}`}
                  >
                    {React.cloneElement(nav.icon as React.ReactElement<any>, {
                      className: level > 0 ? "w-4 h-4" : "w-6 h-6",
                    })}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`menu-item-text ${nav.color || ""}`}>
                      {nav.name}
                    </span>
                  )}
                  {nav.new && (
                    <span className="ml-auto menu-dropdown-badge">new</span>
                  )}
                  {nav.pro && (
                    <span className="ml-auto menu-dropdown-badge">pro</span>
                  )}
                </Link>
              )
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex items-center ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to={rolePrefix || "/"} className="flex items-center gap-3">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              {settings?.appLogo ? (
                <img 
                  src={getStorageUrl(settings.appLogo)} 
                  alt="App Logo" 
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  {settings?.appShortName ? settings.appShortName.charAt(0).toUpperCase() : "S"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white text-xl leading-tight uppercase truncate max-w-[150px]" title={settings?.appName || "SAPA VI"}>
                  {settings?.appShortName || "SAPA VI"}
                </span>
              </div>
            </>
          ) : (
            settings?.appLogo ? (
              <img 
                src={getStorageUrl(settings.appLogo)} 
                alt="App Logo" 
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {settings?.appShortName ? settings.appShortName.charAt(0).toUpperCase() : "S"}
              </div>
            )
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration- duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(filteredNavItems, "main")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
