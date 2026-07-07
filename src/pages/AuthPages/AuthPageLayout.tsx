import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { useSystemSettings } from "../../context/SystemSettingsContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, getStorageUrl } = useSystemSettings();
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
              <Link to="/" className="block mb-6">
                <div className="flex items-center gap-3">
                    {settings?.appLogo ? (
                      <img 
                        src={getStorageUrl(settings.appLogo)} 
                        alt="Logo" 
                        className="w-14 h-14 object-contain" 
                      />
                    ) : (
                      <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-brand-500/20">
                        {settings?.appShortName ? settings.appShortName.charAt(0).toUpperCase() : "S"}
                      </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-3xl tracking-tight">
                          {settings?.appShortName || "SAPA VI"}
                        </span>
                    </div>
                </div>
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60 leading-relaxed">
                Platform Terpadu Pengelolaan Data dan Layanan Pendidikan
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
