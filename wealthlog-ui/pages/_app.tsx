import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api"; // your axios instance with baseURL or rewrites

export default function App({ Component, pageProps }: AppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Whenever the route changes (e.g. user navigates or logs in => router.push("/landing")),
  // we re-check in case the user has just logged in (or out).
  useEffect(() => {
    checkLoginStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  async function checkLoginStatus() {
    try {
      await api.get("/auth/me", { withCredentials: true });
      setIsLoggedIn(true);
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
      setIsLoggedIn(false);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  if (checkingAuth) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "#FAFAFA", color: "#37474F" }}
      >
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#FAFAFA", minHeight: "100vh", color: "#37474F" }}>
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "#00796B", color: "#FAFAFA" }}
      >
        {/* Left: Logo */}
        <div className="flex items-center space-x-6">
          <Link href={isLoggedIn ? "/landing" : "/login"}>
            <div className="flex items-center cursor-pointer">
              <img
                src="/logo.png"
                alt="Logo"
                style={{ height: 40, marginRight: 8 }}
              />
              <span
                className="text-xl font-bold"
                style={{ color: "#FFD700" }} // Royal Gold
              >
                MyWealthApp
              </span>
            </div>
          </Link>

          {/* Example link */}
          <Link
            href="/settings"
            className="font-semibold hover:opacity-80"
            style={{ color: "#FAFAFA" }} // Soft white text
          >
            Settings
          </Link>
        </div>

        {/* Right: Login or Logout */}
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded font-semibold"
              style={{ backgroundColor: "#FFD700", color: "#37474F" }} // Royal Gold
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded font-semibold"
              style={{ backgroundColor: "#00C853", color: "#FAFAFA" }} // Bright Emerald
            >
              Login
            </Link>
          )}
        </div>
      </nav>

      <Component {...pageProps} />
    </div>
  );
}
