"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@wealthlog/common";
import Papa from "papaparse";

export const formatToBeirutTime = (dateStringOrObject: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateStringOrObject) return "N/A";
  try {
    const date = new Date(dateStringOrObject);
    const defaultOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut', hour12: true };
    return date.toLocaleString('en-GB', { ...defaultOptions, ...options });
  } catch (e) { return "Invalid Date"; }
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfMonthISO = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const formatCurrency = (value: number | null | undefined) => { if (value == null) return "$ -"; return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`; };
const formatPercentage = (value: number | null | undefined, decimals = 1) => { if (value == null) return "- %"; return `${value.toFixed(decimals)}%`; };

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "N/A";
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  seconds %= 60; minutes %= 60; hours %= 24;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface FXRow {
  id: number; instrument: string; entryDate: string; exitDate?: string | null; tradeDirection: "LONG" | "SHORT";
  lots: number | null; entryPrice: number | null; exitPrice: number | null; stopLossPips: number | null;
  realizedPL: number | null; tradeSpecificPercentageGain: number | null; openingBalance: number | null;
  fees: number; session: string;
}
interface Bucket { key: string; count: number; grossPL: number; avgReturnOnBalance: number; avgTradeSpecificPercentageGain: number; winRate: number; }
interface GlobalStats {
  totalTrades: number; totalRealizedPL: number; winRate: number; avgReturnOnBalance: number; totalFees: number;
  largestWin: number; largestLoss: number; avgHoldingPeriodMs: number;
  totalPnlLong: number; countLong: number; winRateLong: number;
  totalPnlShort: number; countShort: number; winRateShort: number;
}

export default function AdvFilter() {
  const router = useRouter();
  const [rows, setRows] = useState<FXRow[]>([]); const [bks, setBks] = useState<Bucket[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [err, setErr] = useState(""); const [load, setLoad] = useState(false);
  const [acctList, setAcctList] = useState<{ id: number; name: string }[]>([]);
  const [instList, setInstList] = useState<string[]>([]); const [patList, setPatList] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // For pagination
  const [totalPages, setTotalPages] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);


  useEffect(() => {
    setLoad(true);
    (async () => {
      try {
        const acct = await api.get("/account"); setAcctList(acct.data.map((a: any) => ({ id: a.id, name: a.name })));
        const s = await api.get("/tradingSettings"); setInstList(s.data.instruments || []); setPatList(s.data.patterns || []);
        setFrom(startOfMonthISO()); setTo(todayISO());
        await run(undefined, 1, pageSize); // Initial run with page 1 and default pageSize
      } catch (e: any) { setErr(e?.response?.data?.error || "Failed to load initial data."); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // pageSize dependency removed from here, will be handled by run

  const [accountId, setAccountId] = useState<string>(""); const [instr, setInstr] = useState<string>("");
  const [dir, setDir] = useState<"" | "LONG" | "SHORT">(""); const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>(""); const [pattern, setPattern] = useState<string>("");
  const [session, setSession] = useState<string>(""); const [moreOpen, setMoreOpen] = useState(false);
  const [minLots, setMinLots] = useState(""); const [maxLots, setMaxLots] = useState("");
  const [minPct, setMinPct] = useState(""); const [maxPct, setMaxPct] = useState("");
  const [groupBy, setGroupBy] = useState<"instrument" | "direction" | "month" | "session">("instrument");

  async function run(e?: React.FormEvent, page = 1, currentSize = pageSize) {
    e?.preventDefault(); setLoad(true); setErr(""); setCurrentPage(page);
    try {
      const qs = new URLSearchParams({ accountId, instr, dir, from, to, pattern, session, groupBy, minLots, maxLots, minPct, maxPct, page: String(page), size: String(currentSize) });
      const { data } = await api.get(`/tradeFilter?${qs.toString()}`);
      setRows(data.rows || []); setBks(data.buckets || []); setGlobalStats(data.globalStats || null);
      setTotalPages(data.totalPages || 0); setTotalTrades(data.total || 0);
    } catch (error: any) {
      setErr(error?.response?.data?.error || "Failed to fetch filtered trades.");
      setRows([]); setBks([]); setGlobalStats(null); setTotalPages(0); setTotalTrades(0);
    } finally { setLoad(false); }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    run(undefined, 1, newSize); // Go to page 1 when size changes
  };

  const exportCsv = () => { /* ... (keep existing CSV export, update fields if needed) ... */ };
  const exportJson = () => { /* ... (keep existing JSON export) ... */ };

  const mostLosingInstrument = groupBy === 'instrument' && bks.length > 0 ? [...bks].sort((a, b) => a.grossPL - b.grossPL)[0] : null;
  const londonSessionStats = bks.find(b => b.key === "London" && groupBy === "session");
  const usSessionStats = bks.find(b => b.key === "US" && groupBy === "session");

  const bucketHeaders = [{ label: "Key", numeric: false }, { label: "Trades", numeric: true }, { label: "Gross P&L", numeric: true }, { label: "Avg % RoB", numeric: true }, { label: "Avg Trade %", numeric: true }, { label: "Win %", numeric: true }];
  const tradeTableHeaders = ["Date", "Sym", "Dir", "Lots", "Net P&L ($)", "Trade %", "Actual %", "Session", "Entry", "Exit", "Fees", "Hold Time"];


  return (
    <div className="min-h-screen p-4 bg-[var(--background)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-4"> <h1 className="text-2xl font-bold">Advanced FX Filter & Insights</h1> <button onClick={() => router.push("/trading/trading")} className="text-sm underline">← back to trading</button> </div>
      {globalStats && !load && (
        <div className="mb-6 p-4 bg-[var(--background-2)] rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-accent)]">Overall Performance Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Existing cards */}
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Total Net P&L</h3><p className={`text-xl font-bold ${globalStats.totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(globalStats.totalRealizedPL)}</p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Win Rate / Total Trades</h3><p className="text-xl font-bold text-[var(--primary)]">{formatPercentage(globalStats.winRate)}<span className="text-sm font-normal text-[var(--text-muted)]"> ({globalStats.totalTrades} trades)</span></p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Avg. P&L per Trade</h3><p className={`text-xl font-bold ${(globalStats.totalTrades > 0 ? globalStats.totalRealizedPL / globalStats.totalTrades : 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(globalStats.totalTrades > 0 ? globalStats.totalRealizedPL / globalStats.totalTrades : 0)}</p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Avg. Return on Balance</h3><p className={`text-xl font-bold ${globalStats.avgReturnOnBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPercentage(globalStats.avgReturnOnBalance)}</p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Total Fees</h3><p className="text-lg font-semibold text-[var(--text-muted)]">{formatCurrency(globalStats.totalFees)}</p></div>
            {/* New Cards */}
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Largest Winning Trade</h3><p className="text-xl font-bold text-green-500">{formatCurrency(globalStats.largestWin)}</p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Largest Losing Trade</h3><p className="text-xl font-bold text-red-500">{formatCurrency(globalStats.largestLoss)}</p></div>
            <div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Avg. Holding Period</h3><p className="text-lg font-semibold text-[var(--text)]">{formatDuration(globalStats.avgHoldingPeriodMs)}</p></div>

            {globalStats.countLong > 0 && (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">LONG Trades Summary</h3><p className={`text-lg font-bold ${globalStats.totalPnlLong >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(globalStats.totalPnlLong)} P&L</p><p className="text-sm text-[var(--text-muted)]">{formatPercentage(globalStats.winRateLong)} Win Rate ({globalStats.countLong} trades)</p></div>)}
            {globalStats.countShort > 0 && (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">SHORT Trades Summary</h3><p className={`text-lg font-bold ${globalStats.totalPnlShort >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(globalStats.totalPnlShort)} P&L</p><p className="text-sm text-[var(--text-muted)]">{formatPercentage(globalStats.winRateShort)} Win Rate ({globalStats.countShort} trades)</p></div>)}

            {bks.length > 0 && groupBy === 'instrument' && (() => { const sortedByPL = [...bks].sort((a, b) => b.grossPL - a.grossPL); if (sortedByPL.length === 0) return null; const topInstrumentByPL = sortedByPL[0]; return (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Most Profitable Instrument</h3><p className="text-lg font-bold text-[var(--primary)]">{topInstrumentByPL.key} ({formatCurrency(topInstrumentByPL.grossPL)})</p></div>); })()}
            {mostLosingInstrument && (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">Most Losing Instrument</h3><p className="text-lg font-bold text-red-500">{mostLosingInstrument.key} ({formatCurrency(mostLosingInstrument.grossPL)})</p></div>)}
            {londonSessionStats && (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">London P&L / Win Rate</h3><p className={`text-lg font-bold ${londonSessionStats.grossPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(londonSessionStats.grossPL)} ({formatPercentage(londonSessionStats.winRate)})</p></div>)}
            {usSessionStats && (<div className="bg-[var(--background)] p-3 rounded-md shadow-sm"><h3 className="text-xs font-medium text-[var(--text-muted)]">US P&L / Win Rate</h3><p className={`text-lg font-bold ${usSessionStats.grossPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(usSessionStats.grossPL)} ({formatPercentage(usSessionStats.winRate)})</p></div>)}
          </div>
        </div>
      )}
      {load && !globalStats && <p className="text-center my-4">Loading dashboard data...</p>}

      <form onSubmit={(e) => run(e, 1, pageSize)} className="bg-[var(--background-2)] p-4 rounded-lg grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">All accounts</option>{acctList.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}</select>
        <select className="input" value={instr} onChange={(e) => setInstr(e.target.value)}><option value="">All instruments</option>{instList.map((i) => (<option key={i} value={i}>{i}</option>))}</select>
        <select className="input" value={dir} onChange={(e) => setDir(e.target.value as any)}><option value="">Direction</option><option value="LONG">LONG</option><option value="SHORT">SHORT</option></select>
        <div className="flex gap-2 col-span-full md:col-span-1 xl:col-span-1"><input type="date" className="input flex-1" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="input flex-1" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <select className="input" value={pattern} onChange={(e) => setPattern(e.target.value)}><option value="">All patterns</option>{patList.map((p) => (<option key={p} value={p}>{p}</option>))}</select>
        <select className="input" value={session} onChange={(e) => setSession(e.target.value)}><option value="">All Sessions</option><option value="London">London</option><option value="US">US</option><option value="Off-hours">Off-hours</option></select>
        <select className="input col-span-full md:col-span-1 xl:col-span-1" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}><option value="instrument">Group by instrument</option><option value="direction">Group by direction</option><option value="month">Group by month</option><option value="session">Group by session</option></select>
        {/* Placeholder for alignment on some screen sizes or add another filter */}
        <div className="hidden xl:block"></div>

        <div className="flex gap-2 col-span-full items-center">
          <button type="button" onClick={() => { setFrom(startOfMonthISO()); setTo(todayISO()); }} className="btn-sm">This month</button>
          <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="btn-sm">Any date</button>
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className="btn-sm">{moreOpen ? "− Less" : "+ More"}</button>
          <button className="btn primary ml-auto" disabled={load}>{load ? "Running…" : "Run"}</button>
        </div>
        {moreOpen && (<>
          <input className="input" placeholder="Min lots" value={minLots} onChange={(e) => setMinLots(e.target.value)} />
          <input className="input" placeholder="Max lots" value={maxLots} onChange={(e) => setMaxLots(e.target.value)} />
          <input className="input" placeholder="Min Trade % Gain" value={minPct} onChange={(e) => setMinPct(e.target.value)} />
          <input className="input" placeholder="Max Trade % Gain" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} />
        </>)}
      </form>

      {err && <p className="text-red-500 mt-4 p-3 bg-red-100 rounded">{err}</p>}

      {(rows.length > 0 || bks.length > 0) && !load && (<>
        <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-3 items-center">
          <div className="flex gap-3">
            <button onClick={exportCsv} className="btn">CSV</button>
            <button onClick={exportJson} className="btn">JSON</button>
          </div>
          <div className="flex items-center gap-2 ml-0 sm:ml-auto mt-2 sm:mt-0">
            <span className="text-sm text-[var(--text-muted)]">Show:</span>
            <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="input text-sm py-1">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
            </select>
            <span className="text-sm text-[var(--text-muted)]">
              Page {currentPage} of {totalPages}. (Total: {totalTrades} trades)
            </span>
          </div>
        </div>

        {bks.length > 0 && (<div className="overflow-x-auto mb-6"> <h3 className="text-lg font-semibold mb-2">Grouped Analysis by: <span className="capitalize text-[var(--primary)]">{groupBy}</span></h3> <table className="w-full border-collapse text-sm"><thead><tr>{bucketHeaders.map((h) => (<th key={h.label} className={`th ${h.numeric ? 'text-right' : 'text-left'}`}>{h.label}</th>))}</tr></thead><tbody>{bks.map((b) => (<tr key={b.key}><td className="td text-left">{b.key}</td><td className="td text-right">{b.count}</td><td className={`td text-right ${b.grossPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(b.grossPL)}</td><td className={`td text-right ${b.avgReturnOnBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(b.avgReturnOnBalance)}</td><td className="td text-right">{formatPercentage(b.avgTradeSpecificPercentageGain)}</td><td className="td text-right">{formatPercentage(b.winRate)}</td></tr>))}</tbody></table></div>)}
        {rows.length > 0 && (<div className="overflow-x-auto"> <h3 className="text-lg font-semibold mb-2">Trade Details</h3> <table className="w-full border-collapse text-xs md:text-sm"><thead><tr>{tradeTableHeaders.map((h) => (<th key={h} className={`th ${["Lots", "Net P&L ($)", "Trade %", "Actual %", "Entry", "Exit", "Fees"].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>))}</tr></thead><tbody>{rows.map((r) => { const actualPercentageGain = r.openingBalance && r.openingBalance > 0 && r.realizedPL != null ? (r.realizedPL / r.openingBalance) * 100 : null; const holdingTime = formatDuration(r.entryDate && r.exitDate ? new Date(r.exitDate).getTime() - new Date(r.entryDate).getTime() : null); return (<tr key={r.id}><td className="td">{formatToBeirutTime(r.entryDate)}</td><td className="td">{r.instrument}</td><td className="td">{r.tradeDirection}</td><td className="td text-right">{r.lots ?? "-"}</td><td className={`td text-right ${r.realizedPL == null ? '' : r.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(r.realizedPL)}</td><td className="td text-right">{r.tradeSpecificPercentageGain != null ? formatPercentage(r.tradeSpecificPercentageGain * 100, 2) : "-"}</td><td className={`td text-right ${actualPercentageGain == null ? '' : actualPercentageGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>{actualPercentageGain != null ? formatPercentage(actualPercentageGain, 2) : "N/A"}</td><td className="td">{r.session}</td><td className="td text-right">{r.entryPrice ?? "-"}</td><td className="td text-right">{r.exitPrice ?? "-"}</td><td className="td text-right">{formatCurrency(r.fees)}</td><td className="td">{holdingTime}</td></tr>); })}</tbody></table></div>)}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button onClick={() => run(undefined, Math.max(1, currentPage - 1), pageSize)} disabled={currentPage <= 1 || load} className="btn-sm">Previous</button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <button onClick={() => run(undefined, Math.min(totalPages, currentPage + 1), pageSize)} disabled={currentPage >= totalPages || load} className="btn-sm">Next</button>
          </div>
        )}
      </>)}
      {load && (rows.length > 0 || bks.length > 0) && <p className="text-center my-4">Updating results...</p>}
      {!load && !err && rows.length === 0 && bks.length === 0 && globalStats && globalStats.totalTrades === 0 && (<p className="text-center my-6 text-gray-500">No trades found matching your current filter criteria.</p>)}
      <style jsx>{`.input { padding: 0.45rem; border-radius: 0.25rem; background: var(--background); border: 1px solid var(--border); color: var(--text); } .input::placeholder { color: var(--text-muted); opacity: 0.7; } .btn { padding: 0.5rem 1rem; background: var(--primary); color: #fff; border-radius: 0.25rem; opacity: 1; transition: opacity 0.2s ease-in-out; } .btn:disabled { opacity: 0.6; cursor: not-allowed; } .btn-sm { padding: 0.35rem 0.75rem; background: var(--background-2); border: 1px solid var(--border); color: var(--text); border-radius: 0.25rem; font-size: 0.875rem; } .btn.primary { background: var(--primary); color: #fff; } .th { border-bottom: 1px solid var(--border); padding: 0.5rem 0.4rem; white-space: nowrap; font-weight: 600; background-color: var(--background-2); } .td { border-bottom: 1px solid var(--border); padding: 0.5rem 0.4rem; white-space: nowrap; } .td.text-right, .th.text-right { text-align: right; } .td.text-left, .th.text-left { text-align: left; }`}</style>
    </div>
  );
}
