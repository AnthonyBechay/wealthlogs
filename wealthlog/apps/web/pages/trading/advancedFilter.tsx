/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";
import Papa from "papaparse";

/*── small helpers ───────────────────────────────────────────*/
const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};


/*── result types (match route) ──────────────────────────────*/
interface FXRow {
  id: number;
  instrument: string;
  entryDate: string;
  tradeDirection: "LONG" | "SHORT";
  lots: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLossPips: number | null;
  pipsGain: number | null;
  realizedPL: number | null; // Primary P&L
  tradeSpecificPercentageGain: number | null; // From FxTrade.percentageGain
  openingBalance: number | null; // For individual row %RoB calc
  fees: number;
}

interface Bucket {
  key: string;
  count: number;
  grossPL: number; // Sum of realizedPL
  avgReturnOnBalance: number; // (Total realizedPL / Total openingBalance for these trades) * 100
  avgTradeSpecificPercentageGain: number; // Average of FxTrade.percentageGain values
  winRate: number;
}

interface GlobalStats {
  totalTrades: number;
  totalRealizedPL: number;
  winRate: number;
  avgReturnOnBalance: number;
  totalFees: number;
}



export default function AdvFilter() {
  const router = useRouter();
  const [rows, setRows] = useState<FXRow[]>([]);
  const [bks, setBks] = useState<Bucket[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [err, setErr] = useState("");
  const [load, setLoad] = useState(false);

  /*── dynamic lists ─────────────────────────────────────────*/
  const [acctList, setAcctList] = useState<{ id: number; name: string }[]>([]);
  const [instList, setInstList] = useState<string[]>([]);
  const [patList,  setPatList]  = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const acct = await api.get("/account");
        setAcctList(acct.data.map((a: any) => ({ id: a.id, name: a.name })));
        const s = await api.get("/tradingSettings");
        setInstList(s.data.instruments || []);
        setPatList(s.data.patterns || []);
        setFrom(startOfMonthISO());
        setTo(todayISO());
        run();
      } catch (e) {
        console.error("Failed to fetch dropdown data:", e);
        router.push("/login");
      }
    })();
  }, [router]);

  /*── filter state ─────────────────────────────────────────*/
  const [accountId, setAccountId] = useState<string>("");
  const [instr, setInstr]       = useState<string>("");
  const [dir, setDir]           = useState<"" | "LONG" | "SHORT">("");
  const [from, setFrom]         = useState<string>("");
  const [to, setTo]             = useState<string>("");
  const [pattern, setPattern]   = useState<string>("");

  const [moreOpen, setMoreOpen] = useState(false);
  const [minLots, setMinLots]   = useState("");
  const [maxLots, setMaxLots]   = useState("");
  const [minPct,  setMinPct]    = useState("");
  const [maxPct,  setMaxPct]    = useState("");
  const [groupBy, setGroupBy]   = useState<"instrument" | "direction" | "month">("instrument");

  /*── query runner ─────────────────────────────────────────*/
  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setLoad(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        accountId,
        dir,
        from,
        to,
        groupBy,
        pattern,
        minLots,
        maxLots,
        minPct, // This filters on FxTrade.percentageGain
        maxPct,  // This filters on FxTrade.percentageGain
        instr,
        // Add page and size if you want to control pagination from frontend,
        // otherwise backend defaults will be used. For now, let's assume backend handles it.
      });
      const { data } = await api.get(`/tradeFilter?${qs.toString()}`); // Ensure this matches your API route
      setRows(data.rows);
      setBks(data.buckets);
      setGlobalStats(data.globalStats); // New state for dashboard
    } catch (e: any) {
      setErr(e?.response?.data?.error || "failed");
      setGlobalStats(null); // Clear stats on error
    } finally {
      setLoad(false);
    }
  }

  /*── export helpers ─────────────────────────────────────────*/
  const exportCsv = () => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ rows, bks }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades.json";
    a.click();
    URL.revokeObjectURL(url);
  };

