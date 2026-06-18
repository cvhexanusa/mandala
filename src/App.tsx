import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import MandalaDashboard from "./pages/Dashboard/MandalaDashboard";
import SchoolProfile from "./pages/DataMaster/SchoolProfile";
import SchoolData from "./pages/DataMaster/SchoolData";
import SchoolDetailPage from "./pages/DataMaster/SchoolDetailPage";
import SpasialData from "./pages/DataMaster/SpasialData";
import RekapitulasiSekolah from "./pages/DataMaster/RekapitulasiSekolah";
import StudentData from "./pages/DataMaster/StudentData";
import StudentDetailPage from "./pages/DataMaster/StudentDetailPage";
import GTKData from "./pages/DataMaster/GTKData";
import GTKDetailPage from "./pages/DataMaster/GTKDetailPage";
import ClassData from "./pages/DataMaster/ClassData";
import SubjectData from "./pages/DataMaster/SubjectData";
import SarprasData from "./pages/DataMaster/SarprasData";
import TahunPelajaran from "./pages/Academic/TahunPelajaran";
import KompetensiPage from "./pages/Academic/KompetensiPage";
import GTKCardPage from "./pages/Academic/GTKCardPage";
import PDCardPage from "./pages/DataMaster/PDCardPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ApiSyncPage from "./pages/OtherPage/ApiSyncPage";
import SyncGuard from "./components/common/SyncGuard";
import PengaturanJam from "./pages/Kurikulum/PengaturanJam";
import JadwalPelajaran from "./pages/Kurikulum/JadwalPelajaran";
import PresensiPD from "./pages/Kurikulum/Presensi/PresensiPD";
import PresensiGTK from "./pages/Kurikulum/Presensi/PresensiGTK";
import HariLibur from "./pages/Kurikulum/Presensi/HariLibur";
import Scanner from "./pages/Kurikulum/Presensi/Scanner";
import IzinSakit from "./pages/Kurikulum/Presensi/IzinSakit";
import ComponentPlaceholder from "./components/common/ComponentPlaceholder";
import ProfileView from "./components/UserProfile/ProfileView";
import InstansiView from "./components/school/InstansiView";
import TablePlaceholder from "./components/common/TablePlaceholder";

import DataPegawai from "./pages/Kepegawaian/DataPegawai";
import MappingPengawasPage from "./pages/PKKS/MappingPengawas";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";

