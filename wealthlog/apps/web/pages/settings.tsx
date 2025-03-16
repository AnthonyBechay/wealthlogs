// pages/settings.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface SettingsData {
  displayMode: string;         // "light" or "dark"
  language: string;            // e.g. "en"
  timezone: string;            // e.g. "UTC"
  preferredCurrency: string;   // e.g. "USD"
  instruments: string[];
  patterns: string[];
  beMin: number;
  beMax: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Full settings object
  const [settings, setSettings] = useState<SettingsData>({
    displayMode: "light",
    language: "en",
    timezone: "UTC",
    preferredCurrency: "USD",
    instruments: [],
    patterns: [],
    beMin: -0.2,
    beMax: 0.3,
  });

  // For editing instruments/patterns
  const [newInstrument, setNewInstrument] = useState("");
  const [newPattern, setNewPattern] = useState("");

  // For editing break-even range
  const [tempBeMin, setTempBeMin] = useState("-0.2");
  const [tempBeMax, setTempBeMax] = useState("0.3");

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
      const data: SettingsData = res.data;
      setSettings(data);
      setTempBeMin(String(data.beMin));
      setTempBeMax(String(data.beMax));
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Could not load settings");
    }
  }

  /* =========================
     Display Mode (Dark/Light)
     ========================= */
  async function handleDisplayModeChange(mode: string) {
    try {
      await api.post("/settings/displayMode", { displayMode: mode });
      setSettings(s => ({ ...s, displayMode: mode }));
    } catch (err) {
      console.error("Failed to update displayMode:", err);
      setError("Could not update display mode");
    }
  }

  /* =========================
     Language
     ========================= */
  async function handleLanguageChange(newLang: string) {
    try {
      await api.post("/settings/language", { language: newLang });
      setSettings(s => ({ ...s, language: newLang }));
    } catch (err) {
      console.error("Failed to update language:", err);
      setError("Could not update language");
    }
  }

  /* =========================
     Timezone
     ========================= */
  async function handleTimezoneChange(newTz: string) {
    try {
      await api.post("/settings/timezone", { timezone: newTz });
      setSettings(s => ({ ...s, timezone: newTz }));
    } catch (err) {
      console.error("Failed to update timezone:", err);
      setError("Could not update timezone");
    }
  }

  /* =========================
     Preferred Currency
     ========================= */
  async function handleCurrencyChange(newCur: string) {
    try {
      await api.post("/settings/currency", { preferredCurrency: newCur });
      setSettings(s => ({ ...s, preferredCurrency: newCur }));
    } catch (err) {
      console.error("Failed to update currency:", err);
      setError("Could not update currency");
    }
  }

  /* =========================
     Instruments
     ========================= */
  async function addInstrument() {
    if (!newInstrument.trim()) return;
    try {
      const res = await api.post("/settings/instruments/add", { instrument: newInstrument.trim() });
      setSettings(s => ({ ...s, instruments: res.data.instruments }));
      setNewInstrument("");
    } catch (err) {
      console.error("Failed to add instrument:", err);
      setError("Could not add instrument");
    }
  }

  async function deleteInstrument(instr: string) {
    try {
      const res = await api.post("/settings/instruments/delete", { instrument: instr });
      setSettings(s => ({ ...s, instruments: res.data.instruments }));
    } catch (err) {
      console.error("Failed to delete instrument:", err);
      setError("Could not delete instrument");
    }
  }

  /* =========================
     Patterns
     ========================= */
  async function addPattern() {
    if (!newPattern.trim()) return;
    try {
      const res = await api.post("/settings/patterns/add", { pattern: newPattern.trim() });
      setSettings(s => ({ ...s, patterns: res.data.patterns }));
      setNewPattern("");
    } catch (err) {
      console.error("Failed to add pattern:", err);
      setError("Could not add pattern");
    }
  }

  async function deletePattern(p: string) {
    try {
      const res = await api.post("/settings/patterns/delete", { pattern: p });
      setSettings(s => ({ ...s, patterns: res.data.patterns }));
    } catch (err) {
      console.error("Failed to delete pattern:", err);
      setError("Could not delete pattern");
    }
  }

  /* =========================
     Break-Even Range
     ========================= */
  async function updateBeRange() {
    const minVal = parseFloat(tempBeMin);
    const maxVal = parseFloat(tempBeMax);
    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
      alert("Invalid break-even values");
      return;
    }
    try {
      const res = await api.post("/settings/beRange/update", {
        beMin: minVal,
        beMax: maxVal,
      });
      setSettings(s => ({
        ...s,
        beMin: res.data.beMin,
        beMax: res.data.beMax,
      }));
    } catch (err) {
      console.error("Failed to update be range:", err);
      setError("Could not update break-even range");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading Settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">User Settings</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* ========== GENERAL PREFERENCES ========== */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">General Preferences</h2>

        {/* Dark/Light Mode */}
        <div className="mb-4">
          <label className="block font-medium text-gray-600">Display Mode:</label>
          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => handleDisplayModeChange("light")}
              className={`px-3 py-1 rounded ${
                settings.displayMode === "light" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => handleDisplayModeChange("dark")}
              className={`px-3 py-1 rounded ${
                settings.displayMode === "dark" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              Dark
            </button>
            <span className="text-sm text-gray-500">Current: {settings.displayMode}</span>
          </div>
        </div>

        {/* Language */}
        <div className="mb-4">
          <label className="block font-medium text-gray-600">Language:</label>
          <select
            className="mt-1 p-2 border rounded"
            value={settings.language}
            onChange={e => handleLanguageChange(e.target.value)}
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            {/* add more if needed */}
          </select>
        </div>

        {/* Timezone */}
        <div className="mb-4">
          <label className="block font-medium text-gray-600">Timezone:</label>
          <input
            type="text"
            className="mt-1 p-2 border rounded"
            value={settings.timezone}
            onChange={e => handleTimezoneChange(e.target.value)}
          />
        </div>

        {/* Preferred Currency */}
        <div>
          <label className="block font-medium text-gray-600">Preferred Currency:</label>
          <input
            type="text"
            className="mt-1 p-2 border rounded"
            value={settings.preferredCurrency}
            onChange={e => handleCurrencyChange(e.target.value)}
          />
        </div>
      </section>

      {/* ========== TRADING PREFERENCES ========== */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Trading Preferences</h2>

        {/* Instruments */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700">Instruments</h3>
          {settings.instruments.length === 0 ? (
            <p className="text-gray-500 text-sm">No instruments yet.</p>
          ) : (
            <ul className="list-disc ml-5 mt-1">
              {settings.instruments.map(instr => (
                <li key={instr} className="flex items-center justify-between">
                  <span>{instr}</span>
                  <button
                    className="text-sm px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => deleteInstrument(instr)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              className="p-2 border rounded flex-1"
              placeholder="New Instrument"
              value={newInstrument}
              onChange={e => setNewInstrument(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={addInstrument}
            >
              Add
            </button>
          </div>
        </div>

        {/* Patterns */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700">Patterns</h3>
          {settings.patterns.length === 0 ? (
            <p className="text-gray-500 text-sm">No patterns yet.</p>
          ) : (
            <ul className="list-disc ml-5 mt-1">
              {settings.patterns.map(p => (
                <li key={p} className="flex items-center justify-between">
                  <span>{p}</span>
                  <button
                    className="text-sm px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => deletePattern(p)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              className="p-2 border rounded flex-1"
              placeholder="New Pattern"
              value={newPattern}
              onChange={e => setNewPattern(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={addPattern}
            >
              Add
            </button>
          </div>
        </div>

        {/* Break Even Range */}
        <div>
          <h3 className="font-medium text-gray-700">Break-Even Range</h3>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <label className="block text-sm text-gray-600">beMin:</label>
              <input
                type="number"
                step="any"
                className="border p-2 rounded"
                value={tempBeMin}
                onChange={e => setTempBeMin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">beMax:</label>
              <input
                type="number"
                step="any"
                className="border p-2 rounded"
                value={tempBeMax}
                onChange={e => setTempBeMax(e.target.value)}
              />
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={updateBeRange}
            >
              Update
            </button>
          </div>
          <p className="text-sm mt-2 text-gray-500">
            Current range: {settings.beMin} - {settings.beMax}
          </p>
        </div>
      </section>
    </div>
  );
}
