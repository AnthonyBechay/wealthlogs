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
  amountGain: number | null;
  percentageGain: number | null;
  fees: number;
}
interface Bucket {
  key: string;
  count: number;
  grossPL: number;
  avgPct: number;
  winRate: number;
}

export default function AdvFilter() {
  const router = useRouter();
  const [rows, setRows] = useState<FXRow[]>([]);
  const [bks, setBks] = useState<Bucket[]>([]);
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
        minPct,
        maxPct,
        instr,         // we’ll use “instr” param to filter by instrument name
      });
      const { data } = await api.get(`/tradeFilter?${qs.toString()}`);
      setRows(data.rows);
      setBks(data.buckets);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "failed");
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

  return (
    <div className="min-h-screen p-4 bg-[var(--background)] text-[var(--text)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Advanced FX Filter</h1>
        <button onClick={() => router.push("/trading")} className="text-sm underline">
          ← back
        </button>
      </div>

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

          {/* rows */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr>
                  {[
                    "Date",
                    "Sym",
                    "Dir",
                    "Lots",
                    "$",
                    "%",
                    "Entry",
                    "Exit",
                    "SL",
                    "Pips",
                  ].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      {new Date(r.entryDate).toLocaleString()}
                    </td>
                    <td className="td">{r.instrument}</td>
                    <td className="td">{r.tradeDirection}</td>
                    <td className="td">{r.lots ?? "-"}</td>
                    <td className="td">{r.amountGain?.toFixed(2) ?? "-"}</td>
                    <td className="td">
                      {r.percentageGain?.toFixed(2) ?? "-"}%
                    </td>
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
