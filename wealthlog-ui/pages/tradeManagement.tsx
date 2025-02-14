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
  dateTime: string;  // stored as ISO string
  pattern: string;
  direction: "Long" | "Short";
}

export default function TradeManagement() {
  const router = useRouter();

  // General states
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  // For drop-downs
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);

  // Page size (pagination in front-end for now)
  const [pageSize, setPageSize] = useState<number>(10);

  // For editing in a modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // New trade form
  const [newTrade, setNewTrade] = useState({
    instrument: "",
    percentage: 0,
    amount: 0,
    fees: 0,
    dateTime: new Date().toISOString(),
    pattern: "",
    direction: "Long" as "Long" | "Short",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchAllData(token);
    }
  }, []);

  const fetchAllData = async (token: string) => {
    try {
      // load trades, balance, settings
      await Promise.all([fetchTrades(token), fetchAccountBalance(token), fetchSettings(token)]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  // ===================== ADD TRADE ======================
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.post("/trades", newTrade, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTrades(token);
      await fetchAccountBalance(token);

      // reset form
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

  // ===================== EDIT TRADE ======================
  const openEditModal = (trade: Trade) => {
    setEditingTrade(trade);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingTrade(null);
    setShowEditModal(false);
  };

  /** Called when user clicks "Save Changes" in the edit modal */
  const handleEditTrade = async () => {
    if (!editingTrade) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // PUT request
      await api.put(`/trades/${editingTrade.id}`, editingTrade, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTrades(token);
      await fetchAccountBalance(token);

      closeEditModal();
    } catch (err) {
      setError("Failed to update trade.");
    }
  };

  // ===================== DELETE TRADE ======================
  const handleDeleteTrade = async (tradeId: number) => {
    // optionally confirm
    if (!confirm("Are you sure you want to delete this trade?")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.delete(`/trades/${tradeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchTrades(token);
      await fetchAccountBalance(token);
    } catch (err) {
      setError("Failed to delete trade.");
    }
  };

  // ===================== PAGINATION ======================
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  const paginatedTrades = trades.slice(0, pageSize);

  // ===================== RENDER ======================
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Trade Management</h1>

      <h2 className="text-lg font-semibold mt-4">
        Account Balance: {balance !== null ? `$${balance.toFixed(2)}` : "Loading..."}
      </h2>

      {error && <p className="text-red-500">{error}</p>}

      {/* Add Trade Form */}
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
            {instruments.map((inst) => (
              <option key={inst} value={inst}>
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
            {patterns.map((pat) => (
              <option key={pat} value={pat}>
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
            className="w-full p-2 border rounded"
            value={newTrade.percentage}
            onChange={(e) => setNewTrade({ ...newTrade, percentage: Number(e.target.value) })}
          />
        </div>

        <div className="mt-2">
          <label>Amount ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newTrade.amount}
            onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })}
          />
        </div>

        <div className="mt-2">
          <label>Fees ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newTrade.fees}
            onChange={(e) => setNewTrade({ ...newTrade, fees: Number(e.target.value) })}
            required
          />
        </div>

        <div className="mt-2">
          <label>Trade Date/Time:</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            // We slice to remove seconds detail: "YYYY-MM-DDTHH:MM"
            value={new Date(newTrade.dateTime).toISOString().slice(0, 16)}
            onChange={(e) =>
              setNewTrade({ ...newTrade, dateTime: new Date(e.target.value).toISOString() })
            }
          />
        </div>

        <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded">Add Trade</button>
      </form>

      {/* Pagination + Advanced Filter */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label>Show</label>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="p-2 border rounded"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <label>trades</label>
        </div>
        <button
          className="ml-auto bg-blue-300 text-black px-4 py-2 rounded"
          onClick={() => router.push("/trade-advanced-filter")}
        >
          View Advanced Filter
        </button>
      </div>

      {/* Trade History Table */}
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
              <th className="border p-2">Fees</th>
              <th className="border p-2">%</th>
              <th className="border p-2">Amount</th>
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
                <td className="border p-2">${trade.fees.toFixed(2)}</td>
                <td className="border p-2">
                  {trade.percentage ? `${trade.percentage.toFixed(2)}%` : "0%"}
                </td>
                <td className="border p-2">
                  {trade.amount ? `$${trade.amount.toFixed(2)}` : "$0.00"}
                </td>
                <td className="border p-2">
                  <button
                    className="bg-yellow-400 text-black px-3 py-1 rounded mr-2"
                    onClick={() => openEditModal(trade)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
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

      {/* EDIT MODAL */}
      {showEditModal && editingTrade && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md relative">
            <h2 className="text-lg font-semibold mb-4">Edit Trade ID: {editingTrade.id}</h2>

            {/* Instrument */}
            <div className="mt-2">
              <label>Instrument:</label>
              <select
                className="w-full p-2 border rounded"
                value={editingTrade.instrument}
                onChange={(e) =>
                  setEditingTrade({ ...editingTrade, instrument: e.target.value })
                }
                required
              >
                <option value="">Select Instrument</option>
                {instruments.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            {/* Pattern */}
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
                {patterns.map((pat) => (
                  <option key={pat} value={pat}>
                    {pat}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
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

            {/* Percentage */}
            <div className="mt-2">
              <label>Percentage (%):</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={editingTrade.percentage ?? 0}
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    percentage: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Amount */}
            <div className="mt-2">
              <label>Amount ($):</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={editingTrade.amount ?? 0}
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    amount: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Fees */}
            <div className="mt-2">
              <label>Fees ($):</label>
              <input
                type="number"
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

            {/* dateTime */}
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

            {/* Buttons */}
            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={handleEditTrade}
              >
                Save
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={closeEditModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
