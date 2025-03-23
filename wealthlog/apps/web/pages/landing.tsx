// apps/web/pages/landing.tsx

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '@wealthlog/common';

// i18n imports:
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Landing() {
  const router = useRouter();
  // e.g. load from the "common" namespace in your JSON
  const { t } = useTranslation('common');

  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Example mock:
      setNetWorth(12345.67);
      setRecentActivity([
        { id: 1, description: 'Bought EUR/USD', date: new Date().toISOString() },
        { id: 2, description: 'Deposited $500', date: new Date().toISOString() },
      ]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }

  function handleQuickAction(path: string) {
    router.push(path);
  }

  return (
    // container with dark background if 'dark' class is set on <html> or <body>
    <div className="p-6 min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-4">{t('Dashboard')}</h1>

      {/* Card */}
      <div className="p-4 rounded shadow mb-6 bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">{t('NetWorth')}</h2>
        {netWorth !== null ? (
          <p className="text-2xl">${netWorth.toFixed(2)}</p>
        ) : (
          <p>{t('Loading')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="p-4 rounded shadow bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">{t('RecentActivity')}</h2>
          {recentActivity.length === 0 ? (
            <p>{t('NoRecentActivity')}</p>
          ) : (
            <ul className="list-disc ml-5">
              {recentActivity.map((activity) => (
                <li key={activity.id}>
                  {activity.description} <br />
                  <span className="text-sm text-gray-500">
                    {new Date(activity.date).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 rounded shadow bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">{t('QuickActions')}</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleQuickAction('/tradeManagement')}
              className="px-4 py-2 bg-[#34A853] text-white rounded font-semibold hover:bg-green-600 transition duration-300"
            >
              {t('AddNewTrade')}
            </button>
            <button
              onClick={() => handleQuickAction('/expenses')}
              className="px-4 py-2 bg-[#FBBC05] text-[#202124] rounded font-semibold hover:bg-orange-400 transition duration-300"
            >
              {t('AddExpense')}
            </button>
            <button
              onClick={() => handleQuickAction('/accounts')}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition duration-300"
            >
              {t('ViewAccounts')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// This loads translations on server side
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
