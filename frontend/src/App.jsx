import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthError from './pages/AuthError';
import { Loader2 } from 'lucide-react';

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
    const currentPath = location.pathname.startsWith('/fin') ? location.pathname.slice(4) || '/' : location.pathname;
    const redirectQuery = currentPath && currentPath !== '/' && currentPath !== '/login'
      ? `?redirect=${encodeURIComponent(currentPath + location.search)}`
      : '';
    return <Navigate to={`/login${redirectQuery}`} replace />;
  }

  // Block dashboard and all protected screens until mandatory password setup is completed
  if (user?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

function LogoutHandler() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
    // Redirect cleanly back to login page
    window.location.replace('/login');
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

function ResetPasswordRedirect() {
  const location = useLocation();
  return <Navigate to={`/reset-password${location.search}`} replace />;
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

      {/* Backward-compatible redirects for legacy /fin/* paths */}
      <Route path="/fin" element={<Navigate to="/" replace />} />
      <Route path="/fin/login" element={<Navigate to="/login" replace />} />
      <Route path="/fin/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/fin/change-password" element={<Navigate to="/change-password" replace />} />
      <Route path="/fin/forgot-password" element={<Navigate to="/forgot-password" replace />} />
      <Route path="/fin/reset-password" element={<ResetPasswordRedirect />} />
      <Route path="/fin/auth-error" element={<Navigate to="/auth-error" replace />} />
      <Route path="/fin/*" element={<Navigate to="/" replace />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
