import axios from 'axios';

// Konfigurasi Axios dengan praktik keamanan dasar
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://centralsimak.smakniscjr.sch.id/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Izinkan pengiriman cookie (untuk Refresh Token)
  timeout: 15000,
});

// Interceptor untuk menangani token keamanan (misal JWT)
api.interceptors.request.use(
  (config) => {
    // Token Auth (User Login) - Masih dipertahankan jika ada
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // API Key (Mandala Integration)
    // Sesuai strategi: Setiap request WAJIB menyertakan x-mandala-key
    // Mengambil dari .env (VITE_MANDALA_KEY)
    const mandalaKey = import.meta.env.VITE_MANDALA_KEY || '';
    
    if (mandalaKey) {
      config.headers['x-mandala-key'] = mandalaKey;
      
      // Jika request ke endpoint mandala, kita pastikan key terkirim di header
      // dan tidak perlu mencemari query params jika tidak diperlukan
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag untuk mencegah loop refresh token tak terbatas
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor untuk menangani error secara terpusat
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Untuk sementara, kita bypass redirect login jika unauthorized
    // agar tidak mengganggu integrasi Mandala
    if (error.response?.status === 401) {
       console.error('Unauthorized request:', originalRequest.url);
    }

    return Promise.reject(error);
  }
);

export default api;
