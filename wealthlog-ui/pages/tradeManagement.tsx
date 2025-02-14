import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

/** Represents a trade from the server */
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

/**
 * This page handles:
 * - Listing trades (with pagination: 10, 20, or 50).
 * - Adding new trades (possibly backdated).
 * - Editing trades (inline or popup).
 * - Deleting trades.
 * - Shows updated balance after each operation.
 */
export default function TradeManagement() {
  const router = useRouter();

  // States
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  // We'll store instruments and patterns for the dropdown
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);

  // For pagination: how many trades to show at once (10, 20, or 50)
  const [pageSize, setPageSize] = useState<number>(10);

  // Edit state: if not null, we're editing this trade
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // New trade form state
  const [newTrade, setNewTrade] = useState({
    instrument: "",
    percentage: 0,
    amount: 0,
    fees: 0,
    dateTime: new Date().toISOString(), // default to now
    pattern: "",
    direction: "Long" as "Long" | "Short",
  });

  // On mount, check token and load data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchAllData(token);
    }
  }, []);

  /** Fetch trades, balance, instruments, patterns in parallel or sequence. */
  const fetchAllData = async (token: string) => {
    try {
      await Promise.all([
        fetchTrades(token),
        fetchAccountBalance(token),
        fetchSettings(token),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch trades from server */
  const fetchTrades = async (token: string) => {
    try {
      const response = await api.get("/trades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrades(response.data);
    } catch (err) {
      setError("Failed to load trades.");
    }
  };

  /** Fetch user’s account balance */
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

  /** Fetch instruments/patterns from settings */
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

  /** Add a new trade (which may be backdated) */
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Server will insert trade, then recalc entire history
      await api.post("/trades", newTrade, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Re-fetch updated trades and balance
      await fetchTrades(token);
      await fetchAccountBalance(token);

      // Reset form
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

  /** Edit an existing trade */
  const handleEditTrade = async () => {
    if (!editingTrade) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // PUT /trades/:id
      await api.put(`/trades/${editingTrade.id}`, editingTrade, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditingTrade(null);
      // After editing, server re-calculates entire chain
      await fetchTrades(token);
      await fetchAccountBalance(token);
    } catch (err) {
      setError("Failed to update trade.");
    }
  };

  /** Delete a trade */
  const handleDeleteTrade = async (tradeId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // DELETE /trades/:id
      await api.delete(`/trades/${tradeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Re-fetch updated data
      await fetchTrades(token);
      await fetchAccountBalance(token);
    } catch (err) {
      setError("Failed to delete trade.");
    }
  };

  /** When user changes pageSize (10,20,50) */
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
  };

  /** We'll slice trades for pagination */
  const paginatedTrades = trades.slice(0, pageSize);

  /** A helper to show the "Trade Amount" in the list, derived from % or direct. 
   *  Typically, you'd need the "previous balance" to know how much a % equals in $,
   *  but for demonstration, let's show one of these:
   *  - If percentage != 0: "Derived from previous balance" 
   *  - If amount != 0: Show "amount"
   */
  const getTradeDisplayAmount = (trade: Trade) => {
    if (trade.percentage && trade.percentage !== 0) {
      return "(% based)"; 
      // Real logic: you'd need to know the *previous balance* at the time of this trade.
    }
    if (trade.amount !== undefined) {
      return `$${trade.amount.toFixed(2)}`;
    }
    return "$0.00";
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Trade Management</h1>

      <h2 className="text-lg font-semibold mt-4">
        Account Balance: {balance !== null ? `$${balance.toFixed(2)}` : "Loading..."}
      </h2>

      {error && <p className="text-red-500">{error}</p>}

      {/* ====== Add Trade Form ====== */}
      <form onSubmit={handleAddTrade} className="mt-4 p-4 border rounded">
        <h2 className="text-lg font-semibold">Add New Trade</h2>

        <div className="mt-2">
          <label>Instrument:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.instrument}
            onChange={(e) => setNewTrade({ ...newTrade, instrument: e.target.value })}
            required
          >
            <option value="">Select Instrument</option>
            {instruments.map((inst, index) => (
              <option key={index} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label>Pattern Used:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.pattern}
            onChange={(e) => setNewTrade({ ...newTrade, pattern: e.target.value })}
          >
            <option value="">Select Pattern</option>
            {patterns.map((pat, index) => (
              <option key={index} value={pat}>
                {pat}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2">
          <label>Direction:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.direction}
            onChange={(e) =>
              setNewTrade({ ...newTrade, direction: e.target.value as "Long" | "Short" })
            }
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        <div className="mt-2">
          <label>Percentage (%):</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border rounded"
            value={newTrade.percentage}
            onChange={(e) => setNewTrade({ ...newTrade, percentage: Number(e.target.value) })}
          />
        </div>

        <div className="mt-2">
          <label>Amount ($):</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border rounded"
            value={newTrade.amount}
            onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })}
          />
        </div>

        <div className="mt-2">
          <label>Fees ($):</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border rounded"
            value={newTrade.fees}
            onChange={(e) => setNewTrade({ ...newTrade, fees: Number(e.target.value) })}
            required
          />
        </div>

        {/* dateTime field (backdate if needed) */}
        <div className="mt-2">
          <label>Trade Date/Time:</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={new Date(newTrade.dateTime).toISOString().slice(0, 16)}
            onChange={(e) =>
              setNewTrade({ ...newTrade, dateTime: new Date(e.target.value).toISOString() })
            }
          />
        </div>

        <button type="submit" className="w-full mt-4 bg-blue-500 text-white py-2 rounded">
          Add Trade
        </button>
      </form>

      {/* ====== Editing a Trade (inline or modal) ====== */}
      {editingTrade && (
        <div className="mt-4 p-4 border rounded bg-gray-100">
          <h2 className="text-lg font-semibold">Editing Trade ID: {editingTrade.id}</h2>

          {/* We can reuse the same fields for editing */}
          <div className="mt-2">
            <label>Instrument:</label>
            <select
              className="w-full p-2 border rounded"
              value={editingTrade.instrument}
              onChange={(e) =>
                setEditingTrade({ ...editingTrade, instrument: e.target.value })
              }
            >
              <option value="">Select Instrument</option>
              {instruments.map((inst, index) => (
                <option key={index} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <label>Pattern Used:</label>
            <select
              className="w-full p-2 border rounded"
              value={editingTrade.pattern}
              onChange={(e) =>
                setEditingTrade({ ...editingTrade, pattern: e.target.value })
              }
            >
              <option value="">Select Pattern</option>
              {patterns.map((pat, index) => (
                <option key={index} value={pat}>
                  {pat}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2">
            <label>Direction:</label>
            <select
              className="w-full p-2 border rounded"
              value={editingTrade.direction}
              onChange={(e) =>
                setEditingTrade({
                  ...editingTrade,
                  direction: e.target.value as "Long" | "Short",
                })
              }
            >
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>

          <div className="mt-2">
            <label>Percentage (%):</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={editingTrade.percentage || 0}
              onChange={(e) =>
                setEditingTrade({
                  ...editingTrade,
                  percentage: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="mt-2">
            <label>Amount ($):</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={editingTrade.amount || 0}
              onChange={(e) =>
                setEditingTrade({
                  ...editingTrade,
                  amount: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="mt-2">
            <label>Fees ($):</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={editingTrade.fees}
              onChange={(e) =>
                setEditingTrade({
                  ...editingTrade,
                  fees: Number(e.target.value),
                })
              }
            />
          </div>

          {/* dateTime for backdating */}
          <div className="mt-2">
            <label>Trade Date/Time:</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              value={new Date(editingTrade.dateTime).toISOString().slice(0, 16)}
              onChange={(e) =>
                setEditingTrade({
                  ...editingTrade,
                  dateTime: new Date(e.target.value).toISOString(),
                })
              }
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={handleEditTrade}
            >
              Save Changes
            </button>
            <button
              className="bg-gray-300 px-4 py-2 rounded"
              onClick={() => setEditingTrade(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ====== Controls for Pagination ====== */}
      <div className="mt-6 flex items-center gap-2">
        <label>Show</label>
        <select value={pageSize} onChange={handlePageSizeChange} className="p-2 border rounded">
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <label>trades</label>

        {/* Link to advanced filter page */}
        <button
          className="ml-auto bg-blue-300 text-black px-4 py-2 rounded"
          onClick={() => router.push("/trade-advanced-filter")}
        >
          View Advanced Filter
        </button>
      </div>

      {/* ====== Trade History Table ====== */}
      <h2 className="text-lg font-semibold mt-4">Trade History (showing {pageSize})</h2>
      {loading ? (
        <p>Loading trades...</p>
      ) : (
        <table className="w-full mt-4 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Date/Time</th>
              <th className="border p-2">Instrument</th>
              <th className="border p-2">Direction</th>
              <th className="border p-2">Session</th>
              <th className="border p-2">Pattern</th>
              <th className="border p-2">Fees</th>
              <th className="border p-2">%</th>
              <th className="border p-2">Trade Amount</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade) => (
              <tr key={trade.id}>
                <td className="border p-2">
                  {new Date(trade.dateTime).toLocaleString()}
                </td>
                <td className="border p-2">{trade.instrument}</td>
                <td className="border p-2">{trade.direction}</td>
                <td className="border p-2">{trade.session}</td>
                <td className="border p-2">{trade.pattern}</td>
                <td className="border p-2">${trade.fees.toFixed(2)}</td>
                <td className="border p-2">
                  {trade.percentage ? `${trade.percentage.toFixed(2)}%` : "0%"}
                </td>
                {/* Show a "Trade Amount" column, derived or direct */}
                <td className="border p-2">{getTradeDisplayAmount(trade)}</td>
                <td className="border p-2">
                  <button
                    className="mr-2 text-blue-600"
                    onClick={() => setEditingTrade(trade)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600"
                    onClick={() => handleDeleteTrade(trade.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
