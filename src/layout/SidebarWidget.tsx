import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSekolah } from "../context/SekolahContext";
import { useSystemSettings } from "../context/SystemSettingsContext";

export default function SidebarWidget() {
  const { user } = useAuth();
  const { sekolah } = useSekolah();
  const { settings } = useSystemSettings();
  const [instansiName, setInstansiName] = useState<string>("Mandala Internal");

  useEffect(() => {
    if (user) {
      const userObj = user as any;
      const isOperatorUser = user.role?.toLowerCase().includes("operator");
      if (isOperatorUser) {
        if (sekolah?.nama) {
          setInstansiName(sekolah.nama);
        } else if (userObj.sekolah) {
          setInstansiName(userObj.sekolah);
        } else if (userObj.cadisdik) {
          setInstansiName(userObj.cadisdik);
        } else {
          setInstansiName("Sekolah Anda");
        }
      } else {
        if (userObj.cadisdik) {
          setInstansiName(userObj.cadisdik);
        } else if (userObj.sekolah) {
          setInstansiName(userObj.sekolah);
        } else if (sekolah?.nama) {
          setInstansiName(sekolah.nama);
        } else {
          setInstansiName("Mandala Internal");
        }
      }
    }
  }, [user, sekolah]);
  
  if (!user) return null;

  return (
    <div
      className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-50 px-4 py-5 text-center dark:bg-white/[0.03] border border-brand-100 dark:border-white/[0.05]"
    >
      <div className="flex justify-center mb-3">
        {user.foto ? (
          <img 
            src={user.foto} 
            alt="User Foto" 
            className="w-12 h-12 rounded-full object-cover border border-brand-200" 
          />
        ) : (
          <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-xl uppercase">
            {user.nama?.charAt(0) || "A"}
          </div>
        )}
      </div>
      <h3 className="mb-1 font-bold text-gray-900 dark:text-white text-theme-sm uppercase truncate px-1" title={user.nama}>
        {user.nama}
      </h3>
      <p className="mb-4 text-gray-500 text-xs dark:text-gray-400 capitalize">
        Role: {user.role?.replace(/mandala/gi, settings?.appShortName || "SAPA VI")}
      </p>
      <div 
        className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-500/20 py-1.5 px-3 rounded-xl block whitespace-normal break-words font-mono uppercase tracking-wider"
        title={instansiName}
      >
        {instansiName}
      </div>
    </div>
  );
}
