import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

interface FinancialAccount {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

export default function Landing() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchAccounts(token);
    }
  }, [router]);

  const fetchAccounts = async (token: string) => {
    try {
      const response = await api.get("/financial-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(response.data);
    } catch (err) {
      setError("Failed to fetch financial accounts.");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.post(
        "/financial-accounts",
        {
          name: newAccountName,
          accountType: "FX_COMMODITY", // or "FX" if your enum is named that
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewAccountName("");
      await fetchAccounts(token);
    } catch (err) {
      setError("Failed to create financial account.");
    }
  };

  const handleClickTradeManagement = () => {
    // router.push("/tradeManagement");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to WealthLog</h1>

      <p>Below are the modules available.</p>

      <div className="mt-4 flex flex-col gap-3" style={{ maxWidth: "300px" }}>
        {/* FX Trade Management is clickable */}
        <button
          onClick={handleClickTradeManagement}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          FX Trade Management
        </button>

        {/* Other modules are disabled */}
        <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded" disabled>
          Stocks (coming soon)
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded" disabled>
          Real Estate (coming soon)
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded" disabled>
          Loans (coming soon)
        </button>
        <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded" disabled>
          Expenses (coming soon)
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Your Financial Accounts</h2>
        {error && <p className="text-red-500">{error}</p>}

        <ul className="mt-2 list-disc ml-4">
          {accounts.map((acc) => (
            <li key={acc.id}>
              {acc.name} ({acc.accountType}) — Balance: {acc.balance} {acc.currency}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 p-4 border rounded max-w-sm">
        <h2 className="font-semibold">Create a New Financial Account (FX)</h2>
        <form onSubmit={handleCreateAccount} className="mt-2">
          <label className="block">Account Name:</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="e.g. MyForexAccount"
          />
          <button type="submit" className="mt-2 bg-blue-600 text-white py-2 px-4 rounded">
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
