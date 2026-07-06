import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import Swal from "sweetalert2";
import { dapodikService } from "../../services/dapodikService";

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, selectedIds }) => {
  const [activeTab, setActiveTab] = useState("Profil");
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    "Profil",
    "Data Periodik",
    "Orang Tua & Wali",
    "Dokumen",
  ];

  // Fetch Data from Backend
  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && selectedIds.length === 1) {
        setLoading(true);
        try {
          const result = await dapodikService.getPesertaDidikDetail(selectedIds[0]);
          if (result.status === "success" && result.data) {
            const data = result.data;
            setFormData({
              id: data.peserta_didik_id,
              nama: data.nama,
              tempatLahir: data.tempat_lahir || "",
              tanggalLahir: data.tanggal_lahir ? data.tanggal_lahir.split('T')[0] : "",
              jk: data.jenis_kelamin || "",
              nisn: data.nisn || "",
              nipd: data.nipd || "",
              nik: data.nik || "",
              noKK: data.no_kk || "",
              noAkte: data.no_registrasi_akta_lahir || "",
              kebutuhanKhusus: data.kebutuhan_khusus || "",
              agama: data.agama_id_str || "",
              anakKe: data.anak_keberapa || "",
              avatar: data.foto || "",
              jalan: data.alamat_jalan || "",
              rt: data.rt || "",
              rw: data.rw || "",
              provinsi: data.provinsi || "",
              kabupaten: data.kabupaten_kota || "",
              kecamatan: data.kecamatan || "",
              kodePos: data.kode_pos || "",
              tempatTinggal: data.jenis_tinggal_id_str || "",
              transportasi: data.alat_transportasi_id_str || "",
              lintang: data.lintang ? String(data.lintang) : "",
              bujur: data.bujur ? String(data.bujur) : "",
              penerimaKIP: data.penerima_kip || "",
              layakKIP: data.layak_pip || "",
              penerimaKPS: data.penerima_kps || "",
              noTelpRumah: data.nomor_telepon_rumah || "",
              noHp: data.nomor_telepon_seluler || "",
              noWa: data.no_wa || "",
              emailAktif: data.email || "",
              emailAkun: data.penggunas?.[0]?.email || "",
              tinggiBadan: data.tinggi_badan || "",
              beratBadan: data.berat_badan || "",
              lingkarKepala: data.lingkar_kepala || "",
              
              // Ayah
              namaAyah: data.nama_ayah || "",
              nikAyah: data.nik_ayah || "",
              pekerjaanAyah: data.pekerjaan_ayah_id_str || "",
              tahunLahirAyah: data.tahun_lahir_ayah || "",
              pendidikanAyah: data.pendidikan_ayah_id_str || "",
              penghasilanAyah: data.penghasilan_ayah_id_str || "",
              
              // Ibu
              namaIbu: data.nama_ibu_kandung || data.nama_ibu || "",
              nikIbu: data.nik_ibu || "",
              pekerjaanIbu: data.pekerjaan_ibu_id_str || "",
              tahunLahirIbu: data.tahun_lahir_ibu || "",
              pendidikanIbu: data.pendidikan_ibu_id_str || "",
              penghasilanIbu: data.penghasilan_ibu_id_str || "",
              
              // Wali
              namaWali: data.nama_wali || "",
              nikWali: data.nik_wali || "",
              pekerjaanWali: data.pekerjaan_wali_id_str || "",
              tahunLahirWali: data.tahun_lahir_wali || "",
              pendidikanWali: data.pendidikan_wali_id_str || "",
              penghasilanWali: data.penghasilan_wali_id_str || "",
            });
          }
        } catch (error) {
          Swal.fire("Error", "Gagal mengambil data peserta didik", "error");
        } finally {
          setLoading(false);
        }
      } else if (isOpen && selectedIds.length > 1) {
        setFormData({ nama: `${selectedIds.length} Data Terpilih` });
      }
    };

    fetchData();
  }, [isOpen, selectedIds]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        Swal.fire({ title: "File Terlalu Besar", text: "Ukuran foto maksimal adalah 500Kb", icon: "error", confirmButtonColor: "#465FFF" });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev: any) => ({ ...prev, avatar: previewUrl }));
    }
  };

  const handleSave = async () => {
    if (selectedIds.length !== 1) return;

    setLoading(true);
    try {
      const updatePayload = {
        nama: formData.nama,
        tempat_lahir: formData.tempatLahir,
        tanggal_lahir: formData.tanggalLahir ? new Date(formData.tanggalLahir) : null,
        jenis_kelamin: formData.jk,
        nisn: formData.nisn,
        nipd: formData.nipd,
        nik: formData.nik,
        no_kk: formData.noKK,
        no_registrasi_akta_lahir: formData.noAkte,
        kebutuhan_khusus: formData.kebutuhanKhusus,
        agama_id_str: formData.agama,
        anak_keberapa: formData.anakKe ? String(formData.anakKe) : null,
        foto: formData.avatar,
        alamat_jalan: formData.jalan,
        rt: formData.rt,
        rw: formData.rw,
        provinsi: formData.provinsi,
        kabupaten_kota: formData.kabupaten,
        kecamatan: formData.kecamatan,
        kode_pos: formData.kodePos,
        jenis_tinggal_id_str: formData.tempatTinggal,
        alat_transportasi_id_str: formData.transportasi,
        lintang: formData.lintang ? formData.lintang : null,
        bujur: formData.bujur ? formData.bujur : null,
        penerima_kip: formData.penerimaKIP,
        layak_pip: formData.layakKIP,
        penerima_kps: formData.penerimaKPS,
        nomor_telepon_rumah: formData.noTelpRumah,
        nomor_telepon_seluler: formData.noHp,
        no_wa: formData.noWa,
        email: formData.emailAktif,
        email_akun: formData.emailAkun,
        tinggi_badan: formData.tinggiBadan ? String(formData.tinggiBadan) : null,
        berat_badan: formData.beratBadan ? String(formData.beratBadan) : null,
        lingkar_kepala: formData.lingkarKepala ? Number(formData.lingkarKepala) : null,
        
        // Ayah
        nama_ayah: formData.namaAyah,
        nik_ayah: formData.nikAyah,
        pekerjaan_ayah_id_str: formData.pekerjaanAyah,
        tahun_lahir_ayah: formData.tahunLahirAyah ? String(formData.tahunLahirAyah) : null,
        pendidikan_ayah_id_str: formData.pendidikanAyah,
        penghasilan_ayah_id_str: formData.penghasilanAyah,
        
        // Ibu
        nama_ibu_kandung: formData.namaIbu,
        nama_ibu: formData.namaIbu,
        nik_ibu: formData.nikIbu,
        pekerjaan_ibu_id_str: formData.pekerjaanIbu,
        tahun_lahir_ibu: formData.tahunLahirIbu ? String(formData.tahunLahirIbu) : null,
        pendidikan_ibu_id_str: formData.pendidikanIbu,
        penghasilan_ibu_id_str: formData.penghasilanIbu,
        
        // Wali
        nama_wali: formData.namaWali,
        nik_wali: formData.nikWali,
        pekerjaan_wali_id_str: formData.pekerjaanWali,
        tahun_lahir_wali: formData.tahunLahirWali ? String(formData.tahunLahirWali) : null,
        pendidikan_wali_id_str: formData.pendidikanWali,
        penghasilan_wali_id_str: formData.penghasilanWali,
      };

      await dapodikService.updatePesertaDidik(selectedIds[0], updatePayload);
      onClose();
      Swal.fire({
        title: "Berhasil",
        text: "Data Berhasil disimpan",
        icon: "success",
        confirmButtonColor: "#465FFF",
      });
    } catch (error) {
      Swal.fire("Error", "Gagal menyimpan data", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[800px] p-0 overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={handleFileChange} />
      
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.05]">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Ubah Data Peserta Didik {selectedIds.length === 1 ? `- ${formData.nama}` : `(${selectedIds.length} Data)`}
        </h3>
      </div>

      <div className="px-6 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? "text-brand-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {activeTab === "Profil" && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/3 flex flex-col items-center border-r border-gray-100 dark:border-white/[0.05] pr-8">
              <div className="relative group">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
                  {formData.avatar ? <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" /> : <img src="/images/user/owner.jpg" alt="Profile Fallback" className="w-full h-full object-cover opacity-60" />}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 p-2 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
              </div>
              <p className="mt-4 text-xs text-gray-700 dark:text-gray-400 text-center italic">
                Format: JPG, JPEG, PNG. <br/>Maksimal 500Kb.
              </p>
              <Button variant="outline" size="sm" className="mt-4 w-full text-gray-800" onClick={() => fileInputRef.current?.click()}>Ganti Foto</Button>
            </div>
            <div className="w-full lg:w-2/3 space-y-6">
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                  <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Identitas Pribadi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.nama || ""} placeholder="Masukkan Nama Lengkap" onChange={(e) => handleInputChange("nama", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Tempat Lahir</Label><Input value={formData.tempatLahir || ""} placeholder="Masukkan Tempat Lahir" onChange={(e) => handleInputChange("tempatLahir", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Tgl Lahir</Label><Input type="date" value={formData.tanggalLahir || ""} onChange={(e) => handleInputChange("tanggalLahir", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Jenis Kelamin</Label><Select value={formData.jk} options={[{value:"L",label:"Laki-laki"},{value:"P",label:"Perempuan"}]} onChange={(val) => handleInputChange("jk", val)} /></div>
                  <div className="space-y-2"><Label>NISN</Label><Input value={formData.nisn || ""} placeholder="NISN harus 10 digit" maxLength={10} onChange={(e) => handleInputChange("nisn", e.target.value)} /></div>
                  <div className="space-y-2"><Label>NIPD</Label><Input value={formData.nipd || ""} placeholder="Masukkan NIPD" onChange={(e) => handleInputChange("nipd", e.target.value)} /></div>
                  <div className="space-y-2"><Label>NIK</Label><Input value={formData.nik || ""} placeholder="NIK harus 16 digit" maxLength={16} onChange={(e) => handleInputChange("nik", e.target.value)} /></div>
                  <div className="space-y-2"><Label>No. Kartu Keluarga</Label><Input value={formData.noKK || ""} placeholder="Nomor KK harus 16 digit" maxLength={16} onChange={(e) => handleInputChange("noKK", e.target.value)} /></div>
                  <div className="space-y-2"><Label>No. Register Akte Lahir</Label><Input value={formData.noAkte || ""} placeholder="Masukkan Nomor Register Akta Lahir" onChange={(e) => handleInputChange("noAkte", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Berkebutuhan Khusus</Label><Input value={formData.kebutuhanKhusus || ""} placeholder="Masukkan Kebutuhan Khusus" onChange={(e) => handleInputChange("kebutuhanKhusus", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Agama</Label><Input value={formData.agama || ""} placeholder="Masukkan Agama" onChange={(e) => handleInputChange("agama", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Anak ke-</Label><Input type="number" value={formData.anakKe || ""} placeholder="Contoh: 1" onChange={(e) => handleInputChange("anakKe", e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                  <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Alamat dan Tempat Tinggal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Jalan atau Kampung</Label><Input value={formData.jalan || ""} onChange={(e) => handleInputChange("jalan", e.target.value)} /></div>
                  <div className="space-y-2"><Label>RT</Label><Input value={formData.rt || ""} onChange={(e) => handleInputChange("rt", e.target.value)} /></div>
                  <div className="space-y-2"><Label>RW</Label><Input value={formData.rw || ""} onChange={(e) => handleInputChange("rw", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Provinsi</Label><Input value={formData.provinsi || ""} onChange={(e) => handleInputChange("provinsi", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Kab./Kota</Label><Input value={formData.kabupaten || ""} onChange={(e) => handleInputChange("kabupaten", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Kecamatan</Label><Input value={formData.kecamatan || ""} onChange={(e) => handleInputChange("kecamatan", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Kode Pos</Label><Input value={formData.kodePos || ""} onChange={(e) => handleInputChange("kodePos", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Tempat Tinggal</Label><Input value={formData.tempatTinggal || ""} onChange={(e) => handleInputChange("tempatTinggal", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Transportasi</Label><Input value={formData.transportasi || ""} onChange={(e) => handleInputChange("transportasi", e.target.value)} /></div>
                  <div className="col-span-full grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Lintang</Label><Input value={formData.lintang || ""} onChange={(e) => handleInputChange("lintang", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Bujur</Label><Input value={formData.bujur || ""} onChange={(e) => handleInputChange("bujur", e.target.value)} /></div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                  <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Kesejahteraan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Penerima KIP</Label><Input value={formData.penerimaKIP || ""} onChange={(e) => handleInputChange("penerimaKIP", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Layak KIP</Label><Input value={formData.layakKIP || ""} onChange={(e) => handleInputChange("layakKIP", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Penerima KPS/PKH</Label><Input value={formData.penerimaKPS || ""} onChange={(e) => handleInputChange("penerimaKPS", e.target.value)} /></div>
                </div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                  <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Kontak
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>No. Telp. Rumah</Label><Input value={formData.noTelpRumah || ""} onChange={(e) => handleInputChange("noTelpRumah", e.target.value)} /></div>
                  <div className="space-y-2"><Label>No. Handphone</Label><Input value={formData.noHp || ""} onChange={(e) => handleInputChange("noHp", e.target.value)} /></div>
                  <div className="space-y-2"><Label>No. Whatsapp</Label><Input value={formData.noWa || ""} onChange={(e) => handleInputChange("noWa", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email Aktif</Label><Input type="email" value={formData.emailAktif || ""} onChange={(e) => handleInputChange("emailAktif", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email Akun</Label><Input type="email" value={formData.emailAkun || ""} onChange={(e) => handleInputChange("emailAkun", e.target.value)} /></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "Data Periodik" && (
          <div className="space-y-6">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-3 1m0 0l3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                Data Fisik
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Tinggi Badan (cm)</Label><Input type="number" value={formData.tinggiBadan || ""} onChange={(e) => handleInputChange("tinggiBadan", e.target.value)} /></div>
                <div className="space-y-2"><Label>Berat Badan (kg)</Label><Input type="number" value={formData.beratBadan || ""} onChange={(e) => handleInputChange("beratBadan", e.target.value)} /></div>
                <div className="space-y-2"><Label>Lingkar Kepala (cm)</Label><Input type="number" value={formData.lingkarKepala || ""} onChange={(e) => handleInputChange("lingkarKepala", e.target.value)} /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Orang Tua & Wali" && (
          <div className="space-y-8">
            {/* Data Ayah */}
            <div className="space-y-6">
              <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Data Ayah
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.namaAyah || ""} onChange={(e) => handleInputChange("namaAyah", e.target.value)} /></div>
                <div className="space-y-2"><Label>NIK</Label><Input value={formData.nikAyah || ""} onChange={(e) => handleInputChange("nikAyah", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pekerjaan</Label><Input value={formData.pekerjaanAyah || ""} onChange={(e) => handleInputChange("pekerjaanAyah", e.target.value)} /></div>
                <div className="space-y-2"><Label>Tahun Lahir</Label><Input type="number" value={formData.tahunLahirAyah || ""} onChange={(e) => handleInputChange("tahunLahirAyah", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pendidikan</Label><Input value={formData.pendidikanAyah || ""} onChange={(e) => handleInputChange("pendidikanAyah", e.target.value)} /></div>
                <div className="space-y-2"><Label>Penghasilan</Label><Input value={formData.penghasilanAyah || ""} onChange={(e) => handleInputChange("penghasilanAyah", e.target.value)} /></div>
              </div>
            </div>

            {/* Data Ibu */}
            <div className="space-y-6 border-t border-gray-100 dark:border-white/[0.05] pt-8">
              <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Data Ibu
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.namaIbu || ""} onChange={(e) => handleInputChange("namaIbu", e.target.value)} /></div>
                <div className="space-y-2"><Label>NIK</Label><Input value={formData.nikIbu || ""} onChange={(e) => handleInputChange("nikIbu", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pekerjaan</Label><Input value={formData.pekerjaanIbu || ""} onChange={(e) => handleInputChange("pekerjaanIbu", e.target.value)} /></div>
                <div className="space-y-2"><Label>Tahun Lahir</Label><Input type="number" value={formData.tahunLahirIbu || ""} onChange={(e) => handleInputChange("tahunLahirIbu", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pendidikan</Label><Input value={formData.pendidikanIbu || ""} onChange={(e) => handleInputChange("pendidikanIbu", e.target.value)} /></div>
                <div className="space-y-2"><Label>Penghasilan</Label><Input value={formData.penghasilanIbu || ""} onChange={(e) => handleInputChange("penghasilanIbu", e.target.value)} /></div>
              </div>
            </div>

            {/* Data Wali */}
            <div className="space-y-6 border-t border-gray-100 dark:border-white/[0.05] pt-8">
              <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90 mb-4">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Data Wali
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.namaWali || ""} onChange={(e) => handleInputChange("namaWali", e.target.value)} /></div>
                <div className="space-y-2"><Label>NIK</Label><Input value={formData.nikWali || ""} onChange={(e) => handleInputChange("nikWali", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pekerjaan</Label><Input value={formData.pekerjaanWali || ""} onChange={(e) => handleInputChange("pekerjaanWali", e.target.value)} /></div>
                <div className="space-y-2"><Label>Tahun Lahir</Label><Input type="number" value={formData.tahunLahirWali || ""} onChange={(e) => handleInputChange("tahunLahirWali", e.target.value)} /></div>
                <div className="space-y-2"><Label>Pendidikan</Label><Input value={formData.pendidikanWali || ""} onChange={(e) => handleInputChange("pendidikanWali", e.target.value)} /></div>
                <div className="space-y-2"><Label>Penghasilan</Label><Input value={formData.penghasilanWali || ""} onChange={(e) => handleInputChange("penghasilanWali", e.target.value)} /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Dokumen" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Ijazah Sekolah Asal</Label>
              <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-white/[0.05] dark:file:text-white dark:hover:file:bg-white/[0.1] border border-gray-200 dark:border-gray-800 rounded-lg h-11 px-2" />
            </div>
            <div className="space-y-2">
              <Label>Kartu Keluarga</Label>
              <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-white/[0.05] dark:file:text-white dark:hover:file:bg-white/[0.1] border border-gray-200 dark:border-gray-800 rounded-lg h-11 px-2" />
            </div>
            <div className="space-y-2">
              <Label>Akta Kelahiran</Label>
              <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-white/[0.05] dark:file:text-white dark:hover:file:bg-white/[0.1] border border-gray-200 dark:border-gray-800 rounded-lg h-11 px-2" />
            </div>
            <div className="space-y-2">
              <Label>KTP Ayah</Label>
              <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-white/[0.05] dark:file:text-white dark:hover:file:bg-white/[0.1] border border-gray-200 dark:border-gray-800 rounded-lg h-11 px-2" />
            </div>
            <div className="space-y-2">
              <Label>KTP Ibu</Label>
              <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-white/[0.05] dark:file:text-white dark:hover:file:bg-white/[0.1] border border-gray-200 dark:border-gray-800 rounded-lg h-11 px-2" />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.05] flex justify-end gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-400">
          Batal
        </button>
        <Button onClick={handleSave} disabled={loading}>Simpan Perubahan</Button>
      </div>
    </Modal>
  );
};

export default EditStudentModal;
