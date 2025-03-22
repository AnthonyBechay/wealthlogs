// pages/settingsTrading.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface SettingsTradingData {
  instruments: string[];
  patterns: string[];
  beMin: number;
  beMax: number;

  // NEW: store user's media tags
  mediaTags?: string[];
}

export default function SettingsTrading() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<SettingsTradingData>({
    instruments: [],
    patterns: [],
    beMin: -0.2,
    beMax: 0.3,
    mediaTags: [],
  });

  // For adding new items
  const [newInstrument, setNewInstrument] = useState("");
  const [newPattern, setNewPattern] = useState("");

  // For break-even range
  const [tempBeMin, setTempBeMin] = useState("-0.2");
  const [tempBeMax, setTempBeMax] = useState("0.3");

  // NEW: for media tags
  const [newMediaTag, setNewMediaTag] = useState("");

  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me");
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
        instruments: data.instruments || [],
        patterns: data.patterns || [],
        beMin: data.beMin ?? -0.2,
        beMax: data.beMax ?? 0.3,
        mediaTags: data.mediaTags || [],
      });
      setTempBeMin(String(data.beMin ?? -0.2));
      setTempBeMax(String(data.beMax ?? 0.3));
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Could not load settings");
    }
  }

  // ============= INSTRUMENTS =============
  async function addInstrument() {
    if (!newInstrument.trim()) return;
    try {
      const res = await api.post("/settings/instruments/add", {
        instrument: newInstrument.trim(),
      });
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

  // ============= PATTERNS =============
  async function addPattern() {
    if (!newPattern.trim()) return;
    try {
      const res = await api.post("/settings/patterns/add", {
        pattern: newPattern.trim(),
      });
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

  // ============= MEDIA TAGS =============
  async function addMediaTag() {
    if (!newMediaTag.trim()) return;
    try {
      const res = await api.post("/settings/mediaTags/add", {
        mediaTag: newMediaTag.trim(),
      });
      setSettings(s => ({
        ...s,
        mediaTags: res.data.mediaTags,
      }));
      setNewMediaTag("");
    } catch (err) {
      console.error("Failed to add media tag:", err);
      setError("Could not add media tag");
    }
  }

  async function deleteMediaTag(tag: string) {
    try {
      const res = await api.post("/settings/mediaTags/delete", { mediaTag: tag });
      setSettings(s => ({
        ...s,
        mediaTags: res.data.mediaTags,
      }));
    } catch (err) {
      console.error("Failed to delete media tag:", err);
      setError("Could not delete media tag");
    }
  }

  // ============= BREAK-EVEN =============
  async function updateBeRange() {
    const minVal = parseFloat(tempBeMin);
    const maxVal = parseFloat(tempBeMax);
    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
      alert("Invalid break-even range");
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
      setError("Could not update BE range");
    }
  }

  if (loading) {
    return <div className="p-4">Loading Trading Preferences...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Trading Preferences</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Instruments */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Instruments</h2>
        {settings.instruments.length === 0 ? (
          <p className="text-gray-500">No instruments yet.</p>
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
      </section>

      {/* Patterns */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Patterns</h2>
        {settings.patterns.length === 0 ? (
          <p className="text-gray-500">No patterns yet.</p>
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
      </section>

      {/* Media Tags */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Media Tags</h2>
        {(!settings.mediaTags || settings.mediaTags.length === 0) ? (
          <p className="text-gray-500">No media tags yet.</p>
        ) : (
          <ul className="list-disc ml-5 mt-1">
            {settings.mediaTags.map(tag => (
              <li key={tag} className="flex items-center justify-between">
                <span>{tag}</span>
                <button
                  className="text-sm px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => deleteMediaTag(tag)}
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
            placeholder="e.g. 5-Min Chart"
            value={newMediaTag}
            onChange={e => setNewMediaTag(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={addMediaTag}
          >
            Add
          </button>
        </div>
      </section>

      {/* Break Even Range */}
      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Break-Even Range</h2>
        <div className="flex items-center gap-4">
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
      </section>
    </div>
  );
}
