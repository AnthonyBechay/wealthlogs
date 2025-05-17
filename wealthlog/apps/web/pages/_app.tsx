// =============================================
// apps/web/pages/_app.tsx  (FULL FILE – v4)
// =============================================
import '../styles/globals.css';
import '../styles/theme.css';

import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ThemeProvider } from 'next-themes';

import { api, setAccessToken } from '@wealthlog/common';
import { appWithTranslation } from 'next-i18next';
import nextI18NextConfig from '../next-i18next.config';

/* Public routes requiring no auth */
const PUBLIC_PATHS = ['/', '/login', '/register'];
const isPublic = (p: string) => PUBLIC_PATHS.includes(p);

/* Display‑mode helpers */
type Mode = 'light' | 'dark' | 'system';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  /* ───────── initial theme ───────── */
  const initialMode: Mode = typeof window !== 'undefined'
    ? ((localStorage.getItem('displayMode') as Mode) || 'system')
    : 'system';
  const [displayMode, setDisplayMode] = useState<Mode>(initialMode);

  const [drawerOpen, setDrawerOpen]           = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [checkingAuth, setCheckingAuth]       = useState(true);
  const [isLoggedIn, setIsLoggedIn]           = useState(false);

  /* persist */
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);

  /* pull once from API */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        setDisplayMode((data?.displayMode as Mode) ?? initialMode);
      } catch {/* ignore */}
    })();
  }, []);

  /* auth guard */
  useEffect(() => {
    if (isPublic(router.pathname)) { setCheckingAuth(false); return; }
    (async () => {
      try { await api.get('/auth/me'); setIsLoggedIn(true); }
      catch { setIsLoggedIn(false); router.replace('/login'); }
      finally { setCheckingAuth(false); }
    })();
  }, [router.pathname]);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } finally {
      setAccessToken(null);
      router.push('/login');
    }
  }

  /* navigation meta (icon only when collapsed) */
  const navLinks: { href: string; label: string; icon: string }[] = [
    { href: '/landing',         label: 'Dashboard',       icon: '🏠' },
    { href: '/accounts',        label: 'Accounts',        icon: '💼' },
    { href: '/trading',         label: 'Trading',         icon: '📈' },
    { href: '/comingSoon',      label: 'Real Estate',     icon: '🏘️' },
    { href: '/comingSoon',      label: 'Expenses',        icon: '💳' },
    { href: '/comingSoon',      label: 'Loans',           icon: '💰' },
    { href: '/comingSoon',      label: 'Forecasting',     icon: '📊' },
    { href: '/settingsGeneral', label: 'General settings',icon: '⚙️' },
    { href: '/settingsTrading', label: 'Trading settings',icon: '🛠️' },
  ];

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: string }) => (
    <Link href={href} legacyBehavior>
      <a
        onClick={() => setDrawerOpen(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded hover:bg-[rgba(0,0,0,.08)] ${router.pathname === href ? 'font-semibold' : ''}`}
      >
        <span>{icon}</span>
        {!sidebarCollapsed && <span className="truncate">{label}</span>}
      </a>
    </Link>
  );

  /* splash */
  if (checkingAuth) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode === 'system' ? undefined : displayMode}>
        <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--text)]">
          <p>Loading …</p>
        </div>
      </ThemeProvider>
    );
  }

  /* public */
  if (isPublic(router.pathname)) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode === 'system' ? undefined : displayMode}>
        <Component {...pageProps} />
      </ThemeProvider>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode === 'system' ? undefined : displayMode}>
      <div className="flex min-h-screen bg-[var(--background)] text-[var(--text)]">

        {/* ───────── Sidebar (desktop) ───────── */}
        <aside className={`hidden md:flex flex-col h-screen transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[var(--primary)] text-white`}>
          {/* Header */}
          <header className="p-4 flex items-center gap-2 cursor-pointer" onClick={() => router.push('/landing')}>
            <img src="/logo.png" alt="WealthLog" className="h-8" />
            {!sidebarCollapsed && <span className="font-bold text-xl">WealthLog</span>}
          </header>

          {/* Links */}
          <nav className="flex-1 overflow-y-auto space-y-1">
            {navLinks.map((l) => <NavLink key={l.href} {...l} />)}
          </nav>

          {/* Footer pinned bottom */}
          <footer className="p-2 mt-auto space-y-2">
            {/* Collapse toggle */}
            <button onClick={() => setSidebarCollapsed((c) => !c)} className="w-full py-2 rounded bg-[rgba(0,0,0,.25)]">
              {sidebarCollapsed ? '»' : '«'}
            </button>
            {!sidebarCollapsed && (
              <button onClick={handleLogout} className="w-full py-2 rounded bg-[#FBBC05] text-[#202124] font-semibold">Logout</button>
            )}
          </footer>
        </aside>

        {/* ───────── Mobile Drawer Overlay ───────── */}
        <div className={`fixed inset-0 z-40 bg-[rgba(0,0,0,.4)] backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setDrawerOpen(false)} />

        {/* ───────── Mobile Drawer nav ───────── */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--primary)] text-white transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <header className="p-4 flex items-center gap-2 cursor-pointer" onClick={() => {router.push('/landing'); setDrawerOpen(false);}}>
            <img src="/logo.png" alt="WealthLog" className="h-8" />
            <span className="font-bold text-xl">WealthLog</span>
          </header>
          <nav className="flex-1 overflow-y-auto space-y-1">
            {navLinks.map((l) => <NavLink key={l.href} {...l} />)}
          </nav>
          <footer className="p-4 space-y-2">
            <button onClick={handleLogout} className="w-full py-2 rounded bg-[#FBBC05] text-[#202124] font-semibold">Logout</button>
          </footer>
        </aside>

        {/* ───────── Main content ───────── */}
        <div className="flex-1 flex flex-col">
          {/* Top‑bar (mobile) */}
          <header className="md:hidden flex items-center justify-between bg-[var(--primary)] text-white px-3 py-2">
            <button onClick={() => setDrawerOpen(true)} className="text-2xl">☰</button>
            <h1 className="font-bold cursor-pointer" onClick={() => router.push('/landing')}>WealthLog</h1>
            <span className="w-6" />
          </header>

          {/* Routed page */}
          <main className="flex-1 overflow-y-auto">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default appWithTranslation(MyApp, nextI18NextConfig);
