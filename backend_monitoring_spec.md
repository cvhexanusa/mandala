# Spesifikasi Backend: Fitur Monitoring Pengawas

Dokumen ini berisi rancangan skema basis data (database schema) dan spesifikasi *endpoint* API untuk fitur **Jadwal Monitoring** yang dikhususkan bagi Pengawas Pembina.

---

## 1. Skema Basis Data (Database Schema)

Untuk mendukung fitur monitoring ini, kita memerlukan tabel untuk menyimpan data jadwal monitoring. Kita berasumsi sudah ada tabel `pegawai` (untuk data pengawas) dan tabel `sekolah` (untuk data sekolah binaan), serta tabel `mapping_pengawas` untuk menghubungkan pengawas ke sekolah binaan mereka.

### A. Tabel `jadwal_monitoring`
Tabel ini digunakan untuk mencatat agenda, sekolah target, dan rentang tanggal pelaksanaan monitoring oleh pengawas.

| Nama Kolom | Tipe Data | Atribut | Keterangan |
| :--- | :--- | :--- | :--- |
| `jadwal_monitoring_id` | `UUID` | Primary Key, Default: `uuid_generate_v4()` | ID unik untuk setiap jadwal. |
| `pegawai_id` | `UUID` | Foreign Key (ke `pegawai.pegawai_id`) | ID pengawas yang menjadwalkan/melakukan monitoring. |
| `sekolah_id` | `UUID` | Foreign Key (ke `sekolah.sekolah_id`) | ID sekolah binaan yang menjadi target monitoring. |
| `tanggal_mulai` | `DATE` / `TIMESTAMP` | NOT NULL | Tanggal mulai monitoring. |
| `tanggal_selesai` | `DATE` / `TIMESTAMP` | NOT NULL | Tanggal selesai monitoring (untuk rentang waktu). |
| `agenda` | `TEXT` | NOT NULL | Tujuan atau agenda kegiatan monitoring. |
| `keterangan` | `TEXT` | NULL | Catatan tambahan atau hasil ringkas (jika diperlukan). |
| `status` | `VARCHAR(20)` | Default: `'scheduled'` | Status jadwal (`'scheduled'`, `'completed'`, `'cancelled'`). |
| `created_at` | `TIMESTAMP` | Default: `NOW()` | Waktu pembuatan data. |
| `updated_at` | `TIMESTAMP` | Default: `NOW()` | Waktu pembaruan terakhir data. |

---

## 2. Spesifikasi API Endpoints

### A. Dapatkan Daftar Sekolah Binaan Pengawas
*Endpoint* ini digunakan pada form untuk menampilkan daftar sekolah yang dibina oleh pengawas yang sedang login.

* **URL:** `/api/mandala/pengawas/sekolah-binaan`
* **Method:** `GET`
* **Headers:**
  ```http
  Authorization: Bearer <token_jwt>
  x-mandala-key: <api_key>
  ```
* **Response (Success - `200 OK`):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "sekolah_id": "8f7c90fd-3517-46f7-98a7-56df1b5bf2c3",
        "nama": "SMK Negeri 1 Cianjur",
        "npsn": "20202911"
      },
      {
        "sekolah_id": "9a3e87ab-1290-4bf8-87ac-45fa8b9c1d01",
        "nama": "SMK Negeri 2 Cianjur",
        "npsn": "20202912"
      }
    ]
  }
  ```

---

### B. CRUD Jadwal Monitoring

#### 1. Dapatkan Daftar Jadwal Monitoring
Mengambil semua jadwal monitoring. Dapat difilter berdasarkan pengawas, rentang tanggal, atau sekolah.

* **URL:** `/api/mandala/monitoring/jadwal`
* **Method:** `GET`
* **Headers:**
  ```http
  Authorization: Bearer <token_jwt>
  ```
* **Query Params (Opsional):**
  * `start_date` (Format: `YYYY-MM-DD`)
  * `end_date` (Format: `YYYY-MM-DD`)
  * `sekolah_id` (UUID)
  * `pegawai_id` (UUID - bagi admin untuk melihat jadwal pengawas tertentu. Bagi peran Pengawas, backend otomatis menyaring berdasarkan ID pengawas dari JWT).
* **Response (Success - `200 OK`):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "jadwal_monitoring_id": "c757fe0e-83b5-41d1-b986-4ec39a0a99b1",
        "pegawai_id": "c757fe0e-83b5-41d1-b986-4ec39a0a99b1",
        "sekolah_id": "8f7c90fd-3517-46f7-98a7-56df1b5bf2c3",
        "tanggal_mulai": "2026-07-20",
        "tanggal_selesai": "2026-07-22",
        "agenda": "Supervisi Akademik Guru Kelas X",
        "keterangan": "Fokus pada modul ajar Kurikulum Merdeka",
        "status": "scheduled",
        "sekolah": {
          "nama": "SMK Negeri 1 Cianjur",
          "npsn": "20202911"
        },
        "pegawai": {
          "nama_lengkap": "Drs. H. Ahmad Fauzi, M.Pd",
          "nip": "197005121995031002"
        }
      }
    ]
  }
  ```

