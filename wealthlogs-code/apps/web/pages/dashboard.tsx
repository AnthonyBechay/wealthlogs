// pages/dashboard.tsx
// Main Dashboard Page - Cleaned and Optimized

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../src/contexts/AuthContext";
import { DashboardService } from "../src/services/api-service";
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

// Types
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

// Stat Card Component
function StatCard({
  title,
  value,
  currency = true,
  loading = false,
}: {
  title: string;
  value: number | null;
  currency?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>
      {loading ? (
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : value === null ? (
        <span className="text-2xl font-semibold text-gray-400">—</span>
      ) : (
        <span className="text-2xl font-semibold text-gray-900 dark:text-white">
          {currency ? "$" : ""}
          {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

// Range Selector Component
function RangeSelector({ 
  range, 
  onRangeChange,
  loading = false 
}: { 
  range: RangeType;
  onRangeChange: (range: RangeType) => void;
  loading?: boolean;
}) {
  const ranges: RangeType[] = ["30d", "90d", "365d", "ytd", "all"];
  
  const rangeLabels = {
    "30d": "30 Days",
    "90d": "90 Days",
    "365d": "1 Year",
    "ytd": "YTD",
    "all": "All Time"
  };

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onRangeChange(r)}
          disabled={loading}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
            range === r
              ? "bg-blue-500 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {rangeLabels[r]}
        </button>
      ))}
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [range, setRange] = useState<RangeType>("30d");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [netWorthData, summary] = await Promise.all([
        DashboardService.getDashboardData(),
        DashboardService.getDashboardSummary()
      ]);

      // Transform net worth data for chart
      if (netWorthData) {
        const points: ChartPoint[] = Object.entries(netWorthData).map(([date, value]) => ({
          date: new Date(date).toLocaleDateString(),
          value: Number(value),
        }));
        setChartData(points);
      }

      // Set summary data
      if (summary) {
        setSummaryData(summary);
      }
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Fetch data on mount and range change
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading, range, fetchDashboardData]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Navigation handlers
  const navigation = {
    trading: () => router.push("/trading/trading"),
    expenses: () => router.push("/expenses"),
    accounts: () => router.push("/accounts"),
    realEstate: () => router.push("/RealEstate"),
  };

  // Loading state
  if (authLoading || (loading && chartData.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={fetchDashboardData} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's your financial overview
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={navigation.trading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Trade
            </button>
            <button
              onClick={navigation.expenses}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Add Expense
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Net Worth" 
            value={summaryData?.global ?? null}
            loading={loading}
          />
          <StatCard 
            title="Liquid Assets" 
            value={summaryData?.liquid ?? null}
            loading={loading}
          />
          <StatCard 
            title="Illiquid Assets" 
            value={summaryData?.illiquid ?? null}
            loading={loading}
          />
          <StatCard 
            title="FX Holdings" 
            value={summaryData?.fx ?? null}
            loading={loading}
          />
        </div>

        {/* Chart Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Net Worth Trend
            </h2>
            <RangeSelector 
              range={range} 
              onRangeChange={setRange}
              loading={loading}
            />
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                No data available for the selected period
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Net Worth"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={navigation.accounts}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Accounts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your accounts</p>
              </div>
              <span className="text-2xl">💼</span>
            </div>
          </button>
          
          <button
            onClick={navigation.trading}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Trading</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">View trades & positions</p>
              </div>
              <span className="text-2xl">📈</span>
            </div>
          </button>
          
          <button
            onClick={navigation.realEstate}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Real Estate</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Property portfolio</p>
              </div>
              <span className="text-2xl">🏠</span>
            </div>
          </button>
          
          <button
            onClick={navigation.expenses}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Expenses</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track spending</p>
              </div>
              <span className="text-2xl">💳</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
