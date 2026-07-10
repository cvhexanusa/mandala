import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { Modal } from "../../components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { PencilIcon, PlusIcon, EyeIcon, CopyIcon, ArrowRightIcon, SearchIcon, DownloadIcon } from "../../icons";
import Swal from "sweetalert2";
import { dapodikService } from "../../services/dapodikService";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/common/Pagination";
import { exportToExcel } from "../../utils/exportUtils";

interface Cadisdik {
  cadisdik_id: string;
  nama_instansi: string;
}

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
  golongan?: number | null;
  created_at?: string;
  nik?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat_lengkap?: string;
}

const JABATAN_MAP: Record<number, string> = {
  0: "Super admin",
  1: "Admin",
  3: "Kepala Cabang Dinas",
  4: "Kasubag",
  5: "Staf",
  6: "Pengawas",
};

const JK_MAP: Record<number, string> = {
  0: "Laki-laki",
  1: "Perempuan",
};

const GOLONGAN_MAP: Record<number, string> = {
  0: "IV.a",
  1: "IV.b",
  2: "IV.c",
  3: "IV.d",
  4: "IV.e",
};

interface DataPegawaiProps {
  showOnlyInactive?: boolean;
}

export default function DataPegawai({ showOnlyInactive = false }: DataPegawaiProps) {
  const { user, setAuthData } = useAuth();
  const isSuperAdmin = user?.role?.toLowerCase() === "super admin" || user?.role?.toLowerCase() === "super-admin" || (user as any)?.jabatan === 0;
  const isLocked = !isSuperAdmin;

  const [data, setData] = useState<Pegawai[]>([]);
  const [instansiList, setInstansiList] = useState<Cadisdik[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Pegawai | null>(null);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingData, setViewingData] = useState<Pegawai | null>(null);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when search or active filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showOnlyInactive]);

  // Client-side filtering & search
  const filteredPegawai = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter(item => 
      item.nama_lengkap.toLowerCase().includes(lowerQuery) ||
      (item.nip && item.nip.toLowerCase().includes(lowerQuery)) ||
      (item.email && item.email.toLowerCase().includes(lowerQuery))
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredPegawai.length / itemsPerPage) || 1;
  const currentData = useMemo(() => {
    return filteredPegawai.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPegawai, currentPage]);

  // Form State
  const [formData, setFormData] = useState({
    cadisdik_id: "",
    nama_lengkap: "",
    nip: "",
    email: "",
    password: "", // Only used for create or if changing password
    jabatan: "5", // default string for Select, parse to int on submit
    jenis_kelamin: "0",
    nomor_telepon: "",
    golongan: "",
    aktif: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pegawaiRes, instansiRes] = await Promise.all([
        dapodikService.getPegawai(),
        dapodikService.getCadisdik()
      ]);
      
      const pegawaiData = pegawaiRes.data || [];
      
      // Sort by oldest first (chronological order)
      const sortedPegawai = [...pegawaiData].sort((a, b) => {
        // Priority 1: Use created_at if available (Ascending)
        if (a.created_at && b.created_at) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        // Priority 2: Fallback to ID (Ascending)
        return a.pegawai_id.localeCompare(b.pegawai_id);
      });
      
      const filteredPegawai = sortedPegawai.filter(item => 
        showOnlyInactive ? !item.aktif : item.aktif
      );
      
      setData(filteredPegawai);
      setInstansiList(instansiRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      Swal.fire("Error", "Gagal memuat data pegawai", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showOnlyInactive]);

  // One-time automatic migration of dummy/incorrect emails to lowercase_name@gmail.com
  useEffect(() => {
    const migrateEmails = async () => {
      try {
        const res = await dapodikService.getPegawai();
        const list = res.data || [];
        
        // Find pegawais with dummy emails (e.g. containing '@internal.simak', '@simak.go.id', or starting with 'pegawai_')
        const dummyPegawais = list.filter((p: Pegawai) => 
          p.email && (
            p.email.includes("@internal.simak") || 
            p.email.includes("@simak.go.id") || 
            p.email.startsWith("pegawai_")
          )
        );
        
        if (dummyPegawais.length > 0) {
          console.log(`[Email Migration] Found ${dummyPegawais.length} pegawais with dummy emails. Migrating...`);
          for (const p of dummyPegawais) {
            const cleanName = p.nama_lengkap.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const newEmail = `${cleanName}@gmail.com`;
            console.log(`[Email Migration] Migrating ${p.nama_lengkap}: ${p.email} -> ${newEmail}`);
            
            // Generate a dummy NIK if theirs is empty or invalid
            const dummyNik = p.nik || ("32" + Math.floor(10000000000000 + Math.random() * 90000000000000).toString());
            
            await dapodikService.updatePegawai(p.pegawai_id, {
              cadisdik_id: p.cadisdik_id,
              nama_lengkap: p.nama_lengkap,
              nip: p.nip || null,
              email: newEmail,
              jabatan: p.jabatan,
              jenis_kelamin: p.jenis_kelamin,
              nomor_telepon: p.nomor_telepon || "000000000000",
              aktif: p.aktif,
              nik: dummyNik,
              tempat_lahir: "Tidak Diketahui",
              tanggal_lahir: "1980-01-01",
              alamat_lengkap: "Tidak Diketahui",
            });
          }
          console.log(`[Email Migration] Successfully migrated all dummy emails!`);
          fetchData();
        }
      } catch (err) {
        console.error("[Email Migration] Error during migration:", err);
      }
    };
    
    if (data.length > 0) {
      migrateEmails();
    }
  }, [data.length]);

  const handleOpenModal = (item?: Pegawai) => {
    if (item) {
      setEditingData(item);
      setFormData({
        cadisdik_id: item.cadisdik_id || "",
        nama_lengkap: item.nama_lengkap || "",
        nip: item.nip || "",
        email: item.email || "",
        password: "", // Leave blank on edit unless they want to change it
        jabatan: item.jabatan.toString(),
        jenis_kelamin: item.jenis_kelamin.toString(),
        nomor_telepon: item.nomor_telepon || "",
        golongan: item.golongan !== undefined && item.golongan !== null ? item.golongan.toString() : "",
        aktif: item.aktif,
      });
    } else {
      setEditingData(null);
      setFormData({
        cadisdik_id: isLocked && user?.cadisdik_id ? user.cadisdik_id : (instansiList.length > 0 ? instansiList[0].cadisdik_id : ""),
        nama_lengkap: "",
        nip: "",
        email: "",
        password: "",
        jabatan: "5",
        jenis_kelamin: "0",
        nomor_telepon: "",
        golongan: "",
        aktif: showOnlyInactive ? false : true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingData(null);
  };

  const handleOpenDetail = (item: Pegawai) => {
    setViewingData(item);
    setIsDetailModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanNip = formData.nip.trim();
    if (!formData.cadisdik_id || !formData.nama_lengkap) {
        Swal.fire({
            icon: 'warning',
            title: 'Data Belum Lengkap',
            text: 'Instansi dan Nama Lengkap wajib diisi.',
            confirmButtonColor: "#3085d6",
        });
        return;
    }

    try {
      // Membuat NIK palsu 16 digit yang unik (dimulai dengan 32 kode Jabar)
      const dummyNik = "32" + Math.floor(10000000000000 + Math.random() * 90000000000000).toString();

      const payload: any = {
        cadisdik_id: formData.cadisdik_id,
        nama_lengkap: formData.nama_lengkap.trim(),
        nip: cleanNip || null,
        jabatan: parseInt(formData.jabatan),
        jenis_kelamin: parseInt(formData.jenis_kelamin),
        nomor_telepon: formData.nomor_telepon?.trim() || "000000000000",
        aktif: formData.aktif,
        golongan: formData.golongan !== "" ? parseInt(formData.golongan) : null,
        // Gunakan data yang sudah ada jika edit, atau buat default jika tambah baru
        nik: editingData?.nik || dummyNik, 
        tempat_lahir: editingData?.tempat_lahir || "Tidak Diketahui",
        tanggal_lahir: editingData?.tanggal_lahir ? editingData.tanggal_lahir.split('T')[0] : "1980-01-01",
        alamat_lengkap: editingData?.alamat_lengkap || "Tidak Diketahui",
      };

      // Email Handling (Backend requires email and it must be unique)
      if (formData.email && formData.email.trim() !== "") {
        payload.email = formData.email.trim();
      } else {
        const cleanNameForEmail = formData.nama_lengkap.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        payload.email = `${cleanNameForEmail}@gmail.com`; 
      }

      // Password Handling (Backend requires password for create)
      if (!editingData) {
        payload.password = formData.password.trim() || "mandala123";
      } else if (formData.password.trim() !== "") {
        payload.password = formData.password.trim();
      }

      if (editingData) {
        await dapodikService.updatePegawai(editingData.pegawai_id, payload);

        // Update user context if they are editing themselves
        const isSelf = user && (user.id === editingData.pegawai_id || (user as unknown as Record<string, string>).pegawai_id === editingData.pegawai_id);
        if (isSelf) {
          const updatedUser = {
            ...user,
            nama: payload.nama_lengkap,
            email: payload.email,
            nip: payload.nip,
            foto: payload.foto || user.foto
          };
          setAuthData(updatedUser);
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Data pegawai berhasil diperbarui",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await dapodikService.createPegawai(payload);
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pegawai baru berhasil ditambahkan",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      console.error("Save error details:", error.response?.data);
      const serverData = error.response?.data;
      let errorText = error.message;

      if (serverData) {
        if (serverData.message) {
            if (typeof serverData.message === 'string') {
                errorText = serverData.message;
            } else if (Array.isArray(serverData.message)) {
                errorText = serverData.message.join(", ");
            } else if (typeof serverData.message === 'object') {
                errorText = Object.entries(serverData.message).map(([k, v]) => `${k}: ${v}`).join(", ");
            }
        } else if (serverData.error) {
            errorText = serverData.error;
        }
      }
      
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: errorText,
        confirmButtonColor: "#3085d6",
      });
    }
  };

  const handleRegisterKeluar = (id: string) => {
    Swal.fire({
      title: "Registrasi Keluar Pegawai?",
      text: "Pegawai ini akan dinonaktifkan dan dipindahkan ke daftar Pegawai Non-Aktif.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Register Keluar!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dapodikService.updatePegawai(id, { aktif: false });
          Swal.fire("Berhasil!", "Pegawai telah berhasil diregistrasi keluar (non-aktif).", "success");
          fetchData();
        } catch (error: any) {
          console.error("Deactivate error:", error);
          Swal.fire("Error", error.response?.data?.message || "Gagal memproses registrasi keluar", "error");
        }
      }
    });
  };

  const handleRestore = (id: string) => {
    Swal.fire({
      title: "Batalkan Registrasi Keluar?",
      text: "Pegawai ini akan diaktifkan kembali dan dimasukkan ke daftar pegawai aktif.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Aktifkan Kembali!",
      cancelButtonText: "Batal"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await dapodikService.updatePegawai(id, { aktif: true });
          Swal.fire("Berhasil!", "Pegawai telah diaktifkan kembali.", "success");
          fetchData();
        } catch (error: any) {
          console.error("Restore error:", error);
          Swal.fire("Error", error.response?.data?.message || "Gagal mengaktifkan kembali pegawai", "error");
        }
      }
    });
  };

  const handleExport = () => {
    if (filteredPegawai.length === 0) {
      Swal.fire({
        title: "Tidak Ada Data",
        text: "Tidak ada data pegawai yang dapat diekspor.",
        icon: "warning",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }

    const labelTab = showOnlyInactive ? "Pegawai_Non-Aktif" : "Pegawai_Aktif";
    const excelTitle = showOnlyInactive ? "DATA PEGAWAI NON-AKTIF" : "DATA PEGAWAI AKTIF";

    Swal.fire({
      title: `Export Data ${showOnlyInactive ? 'Pegawai Non-Aktif' : 'Pegawai Aktif'}?`,
      text: `Sebanyak ${filteredPegawai.length} data akan diunduh dalam format Excel.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Export!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const headers = [
          "No",
          "Nama Lengkap",
          "NIP",
          "Email",
          "Jabatan",
          "Instansi/Cadisdik",
          "Status"
        ];

        const rows = filteredPegawai.map((item, index) => {
          const no = (index + 1).toString();
          const nama = item.nama_lengkap || "-";
          const nip = item.nip || "-";
          const email = item.email || "-";
          const jabatan = JABATAN_MAP[item.jabatan] || "Tidak Diketahui";
          const instansiObj = instansiList.find(i => i.cadisdik_id === item.cadisdik_id);
          const instansi = instansiObj ? instansiObj.nama_instansi : "Instansi Tidak Ditemukan";
          const status = item.aktif ? "Aktif" : "Non-Aktif";

          return [no, nama, nip, email, jabatan, instansi, status];
        });

        const filename = `Data_${labelTab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        exportToExcel(filename, labelTab, excelTitle, headers, rows);
      }
    });
  };

  // Convert map to options for select
  const jabatanOptions = Object.entries(JABATAN_MAP).map(([val, label]) => ({ value: val, label }));
  const jkOptions = Object.entries(JK_MAP).map(([val, label]) => ({ value: val, label }));
  const instansiOptions = instansiList.map(inst => ({ value: inst.cadisdik_id, label: inst.nama_instansi }));
  const golonganOptions = [
    { value: "", label: "Pilih Golongan" },
    { value: "0", label: "IV.a" },
    { value: "1", label: "IV.b" },
    { value: "2", label: "IV.c" },
    { value: "3", label: "IV.d" },
    { value: "4", label: "IV.e" }
  ];

  return (
    <div>
      <PageMeta 
        title={showOnlyInactive ? "Pegawai Non-Aktif | SIMAK" : "Data Pegawai | SIMAK"} 
        description={showOnlyInactive ? "Manajemen Data Pegawai Non-Aktif" : "Manajemen Data Pegawai"} 
      />
      <PageBreadcrumb pageTitle={showOnlyInactive ? "Pegawai Non-Aktif" : "Data Pegawai"} />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {showOnlyInactive ? "Pegawai Non-Aktif" : "Manajemen Data Pegawai"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showOnlyInactive ? "Kelola data pegawai Cadisdik yang non-aktif." : "Kelola data pegawai Cadisdik."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="success-outline" 
              startIcon={<DownloadIcon />} 
              onClick={handleExport}
            >
              Export Excel
            </Button>
            {!showOnlyInactive && (
              <Button startIcon={<PlusIcon />} onClick={() => handleOpenModal()}>
                Tambah Pegawai
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          )}

          {/* Search bar row */}
          <div className="p-5 border-b border-gray-100 dark:border-white/[0.05] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative max-w-xs w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="size-4" />
              </span>
              <Input
                type="text"
                placeholder="Cari nama, NIP, atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Menampilkan {filteredPegawai.length} data pegawai
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <Table className="min-w-[1000px]">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Nama Lengkap</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">NIP</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Jabatan</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase">Instansi</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 uppercase">Status</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-right text-theme-xs dark:text-gray-400 uppercase">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {currentData.length > 0 ? (
                  currentData.map((item) => (
                    <TableRow key={item.pegawai_id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <TableCell className="px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
                        <div className="flex flex-col">
                            <span>{item.nama_lengkap}</span>
                            <span className="text-xs text-gray-400 font-normal">{item.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        {item.nip || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                            {JABATAN_MAP[item.jabatan] || "Tidak Diketahui"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-500 text-theme-sm dark:text-gray-400">
                        {instansiList.find(i => i.cadisdik_id === item.cadisdik_id)?.nama_instansi || "Instansi Tidak Ditemukan"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${item.aktif ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'}`}>
                          {item.aktif ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenDetail(item)}
                            className="p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                            title="Detail"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-2 text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          {showOnlyInactive ? (
                            <button 
                              onClick={() => handleRestore(item.pegawai_id)}
                              className="p-2 text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 rounded-lg transition-colors"
                              title="Batalkan Registrasi Keluar"
                            >
                              <ArrowRightIcon className="size-4 rotate-180" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRegisterKeluar(item.pegawai_id)}
                              className="p-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                              title="Register Keluar"
                            >
                              <ArrowRightIcon className="size-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery ? (
                        <>Tidak ada data ditemukan untuk "{searchQuery}"</>
                      ) : showOnlyInactive ? (
                        <>Belum ada data pegawai non-aktif.</>
                      ) : (
                        <>Belum ada data pegawai yang terdaftar.</>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Modal Add/Edit */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        className="max-w-3xl"
      >
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            {editingData ? "Ubah Data Pegawai" : "Tambah Pegawai Baru"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Instansi (Cadisdik) <span className="text-error-500">*</span></label>
                  <Select 
                      options={instansiOptions}
                      value={formData.cadisdik_id}
                      defaultValue={formData.cadisdik_id}
                      onChange={(val) => handleSelectChange('cadisdik_id', val)}
                      disabled={isLocked}
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nama Lengkap <span className="text-error-500">*</span></label>
                <Input 
                  name="nama_lengkap"
                  value={formData.nama_lengkap}
                  onChange={handleInputChange}
                  required
                  placeholder="Nama Lengkap Pegawai"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">NIP</label>
                <Input 
                  name="nip"
                  value={formData.nip}
                  onChange={handleInputChange}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Golongan</label>
                <Select 
                  options={golonganOptions}
                  value={formData.golongan}
                  defaultValue={formData.golongan}
                  onChange={(val) => handleSelectChange('golongan', val)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <Input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password 
                    <span className="text-gray-400 font-normal text-xs ml-1">
                        {editingData ? "(Kosongkan jika tidak ingin diubah)" : "(Kosongkan untuk default: mandala123)"}
                    </span>
                </label>
                <Input 
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Jabatan <span className="text-error-500">*</span></label>
                  <Select 
                      options={jabatanOptions}
                      defaultValue={formData.jabatan}
                      onChange={(val) => handleSelectChange('jabatan', val)}
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Jenis Kelamin <span className="text-error-500">*</span></label>
                  <Select 
                      options={jkOptions}
                      defaultValue={formData.jenis_kelamin}
                      onChange={(val) => handleSelectChange('jenis_kelamin', val)}
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nomor Telepon</label>
                <Input 
                  name="nomor_telepon"
                  value={formData.nomor_telepon}
                  onChange={handleInputChange}
                  placeholder="08xxxxxxxx"
                />
              </div>

              <div className="flex items-center gap-3 mt-7 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800">
                <input 
                  type="checkbox" 
                  id="aktif" 
                  name="aktif"
                  checked={formData.aktif}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="aktif" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  {formData.aktif ? "Pegawai Aktif" : "Pegawai Non Aktif"} <span className="text-xs text-gray-500 block">Tandai jika pegawai ini aktif bertugas</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={handleCloseModal} type="button">
                Batal
              </Button>
              <Button variant="primary" type="submit">
                {editingData ? "Simpan Perubahan" : "Tambah Pegawai"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Detail */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        className="max-w-2xl"
      >
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white/90 pb-4 border-b border-gray-100 dark:border-gray-800">
            Detail Pegawai
          </h3>
          {viewingData && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Profil Pegawai</h4>
                <DataRow label="Nama Lengkap" value={viewingData.nama_lengkap} />
                <DataRow label="NIP" value={viewingData.nip} />
                <DataRow label="Email" value={viewingData.email} />
                <DataRow label="Jabatan" value={JABATAN_MAP[viewingData.jabatan] || "Tidak Diketahui"} />
                <DataRow label="Jenis Kelamin" value={JK_MAP[viewingData.jenis_kelamin] || "-"} />
                <DataRow label="Nomor Telepon" value={viewingData.nomor_telepon} />
                <DataRow label="Golongan" value={viewingData.golongan !== undefined && viewingData.golongan !== null ? GOLONGAN_MAP[viewingData.golongan] : "-"} />
                <DataRow label="Instansi" value={instansiList.find(i => i.cadisdik_id === viewingData.cadisdik_id)?.nama_instansi || "Instansi Tidak Ditemukan"} />
                <DataRow label="Status Akun" value={viewingData.aktif ? "Aktif" : "Non-Aktif"} />
              </div>
              
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informasi Sistem</h4>
                <p className="text-[10px] text-gray-400 mb-2 italic">* ID ini digunakan otomatis oleh sistem untuk referensi database.</p>
                <DataRow label="ID Referensi Sistem" value={viewingData.pegawai_id} isID />
              </div>
            </div>
          )}
          <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DataRow({ label, value, isID = false }: { label: string; value: any; isID?: boolean }) {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
        title: "Tersalin!",
        text: "ID telah disalin ke papan klip",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[150px]">{label}</span>
      <div className="flex items-center gap-2 sm:justify-end flex-1">
        <span className={`text-sm font-semibold text-gray-800 dark:text-gray-200 break-all ${isID ? 'font-mono bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded text-xs' : ''}`}>
          {isID && value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : (value || "-")}
        </span>
        {isID && value && (
          <button 
            onClick={() => handleCopy(value)}
            className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            title="Salin ID"
          >
            <CopyIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
