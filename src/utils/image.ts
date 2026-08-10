import { getEnv } from './env';

/**
 * Mendapatkan Base URL backend SIMAK
 */
export const getBackendBaseUrl = (): string => {
  const rawApiUrl = getEnv('VITE_API_URL', 'https://centralsimak.smakniscjr.sch.id/api');
  return rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : 'https://centralsimak.smakniscjr.sch.id';
};

/**
 * Mengubah path / URL storage menjadi URL absolut backend yang aman dan valid.
 * Mendukung:
 * 1. Signed URLs (?expires=...&signature=...) sesuai aturan backend
 * 2. Token authentication (?token=...) untuk endpoint storage yang terproteksi
 * 3. Deteksi otomatis URL absolut, relatif, maupun data/blob URL
 */
export const getStorageUrl = (path: string | null | undefined, fallback: string = ''): string => {
  if (!path || path.trim() === '') return fallback;

  // Jika berupa data URI atau blob URL (misal hasil FileReader/Canvas), gunakan langsung
  if (path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const backendUrl = getBackendBaseUrl();

  // Jika URL eksternal yang bukan menuju ke /storage/ backend kita
  if ((path.startsWith('http://') || path.startsWith('https://')) && !path.includes('/storage/')) {
    return path;
  }

  // Ekstrak bagian path storage
  let cleanPath = path;
  const storageIndex = path.indexOf('/storage/');
  if (storageIndex !== -1) {
    cleanPath = path.substring(storageIndex);
  } else if (cleanPath.startsWith('storage/')) {
    cleanPath = `/${cleanPath}`;
  } else if (!cleanPath.startsWith('/storage/')) {
    cleanPath = cleanPath.startsWith('/') ? `/storage${cleanPath}` : `/storage/${cleanPath}`;
  }

  // Pisahkan pathname dan query string
  const [pathname, queryString] = cleanPath.split('?');
  const urlParams = new URLSearchParams(queryString || '');

  // Jika URL adalah signed-url (?expires=...&signature=...), jangan rusak parameter signature
  // Jika belum memiliki signature, lampirkan token dari localStorage agar diizinkan backend
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token && !urlParams.has('signature') && !urlParams.has('token')) {
    urlParams.set('token', token);
  }

  const finalQuery = urlParams.toString();
  return `${backendUrl}${pathname}${finalQuery ? `?${finalQuery}` : ''}`;
};

/**
 * Mendapatkan URL foto avatar pengguna
 */
export const getFotoUrl = (path: string | null | undefined, fallback: string = '/images/user/default-avatar.svg'): string => {
  const defaultFallback = fallback && fallback !== '' ? fallback : '/images/user/default-avatar.svg';
  if (!path || path.trim() === '') return defaultFallback;
  return getStorageUrl(path, defaultFallback);
};

/**
 * Mendapatkan URL logo instansi / sekolah
 */
export const getLogoUrl = (path: string | null | undefined): string => {
  return getStorageUrl(path, '');
};
