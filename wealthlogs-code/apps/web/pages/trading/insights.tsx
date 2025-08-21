/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createWealthLogAPI } from "@wealthlog/shared";
import Papa from "papaparse";

const api = createWealthLogAPI();

/*── helpers ───────────────────────────────────────*/
const todayISO = () => new Date().toISOString().slice(0, 10);
const firstDayISO = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

/*── types ─────────────────────────────────────────*/
interface Totals {
  trades: number; wins: number; losses: number;
  netPnl: number; grossProfit: number; grossLoss: number;
  winRate: number; profitFactor: number | null; avgPctPerTrade: number;
}
interface InstrumentStat {
  instrument: string; trades: number; gross: number;
  winRate: number;   avgPerTrade: number;
}
interface FXRow {
  id: number; instrument: string; entryDate: string;
  tradeDirection: "LONG" | "SHORT";
  lots: number | null; entryPrice: number | null; exitPrice: number | null;
  stopLossPips: number | null; pipsGain: number | null;
  amountGain: number | null;   percentageGain: number | null;
  fees: number;
}
interface Bucket { key: string; count: number; grossPL: number; avgPct: number; winRate: number; }

export default function TradeInsights() {
  const router = useRouter();

  /*──────── dynamic dropdown lists ───────*/
  const [accounts, setAccounts]     = useState<{ id: number; name: string }[]>([]);
  const [instList, setInstList]     = useState<string[]>([]);
  const [patList,  setPatList]      = useState<string[]>([]);

  /*──────── insight data ───────*/
  const [totals,        setTotals]        = useState<Totals | null>(null);
  const [instrumentStats, setInstrumentStats] = useState<InstrumentStat[]>([]);

  /*──────── advanced filter state ───────*/
  const [rows,  setRows]  = useState<FXRow[]>([]);
  const [bks,   setBks]   = useState<Bucket[]>([]);
  const [err,   setErr]   = useState("");

  /*─ filter fields ─*/
  const [accountId, setAccountId]   = useState<string>("");
  const [instr,     setInstr]       = useState<string>("");
  const [dir,       setDir]         = useState<"" | "LONG" | "SHORT">("");
  const [pattern,   setPattern]     = useState<string>("");
  const [from,      setFrom]        = useState(firstDayISO());
  const [to,        setTo]          = useState(todayISO());
  const [minLots,   setMinLots]     = useState("");
  const [maxLots,   setMaxLots]     = useState("");
  const [minPct,    setMinPct]      = useState("");
  const [maxPct,    setMaxPct]      = useState("");
  const [groupBy,   setGroupBy]     = useState<"instrument" | "direction" | "month">("instrument");
  const [loading,   setLoading]     = useState(false);
  const [moreOpen,  setMoreOpen]    = useState(false);

  /*──────── initial load ───────*/
  useEffect(() => {
    (async () => {
      try {
        /* accounts + settings */
        const acc = await api.getAccounts();
        const fxAcc = acc.filter((a: any) => a.accountType === "FX_COMMODITY");
        setAccounts(fxAcc);
        if (fxAcc.length) setAccountId(String(fxAcc[0].id));

        const s = await fetch('/tradingSettings', {
          headers: { 'Authorization': `Bearer ${api.getToken()}` }
        }).then(r => r.json());
        setInstList(s.instruments || []);
        setPatList(s.patterns || []);

        if (fxAcc.length) await refreshInsights(fxAcc[0].id);
      } catch {
        router.push("/login");
      }
    })();
  }, []);

  /*──────── refresh insights when account changes ───────*/
  async function refreshInsights(id: string) {
    try {
      const response = await fetch(`/trade/insights?accountId=${id}`, {
        headers: { 'Authorization': `Bearer ${api.getToken()}` }
      });
      const data = await response.json();
      setTotals(data.totals);
      setInstrumentStats(data.instrumentStats);
    } catch (e) {
      console.error("Insights failed:", e);
      setTotals(null); setInstrumentStats([]);
    }
  }

  /*──────── run filter ───────*/
  async function runFilter(e?: React.FormEvent) {
    e?.preventDefault();
    if (!accountId) return;
    setLoading(true); setErr("");
    try {
      const qs = new URLSearchParams({
        accountId,
        instr,
        dir,
        from,
        to,
        pattern,
        minLots,
        maxLots,
        minPct,
        maxPct,
        groupBy,
      });
      const response = await fetch(`/trade/filter?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${api.getToken()}` }
      });
      const data = await response.json();
      setRows(data.rows); setBks(data.buckets);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Filter failed");
    } finally {
      setLoading(false);
    }
  }

  /*──────── exports ───────*/
  const csvExport = () => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "trades.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const jsonExport = () => {
    const blob = new Blob([JSON.stringify({ rows, bks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "trades.json"; a.click();
    URL.revokeObjectURL(url);
  };

  /*──────── UI ───────*/
  return (
    <div className="min-h-screen p-4 bg-[var(--background)] text-[var(--text)]">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Trade Insights</h1>
        <button onClick={() => router.push("/trading")} className="text-sm underline">
          ← back
        </button>
      </div>

      {/* account selector */}
      <select
        value={accountId}
        onChange={(e) => {
          setAccountId(e.target.value);
          refreshInsights(e.target.value);
        }}
        className="mb-6 p-2 rounded bg-[var(--background-2)] border"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {/* KPI grid */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {[
            { l: "Trades", v: totals.trades },
            { l: "Win %", v: totals.winRate.toFixed(1) + "%" },
            { l: "Net P/L $", v: totals.netPnl.toFixed(2) },
            { l: "Avg % / trade", v: totals.avgPctPerTrade.toFixed(2) + "%" },
            { l: "Gross +$", v: totals.grossProfit.toFixed(2) },
            { l: "Gross -$", v: (-totals.grossLoss).toFixed(2) },
            { l: "Profit Factor", v: totals.profitFactor?.toFixed(2) ?? "∞" },
            { l: "W : L", v: `${totals.wins}:${totals.losses}` },
          ].map((k) => (
            <div key={k.l} className="p-4 rounded-lg bg-[var(--background-2)] shadow flex flex-col">
              <span className="text-xs opacity-70">{k.l}</span>
              <span className="text-lg font-semibold">{k.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* instrument leaderboard */}
      {instrumentStats?.length > 0 && (
        <div className="overflow-x-auto mb-10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Instrument", "Trades", "Net $", "Avg $", "Win %"].map((h) => (
                  <th key={h} className="border-b p-2 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instrumentStats.map((s) => (
                <tr key={s.instrument} className="hover:bg-[var(--background-2)]">
                  <td className="p-2">{s.instrument}</td>
                  <td className="p-2">{s.trades}</td>
                  <td className="p-2">{s.gross.toFixed(2)}</td>
                  <td className="p-2">{s.avgPerTrade.toFixed(2)}</td>
                  <td className="p-2">{s.winRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*──────────────── ADVANCED FILTER ────────────────*/}
      <details className="mb-4" open>
        <summary className="cursor-pointer font-medium py-2 px-1 bg-[var(--background-2)] rounded">
          Advanced filter
        </summary>

        <form
          onSubmit={runFilter}
          className="mt-3 bg-[var(--background-2)] p-4 rounded-lg grid gap-3 grid-cols-1 md:grid-cols-3"
        >
          {/* row 1 */}
          <select className="input" value={instr} onChange={(e) => setInstr(e.target.value)}>
            <option value="">All instruments</option>
            {instList.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          <select className="input" value={dir} onChange={(e) => setDir(e.target.value as any)}>
            <option value="">Direction</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          <select className="input" value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="">All patterns</option>
            {patList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* row 2 */}
          <div className="flex gap-2 col-span-full md:col-span-1">
            <input
              type="date"
              className="input flex-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className="input flex-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <select
            className="input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
          >
            <option value="instrument">Group by instrument</option>
            <option value="direction">Group by direction</option>
            <option value="month">Group by month</option>
          </select>

          {/* quick buttons */}
          <div className="flex gap-2 col-span-full">
            <button
              type="button"
              onClick={() => {
                setFrom(firstDayISO());
                setTo(todayISO());
              }}
              className="btn-sm"
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="btn-sm"
            >
              Any date
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="btn-sm"
            >
              {moreOpen ? "− Less" : "+ More"}
            </button>
            <button className="btn primary ml-auto">{loading ? "…" : "Run"}</button>
          </div>

          {/* extra fields */}
          {moreOpen && (
            <>
              <input
                className="input"
                placeholder="Min lots"
                value={minLots}
                onChange={(e) => setMinLots(e.target.value)}
              />
              <input
                className="input"
                placeholder="Max lots"
                value={maxLots}
                onChange={(e) => setMaxLots(e.target.value)}
              />
              <input
                className="input"
                placeholder="Min % gain"
                value={minPct}
                onChange={(e) => setMinPct(e.target.value)}
              />
              <input
                className="input"
                placeholder="Max % gain"
                value={maxPct}
                onChange={(e) => setMaxPct(e.target.value)}
              />
            </>
          )}
        </form>
      </details>

      {/* filter errors */}
      {err && <p className="text-red-500">{err}</p>}

      {/*──────────────── RESULTS ────────────────*/}
      {rows.length > 0 && (
        <>
          <div className="flex gap-3 mb-3">
            <button onClick={csvExport} className="btn">
              CSV
            </button>
            <button onClick={jsonExport} className="btn">
              JSON
            </button>
            <span className="ml-auto text-sm opacity-70">{rows.length} trades</span>
          </div>

          {/* buckets */}
          {bks.length > 0 && (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Key", "Trades", "Gross $", "Avg %", "Win %"].map((h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bks.map((b) => (
                    <tr key={b.key}>
                      <td className="td">{b.key}</td>
                      <td className="td">{b.count}</td>
                      <td className="td">{b.grossPL.toFixed(2)}</td>
                      <td className="td">{b.avgPct.toFixed(2)}</td>
                      <td className="td">{b.winRate.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* rows */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr>
                  {["Date", "Sym", "Dir", "Lots", "$", "%", "Entry", "Exit", "SL", "Pips"].map(
                    (h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td">{new Date(r.entryDate).toLocaleString()}</td>
                    <td className="td">{r.instrument}</td>
                    <td className="td">{r.tradeDirection}</td>
                    <td className="td">{r.lots ?? "-"}</td>
                    <td className="td">{r.amountGain?.toFixed(2) ?? "-"}</td>
                    <td className="td">{r.percentageGain?.toFixed(2) ?? "-"}%</td>
                    <td className="td">{r.entryPrice ?? "-"}</td>
                    <td className="td">{r.exitPrice ?? "-"}</td>
                    <td className="td">{r.stopLossPips ?? "-"}</td>
                    <td className="td">{r.pipsGain ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/*── quick styles ─*/}
      <style jsx>{`
        .input {
          padding: 0.45rem;
          border-radius: 0.25rem;
          background: var(--background);
          border: 1px solid var(--border);
        }
        .btn {
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: #fff;
          border-radius: 0.25rem;
        }
        .btn-sm {
          padding: 0.35rem 0.75rem;
          background: var(--background-2);
          border: 1px solid var(--border);
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .btn.primary {
          background: var(--primary);
        }
        .th {
          border-bottom: 1px solid var(--border);
          padding: 0.4rem;
          text-align: left;
          white-space: nowrap;
        }
        .td {
          border-bottom: 1px solid var(--border);
          padding: 0.4rem;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
