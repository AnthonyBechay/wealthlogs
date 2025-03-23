// apps/web/pages/_app.tsx

import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api, setAccessToken } from '@wealthlog/common';

// 1) Import i18n helpers:
import { useTranslation } from 'next-i18next';
import { appWithTranslation } from 'next-i18next';
import nextI18NextConfig from '../next-i18next.config';

const publicPaths = [
  '/login',
  '/register',
  // add other routes that do NOT require auth
];

function isPublicRoute(pathname: string) {
  // If the pathname starts with any public path, it's considered public
  return publicPaths.some((pub) => pathname.startsWith(pub));
}

function MyApp({ Component, pageProps }: AppProps) {
  // 2) Use translation in your layout:
  const { t } = useTranslation('common');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const router = useRouter();

  useEffect(() => {
    handleAuthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  useEffect(() => {
    loadDisplayMode();
  }, []);

  async function handleAuthCheck() {
    const routeIsPublic = isPublicRoute(router.pathname);
    if (routeIsPublic) {
      setIsLoggedIn(false);
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
  }

  async function loadDisplayMode() {
    try {
      const res = await api.get('/settings');
      const { displayMode } = res.data;

      if (displayMode === 'dark') {
        setThemeMode('dark');
      } else if (displayMode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        setThemeMode(prefersDark.matches ? 'dark' : 'light');

        const listener = (e: MediaQueryListEvent) => {
          setThemeMode(e.matches ? 'dark' : 'light');
        };
        prefersDark.addEventListener('change', listener);

        return () => {
          prefersDark.removeEventListener('change', listener);
        };
      } else {
        setThemeMode('light');
      }
    } catch (err) {
      setThemeMode('light');
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken(null);
      setIsLoggedIn(false);
      router.push('/login');
    }
  }

  if (checkingAuth) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          themeMode === 'dark' ? 'bg-[#1e1e1e] text-white' : 'bg-white text-black'
        }`}
      >
        <p>Checking authentication...</p>
      </div>
    );
  }

  // If route is public, or user is logged in, we can render
  if (!isLoggedIn && !isPublicRoute(router.pathname)) {
    return null;
  }

  if (isPublicRoute(router.pathname)) {
    return <Component {...pageProps} />;
  }

  // Determine root-level classes for light/dark backgrounds and text
  const rootClasses =
    themeMode === 'dark'
      ? 'min-h-screen flex bg-[#202124] text-[#e2e2e2]'
      : 'min-h-screen flex bg-[#F5F5F5] text-[#202124]';

  return (
    <div className={rootClasses}>
      {/* Sidebar / Navigation */}
      <aside
        className={`w-64 ${
          themeMode === 'dark' ? 'bg-[#1A1A1A] text-gray-200' : 'bg-[#1A73E8] text-white'
        } flex flex-col`}
      >
        <div className="p-4 font-bold text-xl flex items-center gap-2">
          <img src="/logo.png" alt="WealthLog Logo" className="h-8" />
          <span>WealthLog</span>
        </div>
        <nav className="flex-1 px-2 space-y-1 mt-4">
          <Link href="/landing" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('Dashboard')}
            </a>
          </Link>
          <Link href="/accounts" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('AccountAndBalances')}
            </a>
          </Link>
          <Link href="/trading" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('TradingInvestments')}
            </a>
          </Link>
          <Link href="/realEstate" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('RealEstate')}
            </a>
          </Link>
          <Link href="/expenses" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('ExpensesBudgeting')}
            </a>
          </Link>
          <Link href="/loans" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('Loans')}
            </a>
          </Link>
          <Link href="/forecasting" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              {t('Forecasting')}
            </a>
          </Link>

          {/* Collaboration */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">{t('Collaboration')}</p>
            <div className="ml-2 mt-1 space-y-1">
              <Link href="/collaboration/delegated" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('DelegatedAccess')}
                </a>
              </Link>
              <Link href="/collaboration/coaching" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('Coaching')}
                </a>
              </Link>
              <Link href="/collaboration/communities" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('Communities')}
                </a>
              </Link>
            </div>
          </div>

          {/* Settings */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">{t('Settings')}</p>
            <div className="ml-2 mt-1 space-y-1">
              <Link href="/settingsGeneral" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('General')}
                </a>
              </Link>
              <Link href="/settingsTrading" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('Trading')}
                </a>
              </Link>
              <Link href="/settings" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  {t('Custom')}
                </a>
              </Link>
            </div>
          </div>
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="bg-[#FBBC05] text-[#202124] w-full py-2 rounded font-semibold hover:bg-orange-400"
          >
            {t('Logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}

// *Remove* any getServerSideProps here. Not allowed in _app.tsx.
// We'll load 'common' in each page that uses this layout.

export default appWithTranslation(MyApp, nextI18NextConfig);
