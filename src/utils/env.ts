/**
 * Utility untuk mengambil environment variables secara REALTIME.
 * 
 * Prioritas pembacaan:
 * 1. window.__ENV__ (Di-inject secara dinamis dan realtime oleh server.js / env-config.js di hosting)
 * 2. import.meta.env (Fallback dari proses build Vite jika window.__ENV__ belum tersedia)
 * 3. defaultValue (Nilai fallback cadangan)
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export const getEnv = (key: string, defaultValue: string = ''): string => {
  // 1. Cek runtime env dari window.__ENV__ (Realtime dari server / .env cPanel)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key] !== undefined) {
    const val = window.__ENV__[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }

  // 2. Cek build-time env dari import.meta.env
  try {
    const viteVal = (import.meta.env as any)?.[key];
    if (viteVal !== undefined && viteVal !== null && String(viteVal).trim() !== '') {
      return String(viteVal).trim();
    }
  } catch (e) {
    // Abaikan jika import.meta.env tidak tersedia
  }

  // 3. Fallback default
  return defaultValue;
};
