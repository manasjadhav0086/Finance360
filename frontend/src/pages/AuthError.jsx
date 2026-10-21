import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail, HelpCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthError() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const email = user?.email || 'admin@misar.io';
  const userName = user?.name || 'Authorized User';

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
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-4 sm:p-6 text-[#101828] selection:bg-[#246BFD] selection:text-white antialiased">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Header Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white p-1.5 shadow-xs border border-[#E4E7EC] flex items-center justify-center shrink-0">
            <img
              src="/finance360_logo.png"
              alt="Finance360"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#101828] tracking-tight leading-none">
              Finance360
            </span>
            <span className="text-[10px] text-[#667085] font-semibold tracking-wider uppercase mt-0.5">
              Enterprise Intelligence
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white border border-[#E4E7EC] rounded-2xl shadow-sm overflow-hidden transition-all">
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] flex items-center justify-center mb-4 shrink-0 shadow-xs">
              <ShieldAlert className="w-7 h-7" strokeWidth={1.8} />
            </div>

            <h1 className="text-xl font-bold text-[#101828] tracking-tight">
              Access Restricted
            </h1>
            <p className="text-xs text-[#667085] mt-1.5 max-w-xs leading-relaxed">
              Your account is authenticated, but does not currently have permissions assigned to view the analytics dashboard.
            </p>

            {email && (
              <div className="w-full mt-5 p-3 rounded-xl bg-[#F9FAFB] border border-[#E4E7EC] flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-[#246BFD] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#98A2B3] font-semibold uppercase tracking-wider">
                    <Mail className="w-3 h-3 text-[#98A2B3]" />
                    <span>Signed In As</span>
                  </div>
                  <span className="text-xs font-semibold text-[#101828] truncate" title={email}>
                    {email}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full mt-4 p-3.5 rounded-xl bg-[#EFF4FF] border border-[#D1E0FF] flex items-start gap-2.5 text-left">
              <HelpCircle className="w-4 h-4 text-[#246BFD] mt-0.5 shrink-0" />
              <div className="text-xs text-[#1E3A8A] leading-relaxed font-normal">
                To request dashboard access, contact your administrator. Once authorized in User Access Control, retry access or sign back in.
              </div>
            </div>

            <div className="w-full mt-6 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                disabled={retrying}
                onClick={handleRetry}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#246BFD] hover:bg-[#1D4ED8] disabled:bg-[#93B4FD] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Checking...' : 'Retry Access'}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#D0D5DD] text-[#344054] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#667085]" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
