/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";
import Papa from "papaparse";

// Common Date/Time Formatter (Consider moving to a shared utils file)
export const formatToBeirutTime = (dateStringOrObject: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateStringOrObject) return "N/A";
  try {
    const date = new Date(dateStringOrObject);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Beirut',
      hour12: true,
    };
    return date.toLocaleString('en-GB', { ...defaultOptions, ...options });
  } catch (e) {
    return "Invalid Date";
  }
};

/*── small helpers ───────────────────────────────────────────*/
const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

// Helper to format currency (already provided in previous response, ensure it's here)
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "$ -";
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
};

// Helper to format percentage (already provided, ensure it's here)
const formatPercentage = (value: number | null | undefined, decimals = 1) => {
  if (value == null) return "- %";
  return `${value.toFixed(decimals)}%`;
};


/*── result types (match route) ──────────────────────────────*/
interface FXRow {
  id: number;
  instrument: string;
  entryDate: string; // ISO string from backend
  tradeDirection: "LONG" | "SHORT";
  lots: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLossPips: number | null; // Kept in interface if backend still sends it, though not displayed as per request
  realizedPL: number | null;
  tradeSpecificPercentageGain: number | null;
  openingBalance: number | null;
  fees: number;
  session: string; // "London", "US", "Off-hours"
}

interface Bucket {
  key: string;
  count: number;
  grossPL: number;
  avgReturnOnBalance: number;
  avgTradeSpecificPercentageGain: number;
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

