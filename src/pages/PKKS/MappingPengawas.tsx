import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import {
  PlusIcon,
  ChevronLeftIcon,
  SearchIcon,
  SchoolIcon,
  UserIcon,
  CheckCircleIcon,
  InfoIcon,
  PieChartIcon,
  TaskIcon,
  AlertIcon,
  CloseLineIcon
} from "../../icons";
import Swal from "sweetalert2";
import { mandalaService, MandalaSchool } from "../../services/mandalaService";
import { dapodikService } from "../../services/dapodikService";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import { formatJenjang } from "../../utils/dapodikUtils";

interface MappingPengawas {
  mapping_pengawas_id: string;
  pegawai_id: string;
  sekolah_id: string;
  pegawai: {
    nama_lengkap: string;
    nip: string;
  };
  sekolah: {
    nama: string;
    npsn: string;
  };
}

interface GroupedMapping {
  pegawai_id: string;
  pegawai: {
    nama_lengkap: string;
    nip: string;
  };
  schools: {
    mapping_pengawas_id: string;
    sekolah: {
      nama: string;
      npsn: string;
    };
  }[];
}

interface Pegawai {
  pegawai_id: string;
  nama_lengkap: string;
  jabatan: number;
  nip?: string;
}

export default function MappingPengawasPage() {
  const [view, setView] = useState<"list" | "add">("list");
  const [data, setData] = useState<MappingPengawas[]>([]);
  const [loading, setLoading] = useState(true);

  // Split Panel State
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "detail">("list");
  const [supervisorSearch, setSupervisorSearch] = useState("");

  // Resources for Form
  const [pengawasItems, setPengawasItems] = useState<Pegawai[]>([]);
  const [schoolItems, setSchoolItems] = useState<MandalaSchool[]>([]);

  // Form State
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedPengawas, setSelectedPengawas] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolFilterTab, setSchoolFilterTab] = useState<"unmapped" | "mapped" | "all">("unmapped");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouped Data for List View
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedMapping> = {};
    
    // Pastikan semua pengawas terdaftar minimal sebagai grup kosong
    pengawasItems.forEach((p) => {
      groups[p.pegawai_id] = {
        pegawai_id: p.pegawai_id,
        pegawai: {
          nama_lengkap: p.nama_lengkap,
          nip: p.nip || "",
        },
        schools: [],
      };
    });

    data.forEach((item) => {
      const pId = item.pegawai_id;
      if (!groups[pId]) {
        groups[pId] = {
          pegawai_id: pId,
          pegawai: item.pegawai,
          schools: [],
        };
      } else if (!groups[pId].pegawai.nip && item.pegawai?.nip) {
        groups[pId].pegawai = item.pegawai;
      }
      groups[pId].schools.push({
        mapping_pengawas_id: item.mapping_pengawas_id,
        sekolah: item.sekolah,
      });
    });

    return Object.values(groups);
  }, [data, pengawasItems]);

  // Selected Group helper
  const currentSelectedGroup = useMemo(() => {
    if (groupedData.length === 0) return null;
    return (
      groupedData.find((g) => g.pegawai_id === selectedSupervisorId) ||
      groupedData[0] ||
      null
    );
  }, [groupedData, selectedSupervisorId]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalSupervisors = pengawasItems.length;
    const totalSchools = schoolItems.length;
    
    // Unique school IDs in current mapping
    const mappedSchoolIds = new Set(data.map((item) => item.sekolah_id));
    const totalMapped = mappedSchoolIds.size;
    const totalUnmapped = Math.max(0, totalSchools - totalMapped);
    
    const avgSchools =
      totalSupervisors > 0 ? (totalMapped / totalSupervisors).toFixed(1) : "0";

    const mappedPercentage =
      totalSchools > 0 ? Math.round((totalMapped / totalSchools) * 100) : 0;

    return {
      totalSupervisors,
      totalSchools,
      totalMapped,
      totalUnmapped,
      avgSchools,
      mappedPercentage,
    };
  }, [data, pengawasItems, schoolItems]);

  // Dynamic Jenjang Options from school data
  const jenjangOptions = useMemo(() => {
    const uniqueJenjang = new Set<string>();
    schoolItems.forEach((s) => {
      const val = formatJenjang(s);
      if (val && val !== "-") uniqueJenjang.add(val);
    });
    return Array.from(uniqueJenjang)
      .sort()
      .map((j) => ({ value: j, label: j }));
  }, [schoolItems]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingRes, pegawaiRes, sekolahRes] = await Promise.all([
        mandalaService.getMappingPengawas(),
        dapodikService.getPegawai(),
        dapodikService.getSekolah(),
      ]);
      
      const allPegawai = pegawaiRes.data || [];
      const supervisors = allPegawai.filter((p: Pegawai) => p.jabatan === 6);
      
      setPengawasItems(supervisors);
      setData(mappingRes.data || []);
      setSchoolItems(sekolahRes.data || []);

      // Auto select first supervisor if none selected
      if (!selectedSupervisorId && supervisors.length > 0) {
        setSelectedSupervisorId(supervisors[0].pegawai_id);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      Swal.fire("Error", "Gagal memuat data mapping pengawas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoToAdd = (supervisorId?: string) => {
    setSelectedJenjang("");
    setSelectedPengawas(supervisorId || "");
    setSelectedSchools([]);
    setSchoolSearch("");
    setSchoolFilterTab("unmapped");
    setView("add");
  };

  const handleBackToList = () => {
    setView("list");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengawas || selectedSchools.length === 0) {
      Swal.fire("Peringatan", "Mohon pilih pengawas dan setidaknya satu sekolah", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = selectedSchools.map((sekolah_id) =>
        mandalaService.createMappingPengawas({
          pegawai_id: selectedPengawas,
          sekolah_id,
        })
      );

      await Promise.all(promises);
      Swal.fire("Berhasil", "Mapping pengawas berhasil disimpan", "success");
      
      // Auto select the modified supervisor
      setSelectedSupervisorId(selectedPengawas);
      setView("list");
      setMobileTab("detail");
      fetchData();
    } catch (error) {
      console.error("Failed to save mapping:", error);
      Swal.fire("Error", "Gagal menyimpan mapping pengawas", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMapping = async (id: string, isBulk = false, supervisorName = "", schoolName = "") => {
    const title = isBulk ? "Batalkan Semua Pemetaan?" : "Batalkan Pemetaan Sekolah?";
    const text = isBulk
      ? `Semua pemetaan sekolah untuk pengawas ${supervisorName} akan dibatalkan.`
      : `Batalkan pemetaan sekolah ${schoolName} dari pengawas ini?`;

    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, batalkan!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        if (isBulk && currentSelectedGroup) {
          const promises = currentSelectedGroup.schools.map((s) =>
            mandalaService.deleteMappingPengawas(s.mapping_pengawas_id)
          );
          await Promise.all(promises);
        } else {
          await mandalaService.deleteMappingPengawas(id);
        }

        Swal.fire("Dibatalkan!", "Pemetaan sekolah berhasil dibatalkan.", "success");
        fetchData();
      } catch (error) {
        console.error("Failed to cancel mapping:", error);
        Swal.fire("Error", "Gagal membatalkan pemetaan sekolah", "error");
      }
    }
  };

  // Helper to check if a school is already mapped and get supervisor name
  const getMappingStatus = (sekolah_id: string) => {
    const mapping = data.find((item) => item.sekolah_id === sekolah_id);
    return mapping ? mapping.pegawai.nama_lengkap : null;
  };

  // Filtered schools for selection
  const filteredSchools = useMemo(() => {
    return schoolItems.filter((s) => {
      const matchesJenjang = !selectedJenjang || formatJenjang(s) === selectedJenjang;
      const matchesSearch =
        !schoolSearch ||
        s.nama.toLowerCase().includes(schoolSearch.toLowerCase()) ||
        s.npsn.includes(schoolSearch);

      const supervisorName = getMappingStatus(s.sekolah_id);
      const isMapped = !!supervisorName;

      let matchesTab = true;
      if (schoolFilterTab === "unmapped") {
        matchesTab = !isMapped;
      } else if (schoolFilterTab === "mapped") {
        matchesTab = isMapped;
      }

      return matchesJenjang && matchesSearch && matchesTab;
    });
  }, [schoolItems, selectedJenjang, schoolSearch, schoolFilterTab, data]);

  // Bulk Selection Helpers
  const handleSelectAllSchools = () => {
    const selectable = filteredSchools
      .filter((s) => !getMappingStatus(s.sekolah_id))
      .map((s) => s.sekolah_id);
    
    setSelectedSchools(Array.from(new Set([...selectedSchools, ...selectable])));
  };

  const handleDeselectAllSchools = () => {
    const filteredIds = filteredSchools.map((s) => s.sekolah_id);
    setSelectedSchools(selectedSchools.filter((id) => !filteredIds.includes(id)));
  };

  // Filtered supervisor list on left panel
  const filteredSupervisors = useMemo(() => {
    return groupedData.filter(
      (g) =>
        g.pegawai.nama_lengkap.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
        (g.pegawai.nip && g.pegawai.nip.includes(supervisorSearch))
    );
  }, [groupedData, supervisorSearch]);

  return (
    <>
      <PageMeta
        title="Mapping Pengawas Pembina | SIMAK"
        description="Manajemen mapping pengawas pembina ke sekolah binaan"
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 no-print">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Mapping Pengawas Pembina
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pemetaan pengawas pembina ke masing-masing satuan pendidikan binaan di bawah sistem Mandala.
          </p>
        </div>

        {/* 1. Dashboard Stats Card */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400 size-12">
            <UserIcon className="size-6" />
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Pengawas</span>
            <h4 className="mt-1 text-2xl font-medium text-gray-800 dark:text-white/90">
              {loading ? "..." : stats.totalSupervisors}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/10 dark:text-success-400 size-12">
            <SchoolIcon className="size-6" />
          </div>
          <div className="flex-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sekolah Terpetakan</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="text-2xl font-medium text-gray-800 dark:text-white/90">
                {loading ? "..." : stats.totalMapped}
              </h4>
              <span className="text-xs text-gray-500">/ {stats.totalSchools}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-success-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.mappedPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
          <div className={`flex items-center justify-center rounded-xl size-12 ${stats.totalUnmapped > 0 ? "bg-error-50 text-error-500 dark:bg-error-500/10 dark:text-error-400" : "bg-gray-50 text-gray-400 dark:bg-white/5"}`}>
            {stats.totalUnmapped > 0 ? <AlertIcon className="size-6" /> : <CheckCircleIcon className="size-6" />}
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Belum Terpetakan</span>
            <h4 className={`mt-1 text-2xl font-medium ${stats.totalUnmapped > 0 ? "text-error-600 dark:text-error-400" : "text-gray-800 dark:text-white/90"}`}>
              {loading ? "..." : stats.totalUnmapped}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-center rounded-xl bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10 dark:text-blue-light-400 size-12">
            <PieChartIcon className="size-6" />
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Rasio Binaan</span>
            <h4 className="mt-1 text-2xl font-medium text-gray-800 dark:text-white/90">
              {loading ? "..." : `${stats.avgSchools} Sek`}
            </h4>
          </div>
        </div>
      </div>

      {view === "list" ? (
        /* 2. MAIN SPLIT LAYOUT */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* A. LEFT PANEL: Supervisor List */}
          <div className={`lg:col-span-4 ${mobileTab === "detail" ? "hidden lg:block" : "block"}`}>
            <div className="flex flex-col h-[650px] bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
              {/* Header Panel Kiri */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                    Daftar Pengawas
                  </h3>
                </div>
                <div className="relative">
                  <span className="absolute -translate-y-1/2 left-3 top-1/2 text-gray-400">
                    <SearchIcon className="size-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari Pengawas..."
                    value={supervisorSearch}
                    onChange={(e) => setSupervisorSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Scrollable Supervisor List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    Memuat data pengawas...
                  </div>
                ) : filteredSupervisors.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    Tidak ditemukan data pengawas.
                  </div>
                ) : (
                  filteredSupervisors.map((group) => {
                    const isSelected = selectedSupervisorId === group.pegawai_id;
                    const schoolsCount = group.schools.length;

                    return (
                      <div
                        key={group.pegawai_id}
                        onClick={() => {
                          setSelectedSupervisorId(group.pegawai_id);
                          setMobileTab("detail");
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/30 dark:bg-brand-500/5 ring-1 ring-brand-500"
                            : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.01] bg-white dark:bg-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-medium text-gray-800 dark:text-white/90 text-sm">
                              {group.pegawai?.nama_lengkap || "Nama tidak tersedia"}
                            </h4>
                            <p className="text-xs text-gray-400">
                              NIP: {group.pegawai?.nip || "-"}
                            </p>
                          </div>
                          <Badge
                            variant={schoolsCount > 0 ? "light" : "solid"}
                            color={schoolsCount > 0 ? "primary" : "light"}
                            size="sm"
                          >
                            {schoolsCount} Binaan
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* B. RIGHT PANEL: Mapped Schools List */}
          <div className={`lg:col-span-8 ${mobileTab === "list" ? "hidden lg:block" : "block"}`}>
            <div className="flex flex-col h-[650px] bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
              {currentSelectedGroup ? (
                <>
                  {/* Header Detail */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01]">
                    <button
                      onClick={() => setMobileTab("list")}
                      className="flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 lg:hidden mb-4"
                    >
                      <ChevronLeftIcon className="size-4" />
                      Kembali ke Daftar
                    </button>

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 size-12">
                          <UserIcon className="size-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                            {currentSelectedGroup.pegawai.nama_lengkap}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            NIP: {currentSelectedGroup.pegawai.nip || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentSelectedGroup.schools.length > 0 && (
                          <Button
                            variant="error-outline"
                            size="sm"
                            onClick={() =>
                              handleCancelMapping(
                                "",
                                true,
                                currentSelectedGroup.pegawai.nama_lengkap
                              )
                            }
                            startIcon={<CloseLineIcon />}
                          >
                            Batalkan Semua Pemetaan
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleGoToAdd(currentSelectedGroup.pegawai_id)}
                          startIcon={<PlusIcon />}
                        >
                          Tambah Pemetaan
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Mapped Schools Table */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {currentSelectedGroup.schools.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 size-16 mb-4 text-gray-400">
                          <SchoolIcon className="size-8" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-white/80">
                          Belum Ada Sekolah Binaan
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm">
                          Pengawas ini belum memilik mapping sekolah binaan. Silakan tambahkan sekolah binaan dengan mengklik tombol "Tambah Sekolah".
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-gray-150 dark:border-gray-800 rounded-xl">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-white/[0.02]">
                              <TableCell isHeader className="w-12 text-center py-3 font-medium text-gray-500">No.</TableCell>
                              <TableCell isHeader className="py-3 font-medium text-gray-500">Nama Sekolah</TableCell>
                              <TableCell isHeader className="py-3 font-medium text-gray-500">NPSN</TableCell>
                              <TableCell isHeader className="py-3 font-medium text-gray-500 text-center w-28">Aksi</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentSelectedGroup.schools.map((item, idx) => (
                              <TableRow
                                key={item.mapping_pengawas_id}
                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"
                              >
                                <TableCell className="text-center text-gray-500 py-3.5 text-sm">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-medium text-gray-800 dark:text-white/90 py-3.5">
                                  {item.sekolah.nama}
                                </TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400 text-sm py-3.5">
                                  {item.sekolah.npsn}
                                </TableCell>
                                <TableCell className="text-center py-3.5">
                                  <button
                                    onClick={() =>
                                      handleCancelMapping(
                                        item.mapping_pengawas_id,
                                        false,
                                        "",
                                        item.sekolah.nama
                                      )
                                    }
                                    className="p-1.5 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                                    title="Batalkan Pemetaan Sekolah"
                                  >
                                    <CloseLineIcon className="size-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                  <InfoIcon className="size-12 mb-3" />
                  <p className="text-sm">Pilih pengawas di panel kiri untuk mengelola sekolah binaan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 3. REVAMPED "ADD MAPPING" FORM VIEW */
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center justify-center w-10 h-10 text-gray-500 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Tambah Mapping Pengawas
              </h3>
              <p className="text-xs text-gray-400">Tautkan beberapa sekolah sekaligus ke pengawas pembina.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Form Controls Column */}
            <div className="lg:col-span-4 space-y-6">
              <ComponentCard title="Parameter Pemetaan">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pilih Pengawas
                    </label>
                    <Select
                      options={pengawasItems.map((p) => ({
                        value: p.pegawai_id,
                        label: p.nama_lengkap,
                      }))}
                      placeholder="-- Pilih Pengawas --"
                      onChange={(val) => setSelectedPengawas(val)}
                      value={selectedPengawas}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Jenjang
                    </label>
                    <Select
                      options={jenjangOptions}
                      placeholder="-- Semua Jenjang --"
                      onChange={(val) => {
                        setSelectedJenjang(val);
                        // Do not reset all selections, just let them filter views
                      }}
                      value={selectedJenjang}
                    />
                  </div>
                </div>
              </ComponentCard>

              {/* Selection Summary Card */}
              <div className="p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                <h4 className="text-base font-medium text-gray-800 dark:text-white/90 text-sm">
                  Ringkasan Pilihan
                </h4>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <span className="text-xs text-gray-500">Sekolah Terpilih:</span>
                  <Badge variant="solid" color={selectedSchools.length > 0 ? "primary" : "light"}>
                    {selectedSchools.length} Sekolah
                  </Badge>
                </div>

                {selectedSchools.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-150 dark:border-gray-800 rounded-xl p-3 space-y-1.5 custom-scrollbar bg-gray-50/50">
                    {selectedSchools.map((schoolId) => {
                      const sch = schoolItems.find((s) => s.sekolah_id === schoolId);
                      return (
                        <div
                          key={schoolId}
                          className="flex items-center justify-between text-xs p-1 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-lg px-2"
                        >
                          <span className="truncate font-medium text-gray-800 dark:text-white/90 pr-2">
                            {sch?.nama || "Sekolah tidak ditemukan"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSchools(selectedSchools.filter((id) => id !== schoolId))}
                            className="text-gray-400 hover:text-error-500 text-[10px] font-medium"
                          >
                            Batal
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" type="button" onClick={handleBackToList}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || !selectedPengawas || selectedSchools.length === 0}
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Pemetaan"}
                  </Button>
                </div>
              </div>
            </div>

            {/* School Selection List Column */}
            <div className="lg:col-span-8">
              <div className="p-5 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
                {/* Search and Filters inside selection */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                  {/* Filter Tabs */}
                  <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setSchoolFilterTab("unmapped")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        schoolFilterTab === "unmapped"
                          ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-white shadow-theme-xs"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-white/80"
                      }`}
                    >
                      Belum Terpetakan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolFilterTab("mapped")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        schoolFilterTab === "mapped"
                          ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-white shadow-theme-xs"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-white/80"
                      }`}
                    >
                      Sudah Terpetakan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolFilterTab("all")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        schoolFilterTab === "all"
                          ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-white shadow-theme-xs"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-white/80"
                      }`}
                    >
                      Semua Sekolah
                    </button>
                  </div>

                  {/* Search school */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute -translate-y-1/2 left-3 top-1/2 text-gray-400">
                      <SearchIcon className="size-4" />
                    </span>
                    <Input
                      type="text"
                      placeholder="Cari sekolah atau NPSN..."
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      className="pl-9 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Grid controls */}
                {schoolFilterTab !== "mapped" && filteredSchools.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSchools}
                      className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Pilih Semua yang Tampil
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllSchools}
                      className="text-xs text-gray-500 hover:text-gray-600 hover:underline font-medium"
                    >
                      Batalkan Semua
                    </button>
                  </div>
                )}

                {/* School Cards Grid */}
                <div className="min-h-[400px] max-h-[500px] overflow-y-auto border border-gray-150 dark:border-gray-800 rounded-xl p-4 bg-gray-50/30 dark:bg-white/[0.01] custom-scrollbar">
                  {filteredSchools.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[350px] text-gray-400">
                      <SchoolIcon className="size-10 mb-2 opacity-50" />
                      <p className="text-xs italic">
                        {schoolSearch
                          ? "Tidak ada sekolah yang sesuai dengan pencarian."
                          : "Tidak ada sekolah ditemukan pada filter ini."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {filteredSchools.map((school) => {
                        const supervisorName = getMappingStatus(school.sekolah_id);
                        const isMapped = !!supervisorName;
                        const isSelected = selectedSchools.includes(school.sekolah_id);

                        return (
                          <label
                            key={school.sekolah_id}
                            className={`flex items-start gap-3 p-3 border rounded-xl transition-all select-none ${
                              isMapped
                                ? "bg-gray-100 dark:bg-white/[0.01] border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "border-brand-500 bg-brand-50/15 dark:bg-brand-500/5 ring-1 ring-brand-500 cursor-pointer shadow-sm"
                                : "border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 bg-white dark:bg-gray-900 cursor-pointer"
                            }`}
                          >
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                disabled={isMapped}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSchools([...selectedSchools, school.sekolah_id]);
                                  } else {
                                    setSelectedSchools(
                                      selectedSchools.filter((id) => id !== school.sekolah_id)
                                    );
                                  }
                                }}
                                className={`w-4 h-4 rounded border-gray-300 focus:ring-brand-500 ${
                                  isMapped
                                    ? "text-gray-300 dark:border-gray-700"
                                    : "text-brand-500 focus:ring-offset-0"
                                }`}
                              />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span
                                className={`text-sm font-medium truncate leading-tight ${
                                  isMapped ? "text-gray-500" : "text-gray-800 dark:text-white/90"
                                }`}
                              >
                                {school.nama}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                NPSN: {school.npsn} • {formatJenjang(school)}
                              </span>
                              {isMapped && (
                                <span className="mt-2 text-[10px] font-medium text-warning-600 bg-warning-50 dark:bg-warning-500/10 dark:text-orange-400 px-2 py-0.5 rounded-full w-fit">
                                  Pengawas: {supervisorName}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
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
