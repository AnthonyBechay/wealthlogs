
/* ────────────────────────────────────────────────────────────────────────
   apps/web/pages/_app.tsx
   Ultra‑clean theme + auth + mobile drawer
   ──────────────────────────────────────────────────────────────────────── */

   import '../styles/globals.css';
   import '../styles/theme.css';
   
   import type { AppProps } from 'next/app';
   import { useEffect, useState } from 'react';
   import { useRouter } from 'next/router';
   import Link from 'next/link';
   
   import { ThemeProvider } from 'next-themes';
   
   import { api, setAccessToken } from '@wealthlog/common';
   import { appWithTranslation } from 'next-i18next';
   import nextI18NextConfig from '../next-i18next.config';
   
   /* Public routes: no auth required */
   const PUBLIC_PATHS = ['/', '/login', '/register'];
   
   /* helper: determine if a pathname is public */
   const isPublic = (pathname: string) => PUBLIC_PATHS.some((p) => pathname === p);
   
   /* helper: cycle through display modes */
   type Mode = 'light' | 'dark' | 'system';
   const cycleMode = (m: Mode): Mode => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light');
   
   export default appWithTranslation(function MyApp({ Component, pageProps }: AppProps) {
     const router = useRouter();
   
     /* ───────────────────────── state ───────────────────────── */
     const [checkingAuth, setCheckingAuth] = useState(true);
     const [isLoggedIn, setIsLoggedIn]     = useState(false);
   
     const [displayMode, setDisplayMode]   = useState<Mode>('system');
     const [drawerOpen, setDrawerOpen]     = useState(false);   // mobile sidebar
   
     /* ────────────── fetch saved displayMode once ────────────── */
     useEffect(() => {
       (async () => {
         try {
           const { data } = await api.get('/settings'); // { displayMode }
           setDisplayMode((data?.displayMode as Mode) ?? 'system');
         } catch {
           setDisplayMode('system');
         }
       })();
     }, []);
   
     /* ───────── auth guard (runs on route change) ───────── */
     useEffect(() => {
       if (isPublic(router.pathname)) {
         setCheckingAuth(false);
         return;
       }
   
       (async () => {
         try {
           await api.get('/auth/me');
           setIsLoggedIn(true);
         } catch {
           setIsLoggedIn(false);
           router.replace('/login');
         } finally {
           setCheckingAuth(false);
         }
       })();
     }, [router.pathname]);
   
     /* ───────── toggle theme ───────── */
     async function handleToggleTheme() {
       const next = cycleMode(displayMode);
       setDisplayMode(next);
   
       // save asynchronously; ignore errors
       api.post('/settings/displayMode', { displayMode: next }).catch(() => {});
     }
   
     /* ───────── logout helper ───────── */
     async function handleLogout() {
       try { await api.post('/auth/logout'); } finally {
         setAccessToken(null);
         router.push('/login');
       }
     }
   
     /* ───────── render splash while auth check runs ───────── */
     if (checkingAuth) {
       return (
         <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode}>
           <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--text)]">
             <p>Loading …</p>
           </div>
         </ThemeProvider>
       );
     }
   
     /* ───────── public pages (Login, Register, etc.) ───────── */
     if (isPublic(router.pathname)) {
       return (
         <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode}>
           <Component {...pageProps} />
         </ThemeProvider>
       );
     }
   
     /* ───────── private pages ───────── */
     if (!isLoggedIn) return null; // redirect in progress
   
     const navLinks: { href: string; label: string }[] = [
       { href: '/landing',          label: 'Dashboard' },
       { href: '/accounts',         label: 'Accounts' },
       { href: '/trading',          label: 'Trading'  },
       { href: '/realEstate',       label: 'Real Estate' },
       { href: '/expenses',         label: 'Expenses' },
       { href: '/loans',            label: 'Loans' },
       { href: '/forecasting',      label: 'Forecasting' },
       { href: '/settingsGeneral',  label: 'Settings — General' },
       { href: '/settingsTrading',  label: 'Settings — Trading' },
     ];
   
     /* icon for current displayMode */
     const modeIcon = displayMode === 'light' ? '☀️' : displayMode === 'dark' ? '🌙' : '💻';
   
     /* convenience: close drawer on nav click */
     const NavLink = ({ href, label }: { href: string; label: string }) => (
       <Link href={href} legacyBehavior>
         <a
           onClick={() => setDrawerOpen(false)}
           className={`block px-4 py-2 rounded hover:bg-[rgba(0,0,0,.05)] ${router.pathname === href ? 'font-semibold' : ''}`}
         >
           {label}
         </a>
       </Link>
     );
   
     return (
       <ThemeProvider attribute="class" defaultTheme="system" forcedTheme={displayMode}>
         <div className="flex min-h-screen bg-[var(--background)] text-[var(--text)]">
           {/* ───────── Desktop Sidebar ───────── */}
           <aside className="hidden md:flex md:flex-col w-64 bg-[var(--primary)] text-white">
             <header className="p-4 font-bold text-xl flex items-center gap-2">
               <img src="/logo.png" alt="WealthLog" className="h-8" />
               <span>WealthLog</span>
             </header>
   
             <nav className="flex-1 space-y-1">
               {navLinks.map((l) => <NavLink key={l.href} {...l} />)}
             </nav>
   
             <footer className="p-4 space-y-2">
               <button onClick={handleToggleTheme} className="w-full py-2 rounded bg-[rgba(0,0,0,.2)]">
                 {modeIcon}
               </button>
               <button onClick={handleLogout} className="w-full py-2 rounded bg-[#FBBC05] text-[#202124] font-semibold">
                 Logout
               </button>
             </footer>
           </aside>
   
           {/* ───────── Mobile Drawer ───────── */}
           <div
             className={`
               fixed inset-0 z-40 bg-[rgba(0,0,0,.4)] backdrop-blur-sm
               transition-opacity duration-300
               ${drawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
             `}
             onClick={() => setDrawerOpen(false)}
           />
   
           <aside
             className={`
               fixed inset-y-0 left-0 z-50 w-64 bg-[var(--primary)] text-white transform
               transition-transform duration-300
               ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
             `}
           >
             <header className="p-4 font-bold text-xl flex items-center gap-2">
               <img src="/logo.png" alt="WealthLog" className="h-8" />
               <span>WealthLog</span>
             </header>
   
             <nav className="flex-1 space-y-1">
               {navLinks.map((l) => <NavLink key={l.href} {...l} />)}
             </nav>
   
             <footer className="p-4 space-y-2">
               <button onClick={handleToggleTheme} className="w-full py-2 rounded bg-[rgba(0,0,0,.2)]">
                 {modeIcon}
               </button>
               <button onClick={handleLogout} className="w-full py-2 rounded bg-[#FBBC05] text-[#202124] font-semibold">
                 Logout
               </button>
             </footer>
           </aside>
   
           {/* ───────── Main Content ───────── */}
           <div className="flex-1 flex flex-col">
             {/* Mobile Top‑bar */}
             <header className="md:hidden flex items-center justify-between bg-[var(--primary)] text-white px-3 py-2">
               <button onClick={() => setDrawerOpen(true)} className="text-2xl">☰</button>
               <h1 className="font-bold">WealthLog</h1>
               <button onClick={handleToggleTheme} className="text-xl">{modeIcon}</button>
             </header>
   
             {/* Page component */}
             <main className="flex-1">
               <Component {...pageProps} />
             </main>
           </div>
         </div>
       </ThemeProvider>
     );
   }, nextI18NextConfig);
   