// apps/web/pages/settingsTrading.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '@wealthlog/common';

interface SettingsTradingData {
  instruments: string[];
  patterns: string[];
  beMin: number;
  beMax: number;
  mediaTags?: string[];
}

export default function SettingsTrading() {
  /* ───────────────────── state ───────────────────── */
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<SettingsTradingData>({
    instruments: [],
    patterns: [],
    beMin: -0.2,
    beMax: 0.3,
    mediaTags: [],
  });

  /* form helpers */
  const [newInstrument, setNewInstrument] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newMediaTag, setNewMediaTag] = useState('');
  const [tempBeMin, setTempBeMin] = useState('-0.2');
  const [tempBeMax, setTempBeMax] = useState('0.3');

  /* ───────────────────── init ───────────────────── */
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
      const { data } = await api.get('/settings');
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
      console.error('Failed to load settings:', err);
      setError('Could not load settings');
    }
  }

  /* ───────────────────── api helpers ───────────────────── */
  async function addInstrument() {
    if (!newInstrument.trim()) return;
    try {
      const { data } = await api.post('/settings/instruments/add', {
        instrument: newInstrument.trim(),
      });
      setSettings((s) => ({ ...s, instruments: data.instruments }));
      setNewInstrument('');
    } catch {
      setError('Could not add instrument');
    }
  }

  async function deleteInstrument(instr: string) {
    try {
      const { data } = await api.post('/settings/instruments/delete', {
        instrument: instr,
      });
      setSettings((s) => ({ ...s, instruments: data.instruments }));
    } catch {
      setError('Could not delete instrument');
    }
  }

  async function addPattern() {
    if (!newPattern.trim()) return;
    try {
      const { data } = await api.post('/settings/patterns/add', {
        pattern: newPattern.trim(),
      });
      setSettings((s) => ({ ...s, patterns: data.patterns }));
      setNewPattern('');
    } catch {
      setError('Could not add pattern');
    }
  }

  async function deletePattern(p: string) {
    try {
      const { data } = await api.post('/settings/patterns/delete', {
        pattern: p,
      });
      setSettings((s) => ({ ...s, patterns: data.patterns }));
    } catch {
      setError('Could not delete pattern');
    }
  }

  async function addMediaTag() {
    if (!newMediaTag.trim()) return;
    try {
      const { data } = await api.post('/settings/mediaTags/add', {
        mediaTag: newMediaTag.trim(),
      });
      setSettings((s) => ({ ...s, mediaTags: data.mediaTags }));
      setNewMediaTag('');
    } catch {
      setError('Could not add media tag');
    }
  }

  async function deleteMediaTag(tag: string) {
    try {
      const { data } = await api.post('/settings/mediaTags/delete', {
        mediaTag: tag,
      });
      setSettings((s) => ({ ...s, mediaTags: data.mediaTags }));
    } catch {
      setError('Could not delete media tag');
    }
  }

  async function updateBeRange() {
    const minVal = parseFloat(tempBeMin);
    const maxVal = parseFloat(tempBeMax);
    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
      alert('Invalid break‑even range');
      return;
    }
    try {
      const { data } = await api.post('/settings/beRange/update', {
        beMin: minVal,
        beMax: maxVal,
      });
      setSettings((s) => ({ ...s, beMin: data.beMin, beMax: data.beMax }));
    } catch {
      setError('Could not update BE range');
    }
  }

  /* ───────────────────── UI ───────────────────── */
  if (loading) return <div className="p-4">Loading Trading Preferences…</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-4">Trading Preferences</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* ───────── Instruments ───────── */}
      <Card>
        <Title>Instruments</Title>
        {settings.instruments.length === 0 ? (
          <Placeholder>No instruments yet.</Placeholder>
        ) : (
          <ItemList
            items={settings.instruments}
            onDelete={deleteInstrument}
          />
        )}
        <InlineInput
          value={newInstrument}
          placeholder="New Instrument"
          onChange={setNewInstrument}
          onAdd={addInstrument}
        />
      </Card>

      {/* ───────── Patterns ───────── */}
      <Card>
        <Title>Patterns</Title>
        {settings.patterns.length === 0 ? (
          <Placeholder>No patterns yet.</Placeholder>
        ) : (
          <ItemList items={settings.patterns} onDelete={deletePattern} />
        )}
        <InlineInput
          value={newPattern}
          placeholder="New Pattern"
          onChange={setNewPattern}
          onAdd={addPattern}
        />
      </Card>

      {/* ───────── Media tags ───────── */}
      <Card>
        <Title>Media Tags</Title>
        {(!settings.mediaTags || settings.mediaTags.length === 0) ? (
          <Placeholder>No media tags yet.</Placeholder>
        ) : (
          <ItemList items={settings.mediaTags} onDelete={deleteMediaTag} />
        )}
        <InlineInput
          value={newMediaTag}
          placeholder="e.g. 5‑Min Chart"
          onChange={setNewMediaTag}
          onAdd={addMediaTag}
        />
      </Card>

      {/* ───────── Break‑even range ───────── */}
      <Card>
        <Title>Break‑Even Range</Title>
        <div className="flex items-center gap-4">
          <LabeledNumber
            label="beMin"
            value={tempBeMin}
            onChange={setTempBeMin}
          />
          <LabeledNumber
            label="beMax"
            value={tempBeMax}
            onChange={setTempBeMax}
          />
          <button
            onClick={updateBeRange}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Update
          </button>
        </div>
        <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
          Current range: {settings.beMin} – {settings.beMax}
        </p>
      </Card>
    </div>
  );
}

/* ───────────────────── small sub‑components ───────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-8 bg-white dark:bg-gray-800 p-4 rounded shadow">
      {children}
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mb-2">{children}</h2>;
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-500 dark:text-gray-400">{children}</p>;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-sm px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded"
    >
      Delete
    </button>
  );
}

function ItemList({
  items,
  onDelete,
}: {
  items: string[];
  onDelete: (v: string) => void;
}) {
  return (
    <ul className="list-disc ml-5 mt-1">
      {items.map((it) => (
        <li key={it} className="flex items-center justify-between">
          <span>{it}</span>
          <DeleteBtn onClick={() => onDelete(it)} />
        </li>
      ))}
    </ul>
  );
}

function InlineInput(props: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        className="flex-1 p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button
        onClick={props.onAdd}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        Add
      </button>
    </div>
  );
}

function LabeledNumber(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-300">
        {props.label}:
      </label>
      <input
        type="number"
        step="any"
        className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
