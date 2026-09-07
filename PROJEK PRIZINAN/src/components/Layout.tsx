import { type ReactNode, useState } from 'react';
import {
  Home,
  FilePlus2,
  BarChart3,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type PageId = 'dashboard' | 'catat' | 'rekap' | 'santri' | 'users' | 'log';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'catat', label: 'Catat Izin', icon: FilePlus2 },
  { id: 'rekap', label: 'Rekap', icon: BarChart3 },
  { id: 'santri', label: 'Data Santri', icon: Users },
  { id: 'users', label: 'Manajemen User', icon: UserCog, superAdminOnly: true },
  { id: 'log', label: 'Log Aktivitas', icon: FileText },
];

interface LayoutProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.superAdminOnly || profile?.role === 'super_admin'
  );

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileNavOpen(false);
  };

  const mobileBottomNav = visibleNavItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 flex-col z-30">
        <div className="px-6 py-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-stone-800 text-sm leading-tight">Perizinan Santri</h1>
              <p className="text-xs text-stone-400">Sistem Pencatatan</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                {item.label}
                {item.superAdminOnly && (
                  <span className="ml-auto text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                    SA
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-sm">
              {profile?.nama?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-700 truncate">{profile?.nama || 'User'}</p>
              <p className="text-xs text-stone-400">
                {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 bg-white border-b border-stone-200 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-stone-800 text-sm leading-tight">Perizinan Santri</h1>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-lg hover:bg-stone-100"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-stone-100 px-3 py-3 space-y-1 animate-slide-up">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        )}
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30 px-2 py-1.5 flex justify-around">
        {mobileBottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-primary-600' : 'text-stone-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
