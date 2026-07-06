import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import { dapodikService } from "../services/dapodikService";

export interface SystemSetting {
  system_setting_id?: string;
  cadisdik_id: string;
  appName: string;
  appShortName: string;
  appLogo: string | null;
  appLogoDark: string | null;
  appFavicon: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  copyrightText: string;
  metaDescription: string | null;
  metaKeywords: string | null;
  maintenanceMode: boolean;
}

interface SystemSettingsContextType {
  settings: SystemSetting | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (formData: FormData) => Promise<SystemSetting>;
  getStorageUrl: (filename: string | null | undefined) => string;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [loading, setLoading] = useState(true);

  const getStorageUrl = (filename: string | null | undefined) => {
    if (!filename) return "";
    if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
    const baseUrl = (import.meta.env.VITE_API_URL || "https://centralsimak.smakniscjr.sch.id/api").trim().replace(/\/api$/, "");
    return `${baseUrl}/storage/${filename}`;
  };

  const refreshSettings = async () => {
    try {
      let cadisdikId = user?.cadisdik_id;
      
      // Fallback if user doesn't have a designated branch
      if (!cadisdikId) {
        try {
          const instansiRes = await dapodikService.getCadisdik();
          if (instansiRes?.data && instansiRes.data.length > 0) {
            cadisdikId = instansiRes.data[0].cadisdik_id;
          }
        } catch (e) {
          console.warn("Gagal fetch fallback cadisdik list:", e);
        }
      }

      if (!cadisdikId) return;

      // Updated to match the latest NestJS route: GET /api/mandala/system-setting/:cadisdik_id
      const response = await api.get(`/mandala/system-setting/${cadisdikId}`);

      if (response.data) {
        const settingsData = response.data.data || response.data.settings || response.data;
        setSettings(settingsData);
      }
    } catch (err) {
      console.warn("Gagal memuat pengaturan sistem:", err);
      // Fallback local defaults
      setSettings((prev) => prev || {
        cadisdik_id: user?.cadisdik_id || "",
        appName: "SIMAK",
        appShortName: "Mandala",
        appLogo: null,
        appLogoDark: null,
        appFavicon: null,
        contactEmail: null,
        contactPhone: null,
        contactAddress: null,
        copyrightText: "© 2026 SIMAK. All Rights Reserved.",
        metaDescription: null,
        metaKeywords: null,
        maintenanceMode: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (formData: FormData) => {
    let cadisdikId = user?.cadisdik_id;

    // Fallback if user doesn't have a designated branch
    if (!cadisdikId) {
      try {
        const instansiRes = await dapodikService.getCadisdik();
        if (instansiRes?.data && instansiRes.data.length > 0) {
          cadisdikId = instansiRes.data[0].cadisdik_id;
        }
      } catch (e) {
        console.warn("Gagal fetch fallback cadisdik list for update:", e);
      }
    }

    if (!cadisdikId) throw new Error("ID Cadisdik tidak ditemukan.");

    // Append cadisdik_id automatically to form payload for backend DTO validation
    if (!formData.has("cadisdik_id")) {
      formData.append("cadisdik_id", cadisdikId);
    }
    if (!formData.has("cadisdikId")) {
      formData.append("cadisdikId", cadisdikId);
    }

    // Append API key variations to payload to satisfy backend DTO validation (e.g. key, apiKey, etc.)
    const mandalaKey = (import.meta.env.VITE_MANDALA_KEY || "").trim();
    if (mandalaKey) {
      if (!formData.has("key")) formData.append("key", mandalaKey);
      if (!formData.has("apiKey")) formData.append("apiKey", mandalaKey);
      if (!formData.has("api_key")) formData.append("api_key", mandalaKey);
      if (!formData.has("mandalaKey")) formData.append("mandalaKey", mandalaKey);
      if (!formData.has("mandala_key")) formData.append("mandala_key", mandalaKey);
      if (!formData.has("x-mandala-key")) formData.append("x-mandala-key", mandalaKey);
    }

    // Check if FormData has any file uploads
    const hasFiles = Array.from(formData.values()).some(
      (value) => value instanceof File && value.name !== ""
    );

    let response;
    if (!hasFiles) {
      // If no files, send as plain JSON (application/json) to match the successful Postman request
      const jsonObject: Record<string, any> = {};
      formData.forEach((value, key) => {
        if (key === "maintenanceMode") {
          jsonObject[key] = value === "true";
        } else {
          jsonObject[key] = value;
        }
      });

      response = await api.post(`/mandala/system-setting/${cadisdikId}`, jsonObject, {
        headers: {
          "Content-Type": "application/json",
          "x-mandala-key": mandalaKey,
          "x-api-key": mandalaKey,
          "api-key": mandalaKey,
          "Authorization": `Bearer ${localStorage.getItem('auth_token') || ""}`,
        },
      });
    } else {
      // If files are present, send as multipart/form-data
      response = await api.post(`/mandala/system-setting/${cadisdikId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-mandala-key": mandalaKey,
          "x-api-key": mandalaKey,
          "api-key": mandalaKey,
          "Authorization": `Bearer ${localStorage.getItem('auth_token') || ""}`,
        },
      });
    }

    const updatedData = response.data.data || response.data.settings || response.data;
    setSettings(updatedData);

    // Apply app title and favicon dynamically
    if (updatedData.appName) {
      document.title = `${updatedData.appName} | SIMAK`;
    }
    if (updatedData.appFavicon) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = getStorageUrl(updatedData.appFavicon);
      }
    }

    return updatedData;
  };

  useEffect(() => {
    refreshSettings();
  }, [user]);

  // Effect to set doc title and favicon dynamically on load
  useEffect(() => {
    if (settings) {
      if (settings.appName) {
        document.title = settings.appName;
      }
      if (settings.appFavicon) {
        const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
          link.href = getStorageUrl(settings.appFavicon);
        }
      }
    }
  }, [settings]);

  return (
    <SystemSettingsContext.Provider value={{
      settings,
      loading,
      refreshSettings,
      updateSettings,
      getStorageUrl
    }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
};
