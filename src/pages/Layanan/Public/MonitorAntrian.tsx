import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { mandalaService, Antrian } from "../../../services/mandalaService";

export default function MonitorAntrian() {
  const [searchParams] = useSearchParams();
  const cadisdik_id = searchParams.get("cadisdik_id") || "";

  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    if (!cadisdik_id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await mandalaService.getAntrian({ 
        cadisdik_id,
        start_date: today,
        end_date: today
      });
      setAntrian(res.data || []);
    } catch (error) {
      console.error("Gagal memuat antrian monitor:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto refresh setiap 5 detik
    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);
    return () => clearInterval(interval);
  }, [cadisdik_id]);

  if (!cadisdik_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <h2 className="text-3xl font-bold text-gray-500">Konfigurasi Monitor Tidak Valid (ID Instansi Kosong)</h2>
      </div>
    );
  }

  // Pisahkan antrian berdasarkan status
  // 1: Dipanggil, 2: Dilayani -> Tampilkan di layar utama
  // 0: Menunggu -> Tampilkan di daftar tunggu
  const dipanggil = antrian.find(a => a.status === 1 || a.status === 2);
  const menunggu = antrian.filter(a => a.status === 0).slice(0, 5); // Ambil 5 antrian berikutnya

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800/80 border-b border-gray-700/50 py-6 px-10 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
            <span className="font-bold text-2xl text-white">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-wide text-white">SIMAK KCD</h1>
            <p className="text-gray-400 text-sm font-medium">Sistem Informasi Manajemen Antrian</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-white tracking-wider">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6">
        
        {/* Left Side - Currently Called */}
        <div className="flex-[2] flex flex-col bg-gray-800/50 rounded-3xl border border-gray-700/50 p-10 justify-center items-center relative overflow-hidden shadow-2xl">
          {dipanggil ? (
            <>
              <div className="absolute inset-0 bg-brand-500/5 animate-pulse rounded-3xl pointer-events-none"></div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-400 mb-8 uppercase tracking-widest">Nomor Antrian</h2>
              <div className="bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-[3rem] w-full max-w-2xl py-20 px-10 text-center shadow-[0_0_100px_rgba(59,130,246,0.2)] transform transition-transform hover:scale-105 duration-500">
                <span className="text-[10rem] sm:text-[14rem] font-black leading-none drop-shadow-lg block">
                  #{dipanggil.nomor_antrian}
                </span>
              </div>
              <div className="mt-12 text-center space-y-4">
                <h3 className="text-5xl font-bold text-white capitalize">{dipanggil.nama_lengkap || dipanggil.nama_tamu}</h3>
                <p className="text-2xl text-brand-400 font-medium tracking-wide uppercase">
                  Layanan: {dipanggil.kategori?.nama || "Umum"}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center opacity-50">
              <span className="text-8xl block mb-6">☕</span>
              <h2 className="text-4xl font-bold text-gray-400 mb-2">Belum Ada Panggilan</h2>
              <p className="text-xl text-gray-500">Petugas kami akan segera melayani Anda.</p>
            </div>
          )}
        </div>

        {/* Right Side - Waiting List & Video */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Video Placeholder */}
          <div className="bg-black rounded-3xl border border-gray-700/50 aspect-video flex items-center justify-center overflow-hidden shadow-xl relative group">
             {/* You can replace this with an actual <video> tag */}
             <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-900 opacity-50"></div>
             <div className="text-center relative z-10">
               <span className="text-5xl mb-4 block opacity-50">🎬</span>
               <p className="text-gray-500 font-medium">Video Informasi KCD</p>
             </div>
          </div>

          {/* Waiting List */}
          <div className="flex-1 bg-gray-800/50 rounded-3xl border border-gray-700/50 p-6 sm:p-8 flex flex-col shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-3 h-8 bg-brand-500 rounded-full block"></span>
              Daftar Tunggu
            </h3>
            
            <div className="space-y-4 flex-1">
              {menunggu.length > 0 ? (
                menunggu.map((item, idx) => (
                  <div key={item.id || item.antrian_id || idx} className="bg-gray-700/30 rounded-2xl p-5 flex items-center justify-between border border-gray-600/30">
                    <div className="flex items-center gap-5">
                      <div className="bg-gray-800 text-brand-400 font-black text-3xl px-4 py-2 rounded-xl border border-gray-600/50 min-w-[80px] text-center">
                        {item.nomor_antrian}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-200 capitalize truncate max-w-[200px] sm:max-w-[300px]">
                          {item.nama_lengkap || item.nama_tamu}
                        </h4>
                        <p className="text-sm text-gray-400">{item.kategori?.nama || "Umum"}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-lg">
                  Tidak ada antrian berikutnya.
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer / Running Text */}
      <footer className="bg-brand-600 text-white py-3 overflow-hidden whitespace-nowrap shadow-[0_-10px_30px_rgba(0,0,0,0.3)] relative z-20">
        <div className="inline-block animate-[marquee_20s_linear_infinite] text-lg font-medium tracking-wider">
          Selamat datang di Kantor Cabang Dinas Pendidikan. Mohon siapkan dokumen persyaratan Anda sebelum maju ke loket pelayanan. Harap menunggu panggilan sesuai dengan nomor antrian Anda. Terima kasih atas pengertian dan kesabaran Anda.
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
