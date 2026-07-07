import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../ui/modal";
import { getRoleSlug } from "../../services/roleUtils";
import { useSystemSettings } from "../../context/SystemSettingsContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [is2FASetup, setIs2FASetup] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, verify2FA, setAuthData } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);

      if (result.requires2FA) {
        setTempToken(result.tempToken || "");
        setIs2FASetup(result.is2FASetup ?? true);
        if (result.is2FASetup === false) {
          setQrCodeUrl(result.qrCodeUrl || "");
          setSetupSecret(result.secret || "");
        }
        setIs2FAModalOpen(true);
      } else if (result.accessToken && result.user) {
        localStorage.setItem("auth_token", result.accessToken);
        localStorage.setItem("user_data", JSON.stringify(result.user));
        setAuthData(result.user);
        navigate(`/${getRoleSlug(result.user.role)}`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Login gagal. Periksa kembali username dan password Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verify2FA(tempToken, otp, !is2FASetup ? setupSecret : undefined);
      setIs2FAModalOpen(false);
      
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        navigate(`/${getRoleSlug(user.role)}`);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Kode keamanan tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="px-5 sm:px-0">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-gray-800 text-title-md dark:text-white/90">
              Masuk ke {settings?.appShortName || "MANDALA"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Silakan masukkan NIP dan kata sandi Anda.
            </p>
          </div>

          {error && !is2FAModalOpen && (
            <div className="p-4 mb-6 text-sm text-error-600 bg-error-50 border border-error-100 rounded-xl dark:bg-error-500/10 dark:border-error-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="space-y-5">
              <div>
                <Label>NIP (Nomor Induk Pegawai)</Label>
                <Input
                  placeholder="Masukkan NIP Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Kata Sandi</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  to="/reset-password"
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div>
                <Button
                  className="w-full rounded-xl py-3 text-base font-semibold shadow-lg shadow-brand-500/20"
                  size="md"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? "Memproses..." : "Masuk Sekarang"}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-normal text-center text-gray-500 dark:text-gray-400 sm:text-start">
              Belum punya akun? {""}
              <Link
                to="/signup"
                className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Hubungi Admin Instansi
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        className="max-w-[450px] p-6 sm:p-10"
      >
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
            {is2FASetup ? "Verifikasi Keamanan" : "Aktivasi 2FA"}
          </h2>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            {is2FASetup
              ? "Masukkan 6 digit kode dari aplikasi authenticator Anda"
              : "Scan QR Code di bawah dengan aplikasi Google Authenticator/Authy"}
          </p>

          {error && is2FAModalOpen && (
            <div className="p-4 mb-6 text-sm text-error-600 bg-error-50 border border-error-100 rounded-xl dark:bg-error-500/10 dark:border-error-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify2FA}>
            <div className="space-y-6 text-left">
              {!is2FASetup && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white border-2 border-gray-100 border-dashed rounded-3xl dark:bg-gray-800 dark:border-gray-700">
                    <QRCodeSVG value={qrCodeUrl} size={180} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Kunci Cadangan
                    </p>
                    <code className="px-3 py-1 font-mono text-sm font-bold text-brand-600 bg-brand-50 rounded-lg dark:bg-brand-500/10 dark:text-brand-400">
                      {setupSecret}
                    </code>
                  </div>
                </div>
              )}
              <div>
                <Label>6 Digit Kode Keamanan</Label>
                <Input
                  type="text"
                  placeholder="000 000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  required
                  className="text-2xl tracking-[0.5em] text-center font-bold rounded-xl"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setIs2FAModalOpen(false)}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  Batal
                </Button>
                <Button disabled={loading} type="submit" className="w-full rounded-xl">
                  {loading ? "Verifikasi..." : "Verifikasi"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
