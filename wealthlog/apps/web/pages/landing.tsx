// pages/landing.tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api } from "@wealthlog/common";

export default function Landing() {
  const router = useRouter();
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // Example of fetching net worth from an endpoint
    // (You’d implement /dashboard or /accounts to compute net worth in your backend.)
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // In a real scenario, you might do:
      // const res = await api.get("/dashboard/overview");
      // setNetWorth(res.data.netWorth);
      // setRecentActivity(res.data.recentActivity);
      // For now, let’s just mock:
      setNetWorth(12345.67);
      setRecentActivity([
        { id: 1, description: "Bought EUR/USD", date: new Date().toISOString() },
        { id: 2, description: "Deposited $500", date: new Date().toISOString() },
      ]);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }

  const handleQuickAction = (path: string) => {
    router.push(path);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Net Worth</h2>
        {netWorth !== null ? (
          <p className="text-2xl">${netWorth.toFixed(2)}</p>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p>No recent activity</p>
          ) : (
            <ul className="list-disc ml-5">
              {recentActivity.map((activity) => (
                <li key={activity.id}>
                  {activity.description} <br />
                  <span className="text-sm text-gray-500">
                    {new Date(activity.date).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => handleQuickAction("/tradeManagement")}
              className="px-4 py-2 bg-[#34A853] text-white rounded font-semibold hover:bg-green-600 transition duration-300"
            >
              Add New Trade
            </button>
            <button
              onClick={() => handleQuickAction("/expenses")}
              className="px-4 py-2 bg-[#FBBC05] text-[#202124] rounded font-semibold hover:bg-orange-400 transition duration-300"
            >
              Add Expense
            </button>
            <button
              onClick={() => handleQuickAction("/accounts")}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition duration-300"
            >
              View Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