  const [acctList, setAcctList] = useState<{ id: number; name: string }[]>([]);
  const [instList, setInstList] = useState<string[]>([]);
  const [patList,  setPatList]  = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoad(true); // Set loading true at the beginning
      try {
        const acct = await api.get("/account");
        setAcctList(acct.data.map((a: any) => ({ id: a.id, name: a.name })));
        const s = await api.get("/tradingSettings");
        setInstList(s.data.instruments || []);
        setPatList(s.data.patterns || []);
        setFrom(startOfMonthISO());
        setTo(todayISO());
        await run(); // await the initial run
      } catch (e: any) {
        console.error("Failed to fetch dropdown data:", e);
        setErr(e?.response?.data?.error || "Failed to load initial data.");
        // router.push("/login"); // Only redirect on auth errors, not general load errors
      } finally {
        // setLoad(false); // run() will setLoad(false)
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed 'router' and 'run' as run is manually called.

  /*── filter state ─────────────────────────────────────────*/
  const [accountId, setAccountId] = useState<string>("");
  const [instr, setInstr]       = useState<string>("");
  const [dir, setDir]           = useState<"" | "LONG" | "SHORT">("");
  const [from, setFrom]         = useState<string>("");
  const [to, setTo]             = useState<string>("");
  const [pattern, setPattern]   = useState<string>("");
  const [session, setSession]   = useState<string>(""); // New filter state

  const [moreOpen, setMoreOpen] = useState(false);
  const [minLots, setMinLots]   = useState("");
  const [maxLots, setMaxLots]   = useState("");
  const [minPct,  setMinPct]    = useState(""); // Filters FxTrade.percentageGain
  const [maxPct,  setMaxPct]    = useState(""); // Filters FxTrade.percentageGain
  const [groupBy, setGroupBy]   = useState<"instrument" | "direction" | "month" | "session">("instrument");

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setLoad(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        accountId,
        instr,
        dir,
        from,
        to,
        pattern,
        session, // Add session to query params
        groupBy,
        minLots,
        maxLots,
        minPct,
        maxPct,
      });
      console.log("Running with params:", qs.toString()); // For debugging
      const { data } = await api.get(`/tradeFilter?${qs.toString()}`);
      console.log("Data received:", data); // For debugging
      setRows(data.rows || []);
      setBks(data.buckets || []);
      setGlobalStats(data.globalStats || null);
      if (!data.rows || data.rows.length === 0) {
        // setErr("No trades found matching your criteria."); // Optional: specific message for no results
      }
    } catch (error: any) {
      console.error("Filter run error:", error);
      setErr(error?.response?.data?.error || "Failed to fetch filtered trades.");
      setRows([]);
      setBks([]);
      setGlobalStats(null);
    } finally {
      setLoad(false);
    }
  }

  /*── export helpers ─────────────────────────────────────────*/
  const exportCsv = () => {
    if (rows.length === 0) {
      setErr("No data to export.");
      return;
    }
    const csvData = rows.map(r => ({
        Date: formatToBeirutTime(r.entryDate),
        Instrument: r.instrument,
        Direction: r.tradeDirection,
        Lots: r.lots,
        NetPL: r.realizedPL,
        TradeSpecificPercentGain: r.tradeSpecificPercentageGain,
        OpeningBalance: r.openingBalance,
        Fees: r.fees,
        Session: r.session,
        EntryPrice: r.entryPrice,
        ExitPrice: r.exitPrice,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (rows.length === 0 && bks.length === 0 && !globalStats) {
        setErr("No data to export.");
        return;
    }
    const jsonData = JSON.stringify({ globalStats, buckets: bks, trades: rows }, null, 2);
    const blob = new Blob([jsonData], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trades_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Calculate additional stats for cards from buckets if needed
  const mostLosingInstrument = groupBy === 'instrument' && bks.length > 0 ? 
    [...bks].sort((a, b) => a.grossPL - b.grossPL)[0] : null;

  const londonSessionStats = bks.find(b => b.key === "London" && groupBy === "session");
  const usSessionStats = bks.find(b => b.key === "US" && groupBy === "session");


  return (
    <div className="min-h-screen p-4 bg-[var(--background)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Advanced FX Filter</h1>
        <button onClick={() => router.push("/trading/trading")} className="text-sm underline">
          ← back
        </button>
      </div>

      {/* Dashboard Section */}
      {globalStats && !load && (
        <div className="mb-6 p-4 bg-[var(--background-2)] rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-accent)]">Overall Performance Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Net P&L</h3>
              <p className={`text-2xl font-bold ${globalStats.totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(globalStats.totalRealizedPL)}
              </p>
            </div>
            <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-medium text-[var(--text-muted)]">Win Rate / Total Trades</h3>
              <p className="text-2xl font-bold text-[var(--primary)]">{formatPercentage(globalStats.winRate)}
                <span className="text-base font-normal text-[var(--text-muted)]"> ({globalStats.totalTrades} trades)</span>
              </p>
            </div>
            <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-medium text-[var(--text-muted)]">Avg. Return on Balance</h3>
              <p className={`text-2xl font-bold ${globalStats.avgReturnOnBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(globalStats.avgReturnOnBalance)}
              </p>
            </div>
            <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
              <h3 className="text-sm font-medium text-[var(--text-muted)]">Total Fees</h3>
              <p className="text-xl font-semibold text-[var(--text-muted)]">
                  {formatCurrency(globalStats.totalFees)}
              </p>
            </div>
            {bks.length > 0 && groupBy === 'instrument' && (() => {
                const sortedByPL = [...bks].sort((a, b) => b.grossPL - a.grossPL);
                if (sortedByPL.length === 0) return null;
                const topInstrumentByPL = sortedByPL[0];
                return (
                    <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                        <h3 className="text-sm font-medium text-[var(--text-muted)]">Most Profitable Instrument</h3>
                        <p className="text-xl font-bold text-[var(--primary)]">
                        {topInstrumentByPL.key} ({formatCurrency(topInstrumentByPL.grossPL)})
                        </p>
                    </div>
                );
            })()}
            {mostLosingInstrument && (
                 <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                   <h3 className="text-sm font-medium text-[var(--text-muted)]">Most Losing Instrument</h3>
                   <p className="text-xl font-bold text-red-500">
                     {mostLosingInstrument.key} ({formatCurrency(mostLosingInstrument.grossPL)})
                   </p>
                 </div>
            )}
            {londonSessionStats && (
                 <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                   <h3 className="text-sm font-medium text-[var(--text-muted)]">London P&L / Win Rate</h3>
                   <p className={`text-xl font-bold ${londonSessionStats.grossPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {formatCurrency(londonSessionStats.grossPL)} ({formatPercentage(londonSessionStats.winRate)})
                   </p>
                 </div>
            )}
            {usSessionStats && (
                 <div className="bg-[var(--background)] p-4 rounded-md shadow-sm">
                   <h3 className="text-sm font-medium text-[var(--text-muted)]">US P&L / Win Rate</h3>
                   <p className={`text-xl font-bold ${usSessionStats.grossPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {formatCurrency(usSessionStats.grossPL)} ({formatPercentage(usSessionStats.winRate)})
                   </p>
                 </div>
            )}
          </div>
        </div>
      )}
      {load && !globalStats && <p className="text-center my-4">Loading dashboard data...</p>}


      <form
        onSubmit={run}
        className="bg-[var(--background-2)] p-4 rounded-lg grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">All accounts</option>
          {acctList.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
        <select className="input" value={instr} onChange={(e) => setInstr(e.target.value)}>
          <option value="">All instruments</option>
          {instList.map((i) => (<option key={i} value={i}>{i}</option>))}
        </select>
        <select className="input" value={dir} onChange={(e) => setDir(e.target.value as any)}>
          <option value="">Direction</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
        
        <div className="flex gap-2 col-span-full md:col-span-1 lg:col-span-1">
          <input type="date" className="input flex-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="input flex-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <select className="input" value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">All patterns</option>
          {patList.map((p) => (<option key={p} value={p}>{p}</option>))}
        </select>
        <select className="input" value={session} onChange={(e) => setSession(e.target.value)}>
          <option value="">All Sessions</option>
          <option value="London">London</option>
          <option value="US">US</option>
          <option value="Off-hours">Off-hours</option>
        </select>

        <select className="input col-span-full md:col-span-1 lg:col-span-1" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
          <option value="instrument">Group by instrument</option>
          <option value="direction">Group by direction</option>
          <option value="month">Group by month</option>
          <option value="session">Group by session</option>
        </select>
        
        <div className="col-span-full md:col-span-2 lg:col-span-2"> {/* Placeholder for alignment or add another filter */} </div>


        <div className="flex gap-2 col-span-full items-center">
          <button type="button" onClick={() => { setFrom(startOfMonthISO()); setTo(todayISO()); }} className="btn-sm">This month</button>
          <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="btn-sm">Any date</button>
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className="btn-sm">{moreOpen ? "− Less" : "+ More"}</button>
          <button className="btn primary ml-auto" disabled={load}>{load ? "Running…" : "Run"}</button>
        </div>

        {moreOpen && (
          <>
            <input className="input" placeholder="Min lots" value={minLots} onChange={(e) => setMinLots(e.target.value)} />
            <input className="input" placeholder="Max lots" value={maxLots} onChange={(e) => setMaxLots(e.target.value)} />
            <input className="input" placeholder="Min Trade % Gain" value={minPct} onChange={(e) => setMinPct(e.target.value)} />
            <input className="input" placeholder="Max Trade % Gain" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} />
          </>
        )}
      </form>

      {err && <p className="text-red-500 mt-4 p-3 bg-red-100 rounded">{err}</p>}

      {(rows.length > 0 || bks.length > 0) && !load && (
        <>
          <div className="flex gap-3 mt-6 mb-3 items-center">
            <button onClick={exportCsv} className="btn">CSV</button>
            <button onClick={exportJson} className="btn">JSON</button>
            {globalStats && <span className="ml-auto text-sm opacity-70">{globalStats.totalTrades} trades found</span>}
          </div>

          {bks.length > 0 && (
            <div className="overflow-x-auto mb-6">
              <h3 className="text-lg font-semibold mb-2">Grouped Analysis by: <span className="capitalize text-[var(--primary)]">{groupBy}</span></h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Key", "Trades", "Gross P&L", "Avg % RoB", "Avg Trade %", "Win %"].map((h) => (
                      <th key={h} className="th text-left first:text-left last:text-right data-[numeric=true]:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bks.map((b) => (
                    <tr key={b.key}>
                      <td className="td text-left">{b.key}</td>
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
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
               <h3 className="text-lg font-semibold mb-2">Trade Details</h3>
              <table className="w-full border-collapse text-xs md:text-sm">
                <thead>
                  <tr>
                    {["Date", "Sym", "Dir", "Lots", "Net P&L ($)", "Trade %", "Actual %", "Session", "Entry", "Exit", "Fees"].map((h) => (
                      <th key={h} className="th text-left first:text-left data-[numeric=true]:text-right">{h}</th>
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
                        <td className="td">{formatToBeirutTime(r.entryDate)}</td>
                        <td className="td">{r.instrument}</td>
                        <td className="td">{r.tradeDirection}</td>
                        <td className="td text-right">{r.lots ?? "-"}</td>
                        <td className={`td text-right ${r.realizedPL == null ? '' : r.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(r.realizedPL)}
                        </td>
                        <td className="td text-right">
                          {r.tradeSpecificPercentageGain != null ? formatPercentage(r.tradeSpecificPercentageGain * 100, 2) : "-"}
                        </td>
                        <td className={`td text-right ${actualPercentageGain == null ? '' : actualPercentageGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(actualPercentageGain, 2)}
                        </td>
                        <td className="td">{r.session}</td>
                        <td className="td text-right">{r.entryPrice ?? "-"}</td>
                        <td className="td text-right">{r.exitPrice ?? "-"}</td>
                        <td className="td text-right">{formatCurrency(r.fees)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {load && (rows.length > 0 || bks.length > 0) && <p className="text-center my-4">Updating results...</p>}
      {!load && !err && rows.length === 0 && bks.length === 0 && globalStats && globalStats.totalTrades === 0 && (
        <p className="text-center my-6 text-gray-500">No trades found matching your current filter criteria.</p>
      )}


      <style jsx>{`
        .input {
          padding: 0.45rem;
          border-radius: 0.25rem;
          background: var(--background);
          border: 1px solid var(--border);
          color: var(--text); /* Ensure text color is correct */
        }
        .input::placeholder { /* Style placeholder text */
            color: var(--text-muted);
            opacity: 0.7;
        }
        .btn {
          padding: 0.5rem 1rem;
          background: var(--primary);
          color: #fff;
          border-radius: 0.25rem;
          opacity: 1;
          transition: opacity 0.2s ease-in-out;
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .btn-sm {
          padding: 0.35rem 0.75rem;
          background: var(--background-2); /* Subtle background */
          border: 1px solid var(--border);
          color: var(--text); /* Ensure text color */
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .btn.primary {
          background: var(--primary);
          color: #fff;
        }
        .th {
          border-bottom: 1px solid var(--border);
          padding: 0.5rem 0.4rem; /* Increased padding slightly */
          text-align: left;
          white-space: nowrap;
          font-weight: 600; /* Bolder headers */
          background-color: var(--background-2); /* Subtle header background */
        }
        .td {
          border-bottom: 1px solid var(--border);
          padding: 0.5rem 0.4rem; /* Increased padding slightly */
          white-space: nowrap;
        }
        .th[data-numeric="true"], .td[data-numeric="true"] { /* Added for explicit numeric alignment */
            text-align: right;
        }
        .td.text-right, .th.text-right { /* More general right alignment for numbers */
            text-align: right;
        }
        .td.text-left, .th.text-left {
            text-align: left;
        }
      `}</style>
    </div>
  );
}