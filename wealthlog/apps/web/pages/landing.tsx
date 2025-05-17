// =============================================
// apps/web/pages/landing.tsx  (FULL FILE - v2)
// =============================================
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api } from '@wealthlog/common';

import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';



/* ——— Small reusable card ——— */
function StatCard({
  title,
  value,
  currency = true,
}: {
  title: string;
  value: number | null;
  currency?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 bg-[var(--background-2)]">
      <h3 className="text-sm font-medium opacity-70 mb-1 whitespace-nowrap">
        {title}
      </h3>
      {value === null ? (
        <span className="text-2xl font-semibold">—</span>
      ) : (
        <span className="text-2xl font-semibold text-emerald-500 dark:text-emerald-400">
          {currency ? '$' : ''}
          {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation('common');
  const router = useRouter();

  /* 1️⃣   30-day global net-worth series (sparkline) */
  const { data: points } = useSWR('networth:30d', () =>
    api.get('/dashboard/networth?range=30d').then((r) => r.data)
  );

  const chartData = useMemo(
    () =>
      points ? Object.entries(points).map(([date, value]) => ({ date, value })) : [],
    [points]
  );
  const latestPoint: number | null = chartData.length ? Number(chartData.at(-1)?.value) : null;

  /* 2️⃣   Snapshot buckets (FX, Liquid, Illiquid, Global) */
  const { data: summary } = useSWR('networth:summary', () =>
    api.get('/dashboard/networth/summary').then((r) => r.data)
  );

  const quick = (path: string) => router.push(path);

  return (
    <div className="min-h-screen p-6 space-y-8 bg-[var(--background)] dark:text-[var(--text)]">
      {/* ——— Header row ——— */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('Dashboard')}</h1>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => quick('/trading')} className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
            {t('AddNewTrade')}
          </button>
          <button onClick={() => quick('/expenses')} className="px-4 py-2 rounded-lg bg-amber-400 text-[var(--text)] hover:bg-amber-500 transition">
            {t('AddExpense')}
          </button>
          <button onClick={() => quick('/accounts')} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
            {t('ViewAccounts')}
          </button>
          <button onClick={() => quick('/accounts/new')} className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition hidden md:inline">
            {t('AddAccount')}
          </button>
        </div>
      </div>

      {/* ——— Stat grid ——— */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={t('GlobalNetWorth')} value={summary?.global ?? null} />
        <StatCard title={t('FXNetWorth')} value={summary?.fx ?? null} />
        <StatCard title={t('LiquidNetWorth')} value={summary?.liquid ?? null} />
        <StatCard title={t('IlliquidNetWorth')} value={summary?.illiquid ?? null} />
      </div>

      {/* ——— Net-worth Trend card ——— */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 bg-[var(--background-2)]">
        <h2 className="text-lg font-semibold mb-3">{t('NetWorthTrend30d')}</h2>

        {latestPoint === null ? (
          <p>{t('loading')}</p>
        ) : (
          <>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide tick={{ fontSize: 10 }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={(d) => d} formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl mt-2 font-medium">${latestPoint.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </>
        )}
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

// =============================================
// END
