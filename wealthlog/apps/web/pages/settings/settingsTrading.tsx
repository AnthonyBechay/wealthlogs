// =============================================
// apps/web/pages/settingsTrading.tsx  (FULL FILE, v3) – completed + icon fallback
// =============================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '@wealthlog/common';
let TrashIcon: React.FC<{ size?: number }> = () => <span>🗑</span>;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TrashIcon = require('react-icons/fa').FaTrash ?? TrashIcon;
} catch {}

interface TradingSettingsData {
  instruments: string[];
  patterns: string[];
  mediaTags: string[];
  beMin: number;
  beMax: number;
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-[var(--background-2)] p-5 shadow-sm mb-6">
    {children}
  </section>
);
const Title = ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>;
const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="p-1 rounded hover:bg-red-600 bg-red-500 text-white"><TrashIcon size={12} /></button>
);

export default function SettingsTrading() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TradingSettingsData>({ instruments: [], patterns: [], mediaTags: [], beMin: -0.2, beMax: 0.3 });

  const [newInstrument, setNewInstrument] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newMediaTag, setNewMediaTag] = useState('');
  const [tempBeMin, setTempBeMin] = useState('-0.2');
  const [tempBeMax, setTempBeMax] = useState('0.3');

  useEffect(() => {
    (async () => {
      try {
        await api.get('/auth/me');
        await refresh();
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    const { data } = await api.get('/tradingSettings');
    setData(data);
    setTempBeMin(String(data.beMin));
    setTempBeMax(String(data.beMax));
  };

  async function add(kind: 'instrument' | 'pattern' | 'mediaTag') {
    const val = kind === 'instrument' ? newInstrument.trim() : kind === 'pattern' ? newPattern.trim() : newMediaTag.trim();
    if (!val) return;
    try {
      await api.post(`/tradingSettings/${kind}s/add`, { name: val });
      await refresh();
      if (kind === 'instrument') setNewInstrument('');
      if (kind === 'pattern') setNewPattern('');
      if (kind === 'mediaTag') setNewMediaTag('');
    } catch { setError('Could not add'); }
  }
  async function del(kind: 'instrument' | 'pattern' | 'mediaTag', name: string) {
    try { await api.post(`/tradingSettings/${kind}s/delete`, { name }); await refresh(); }
    catch { setError('Could not delete'); }
  }

  async function updateBeRange() {
    const minVal = parseFloat(tempBeMin); const maxVal = parseFloat(tempBeMax);
    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) { alert('Invalid range'); return; }
    try { await api.post('/tradingSettings/beRange/update', { beMin: minVal, beMax: maxVal }); await refresh(); }
    catch { setError('Could not update range'); }
  }

  if (loading) return <div className="p-4">Loading Trading Settings…</div>;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[var(--background)] dark:text-[var(--text)]">
      <h1 className="text-3xl font-bold">Trading Settings</h1>
      {error && <p className="text-red-600">{error}</p>}

      {/* Instruments */}
      <Card>
        <Title>Instruments</Title>
        {data.instruments.length ? (
          <ul className="space-y-1">{data.instruments.map((i)=>(<li key={i} className="flex justify-between items-center"><span>{i}</span><DeleteBtn onClick={()=>del('instrument', i)} /></li>))}</ul>
        ) : <p>No instruments</p>}
        <div className="flex gap-2 mt-3"><input className="flex-1 p-2 border rounded dark:bg-[var(--background-2)]" value={newInstrument} onChange={(e)=>setNewInstrument(e.target.value)} placeholder="Add instrument" /><button onClick={()=>add('instrument')} className="px-4 py-2 bg-[var(--primary)] text-white rounded">Add</button></div>
      </Card>

      {/* Patterns */}
      <Card>
        <Title>Patterns</Title>
        {data.patterns.length ? (
          <ul className="space-y-1">{data.patterns.map((p)=>(<li key={p} className="flex justify-between items-center"><span>{p}</span><DeleteBtn onClick={()=>del('pattern', p)} /></li>))}</ul>
        ) : <p>No patterns</p>}
        <div className="flex gap-2 mt-3"><input className="flex-1 p-2 border rounded dark:bg-[var(--background-2)]" value={newPattern} onChange={(e)=>setNewPattern(e.target.value)} placeholder="Add pattern" /><button onClick={()=>add('pattern')} className="px-4 py-2 bg-[var(--primary)] text-white rounded">Add</button></div>
      </Card>

      {/* Media Tags */}
      {/* <Card>
        <Title>Media Tags</Title>
        {data.mediaTags.length ? (
          <ul className="space-y-1">{data.mediaTags.map((m)=>(<li key={m} className="flex justify-between items-center"><span>{m}</span><DeleteBtn onClick={()=>del('mediaTag', m)} /></li>))}</ul>
        ) : <p>No media tags</p>}
        <div className="flex gap-2 mt-3"><input className="flex-1 p-2 border rounded dark:bg-[var(--background-2)]" value={newMediaTag} onChange={(e)=>setNewMediaTag(e.target.value)} placeholder="Add media tag" /><button onClick={()=>add('mediaTag')} className="px-4 py-2 bg-[var(--primary)] text-white rounded">Add</button></div>
      </Card> */}

      {/* Break-even */}
      <Card>
        <Title>Break‑Even Range</Title>
        <div className="flex items-end gap-4 flex-wrap">
          <div><label className="block text-sm">beMin</label><input type="number" step="any" className="p-2 border rounded w-28 dark:bg-[var(--background-2)]" value={tempBeMin} onChange={(e)=>setTempBeMin(e.target.value)} /></div>
          <div><label className="block text-sm">beMax</label><input type="number" step="any" className="p-2 border rounded w-28 dark:bg-[var(--background-2)]" value={tempBeMax} onChange={(e)=>setTempBeMax(e.target.value)} /></div>
          <button onClick={updateBeRange} className="px-4 py-2 bg-green-600 text-white rounded h-10">Save</button>
        </div>
        <p className="text-sm mt-2">Current: {data.beMin} – {data.beMax}</p>
      </Card>
    </div>
  );
}

// =============================================
// END