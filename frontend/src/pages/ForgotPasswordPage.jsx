import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      setErrorMessage('Please enter your email address.');
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
        setErrorMessage('Unable to process password reset request. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
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

        <Link
          to="/login"
          className="flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Form Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10 transition-all">
            <div className="mb-6 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Enter your registered email address and we'll generate single-use instructions to reset your account password.
              </p>
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

            {/* Success Confirmation Banner */}
            {successMessage ? (
              <div className="space-y-6">
                <div
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 animate-in fade-in duration-200"
                  role="status"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold text-emerald-950 mb-1">Request Received</p>
                    <p>{successMessage}</p>
                    <p className="mt-2 text-[11px] text-emerald-700">
                      In development mode, check server logs for the generated reset link.
                    </p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="resetEmailInput"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Registered Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="resetEmailInput"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="name@finance360.internal"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="forgotPasswordSubmitBtn"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing request...</span>
                    </>
                  ) : (
                    <span>Send Reset Instructions</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
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
