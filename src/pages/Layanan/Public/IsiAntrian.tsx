import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import Swal from "sweetalert2";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { mandalaService, KategoriKeperluan } from "../../../services/mandalaService";
import { dapodikService } from "../../../services/dapodikService";

export interface TicketReceiptData {
  nomor_antrian: string | number;
  nama_lengkap: string;
  unit_instansi?: string;
  keperluan: string;
  kategori_nama: string;
  waktu: string;
  instansi_nama: string;
}

export default function IsiAntrian() {
  const [searchParams] = useSearchParams();
  const cadisdik_id = searchParams.get("cadisdik_id") || "";

  const [kategori, setKategori] = useState<KategoriKeperluan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instansiName, setInstansiName] = useState("");
  const [createdTicket, setCreatedTicket] = useState<TicketReceiptData | null>(null);

  const [formData, setFormData] = useState({
    cadisdik_id: cadisdik_id,
    kategori_keperluan_id: "",
    nama_lengkap: "",
    unit_instansi: "",
    keperluan: "",
    nomor_hp: "",
  });

  useEffect(() => {
    if (!cadisdik_id) {
      Swal.fire(
        "Akses Ditolak",
        "ID Instansi tidak ditemukan. Silakan *scan QR Code* atau gunakan *link* yang valid.",
        "error"
      );
      setLoading(false);
      return;
    }

    const initPage = async () => {
      // 1. Fetch categories (Public, only requires x-mandala-key)
      try {
        const kategoriRes = await mandalaService.getKategoriKeperluan(cadisdik_id);
        setKategori(kategoriRes.data || []);
      } catch (catError) {
        console.error("Gagal memuat kategori keperluan:", catError);
      }

      // 2. Fetch instansi name (Requires auth, will fail/fallback gracefully for guests)
      try {
        const instansiRes = await dapodikService.getCadisdik();
        const matched = (instansiRes.data || []).find((i: any) => i.cadisdik_id === cadisdik_id);
        setInstansiName(matched ? matched.nama_instansi : "Kantor Cabang Dinas Pendidikan");
      } catch (instansiError) {
        console.warn("Gagal memuat nama instansi (menggunakan fallback):", instansiError);
        setInstansiName("Kantor Cabang Dinas Pendidikan");
      }

      setLoading(false);
    };

    initPage();
  }, [cadisdik_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kategori_keperluan_id) {
      Swal.fire("Peringatan", "Pilih kategori keperluan terlebih dahulu", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await mandalaService.createAntrian(formData);
      const nomorAntrian = response?.data?.nomor_antrian || "-";
      
      const categoryObj = kategori.find(
        (cat) => (cat.kategori_keperluan_id || cat.id || cat.kategori_id || "") === formData.kategori_keperluan_id
      );
      const categoryName = categoryObj ? categoryObj.nama : "Pelayanan Umum";
      
      const ticket: TicketReceiptData = {
        nomor_antrian: nomorAntrian,
        nama_lengkap: formData.nama_lengkap,
        unit_instansi: formData.unit_instansi || "Pribadi / Umum",
        keperluan: formData.keperluan,
        kategori_nama: categoryName,
        waktu: new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        instansi_nama: instansiName || "Kantor Cabang Dinas Pendidikan",
      };
      setCreatedTicket(ticket);
    } catch (error: any) {
      Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan sistem.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const printThermalReceipt = (ticket: TicketReceiptData) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Cetak Antrean</title>
            <style>
              @page {
                size: 58mm auto;
                margin: 0;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 58mm;
                margin: 0;
                padding: 10px 5px;
                box-sizing: border-box;
                text-align: center;
                font-size: 11px;
                color: #000;
                line-height: 1.3;
              }
              .instansi {
                font-weight: bold;
                font-size: 11px;
                text-transform: uppercase;
                margin-bottom: 2px;
              }
              .divider {
                border-bottom: 1px dashed #000;
                margin: 8px 0;
              }
              .label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .number {
                font-size: 32px;
                font-weight: bold;
                margin: 8px 0;
              }
              .kategori {
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 8px;
              }
              .details {
                text-align: left;
                font-size: 9px;
                margin: 8px 0;
              }
              .details-row {
                margin-bottom: 3px;
                word-wrap: break-word;
              }
              .footer {
                font-size: 8px;
                margin-top: 10px;
                line-height: 1.2;
              }
            </style>
          </head>
          <body>
            <div class="instansi">${ticket.instansi_nama}</div>
            <div class="divider"></div>
            <div class="label">NOMOR ANTRIAN</div>
            <div class="number">#${ticket.nomor_antrian}</div>
            <div class="kategori">${ticket.kategori_nama}</div>
            <div class="divider"></div>
            <div class="details">
              <div class="details-row"><strong>Nama:</strong> ${ticket.nama_lengkap}</div>
              <div class="details-row"><strong>Asal:</strong> ${ticket.unit_instansi || "-"}</div>
              <div class="details-row"><strong>Tujuan:</strong> ${ticket.keperluan}</div>
              <div class="details-row"><strong>Waktu:</strong> ${ticket.waktu}</div>
            </div>
            <div class="divider"></div>
            <div class="footer">
              Silakan tunggu nomor Anda dipanggil.<br>
              Terima kasih atas kunjungan Anda.
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.frameElement.remove();
                }, 1000);
              }
            <\/script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  const handleClose = () => {
    setCreatedTicket(null);
    setFormData({
      cadisdik_id: cadisdik_id,
      kategori_keperluan_id: "",
      nama_lengkap: "",
      unit_instansi: "",
      keperluan: "",
      nomor_hp: "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!cadisdik_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Tidak Valid</h2>
          <p className="text-gray-500 mb-6">Link form antrian ini memerlukan parameter instansi yang valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-8 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Buku Tamu Instansi</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            {instansiName || "Silakan lengkapi formulir di bawah ini untuk mengambil nomor antrian pelayanan."}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Layanan yang Dituju <span className="text-error-500">*</span>
              </label>
              <Select
                options={kategori.map((k) => ({
                  value: k.kategori_keperluan_id || k.id || k.kategori_id || "",
                  label: k.nama,
                }))}
                onChange={(val) => setFormData((prev) => ({ ...prev, kategori_keperluan_id: val }))}
                placeholder="Pilih Kategori Layanan"
                value={formData.kategori_keperluan_id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Lengkap <span className="text-error-500">*</span>
              </label>
              <Input
                name="nama_lengkap"
                value={formData.nama_lengkap}
                onChange={handleInputChange}
                required
                placeholder="Masukkan nama lengkap sesuai identitas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Asal Instansi / Keterangan
              </label>
              <Input
                name="unit_instansi"
                value={formData.unit_instansi}
                onChange={handleInputChange}
                placeholder="Contoh: PT. Maju Jaya / Masyarakat Umum"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Maksud dan Tujuan Kunjungan <span className="text-error-500">*</span>
              </label>
              <textarea
                name="keperluan"
                className="w-full px-4 py-3 text-sm bg-transparent border border-gray-300 rounded-xl dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-gray-800 dark:text-white/90 transition-all resize-none"
                rows={3}
                value={formData.keperluan}
                onChange={handleInputChange}
                required
                placeholder="Jelaskan maksud kedatangan Anda secara singkat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                name="nomor_hp"
                type="tel"
                value={formData.nomor_hp}
                onChange={handleInputChange}
                placeholder="Contoh: 081234567890"
              />
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="submit"
                size="md"
                className="w-full py-4 text-base font-bold shadow-md hover:shadow-lg transition-shadow"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Ambil Nomor Antrian"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400 font-medium">
        &copy; {new Date().getFullYear()} MANDALA. Sistem Informasi Manajemen Antrian.
      </p>

      {createdTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-sm flex flex-col items-center animate-[scaleIn_0.3s_ease-out] gap-6">
            <div className="w-full receipt-paper shadow-2xl text-gray-800 p-6 flex flex-col select-none">
              <div className="text-center">
                <h3 className="font-extrabold text-[11px] text-gray-500 uppercase tracking-widest leading-none">
                  STRUK ANTRIAN
                </h3>
                <h2 className="font-bold text-xs text-gray-900 mt-2 uppercase tracking-wide leading-tight px-2">
                  {createdTicket.instansi_nama}
                </h2>
                <div className="receipt-divider my-4"></div>
              </div>

              <div className="text-center py-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-none">
                  NOMOR ANTRIAN
                </span>
                <span className="text-5xl font-black text-brand-600 tracking-tight block my-3 font-sans">
                  #{createdTicket.nomor_antrian}
                </span>
                <span className="text-sm font-bold text-gray-700 block leading-tight">
                  {createdTicket.kategori_nama}
                </span>
                <div className="receipt-divider my-4"></div>
              </div>

              <div className="space-y-2.5 text-xs text-gray-700 text-left font-mono">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
                    NAMA TAMU
                  </span>
                  <span className="font-semibold text-gray-900">{createdTicket.nama_lengkap}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
                    ASAL INSTANSI
                  </span>
                  <span className="font-semibold text-gray-900">{createdTicket.unit_instansi || "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
                    DETAIL TUJUAN
                  </span>
                  <span className="font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {createdTicket.keperluan}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">
                    WAKTU CETAK
                  </span>
                  <span className="font-semibold text-gray-900">{createdTicket.waktu}</span>
                </div>
              </div>

              <div className="receipt-divider my-4"></div>

              <div className="text-center opacity-85">
                <svg viewBox="0 0 100 25" className="w-48 h-10 mx-auto text-black" fill="currentColor">
                  <rect x="0" y="0" width="2" height="25" />
                  <rect x="3" y="0" width="1" height="25" />
                  <rect x="5" y="0" width="4" height="25" />
                  <rect x="10" y="0" width="2" height="25" />
                  <rect x="13" y="0" width="1" height="25" />
                  <rect x="15" y="0" width="3" height="25" />
                  <rect x="20" y="0" width="1" height="25" />
                  <rect x="22" y="0" width="2" height="25" />
                  <rect x="25" y="0" width="4" height="25" />
                  <rect x="31" y="0" width="1" height="25" />
                  <rect x="33" y="0" width="3" height="25" />
                  <rect x="38" y="0" width="2" height="25" />
                  <rect x="42" y="0" width="1" height="25" />
                  <rect x="44" y="0" width="4" height="25" />
                  <rect x="50" y="0" width="2" height="25" />
                  <rect x="53" y="0" width="1" height="25" />
                  <rect x="55" y="0" width="3" height="25" />
                  <rect x="60" y="0" width="1" height="25" />
                  <rect x="62" y="0" width="2" height="25" />
                  <rect x="65" y="0" width="4" height="25" />
                  <rect x="71" y="0" width="1" height="25" />
                  <rect x="73" y="0" width="3" height="25" />
                  <rect x="78" y="0" width="2" height="25" />
                  <rect x="82" y="0" width="1" height="25" />
                  <rect x="84" y="0" width="4" height="25" />
                  <rect x="90" y="0" width="2" height="25" />
                  <rect x="93" y="0" width="1" height="25" />
                  <rect x="95" y="0" width="3" height="25" />
                </svg>
                <span className="text-[7px] font-mono tracking-widest text-gray-500 mt-1 block">
              MNDLA-QP-{createdTicket.nomor_antrian}
                </span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3 px-2 z-10 mt-2">
              <p className="text-center text-xs text-white/90 font-medium mb-1 drop-shadow-sm">
                📸 Silakan ambil tangkapan layar (screenshot) sebagai bukti antrean Anda
              </p>
              <button
                onClick={() => printThermalReceipt(createdTicket)}
                className="flex items-center justify-center gap-2 w-full bg-success-600 hover:bg-success-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Cetak Struk Antrean
              </button>
              <button
                onClick={handleClose}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-3.5 px-6 rounded-2xl transition-colors backdrop-blur-md cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .receipt-paper {
          background-color: #faf9f6;
          background-image: radial-gradient(#eceae6 1px, transparent 0), radial-gradient(#eceae6 1px, #faf9f6 0);
          background-size: 8px 8px;
          background-position: 0 0, 4px 4px;
          position: relative;
          border-radius: 12px 12px 0 0;
          border: 1px solid #e3dec3;
          border-bottom: none;
        }
        .receipt-paper::after {
          content: "";
          position: absolute;
          bottom: -12px;
          left: -1px;
          right: -1px;
          height: 12px;
          background: linear-gradient(-135deg, #faf9f6 6px, transparent 0), linear-gradient(135deg, #faf9f6 6px, transparent 0);
          background-size: 12px 24px;
        }
        .receipt-divider {
          border-bottom: 1px dashed #cfcaad;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9) translateY(15px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
