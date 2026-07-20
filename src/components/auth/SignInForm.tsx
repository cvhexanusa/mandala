import { useState } from "react";
import { useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../ui/modal";
import { getRoleSlug } from "../../services/roleUtils";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import api from "../../services/api";

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

  // Reset 2FA States
  const [isReset2FAModalOpen, setIsReset2FAModalOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetOTP, setResetOTP] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleRequestReset2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const response = await api.post("/mandala/auth/reset-2fa/request", {
        username: resetUsername,
        password: resetPassword,
      });
      if (response.data?.resetToken) {
        setResetToken(response.data.resetToken);
        setResetSuccess(response.data.message || "OTP telah dikirim.");
        setResetStep(2);
      }
    } catch (err: any) {
      setResetError(err.response?.data?.message || "Gagal memproses reset 2FA.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyReset2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const response = await api.post("/mandala/auth/reset-2fa/verify", {
        resetToken,
        code: resetOTP,
      });
      setResetSuccess(response.data?.message || "2FA berhasil di-reset.");
      setTimeout(() => {
        setIsReset2FAModalOpen(false);
        // Reset states
        setResetUsername("");
        setResetPassword("");
        setResetOTP("");
        setResetStep(1);
        setResetToken("");
        setResetSuccess(null);
      }, 3000);
    } catch (err: any) {
      setResetError(err.response?.data?.message || "Verifikasi OTP gagal.");
    } finally {
      setResetLoading(false);
    }
  };

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
              Masuk ke {settings?.appShortName || "SAPA VI"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Silakan masukkan NIP/Email dan kata sandi Anda.
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
                <Label>NIP / Email</Label>
                <Input
                  placeholder="Masukkan NIP atau Email Anda"
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

              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => {
                    setResetError(null);
                    setResetSuccess(null);
                    setResetStep(1);
                    setIsReset2FAModalOpen(true);
                  }}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 bg-transparent border-none p-0 cursor-pointer"
                >
                  Reset 2FA?
                </button>
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

      {/* Reset 2FA Modal */}
      <Modal
        isOpen={isReset2FAModalOpen}
        onClose={() => setIsReset2FAModalOpen(false)}
        className="max-w-[450px] p-6 sm:p-10"
      >
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90 sm:text-2xl">
            Reset 2FA
          </h2>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            {resetStep === 1
              ? "Masukkan username/NIP dan password Anda untuk mengajukan reset 2FA"
              : "Masukkan 6-digit kode OTP yang dikirim ke email terdaftar Anda"}
          </p>

          {resetError && (
            <div className="p-4 mb-6 text-sm text-error-600 bg-error-50 border border-error-100 rounded-xl dark:bg-error-500/10 dark:border-error-500/20">
              {resetError}
            </div>
          )}

          {resetSuccess && (
            <div className="p-4 mb-6 text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl dark:bg-green-500/10 dark:text-green-400 dark:border-green-900/30">
              {resetSuccess}
            </div>
          )}

          {resetStep === 1 ? (
            <form onSubmit={handleRequestReset2FA}>
              <div className="space-y-6 text-left">
                <div>
                  <Label>
                    NIP / Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    placeholder="Masukkan NIP atau Email"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showResetPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                    <span
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showResetPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsReset2FAModalOpen(false)}
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button disabled={resetLoading} type="submit" className="w-full rounded-xl">
                    {resetLoading ? "Memproses..." : "Kirim OTP"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyReset2FA}>
              <div className="space-y-6 text-left">
                <div>
                  <Label>
                    6-Digit Kode OTP <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="000 000"
                    value={resetOTP}
                    onChange={(e) => setResetOTP(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    required
                    className="text-2xl tracking-[0.5em] text-center font-bold rounded-xl"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setResetStep(1)}
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Kembali
                  </Button>
                  <Button disabled={resetLoading} type="submit" className="w-full rounded-xl">
                    {resetLoading ? "Verifikasi..." : "Verifikasi"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
