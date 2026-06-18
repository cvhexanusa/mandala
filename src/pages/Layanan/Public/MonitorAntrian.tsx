import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { mandalaService, Antrian } from "../../../services/mandalaService";
import Button from "../../../components/ui/button/Button";

export default function MonitorAntrian() {
  const [searchParams] = useSearchParams();
  const cadisdik_id = searchParams.get("cadisdik_id") || "";

  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const lastAnnouncedId = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sintesis Suara Bell (Ting-Tong) menggunakan Web Audio API
  const playChime = (count: number = 1) => {
    return new Promise<void>((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        const playNote = (freq: number, startTime: number, duration: number = 3.0) => {
          // Gabungan sine (lembut) dan triangle (tegas) agar suaranya mirip bel stasiun/bandara
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, startTime);
          
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05); // Attack cepat
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay panjang
          
          // Turunkan volume triangle agar tidak terlalu kasar
          const gainOsc2 = ctx.createGain();
          gainOsc2.gain.value = 0.2;
          osc2.connect(gainOsc2);
          
          osc1.connect(gain);
          gainOsc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + duration);
          osc2.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        let totalDurationMs = 0;

        if (count === 1) {
          // Bel Awal: Ding - Dong (E5 - C5)
          playNote(659.25, now, 2.5); // E5
          playNote(523.25, now + 0.6, 3.5); // C5
          totalDurationMs = 2500;
        } else {
          // Bel Akhir: Ding - Dong ... Ding - Dong (2x)
          playNote(659.25, now, 2.0);
          playNote(523.25, now + 0.5, 2.0);
          
          playNote(659.25, now + 1.5, 2.0);
          playNote(523.25, now + 2.0, 3.5);
          totalDurationMs = 4000;
        }

        // Tunggu sampai nada selesai baru resolve
        setTimeout(resolve, totalDurationMs);
      } catch (e) {
        console.error("Web Audio API not supported", e);
        resolve(); // Tetap lanjut baca teks jika audio gagal
      }
    });
  };

  const playAnnouncement = async (item: Antrian) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // 1. Mainkan Suara Bel Awal (Ding-Dong)
    await playChime(1);

    // 2. Mainkan Suara Robot (Text-to-Speech)
    await new Promise<void>((resolve) => {
      setIsSpeaking(true);
      const nomor = item.nomor_antrian;
      const nama = item.nama_lengkap || item.nama_tamu || "Tamu";
      const layanan = item.kategori?.nama || item.kategori_keperluan?.nama || "Pelayanan Umum";

      const textToSpeak = `Nomor antrian,, ${nomor},, atas nama,, ${nama},, silakan menuju loket,, ${layanan}.`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'id-ID';
      utterance.rate = 0.85; 
      utterance.pitch = 1;
      utterance.volume = 1;

      // Tunggu sampai AI selesai bicara
      utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
      };
      utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
      };

      window.speechSynthesis.speak(utterance);
    });

    // 3. Mainkan Suara Bel Akhir (Ding-Dong 1x)
    await playChime(1);
  };

  const fetchQueue = async () => {
    if (!cadisdik_id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await mandalaService.getAntrian({ 
        cadisdik_id,
        start_date: today,
        end_date: today
      });
      
      const newData: Antrian[] = res.data || [];
      setAntrian(newData);

      // Cari status 1 (Dipanggil) ATAU 2 (Dilayani) untuk memastikan 
      // suara tidak terlewat jika admin mengklik terlalu cepat
      const activeQueue = newData.find(a => a.status === 1 || a.status === 2);
      if (activeQueue) {
        const id = activeQueue.id || activeQueue.antrian_id as string;
        if (id !== lastAnnouncedId.current) {
          playAnnouncement(activeQueue);
          lastAnnouncedId.current = id;
        }
      }

    } catch (error) {
      console.error("Gagal memuat antrian monitor:", error);
    } finally {
      setLoading(false);
    }
  };

  const lastRecallRef = useRef<string | null>(localStorage.getItem('recall_antrian_id'));

  useEffect(() => {
    if (!audioEnabled) return; 
    
    fetchQueue();
    const interval = setInterval(() => {
      fetchQueue();
      
      // Polling sinyal "Panggil Ulang" dari admin
      const currentRecall = localStorage.getItem('recall_antrian_id');
      if (currentRecall && currentRecall !== lastRecallRef.current) {
         lastRecallRef.current = currentRecall;
         const targetId = String(currentRecall.split('_')[0]);
         
         setAntrian(prevAntrian => {
            const targetQueue = prevAntrian.find(a => (String(a.id) === targetId || String(a.antrian_id) === targetId) && (a.status === 1 || a.status === 2));
            if (targetQueue) {
              lastAnnouncedId.current = null; // Paksa bunyi ulang
              playAnnouncement(targetQueue).then(() => {
                  lastAnnouncedId.current = targetId;
              });
            }
            return prevAntrian;
         });
      }

    }, 3000);
    return () => clearInterval(interval);
  }, [cadisdik_id, audioEnabled]);

  if (!cadisdik_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800 p-6 font-sans">
        <h2 className="text-3xl font-bold text-gray-400">Konfigurasi Monitor Tidak Valid (ID Instansi Kosong)</h2>
      </div>
    );
  }

  if (!audioEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6 font-sans">
         <div className="bg-white p-10 sm:p-14 rounded-[2rem] border border-gray-200 shadow-xl max-w-2xl text-center">
            <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Mulai Layar Monitor</h2>
            <p className="text-gray-500 mb-10 text-lg leading-relaxed px-4">
              Sistem membutuhkan izin Anda untuk dapat memainkan suara panggilan antrian otomatis. Silakan klik tombol di bawah untuk memulai.
            </p>
            <Button size="lg" className="w-full py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-shadow" onClick={() => setAudioEnabled(true)}>
              Aktifkan Suara & Mulai
            </Button>
         </div>
      </div>
    );
  }

  const dipanggil = antrian.find(a => a.status === 1 || a.status === 2);
  const menunggu = antrian.filter(a => a.status === 0).slice(0, 5);

  // Fungsi Fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-8 sm:px-12 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-md">
            <span className="font-extrabold text-3xl text-white">M</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">MANDALA</h1>
            <p className="text-brand-600 text-sm font-bold tracking-widest uppercase">Sistem Informasi Pelayanan Pendidikan</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-6">
          <button 
            onClick={toggleFullScreen}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Layar Penuh"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-wider tabular-nums leading-none">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="text-gray-500 text-sm font-semibold mt-1 uppercase tracking-wide">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 sm:p-8 gap-8 relative z-10">
        
        {/* Left Side - Currently Called */}
        <div className="flex-[5] flex flex-col bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-12 justify-center items-center relative overflow-hidden shadow-xl">
          {dipanggil ? (
            <div className="relative z-10 flex flex-col items-center w-full animate-in fade-in zoom-in duration-500">
              <div className={`font-bold px-8 py-3 rounded-full text-xl tracking-widest uppercase mb-10 border flex items-center gap-3 shadow-sm ${dipanggil.status === 1 ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-warning-50 text-warning-600 border-warning-200'}`}>
                {dipanggil.status === 1 ? (
                  <>
                    <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Sedang Dipanggil
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Sedang Dilayani
                  </>
                )}
              </div>
              
              <div className="text-[14rem] sm:text-[18rem] font-black leading-none tracking-tighter text-gray-900 mb-6 drop-shadow-sm">
                {dipanggil.nomor_antrian}
              </div>
              
              <div className="mt-6 text-center w-full max-w-4xl space-y-6">
                <h3 className="text-5xl sm:text-6xl font-extrabold text-gray-800 capitalize leading-tight px-4 truncate">
                  {dipanggil.nama_lengkap || dipanggil.nama_tamu}
                </h3>
                <div className="inline-block bg-gray-50 border border-gray-200 px-10 py-4 rounded-2xl mt-4 shadow-inner">
                  <p className="text-3xl text-gray-600 font-bold tracking-widest uppercase">
                    LOKET : <span className="text-brand-600">{dipanggil.kategori?.nama || dipanggil.kategori_keperluan?.nama || "Pelayanan Umum"}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-60 relative z-10 transition-opacity duration-1000">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-4xl font-extrabold text-gray-500 mb-3 tracking-tight">Belum Ada Panggilan</h2>
              <p className="text-2xl text-gray-400 font-medium">Petugas kami akan segera melayani Anda.</p>
            </div>
          )}
        </div>

        {/* Right Side - Information & Waiting List */}
        <div className="flex-[3] flex flex-col gap-8">
          
          {/* Information Card (Alur Pelayanan) */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col justify-center shadow-lg">
             <h3 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-wide">
               <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               Alur Pelayanan
             </h3>
             <div className="space-y-5">
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg shrink-0 border border-brand-100">1</div>
                 <div>
                   <h4 className="font-bold text-gray-800 text-lg">Ambil Nomor Antrian</h4>
                   <p className="text-sm text-gray-500 mt-0.5">Isi buku tamu melalui perangkat yang tersedia.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg shrink-0 border border-brand-100">2</div>
                 <div>
                   <h4 className="font-bold text-gray-800 text-lg">Tunggu Panggilan</h4>
                   <p className="text-sm text-gray-500 mt-0.5">Silakan duduk di ruang tunggu dengan nyaman.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg shrink-0 border border-brand-100">3</div>
                 <div>
                   <h4 className="font-bold text-gray-800 text-lg">Menuju Loket</h4>
                   <p className="text-sm text-gray-500 mt-0.5">Bawa berkas persyaratan saat nomor Anda dipanggil.</p>
                 </div>
               </div>
             </div>
          </div>

          {/* Waiting List */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-100 p-8 flex flex-col shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-gray-100">
              <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                <span className="w-2 h-8 bg-brand-500 rounded-full block"></span>
                Daftar Tunggu
              </h3>
              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">Selanjutnya</span>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {menunggu.length > 0 ? (
                menunggu.map((item, idx) => (
                  <div key={item.id || item.antrian_id || idx} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-100">
                    <div className="bg-white text-brand-600 font-black text-3xl w-[70px] h-[70px] rounded-xl border border-gray-200 flex items-center justify-center shadow-sm shrink-0">
                      {item.nomor_antrian}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-gray-800 capitalize truncate">
                        {item.nama_lengkap || item.nama_tamu}
                      </h4>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1 truncate">
                        {item.kategori?.nama || item.kategori_keperluan?.nama || "Umum"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-lg font-medium">Antrian Kosong</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer / Running Text */}
      <footer className="bg-brand-600 text-white py-4 overflow-hidden whitespace-nowrap shadow-inner relative z-20">
        <div className="inline-block animate-[marquee_25s_linear_infinite] text-xl font-medium tracking-wide">
          <span className="mx-8 text-brand-300">✦</span>
          Selamat datang di Kantor Cabang Dinas Pendidikan Wilayah.
          <span className="mx-8 text-brand-300">✦</span>
          Mohon siapkan dokumen persyaratan Anda sebelum menuju ke loket pelayanan.
          <span className="mx-8 text-brand-300">✦</span>
          Harap menunggu panggilan sesuai dengan nomor antrian Anda.
          <span className="mx-8 text-brand-300">✦</span>
          Terima kasih atas pengertian dan kesabaran Anda.
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
