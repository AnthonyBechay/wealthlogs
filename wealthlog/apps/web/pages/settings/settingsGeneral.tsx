// =============================================
// apps/web/pages/settingsGeneral.tsx  (FULL FILE – v5)
// =============================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { api } from '@wealthlog/common';
import { useTranslations } from 'next-intl';
const KNOWN_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Tokyo',
];
const CURRENCIES = ['USD', 'EUR'];

type Mode = 'light' | 'dark' | 'system';

type GeneralSettings = {
  displayMode: Mode;
  language: 'en' | 'ar' | 'fr';
  timezone: string;
  preferredCurrency: 'USD' | 'EUR';
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-[var(--background-2)] p-4 shadow-sm">
    {children}
  </section>
);

export default function SettingsGeneral() {
  const router = useRouter();
  const t = useTranslations('common');
  const { setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<GeneralSettings>({
    displayMode: 'system',
    language: 'en',
    timezone: 'UTC',
    preferredCurrency: 'USD',
  });

  useEffect(() => {
    (async () => {
      try {
        await api.get('/auth/me');
        await loadSettings();
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await api.get('/generalSettings');
      setSettings({
        displayMode: (data.displayMode as Mode) || 'system',
        language: data.language || 'en',
        timezone: data.timezone || 'UTC',
        preferredCurrency: (data.preferredCurrency as 'USD' | 'EUR') || 'USD',
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(t('CouldNotLoadSettings'));
    }
  }

  async function save(
    key: keyof GeneralSettings,
    value: any,
    endpoint: string,
    body: object
  ) {
    try {
      await api.post(endpoint, body);
      setSettings((s) => ({ ...s, [key]: value }));

      if (key === 'displayMode') {
        localStorage.setItem('displayMode', value);
        setTheme(value === 'system' ? undefined : value);
        window.location.reload();
      }
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
      setError(t('CouldNotUpdate'));
    }
  }

  if (loading) return <div className="p-4">{t('LoadingDot')}</div>;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[var(--background)] dark:text-[var(--text)]">
      <h1 className="text-3xl font-bold mb-2">{t('GeneralPreferences')}</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Display Mode */}
        <Card>
          <h2 className="text-lg font-semibold mb-2">{t('DisplayMode')}</h2>
          <select
            className="w-full border p-2 rounded dark:bg-[var(--background)]"
            value={settings.displayMode}
            onChange={(e) =>
              save(
                'displayMode',
                e.target.value as Mode,
                '/generalSettings/displayMode',
                { displayMode: e.target.value }
              )
            }
          >
            <option value="light">{t('Light')}</option>
            <option value="dark">{t('Dark')}</option>
            <option value="system">{t('System')}</option>
          </select>
        </Card>

        {/* Language */}
        <Card>
          <h2 className="text-lg font-semibold mb-2">{t('Language')}</h2>
          <select
            className="w-full border p-2 rounded dark:bg-[var(--background)]"
            value={settings.language}
            onChange={(e) =>
              save('language', e.target.value, '/generalSettings/language', { language: e.target.value })
            }
          >
            <option value="en">{t('English')}</option>
            <option value="ar">{t('Arabic')}</option>
            <option value="fr">{t('French')}</option>
          </select>
        </Card>

        {/* Timezone */}
        <Card>
          <h2 className="text-lg font-semibold mb-2">{t('Timezone')}</h2>
          <select
            className="w-full border p-2 rounded dark:bg-[var(--background)]"
            value={settings.timezone}
            onChange={(e) =>
              save('timezone', e.target.value, '/generalSettings/timezone', { timezone: e.target.value })
            }
          >
            {KNOWN_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Card>

        {/* Preferred Currency */}
        <Card>
          <h2 className="text-lg font-semibold mb-2">{t('PreferredCurrency')}</h2>
          <select
            className="w-full border p-2 rounded dark:bg-[var(--background)]"
            value={settings.preferredCurrency}
            onChange={(e) =>
              save(
                'preferredCurrency',
                e.target.value,
                '/generalSettings/currency',
                { preferredCurrency: e.target.value }
              )
            }
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Card>
      </div>
    </div>
  );
}

