// =============================================
// apps/web/pages/landing.tsx  (FIXED with optimizations)
// =============================================
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { api } from "@wealthlog/common";

import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

// Chart components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Types for better type safety
type RangeType = "30d" | "90d" | "365d" | "ytd" | "all";

interface ChartPoint {
  date: string;
  value: number;
}

interface SummaryData {
  global?: number;
  fx?: number;
  liquid?: number;
  illiquid?: number;
}

/* ——— StatCard with animations and trend indicators ——— */
function StatCard({
  title,
  value,
  previousValue,
  currency = true,
  loading = false,
}: {
  title: string;
  value: number | null;
  previousValue?: number | null;
  currency?: boolean;
  loading?: boolean;
}) {
  // Memoized trend calculation for performance optimization
  const trend = useMemo(() => {
    if (!value || !previousValue) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return {
      percentage: Math.abs(change),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 0.01,
    };
  }, [value, previousValue]);

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 bg-[var(--background-2)] hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
      {/* Header with title and trend indicator */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium opacity-70 whitespace-nowrap">
          {title}
        </h3>
        {/* Display trend indicator if applicable */}
        {trend && !trend.isNeutral && (
          <span className={`text-xs flex items-center gap-1 ${
            trend.isPositive ? 'text-emerald-500' : 'text-red-500'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            {trend.percentage.toFixed(1)}%
          </span>
        )}
      </div>
      
      {/* Value with loading state and null value handling */}
      {loading ? (
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      ) : value === null ? (
        <span className="text-2xl font-semibold opacity-40">—</span>
      ) : (
        <span className="text-2xl font-semibold text-emerald-500 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
          {currency ? "$" : ""}
          {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

/* ——— Reusable button component with different variants ——— */
function ActionButton({
  onClick,
  variant = "primary",
  children,
  className = "",
  disabled = false,
}: {
  onClick: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "accent";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  // Style definitions for each variant
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300",
    secondary: "bg-amber-400 text-slate-900 hover:bg-amber-500 disabled:bg-amber-200",
    tertiary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400",
    accent: "bg-slate-700 text-white hover:bg-slate-800 disabled:bg-slate-500",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ——— Enhanced time range selector ——— */
function RangeSelector({ 
  range, 
  onRangeChange,
  loading = false 
}: { 
  range: RangeType;
  onRangeChange: (range: RangeType) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation("common");
  const ranges: RangeType[] = ["30d", "90d", "365d", "ytd", "all"];

  return (
    <div className="flex gap-1 flex-wrap bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onRangeChange(r)}
          disabled={loading}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 min-w-[3rem] disabled:opacity-50 ${
            range === r
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          }`}
        >
          {t(r)}
        </button>
      ))}
    </div>
  );
}

