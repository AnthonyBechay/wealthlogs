import { useState, useMemo } from "react";
import useSWR from "swr";
import Head from "next/head";
import { api } from "@wealthlog/common";

interface A { asset:string; qty:number; price:number; value:number; pct24h:number }
interface W { assets:A[]; totals:{ valueUsd:number; valueBtc:number } }
interface R { all:W; spot:W; earn:W; funding:W; futures:W }

const fetcher = (u:string)=>api.get<R>(u).then(r=>r.data);
const TABS    = ["all","spot","earn","funding","futures"] as const;

export default function BinancePage() {
  const { data, error } = useSWR("/binance/balances", fetcher, { refreshInterval:60000 });
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ]     = useState("");

  /* ensure hooks count always identical */
  const wallet : W = data ? data[tab]
                          : { assets:[], totals:{ valueUsd:0, valueBtc:0 } };

  const list = useMemo(() => wallet.assets
      .filter(a => a.asset.toLowerCase().includes(q.toLowerCase()))
      .sort((a,b) => b.value - a.value), [wallet, q]);

  /* ─── render ───────────────────────── */
  return (
    <>
      <Head><title>Binance Portfolio</title></Head>

      {/* error / loading banners – shown above dashboard */}
      {error && <p className="p-4 text-center text-red-600 bg-red-50">Failed to load Binance balances</p>}
      {!data && !error && <p className="p-4 text-center">Loading&nbsp;…</p>}

      <div className="min-h-screen p-4" style={{ background:"var(--background)", color:"var(--text)" }}>
        <header className="max-w-6xl mx-auto mb-6">
          <h1 className="text-2xl font-semibold">Total Value</h1>
          <p className="text-4xl font-bold">
            ${data ? data.all.totals.valueUsd.toLocaleString() : 0}
            {data && (
              <span className="ml-2 text-base opacity-70">
                ≈ {data.all.totals.valueBtc.toFixed(4)} BTC
              </span>
            )}
          </p>
        </header>

        {/* tabs */}
        <nav className="max-w-6xl mx-auto flex gap-2 mb-3">
          {TABS.map(x => (
            <button key={x} onClick={()=>setTab(x)}
              className={`px-4 py-1.5 rounded-full text-sm ${tab===x?"text-white":"opacity-70"}`}
              style={{ background: tab===x ? "var(--primary)" : "var(--background-2)" }}>
              {x.charAt(0).toUpperCase()+x.slice(1)}
            </button>
          ))}
        </nav>

        {/* filter */}
        <div className="max-w-6xl mx-auto mb-4">
          <input aria-label="Filter assets"
            placeholder="Filter assets…"
            className="w-full p-2 rounded border"
            style={{ background:"var(--background-2)", borderColor:"var(--background-2)" }}
            value={q} onChange={e=>setQ(e.target.value)} />
        </div>

        {/* bucket total card */}
<div className="max-w-6xl mx-auto mb-4 p-3 rounded-xl shadow flex justify-between"
     style={{ background: "var(--background-2)" }}>
  <span className="font-medium">{tab.toUpperCase()}</span>
  <span>
    ${wallet.totals.valueUsd.toLocaleString()} &nbsp;
    <span className="opacity-70 text-xs">
      (≈ {wallet.totals.valueBtc.toFixed(4)} BTC)
    </span>
  </span>
</div>


        {/* grid */}
        <section className="max-w-6xl mx-auto grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0
            ? <p className="opacity-60 col-span-full text-center">No assets here</p>
            : list.map(a => (
                <div key={a.asset} className="p-4 rounded-xl shadow flex flex-col gap-1"
                     style={{ background:"var(--background-2)" }}>
                  <div className="flex justify-between">
                    <span>{a.asset}</span>
                    <span className="text-xs px-1 rounded text-white"
                          style={{ background: a.pct24h >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {a.pct24h >= 0 ? "+" : ""}{a.pct24h.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-lg font-semibold">${a.value.toLocaleString()}</span>
                  <span className="text-xs opacity-70">
                    {a.qty.toLocaleString()} × ${a.price.toLocaleString(undefined,{ maximumFractionDigits:2 })}
                  </span>
                </div>
              ))}
        </section>
      </div>
    </>
  );
}
