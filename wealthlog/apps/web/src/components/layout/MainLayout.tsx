"use client";

import { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '@wealthlog/common';

// Theme types and constants
type ThemeMode = 'light' | 'dark' | 'system';

interface NavigationItem {
  href: string;
  label: string;
  icon: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/accounts', label: 'Accounts', icon: '💼' },
  { href: '/trading', label: 'Trading', icon: '📈' },
  { href: '/real-estate', label: 'Real Estate', icon: '🏘️' },
  { href: '/coming-soon', label: 'Expenses', icon: '💳' },
  { href: '/coming-soon', label: 'Loans', icon: '💰' },
  { href: '/coming-soon', label: 'Forecasting', icon: '📊' },
  { href: '/settings/general', label: 'General Settings', icon: '⚙️' },
  { href: '/settings/trading', label: 'Trading Settings', icon: '🛠️' },
];

/* Public routes requiring no auth. Note: locale is not part of the pathname */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/landing', '/verify-email', '/reset-password', '/coming-soon'];

// Utility to check if a route is public
const isPublicRoute = (pathname: string): boolean => {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  return false;
};

// Helper to get theme from localStorage
const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('displayMode') as ThemeMode) || 'system';
};

// Reusable components
const NavigationLink = ({ item, isCollapsed = false, onNavigate }: { item: NavigationItem, isCollapsed?: boolean, onNavigate?: () => void }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));


  return (
    <Link href={item.href} legacyBehavior>
      <a
        onClick={onNavigate}
        className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        <span className="text-lg">{item.icon}</span>
        {!isCollapsed && <span className="truncate text-sm font-medium">{item.label}</span>}
      </a>
    </Link>
  );
};

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 font-medium">Loading WealthLog...</p>
    </div>
  </div>
);

// Main Layout Component
export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  // State for UI
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize theme
  useEffect(() => {
    setThemeMode(getStoredTheme());
  }, []);

  // Persist theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('displayMode', themeMode);
    }
  }, [themeMode]);

  // Fetch user-specific settings if authenticated
  useEffect(() => {
    if (user) {
      api.get('/generalSettings').then(({ data }) => {
        if (data?.displayMode) {
          setThemeMode(data.displayMode as ThemeMode);
        }
      }).catch(error => {
        console.warn('Failed to fetch user settings:', error);
      });
    }
  }, [user]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user && !isPublicRoute(pathname)) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const handleLogoClick = () => {
    router.push('/dashboard');
    setIsDrawerOpen(false);
  };

  if (loading || (!user && !isPublicRoute(pathname))) {
      return <LoadingScreen />;
  }

  if (isPublicRoute(pathname)) {
      return <>{children}</>;
  }

  // Main authenticated layout
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-blue-600 to-blue-700 border-r border-blue-500/20 shadow-xl`}>
        <header className="flex items-center gap-3 p-6 cursor-pointer hover:bg-white/5 transition-colors" onClick={handleLogoClick}>
          <img src="/logo.png" alt="WealthLog" className="h-8 w-8 object-contain" />
          {!isSidebarCollapsed && <h1 className="text-white font-bold text-xl tracking-tight">WealthLog</h1>}
        </header>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {NAVIGATION_ITEMS.map(item => <NavigationLink key={item.href} item={item} isCollapsed={isSidebarCollapsed} />)}
        </nav>

        <footer className="p-4 space-y-3 border-t border-white/10">
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-200 flex items-center justify-center" title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <span className="text-lg">{isSidebarCollapsed ? '→' : '←'}</span>
          </button>
          {!isSidebarCollapsed && (
            <button onClick={logout} className="w-full py-3 rounded-lg bg-white text-blue-600 hover:bg-gray-100 font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg">
              Logout
            </button>
          )}
        </footer>
      </aside>

      {/* Mobile overlay & drawer */}
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300 ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-blue-600 to-blue-700 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <header className="flex items-center gap-3 p-6 border-b border-white/10" onClick={handleLogoClick}>
          <img src="/logo.png" alt="WealthLog" className="h-8 w-8 object-contain" />
          <h1 className="text-white font-bold text-xl tracking-tight">WealthLog</h1>
        </header>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {NAVIGATION_ITEMS.map(item => <NavigationLink key={item.href} item={item} onNavigate={() => setIsDrawerOpen(false)} />)}
        </nav>
        <footer className="p-4 border-t border-white/10">
          <button onClick={logout} className="w-full py-3 rounded-lg bg-white text-blue-600 hover:bg-gray-100 font-semibold text-sm transition-all duration-200 shadow-md">
            Logout
          </button>
        </footer>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" aria-label="Open navigation menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer" onClick={handleLogoClick}>WealthLog</h1>
            <div className="w-10" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
