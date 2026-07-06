import axios from 'axios';

// Konfigurasi Axios dengan praktik keamanan dasar
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'https://centralsimak.smakniscjr.sch.id/api').trim(),
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
    const mandalaKey = (import.meta.env.VITE_MANDALA_KEY || '').trim();
    
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

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/mandala/auth/login')
    ) {
      const refreshToken = localStorage.getItem('refresh_token');
      const isPublicPage = 
        window.location.pathname.endsWith('/isi-antrian') || 
        window.location.pathname.endsWith('/monitor-antrian');
      
      if (!refreshToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        if (window.location.pathname !== '/signin' && !isPublicPage) {
          window.location.href = '/signin';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${api.defaults.baseURL}/mandala/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        if (window.location.pathname !== '/signin' && !isPublicPage) {
          window.location.href = '/signin';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
