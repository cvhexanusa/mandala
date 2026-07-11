import { Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { useAuth } from "../../context/AuthContext";
import { getRoleSlug } from "../../services/roleUtils";
import { useSystemSettings } from "../../context/SystemSettingsContext";

export default function SignIn() {
  const { user, isAuthenticated, loading } = useAuth();
  const { settings } = useSystemSettings();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={`/${getRoleSlug(user.role)}`} replace />;
  }

  const appName = settings?.appName || "SAPA VI";

  return (
    <>
      <PageMeta
        title={`Masuk ke ${appName}`}
        description={`Halaman Masuk untuk aplikasi ${appName}`}
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
