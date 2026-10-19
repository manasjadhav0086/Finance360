import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const userEmail = user?.email || 'Authorized User';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      return;
    }

    try {
      setIsLoading(true);
      await changePassword(newPassword, confirmPassword);
      // Navigate straight to dashboard with full access
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Password change error:', err);
      const apiMsg = err.response?.data?.error;
      if (apiMsg) {
        setErrorMessage(apiMsg);
      } else {
        setErrorMessage('Failed to configure password. Please try again or contact your administrator.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-[#0B1E36] via-[#122A56] to-[#1E56A0] text-slate-100 selection:bg-blue-500 selection:text-white antialiased">
      {/* Decorative background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center">
            <img
              src="/fin/finance360_logo.png"
              alt="Finance360 Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white leading-tight">
              Finance360
            </span>
            <span className="text-[10px] font-semibold text-blue-200 tracking-wider uppercase">
              Financial Intelligence Suite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-amber-200 bg-amber-500/15 border border-amber-400/30 px-3 py-1.5 rounded-full backdrop-blur-xs">
          <ShieldCheck className="w-4 h-4 text-amber-300" />
          <span>Mandatory Account Activation</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10 transition-all">
            <div className="mb-6 text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                First-Login Password Setup
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Configure your password
              </h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                As an authorized user signing in with initial credentials, please choose a private, permanent password before accessing the analytics dashboard.
              </p>
            </div>

            {/* User Account Info Chip */}
            <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Configuring account:</span>
              <span className="font-bold text-slate-800 font-mono">{userEmail}</span>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div
                className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* New Password */}
              <div>
                <label
                  htmlFor="newPasswordInput"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPasswordInput"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="At least 8 characters"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPasswordInput"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPasswordInput"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Re-enter new password"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="changePasswordSubmitBtn"
                disabled={isLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving password & activating...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out and configure later</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-blue-200/70">
        <p>© {new Date().getFullYear()} Finance360 Intelligence Suite. All rights reserved.</p>
      </footer>
    </div>
  );
}