// Helper to format currency
    const formatCurrency = (value: number | null | undefined) => {
      if (value == null) return "$ -";
      return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
    };

    // Helper to format percentage
    const formatPercentage = (value: number | null | undefined, decimals = 1) => {
      if (value == null) return "- %";
      return `${value.toFixed(decimals)}%`;
    };

  return (
    <div className="min-h-screen p-4 bg-[var(--background)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Advanced FX Filter</h1>
        <button onClick={() => router.push("/trading/trading")} className="text-sm underline">
          ← back
        </button>
      </div>

{globalStats && !load && (
  <div className="mb-6 p-4 bg-[var(--background-2)] rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4 text-[var(--text-accent)]">Overall Performance Snapshot</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1: Total P&L */}
      <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Net P&L</h3>
        <p className={`text-2xl font-bold ${globalStats.totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatCurrency(globalStats.totalRealizedPL)}
        </p>
      </div>

      {/* Card 2: Win Rate & Trades */}
      <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Win Rate / Total Trades</h3>
        <p className="text-2xl font-bold text-[var(--primary)]">{formatPercentage(globalStats.winRate)}
          <span className="text-base font-normal text-[var(--text-muted)]"> ({globalStats.totalTrades} trades)</span>
        </p>
      </div>

      {/* Card 3: Avg Return on Balance */}
      <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Avg. Return on Balance</h3>
        <p className={`text-2xl font-bold ${globalStats.avgReturnOnBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatPercentage(globalStats.avgReturnOnBalance)}
        </p>
      </div>
      
      {/* Card 4: Total Fees */}
      <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Fees</h3>
        <p className="text-xl font-semibold text-[var(--text-muted)]">
            {formatCurrency(globalStats.totalFees)}
        </p>
      </div>

      {/* Add more cards as needed - e.g., top instrument by P&L (from bks), etc. */}
      {bks.length > 0 && (() => {
        const sortedByPL = [...bks].sort((a, b) => b.grossPL - a.grossPL);
        const topInstrumentByPL = sortedByPL[0];
        const topInstrumentByWinRate = [...bks].sort((a,b) => b.winRate - a.winRate)[0];

        return (
          <>
            {topInstrumentByPL && groupBy === 'instrument' && (
              <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                <h3 className="text-sm font-medium text-[var(--text-muted)]">Most Profitable Instrument</h3>
                <p className="text-xl font-bold text-[var(--primary)]">
                  {topInstrumentByPL.key} ({formatCurrency(topInstrumentByPL.grossPL)})
                </p>
              </div>
            )}
            {topInstrumentByWinRate && groupBy === 'instrument' && (
                 <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                   <h3 className="text-sm font-medium text-[var(--text-muted)]">Highest Win Rate Instrument</h3>
                   <p className="text-xl font-bold text-[var(--primary)]">
                     {topInstrumentByWinRate.key} ({formatPercentage(topInstrumentByWinRate.winRate)})
                   </p>
                 </div>
            )}
          </>
        );
      })()}
    </div>
  </div>
)}
{load && <p className="text-center my-4"></p>}



      <form
        onSubmit={run}
        className="bg-[var(--background-2)] p-4 rounded-lg grid gap-3 grid-cols-1 md:grid-cols-3"
      >
        {/* row 1 */}
        <select
          className="input"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">All accounts</option>
          {acctList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={instr}
          onChange={(e) => setInstr(e.target.value)}
        >
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
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        >
          <option value="">All patterns</option>
          {patList.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as any)}
        >
          <option value="instrument">Group by instrument</option>
          <option value="direction">Group by direction</option>
          <option value="month">Group by month</option>
        </select>

        {/* quick presets */}
        <div className="flex gap-2 col-span-full">
          <button
            type="button"
            onClick={() => {
              setFrom(startOfMonthISO());
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
          <button className="btn primary ml-auto">{load ? "Running…" : "Run"}</button>
        </div>

        {/*──────── collapsible extras ────────*/}
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

      {err && <p className="text-red-500 mt-4">{err}</p>}

      {/*──────── Results ───────────────*/}
      {rows.length > 0 && (
        <>
          <div className="flex gap-3 mt-6 mb-3">
            <button onClick={exportCsv} className="btn">
              CSV
            </button>
            <button onClick={exportJson} className="btn">
              JSON
            </button>
            <span className="ml-auto text-sm opacity-70">
              {rows.length} trades
            </span>
          </div>

          {/* bucket table */}
<div className="overflow-x-auto mb-6">
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr>
        {/* Adjust headers based on new Bucket fields */}
        {["Key", "Trades", "Gross P&L", "Avg % RoB", "Avg Trade %", "Win %"].map((h) => (
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
          <td className="td text-right">{b.count}</td>
          <td className={`td text-right ${b.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(b.grossPL)}</td>
          <td className={`td text-right ${b.avgReturnOnBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(b.avgReturnOnBalance)}</td>
          <td className="td text-right">{formatPercentage(b.avgTradeSpecificPercentageGain)}</td>
          <td className="td text-right">{formatPercentage(b.winRate)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
          {/* rows */}
       {/* rows */}
<div className="overflow-x-auto">
  <table className="w-full border-collapse text-xs md:text-sm">
    <thead>
      <tr>
        {[
          "Date", "Sym", "Dir", "Lots", "Net P&L ($)", "Trade %", "Actual %", // Adjusted P&L column
          "Entry", "Exit", "SL", "Pips", "Fees",
        ].map((h) => (
          <th key={h} className="th">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => {
        const actualPercentageGain = r.openingBalance && r.openingBalance !== 0 && r.realizedPL != null
          ? (r.realizedPL / r.openingBalance) * 100
          : null;
        return (
          <tr key={r.id}>
            <td className="td">{new Date(r.entryDate).toLocaleString()}</td>
            <td className="td">{r.instrument}</td>
            <td className="td">{r.tradeDirection}</td>
            <td className="td text-right">{r.lots ?? "-"}</td>
            <td className={`td text-right ${r.realizedPL == null ? '' : r.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(r.realizedPL)}
            </td>
            <td className="td text-right"> 
              {/* This is FxTrade.percentageGain */}
              {r.tradeSpecificPercentageGain != null ? formatPercentage(r.tradeSpecificPercentageGain * 100, 2) : "-"} 
            </td>
            <td className={`td text-right ${actualPercentageGain == null ? '' : actualPercentageGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(actualPercentageGain, 2)}
            </td>
            <td className="td text-right">{r.entryPrice ?? "-"}</td>
            <td className="td text-right">{r.exitPrice ?? "-"}</td>
            <td className="td text-right">{r.stopLossPips ?? "-"}</td>
            <td className="td text-right">{r.pipsGain ?? "-"}</td>
            <td className="td text-right">{formatCurrency(r.fees)}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
        </>
      )}

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
          color: #fff;
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
