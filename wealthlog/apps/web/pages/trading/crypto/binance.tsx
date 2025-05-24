/* apps/web/pages/binance.tsx */
import { useMemo } from "react";
import useSWR from "swr";
import { api } from "@wealthlog/common";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

/*────────────────── helpers ──────────────────*/
interface Asset {
  asset: string;
  qty: number;
  price: number;
  value: number;
  pct24h: number;
}
interface ApiResp {
  totals: { valueUsd: number; valueBtc: number };
  assets: Asset[];
}

const fetcher = (url: string) => api.get<ApiResp>(url).then((r) => r.data);

/*────────────────── component ──────────────────*/
export default function BinancePage() {
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR("/binance/assets", fetcher, {
    refreshInterval: 60_000, // auto-refresh every minute
  });

  const totalUsd = data?.totals.valueUsd ?? 0;
  const totalBtc = data?.totals.valueBtc ?? 0;

  const positive = totalUsd >= 0;

  /* derived stats */
  const dayChange = useMemo(() => {
    if (!data) return 0;
    const yesterday = data.assets.reduce(
      (s, a) => s + a.value / (1 + a.pct24h / 100),
      0
    );
    return ((totalUsd - yesterday) / yesterday) * 100;
  }, [data, totalUsd]);

  return (
    <>
      <Head>
        <title>{t("binance:title", "Binance Portfolio")}</title>
      </Head>

      <main className="max-w-4xl mx-auto p-4">
        {/* TOTALS */}
        <section
          className="rounded-2xl shadow-md p-6 mb-6 bg-white dark:bg-zinc-800
                     flex flex-col md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              {t("binance:totalValue", "Total value")}
            </h1>
            <div className="text-3xl font-bold tracking-tight">
              ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500">
              ≈ {totalBtc.toFixed(4)} BTC
            </div>
          </div>

          <div
            className={`mt-4 md:mt-0 text-lg font-medium ${
              positive ? "text-green-600" : "text-red-500"
            }`}
          >
            {dayChange >= 0 && "+"}
            {dayChange.toFixed(2)}%
            <span className="ml-1 text-sm text-gray-500">
              {t("binance:change24h", "past 24 h")}
            </span>
          </div>
        </section>

        {/* ASSET GRID */}
        {isLoading && (
          <p className="text-center">{t("common:loading", "Loading…")}</p>
        )}
        {error && (
          <p className="text-center text-red-500">
            {t("common:error", "Something went wrong")}
          </p>
        )}

        {data && (
          <section
            className="grid gap-4
                       sm:grid-cols-2
                       md:grid-cols-3
                       lg:grid-cols-4"
          >
            {data.assets
              .sort((a, b) => b.value - a.value)
              .map((a) => (
                <article
                  key={a.asset}
                  className="rounded-xl shadow-sm p-4 bg-white dark:bg-zinc-900
                             flex flex-col justify-between"
                >
                  <header className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold">{a.asset}</h2>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.pct24h >= 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                      style={{ minWidth: "3.5rem", textAlign: "center" }}
                    >
                      {a.pct24h >= 0 && "+"}
                      {a.pct24h.toFixed(1)}%
                    </span>
                  </header>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-lg font-bold tracking-tight">
                      ${a.value.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {a.qty.toLocaleString()} {a.asset} × $
                      {a.price.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </article>
              ))}
          </section>
        )}
      </main>
    </>
  );
}

/*─────────── i18n SSR ───────────*/
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
