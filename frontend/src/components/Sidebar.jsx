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
  Target,
  Globe,
  LogOut,
  Settings,
  Users
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Executive & Analytics',
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
        id: 'kpis',
        label: 'KPI Scorecard',
        icon: Target,
      },
      {
        id: 'othermetrics',
        label: 'Other Metrics',
        icon: Users,
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
    title: 'Macro & Grounding',
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
  const userName = user?.name || 'User';

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
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden ${isOpen ? 'block' : 'hidden'
          }`}
        id="sidebarBackdrop"
        onClick={onClose}
      />

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-gradient-to-b from-[#1E56A0] via-[#184480] to-[#122A56] text-white border-r border-[#163B70] z-50 flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out lg:translate-x-0 select-none shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="h-16 px-4 bg-white/10 backdrop-blur-md border-b border-white/15 flex items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white px-1.5 py-1 rounded-md shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/fin/niit_logo.svg"
                alt="NIIT"
                className="h-5.5 w-auto object-contain"
              />
            </div>
            <div className="h-7 w-px bg-white/25 shrink-0" />
            <span className="text-lg font-bold text-white tracking-tight leading-none drop-shadow-xs whitespace-nowrap">
              Finance360
            </span>
          </div>
        </div>

        <nav className="p-3 flex-1 flex flex-col gap-5 overflow-y-auto custom-scroll" aria-label="Dashboard sections">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-1">
              <span className="px-3 text-[10.5px] font-bold text-blue-200/85 uppercase tracking-wider mb-0.5">
                {group.title}
              </span>

              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer text-left ${isActive
                      ? 'bg-white text-[#1E56A0] font-bold shadow-lg shadow-black/15 scale-[1.02]'
                      : 'text-blue-100/90 hover:bg-white/12 hover:text-white font-semibold'
                      }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                  >
                    <IconComponent
                      className={`w-4.5 h-4.5 shrink-0 transition-transform duration-150 ${isActive ? 'text-[#1E56A0]' : 'text-blue-200'
                        }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="truncate tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/15 bg-black/10 shrink-0">
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white text-[#1E56A0] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate leading-tight" title={userName}>
                  {userName}
                </span>
                <span className="text-[10px] text-blue-200 font-medium">Finance Exec</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && typeof onOpenSettings === 'function' && (
                <Tooltip content="Settings & Users" position="top">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="p-1.5 text-blue-200 hover:text-white hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}

              <Tooltip content="Sign Out" position="top">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-blue-200 hover:text-rose-300 hover:bg-white/15 rounded-md transition-colors cursor-pointer"
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
