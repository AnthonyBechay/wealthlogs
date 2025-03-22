// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api, setAccessToken } from "@wealthlog/common";

const publicPaths = [
  "/login",
  "/register",
  // add other routes that do NOT require auth
];

function isPublicRoute(pathname: string) {
  // If the pathname starts with any public path, it's considered public
  return publicPaths.some((pub) => pathname.startsWith(pub));
}

export default function App({ Component, pageProps }: AppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    handleAuthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  async function handleAuthCheck() {
    const routeIsPublic = isPublicRoute(router.pathname);
    if (routeIsPublic) {
      // Public route, no need to check /auth/me
      setIsLoggedIn(false);
      setCheckingAuth(false);
      return;
    }

    // It's a protected route, let's see if user is logged in
    try {
      await api.get("/auth/me");
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAccessToken(null);
      setIsLoggedIn(false);
      router.push("/login");
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p>Checking authentication...</p>
      </div>
    );
  }

  // If route is public, or user is logged in, we can render
  if (!isLoggedIn && !isPublicRoute(router.pathname)) {
    // If it's not public and not logged in, we’ll probably never get here
    // because we did router.push("/login") above. But just in case:
    return null;
  }

  // If route is public, just show the component (like login or register)
  if (isPublicRoute(router.pathname)) {
    return <Component {...pageProps} />;
  }

  // Otherwise, the user is logged in, so show the main app structure
  return (
    <div className="min-h-screen flex bg-[#F5F5F5] text-[#202124]">
      {/* Sidebar / Navigation */}
      <aside className="w-64 bg-[#1A73E8] text-white flex flex-col">
        <div className="p-4 font-bold text-xl flex items-center gap-2">
          <img src="/logo.png" alt="WealthLog Logo" className="h-8" />
          <span>WealthLog</span>
        </div>
        <nav className="flex-1 px-2 space-y-1 mt-4">
          <Link href="/landing" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">Dashboard</a>
          </Link>
          <Link href="/accounts" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Accounts &amp; Balances
            </a>
          </Link>
          <Link href="/trading" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Trading &amp; Investments
            </a>
          </Link>
          <Link href="/realEstate" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Real Estate
            </a>
          </Link>
          <Link href="/expenses" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Expenses &amp; Budgeting
            </a>
          </Link>
          <Link href="/loans" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Loans
            </a>
          </Link>
          <Link href="/forecasting" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">Forecasting</a>
          </Link>

          {/* Collaboration */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">Collaboration</p>
            <div className="ml-2 mt-1 space-y-1">
              <Link href="/collaboration/delegated" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Delegated Access
                </a>
              </Link>
              <Link href="/collaboration/coaching" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Coaching
                </a>
              </Link>
              <Link href="/collaboration/communities" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Communities
                </a>
              </Link>
            </div>
          </div>

          {/* Settings */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">Settings</p>
            <div className="ml-2 mt-1 space-y-1">
              <Link href="/settingsGeneral" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  General
                </a>
              </Link>
              <Link href="/settingsTrading" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Trading
                </a>
              </Link>
              <Link href="/settings" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Custom
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
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
