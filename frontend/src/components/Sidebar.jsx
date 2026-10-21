import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tooltip from './ui/Tooltip';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Flame,
  FileSpreadsheet,
  Layers,
  TrendingUp,
  Globe,
  LogOut,
  Settings,
  Receipt,
  X,
  Shield,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Executive & Strategy',
    items: [
      {
        id: 'overview360',
        label: 'Executive 360°',
        icon: LayoutDashboard,
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: BarChart3,
      },
      {
        id: 'heatmap',
        label: 'Heatmap Matrix',
        icon: Flame,
      },
      {
        id: 'othermetrics',
        label: 'Other Metrics',
        icon: Receipt,
      },
    ],
  },
  {
    title: 'Financial Statements',
    items: [
      {
        id: 'pnlsummary',
        label: 'P&L Summary',
        icon: FileSpreadsheet,
      },
      {
        id: 'pnldis',
        label: 'P&L DIS',
        icon: Layers,
      },
      {
        id: 'pnltrend',
        label: 'P&L Trend',
        icon: TrendingUp,
      },
    ],
  },
  {
    title: 'Macro & Intelligence',
    items: [
      {
        id: 'livenews',
        label: 'Live Market News',
        icon: Globe,
      },
    ],
  },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  user,
  isAdmin,
  onOpenSettings,
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  const initials =
    (userName || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'US';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Lock body scroll on mobile when sidebar is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`fixed inset-0 bg-[#101828]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        id="sidebarBackdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 sm:w-64 max-w-[85vw] bg-[#101828] text-white border-r border-[#1D2939] z-50 lg:z-30 flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out lg:translate-x-0 select-none shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main Navigation"
      >
        {/* Top Branding Header */}
        <div className="h-16 px-4 bg-[#101828] border-b border-[#1D2939] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center shrink-0">
              <img
                src="/finance360_logo.png"
                alt="Finance360"
                className="h-8 w-8 object-contain rounded-lg shadow-xs bg-white p-1"
              />
            </div>
            <div className="h-6 w-px bg-[#1D2939] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white tracking-tight leading-none whitespace-nowrap">
                Finance360
              </span>
              <span className="text-[9px] font-semibold text-[#667085] tracking-wider uppercase mt-1">
                Analytics Suite
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-[#98A2B3] hover:text-white hover:bg-[#1D2939] rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close navigation menu"
            id="closeSidebarBtn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="p-3 flex-1 flex flex-col gap-5 overflow-y-auto custom-scroll" aria-label="Dashboard sections">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                {group.title}
              </span>

              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#246BFD] text-white font-semibold shadow-xs'
                        : 'text-[#98A2B3] hover:bg-[#1D2939] hover:text-white font-medium'
                    }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-white' : 'text-[#667085]'
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span className="truncate tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Account & Actions Footer */}
        <div className="p-3 border-t border-[#1D2939] bg-[#0C111D] shrink-0">
          <div className="p-2 rounded-xl bg-[#1D2939]/80 border border-[#344054]/60 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#246BFD] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate leading-tight" title={userName}>
                  {userName}
                </span>
                <span className="text-[10px] text-[#98A2B3] font-medium flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-[#5389FD] font-semibold">Administrator</span>
                  ) : (
                    <span>Financial User</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && typeof onOpenSettings === 'function' && (
                <Tooltip content="Settings & Users" position="top">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="p-1.5 text-[#98A2B3] hover:text-white hover:bg-[#344054]/60 rounded-md transition-colors cursor-pointer"
                    aria-label="Settings and user management"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}

              <Tooltip content="Sign Out" position="top">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#344054]/60 rounded-md transition-colors cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