#### 2. Buat Jadwal Monitoring Baru
* **URL:** `/api/mandala/monitoring/jadwal`
* **Method:** `POST`
* **Headers:**
  ```http
  Authorization: Bearer <token_jwt>
  Content-Type: application/json
  ```
* **Request Body:**
  ```json
  {
    "sekolah_id": "8f7c90fd-3517-46f7-98a7-56df1b5bf2c3",
    "tanggal_mulai": "2026-07-20",
    "tanggal_selesai": "2026-07-22",
    "agenda": "Supervisi Akademik Guru Kelas X",
    "keterangan": "Fokus pada modul ajar Kurikulum Merdeka"
  }
  ```
* **Response (Created - `201 Created`):**
  ```json
  {
    "status": "success",
    "message": "Jadwal monitoring berhasil dibuat",
    "data": {
      "jadwal_monitoring_id": "c757fe0e-83b5-41d1-b986-4ec39a0a99b1",
      "pegawai_id": "c757fe0e-83b5-41d1-b986-4ec39a0a99b1",
      "sekolah_id": "8f7c90fd-3517-46f7-98a7-56df1b5bf2c3",
      "tanggal_mulai": "2026-07-20",
      "tanggal_selesai": "2026-07-22",
      "agenda": "Supervisi Akademik Guru Kelas X",
      "keterangan": "Fokus pada modul ajar Kurikulum Merdeka",
      "status": "scheduled"
    }
  }
  ```

#### 3. Update Jadwal Monitoring
* **URL:** `/api/mandala/monitoring/jadwal/:id`
* **Method:** `PATCH` / `PUT`
* **Request Body (semua opsional):**
  ```json
  {
    "tanggal_mulai": "2026-07-21",
    "tanggal_selesai": "2026-07-23",
    "agenda": "Supervisi Kurikulum & Kesiapan UKK",
    "status": "completed"
  }
  ```
* **Response (Success - `200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Jadwal monitoring berhasil diperbarui"
  }
  ```

#### 4. Hapus Jadwal Monitoring
* **URL:** `/api/mandala/monitoring/jadwal/:id`
* **Method:** `DELETE`
* **Response (Success - `200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Jadwal monitoring berhasil dihapus"
  }
  ```

---

## 3. Catatan Migrasi Menu & Hak Akses
Karena aplikasi menggunakan basis data untuk otorisasi menu (`/mandala/menu-roles`), backend developer perlu memasukkan baris baru di seeder atau tabel konfigurasi menu:

1. **Menu Key Baru:**
   - `monitoring` (Tingkat Utama / Parent Menu)
   - `monitoring-jadwal` (Sub Menu)
2. **Jabatan ID Pengawas:** `6` (Pengawas)
3. Maka, perlu dilakukan *insert* pemetaan hak akses untuk mengizinkan Pengawas mengakses menu-menu ini:
   ```sql
   INSERT INTO menu_roles (menu_key, jabatan_id) VALUES ('monitoring', 6);
   INSERT INTO menu_roles (menu_key, jabatan_id) VALUES ('monitoring-jadwal', 6);
   ```
