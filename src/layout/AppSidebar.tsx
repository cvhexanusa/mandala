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

type NavItem = {
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
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <SchoolIcon />,
    name: "Profil Instansi",
    path: "/profil-instansi",
  },
  {
    name: "Kepegawaian",
    icon: <GroupIcon />,
    subItems: [
      {
        name: "Data Pegawai",
        path: "/kepegawaian/data-pegawai",
        icon: <DotIcon />,
      },
      {
        name: "Tugas Pegawai",
        path: "/kepegawaian/tugas-pegawai",
        icon: <DotIcon />,
      },
      {
        name: "Mapping Pengawas Pembina",
        path: "/kepegawaian/mapping-pengawas",
        icon: <DotIcon />,
      },
      {
        name: "Pegawai Non Aktif",
        path: "/kepegawaian/pegawai-non-aktif",
        icon: <DotIcon />,
        color: "text-red-500 dark:text-red-400",
      },
    ],
  },
  {
    name: "Data Master",
    icon: <BoxIcon />,
    subItems: [
      {
        name: "Satuan Pendidikan",
        icon: <DotIcon />,
        subItems: [
          {
            name: "Data Satuan Pendidikan",
            path: "/satuan-pendidikan/data",
            icon: <DotIcon />,
          },
          {
            name: "Data Spasial",
            path: "/satuan-pendidikan/spasial",
            icon: <DotIcon />,
          },
          {
            name: "Rekapitulasi Sekolah",
            path: "/satuan-pendidikan/rekapitulasi",
            icon: <DotIcon />,
          },
        ],
      },
      {
        name: "Kepala Sekolah",
        path: "/kepala-sekolah",
        icon: <DotIcon />,
      },
      {
        name: "GTK",
        icon: <DotIcon />,
        subItems: [
          {
            name: "Guru",
            path: "/gtk/guru?tab=guru",
            icon: <DotIcon />,
          },
          {
            name: "Tendik",
            path: "/gtk/tendik?tab=tendik",
            icon: <DotIcon />,
          },
          {
            name: "Rekapitulasi GTK",
            path: "/gtk/rekapitulasi?tab=rekap",
            icon: <DotIcon />,
          },
          {
            name: "GTK Non Aktif",
            path: "/gtk/non-aktif?tab=nonaktif",
            icon: <DotIcon />,
            color: "text-red-500 dark:text-red-400",
          },
        ],
      },
      {
        name: "Peserta Didik",
        icon: <DotIcon />,
        subItems: [
          {
            name: "Peserta Didik",
            path: "/peserta-didik/data?tab=aktif",
            icon: <DotIcon />,
          },
          {
            name: "Rekapitulasi Siswa",
            path: "/peserta-didik/rekapitulasi?tab=rekap",
            icon: <DotIcon />,
          },
          {
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
    name: "Analitik & Evaluasi",
    icon: <PieChartIcon />,
    subItems: [
      {
        name: "Residu",
        icon: <DotIcon />,
        subItems: [
          {
            name: "Guru",
            path: "/analisa/residu/guru",
            icon: <DotIcon />,
          },
          {
            name: "Tendik",
            path: "/analisa/residu/tendik",
            icon: <DotIcon />,
          },
          {
            name: "Peserta Didik",
            path: "/analisa/residu/peserta-didik",
            icon: <DotIcon />,
          },
        ],
      },
      {
        name: "Pendidikan GTK",
        icon: <DotIcon />,
        subItems: [
          {
            name: "Guru",
            path: "/analisa/pendidikan-gtk/guru",
            icon: <DotIcon />,
          },
          {
            name: "Tendik",
            path: "/analisa/pendidikan-gtk/tendik",
            icon: <DotIcon />,
          },
        ],
      },
      {
        name: "Laporan Presensi",
        icon: <DotIcon />,
        subItems: [
          {
            name: "GTK",
            path: "/laporan-absensi/gtk",
            icon: <DotIcon />,
          },
          {
            name: "Peserta Didik",
            path: "/laporan-absensi/peserta-didik",
            icon: <DotIcon />,
          },
          {
            name: "Rekap Terpadu",
            path: "/laporan-absensi/rekap-terpadu",
            icon: <DotIcon />,
          },
        ],
      },
      {
        name: "Pensiun",
        path: "/analisa/pensiun",
        icon: <DotIcon />,
      },
      {
        name: "Sertifikasi Guru",
        path: "/analisa/sertifikasi",
        icon: <DotIcon />,
      },
      {
        name: "SPTJM Dapodik",
        path: "/analisa/sptjm-dapodik",
        icon: <DotIcon />,
      },
    ],
  },
  {
    name: "PKKS",
    icon: <TaskIcon />,
    subItems: [
      {
        name: "Instrumen Penilaian",
        path: "/pkks/instrumen",
        icon: <DotIcon />,
      },
      {
        name: "Bank Soal PKKS",
        path: "/pkks/bank-soal",
        icon: <DotIcon />,
      },
    ],
  },
  {
    name: "Layanan",
    icon: <PlugInIcon />,
    subItems: [
      {
        name: "Layanan GTK",
        path: "/layanan/gtk",
        icon: <DotIcon />,
      },
      {
        name: "Layanan Peserta Didik",
        path: "/layanan/peserta-didik",
        icon: <DotIcon />,
      },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "Dokumen Layanan",
    path: "/dokumen-layanan",
  },
  {
    name: "Administrasi Surat",
    icon: <MailIcon />,
    subItems: [
      {
        name: "Surat Masuk",
        path: "/administrasi-surat/masuk",
        icon: <DotIcon />,
      },
      {
        name: "Surat Keluar",
        path: "/administrasi-surat/keluar",
        icon: <DotIcon />,
      },
      {
        name: "Template Surat",
        path: "/administrasi-surat/template",
        icon: <DotIcon />,
      },
      {
        name: "Pengaturan Penomoran",
        path: "/administrasi-surat/pengaturan",
        icon: <DotIcon />,
      },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Daftar Antrian",
    path: "/daftar-antrian",
  },
  {
    icon: <PieChartIcon />,
    name: "Pelaporan dan Dokumen",
    path: "/pelaporan-dokumen",
  },
  {
    name: "Pengaturan",
    icon: <PlugInIcon />,
    subItems: [
      {
        name: "Pengaturan Sistem",
        path: "/pengaturan/sistem",
        icon: <UserCircleIcon />,
      },
      {
        name: "Koneksi Mandala",
        path: "/sync-api",
        icon: <BoltIcon />,
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

  const rolePrefix = user ? `/${getRoleSlug(user.role)}` : "";

  // Helper to prepend role prefix to path
  const getFullPath = (path?: string) => {
    if (!path || path === "/" || path.startsWith("/signin") || path.startsWith("/signup")) return path;
    if (path.startsWith(rolePrefix)) return path;
    return `${rolePrefix}${path}`;
  };

  const filteredNavItems = sekolah 
    ? navItems 
    : navItems.filter(item => item.name === "Dashboard" || item.name === "Pengaturan");

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
                  {settings?.appShortName ? settings.appShortName.charAt(0).toUpperCase() : "M"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white text-xl leading-tight uppercase truncate max-w-[150px]" title={settings?.appName || "MANDALA"}>
                  {settings?.appShortName || "MANDALA"}
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
                {settings?.appShortName ? settings.appShortName.charAt(0).toUpperCase() : "M"}
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
