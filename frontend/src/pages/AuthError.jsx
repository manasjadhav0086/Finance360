import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthError() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const email = user?.email || 'admin@finance360.internal';
  const userName = user?.name || 'Administrator';

  const initials = (userName || email || 'US')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  const handleRetry = async () => {
    try {
      setRetrying(true);
      const userData = await fetchCurrentUser();
      if (userData) {
        navigate('/dashboard', { replace: true });
      }
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = () => {
    logout();
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 selection:bg-blue-100">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/fin/finance360_logo.svg"
            alt="Finance360"
            className="h-7 w-7 object-contain"
          />
          <div className="h-8 w-px bg-slate-300" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-blue-800 tracking-tight leading-none">
              Finance360
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Analytics Platform
            </span>
          </div>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
          <div className="p-6 sm:p-7 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 ring-8 ring-red-50/60 text-red-600 flex items-center justify-center mb-4 shrink-0 shadow-xs">
              <ShieldAlert className="w-7 h-7" strokeWidth={1.8} />
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Access Restricted
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Your account is authenticated but does not have active permissions to view the analytics dashboard.
            </p>

            {email && (
              <div className="w-full mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Signed In As</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate" title={email}>
                    {email}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full mt-4 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-left">
              <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-900 leading-relaxed font-normal">
                To request access, please share your email with an administrator. Once authorized in the user directory, retry access or sign back in.
              </div>
            </div>

            <div className="w-full mt-6 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                disabled={retrying}
                onClick={handleRetry}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
              >
                <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Checking...' : 'Retry Access'}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
