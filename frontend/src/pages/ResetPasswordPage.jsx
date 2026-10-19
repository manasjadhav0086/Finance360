import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api, { clearAccessToken } from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setIsTokenValid(false);
      setErrorMessage('Reset token is missing or incomplete.');
      return;
    }

    setIsVerifying(true);
    api.post(apiEndpoints.VERIFY_RESET_TOKEN, { token })
      .then((res) => {
        if (res.data?.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          setErrorMessage(res.data?.error || 'This password reset link is invalid or has expired.');
        }
      })
      .catch((err) => {
        console.error('Verify reset token error:', err);
        setIsTokenValid(false);
        setErrorMessage(err.response?.data?.error || 'This password reset link is invalid or has expired.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(apiEndpoints.RESET_PASSWORD, {
        token,
        newPassword,
      });
      clearAccessToken();
      setIsSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMessage(
        err.response?.data?.error || 'Failed to reset password. The link may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/fin/finance360_logo.png"
              alt="Finance360 Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              Finance360
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-blue-200 tracking-wider uppercase">
              Financial Intelligence Suite
            </span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-semibold text-blue-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10 transition-all cursor-pointer min-h-[36px] flex items-center"
        >
          Sign In
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 rounded-2xl shadow-2xl border border-white/20 p-5 sm:p-8 md:p-10 transition-all">
            {isVerifying ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wider">Verifying reset token...</p>
              </div>
            ) : isSuccess ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">Password Updated</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Your password has been successfully reset. You can now sign in with your new credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : !isTokenValid ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">Invalid Reset Link</h1>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {errorMessage || 'This password reset link is invalid or has expired for security reasons.'}
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Request a New Reset Link</span>
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-6 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Set new password
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Please choose a strong password with at least 8 characters.
                  </p>
                </div>

                {errorMessage && (
                  <div
                    className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        disabled={isSubmitting}
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
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="resetPasswordSubmitBtn"
                    disabled={isSubmitting}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </form>
              </div>
            )}
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
