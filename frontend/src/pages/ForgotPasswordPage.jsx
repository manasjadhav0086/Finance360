import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your corporate email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post(apiEndpoints.FORGOT_PASSWORD, { email: cleanEmail });
      setSuccessMessage(
        res.data?.message ||
        'If an account associated with this email address exists, password reset instructions have been generated.'
      );
    } catch (err) {
      console.error('Forgot password error:', err);
      const apiMsg = err.response?.data?.error;
      if (apiMsg) {
        setErrorMessage(apiMsg);
      } else {
        setErrorMessage('Unable to process password reset request. Please check network connectivity and try again.');
      }
    } finally {
      setIsLoading(false);
    }
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

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#344054] hover:text-[#101828] bg-white hover:bg-[#F9FAFB] px-3 py-1.5 rounded-lg border border-[#D0D5DD] shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-[440px] mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl border border-[#E4E7EC] p-7 sm:p-9 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
              Reset your password
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#667085] leading-relaxed">
              Enter your registered corporate email and we will generate secure single-use instructions to reset your account.
            </p>
          </div>

          {/* Success Message Banner */}
          {successMessage && (
            <div
              className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-start gap-3 animate-in fade-in duration-150"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-[#12B981] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Instructions Dispatched</span>
                <p className="leading-relaxed text-[#047857]">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#912018] text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="forgotEmailInput"
                className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
              >
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="forgotEmailInput"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (successMessage) setSuccessMessage('');
                  }}
                  placeholder="name@company.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#D0D5DD] rounded-xl text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:border-[#246BFD] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#F2F4F7] text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#246BFD] hover:text-[#1D4ED8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-xs text-[#98A2B3]">
        <p>© {new Date().getFullYear()} Finance360 Intelligence Suite. All rights reserved.</p>
      </footer>
    </div>
  );
}
