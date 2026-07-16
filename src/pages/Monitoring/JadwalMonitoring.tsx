import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import {
  PlusIcon,
  ChevronLeftIcon,
  SearchIcon,
  SchoolIcon,
  CalenderIcon,
  UserIcon,
  AlertIcon,
  TrashBinIcon,
  InfoIcon,
  ChevronDownIcon
} from "../../icons";
import Swal from "sweetalert2";
import { mandalaService } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";

interface Jadwal {
  jadwal_monitoring_id: string;
  pegawai_id: string;
  sekolah_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  agenda: string;
  keterangan: string;
  status: "scheduled" | "completed" | "cancelled" | string;
  sekolah?: {
    nama: string;
    npsn: string;
  };
  pegawai?: {
    nama_lengkap: string;
    nip: string;
  };
}

interface Pegawai {
  pegawai_id: string;
  nama_lengkap: string;
  jabatan: number;
  nip?: string;
}

export default function JadwalMonitoring() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toLowerCase() === "super admin" || user?.role?.toLowerCase() === "super-admin" || (user as any)?.jabatan === 0;
  const isAdmin = user?.role?.toLowerCase() === "admin" || (user as any)?.jabatan === 1;
  const isManagement = isSuperAdmin || isAdmin;

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "add">("list");
  
  // Data lists
  const [schedules, setSchedules] = useState<Jadwal[]>([]);
  const [supervisors, setSupervisors] = useState<Pegawai[]>([]);
  const [binaanSchools, setBinaanSchools] = useState<{ sekolah_id: string; nama: string; npsn: string }[]>([]);
  const [allMappings, setAllMappings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");

  // UI state
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false);
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);

  // Form State
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Schedules list
  const fetchSchedules = async () => {
    try {
      const res = await mandalaService.getJadwalMonitoring();
      setSchedules(res.data || []);
    } catch (error) {
      console.error("Gagal mengambil data jadwal:", error);
    }
  };

  // Initialize data
  useEffect(() => {
    // Clean up old mock localStorage data if any exists
    localStorage.removeItem("mock_jadwal_monitoring");

    const initData = async () => {
      setLoading(true);
      try {
        await fetchSchedules();

        if (isManagement) {
          // Admin/Super Admin: Fetch supervisors list and mapping data
          const [pegawaiRes, mappingRes] = await Promise.all([
            dapodikService.getPegawai(),
            mandalaService.getMappingPengawas()
          ]);
          
          const allPegawai = pegawaiRes.data || [];
          const supervisorList = allPegawai.filter((p: Pegawai) => p.jabatan === 6);
          setSupervisors(supervisorList);
          setAllMappings(mappingRes.data || []);
        } else {
          // Pengawas: Fetch mapped schools directly from backend
          const res = await mandalaService.getSekolahBinaan();
          setBinaanSchools(res.data || []);
        }
      } catch (error) {
        console.error("Gagal memuat data awal:", error);
        Swal.fire("Error", "Gagal memuat data monitoring", "error");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initData();
    }
  }, [user, isManagement]);

  // Load schools for selected supervisor (Admin View)
  useEffect(() => {
    if (isManagement && selectedSupervisor) {
      const filteredMappings = allMappings.filter(m => m.pegawai_id === selectedSupervisor);
      const schools = filteredMappings.map(m => ({
        sekolah_id: m.sekolah_id,
        nama: m.sekolah?.nama || "Sekolah tidak diketahui",
        npsn: m.sekolah?.npsn || "-"
      }));
      setBinaanSchools(schools);
      setSelectedSchools([]); // Reset selection when supervisor changes
      setSchoolSearchQuery(""); // Reset school search query
    } else if (isManagement) {
      setBinaanSchools([]);
      setSelectedSchools([]);
      setSchoolSearchQuery("");
    }
  }, [selectedSupervisor, allMappings, isManagement]);

  // Filtered binaan schools for rendering
  const filteredBinaanSchools = useMemo(() => {
    if (!schoolSearchQuery.trim()) return binaanSchools;
    const q = schoolSearchQuery.toLowerCase();
    return binaanSchools.filter(s => 
      s.nama.toLowerCase().includes(q) || 
      s.npsn.includes(q)
    );
  }, [binaanSchools, schoolSearchQuery]);

  // Filtered supervisors for searchable dropdown selection
  const filteredSupervisors = useMemo(() => {
    if (!supervisorSearchQuery.trim()) return supervisors;
    const q = supervisorSearchQuery.toLowerCase();
    return supervisors.filter(p => 
      p.nama_lengkap.toLowerCase().includes(q) || 
      (p.nip && p.nip.includes(q))
    );
  }, [supervisors, supervisorSearchQuery]);

  // Toggle school checkbox selection
  const handleToggleSchool = (schoolId: string) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId) 
        : [...prev, schoolId]
    );
  };

  const handleSelectAllSchools = () => {
    setSelectedSchools(binaanSchools.map(s => s.sekolah_id));
  };

  const handleDeselectAllSchools = () => {
    setSelectedSchools([]);
  };

  // Form submission (Backend integration)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isManagement && !selectedSupervisor) {
      Swal.fire("Peringatan", "Mohon pilih pengawas pembina terlebih dahulu.", "warning");
      return;
    }

    if (selectedSchools.length === 0) {
      Swal.fire("Peringatan", "Mohon pilih minimal satu sekolah binaan.", "warning");
      return;
    }

    if (!startDate || !endDate || !agenda.trim()) {
      Swal.fire("Peringatan", "Mohon lengkapi seluruh kolom wajib.", "warning");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Swal.fire("Peringatan", "Tanggal mulai tidak boleh melebihi tanggal selesai.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      // Loop create monitoring schedules via API
      const promises = selectedSchools.map(sekolah_id => {
        const payload: any = {
          sekolah_id,
          sekolahId: sekolah_id,
          tanggal_mulai: startDate,
          tanggal_selesai: endDate,
          agenda: agenda.trim(),
          keterangan: keterangan.trim(),
        };

        if (selectedSupervisor) {
          payload.pegawai_id = selectedSupervisor;
          payload.pegawaiId = selectedSupervisor;
        }

        console.log("Payload dikirim ke backend:", payload);
        return mandalaService.createJadwalMonitoring(payload);
      });

      await Promise.all(promises);
      
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Jadwal monitoring berhasil disimpan ke server",
        timer: 2000,
        showConfirmButton: false
      });

      // Reset form & reload data
      setSelectedSupervisor("");
      setSelectedSchools([]);
      setStartDate("");
      setEndDate("");
      setAgenda("");
      setKeterangan("");
      
      await fetchSchedules();
      setView("list");
    } catch (error: any) {
      console.error("Gagal menyimpan jadwal:", error);
      Swal.fire("Error", error.response?.data?.message || "Gagal menyimpan jadwal monitoring", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update schedule status
  const handleStatusChange = (id: string, newStatus: "completed" | "cancelled") => {
    Swal.fire({
      title: "Ubah Status?",
      text: `Ubah status jadwal menjadi ${newStatus === "completed" ? "Selesai" : "Batal"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Ubah!",
      cancelButtonText: "Kembali"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await mandalaService.updateJadwalMonitoring(id, { status: newStatus });
          Swal.fire("Berhasil", "Status jadwal berhasil diperbarui", "success");
          fetchSchedules();
        } catch (error: any) {
          console.error(error);
          Swal.fire("Error", error.response?.data?.message || "Gagal memperbarui status", "error");
        }
      }
    });
  };

  // Delete schedule
  const handleDeleteJadwal = (id: string) => {
    Swal.fire({
      title: "Hapus Jadwal?",
      text: "Data jadwal monitoring ini akan dihapus permanen dari server!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await mandalaService.deleteJadwalMonitoring(id);
          Swal.fire("Berhasil", "Jadwal monitoring berhasil dihapus", "success");
          fetchSchedules();
        } catch (error: any) {
          console.error(error);
          Swal.fire("Error", error.response?.data?.message || "Gagal menghapus jadwal", "error");
        }
      }
    });
  };

  // Filtered schedules for search query
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase();
    return schedules.filter(s => 
      (s.sekolah?.nama || "").toLowerCase().includes(q) || 
      (s.sekolah?.npsn || "").includes(q) || 
      (s.agenda || "").toLowerCase().includes(q) ||
      (s.pegawai?.nama_lengkap || "").toLowerCase().includes(q)
    );
  }, [schedules, searchQuery]);

  return (
    <>
      <PageMeta
        title="Jadwal Monitoring | SIMAK"
        description="Kelola jadwal monitoring pengawas pembina ke sekolah binaan."
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Jadwal Monitoring Sekolah
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isManagement 
                  ? "Daftar agenda monitoring seluruh sekolah binaan oleh pengawas." 
                  : "Kelola agenda monitoring dan supervisi ke sekolah binaan Anda."}
              </p>
            </div>
            {view === "list" && (
              <Button
                variant="primary"
                onClick={() => setView("add")}
                startIcon={<PlusIcon />}
              >
                Buat Jadwal Baru
              </Button>
            )}
          </div>
        </div>

        {view === "list" ? (
          <div className="bg-white rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800 overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-5 border-b border-gray-100 dark:border-white/[0.05] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="relative max-w-xs w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon className="size-4" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari sekolah, pengawas, agenda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Menampilkan {filteredSchedules.length} Jadwal
              </div>
            </div>

            {/* Schedules Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <Table className="min-w-[1000px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Sekolah Binaan</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Pengawas</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Rentang Tanggal</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Agenda / Tujuan</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500">
                        Memuat data jadwal monitoring...
                      </TableCell>
                    </TableRow>
                  ) : filteredSchedules.length > 0 ? (
                    filteredSchedules.map((item) => (
                      <TableRow key={item.jadwal_monitoring_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
                          <div className="flex flex-col">
                            <span>{item.sekolah?.nama || "Sekolah tidak diketahui"}</span>
                            <span className="text-xs text-gray-400 font-normal">NPSN: {item.sekolah?.npsn || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="size-4 text-gray-400" />
                            <span>{item.pegawai?.nama_lengkap || "Pengawas tidak diketahui"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <CalenderIcon className="size-4 text-brand-500" />
                            <span>{item.tanggal_mulai?.split('T')[0]} s/d {item.tanggal_selesai?.split('T')[0]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start text-gray-800 dark:text-white/90 font-medium text-theme-sm">
                          {item.agenda}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-center">
                          {item.status === "scheduled" && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                              Terjadwal
                            </span>
                          )}
                          {item.status === "completed" && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                              Selesai
                            </span>
                          )}
                          {item.status === "cancelled" && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400">
                              Dibatalkan
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "scheduled" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(item.jadwal_monitoring_id, "completed")}
                                  className="px-2 py-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10 rounded text-xs font-semibold"
                                >
                                  Selesai
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item.jadwal_monitoring_id, "cancelled")}
                                  className="px-2 py-1 text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded text-xs font-semibold"
                                >
                                  Batal
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteJadwal(item.jadwal_monitoring_id)}
                              className="p-1 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded transition-colors"
                              title="Hapus"
                            >
                              <TrashBinIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500">
                        {searchQuery ? `Tidak ada jadwal monitoring ditemukan untuk "${searchQuery}"` : "Belum ada jadwal monitoring terdaftar."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* Add/Create Schedule Form */
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("list")}
                className="flex items-center justify-center w-10 h-10 text-gray-500 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Buat Jadwal Baru
                </h3>
                <p className="text-xs text-gray-400">Jadwalkan agenda monitoring ke beberapa sekolah binaan pengawas sekaligus.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <ComponentCard title="Informasi Jadwal & Agenda">
                  <div className="space-y-5">
                    {/* Admin Supervisor Selector (Searchable Dropdown) */}
                    {isManagement && (
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Pilih Pengawas Pembina <span className="text-error-500">*</span>
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
                            className="h-11 w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 text-left cursor-pointer"
                          >
                            <span className={selectedSupervisor ? "text-gray-900 dark:text-white/90 font-medium" : "text-gray-400 dark:text-gray-500"}>
                              {selectedSupervisor 
                                ? supervisors.find(p => p.pegawai_id === selectedSupervisor)?.nama_lengkap || "Pengawas Terpilih"
                                : "-- Pilih Pengawas Pembina --"}
                            </span>
                            <ChevronDownIcon className={`size-5 text-gray-500 transition-transform duration-200 ${isSupervisorDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isSupervisorDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-3 space-y-3">
                              {/* Search input inside dropdown */}
                              <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                                  <SearchIcon className="size-4" />
                                </span>
                                <Input
                                  type="text"
                                  placeholder="Cari nama atau NIP pengawas..."
                                  value={supervisorSearchQuery}
                                  onChange={(e) => setSupervisorSearchQuery(e.target.value)}
                                  className="pl-9"
                                />
                              </div>

                              {/* Supervisors list */}
                              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-900 custom-scrollbar pr-1">
                                {filteredSupervisors.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">
                                    Tidak ada pengawas ditemukan.
                                  </p>
                                ) : (
                                  filteredSupervisors.map(p => (
                                    <button
                                      key={p.pegawai_id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSupervisor(p.pegawai_id);
                                        setIsSupervisorDropdownOpen(false);
                                        setSupervisorSearchQuery("");
                                      }}
                                      className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.01] flex flex-col cursor-pointer ${selectedSupervisor === p.pegawai_id ? 'bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      <span>{p.nama_lengkap}</span>
                                      {p.nip && <span className="text-xs text-gray-400 font-normal mt-0.5">NIP: {p.nip}</span>}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* School Multi-selection checkboxes (Searchable Multi-select Dropdown) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Pilih Sekolah Binaan <span className="text-error-500">*</span>
                      </label>

                      {isManagement && !selectedSupervisor ? (
                        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-gray-800 text-gray-500 rounded-lg text-sm flex items-center justify-center gap-2">
                          <InfoIcon className="size-4" />
                          <span>Silakan pilih pengawas pembina terlebih dahulu untuk melihat daftar sekolah binaan.</span>
                        </div>
                      ) : binaanSchools.length === 0 ? (
                        <div className="p-4 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-lg text-sm flex items-center gap-2">
                          <AlertIcon className="size-5" />
                          <span>Tidak ada sekolah binaan yang terpetakan untuk pengawas ini.</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                            className="h-11 w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 text-left cursor-pointer"
                          >
                            <span className={selectedSchools.length > 0 ? "text-gray-900 dark:text-white/90 font-medium" : "text-gray-400 dark:text-gray-500"}>
                              {selectedSchools.length > 0 
                                ? `${selectedSchools.length} Sekolah Terpilih`
                                : "-- Pilih Sekolah Binaan --"}
                            </span>
                            <ChevronDownIcon className={`size-5 text-gray-500 transition-transform duration-200 ${isSchoolDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isSchoolDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 z-40 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-3 space-y-3">
                              {/* Search box for filtering schools inside dropdown */}
                              <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                                  <SearchIcon className="size-4" />
                                </span>
                                <Input
                                  type="text"
                                  placeholder="Cari nama sekolah atau NPSN..."
                                  value={schoolSearchQuery}
                                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                                  className="pl-9"
                                />
                              </div>

                              {/* Action controls (Select All / Deselect All) */}
                              <div className="flex justify-between items-center px-1 text-xs border-b border-gray-100 dark:border-gray-900 pb-2">
                                <span className="text-gray-400 font-medium">{filteredBinaanSchools.length} Sekolah Tampil</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSelectAllSchools}
                                    className="text-xs text-brand-500 hover:underline font-semibold cursor-pointer"
                                  >
                                    Pilih Semua
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    type="button"
                                    onClick={handleDeselectAllSchools}
                                    className="text-xs text-error-500 hover:underline font-semibold cursor-pointer"
                                  >
                                    Hapus Semua
                                  </button>
                                </div>
                              </div>

                              {filteredBinaanSchools.length === 0 ? (
                                <div className="p-6 bg-gray-50/50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 rounded-xl text-sm text-center">
                                  Tidak ada sekolah binaan yang cocok dengan pencarian "{schoolSearchQuery}".
                                </div>
                              ) : (
                                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-900 custom-scrollbar pr-1">
                                  {filteredBinaanSchools.map(school => {
                                    const isChecked = selectedSchools.includes(school.sekolah_id);
                                    return (
                                      <label
                                        key={school.sekolah_id}
                                        className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.01] cursor-pointer rounded-lg transition-colors ${isChecked ? 'bg-brand-50/20 dark:bg-brand-500/5' : ''}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleSchool(school.sekolah_id)}
                                          className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <span className={`text-sm ${isChecked ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>{school.nama}</span>
                                          <span className="text-xs text-gray-400 font-normal mt-0.5">NPSN: {school.npsn}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Dari Tanggal <span className="text-error-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Sampai Tanggal <span className="text-error-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Agenda / Tujuan Monitoring <span className="text-error-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Contoh: Supervisi Akademik Guru BK / Kunjungan Akreditasi"
                        value={agenda}
                        onChange={(e) => setAgenda(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Keterangan Tambahan
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Catatan tambahan mengenai kegiatan monitoring..."
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </ComponentCard>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                  <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Konfirmasi Penyimpanan
                  </h4>
                  
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl text-xs">
                    <span className="text-gray-500">Sekolah Terpilih:</span>
                    <Badge variant="solid" color={selectedSchools.length > 0 ? "primary" : "light"}>
                      {selectedSchools.length} Sekolah
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Jadwal monitoring terpisah akan dibuat secara otomatis untuk masing-masing sekolah yang Anda pilih di atas.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-grow" type="button" onClick={() => setView("list")}>
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      className="flex-grow"
                      disabled={isSubmitting || selectedSchools.length === 0}
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
