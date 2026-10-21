import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Layers,
  CheckCircle2,
} from 'lucide-react';

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
      setErrorMessage('Please enter your corporate email address.');
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
        setErrorMessage('Unable to connect to Finance360 backend service. Please check network connectivity.');
      } else {
        setErrorMessage('Authentication failed. Please verify your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F5F7FB] text-[#101828] selection:bg-[#246BFD] selection:text-white antialiased">
      {/* ==========================================================
          LEFT BRANDED PANEL (Desktop Only)
          ========================================================== */}
      <aside className="hidden lg:flex lg:w-[48%] xl:w-[45%] bg-[#101828] text-white p-12 flex-col justify-between relative overflow-hidden border-r border-[#1D2939]">
        {/* Subtle geometric background grid lines */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl bg-white p-1.5 shadow-sm flex items-center justify-center shrink-0">
              <img
                src="/finance360_logo.png"
                alt="Finance360"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-none">
                Finance360
              </span>
              <span className="text-[10px] font-semibold text-[#667085] tracking-wider uppercase mt-1 block">
                Financial Intelligence Suite
              </span>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D2939] border border-[#344054] text-xs font-medium text-[#D0D5DD]">
              <span className="w-2 h-2 rounded-full bg-[#12B981]" />
              Enterprise Analytics Platform v2.0
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Executive clarity for financial decision makers.
            </h2>
            <p className="text-sm text-[#98A2B3] leading-relaxed">
              Consolidate P&amp;L performance, analyze unit margins, track capital allocation, and ground forecasts in automated corporate variance intelligence.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-1 gap-3.5 my-8 max-w-md">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1D2939]/70 border border-[#344054]/60">
            <div className="p-2 rounded-lg bg-[#246BFD]/15 text-[#246BFD] shrink-0 mt-0.5">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Full-Stack Normalized P&amp;L</h3>
              <p className="text-[11px] text-[#98A2B3] mt-0.5 leading-snug">
                Unified Actuals, Budget, and Trailing variance rollups across all operational business units.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1D2939]/70 border border-[#344054]/60">
            <div className="p-2 rounded-lg bg-[#12B981]/15 text-[#12B981] shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Executive360 Performance Cockpit</h3>
              <p className="text-[11px] text-[#98A2B3] mt-0.5 leading-snug">
                Real-time EBITDA leverage, working capital realization, and cash-flow tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1D2939]/70 border border-[#344054]/60">
            <div className="p-2 rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Strict Row-Level Access Control</h3>
              <p className="text-[11px] text-[#98A2B3] mt-0.5 leading-snug">
                Deterministic security scoping for Segment and Business Unit data governance.
              </p>
            </div>
          </div>
        </div>

        {/* Security / Trust Footer */}
        <div className="relative z-10 pt-6 border-t border-[#1D2939] flex items-center justify-between text-xs text-[#667085]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#12B981]" />
            <span>256-bit Encrypted Enterprise Session</span>
          </div>
          <span>© {new Date().getFullYear()} Finance360</span>
        </div>
      </aside>

      {/* ==========================================================
          RIGHT AUTHENTICATION PANEL
          ========================================================== */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
        {/* Mobile Header Branding */}
        <div className="flex lg:hidden items-center justify-between w-full max-w-md mx-auto mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-white p-1 shadow-xs border border-[#E4E7EC] flex items-center justify-center">
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
              <span className="text-[9px] font-semibold text-[#667085] tracking-wider uppercase">
                Enterprise Suite
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#065F46] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#12B981]" />
            <span>Secure</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-[420px] mx-auto my-auto">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-7 sm:p-9 shadow-sm">
            {/* Title & Introduction */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                Sign in to your account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#667085] leading-relaxed">
                Welcome back. Enter your corporate credentials to access your financial dashboard.
              </p>
            </div>

            {/* Error Message Alert */}
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
              {/* Email Address */}
              <div>
                <label
                  htmlFor="emailInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#344054] mb-1.5"
                >
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
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
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#D0D5DD] rounded-xl text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:border-[#246BFD] transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="passwordInput"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#344054]"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#246BFD] hover:text-[#1D4ED8] hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#98A2B3]">
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

              {/* Submit Button */}
              <button
                type="submit"
                id="loginSubmitBtn"
                disabled={isLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#98A2B3] mt-6">
          <p>Protected by enterprise session authentication &amp; RBAC governance.</p>
        </div>
      </main>
    </div>
  );
}
