import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  /** bubbling up to _app so we keep all auth logic in one place */
  onLogout: () => void | Promise<void>;
}

const publicPaths = ['/login', '/register'];

export default function Layout({ children, onLogout }: LayoutProps) {
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  /* skip chrome on public pages */
  if (publicPaths.some((p) => router.pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#202124] text-gray-900 dark:text-gray-100">
      {/* ───────── Sidebar ───────── */}
      <aside className="w-64 bg-[#1A73E8] dark:bg-[#1A1A1A] text-white dark:text-gray-200 flex flex-col">
        <div className="p-4 font-bold text-xl flex items-center gap-2">
          <img src="/logo.png" alt="WealthLog" className="h-8" />
          <span>WealthLog</span>
        </div>

        {/* navigation */}
        <nav className="flex-1 px-2 space-y-1 mt-4 text-sm">
  <NavLink href="/landing/landing"    label={t('Dashboard')} />
  <NavLink href="/accounts"   label={t('AccountAndBalances')} />
  <NavLink href="/trading"    label={t('TradingInvestments')} />
  <NavLink href="/realEstate" label={t('RealEstate')} />
  <NavLink href="/expenses"   label={t('ExpensesBudgeting')} />
  <NavLink href="/loans"      label={t('Loans')} />
  <NavLink href="/forecasting" label={t('Forecasting')} />

  {/* collaboration section */}
  <div className="px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700">
    <p className="font-semibold">{t('Collaboration')}</p>
    <div className="ml-2 mt-1 space-y-1">
      <NavLink href="/collaboration/delegated"    label={t('DelegatedAccess')} />
      <NavLink href="/collaboration/coaching"     label={t('Coaching')} />
      <NavLink href="/collaboration/communities"  label={t('Communities')} />
    </div>
  </div>

  {/* settings section */}
  <div className="px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700">
    <p className="font-semibold">{t('Settings')}</p>
    <div className="ml-2 mt-1 space-y-1">
      <NavLink href="/settingsGeneral"  label={t('General')} />
      <NavLink href="/settingsTrading"  label={t('Trading')} />
      <NavLink href="/settings"         label={t('Custom')} />
    </div>
  </div>
</nav>


        {/* footer controls */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full py-2 rounded bg-gray-700 text-white text-xs"
          >
            Toggle {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2 rounded bg-yellow-400 text-black font-semibold"
          >
            {t('Logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} legacyBehavior>
      <a className="block px-3 py-2 rounded hover:bg-blue-600 dark:hover:bg-gray-700">
        {label}
      </a>
    </Link>
  );
}
