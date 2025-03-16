// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api, setAccessToken } from "@wealthlog/common";

// Example color palette from your document
// #1A73E8 (Primary Deep Blue)
// #34A853 (Green for success/growth)
// #FBBC05 (Orange for accent/CTA)
// #F5F5F5 (Light Gray background)
// #202124 (Dark Gray text)

export default function App({ Component, pageProps }: AppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    checkLoginStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  async function checkLoginStatus() {
    try {
      await api.get("/auth/me");
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
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

  // If not logged in, simply show the normal page (login, register, etc.)
  // so that non-auth pages (like /login, /register) are visible.
  // We'll only load the sidebar for authenticated pages.
  if (!isLoggedIn) {
    return <Component {...pageProps} />;
  }

  return (
    <div className="min-h-screen flex bg-[#F5F5F5] text-[#202124]">
      {/*
        Sidebar
        For demonstration, we show the key nav items from your UX doc:
        - Dashboard
        - Accounts & Balances
        - Trading & Investments
        - Real Estate
        - Expenses & Budgeting
        - Loans
        - Forecasting
        - Collaboration (umbrella)
        - Settings (umbrella)
      */}
      <aside className="w-64 bg-[#1A73E8] text-white flex flex-col">
        <div className="p-4 font-bold text-xl flex items-center gap-2">
          <img src="/logo.png" alt="WealthLog Logo" className="h-8" />
          <span>WealthLog</span>
        </div>

        <nav className="flex-1 px-2 space-y-1 mt-4">
          <Link href="/landing" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Dashboard
            </a>
          </Link>

          <Link href="/accounts" legacyBehavior>
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Accounts &amp; Balances
            </a>
          </Link>

          <Link href="/tradeManagement" legacyBehavior>
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
            <a className="block px-3 py-2 rounded hover:bg-blue-600">
              Forecasting
            </a>
          </Link>

          {/* Collaboration umbrella with sub-links */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">Collaboration</p>
            <div className="ml-2 mt-1 space-y-1 hidden group-hover:block">
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

          {/* Settings umbrella with sub-links */}
          <div className="px-3 py-2 rounded hover:bg-blue-600 group">
            <p className="font-semibold">Settings</p>
            <div className="ml-2 mt-1 space-y-1 hidden group-hover:block">
              <Link href="/settings" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Preferences
                </a>
              </Link>
              <Link href="/settings/security" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Security
                </a>
              </Link>
              <Link href="/settings/customMeasures" legacyBehavior>
                <a className="block px-2 py-1 text-sm hover:bg-blue-500 rounded">
                  Custom Measures
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

      {/* Main content area */}
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
