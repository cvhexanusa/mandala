import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { dapodikService } from '../services/dapodikService';

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

const MOCK_USER: User = {
  id: '1',
  nama: 'Abdul Gani, S.Ag.',
  email: 'abdulgani@email.com',
  role: 'Super Admin'
};

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
    // Mock login success
    const result = {
      requires2FA: false,
      accessToken: 'mock_token',
      user: MOCK_USER
    };
    setUser(MOCK_USER);
    return result;
  };

  const verify2FA = async (tempToken: string, code: string, secret?: string) => {
    setUser(MOCK_USER);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("auth_token");
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
