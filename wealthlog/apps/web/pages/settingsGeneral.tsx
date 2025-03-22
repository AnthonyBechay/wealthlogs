// pages/settingsGeneral.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface GeneralSettings {
  displayMode: string;
  language: string;
  timezone: string;
  preferredCurrency: string;
}

export default function SettingsGeneral() {
  const router = useRouter();
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
      setError("Could not load settings");
    }
  }

  async function handleDisplayMode(mode: string) {
    try {
      await api.post("/settings/displayMode", { displayMode: mode });
      setSettings(s => ({ ...s, displayMode: mode }));
    } catch (err) {
      console.error("Failed to update displayMode:", err);
      setError("Could not update display mode");
    }
  }

  async function handleLanguageChange(newLang: string) {
    try {
      await api.post("/settings/language", { language: newLang });
      setSettings(s => ({ ...s, language: newLang }));
    } catch (err) {
      setError("Could not update language");
    }
  }

  async function handleTimezoneChange(newTz: string) {
    try {
      await api.post("/settings/timezone", { timezone: newTz });
      setSettings(s => ({ ...s, timezone: newTz }));
    } catch (err) {
      setError("Could not update timezone");
    }
  }

  async function handleCurrencyChange(newCur: string) {
    try {
      await api.post("/settings/currency", { preferredCurrency: newCur });
      setSettings(s => ({ ...s, preferredCurrency: newCur }));
    } catch (err) {
      setError("Could not update currency");
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">General Preferences</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Display Mode</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleDisplayMode("light")}
            className={
              settings.displayMode === "light"
                ? "px-3 py-1 bg-blue-500 text-white rounded"
                : "px-3 py-1 bg-gray-200"
            }
          >
            Light
          </button>
          <button
            onClick={() => handleDisplayMode("dark")}
            className={
              settings.displayMode === "dark"
                ? "px-3 py-1 bg-blue-500 text-white rounded"
                : "px-3 py-1 bg-gray-200"
            }
          >
            Dark
          </button>
          <span className="text-sm text-gray-500">Current: {settings.displayMode}</span>
        </div>
      </section>

      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Language</h2>
        <select
          className="border p-2 rounded"
          value={settings.language}
          onChange={e => handleLanguageChange(e.target.value)}
        >
          <option value="en">English</option>
          <option value="fr">French</option>
        </select>
      </section>

      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Timezone</h2>
        <input
          type="text"
          className="border p-2 rounded"
          value={settings.timezone}
          onChange={e => handleTimezoneChange(e.target.value)}
        />
      </section>

      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Preferred Currency</h2>
        <input
          type="text"
          className="border p-2 rounded"
          value={settings.preferredCurrency}
          onChange={e => handleCurrencyChange(e.target.value)}
        />
      </section>
    </div>
  );
}
