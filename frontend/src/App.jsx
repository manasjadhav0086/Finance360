import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthError from './pages/AuthError';
import { Loader2 } from 'lucide-react';

function DesktopOnlyNotice() {
  return (
    <div className="fixed inset-0 z-50 flex md:hidden items-center justify-center bg-white">
      <div className="relative flex flex-col items-center justify-center text-center overflow-hidden w-full h-full">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[260px] w-[420px]">
            <div className="absolute left-10 top-28 h-12 w-36 rounded-xl rotate-[-6deg] bg-slate-100/80" />
            <div className="absolute right-12 top-36 h-10 w-32 rounded-xl rotate-[5deg] bg-slate-100/80" />
            <div className="absolute left-36 top-20 h-8 w-24 rounded-lg rotate-[3deg] bg-slate-50/90" />
            <span className="absolute left-[80px] top-[110px] block h-2 w-2 rounded-full bg-slate-300" />
            <span className="absolute right-[90px] top-[150px] block h-2 w-2 rounded-full bg-slate-300" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex items-center justify-center">
                <svg className="h-24 w-24 text-slate-200" fill="none" viewBox="0 0 48 48" stroke="currentColor">
                  <circle cx="24" cy="24" r="22" strokeWidth="2.5" />
                  <path d="M16 32l16-16M32 32L16 16" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center max-w-md px-6">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="text-base font-semibold text-blue-700">Desktop Only</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Please use a desktop or larger screen</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The executive financial dashboard is best experienced on a desktop or laptop.<br />
            For optimal viewing and interaction, please access the analytics on a device with a larger screen.
          </p>
        </div>
      </div>
    </div>
  );
}

import ChangePasswordPage from './pages/ChangePasswordPage';

function ProtectedRoute({ children }) {
  const { user, isLoggedIn, isUnauthorized, loadingUser, authLoading, loading, isLoggingOut } = useAuth();
  const location = window.location;

  if (authLoading || loadingUser || loading || isLoggingOut) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isUnauthorized) {
    return <Navigate to="/auth-error" replace />;
  }

  if (!isLoggedIn) {
    const currentPath = location.pathname.startsWith('/fin') ? location.pathname.slice(4) : location.pathname;
    const redirectQuery = currentPath && currentPath !== '/' && currentPath !== '/login'
      ? `?redirect=${encodeURIComponent(currentPath + location.search)}`
      : '';
    return <Navigate to={`/login${redirectQuery}`} replace />;
  }

  // Block dashboard and all protected screens until mandatory password setup is completed
  if (user?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <>
      <DesktopOnlyNotice />
      {children}
    </>
  );
}

function LogoutHandler() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
    // Redirect cleanly back to login page
    window.location.replace('/fin/login');
  }, [logout]);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-6 select-none">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <div className="text-xs font-bold tracking-widest uppercase text-blue-900 font-mono">
        Signing out...
      </div>
    </div>
  );
}

function MainApp() {
  const { user, isAdmin, isLoggedIn, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            user?.must_change_password ? (
              <Navigate to="/change-password" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/change-password"
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : !user?.must_change_password ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <ChangePasswordPage />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={
          isLoggedIn && !user?.must_change_password ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <ForgotPasswordPage />
          )
        }
      />
      <Route
        path="/reset-password"
        element={
          isLoggedIn && !user?.must_change_password ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <ResetPasswordPage />
          )
        }
      />
      <Route path="/auth-error" element={<AuthError />} />
      <Route path="/logout" element={<LogoutHandler />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard user={user} isAdmin={isAdmin} />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/fin">
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
