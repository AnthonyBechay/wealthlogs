import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

interface Trade {
  id: number;
  instrument: string;
  session: "London" | "US" | "Other";
  percentage?: number;
  amount?: number;
  fees: number;
  dateTime: string;
  pattern: string;
  direction: "Long" | "Short";
}

export default function Dashboard() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);

  const [newTrade, setNewTrade] = useState({
    instrument: "",
    percentage: 0,
    amount: 0,
    fees: 0,
    dateTime: new Date().toISOString(),
    pattern: "",
    direction: "Long",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchTrades(token);
      fetchAccountBalance(token);
      fetchSettings(token);
    }
  }, []);

  const fetchTrades = async (token: string) => {
    try {
      const response = await api.get("/trades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrades(response.data);
    } catch (err) {
      setError("Failed to load trades.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalance = async (token: string) => {
    try {
      const response = await api.get("/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(response.data.accountBalance ?? 0);
    } catch (err) {
      setError("Failed to fetch balance.");
      setBalance(0);
    }
  };

  const fetchSettings = async (token: string) => {
    try {
      const response = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstruments(response.data.instruments || []);
      setPatterns(response.data.patterns || []);
    } catch (err) {
      console.error("Failed to fetch settings.");
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await api.post("/trades", newTrade, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTrades(token!);
      fetchAccountBalance(token!);
      setNewTrade({
        instrument: "",
        percentage: 0,
        amount: 0,
        fees: 0,
        dateTime: new Date().toISOString(),
        pattern: "",
        direction: "Long",
      });
    } catch (err) {
      setError("Failed to add trade.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">FX Trade Monitor</h1>

      <h2 className="text-lg font-semibold mt-4">
        Account Balance: ${balance !== null ? balance.toFixed(2) : "Loading..."}
      </h2>

      {error && <p className="text-red-500">{error}</p>}

      {/* Add Trade Form */}
      <form onSubmit={handleAddTrade} className="mt-4 p-4 border rounded">
        <h2 className="text-lg font-semibold">Add New Trade</h2>

        <div className="mt-2">
          <label>Instrument:</label>
          <select className="w-full p-2 border rounded" value={newTrade.instrument} onChange={(e) => setNewTrade({ ...newTrade, instrument: e.target.value })} required>
            <option value="">Select Instrument</option>
            {instruments.map((inst, index) => (
              <option key={index} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label>Pattern Used:</label>
          <select className="w-full p-2 border rounded" value={newTrade.pattern} onChange={(e) => setNewTrade({ ...newTrade, pattern: e.target.value })}>
            <option value="">Select Pattern</option>
            {patterns.map((pat, index) => (
              <option key={index} value={pat}>{pat}</option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label>Direction:</label>
          <select className="w-full p-2 border rounded" value={newTrade.direction} onChange={(e) => setNewTrade({ ...newTrade, direction: e.target.value as "Long" | "Short" })}>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        <div className="mt-2">
          <label>Percentage (%):</label>
          <input type="number" className="w-full p-2 border rounded" value={newTrade.percentage} onChange={(e) => setNewTrade({ ...newTrade, percentage: Number(e.target.value) })} />
        </div>

        <div className="mt-2">
          <label>Amount ($):</label>
          <input type="number" className="w-full p-2 border rounded" value={newTrade.amount} onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })} />
        </div>

        <div className="mt-2">
          <label>Fees ($):</label>
          <input type="number" className="w-full p-2 border rounded" value={newTrade.fees} onChange={(e) => setNewTrade({ ...newTrade, fees: Number(e.target.value) })} required />
        </div>

        <div className="mt-2">
          <label>Date:</label>
          <input type="datetime-local" className="w-full p-2 border rounded" value={newTrade.dateTime} onChange={(e) => setNewTrade({ ...newTrade, dateTime: e.target.value })} />
        </div>

        <button type="submit" className="w-full mt-4 bg-blue-500 text-white py-2 rounded">Add Trade</button>
      </form>

      <h2 className="text-lg font-semibold mt-6">Trade History</h2>
      {loading ? <p>Loading trades...</p> : (
        <table className="w-full mt-4 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Instrument</th>
              <th className="border p-2">Direction</th>
              <th className="border p-2">Session</th>
              <th className="border p-2">Percentage</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Fees</th>
              <th className="border p-2">Pattern</th>
              <th className="border p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td className="border p-2">{trade.instrument}</td>
                <td className="border p-2">{trade.direction}</td>
                <td className="border p-2">{trade.session}</td>
                <td className="border p-2">{trade.percentage?.toFixed(2) ?? "N/A"}%</td>
                <td className="border p-2">${trade.amount?.toFixed(2) ?? "N/A"}</td>
                <td className="border p-2">${trade.fees.toFixed(2)}</td>
                <td className="border p-2">{trade.pattern}</td>
                <td className="border p-2">{new Date(trade.dateTime).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