function HomeRedirect() {
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Auth Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard Layout */}
        <Route
          element={
            <ProtectedRoute>
              <SyncGuard>
                <AppLayout />
              </SyncGuard>
            </ProtectedRoute>
          }
        >
          {/* Redirect root to role-based dashboard */}
          <Route path="/" element={<HomeRedirect />} />
          
          <Route path="/:role">
            <Route index element={<MandalaDashboard />} />

            {/* Profile */}
            <Route path="profile" element={<ProfileView />} />
            <Route path="profil-instansi" element={<InstansiView />} />

            {/* Kepegawaian */}
            <Route path="kepegawaian/data-pegawai" element={<DataPegawai />} />
            <Route path="kepegawaian/tugas-pegawai" element={<TablePlaceholder title="Tugas Pegawai" columns={["Nama", "Tugas Utama", "Tugas Tambahan"]} />} />

            {/* Satuan Pendidikan */}
            <Route path="satuan-pendidikan/data" element={<SchoolData />} />
            <Route path="satuan-pendidikan/detail/:id" element={<SchoolDetailPage />} />
            <Route path="satuan-pendidikan/spasial" element={<SpasialData />} />
            <Route path="satuan-pendidikan/rekapitulasi" element={<RekapitulasiSekolah />} />

            {/* PKKS */}
            <Route path="pkks/mapping-pengawas" element={<MappingPengawasPage />} />
            <Route path="pkks/instrumen" element={<TablePlaceholder title="Instrumen Penilaian" columns={["Nama Instrumen", "Kategori", "Tahun"]} />} />
            <Route path="pkks/bank-soal" element={<TablePlaceholder title="Bank Soal PKKS" columns={["Kode Soal", "Pertanyaan", "Kompetensi"]} />} />

            {/* GTK */}
            <Route path="gtk/guru" element={<GTKData />} />
            <Route path="gtk/tendik" element={<GTKData />} />
            <Route path="gtk/rekapitulasi" element={<GTKData />} />
            <Route path="gtk/non-aktif" element={<GTKData />} />
            <Route path="gtk/detail" element={<GTKDetailPage />} />

            {/* Peserta Didik */}
            <Route path="peserta-didik/data" element={<StudentData />} />
            <Route path="peserta-didik/detail" element={<StudentDetailPage />} />
            <Route path="peserta-didik/rekapitulasi" element={<StudentData />} />
            <Route path="peserta-didik/non-aktif" element={<StudentData />} />

            {/* Layanan */}
            <Route path="layanan/gtk" element={<TablePlaceholder title="Layanan GTK" columns={["Jenis Layanan", "Pemohon", "Status Pengajuan"]} />} />
            <Route path="layanan/peserta-didik" element={<TablePlaceholder title="Layanan Peserta Didik" columns={["Jenis Layanan", "Siswa", "Status"]} />} />

            {/* Laporan Absensi */}
            <Route path="laporan-absensi/gtk" element={<PresensiGTK />} />
            <Route path="laporan-absensi/peserta-didik" element={<PresensiPD />} />
            <Route path="laporan-absensi/rekap-terpadu" element={<ComponentPlaceholder title="Rekap Terpadu" description="Grafik dan rekapitulasi absensi seluruh warga sekolah." />} />

            {/* Dokumen Layanan */}
            <Route path="dokumen-layanan" element={<TablePlaceholder title="Dokumen Layanan" columns={["Nama Dokumen", "Kategori", "Tgl Upload"]} />} />

            {/* Administrasi Surat */}
            <Route path="administrasi-surat/masuk" element={<TablePlaceholder title="Surat Masuk" columns={["No. Surat", "Asal Surat", "Perihal", "Tgl Terima"]} />} />
            <Route path="administrasi-surat/keluar" element={<TablePlaceholder title="Surat Keluar" columns={["No. Surat", "Tujuan", "Perihal", "Tgl Keluar"]} />} />
            <Route path="administrasi-surat/arsip" element={<TablePlaceholder title="Arsip Surat" columns={["Kode Arsip", "Judul Arsip", "Tahun"]} />} />
            <Route path="administrasi-surat/template" element={<TablePlaceholder title="Template Surat" columns={["Nama Template", "Kategori", "Preview"]} />} />

            {/* Daftar Antrian */}
            <Route path="daftar-antrian" element={<TablePlaceholder title="Daftar Antrian" columns={["No. Antrian", "Nama Pemohon", "Keperluan", "Status"]} />} />

            {/* Pelaporan dan Dokumen */}
            <Route path="pelaporan-dokumen" element={<TablePlaceholder title="Pelaporan dan Dokumen" columns={["Nama Laporan", "Periode", "Status Laporan"]} />} />

            {/* Data Master (Legacy) */}
            <Route path="school-profile" element={<SchoolProfile />} />
            <Route path="gtk-data" element={<GTKData />} />
            <Route path="student-data" element={<StudentData />} />
            <Route path="class-data" element={<ClassData />} />
            <Route path="subject-data" element={<SubjectData />} />
            <Route path="sarpras-data" element={<SarprasData />} />

            {/* Academic */}
            <Route path="academic/year" element={<TahunPelajaran />} />
            <Route path="academic/competency" element={<KompetensiPage />} />
            <Route path="gtk-card" element={<GTKCardPage />} />
            <Route path="student-card" element={<PDCardPage />} />

            {/* Kurikulum */}
            <Route path="kurikulum/pengaturan-jam" element={<PengaturanJam />} />
            <Route path="kurikulum/jadwal-pelajaran" element={<JadwalPelajaran />} />
            <Route path="kurikulum/presensi/scanner" element={<Scanner />} />
            <Route path="kurikulum/presensi/pesertadidik" element={<PresensiPD />} />
            <Route path="kurikulum/presensi/gtk" element={<PresensiGTK />} />
            <Route path="kurikulum/presensi/mapel" element={<Blank />} />
            <Route path="kurikulum/presensi/izin" element={<IzinSakit />} />
            <Route path="kurikulum/presensi/hari-libur" element={<HariLibur />} />

            {/* Other */}
            <Route path="sync-api" element={<ApiSyncPage />} />
          </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
