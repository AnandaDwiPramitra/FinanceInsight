import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Banknote,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTimeGreeting } from '../utils/formatMoney';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transaksi', icon: ListOrdered },
  { to: '/accounts', label: 'Akun', icon: Wallet },
  { to: '/savings', label: 'Tabungan', icon: Banknote },
  { to: '/analysis', label: 'Analisis', icon: BarChart3 },
  { to: '/optimization', label: 'Optimasi', icon: SlidersHorizontal },
  { to: '/prediction', label: 'Prediksi', icon: TrendingUp },
  { to: '/profile', label: 'Profil', icon: User },
];

const MOBILE_TABS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transaksi', icon: ListOrdered },
  { to: '/accounts', label: 'Akun', icon: Wallet },
  { to: '/analysis', label: 'Analisis', icon: BarChart3 },
];

interface LayoutProps {
  children: React.ReactNode;
  onOpenAiModal: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenAiModal }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav?.label || 'Finance Insight';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] text-zinc-900 dark:text-[#FAFAFA] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] z-30">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-[#18181B] dark:border dark:border-white/[0.12] dark:text-[#FAFAFA] shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-display text-base font-bold tracking-tight text-zinc-900 dark:text-[#FAFAFA] whitespace-nowrap truncate">
              Finance Insight
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1" aria-label="Navigasi Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-900/[0.06] dark:bg-white/[0.06] text-zinc-900 dark:text-[#FAFAFA] font-semibold border-l-2 border-zinc-900 dark:border-[#FAFAFA] rounded-r-xl'
                      : 'text-zinc-600 dark:text-zinc-400 font-medium border-l-2 border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.04] hover:text-zinc-900 dark:hover:text-[#FAFAFA] rounded-xl'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 dark:border-white/[0.08] p-4 space-y-3">
          <button
            type="button"
            onClick={onOpenAiModal}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap"
          >
            <Bot className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span>Tanya AI</span>
          </button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Keluar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-20 h-14 lg:h-16 border-b border-zinc-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#121215]/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base lg:text-lg font-bold tracking-tight text-zinc-900 dark:text-[#FAFAFA] truncate">
                <span className="lg:hidden">{pageTitle}</span>
                <span className="hidden lg:inline">
                  {getTimeGreeting()}, {user?.name || 'User'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenAiModal}
              className="lg:hidden flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0"
            >
              <Bot className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Tanya AI</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenAiModal}
              className="hidden lg:inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0"
            >
              <Bot className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span>Tanya AI: Prediksi & Optimasi</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 pb-24 lg:pb-10 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-zinc-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md grid grid-cols-5 items-center px-1"
      >
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full min-h-[44px] gap-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-zinc-900 dark:text-[#FAFAFA] font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center h-full min-h-[44px] gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile Slide-Out Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-[#121215] border-r border-zinc-200 dark:border-white/[0.08] h-full">
            <div className="flex h-14 items-center justify-between px-5 border-b border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-[#18181B] dark:border dark:border-white/[0.12] dark:text-[#FAFAFA]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="font-display font-bold text-zinc-900 dark:text-[#FAFAFA]">
                  Finance Insight
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 text-sm min-h-[44px] transition-colors ${
                        isActive
                          ? 'bg-zinc-900/[0.06] dark:bg-white/[0.06] text-zinc-900 dark:text-[#FAFAFA] font-semibold border-l-2 border-zinc-900 dark:border-[#FAFAFA] rounded-r-xl'
                          : 'text-zinc-700 dark:text-zinc-400 font-medium border-l-2 border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.04] rounded-xl'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </NavLink>
                );
              })}
            </div>

            <div className="border-t border-zinc-200 dark:border-white/[0.08] p-4 space-y-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