/* ——— Custom hook for performance data ——— */
function usePerformanceData(range: RangeType) {
  // Fetch net worth data with SWR
  const { data: netWorthData, isLoading: netWorthLoading, error: netWorthError } = useSWR(
    `networth:${range}`,
    () => api.get(`/dashboard/networth?range=${range}`).then((r) => r.data),
    {
      refreshInterval: 30000, // Auto refresh every 30s
      revalidateOnFocus: true,
    }
  );

  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSWR(
    "networth:summary",
    () => api.get("/dashboard/networth/summary").then((r) => r.data),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  // Transform data for chart visualization
  const chartData: ChartPoint[] = useMemo(
    () =>
      netWorthData
        ? Object.entries(netWorthData).map(([date, value]) => ({
            date: new Date(date).toLocaleDateString(),
            value: Number(value),
          }))
        : [],
    [netWorthData]
  );

  // Extract latest data point
  const latestPoint: number | null = chartData.length ? chartData[chartData.length - 1]?.value ?? null : null;
  
  // Calculate change from previous point
  const previousPoint: number | null = chartData.length > 1 ? chartData[chartData.length - 2]?.value ?? null : null;

  return {
    chartData,
    latestPoint,
    previousPoint,
    summaryData: summaryData as SummaryData | undefined,
    isLoading: netWorthLoading || summaryLoading,
    error: netWorthError || summaryError,
  };
}

// ——— MAIN COMPONENT ———
export default function Landing() {
  const { t } = useTranslation("common");
  const router = useRouter();

  // State for selected time range
  const [range, setRange] = useState<RangeType>("30d");
  const { chartData, latestPoint, previousPoint, summaryData, isLoading, error } = usePerformanceData(range);

  // Memoized navigation handlers for performance optimization
  const navigation = useMemo(() => ({
    trading: () => router.push("/trading"),
    expenses: () => router.push("/expenses"),
    accounts: () => router.push("/accounts"),
    addAccount: () => router.push("/accounts/add"),
  }), [router]);

  // Error handling with appropriate UI
  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">{t("ErrorLoadingData")}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t("PleaseTryAgain")}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            {t("Reload")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8 bg-[var(--background)] dark:text-[var(--text)]">
      {/* Header row with title and action buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          {hsanbarre}
          {/* Loading indicator */}
          {isLoading && (
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          )}
        </h1>

        {/* Responsive action buttons */}
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={navigation.trading} variant="primary">
            {t("AddNewTrade")}
          </ActionButton>
          <ActionButton onClick={navigation.expenses} variant="secondary">
            {t("AddExpense")}
          </ActionButton>
          <ActionButton onClick={navigation.accounts} variant="tertiary">
            {t("ViewAccounts")}
          </ActionButton>
          <ActionButton 
            onClick={navigation.addAccount} 
            variant="accent"
            className="hidden md:inline-flex"
          >
            {t("AddAccount")}
          </ActionButton>
        </div>
      </div>

      {/* Enhanced and responsive statistics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={t("GlobalNetWorth")} 
          value={summaryData?.global ?? null}
          loading={isLoading}
        />
        <StatCard 
          title={t("FXNetWorth")} 
          value={summaryData?.fx ?? null}
          loading={isLoading}
        />
        <StatCard 
          title={t("LiquidNetWorth")} 
          value={summaryData?.liquid ?? null}
          loading={isLoading}
        />
        <StatCard 
          title={t("IlliquidNetWorth")} 
          value={summaryData?.illiquid ?? null}
          loading={isLoading}
        />
      </div>

      {/* Enhanced trend chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 bg-[var(--background-2)]">
        {/* Chart header with range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">{t("NetWorthTrend")}</h2>
          <RangeSelector 
            range={range} 
            onRangeChange={setRange}
            loading={isLoading}
          />
        </div>

        {/* Chart content with empty and loading state handling */}
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center">
            {isLoading ? (
              <>
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-500">{t("LoadingData")}</p>
              </>
            ) : (
              <>
                <div className="text-6xl opacity-20 mb-3">📈</div>
                <p className="text-slate-500">{t("NoDataAvailable")}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Main chart with gradient and enhanced styling */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  {/* Gradient definition for area fill */}
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  {/* X-axis configuration */}
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--text)=" }}
                    interval="preserveStartEnd"
                  />
                  {/* Y-axis configuration with value formatting */}
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--text)" }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  {/* Custom tooltip with adaptive styling */}
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "var(--background-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelFormatter={(label) => `Date: ${label}`} 
                    formatter={(value: number) => [
                      `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 
                      t("NetWorth")
                    ]} 
                  />
                  {/* Chart area with gradient and interactions */}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                    dot={false}
                    activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Performance summary with change calculations */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              {/* Current value */}
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-1">{t("CurrentValue")}</p>
                <p className="text-2xl font-semibold text-emerald-500 dark:text-emerald-400">
                  ${latestPoint?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}
                </p>
              </div>
              
              {/* Period change with percentage calculations */}
              {latestPoint && previousPoint && (
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-1">{t("PeriodChange")}</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const change = latestPoint - previousPoint;
                      const changePercent = (change / previousPoint) * 100;
                      const isPositive = change > 0;
                      
                      return (
                        <>
                          <span className={`text-xl font-semibold ${
                            isPositive ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {isPositive ? '+' : ''}${change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-sm ${
                            isPositive ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Function for static props with i18n support
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}