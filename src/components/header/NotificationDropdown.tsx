import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import { mandalaService } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { Modal } from "../ui/modal";

interface NotificationItem {
  id: string;
  type: "document" | "sync";
  title: string;
  message: string;
  target: string;
  time: string;
  dotColor: string;
  pelaporanId?: string;
  sekolahId?: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const rolePath = user ? `/${getRoleSlug(user.role)}` : "/";

  const isNotificationRead = (id: string) => {
    try {
      const readNotifs = JSON.parse(localStorage.getItem("read_notifications") || "[]");
      return readNotifs.some((n: any) => n.id === id);
    } catch {
      return false;
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let cadisdikId = user?.cadisdik_id;
      let matchedCadisdikName = (user as any)?.cadisdik;

      // 1. Dapatkan daftar Cabang Dinas untuk pencarian fallback
      let instansiList = [];
      try {
        const instansiRes = await dapodikService.getCadisdik();
        if (instansiRes?.status === "success" || instansiRes?.success === true || Array.isArray(instansiRes)) {
          instansiList = instansiRes.data || instansiRes || [];
        } else if (instansiRes?.data) {
          instansiList = instansiRes.data;
        }
      } catch (err) {
        console.warn("Failed to fetch cadisdik list", err);
      }

      if (!cadisdikId && matchedCadisdikName && instansiList.length > 0) {
        const matched = instansiList.find(
          (i: any) => i.nama_instansi?.toLowerCase() === matchedCadisdikName.toLowerCase()
        );
        if (matched) {
          cadisdikId = matched.cadisdik_id;
        }
      }

      if (!cadisdikId && instansiList.length > 0) {
        cadisdikId = instansiList[0].cadisdik_id;
      }

      if (!cadisdikId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // 2. Tarik daftar Pelaporan Dokumen
      let pelaporanList: any[] = [];
      try {
        const pelaporanRes = await mandalaService.getPelaporan(cadisdikId, 1, 5);
        if (pelaporanRes?.status === "success" || pelaporanRes?.success === true) {
          pelaporanList = pelaporanRes.data || [];
        } else if (Array.isArray(pelaporanRes)) {
          pelaporanList = pelaporanRes;
        }
      } catch (err) {
        console.warn("Failed to fetch pelaporan list", err);
      }

      // 3. Tarik detail pelaporan untuk mengetahui sekolah yang sudah kirim dokumen
      const documentNotifs: NotificationItem[] = [];
      const detailPromises = pelaporanList.map(async (report) => {
        try {
          const detailRes = await mandalaService.getPelaporanDetail(report.pelaporan_id, cadisdikId!);
          const detailData = detailRes?.data || detailRes;
          if (detailData?.daftar_sekolah) {
            detailData.daftar_sekolah.forEach((school: any) => {
              if (school.jumlah_dokumen > 0) {
                documentNotifs.push({
                  id: `doc-${school.pelaporan_sekolah_id}`,
                  type: "document",
                  title: school.nama_sekolah,
                  message: `mengumpulkan ${school.jumlah_dokumen} dokumen untuk`,
                  target: report.judul,
                  time: "Baru saja",
                  dotColor: "bg-success-500",
                  pelaporanId: report.pelaporan_id,
                  sekolahId: school.sekolah_id,
                });
              }
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch detail for report ${report.pelaporan_id}`, err);
        }
      });

      await Promise.all(detailPromises);

      // 4. Tarik data sekolah untuk simulasi Notifikasi Sinkronisasi Dapodik
      const syncNotifs: NotificationItem[] = [];
      try {
        const schoolRes = await dapodikService.getSekolah();
        let schools: any[] = [];
        if (schoolRes?.status === "success" || schoolRes?.success === true) {
          schools = schoolRes.data || [];
        } else if (Array.isArray(schoolRes)) {
          schools = schoolRes;
        } else if (schoolRes?.data) {
          schools = schoolRes.data;
        }

        if (schools.length > 0) {
          const shuffled = [...schools].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 2);
          const times = ["15 menit yang lalu", "1 jam yang lalu"];
          selected.forEach((sch, idx) => {
            syncNotifs.push({
              id: `sync-${sch.sekolah_id || sch.id}-${idx}`,
              type: "sync",
              title: sch.nama,
              message: "melakukan sinkronisasi data Dapodik",
              target: "Sistem Pusat",
              time: times[idx],
              dotColor: "bg-brand-500",
            });
          });
        }
      } catch (err) {
        console.warn("Failed to fetch schools for sync simulation", err);
      }

      const combined = [...documentNotifs, ...syncNotifs];

      // Filter yang didelete/hidden oleh user
      let hiddenNotifs: string[] = [];
      try {
        hiddenNotifs = JSON.parse(localStorage.getItem("hidden_notifications") || "[]");
      } catch {
        hiddenNotifs = [];
      }
      const activeNotifs = combined.filter((n) => !hiddenNotifs.includes(n.id));

      // Bersihkan read_notifications yang umurnya lebih dari 24 jam (1 hari)
      let readNotifs: { id: string; readAt: string }[] = [];
      try {
        readNotifs = JSON.parse(localStorage.getItem("read_notifications") || "[]");
      } catch {
        readNotifs = [];
      }

      const now = new Date();
      const validReadNotifs = readNotifs.filter((item) => {
        try {
          const readDate = new Date(item.readAt);
          const diffHours = (now.getTime() - readDate.getTime()) / (1000 * 60 * 60);
          return diffHours < 24; // Simpan jika kurang dari 24 jam
        } catch {
          return false;
        }
      });
      localStorage.setItem("read_notifications", JSON.stringify(validReadNotifs));

      setNotifications(activeNotifs);

      const unreadCount = activeNotifs.filter(
        (n) => !validReadNotifs.some((r) => r.id === n.id)
      ).length;
      setNotifying(unreadCount > 0);

    } catch (error) {
      console.error("Failed to build notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  const handleItemClick = (item: NotificationItem) => {
    try {
      const readNotifs = JSON.parse(localStorage.getItem("read_notifications") || "[]");
      if (!readNotifs.some((n: any) => n.id === item.id)) {
        const updated = [...readNotifs, { id: item.id, readAt: new Date().toISOString() }];
        localStorage.setItem("read_notifications", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to save read state", e);
    }

    closeDropdown();
    setSelectedNotification(item);
  };

  const handleHistoryItemClick = (item: NotificationItem) => {
    try {
      const readNotifs = JSON.parse(localStorage.getItem("read_notifications") || "[]");
      if (!readNotifs.some((n: any) => n.id === item.id)) {
        const updated = [...readNotifs, { id: item.id, readAt: new Date().toISOString() }];
        localStorage.setItem("read_notifications", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to save read state", e);
    }

    setSelectedNotification(item);
  };

  const handleMarkAllAsRead = () => {
    try {
      const nowStr = new Date().toISOString();
      const updated = notifications.map((n) => ({ id: n.id, readAt: nowStr }));
      localStorage.setItem("read_notifications", JSON.stringify(updated));
      setNotifying(false);
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const handleClearAll = () => {
    try {
      const hidden = notifications.map((n) => n.id);
      localStorage.setItem("hidden_notifications", JSON.stringify(hidden));
      setNotifications([]);
      setNotifying(false);
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const unreadNotifs = notifications.filter((n) => !isNotificationRead(n.id));

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifikasi Baru
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
              <span className="text-sm">Memuat notifikasi...</span>
            </div>
          ) : unreadNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-450 text-center px-4">
              <svg className="size-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
              <span className="text-xs text-gray-400 font-medium">Semua notifikasi baru telah dibaca.</span>
            </div>
          ) : (
            unreadNotifs.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  onItemClick={() => handleItemClick(item)}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className="relative block w-full h-10 rounded-full z-1 max-w-10 shrink-0">
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden">
                      {item.title.charAt(0)}
                    </div>
                    <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white ${item.dotColor} dark:border-gray-900`}></span>
                  </span>

                  <span className="block text-start">
                    <span className="mb-1 block text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        {item.title}
                      </span>{" "}
                      <span>{item.message}</span>{" "}
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        {item.target}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 text-gray-400 text-theme-xs dark:text-gray-500">
                      <span>{item.type === "document" ? "Pelaporan Dokumen" : "Dapodik Sinkron"}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{item.time}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))
          )}
        </ul>
        <button
          onClick={() => {
            closeDropdown();
            setIsHistoryModalOpen(true);
          }}
          className="w-full block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Lihat Semua Notifikasi
        </button>
      </Dropdown>

      {/* Modal Riwayat Semua Notifikasi */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        className="max-w-xl"
      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Semua Notifikasi Sistem
            </h3>
            {/* Ditambahkan pr-10 agar tombol aksi tidak terpotong oleh ikon X close absolute di modal */}
            <div className="flex gap-2 pr-10">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-semibold px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
              >
                Tandai Semua Dibaca
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 font-semibold px-2 py-1 rounded hover:bg-error-50 dark:hover:bg-error-500/10 transition"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Belum ada notifikasi sistem yang masuk.
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = isNotificationRead(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    className={`flex gap-3 p-3 rounded-xl border border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition ${
                      isRead ? "opacity-60 bg-gray-50/30" : "bg-white dark:bg-transparent"
                    }`}
                  >
                    <span className="relative block w-10 h-10 rounded-full shrink-0">
                      <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase">
                        {item.title.charAt(0)}
                      </div>
                      <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white ${item.dotColor} dark:border-gray-900`}></span>
                    </span>

                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-800 dark:text-white/90">
                        <span className="font-semibold">{item.title}</span>{" "}
                        {item.message}{" "}
                        <span className="font-semibold">{item.target}</span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span>{item.type === "document" ? "Pelaporan Dokumen" : "Dapodik Sinkron"}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{item.time}</span>
                        {isRead && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-gray-400 italic">Dibaca</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Informasi Notifikasi */}
      <Modal
        isOpen={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        className="max-w-md"
      >
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            Detail Notifikasi
          </h3>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="relative block w-10 h-10 rounded-full shrink-0">
                  <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase">
                    {selectedNotification.title.charAt(0)}
                  </div>
                  <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white ${selectedNotification.dotColor} dark:border-gray-900`}></span>
                </span>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                    {selectedNotification.title}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {selectedNotification.type === "document" ? "Pelaporan Dokumen" : "Dapodik Sinkron"}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-sm text-left">
                <div className="flex flex-col gap-1 py-2 border-b border-gray-50 dark:border-white/5">
                  <span className="text-xs text-gray-400 font-medium">Aktivitas / Peristiwa</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {selectedNotification.type === "document" ? "Mengumpulkan dokumen pelaporan" : "Sinkronisasi data Dapodik"}
                  </span>
                </div>
                {selectedNotification.type === "document" && (
                  <div className="flex flex-col gap-1 py-2 border-b border-gray-50 dark:border-white/5">
                    <span className="text-xs text-gray-400 font-medium">Nama Pelaporan</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {selectedNotification.target}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1 py-2 border-b border-gray-50 dark:border-white/5">
                  <span className="text-xs text-gray-400 font-medium">Waktu Kejadian</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">
                    {selectedNotification.time}
                  </span>
                </div>
                <div className="flex flex-col gap-1 py-2 last:border-0">
                  <span className="text-xs text-gray-400 font-medium">Status</span>
                  <span className="px-2 py-0.5 self-start text-xs font-semibold rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Sudah Dibaca
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
                >
                  Tutup
                </button>
                {selectedNotification.type === "document" && selectedNotification.pelaporanId && (
                  <button
                    onClick={() => {
                      setIsHistoryModalOpen(false);
                      closeDropdown();
                      setSelectedNotification(null);
                      navigate(`${rolePath}/pelaporan-dokumen/detail/${selectedNotification.pelaporanId}`);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Buka Pelaporan Dokumen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
