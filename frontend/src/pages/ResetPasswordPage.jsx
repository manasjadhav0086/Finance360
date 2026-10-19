import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api, { clearAccessToken } from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#F5F7FB] text-[#101828] selection:bg-[#246BFD] selection:text-white antialiased p-4 sm:p-8">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white p-1.5 shadow-xs border border-[#E4E7EC] flex items-center justify-center shrink-0">
            <img
              src="/fin/finance360_logo.png"
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

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344054] hover:text-[#101828] bg-white hover:bg-[#F9FAFB] px-3 py-1.5 rounded-lg border border-[#D0D5DD] shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[440px] mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl border border-[#E4E7EC] p-7 sm:p-9 shadow-sm">
          {isVerifying ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#667085]">
              <Loader2 className="w-8 h-8 animate-spin text-[#246BFD]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#344054]">
                Verifying secure token...
              </p>
            </div>
          ) : isSuccess ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#12B981]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#101828]">Password Updated</h1>
                <p className="mt-2 text-xs sm:text-sm text-[#667085] leading-relaxed">
                  Your corporate password has been reset securely. You can now log into your dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !isTokenValid ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#FEF3F2] border border-[#FECDCA] flex items-center justify-center text-[#D92D20]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#101828]">Invalid Reset Link</h1>
                <p className="mt-2 text-xs sm:text-sm text-[#667085] leading-relaxed">
                  {errorMessage || 'This password reset link is invalid or has expired for security reasons.'}
                </p>
              </div>
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer"
              >
                <span>Request a New Reset Link</span>
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                  Set new password
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#667085] leading-relaxed">
                  Choose a secure corporate password with at least 8 characters.
                </p>
              </div>

              {errorMessage && (
                <div
                  className="mb-6 p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#912018] text-xs flex items-start gap-2.5"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* New Password */}
                <div>
                  <label
                    htmlFor="newPasswordInput"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
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

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPasswordInput"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#D0D5DD] rounded-xl text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:border-[#246BFD] transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="resetPasswordSubmitBtn"
                  disabled={isSubmitting}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
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
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-[#98A2B3]">
        <p>© {new Date().getFullYear()} Finance360 Intelligence Suite. All rights reserved.</p>
      </footer>
    </div>
  );
}
