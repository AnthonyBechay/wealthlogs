// apps/web/pages/settingsGeneral.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

// i18n imports:
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

const KNOWN_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Tokyo",
  // ...
];

interface GeneralSettings {
  displayMode: string; // "light", "dark", or "system"
  language: string;    // "en", "ar", "fr"
  timezone: string;
  preferredCurrency: string;
}

export default function SettingsGeneral() {
  const router = useRouter();
  // Use i18n from the "common" namespace
  const { t } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<GeneralSettings>({
    displayMode: "light",
    language: "en",
    timezone: "UTC",
    preferredCurrency: "USD",
  });

  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me"); // ensure user is logged in
      loadSettings();
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const res = await api.get("/settings");
      const data = res.data;
      setSettings({
        displayMode: data.displayMode || "light",
        language: data.language || "en",
        timezone: data.timezone || "UTC",
        preferredCurrency: data.preferredCurrency || "USD",
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(t("CouldNotLoadSettings")); // e.g. "Could not load settings"
    }
  }

  // --- Display Mode ---
  async function handleDisplayMode(newMode: string) {
    try {
      await api.post("/settings/displayMode", { displayMode: newMode });
      setSettings(s => ({ ...s, displayMode: newMode }));
      // Force a reload so _app.tsx re-detects the new mode:
      window.location.reload();
    } catch (err) {
      console.error("Failed to update displayMode:", err);
      setError(t("FailedToUpdateDisplayMode"));
    }
  }

  // --- Language ---
  async function handleLanguageChange(newLang: string) {
    try {
      await api.post("/settings/language", { language: newLang });
  
      // Update local state immediately
      setSettings(s => ({ ...s, language: newLang }));
  
      // Push new locale route for Next.js translation
      router.push(router.pathname, router.asPath, { locale: newLang });
    } catch (err) {
      console.error("Failed to update language:", err);
      setError("Could not update language");
    }
  }
  

  // --- Timezone ---
  async function handleTimezoneChange(newTz: string) {
    try {
      await api.post("/settings/timezone", { timezone: newTz });
      setSettings(s => ({ ...s, timezone: newTz }));
    } catch (err) {
      console.error("Failed to update timezone:", err);
      setError("Could not update timezone");
    }
  }

  // --- Currency ---
  async function handleCurrencyChange(newCur: string) {
    try {
      await api.post("/settings/currency", { preferredCurrency: newCur });
      setSettings(s => ({ ...s, preferredCurrency: newCur }));
    } catch (err) {
      console.error("Failed to update currency:", err);
      setError("Could not update currency");
    }
  }

  if (loading) {
    return <div className="p-4">{t("LoadingDot")}</div>;
  }

  return (
    <div className="p-6 min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-4">{t("GeneralPreferences")}</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Display Mode */}
      <section className="mb-8 p-4 rounded shadow bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">{t("DisplayMode")}</h2>
        <select
          className="border p-2 rounded dark:bg-gray-700"
          value={settings.displayMode}
          onChange={e => handleDisplayMode(e.target.value)}
        >
          <option value="light">{t("Light")}</option>
          <option value="dark">{t("Dark")}</option>
          <option value="system">{t("System")}</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          {t("CurrentColon")} {settings.displayMode}
        </p>
      </section>

      {/* Language */}
      <section className="mb-8 p-4 rounded shadow bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">{t("Language")}</h2>
        <select
          className="border p-2 rounded dark:bg-gray-700"
          value={settings.language}
          onChange={e => handleLanguageChange(e.target.value)}
        >
          <option value="en">{t("English")}</option>
          <option value="ar">{t("Arabic")}</option>
          <option value="fr">{t("French")}</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          {t("CurrentColon")} {settings.language}
        </p>
      </section>

      {/* Timezone */}
      <section className="mb-8 p-4 rounded shadow bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">{t("Timezone")}</h2>
        <select
          className="border p-2 rounded dark:bg-gray-700"
          value={settings.timezone}
          onChange={e => handleTimezoneChange(e.target.value)}
        >
          {KNOWN_TIMEZONES.map(tz => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          {t("CurrentColon")} {settings.timezone}
        </p>
      </section>

      {/* Preferred Currency */}
      <section className="mb-8 p-4 rounded shadow bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">{t("PreferredCurrency")}</h2>
        <input
          type="text"
          className="border p-2 rounded dark:bg-gray-700"
          value={settings.preferredCurrency}
          onChange={e => handleCurrencyChange(e.target.value)}
        />
        <p className="text-sm text-gray-500 mt-1">
          {t("CurrentColon")} {settings.preferredCurrency}
        </p>
      </section>
    </div>
  );
}

// Load the translations for "common" on server side
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
