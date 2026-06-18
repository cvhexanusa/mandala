import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  nama: string;
  email: string;
  role: string;
  nip?: string;
  foto?: string;
}

interface LoginResult {
  requires2FA: boolean;
  tempToken?: string;
  is2FASetup?: boolean;
  qrCodeUrl?: string;
  secret?: string;
  accessToken?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string, secret?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setAuthData: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Memeriksa localStorage untuk sesi yang tersimpan
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Gagal membaca data user dari storage:", error);
      }
    }
    setLoading(false);
  }, []);

  const setAuthData = (userData: User) => {
    setUser(userData);
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await api.post('/mandala/auth/login', {
        identifier: username,
        password: password
      });

      const { requires2FA, tempToken, is2FASetup, qrCodeUrl, secret, accessToken, data } = response.data;

      if (requires2FA) {
        return {
          requires2FA: true,
          tempToken,
          is2FASetup,
          qrCodeUrl,
          secret
        };
      }

      // If no 2FA required (unlikely based on my backend implementation for Pegawai, 
      // but good for completeness)
      if (accessToken && data?.pegawai) {
        const userData = data.pegawai;
        localStorage.setItem("auth_token", accessToken);
        localStorage.setItem("user_data", JSON.stringify(userData));
        if (response.data.refreshToken) {
            localStorage.setItem("refresh_token", response.data.refreshToken);
        }
        setUser(userData);
        return { requires2FA: false, accessToken, user: userData };
      }

      throw new Error('Data login tidak lengkap');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const verify2FA = async (tempToken: string, code: string, secret?: string) => {
    try {
      const response = await api.post('/mandala/auth/verify-2fa', {
        tempToken,
        code,
        secretToSave: secret
      });

      if (response.data.status === 'success') {
        const { accessToken, refreshToken, pegawai } = response.data.data;
        localStorage.setItem("auth_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        localStorage.setItem("user_data", JSON.stringify(pegawai));
        setUser(pegawai);
      } else {
        throw new Error(response.data.message || 'Verifikasi 2FA gagal');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      verify2FA, 
      logout, 
      isAuthenticated: !!user,
      setAuthData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
