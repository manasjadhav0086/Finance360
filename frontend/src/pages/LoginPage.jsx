import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const loginResult = await login(cleanEmail, password);
      if (loginResult?.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }
      const redirectPath = searchParams.get('redirect') || '/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const apiMsg = err.response?.data?.error;
      if (apiMsg) {
        setErrorMessage(apiMsg);
      } else if (err.code === 'ERR_NETWORK') {
        setErrorMessage('Cannot connect to Finance360 backend server. Please verify the service is running.');
      } else {
        setErrorMessage('Failed to sign in. Please verify your credentials and try again.');
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

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-blue-200/90 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Enterprise Session</span>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 rounded-2xl shadow-2xl border border-white/20 p-5 sm:p-8 md:p-10 transition-all">
            {/* Title & Subtitle */}
            <div className="mb-6 sm:mb-8 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Sign in to your account
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Access executive financial reporting, variance analytics, and business intelligence.
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email / Username */}
              <div>
                <label
                  htmlFor="emailInput"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="emailInput"
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="passwordInput"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="passwordInput"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="••••••••••••"
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
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="loginSubmitBtn"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Note / System info */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500">
              <p>
                Default Admin:{' '}
                <span className="font-mono font-semibold text-slate-700">admin@finance360.local</span>
              </p>
            </div>
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
