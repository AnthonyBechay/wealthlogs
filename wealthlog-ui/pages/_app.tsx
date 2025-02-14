import "../styles/globals.css";
import type { AppProps } from "next/app";
import Link from "next/link";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <nav className="p-4 bg-gray-800 text-white flex space-x-4">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/settings" className="hover:underline">Settings</Link>
        <Link href="/login" className="hover:underline">Logout</Link>
      </nav>
      <Component {...pageProps} />
    </div>
  );
}
