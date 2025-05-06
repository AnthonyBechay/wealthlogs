// apps/web/pages/landing.tsx
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '@wealthlog/common';

// i18n
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// tiny spark‑line
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Landing() {
  const { t } = useTranslation('common');
  const router = useRouter();

  /* fetch net‑worth points from new backend route */
  const { data: points } = useSWR('networth', () =>
    api.get('/dashboard/networth?range=30d').then((r) => r.data)
  );

  const chartData = points
    ? Object.entries(points).map(([date, value]) => ({ date, value }))
    : [];

  const latest: number | null = chartData.length ? Number(chartData.at(-1)?.value) : null;
  const quick = (path: string) => router.push(path);

  return (
    <div className="p-6 min-h-screen dark:text-[var(--text)] bg-[var(--background)]">
      <h1 className="text-3xl font-bold mb-4">{t('Dashboard')}</h1>

      {/* ––– Net worth card ––– */}
      <div className="p-4 rounded shadow mb-6 bg-[var(--background-2)] ">
        <h2 className="text-xl font-semibold mb-2">{t('NetWorth')}</h2>
        {latest === null ? (
          <p>{t('Loading')}</p>
        ) : (
          <>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {latest !== null && (<p className="text-2xl mt-2">${latest.toFixed(2)}</p>)}
          </>
        )}
      </div>

      {/* ––– Quick Actions ––– */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded shadow bg-[var(--background-2)] ">
          <h2 className="text-xl font-semibold mb-2">{t('QuickActions')}</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => quick('/tradeManagement')}
              className="px-4 py-2 bg-[#34A853] text-white rounded font-semibold hover:bg-green-600 transition"
            >
              {t('AddNewTrade')}
            </button>
            <button
              onClick={() => quick('/expenses')}
              className="px-4 py-2 bg-[#FBBC05] text-[#202124] rounded font-semibold hover:bg-orange-400 transition"
            >
              {t('AddExpense')}
            </button>
            <button
              onClick={() => quick('/accounts')}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
            >
              {t('ViewAccounts')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
