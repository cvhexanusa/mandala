import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { mandalaService, Antrian } from "../../../services/mandalaService";
import Button from "../../../components/ui/button/Button";


// SIBI Video Playlist Player for Queue Number Signs
const SIBIVideoPlayer = ({ 
  queueNumber, 
  isPlaying, 
  onSequenceEnded 
}: { 
  queueNumber: string; 
  isPlaying: boolean; 
  onSequenceEnded?: () => void;
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  
  const items = React.useMemo(() => {
    const chars = String(queueNumber || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
    
    const res = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char >= '0' && char <= '9') {
        const paddedNum = char === '0' ? '10' : `0${char}`;
        res.push({
          type: 'video',
          char: char,
          url: `https://pkplk.kemendikdasmen.go.id/sibi/SIBI/angka/${paddedNum}.webm`
        });
      } else if (char >= 'A' && char <= 'Z') {
        res.push({
          type: 'image',
          char: char,
          url: `https://pkplk.kemendikdasmen.go.id/sibi/SIBI/abjad/${char}.png`
        });
      }
    }
    return res;
  }, [queueNumber]);

  useEffect(() => {
    setActiveIdx(0);
  }, [queueNumber, isPlaying]);

  useEffect(() => {
    if (!isPlaying || items.length === 0 || activeIdx >= items.length) return;
    
    const current = items[activeIdx];
    if (current.type === 'image') {
      const timer = setTimeout(() => {
        if (activeIdx < items.length - 1) {
          setActiveIdx(prev => prev + 1);
        } else if (onSequenceEnded) {
          onSequenceEnded();
        }
      }, 2000); // Show static letter for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [activeIdx, items, isPlaying, onSequenceEnded]);

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-brand-950 text-white p-4">
        <p className="text-xs text-brand-300">Tidak ada isyarat antrean</p>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d2a54] p-6 relative rounded-xl overflow-hidden shadow-inner">
        <div className="relative w-24 h-24 flex items-center justify-center mb-5">
          <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full opacity-35 bg-white"></span>
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-md">
            <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
        </div>
        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest text-center">Menunggu Pengucapan...</span>
        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1 text-center">SIBI Translator Standby</span>
      </div>
    );
  }

  const currentItem = items[activeIdx % items.length];

  return (
    <div className="relative w-full h-full bg-brand-950 border border-brand-100 flex flex-col items-center justify-center shadow-md select-none rounded-xl overflow-hidden">
      {currentItem.type === 'video' ? (
        <video
          key={`${activeIdx}-${currentItem.url}`}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={() => {
            if (activeIdx < items.length - 1) {
              setActiveIdx(prev => prev + 1);
            } else if (onSequenceEnded) {
              onSequenceEnded();
            }
          }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d2a54] p-4 relative">
          <img
            src={currentItem.url}
            alt={`Isyarat Huruf ${currentItem.char}`}
            className="h-4/5 object-contain drop-shadow-lg"
          />
          <div className="absolute bottom-8 bg-brand-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-md uppercase tracking-wider">
            Isyarat Huruf: {currentItem.char}
          </div>
        </div>
      )}

      {/* Bottom overlay gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

      {/* SIBI Badge & Active Char indicator */}
      <div className="absolute top-4 left-4 bg-brand-600/90 backdrop-blur-xs text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
        Isyarat SIBI: {currentItem.char}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/45 backdrop-blur-xs px-3 py-1.5 rounded-full text-white text-[8px] font-black tracking-wider uppercase shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-ping"></span>
        Aktif
      </div>

      {/* Playlist Progress Indicators */}
      <div className="absolute bottom-3 left-4 right-4 flex gap-1.5 justify-center z-10">
        {items.map((item, idx) => (
          <span
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              activeIdx === idx ? 'w-5 bg-brand-500' : 'w-1.5 bg-white/40 hover:bg-white/60'
            }`}
            title={`Langkah ${idx + 1}: ${item.char}`}
          />
        ))}
      </div>
    </div>
  );
};

export default function MonitorAntrian() {
  const [searchParams] = useSearchParams();
  const cadisdik_id = searchParams.get("cadisdik_id") || "";

  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const antrianRef = useRef<Antrian[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    antrianRef.current = antrian;
  }, [antrian]);
  
  // Custom Voice Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [selectedEnVoiceName, setSelectedEnVoiceName] = useState<string>("");
  const [isBilingual, setIsBilingual] = useState<boolean>(false);
  const [showSignAssistant, setShowSignAssistant] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(0.85);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSignChar, setActiveSignChar] = useState<string>("");
  
  const lastAnnouncedId = useRef<string | null>(null);

  // Break/Istirahat state for temporary closure
  const [monitorStatus, setMonitorStatus] = useState(() => localStorage.getItem("monitor_status") || "buka");
  const prevStatusRef = useRef(monitorStatus);
  const ytPlayerRef = useRef<any>(null);
  const isInitialRun = useRef<boolean>(true);
  const [playBreakMusic, setPlayBreakMusic] = useState<boolean>(true);
  const [isStatusAnnouncing, setIsStatusAnnouncing] = useState<boolean>(false);
  const [isPlayingSignVideo, setIsPlayingSignVideo] = useState<boolean>(false);
  const [statusAnnounced, setStatusAnnounced] = useState<boolean>(false);

  // Educational Comic Public Service Announcements (Iklan Layanan Masyarakat)
  const [activeComicIdx, setActiveComicIdx] = useState(0);
  const comicAnnouncements = [
    {
      title: "Budayakan Membaca Sejak Dini",
      tagline: "Buku adalah Jendela Dunia",
      desc: "Membaca melatih konsentrasi, memperluas wawasan, dan menstimulasi kreativitas anak untuk masa depan yang gemilang.",
      image: "/edu_comic_literacy.png"
    },
    {
      title: "Kerja Sama Kunci Keberhasilan",
      tagline: "Kolaborasi & Kreativitas",
      desc: "Belajar kelompok melatih empati, menghargai perbedaan pendapat, dan memecahkan tantangan melalui inovasi bersama.",
      image: "/edu_comic_teamwork.png"
    },
    {
      title: "Hormati Guru & Sayangi Sesama",
      tagline: "Pendidikan Karakter & Moral",
      desc: "Pendidikan bukan hanya soal kecerdasan akademis, melainkan pembentukan akhlak mulia dan kepedulian sosial di lingkungan sekolah.",
      image: "/edu_comic_respect.png"
    },
    {
      title: "Alur Pelayanan Antrean",
      tagline: "Tertib & Nyaman Melayani",
      desc: "Ambil nomor antrean di mesin cetak buku tamu, tunggu panggilan di ruang tunggu dengan tertib, dan menuju loket ketika nomor Anda dipanggil.",
      image: "/edu_comic_queue_flow.png"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveComicIdx(prev => (prev + 1) % comicAnnouncements.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Weather state
  const [weatherLocation, setWeatherLocation] = useState("BANDUNG");
  const [weather, setWeather] = useState({
    temp: 29.5,
    humidity: 78,
    code: 2, // 0: Cerah, 1-3: Berawan, 51-67: Hujan, 80+: Hujan Deras/Storm
    condition: "Berawan"
  });

  const fetchWeather = async () => {
    // Helper to query Open-Meteo weather coordinates once resolved
    const fetchWeatherWithCoords = async (lat: number, lon: number, cityName: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`);
        if (res.ok) {
          const data = await res.json();
          const current = data.current;
          const code = current.weather_code;
          
          let condition = "Berawan";
          if (code === 0) condition = "Cerah";
          else if (code >= 1 && code <= 3) condition = "Cerah Berawan";
          else if (code >= 45 && code <= 48) condition = "Kabut";
          else if (code >= 51 && code <= 67) condition = "Hujan";
          else if (code >= 80 && code <= 82) condition = "Hujan Deras";
          else if (code >= 95) condition = "Hujan Badai";

          setWeather({
            temp: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            code: code,
            condition: condition
          });
          setWeatherLocation(cityName.toUpperCase());
        } else {
          throw new Error("Open-Meteo API response not ok");
        }
      } catch (weatherErr) {
        console.error("Failed to fetch weather for coordinates:", weatherErr);
        throw weatherErr;
      }
    };

    // Helper to fallback to IP-based location geocoding
    const fetchViaIP = async () => {
      // Try freeipapi.com first (HTTPS, very fast, direct JSON)
      try {
        const ipRes = await fetch("https://freeipapi.com/api/json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.latitude && ipData.longitude) {
            await fetchWeatherWithCoords(ipData.latitude, ipData.longitude, ipData.cityName || "BANDUNG");
            return;
          }
        }
      } catch (err) {
        console.warn("freeipapi lookup failed, trying backup...", err);
      }

      // Backup: ipwho.is
      try {
        const ipRes = await fetch("https://ipwho.is/");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.success && ipData.latitude && ipData.longitude) {
            await fetchWeatherWithCoords(ipData.latitude, ipData.longitude, ipData.city || "BANDUNG");
            return;
          }
        }
      } catch (err) {
        console.warn("ipwho.is lookup failed, trying next backup...", err);
      }

      // Final local simulation fallback if completely offline or blocked
      runSimulatedWeather("BANDUNG");
    };

    const runSimulatedWeather = (cityName: string) => {
      setWeatherLocation(cityName.toUpperCase());
      const hour = new Date().getHours();
      let temp = 26;
      let humidity = 85;
      let condition = "Cerah Berawan";
      let code = 2;

      if (hour >= 6 && hour < 12) {
        temp = 25 + (hour - 6) * 1.2;
        humidity = 85 - (hour - 6) * 3;
      } else if (hour >= 12 && hour < 15) {
        temp = 32 - (hour - 12) * 0.5;
        humidity = 65;
      } else if (hour >= 15 && hour < 18) {
        temp = 30 - (hour - 15) * 1.5;
        humidity = 70 + (hour - 15) * 4;
      } else {
        temp = 24;
        humidity = 88;
        condition = "Cerah";
        code = 0;
      }
      setWeather({ temp, humidity, code, condition });
    };

    // Try HTML5 Browser Geolocation first (triggers popup prompt)
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Reverse geocode the coords to find city name using BigDataCloud
          let detectedCity = "LOKASI ANDA";
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              detectedCity = geoData.city || geoData.principalSubdivision || geoData.locality || "LOKASI ANDA";
            }
          } catch (geoErr) {
            console.warn("Failed to reverse geocode coordinate city name:", geoErr);
          }

          try {
            await fetchWeatherWithCoords(lat, lon, detectedCity);
          } catch (weatherErr) {
            await fetchViaIP();
          }
        },
        async (error) => {
          console.warn("Browser Geolocation permission denied or failed, falling back to IP:", error);
          await fetchViaIP();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 }
      );
    } else {
      await fetchViaIP();
    }
  };

  useEffect(() => {
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) {
      return (
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500 animate-[spin_10s_linear_infinite]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2h-2a1 1 0 0 1-1-1Zm0 15a1 1 0 0 1 1 1v1.5a1 1 0 0 1-2 0V18a1 1 0 0 1 1-1ZM3 12a1 1 0 0 1 1-1h1.5a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1Zm15 0a1 1 0 0 1 1-1h1.5a1 1 0 0 1 0 2H19a1 1 0 0 1-1-1ZM5.64 5.64a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41L5.64 7.05a1 1 0 0 1 0-1.41Zm10.29 10.29a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41ZM5.64 18.36a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 0 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0Zm10.29-10.29a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 0 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0Z"/>
          </svg>
        </div>
      );
    }
    if (code >= 1 && code <= 3) {
      return (
        <div className="relative w-9 h-8 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-500 absolute -top-1 -right-0.5 animate-[spin_15s_linear_infinite]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11ZM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>
          </svg>
          <svg className="w-7 h-7 text-gray-400 absolute top-1.5 left-0.5 animate-[weatherCloud_4s_ease-in-out_infinite]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.36 10.04a6 6 0 0 0-11.18-2.62A4.5 4.5 0 0 0 9 16.25h9.5A3.75 3.75 0 0 0 19.36 10.04Z"/>
          </svg>
        </div>
      );
    }
    return (
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-500 absolute -top-0.5 left-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.36 10.04a6 6 0 0 0-11.18-2.62A4.5 4.5 0 0 0 9 16.25h9.5A3.75 3.75 0 0 0 19.36 10.04Z"/>
        </svg>
        <div className="absolute top-6 left-2 flex gap-1.5">
          <span className="w-0.5 h-2.5 bg-blue-400 rounded-full animate-[weatherRain_1.2s_ease-in-out_infinite_0s]"></span>
          <span className="w-0.5 h-2.5 bg-blue-400 rounded-full animate-[weatherRain_1.2s_ease-in-out_infinite_0.3s]"></span>
          <span className="w-0.5 h-2.5 bg-blue-400 rounded-full animate-[weatherRain_1.2s_ease-in-out_infinite_0.6s]"></span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle through queue number characters for active sign spelling
  useEffect(() => {
    const dipanggil = antrian.find(a => a.status === 1 || a.status === 2);
    if (!isSpeaking || !dipanggil) {
      setActiveSignChar("");
      return;
    }

    const queueStr = String(dipanggil.nomor_antrian || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();
    
    if (queueStr.length === 0) {
      setActiveSignChar("");
      return;
    }

    let idx = 0;
    setActiveSignChar(queueStr[0]);

    const interval = setInterval(() => {
      idx = (idx + 1) % queueStr.length;
      setActiveSignChar(queueStr[idx]);
    }, 1200);

    return () => clearInterval(interval);
  }, [isSpeaking, antrian]);

  // Load voices dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        
        // Filter Indonesian voices (lang starts with id or includes id)
        const idVoices = availableVoices.filter(v => 
          v.lang.toLowerCase().includes("id") || 
          v.lang.toLowerCase().startsWith("id")
        );

        // Filter English voices (lang starts with en or includes en)
        const englishVoices = availableVoices.filter(v => 
          v.lang.toLowerCase().includes("en") || 
          v.lang.toLowerCase().startsWith("en")
        );
        
        // Fallback to all voices if no Indonesian voice is found
        const displayVoices = idVoices.length > 0 ? idVoices : availableVoices;
        setVoices(displayVoices);
        setEnVoices(englishVoices.length > 0 ? englishVoices : availableVoices);

        // Load preferred voice from localStorage
        const savedVoiceName = localStorage.getItem("preferred_queue_voice");
        const savedEnVoiceName = localStorage.getItem("preferred_queue_en_voice");
        const savedRate = localStorage.getItem("preferred_queue_rate");
        const savedBilingual = localStorage.getItem("preferred_queue_bilingual");
        const savedSign = localStorage.getItem("preferred_queue_sign_assistant");
        
        if (savedRate) {
          setSpeechRate(parseFloat(savedRate));
        }

        if (savedBilingual) {
          setIsBilingual(savedBilingual === "true");
        }

        if (savedSign) {
          setShowSignAssistant(savedSign === "true");
        }

        const savedBreakMusic = localStorage.getItem("preferred_queue_break_music");
        if (savedBreakMusic) {
          setPlayBreakMusic(savedBreakMusic === "true");
        }

        // Setup Indonesian Voice
        if (savedVoiceName && displayVoices.some(v => v.name === savedVoiceName)) {
          setSelectedVoiceName(savedVoiceName);
        } else if (displayVoices.length > 0) {
          const googleVoice = displayVoices.find(v => 
            v.lang.toLowerCase().includes("id") && 
            v.name.toLowerCase().includes("google")
          );
          const naturalVoice = displayVoices.find(v => 
            v.lang.toLowerCase().includes("id") && 
            v.name.toLowerCase().includes("natural")
          );
          const anyIdVoice = displayVoices.find(v => v.lang.toLowerCase().includes("id"));
          
          const defaultVoice = googleVoice || naturalVoice || anyIdVoice || displayVoices[0];
          setSelectedVoiceName(defaultVoice.name);
        }

        // Setup English Voice
        const displayEnVoices = englishVoices.length > 0 ? englishVoices : availableVoices;
        if (savedEnVoiceName && displayEnVoices.some(v => v.name === savedEnVoiceName)) {
          setSelectedEnVoiceName(savedEnVoiceName);
        } else if (displayEnVoices.length > 0) {
          const googleEn = displayEnVoices.find(v => 
            v.name.toLowerCase().includes("google") && 
            (v.lang.toLowerCase().includes("us") || v.lang.toLowerCase().includes("gb"))
          );
          const naturalEn = displayEnVoices.find(v => v.name.toLowerCase().includes("natural"));
          const defaultEn = googleEn || naturalEn || displayEnVoices[0];
          setSelectedEnVoiceName(defaultEn.name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const saveSettings = (voiceName: string, rate: number, bilingual: boolean, enVoiceName: string, signAssistant: boolean, breakMusic: boolean = playBreakMusic) => {
    localStorage.setItem("preferred_queue_voice", voiceName);
    localStorage.setItem("preferred_queue_rate", String(rate));
    localStorage.setItem("preferred_queue_bilingual", String(bilingual));
    localStorage.setItem("preferred_queue_en_voice", enVoiceName);
    localStorage.setItem("preferred_queue_sign_assistant", String(signAssistant));
    localStorage.setItem("preferred_queue_break_music", String(breakMusic));
  };

  const playTestAnnouncement = (voiceName: string, rate: number, isBilingualTest: boolean = false, enVoiceName: string = "") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    const textToSpeak = "Tes nomor antrian satu, silakan menuju loket pelayanan.";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "id-ID";
    utterance.rate = rate;
    
    const voice = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.onend = () => {
      if (isBilingualTest) {
        setTimeout(() => {
          const textToSpeakEn = "Queue number one, please proceed to the service counter.";
          const utteranceEn = new SpeechSynthesisUtterance(textToSpeakEn);
          utteranceEn.lang = "en-US";
          utteranceEn.rate = rate;
          
          const voiceEn = window.speechSynthesis.getVoices().find(v => v.name === enVoiceName);
          if (voiceEn) {
            utteranceEn.voice = voiceEn;
          }
          window.speechSynthesis.speak(utteranceEn);
        }, 800);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Render Hand Sign Vector SVG
  const renderHandSign = (char: string) => {
    const c = char.toUpperCase();
    switch (c) {
      case "A":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="22" y="24" width="20" height="24" rx="4" />
            <path d="M22,30 H42 M22,36 H42 M22,42 H42" />
            <path d="M22,32 C17,32 17,26 22,26" />
          </svg>
        );
      case "B":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V28 C22,28 22,12 25,12 C28,12 28,28 28,28 V24 C28,24 28,10 31,10 C34,10 34,24 34,24 V24 C34,24 34,10 37,10 C40,10 40,24 40,24 V28 C40,28 40,14 43,14 C46,14 46,28 46,48 Z" />
            <path d="M22,38 C27,38 31,38 31,42" />
          </svg>
        );
      case "C":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26,54 L26,56 A3,3 0 0,0 29,59 L39,59 A3,3 0 0,0 42,56 L42,54" />
            <path d="M44,16 C30,16 22,22 22,32 C22,42 30,48 44,48" />
            <path d="M42,22 C34,22 28,26 28,32 C28,38 34,42 42,42" />
          </svg>
        );
      case "D":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="22" y="10" width="6" height="22" rx="3" />
            <path d="M28,32 C34,32 38,34 38,40 C38,46 34,48 28,48 Z" />
            <circle cx="31" cy="40" r="3" fill="currentColor" />
          </svg>
        );
      case "E":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="22" y="24" width="20" height="24" rx="4" />
            <path d="M22,28 C28,26 36,26 42,28 M22,34 C28,32 36,32 42,34 M22,40 C28,38 36,38 42,40" />
            <path d="M22,44 H38" />
          </svg>
        );
      case "0":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M32,12 C40,12 44,18 44,28 C44,38 40,44 32,44 C24,44 20,38 20,28 C20,18 24,12 32,12 Z" />
            <path d="M32,20 C36,20 38,23 38,28 C38,33 36,36 32,36 C28,36 26,33 26,28 C26,23 28,20 32,20 Z" fill="currentColor" fillOpacity="0.1" />
          </svg>
        );
      case "1":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V32 H42 V48 Z" />
            <rect x="22" y="10" width="6" height="22" rx="3" />
            <path d="M28,38 H42 M28,43 H42" />
            <path d="M22,40 C28,40 30,42 30,46" />
          </svg>
        );
      case "2":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V32 H42 V48 Z" />
            <rect x="22" y="10" width="6" height="22" rx="3" />
            <rect x="30" y="8" width="6" height="24" rx="3" />
            <path d="M36,38 H42 M36,43 H42" />
            <path d="M22,40 C28,40 30,42 30,46" />
          </svg>
        );
      case "3":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V32 H42 V48 Z" />
            <rect x="22" y="10" width="5" height="22" rx="2.5" />
            <rect x="29" y="8" width="5" height="24" rx="2.5" />
            <rect x="36" y="12" width="5" height="20" rx="2.5" />
            <path d="M41,38 H42 V43 H41" />
            <path d="M22,40 C28,40 30,42 30,46" />
          </svg>
        );
      case "4":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="22" y="12" width="4.5" height="20" rx="2" />
            <rect x="28" y="10" width="4.5" height="22" rx="2" />
            <rect x="34" y="12" width="4.5" height="20" rx="2" />
            <rect x="40" y="14" width="4.5" height="18" rx="2" />
            <path d="M22,48 H44.5 V32 H22 Z" />
            <path d="M22,38 C28,38 30,40 30,44" />
          </svg>
        );
      case "5":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V32 C22,32 24,32 26,34 V48 H26" />
            <rect x="24" y="14" width="4.5" height="18" rx="2" />
            <rect x="30" y="10" width="4.5" height="22" rx="2" />
            <rect x="36" y="12" width="4.5" height="20" rx="2" />
            <rect x="42" y="16" width="4.5" height="16" rx="2" />
            <path d="M22,36 C16,30 14,34 18,40" />
            <path d="M22,48 H46.5 V32 H22 Z" />
          </svg>
        );
      case "6":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="24" y="28" width="18" height="20" rx="4" />
            <path d="M24,33 H42 M24,38 H42 M24,43 H42" />
            <rect x="20" y="12" width="6" height="18" rx="3" />
          </svg>
        );
      case "7":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="26" y="28" width="16" height="20" rx="4" />
            <path d="M26,33 H42 M26,38 H42" />
            <rect x="20" y="14" width="6" height="16" rx="3" />
            <rect x="28" y="10" width="6" height="20" rx="3" />
          </svg>
        );
      case "8":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="32" y="30" width="10" height="18" rx="3" />
            <path d="M32,36 H42 M32,42 H42" />
            <rect x="18" y="16" width="6" height="14" rx="3" />
            <rect x="24" y="10" width="5.5" height="20" rx="2.5" />
            <rect x="31" y="8" width="5.5" height="22" rx="2.5" />
          </svg>
        );
      case "9":
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <rect x="38" y="32" width="5" height="16" rx="2" />
            <rect x="16" y="18" width="5.5" height="14" rx="2.5" />
            <rect x="22" y="10" width="5" height="20" rx="2" />
            <rect x="28" y="8" width="5" height="22" rx="2" />
            <rect x="34" y="10" width="5" height="20" rx="2" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22,48 L22,54 A4,4 0 0,0 26,58 L38,58 A4,4 0 0,0 42,54 L42,48" />
            <path d="M22,48 V32 C22,32 23,20 26,20 C29,20 29,32 29,32 V26 C29,26 30,16 33,16 C36,16 36,28 36,28 V24 C36,24 37,14 40,14 C43,14 43,26 43,26 V28 C43,28 44,18 47,18 C50,18 50,30 50,48 Z" fill="currentColor" fillOpacity="0.05" />
            <text x="32" y="38" textAnchor="middle" dominantBaseline="middle" className="font-black text-lg fill-brand-600 font-sans" stroke="none">
              {char}
            </text>
          </svg>
        );
    }
  };

  // Sintesis Suara Bell (Ting-Tong) menggunakan Web Audio API
  const playChime = (count: number = 1) => {
    return new Promise<void>((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        const playNote = (freq: number, startTime: number, duration: number = 3.0) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, startTime);
          
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
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
          playNote(659.25, now, 2.5);
          playNote(523.25, now + 0.6, 3.5);
          totalDurationMs = 2500;
        } else {
          playNote(659.25, now, 2.0);
          playNote(523.25, now + 0.5, 2.0);
          
          playNote(659.25, now + 1.5, 2.0);
          playNote(523.25, now + 2.0, 3.5);
          totalDurationMs = 4000;
        }

        setTimeout(resolve, totalDurationMs);
      } catch (e) {
        console.error("Web Audio API not supported", e);
        resolve();
      }
    });
  };

  const playStationChime = (type: "istirahat" | "buka", double: boolean = false) => {
    return new Promise<void>((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const playNote = (freq: number, startTime: number, duration: number = 0.8) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, startTime);

          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq * 2, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + duration);
          osc2.stop(startTime + duration);
        };

        const playMelody = (startTime: number) => {
          if (type === "istirahat") {
            // Descending station alert melody (Sol-Mi-Re-Do)
            playNote(392.00, startTime, 0.45);        // G4
            playNote(329.63, startTime + 0.25, 0.45);  // E4
            playNote(293.66, startTime + 0.5, 0.45);   // D4
            playNote(261.63, startTime + 0.75, 1.0);   // C4
          } else {
            // Ascending bright opening melody (Do-Re-Mi-Sol)
            playNote(261.63, startTime, 0.45);        // C4
            playNote(293.66, startTime + 0.25, 0.45);  // D4
            playNote(329.63, startTime + 0.5, 0.45);   // E4
            playNote(392.00, startTime + 0.75, 1.0);   // G4
          }
        };

        if (double) {
          playMelody(now);
          // Play a second time with a gap
          const secondStart = 1.3; // slightly overlapping or successive
          playMelody(now + secondStart);
          setTimeout(resolve, (secondStart + 1.8) * 1000);
        } else {
          playMelody(now);
          setTimeout(resolve, 1800);
        }
      } catch (e) {
        console.error("Web Audio API not supported", e);
        resolve();
      }
    });
  };

  const announceStatus = async (type: "istirahat" | "buka") => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    setIsStatusAnnouncing(true);
    try {
      // 1. Play queue chime alert (1x)
      await playChime(1);

      // 2. TTS voice announcement - Bahasa Indonesia
      await new Promise<void>((resolve) => {
        const text = type === "istirahat"
          ? "Pengumuman,, Layanan loket kantor dinas pendidikan sedang istirahat sejenak.,, Layanan akan dibuka kembali beberapa saat lagi,, Terima kasih."
          : "Pengumuman,, Layanan loket kantor dinas pendidikan telah dibuka kembali.,, Silakan mempersiapkan dokumen persyaratan dan nomor antrean Anda,, Terima kasih.";
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        
        if (selectedVoiceName) {
          const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }
        utterance.rate = speechRate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        
        window.speechSynthesis.speak(utterance);
      });

      // Pause for a brief moment between ID and EN announcements
      await new Promise<void>((resolve) => setTimeout(resolve, 800));

      // 3. TTS voice announcement - English (Bilingual)
      await new Promise<void>((resolve) => {
        const textEn = type === "istirahat"
          ? "Attention please,, Education office counter services are temporarily on break.,, The services will be resumed shortly,, Thank you."
          : "Attention please,, Education office counter services are now reopened.,, Please prepare your documents and queue number,, Thank you.";
        
        const utteranceEn = new SpeechSynthesisUtterance(textEn);
        utteranceEn.lang = "en-US";
        
        if (selectedEnVoiceName) {
          const voiceEn = window.speechSynthesis.getVoices().find(v => v.name === selectedEnVoiceName);
          if (voiceEn) utteranceEn.voice = voiceEn;
        }
        utteranceEn.rate = speechRate;
        utteranceEn.onend = () => resolve();
        utteranceEn.onerror = () => resolve();
        
        window.speechSynthesis.speak(utteranceEn);
      });

      // Pause for a brief moment before the ending chime
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // 4. Play queue chime alert (1x) at the end
      await playChime(1);

    } catch (e) {
      console.error("Gagal memutar pengumuman status:", e);
    } finally {
      setIsStatusAnnouncing(false);
      setStatusAnnounced(true);
    }
  };

  useEffect(() => {
    if (!audioEnabled) return;

    if (isInitialRun.current || monitorStatus !== prevStatusRef.current) {
      isInitialRun.current = false;
      setStatusAnnounced(false);
      announceStatus(monitorStatus as "istirahat" | "buka");
      prevStatusRef.current = monitorStatus;
    }
  }, [monitorStatus, audioEnabled]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "monitor_status") {
        setMonitorStatus(e.newValue || "buka");
      }
    };
    window.addEventListener("storage", handleStorage);

    const syncInterval = setInterval(() => {
      const current = localStorage.getItem("monitor_status") || "buka";
      if (current !== monitorStatus) {
        setMonitorStatus(current);
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(syncInterval);
    };
  }, [monitorStatus]);

  useEffect(() => {
    // Memutar instrumen Kicir Kicir saat istirahat, suara aktif, musik diaktifkan, pengumuman status telah selesai, dan tidak sedang mengumumkan
    if (monitorStatus === "istirahat" && audioEnabled && playBreakMusic && !isStatusAnnouncing && statusAnnounced) {
      let tag = document.getElementById("yt-api-script");
      if (!tag) {
        tag = document.createElement("script");
        tag.id = "yt-api-script";
        (tag as HTMLScriptElement).src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const createPlayer = () => {
        try {
          ytPlayerRef.current = new (window as any).YT.Player("hidden-yt-player", {
            height: "1",
            width: "1",
            videoId: "fPuIbWuDbIQ",
            playerVars: {
              autoplay: 1,
              loop: 1,
              playlist: "fPuIbWuDbIQ",
              controls: 0,
              showinfo: 0,
              rel: 0,
              modestbranding: 1
            },
            events: {
              onReady: (event: any) => {
                event.target.setVolume(25); // Volume lembut 25%
                event.target.playVideo();
              }
            }
          });
        } catch (e) {
          console.error("Gagal menginisialisasi YouTube Player:", e);
        }
      };

      if ((window as any).YT && (window as any).YT.Player) {
        createPlayer();
      } else {
        // Callback global dipanggil oleh YouTube API saat script siap
        const previousCallback = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (typeof previousCallback === "function") previousCallback();
          createPlayer();
        };
      }

      return () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
          try {
            ytPlayerRef.current.destroy();
          } catch (err) {
            console.error("Error destroying YT player:", err);
          }
          ytPlayerRef.current = null;
        }
      };
    }
  }, [monitorStatus, audioEnabled, playBreakMusic, isStatusAnnouncing, statusAnnounced]);

  const playAnnouncement = async (item: Antrian) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    if (isSpeakingRef.current) return;

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    try {
      window.speechSynthesis.cancel();

      // 1. Mainkan Suara Bel Awal (Ding-Dong)
      await playChime(1);

      // 2. Mainkan Suara Robot (Text-to-Speech) - Bahasa Indonesia
      const nomor = item.nomor_antrian;
      const nama = item.nama_lengkap || item.nama_tamu || "Tamu";
      const layanan = item.kategori?.nama || item.kategori_keperluan?.nama || "Pelayanan Umum";

      // 2a. Pre-number text ID
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance("Nomor antrian,, ");
        utterance.lang = 'id-ID';
        if (selectedVoiceName) {
          const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }
        utterance.rate = speechRate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });

      // Start SIBI sign video loops exactly when the queue number is pronounced
      setIsPlayingSignVideo(true);

      // 2b. Speak the queue number ID
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(`${nomor},, `);
        utterance.lang = 'id-ID';
        if (selectedVoiceName) {
          const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }
        utterance.rate = speechRate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });

      // 2c. Post-number text ID
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(`atas nama,, ${nama},, silakan menuju loket,, ${layanan}.`);
        utterance.lang = 'id-ID';
        if (selectedVoiceName) {
          const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }
        utterance.rate = speechRate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });

      // 2.5 Mainkan Suara Robot (Text-to-Speech) - English (Bilingual)
      if (isBilingual) {
        await new Promise<void>((resolve) => setTimeout(resolve, 800));

        const nomorEn = item.nomor_antrian;
        const namaEn = item.nama_lengkap || item.nama_tamu || "Guest";
        const layananEn = item.kategori?.nama || item.kategori_keperluan?.nama || "General Services";
        
        const translateKategori = (name: string) => {
          const nameLower = name.toLowerCase();
          if (nameLower.includes("umum")) return "General Services";
          if (nameLower.includes("legalisir")) return "Legalization";
          if (nameLower.includes("mutasi")) return "Transfer";
          if (nameLower.includes("aduan") || nameLower.includes("pengaduan")) return "Complaints";
          if (nameLower.includes("informasi")) return "Information";
          return name;
        };

        // 2.5a. Pre-number text EN
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance("Queue number,, ");
          utterance.lang = 'en-US';
          if (selectedEnVoiceName) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedEnVoiceName);
            if (voice) utterance.voice = voice;
          }
          utterance.rate = speechRate;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });

        // 2.5b. Speak the queue number EN
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(`${nomorEn},, `);
          utterance.lang = 'en-US';
          if (selectedEnVoiceName) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedEnVoiceName);
            if (voice) utterance.voice = voice;
          }
          utterance.rate = speechRate;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });

        // 2.5c. Post-number text EN
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(`for,, ${namaEn},, please proceed to,, ${translateKategori(layananEn)}.`);
          utterance.lang = 'en-US';
          if (selectedEnVoiceName) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedEnVoiceName);
            if (voice) utterance.voice = voice;
          }
          utterance.rate = speechRate;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }

      // 3. Mainkan Suara Bel Akhir (Ding-Dong 1x)
      await playChime(1);
    } catch (e) {
      console.error("Gagal memutar pengumuman:", e);
    } finally {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setIsPlayingSignVideo(false);
    }
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

      const activeQueue = newData.find(a => a.status === 1 || a.status === 2);
      if (activeQueue) {
        const id = activeQueue.id || activeQueue.antrian_id as string;
        if (id !== lastAnnouncedId.current && !isSpeakingRef.current) {
          playAnnouncement(activeQueue);
          lastAnnouncedId.current = id;
        }
      }

    } catch (error) {
      console.error("Gagal memuat antrian monitor:", error);
      // Fallback mock data for visual demonstration if the API is offline/failing
      const mockData: Antrian[] = [
        {
          id: "mock_1",
          nomor_antrian: 125,
          nama_lengkap: "Budi Santoso, M.Pd.",
          status: 1, // Dipanggil
          keperluan: "Koordinasi Ujian Sekolah",
          created_at: new Date().toISOString(),
          cadisdik_id: cadisdik_id,
          kategori: {
            nama: "Layanan Legalisir Ijazah",
            cadisdik_id: cadisdik_id,
            created_at: new Date().toISOString()
          }
        },
        {
          id: "mock_2",
          nomor_antrian: 126,
          nama_lengkap: "Siti Rahmawati",
          status: 0, // Menunggu
          keperluan: "Pengaduan Layanan Pendidik",
          created_at: new Date().toISOString(),
          cadisdik_id: cadisdik_id,
          kategori: {
            nama: "Layanan Pengaduan & Informasi",
            cadisdik_id: cadisdik_id,
            created_at: new Date().toISOString()
          }
        }
      ];
      setAntrian(mockData);
      
      const activeQueue = mockData.find(a => a.status === 1 || a.status === 2);
      if (activeQueue) {
        const id = activeQueue.id || activeQueue.antrian_id as string;
        if (id !== lastAnnouncedId.current && !isSpeakingRef.current) {
          playAnnouncement(activeQueue);
          lastAnnouncedId.current = id;
        }
      }
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
      
      const currentRecall = localStorage.getItem('recall_antrian_id');
      if (currentRecall && currentRecall !== lastRecallRef.current) {
         lastRecallRef.current = currentRecall;
         const targetId = String(currentRecall.split('_')[0]);
         
         if (!isSpeakingRef.current) {
           const targetQueue = antrianRef.current.find(a => (String(a.id) === targetId || String(a.antrian_id) === targetId) && (a.status === 1 || a.status === 2));
           if (targetQueue) {
             // Set ID immediately to prevent fetchQueue from duplicate triggering
             lastAnnouncedId.current = targetId;
             playAnnouncement(targetQueue);
           }
         }
      }

    }, 3000);
    return () => clearInterval(interval);
  }, [cadisdik_id, audioEnabled, selectedVoiceName, selectedEnVoiceName, isBilingual, speechRate]);

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
         <div className="bg-white p-10 sm:p-14 rounded-[2rem] border border-gray-200 shadow-xl max-w-2xl text-center w-full">
            <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Mulai Layar Monitor</h2>
            <p className="text-gray-500 mb-8 text-lg leading-relaxed px-4">
              Sistem membutuhkan izin Anda untuk dapat memainkan suara panggilan antrian otomatis. Silakan periksa pengaturan suara di bawah ini dan klik tombol untuk memulai.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 mb-8 text-left space-y-5 shadow-inner">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                 <svg className="w-6 h-6 text-brand-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
                 Konfigurasi Suara Panggilan (TTS)
               </h3>
               
               <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Suara Utama (Bahasa Indonesia)</label>
                     <select 
                       className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm font-semibold text-gray-700 shadow-sm"
                       value={selectedVoiceName}
                       onChange={(e) => {
                         setSelectedVoiceName(e.target.value);
                         saveSettings(e.target.value, speechRate, isBilingual, selectedEnVoiceName, showSignAssistant);
                       }}
                     >
                       {voices.length > 0 ? (
                         voices.map(voice => (
                           <option key={voice.name} value={voice.name}>
                             {voice.name} ({voice.lang}) {voice.localService ? "[Offline]" : "[Online]"}
                           </option>
                         ))
                       ) : (
                         <option value="">Menggunakan Suara Default Sistem</option>
                       )}
                     </select>
                   </div>

                   {isBilingual && (
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Suara Kedua (Bahasa Inggris)</label>
                       <select 
                         className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm font-semibold text-gray-700 shadow-sm"
                         value={selectedEnVoiceName}
                         onChange={(e) => {
                           setSelectedEnVoiceName(e.target.value);
                           saveSettings(selectedVoiceName, speechRate, isBilingual, e.target.value, showSignAssistant);
                         }}
                       >
                         {enVoices.length > 0 ? (
                           enVoices.map(voice => (
                             <option key={voice.name} value={voice.name}>
                               {voice.name} ({voice.lang}) {voice.localService ? "[Offline]" : "[Online]"}
                             </option>
                           ))
                         ) : (
                           <option value="">Menggunakan Suara Default Sistem</option>
                         )}
                       </select>
                     </div>
                   )}
                 </div>

                 <div className="flex items-center gap-3 bg-white px-4 py-3 border border-gray-200 rounded-2xl shadow-sm">
                   <input 
                     type="checkbox" 
                     id="bilingual_checkbox_splash"
                     className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                     checked={isBilingual}
                     onChange={(e) => {
                       const checked = e.target.checked;
                       setIsBilingual(checked);
                       saveSettings(selectedVoiceName, speechRate, checked, selectedEnVoiceName, showSignAssistant, playBreakMusic);
                     }}
                   />
                   <label htmlFor="bilingual_checkbox_splash" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                     Aktifkan Panggilan Bilingual (Bahasa Indonesia + Bahasa Inggris)
                   </label>
                 </div>

                 <div className="flex items-center gap-3 bg-white px-4 py-3 border border-gray-200 rounded-2xl shadow-sm">
                    <input 
                      type="checkbox" 
                      id="sign_assistant_checkbox_splash"
                      className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                      checked={showSignAssistant}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowSignAssistant(checked);
                        saveSettings(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName, checked, playBreakMusic);
                      }}
                    />
                    <label htmlFor="sign_assistant_checkbox_splash" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                      Tampilkan Asisten Isyarat (Avatar AI & Ejaan BISINDO)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-4 py-3 border border-gray-200 rounded-2xl shadow-sm">
                    <input 
                      type="checkbox" 
                      id="break_music_checkbox_splash"
                      className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                      checked={playBreakMusic}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPlayBreakMusic(checked);
                        saveSettings(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName, showSignAssistant, checked);
                      }}
                    />
                    <label htmlFor="break_music_checkbox_splash" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                      Putar Musik Latar Istirahat (Kicir-Kicir)
                    </label>
                  </div>

                 <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between pt-2">
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Kecepatan Bicara</label>
                       <span className="text-sm font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">{speechRate}x</span>
                     </div>
                     <input 
                       type="range" 
                       min="0.6" 
                       max="1.4" 
                       step="0.05"
                       className="w-full accent-brand-600 bg-gray-200 h-2 rounded-lg cursor-pointer"
                       value={speechRate}
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         setSpeechRate(val);
                         saveSettings(selectedVoiceName, val, isBilingual, selectedEnVoiceName, showSignAssistant);
                       }}
                     />
                   </div>
                   
                   <div className="flex shrink-0">
                     <Button 
                       type="button" 
                       variant="outline" 
                       className="w-full sm:w-auto font-bold rounded-xl py-2 px-6 shadow-sm"
                       onClick={() => playTestAnnouncement(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName)}
                       disabled={voices.length === 0 && selectedVoiceName === ""}
                     >
                       Tes Suara
                     </Button>
                   </div>
                 </div>
               </div>
            </div>

            <Button size="lg" className="w-full py-4 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-shadow" onClick={() => setAudioEnabled(true)}>
              Aktifkan Suara & Mulai
            </Button>
         </div>
      </div>
    );
  }

  const dipanggil = antrian.find(a => a.status === 1 || a.status === 2);
  const menunggu = antrian.filter(a => a.status === 0).slice(0, 5);

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
    <div className="h-screen portrait:h-auto portrait:min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans overflow-y-auto landscape:overflow-hidden">
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

        {/* Real-time Weather Widget (Center) */}
        <div className="hidden lg:flex items-center gap-4 bg-gray-50 border border-gray-150 rounded-2xl px-5 py-2 shadow-inner">
          <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100">
            {getWeatherIcon(weather.code)}
          </div>
          <div className="flex gap-4 items-center">
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">{weatherLocation} (METEO)</span>
              <span className="text-lg font-black text-gray-800 leading-none mt-1.5 inline-block">{weather.temp.toFixed(1)}°C</span>
            </div>
            <div className="h-6 w-[1px] bg-gray-200"></div>
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">KELEMBAPAN</span>
              <span className="text-xs font-extrabold text-gray-700 mt-1.5 inline-block">{weather.humidity}% RH</span>
            </div>
            <div className="h-6 w-[1px] bg-gray-200"></div>
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">KONDISI</span>
              <span className="text-xs font-extrabold text-gray-750 mt-1.5 inline-block">{weather.condition}</span>
            </div>
          </div>
        </div>

        <div className="text-right flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Pengaturan Suara Panggilan"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            onClick={toggleFullScreen}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Layar Penuh"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l-5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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
      <main className="flex-1 flex flex-col lg:flex-row portrait:flex-col p-6 sm:p-8 gap-8 relative z-10">
          {/* Main Panel (Left split: Media TV & Active Call) */}
          <div className="flex-[5] flex flex-col lg:flex-row gap-8 portrait:contents">
            
            {/* Left Column: Financial & Carousel */}
            <div className="flex-[5] flex flex-col bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-xl relative overflow-hidden h-full min-h-[450px] sm:min-h-[500px] portrait:order-3 portrait:flex-none justify-between">
              {/* Header info */}
              <div className="w-full flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-5 bg-brand-600 rounded-full"></span>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">IKLAN LAYANAN MASYARAKAT</h3>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-success-400"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
                </span>
              </div>

              {/* Comic Image Display - Slider Container fitting square images exactly */}
              <div className="w-full aspect-square bg-slate-50 rounded-3xl overflow-hidden mb-4 relative shadow-md border border-gray-150">
                <div 
                  className="flex w-full h-full transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${activeComicIdx * 100}%)` }}
                >
                  {comicAnnouncements.map((comic, idx) => (
                    <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center">
                      <img 
                        src={comic.image} 
                        alt={comic.title} 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-102" 
                      />
                    </div>
                  ))}
                </div>
                {/* Badge Overlay */}
                <div className="absolute top-6 left-6 bg-brand-600/90 text-white text-[9px] font-black px-3.5 py-1.5 rounded-full shadow-md uppercase tracking-wider backdrop-blur-xs border border-white/10 z-10">
                  {comicAnnouncements[activeComicIdx].tagline}
                </div>
              </div>

              {/* Comic Info Subcard / Carousel */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center min-h-[100px] shadow-inner relative overflow-hidden">
                <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest block mb-1">EDUKASI KARAKTER & LITERASI</span>
                <div key={`comic-info-${activeComicIdx}`} className="transition-all duration-500 animate-in fade-in slide-in-from-right-3">
                  <h4 className="font-extrabold text-gray-800 text-sm">{comicAnnouncements[activeComicIdx].title}</h4>
                  <p className="text-xs text-gray-550 mt-1 leading-relaxed">{comicAnnouncements[activeComicIdx].desc}</p>
                </div>
                {/* Carousel Indicators */}
                <div className="flex gap-1 mt-3">
                  {comicAnnouncements.map((_, idx) => (
                    <span key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${activeComicIdx === idx ? 'w-4 bg-brand-600' : 'w-1.5 bg-gray-200'}`}></span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Active Call Ticket Panel or Welcome Screen or SEDANG ISTIRAHAT */}
            <div className="flex-[7] flex flex-col bg-white rounded-[2.5rem] border border-gray-100 p-6 justify-between items-center relative overflow-hidden shadow-xl h-full min-h-[450px] sm:min-h-[500px] portrait:order-1 portrait:flex-none">
              {monitorStatus === "istirahat" ? (
                <div className="relative z-10 flex flex-col items-center w-full h-full animate-in fade-in zoom-in duration-500 justify-between py-6">
                  {/* Pulsing decorative background blobs */}
                  <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl animate-pulse"></div>

                  {/* Break Icon (Clock/Coffee) */}
                  <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-md animate-bounce border border-amber-100 mb-2">
                    <svg className="w-12 h-12 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <div className="space-y-3 text-center z-10 px-2">
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-4 py-1.5 rounded-full shadow-xs uppercase tracking-widest border border-amber-100 inline-block">
                      Pemberitahuan Layanan
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                      SEDANG ISTIRAHAT
                    </h2>
                    <p className="text-gray-550 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                      Saat ini petugas kami sedang beristirahat sejenak. Layanan loket antrean akan segera dibuka kembali. Terima kasih atas kesabaran Anda.
                    </p>
                  </div>

                  {/* Live Clock inside Break Board */}
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl px-8 py-4 shadow-inner flex flex-col items-center min-w-[240px] z-10">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">WAKTU SEKARANG</span>
                    <span className="text-3xl font-mono font-black text-gray-800 tracking-wider">
                      {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : dipanggil ? (
                <div className="relative z-10 flex flex-col items-center w-full h-full animate-in fade-in zoom-in duration-500 justify-between">
                  
                  {/* Sleek Header inside the Card */}
                  <div className="w-full flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-5 bg-brand-600 rounded-full"></span>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Panggilan Aktif</h3>
                    </div>
                    <div className={`font-bold px-3 py-1 rounded-full text-[10px] tracking-wide uppercase border flex items-center gap-1.5 shadow-sm ${dipanggil.status === 1 ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-warning-50 text-warning-600 border-warning-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dipanggil.status === 1 ? 'bg-brand-600 animate-ping' : 'bg-warning-500'}`}></span>
                      {dipanggil.status === 1 ? 'Dipanggil' : 'Dilayani'}
                    </div>
                  </div>
                  
                  {/* Ticket Box */}
                  <div className="w-full flex flex-col items-center justify-center bg-gray-50/70 border border-gray-200 rounded-2xl p-4 shadow-inner relative overflow-hidden h-64 sm:h-72 md:h-80 lg:h-96 xl:h-[26rem] animate-pulse">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Antrean</span>
                    <div className="text-[8rem] sm:text-[10rem] md:text-[12rem] lg:text-[15rem] xl:text-[18rem] font-black tracking-tight text-gray-900 leading-none drop-shadow-sm font-mono">
                      {dipanggil.nomor_antrian}
                    </div>
                    
                    {/* Decorative Ticket Cutouts */}
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-r border-gray-200 rounded-full"></div>
                    <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-l border-gray-200 rounded-full"></div>
                  </div>

                  {/* Loket & Name */}
                  <div className="w-full text-center space-y-4 py-3">
                    <div>
                      <span className="inline-block text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1 rounded border border-brand-100 uppercase tracking-widest">
                        LOKET TUJUAN
                      </span>
                      <h4 className="text-2xl font-black text-gray-900 mt-2 tracking-tight leading-tight">
                        {dipanggil.kategori?.nama || dipanggil.kategori_keperluan?.nama || "Pelayanan Umum"}
                      </h4>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                      <span className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">
                        NAMA TAMU / VISITOR NAME
                      </span>
                      <h3 className="text-4xl sm:text-5xl font-black text-gray-800 capitalize leading-tight mt-2 truncate px-2">
                        {dipanggil.nama_lengkap || dipanggil.nama_tamu}
                      </h3>
                    </div>
                  </div>

                  {/* BISINDO Visual Sign spelling */}
                  {showSignAssistant && (
                    <div className="flex flex-col items-center mt-3 pt-3 border-t border-gray-100 w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
                      <p className="text-gray-455 text-[9px] font-extrabold tracking-widest uppercase mb-2 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-brand-500 rounded-full animate-ping"></span>
                        Ejaan Isyarat (BISINDO)
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {String(dipanggil.nomor_antrian || "").toUpperCase().split("").map((char, idx) => {
                          if (char === "-") {
                            return (
                              <div key={idx} className="flex items-center justify-center w-6 text-2xl font-black text-gray-300">
                                -
                              </div>
                            );
                          }
                          return (
                            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-1.5 flex flex-col items-center shadow-xs w-14">
                              <span className="text-xs font-black text-brand-600 mb-1">{char}</span>
                              <div className="bg-gray-50 rounded-lg p-1 border border-gray-100 flex items-center justify-center w-10 h-10 shadow-inner">
                                {renderHandSign(char)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                </div>
              ) : (
                <div className="text-center max-w-xs mx-auto relative z-10 transition-opacity duration-1000 py-12 flex flex-col items-center justify-center my-auto h-full">
                  <div className="w-20 h-20 bg-gray-50 border border-gray-150 text-gray-400 rounded-2xl flex items-center justify-center shadow-inner mb-6 animate-[avatarIdle_3s_ease-in-out_infinite]">
                    <svg className="w-10 h-10 text-brand-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">Menunggu Panggilan</h2>
                  <p className="text-xs text-gray-550 font-medium leading-relaxed px-2">
                    Sistem standby. Petugas pelayanan kami akan segera memanggil nomor antrean Anda.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Panel (Right) */}
          <div className="flex-[3] flex flex-col gap-8 portrait:contents">
            
            {showSignAssistant && isPlayingSignVideo && dipanggil ? (
              /* Penerjemah Isyarat SIBI Video Widget */
              <div className="bg-white rounded-[2rem] border border-gray-100 p-4 flex flex-col shadow-lg min-h-[320px] transition-all duration-500 animate-in fade-in zoom-in-95 relative overflow-hidden portrait:order-2">
                <div className="w-full flex-1 rounded-2xl overflow-hidden aspect-video relative min-h-[220px]">
                  <SIBIVideoPlayer 
                    queueNumber={String(dipanggil.nomor_antrian)} 
                    isPlaying={isPlayingSignVideo} 
                    onSequenceEnded={() => setIsPlayingSignVideo(false)} 
                  />
                </div>
                
                <div className="text-left mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-black text-gray-850 uppercase tracking-wide">Penerjemah Isyarat SIBI</p>
                  <p className="text-[9px] font-black text-gray-450 uppercase tracking-widest mt-0.5">Sistem Isyarat Bahasa Indonesia Resmi Kemendikdasmen</p>
                </div>
              </div>
            ) : (
              /* Alur Pelayanan Card */
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col justify-center shadow-lg transition-all duration-500 animate-in fade-in portrait:order-2">
                <h3 className="text-sm font-extrabold text-gray-400 mb-6 pb-3 border-b border-gray-50 flex items-center gap-2 uppercase tracking-widest">
                  <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Alur Pelayanan
                </h3>
                
                <div className="relative pl-12 space-y-6">
                  {/* Stepper vertical line indicator */}
                  <div className="absolute left-5 top-2.5 bottom-2.5 w-[1px] bg-gray-100 border-l border-dashed border-gray-300"></div>

                  <div className="relative flex flex-col">
                    <div className="absolute -left-12 top-0.5 w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-black text-xs shadow-sm">
                      01
                    </div>
                    <h4 className="font-bold text-gray-800 text-base">Ambil Nomor Antrean</h4>
                    <p className="text-xs text-gray-550 mt-0.5 leading-relaxed">Isi buku tamu melalui perangkat yang tersedia.</p>
                  </div>
                  
                  <div className="relative flex flex-col">
                    <div className="absolute -left-12 top-0.5 w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-black text-xs shadow-sm">
                      02
                    </div>
                    <h4 className="font-bold text-gray-800 text-base">Tunggu Panggilan</h4>
                    <p className="text-xs text-gray-550 mt-0.5 leading-relaxed">Silakan duduk di ruang tunggu dengan nyaman.</p>
                  </div>
                  
                  <div className="relative flex flex-col">
                    <div className="absolute -left-12 top-0.5 w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-black text-xs shadow-sm">
                      03
                    </div>
                    <h4 className="font-bold text-gray-800 text-base">Menuju Loket</h4>
                    <p className="text-xs text-gray-550 mt-0.5 leading-relaxed">Bawa berkas persyaratan saat nomor Anda dipanggil.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Daftar Tunggu Card */}
            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col shadow-lg overflow-hidden portrait:order-4">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-extrabold text-gray-400 flex items-center gap-2.5 uppercase tracking-widest">
                  <span className="w-2.5 h-5 bg-brand-500 rounded-full block"></span>
                  Daftar Tunggu
                </h3>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">Selanjutnya</span>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {menunggu.length > 0 ? (
                  menunggu.map((item, idx) => (
                    <div key={item.id || item.antrian_id || idx} className="bg-white hover:bg-gray-50/50 rounded-2xl p-3.5 flex items-center gap-4 border border-gray-100 shadow-sm transition-colors relative overflow-hidden group">
                      {/* Color status strip on left */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r-md"></div>
                      
                      <div className="bg-brand-50/50 text-brand-600 font-black text-2xl w-[60px] h-[60px] rounded-xl border border-brand-100 flex items-center justify-center shrink-0">
                        {item.nomor_antrian}
                      </div>
                      
                      <div className="flex-1 min-w-0 pl-1">
                        <h4 className="text-base font-extrabold text-gray-800 capitalize truncate">
                          {item.nama_lengkap || item.nama_tamu}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full inline-block"></span>
                          <span className="text-[10px] text-gray-550 font-bold uppercase tracking-wider truncate">
                            {item.kategori?.nama || item.kategori_keperluan?.nama || "Umum"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                    <svg className="w-10 h-10 mb-2 opacity-40 text-brand-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-sm font-bold text-gray-400">Tidak ada antrean tunggu</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>

        <div id="hidden-yt-player" className="absolute pointer-events-none opacity-0 w-1 h-1"></div>

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



      {/* Modal Pengaturan Suara & Isyarat */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-200 text-left">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Pengaturan Suara & Isyarat
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Suara Utama (Bahasa Indonesia)</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm font-semibold text-gray-700 shadow-sm"
                  value={selectedVoiceName}
                  onChange={(e) => {
                    setSelectedVoiceName(e.target.value);
                    saveSettings(e.target.value, speechRate, isBilingual, selectedEnVoiceName, showSignAssistant);
                  }}
                >
                  {voices.length > 0 ? (
                    voices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang}) {voice.localService ? "[Offline]" : "[Online]"}
                      </option>
                    ))
                  ) : (
                    <option value="">Menggunakan Suara Default Sistem</option>
                  )}
                </select>
              </div>

              {isBilingual && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Suara Kedua (Bahasa Inggris)</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:outline-none text-sm font-semibold text-gray-700 shadow-sm"
                    value={selectedEnVoiceName}
                    onChange={(e) => {
                      setSelectedEnVoiceName(e.target.value);
                      saveSettings(selectedVoiceName, speechRate, isBilingual, e.target.value, showSignAssistant);
                    }}
                  >
                    {enVoices.length > 0 ? (
                      enVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang}) {voice.localService ? "[Offline]" : "[Online]"}
                        </option>
                      ))
                    ) : (
                      <option value="">Menggunakan Suara Default Sistem</option>
                    )}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border border-gray-200 rounded-xl shadow-sm">
                <input 
                  type="checkbox" 
                  id="bilingual_checkbox_modal"
                  className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                  checked={isBilingual}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsBilingual(checked);
                    saveSettings(selectedVoiceName, speechRate, checked, selectedEnVoiceName, showSignAssistant);
                  }}
                />
                <label htmlFor="bilingual_checkbox_modal" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Aktifkan Panggilan Bilingual (ID + EN)
                </label>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border border-gray-200 rounded-xl shadow-sm">
                <input 
                  type="checkbox" 
                  id="sign_assistant_checkbox_modal"
                  className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                  checked={showSignAssistant}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowSignAssistant(checked);
                    saveSettings(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName, checked, playBreakMusic);
                  }}
                />
                <label htmlFor="sign_assistant_checkbox_modal" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Tampilkan Asisten Isyarat (BISINDO)
                </label>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border border-gray-200 rounded-xl shadow-sm">
                <input 
                  type="checkbox" 
                  id="break_music_checkbox_modal"
                  className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500/20 border-gray-300 cursor-pointer"
                  checked={playBreakMusic}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPlayBreakMusic(checked);
                    saveSettings(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName, showSignAssistant, checked);
                  }}
                />
                <label htmlFor="break_music_checkbox_modal" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Putar Musik Latar Istirahat (Kicir-Kicir)
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Kecepatan Bicara</label>
                  <span className="text-sm font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">{speechRate}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.6" 
                  max="1.4" 
                  step="0.05"
                  className="w-full accent-brand-600 bg-gray-200 h-2 rounded-lg cursor-pointer"
                  value={speechRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSpeechRate(val);
                    saveSettings(selectedVoiceName, val, isBilingual, selectedEnVoiceName, showSignAssistant);
                  }}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 py-3 font-bold"
                  onClick={() => playTestAnnouncement(selectedVoiceName, speechRate, isBilingual, selectedEnVoiceName)}
                  disabled={voices.length === 0 && selectedVoiceName === ""}
                >
                  Tes Suara
                </Button>
                <Button 
                  type="button" 
                  className="flex-1 py-3 font-bold"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Simpan & Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        @keyframes avatarIdle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1.5deg); }
        }
        @keyframes avatarActive {
          0%, 100% { transform: scale(1.02) rotate(0deg) translateY(0); }
          25% { transform: scale(1.06) rotate(-2deg) translateY(-8px); }
          50% { transform: scale(1.02) rotate(2deg) translateY(2px); }
          75% { transform: scale(1.06) rotate(-1deg) translateY(-6px); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(99, 102, 241, 0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          50% { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.15); }
        }
        @keyframes activeBorderPulse {
          0%, 100% { border-color: rgba(34, 197, 94, 0.3); box-shadow: 0 4px 25px rgba(34, 197, 94, 0.1); }
          50% { border-color: rgba(34, 197, 94, 0.75); box-shadow: 0 15px 35px rgba(34, 197, 94, 0.35); }
        }
        @keyframes signChange {
          0% { transform: scale(0.85) translateY(5px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes weatherCloud {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes weatherRain {
          0% { transform: translateY(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(4px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
