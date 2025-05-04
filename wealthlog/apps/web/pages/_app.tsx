/* ────────────────────────────────────────────────────────────────────
   apps/web/pages/_app.tsx
   (theme ‑ persisted in the DB, ‘system’ mode supported)
   ──────────────────────────────────────────────────────────────────── */

   import '../styles/globals.css';

   import type { AppProps } from 'next/app';
   import Link               from 'next/link';
   import { useRouter }      from 'next/router';
   import { useEffect, useState } from 'react';
   
   import { api, setAccessToken } from '@wealthlog/common';
   
   /* i18n */
   import { appWithTranslation } from 'next-i18next';
   import { useTranslation }     from 'next-i18next';
   import nextI18NextConfig      from '../next-i18next.config';
   
   /* theme helper – adds / removes “dark” class on <html> */
   import { ThemeProvider } from 'next-themes';
   
   /* ───────── public routes that DON’T require auth ───────── */
   const publicPaths = ['/login', '/register'];
   const isPublic    = (path: string) => publicPaths.some(p => path.startsWith(p));
   
   /* helper: cycle light → dark → system */
   const nextMode = (
     m: 'light' | 'dark' | 'system'
   ): 'light' | 'dark' | 'system' =>
     m === 'light' ? 'dark' : m === 'dark' ? 'light' : 'system';
   
   function MyApp({ Component, pageProps }: AppProps) {
     const { t }      = useTranslation('common');
     const router     = useRouter();
   
     /* ───────── state ───────── */
     const [checkingAuth, setCheckingAuth] = useState(true);
     const [isLoggedIn,   setIsLoggedIn]   = useState(false);
   
     /* themeMode can be light | dark | system */
     const [themeMode, setThemeMode] =
       useState<'light' | 'dark' | 'system'>('system');
   
     /* ───────────────────────────────────────────────────────────
        1) Auth guard
        ─────────────────────────────────────────────────────────── */
     useEffect(() => {
       (async () => {
         if (isPublic(router.pathname)) {        // public → skip auth check
           setCheckingAuth(false);
           return;
         }
         try {
           await api.get('/auth/me');
           setIsLoggedIn(true);
         } catch {
           setIsLoggedIn(false);
           router.push('/login');
         } finally {
           setCheckingAuth(false);
         }
       })();
     }, [router.pathname]);
   
     /* ───────────────────────────────────────────────────────────
        2) Pull saved displayMode once on mount
        ─────────────────────────────────────────────────────────── */
     useEffect(() => {
       let mql: MediaQueryList;
       let listener: (e: MediaQueryListEvent) => void;
   
       (async () => {
         try {
           const { data } = await api.get('/settings');   // { displayMode }
           const saved: 'light' | 'dark' | 'system' = data.displayMode ?? 'light';
   
           if (saved === 'system') {
             // respect OS; update whenever the OS theme changes
             mql      = window.matchMedia('(prefers-color-scheme: dark)');
             setThemeMode(mql.matches ? 'dark' : 'light');
             listener = e => setThemeMode(e.matches ? 'dark' : 'light');
             mql.addEventListener('change', listener);
           } else {
             setThemeMode(saved);
           }
         } catch {
           setThemeMode('light');
         }
       })();
   
       return () => listener && mql?.removeEventListener('change', listener);
     }, []);
   
     /* ───────────────────────────────────────────────────────────
        3) Persist toggle to the DB
        ─────────────────────────────────────────────────────────── */
     async function handleToggleTheme() {
       const newMode = nextMode(themeMode === 'light' || themeMode === 'dark'
         ? themeMode
         : 'system');          // when currently system we start with light
   
       /* optimistic UI */
       setThemeMode(newMode === 'system'
         ? (window.matchMedia('(prefers-color-scheme: dark)').matches
             ? 'dark'
             : 'light')
         : newMode);
   
       try {
         await api.post('/settings/displayMode', { displayMode: newMode });
       } catch {
         /* if it fails – ignore, keep current UI */
       }
     }
   
     /* ───────────────────────────────────────────────────────────
        4) Logout helper
        ─────────────────────────────────────────────────────────── */
     async function handleLogout() {
       try { await api.post('/auth/logout'); } catch {/* ignore */}
       setAccessToken(null);
       router.push('/login');
     }
   
     /* ───────────────────────────────────────────────────────────
        5) Loading splash while auth check runs
        ─────────────────────────────────────────────────────────── */
     if (checkingAuth) {
       return (
         <ThemeProvider attribute="class" forcedTheme={themeMode}>
           <div className="flex items-center justify-center h-screen
                           bg-gray-50 dark:bg-[#1e1e1e]
                           text-gray-900 dark:text-white">
             <p>Checking authentication…</p>
           </div>
         </ThemeProvider>
       );
     }
   
     /* ───────────────────────────────────────────────────────────
        6) Public pages render directly
        ─────────────────────────────────────────────────────────── */
     if (isPublic(router.pathname)) {
       return (
         <ThemeProvider attribute="class" forcedTheme={themeMode}>
           <Component {...pageProps} />
         </ThemeProvider>
       );
     }
   
     /* ───────────────────────────────────────────────────────────
        7) Private pages (user must be logged‑in)
        ─────────────────────────────────────────────────────────── */
     if (!isLoggedIn) return null;
   
     return (
       <ThemeProvider attribute="class" forcedTheme={themeMode}>
         <div
           className="min-h-screen flex
                      bg-gray-50 dark:bg-[#202124]
                      text-gray-900 dark:text-[#e2e2e2]"
         >
           {/* ───────── Sidebar ───────── */}
           <aside
             className="w-64 flex flex-col
                        bg-[#1A73E8] dark:bg-[#1A1A1A]
                        text-white  dark:text-gray-200"
           >
             <div className="p-4 font-bold text-xl flex items-center gap-2">
               <img src="/logo.png" alt="WealthLog" className="h-8" />
               <span>WealthLog</span>
             </div>
   
             <nav className="flex-1 px-2 space-y-1 mt-4">
               {[
                 ['/landing',            t('Dashboard')],
                 ['/accounts',           t('AccountAndBalances')],
                 ['/trading',            t('TradingInvestments')],
                 ['/realEstate',         t('RealEstate')],
                 ['/expenses',           t('ExpensesBudgeting')],
                 ['/loans',              t('Loans')],
                 ['/forecasting',        t('Forecasting')],
               ].map(([href, label]) => (
                 <Link key={href} href={href} legacyBehavior>
                   <a className="block px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700">
                     {label}
                   </a>
                 </Link>
               ))}
   
               {/* Collaboration group */}
               <div className="px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700 group">
                 <p className="font-semibold">{t('Collaboration')}</p>
                 <div className="ml-2 mt-1 space-y-1 text-sm">
                   {[
                     ['/collaboration/delegated',   t('DelegatedAccess')],
                     ['/collaboration/coaching',    t('Coaching')],
                     ['/collaboration/communities', t('Communities')],
                   ].map(([href, label]) => (
                     <Link key={href} href={href} legacyBehavior>
                       <a className="block px-2 py-1 rounded hover:bg-blue-500 dark:hover:bg-gray-600">
                         {label}
                       </a>
                     </Link>
                   ))}
                 </div>
               </div>
   
               {/* Settings group */}
               <div className="px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700 group">
                 <p className="font-semibold">{t('Settings')}</p>
                 <div className="ml-2 mt-1 space-y-1 text-sm">
                   {[
                     ['/settingsGeneral',  t('General')],
                     ['/settingsTrading',  t('Trading')],
                     ['/settings',         t('Custom')],
                   ].map(([href, label]) => (
                     <Link key={href} href={href} legacyBehavior>
                       <a className="block px-2 py-1 rounded hover:bg-blue-500 dark:hover:bg-gray-600">
                         {label}
                       </a>
                     </Link>
                   ))}
                 </div>
               </div>
             </nav>
   
             {/* bottom buttons */}
             <div className="p-4 space-y-2">
               <button
                 onClick={handleToggleTheme}
                 className="w-full py-2 rounded bg-gray-700 text-white text-xs"
               >
                 Toggle&nbsp;
                 {themeMode === 'light'
                   ? 'Dark'
                   : themeMode === 'dark'
                   ? 'Light'
                   : 'System'}
               </button>
   
               <button
                 onClick={handleLogout}
                 className="w-full py-2 rounded bg-[#FBBC05] text-[#202124] font-semibold hover:bg-orange-400"
               >
                 {t('Logout')}
               </button>
             </div>
           </aside>
   
           {/* main content */}
           <main className="flex-1">
             <Component {...pageProps} />
           </main>
         </div>
       </ThemeProvider>
     );
   }
   
   export default appWithTranslation(MyApp, nextI18NextConfig);
   