import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#F5F7FB] text-[#101828] selection:bg-[#246BFD] selection:text-white antialiased p-4 sm:p-8">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white p-1.5 shadow-xs border border-[#E4E7EC] flex items-center justify-center shrink-0">
            <img
              src="/finance360_logo.png"
              alt="Finance360"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-[#101828] block leading-none">
              Finance360
            </span>
            <span className="text-[9px] font-semibold text-[#667085] tracking-wider uppercase mt-0.5 block">
              Financial Intelligence Suite
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D92D20] hover:text-[#B42318] bg-white hover:bg-[#FEF3F2] px-3 py-1.5 rounded-lg border border-[#FECDCA] shadow-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-[440px] mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl border border-[#E4E7EC] p-7 sm:p-9 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#EFF4FF] text-[#246BFD] border border-[#D1E0FF] mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Initial Setup Required</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
              Set your personal password
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#667085] leading-relaxed">
              Account: <span className="font-mono font-medium text-[#101828]">{userEmail}</span>. For corporate security, please configure a new personal password before proceeding.
            </p>
          </div>

          {errorMessage && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#912018] text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 bg-[#FFFFFF] border border-[#D0D5DD] rounded-xl text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:border-[#246BFD] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Re-enter new password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 bg-[#FFFFFF] border border-[#D0D5DD] rounded-xl text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:border-[#246BFD] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring account...</span>
                </>
              ) : (
                <>
                  <span>Save Password &amp; Open Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-[#98A2B3]">
        <p>© {new Date().getFullYear()} Finance360 Intelligence Suite. All rights reserved.</p>
      </footer>
    </div>
  );
}
