import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Select from "../../components/form/Select";
import Input from "../../components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { TrashBinIcon, PlusIcon, ChevronLeftIcon, EyeIcon, SearchIcon } from "../../icons";
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
}

export default function MappingPengawasPage() {
  const [view, setView] = useState<"list" | "add" | "detail">("list");
  const [data, setData] = useState<MappingPengawas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupedMapping | null>(null);

  // Resources for Form
  const [pengawasItems, setPengawasItems] = useState<Pegawai[]>([]);
  const [schoolItems, setSchoolItems] = useState<MandalaSchool[]>([]);

  // Form State
  const [selectedJenjang, setSelectedJenjang] = useState("");
  const [selectedPengawas, setSelectedPengawas] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouped Data for List View
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedMapping> = {};
    data.forEach((item) => {
      const pId = item.pegawai_id;
      if (!groups[pId]) {
        groups[pId] = {
          pegawai_id: pId,
          pegawai: item.pegawai,
          schools: [],
        };
      }
      groups[pId].schools.push({
        mapping_pengawas_id: item.mapping_pengawas_id,
        sekolah: item.sekolah,
      });
    });
    return Object.values(groups);
  }, [data]);

  // Dynamic Jenjang Options from school data
  const jenjangOptions = useMemo(() => {
    const uniqueJenjang = new Set<string>();
    schoolItems.forEach(s => {
      const val = formatJenjang(s);
      if (val) uniqueJenjang.add(val);
    });
    return Array.from(uniqueJenjang).sort().map(j => ({ value: j, label: j }));
  }, [schoolItems]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingRes, pegawaiRes, sekolahRes] = await Promise.all([
        mandalaService.getMappingPengawas(),
        dapodikService.getPegawai(),
        dapodikService.getSekolah()
      ]);
      setData(mappingRes.data || []);
      
      const allPegawai = pegawaiRes.data || [];
      setPengawasItems(allPegawai.filter((p: Pegawai) => p.jabatan === 6));
      setSchoolItems(sekolahRes.data || []);
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

  const handleGoToAdd = () => {
    setSelectedJenjang("");
    setSelectedPengawas("");
    setSelectedSchools([]);
    setSchoolSearch("");
    setView("add");
  };

  const handleGoToDetail = (group: GroupedMapping) => {
    setSelectedGroup(group);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedGroup(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengawas || selectedSchools.length === 0) {
      Swal.fire("Peringatan", "Mohon pilih pengawas dan setidaknya satu sekolah", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = selectedSchools.map(sekolah_id => 
        mandalaService.createMappingPengawas({
          pegawai_id: selectedPengawas,
          sekolah_id
        })
      );

      await Promise.all(promises);
      Swal.fire("Berhasil", "Mapping pengawas berhasil disimpan", "success");
      setView("list");
      fetchData();
    } catch (error) {
      console.error("Failed to save mapping:", error);
      Swal.fire("Error", "Gagal menyimpan mapping pengawas", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, isBulk = false) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: isBulk ? "Semua mapping sekolah untuk pengawas ini akan dihapus!" : "Data mapping ini akan dihapus permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        if (isBulk && selectedGroup) {
          const promises = selectedGroup.schools.map(s => mandalaService.deleteMappingPengawas(s.mapping_pengawas_id));
          await Promise.all(promises);
        } else {
          await mandalaService.deleteMappingPengawas(id);
        }
        
        Swal.fire("Terhapus!", "Data berhasil dihapus.", "success");
        if (isBulk) handleBackToList();
        fetchData();
        
        // Update selectedGroup if in detail view
        if (view === "detail" && selectedGroup) {
            const updatedSchools = selectedGroup.schools.filter(s => s.mapping_pengawas_id !== id);
            if (updatedSchools.length === 0) {
                handleBackToList();
            } else {
                setSelectedGroup({...selectedGroup, schools: updatedSchools});
            }
        }
      } catch (error) {
        console.error("Failed to delete:", error);
        Swal.fire("Error", "Gagal menghapus data", "error");
      }
    }
  };

  // Filter schools based on selected Jenjang and Search Term
  const filteredSchools = useMemo(() => {
    return schoolItems.filter(s => {
      const matchesJenjang = !selectedJenjang || formatJenjang(s) === selectedJenjang;
      const matchesSearch = !schoolSearch || 
        s.nama.toLowerCase().includes(schoolSearch.toLowerCase()) || 
        s.npsn.includes(schoolSearch);
      
      return matchesJenjang && matchesSearch;
    });
  }, [schoolItems, selectedJenjang, schoolSearch]);

  // Helper to check if a school is already mapped and get supervisor name
  const getMappingStatus = (sekolah_id: string) => {
    const mapping = data.find(item => item.sekolah_id === sekolah_id);
    return mapping ? mapping.pegawai.nama_lengkap : null;
  };

  return (
    <>
      <PageMeta
        title="Mapping Pengawas Pembina | SIMAK"
        description="Manajemen mapping pengawas pembina ke sekolah binaan"
      />
      <PageBreadcrumb pageTitle="Mapping Pengawas Pembina" />

      {view === "list" ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03] md:flex-row md:p-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                Daftar Mapping Pengawas
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Kelola penugasan pengawas pembina ke masing-masing sekolah.
              </p>
            </div>
            <Button size="sm" onClick={handleGoToAdd} startIcon={<PlusIcon />}>
              Tambah Mapping
            </Button>
          </div>

          <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-start">Pengawas</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-start">NIP</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-start">Sekolah Binaan</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-right">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-10 text-center text-gray-500">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : groupedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                      Belum ada data mapping pengawas.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedData.map((group) => (
                    <TableRow key={group.pegawai_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-4 text-start text-gray-800 dark:text-white/90">
                        {group.pegawai?.nama_lengkap}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 dark:text-gray-400 text-theme-sm">
                        {group.pegawai?.nip || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex flex-wrap gap-2">
                          {group.schools.slice(0, 3).map((s, idx) => (
                            <Badge key={idx} variant="light" color="primary" size="sm">
                              {s.sekolah.nama}
                            </Badge>
                          ))}
                          {group.schools.length > 3 && (
                            <Badge variant="light" color="light" size="sm">
                              +{group.schools.length - 3} lainnya
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleGoToDetail(group)}
                            className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                            title="Lihat Detail"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                                setSelectedGroup(group);
                                handleDelete("", true);
                            }}
                            className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                            title="Hapus Semua"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : view === "add" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center justify-center w-10 h-10 text-gray-500 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <h3 className="text-xl font-medium text-gray-800 dark:text-white/90">
              Tambah Mapping Pengawas
            </h3>
          </div>

          <ComponentCard title="Form Pemetaan Pengawas">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Jenjang
                  </label>
                  <Select
                    options={jenjangOptions}
                    placeholder="-- Pilih Jenjang --"
                    onChange={(val) => {
                      setSelectedJenjang(val);
                      setSelectedSchools([]);
                    }}
                    value={selectedJenjang}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Pengawas
                  </label>
                  <Select
                    options={pengawasItems.map(p => ({ value: p.pegawai_id, label: p.nama_lengkap }))}
                    placeholder="-- Pilih Pengawas --"
                    onChange={(val) => setSelectedPengawas(val)}
                    value={selectedPengawas}
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Sekolah Binaan
                    </label>
                    <div className="relative w-full sm:w-64">
                        <span className="absolute -translate-y-1/2 left-3 top-1/2 text-gray-400">
                            <SearchIcon className="size-4" />
                        </span>
                        <Input
                            type="text"
                            placeholder="Cari nama atau NPSN..."
                            value={schoolSearch}
                            onChange={(e) => setSchoolSearch(e.target.value)}
                            className="pl-9 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="min-h-[300px] border border-gray-200 rounded-xl p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                  {!selectedJenjang ? (
                    <div className="flex flex-col items-center justify-center h-[260px] text-gray-500">
                      <p className="text-sm">Silakan pilih jenjang terlebih dahulu untuk memuat daftar sekolah.</p>
                    </div>
                  ) : filteredSchools.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[260px] text-gray-500">
                      <p className="text-sm italic">
                          {schoolSearch ? "Tidak ada sekolah yang cocok dengan pencarian." : "Tidak ada sekolah ditemukan untuk jenjang ini."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredSchools.map(school => {
                        const supervisorName = getMappingStatus(school.sekolah_id);
                        const isMapped = !!supervisorName;

                        return (
                          <label 
                            key={school.sekolah_id} 
                            className={`flex items-start gap-3 p-3 border rounded-xl transition-all ${
                              isMapped 
                              ? "bg-gray-50 dark:bg-white/[0.01] border-gray-100 dark:border-gray-800 opacity-70 cursor-not-allowed"
                              : selectedSchools.includes(school.sekolah_id) 
                                ? "border-brand-500 bg-brand-50/10 dark:bg-brand-500/5 ring-1 ring-brand-500 cursor-pointer" 
                                : "border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 bg-white dark:bg-gray-900 cursor-pointer"
                            }`}
                          >
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                disabled={isMapped}
                                checked={selectedSchools.includes(school.sekolah_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSchools([...selectedSchools, school.sekolah_id]);
                                  } else {
                                    setSelectedSchools(selectedSchools.filter(id => id !== school.sekolah_id));
                                  }
                                }}
                                className={`w-4 h-4 rounded border-gray-300 focus:ring-brand-500 ${isMapped ? "text-gray-400" : "text-brand-500"}`}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium leading-tight ${isMapped ? "text-gray-500" : "text-gray-800 dark:text-white/90"}`}>
                                {school.nama}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                NPSN: {school.npsn}
                              </span>
                              {isMapped && (
                                <span className="mt-2 text-[10px] font-medium text-warning-600 bg-warning-50 dark:bg-warning-500/10 dark:text-orange-400 px-2 py-0.5 rounded-full w-fit">
                                  Dibina oleh: {supervisorName}
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

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="outline" type="button" onClick={handleBackToList}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Pemetaan"}
                </Button>
              </div>
            </form>
          </ComponentCard>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="flex items-center justify-center w-10 h-10 text-gray-500 transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <div>
                <h3 className="text-xl font-medium text-gray-800 dark:text-white/90">
                Detail Sekolah Binaan
                </h3>
                <p className="text-sm text-gray-500">{selectedGroup?.pegawai.nama_lengkap} ({selectedGroup?.pegawai.nip})</p>
            </div>
          </div>

          <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl dark:border-gray-800 dark:bg-white/[0.03]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-start">Nama Sekolah</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-sm text-start">NPSN</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroup?.schools.map((item) => (
                  <TableRow key={item.mapping_pengawas_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-start text-gray-800 dark:text-white/90">
                      {item.sekolah.nama}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-gray-500 dark:text-gray-400 text-theme-sm">
                      {item.sekolah.npsn}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
