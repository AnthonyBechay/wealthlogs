import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

/** Represents a server-side trade structure, now with possible fxTrade fields. */
interface FxTrade {
  id?: number;
  entryPrice?: number;
  exitPrice?: number;
  lots?: number;
  pipsGain?: number;
}

interface Trade {
  id: number;
  instrument: string;
  tradeType: "FX"; // always "FX" in this module
  tradeDirection: "LONG" | "SHORT";
  fees: number;
  entryDate: string; // ISO
  exitDate?: string;
  amount?: number;
  pattern?: string;
  notes?: string;
  percentage?: number;
  fxTrade?: FxTrade;
}

interface FinancialAccount {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

export default function TradeManagement() {
  const router = useRouter();

  // List of user's FX accounts
  const [fxAccounts, setFxAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Data for trades, instruments, patterns
  const [trades, setTrades] = useState<Trade[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);

  // Page controls
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);

  // New FX trade form
  const [newTrade, setNewTrade] = useState({
    instrument: "",
    percentage: 0,
    amount: 0,
    fees: 0,
    dateTime: new Date().toISOString(),
    pattern: "",
    direction: "Long" as "Long" | "Short",
    // extra FX fields
    entryPrice: 0,
    exitPrice: 0,
    lots: 1,
    pipsGain: 0,
  });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadFxAccounts(token);
    fetchSettings(token);
  }, [router]);

  // 1) Load all user accounts of type "FX" or "FX_COMMODITY"
  const loadFxAccounts = async (token: string) => {
    try {
      const res = await api.get("/financial-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAccts: FinancialAccount[] = res.data;
      // Filter only the FX accounts
      const fx = allAccts.filter(a => a.accountType === "FX" || a.accountType === "FX_COMMODITY");
      setFxAccounts(fx);

      // If exactly one, auto-select
      if (fx.length === 1) {
        setSelectedAccountId(fx[0].id);
        await loadTradesForAccount(token, fx[0].id);
      }
    } catch (err) {
      setError("Failed to load FX accounts.");
    } finally {
      setLoading(false);
    }
  };

  // 2) Load trades for selected account
  const loadTradesForAccount = async (token: string, accountId: number) => {
    try {
      const res = await api.get(`/trades?accountId=${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrades(res.data || []);
    } catch (err) {
      setError("Failed to load trades.");
    }
  };

  // 3) Load user settings for instruments & patterns
  const fetchSettings = async (token: string) => {
    try {
      const res = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstruments(res.data.instruments || []);
      setPatterns(res.data.patterns || []);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  // When user picks an account from the dropdown or button list
  const handleSelectAccount = async (acctId: number) => {
    setSelectedAccountId(acctId);
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    await loadTradesForAccount(token, acctId);
    setLoading(false);
  };

  // ============ ADD TRADE ============
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError("No FX account selected.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Compose the body with both basic fields & FX fields
      const body = {
        instrument: newTrade.instrument,
        amount: Number(newTrade.amount),
        fees: Number(newTrade.fees),
        dateTime: newTrade.dateTime,
        pattern: newTrade.pattern,
        direction: newTrade.direction, // "Long"|"Short"
        accountId: selectedAccountId,
        percentage: newTrade.percentage,

        // FX details
        entryPrice: Number(newTrade.entryPrice),
        exitPrice: Number(newTrade.exitPrice),
        lots: Number(newTrade.lots),
        pipsGain: Number(newTrade.pipsGain),
      };

      await api.post("/trades", body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // refresh
      await loadTradesForAccount(token, selectedAccountId);

      // reset form
      setNewTrade({
        instrument: "",
        percentage: 0,
        amount: 0,
        fees: 0,
        dateTime: new Date().toISOString(),
        pattern: "",
        direction: "Long",
        entryPrice: 0,
        exitPrice: 0,
        lots: 1,
        pipsGain: 0,
      });
    } catch (err) {
      setError("Failed to add FX trade.");
    }
  };

  // ============ EDIT TRADE ============
  const openEditModal = (trade: Trade) => {
    setEditingTrade(trade);
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    setEditingTrade(null);
    setShowEditModal(false);
  };
  const handleEditTrade = async () => {
    if (!editingTrade || !selectedAccountId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // We'll gather the updated fields for the server
      const body = {
        instrument: editingTrade.instrument,
        amount: editingTrade.amount ?? 0,
        fees: editingTrade.fees,
        dateTime: editingTrade.entryDate,
        pattern: editingTrade.pattern ?? "",
        direction: editingTrade.tradeDirection === "LONG" ? "Long" : "Short",
        percentage: editingTrade.percentage ?? 0,

        // fxTrade fields
        entryPrice: editingTrade.fxTrade?.entryPrice ?? 0,
        exitPrice: editingTrade.fxTrade?.exitPrice ?? 0,
        lots: editingTrade.fxTrade?.lots ?? 1,
        pipsGain: editingTrade.fxTrade?.pipsGain ?? 0,
      };

      await api.put(`/trades/${editingTrade.id}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTradesForAccount(token, selectedAccountId);
      closeEditModal();
    } catch (err) {
      setError("Failed to update FX trade.");
    }
  };

  // ============ DELETE TRADE ============
  const handleDeleteTrade = async (tradeId: number) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    if (!selectedAccountId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.delete(`/trades/${tradeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTradesForAccount(token, selectedAccountId);
    } catch (err) {
      setError("Failed to delete trade.");
    }
  };

  // ============ PAGINATION ============
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };
  const paginatedTrades = trades.slice(0, pageSize);

  // ============ RENDER ============
  if (loading) {
    return <p className="p-4">Loading accounts...</p>;
  }

  // If user has no FX accounts
  if (fxAccounts.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">FX Trade Management</h1>
        <p>No FX accounts found. Please create one from your landing page or account creation page.</p>
      </div>
    );
  }

  // If multiple accounts, but none selected yet
  if (fxAccounts.length > 1 && !selectedAccountId) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Select an FX Account</h1>
        {fxAccounts.map(acc => (
          <button
            key={acc.id}
            className="block w-full text-left py-2 px-4 bg-gray-200 my-2 rounded"
            onClick={() => handleSelectAccount(acc.id)}
          >
            {acc.name} | Bal: {acc.balance} {acc.currency}
          </button>
        ))}
      </div>
    );
  }

  // Otherwise show the normal trade UI for selected account
  const currentAcct = fxAccounts.find(a => a.id === selectedAccountId);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">FX Trade Management</h1>

      {fxAccounts.length > 1 && currentAcct && (
        <div className="my-4">
          <label className="font-semibold mr-2">Current Account:</label>
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => handleSelectAccount(Number(e.target.value))}
            className="p-2 border rounded"
          >
            <option value="">--Select--</option>
            {fxAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.balance} {acc.currency})
              </option>
            ))}
          </select>
        </div>
      )}

      {currentAcct && (
        <p className="mb-2">
          <span className="font-semibold">Selected Account:</span>{" "}
          {currentAcct.name} | Balance: {currentAcct.balance} {currentAcct.currency}
        </p>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {/* Add new FX trade form */}
      <form onSubmit={handleAddTrade} className="mt-4 p-4 border rounded">
        <h2 className="text-lg font-semibold">Add New FX Trade</h2>

        {/* Instrument (from instruments array) */}
        <div className="mt-2">
          <label className="block">Instrument:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.instrument}
            onChange={(e) => setNewTrade({ ...newTrade, instrument: e.target.value })}
            required
          >
            <option value="">--Select Instrument--</option>
            {instruments.map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Pattern (from patterns array) */}
        <div className="mt-2">
          <label className="block">Pattern:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.pattern}
            onChange={(e) => setNewTrade({ ...newTrade, pattern: e.target.value })}
          >
            <option value="">(Optional)</option>
            {patterns.map(pat => (
              <option key={pat} value={pat}>{pat}</option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div className="mt-2">
          <label className="block">Direction:</label>
          <select
            className="w-full p-2 border rounded"
            value={newTrade.direction}
            onChange={(e) => setNewTrade({ ...newTrade, direction: e.target.value as "Long"|"Short" })}
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
        </div>

        {/* Percentage */}
        <div className="mt-2">
          <label className="block">Percentage (%):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newTrade.percentage}
            onChange={(e) => setNewTrade({ ...newTrade, percentage: Number(e.target.value) })}
          />
        </div>

        {/* Amount */}
        <div className="mt-2">
          <label className="block">Amount ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newTrade.amount}
            onChange={(e) => setNewTrade({ ...newTrade, amount: Number(e.target.value) })}
          />
        </div>

        {/* FX fields */}
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="block">Entry Price:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={newTrade.entryPrice}
              onChange={(e) => setNewTrade({ ...newTrade, entryPrice: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <label className="block">Exit Price (optional):</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={newTrade.exitPrice}
              onChange={(e) => setNewTrade({ ...newTrade, exitPrice: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="block">Lots:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={newTrade.lots}
              onChange={(e) => setNewTrade({ ...newTrade, lots: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <label className="block">Pips Gain (optional):</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={newTrade.pipsGain}
              onChange={(e) => setNewTrade({ ...newTrade, pipsGain: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Fees */}
        <div className="mt-2">
          <label className="block">Fees ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newTrade.fees}
            onChange={(e) => setNewTrade({ ...newTrade, fees: Number(e.target.value) })}
            required
          />
        </div>

        {/* DateTime */}
        <div className="mt-2">
          <label className="block">Trade Date/Time:</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={new Date(newTrade.dateTime).toISOString().slice(0,16)}
            onChange={(e) => setNewTrade({ ...newTrade, dateTime: new Date(e.target.value).toISOString() })}
          />
        </div>

        <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded">
          Add Trade
        </button>
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
          type="button"
          className="ml-auto bg-blue-300 text-black px-4 py-2 rounded"
          onClick={() => router.push("/tradeAdvancedFilter")}
        >
          View Advanced Filter
        </button>
      </div>

      {/* Trade History */}
      <h2 className="text-lg font-semibold mt-4">
        Trade History (showing {pageSize})
      </h2>
      {trades.length === 0 ? (
        <p className="mt-2">No trades found for this account.</p>
      ) : (
        <table className="w-full mt-4 border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Date/Time</th>
              <th className="border p-2">Instrument</th>
              <th className="border p-2">Dir</th>
              <th className="border p-2">EntryPx</th>
              <th className="border p-2">ExitPx</th>
              <th className="border p-2">Lots</th>
              <th className="border p-2">Pips</th>
              <th className="border p-2">Fees</th>
              <th className="border p-2">%</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Pattern</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map(t => (
              <tr key={t.id}>
                <td className="border p-2">
                  {new Date(t.entryDate).toLocaleString()}
                </td>
                <td className="border p-2">{t.instrument}</td>
                <td className="border p-2">{t.tradeDirection}</td>
                <td className="border p-2">{t.fxTrade?.entryPrice ?? 0}</td>
                <td className="border p-2">{t.fxTrade?.exitPrice ?? 0}</td>
                <td className="border p-2">{t.fxTrade?.lots ?? 0}</td>
                <td className="border p-2">{t.fxTrade?.pipsGain ?? 0}</td>
                <td className="border p-2">${t.fees.toFixed(2)}</td>
                <td className="border p-2">{t.percentage ? t.percentage.toFixed(2)+"%" : "0%"}</td>
                <td className="border p-2">{t.amount ? `$${t.amount.toFixed(2)}` : "$0.00"}</td>
                <td className="border p-2">{t.pattern}</td>
                <td className="border p-2">
                  <button
                    className="bg-yellow-400 text-black px-3 py-1 rounded mr-2"
                    onClick={() => openEditModal(t)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={() => handleDeleteTrade(t.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showEditModal && editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          onClose={closeEditModal}
          onSave={handleEditTrade}
          setTrade={setEditingTrade}
        />
      )}
    </div>
  );
}

/**
 * A subcomponent for editing an existing FX trade (including basic + fx fields).
 */
function EditTradeModal({
  trade,
  onClose,
  onSave,
  setTrade,
}: {
  trade: Trade;
  onClose: () => void;
  onSave: () => void;
  setTrade: React.Dispatch<React.SetStateAction<Trade|null>>;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Edit FX Trade ID: {trade.id}</h2>

        <div className="mt-2">
          <label className="block">Instrument:</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={trade.instrument}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, instrument: e.target.value }))
            }
            required
          />
        </div>

        <div className="mt-2">
          <label className="block">Direction:</label>
          <select
            className="w-full p-2 border rounded"
            value={trade.tradeDirection}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, tradeDirection: e.target.value as "LONG"|"SHORT" }))
            }
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </div>

        {/* FX fields */}
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="block">Entry Price:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={trade.fxTrade?.entryPrice ?? 0}
              onChange={(e) =>
                setTrade(t => t && ({
                  ...t,
                  fxTrade: {
                    ...t.fxTrade,
                    entryPrice: Number(e.target.value)
                  }
                }))
              }
            />
          </div>
          <div className="flex-1">
            <label className="block">Exit Price:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={trade.fxTrade?.exitPrice ?? 0}
              onChange={(e) =>
                setTrade(t => t && ({
                  ...t,
                  fxTrade: {
                    ...t.fxTrade,
                    exitPrice: Number(e.target.value)
                  }
                }))
              }
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <label className="block">Lots:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={trade.fxTrade?.lots ?? 1}
              onChange={(e) =>
                setTrade(t => t && ({
                  ...t,
                  fxTrade: {
                    ...t.fxTrade,
                    lots: Number(e.target.value)
                  }
                }))
              }
            />
          </div>
          <div className="flex-1">
            <label className="block">Pips Gain:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={trade.fxTrade?.pipsGain ?? 0}
              onChange={(e) =>
                setTrade(t => t && ({
                  ...t,
                  fxTrade: {
                    ...t.fxTrade,
                    pipsGain: Number(e.target.value)
                  }
                }))
              }
            />
          </div>
        </div>

        {/* Fees, dateTime, pattern, percentage, amount */}
        <div className="mt-2">
          <label className="block">Fees ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={trade.fees}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, fees: Number(e.target.value) }))
            }
          />
        </div>
        <div className="mt-2">
          <label className="block">Trade Date/Time:</label>
          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            value={new Date(trade.entryDate).toISOString().slice(0,16)}
            onChange={(e) =>
              setTrade(t => t && ({
                ...t,
                entryDate: new Date(e.target.value).toISOString()
              }))
            }
          />
        </div>
        <div className="mt-2">
          <label className="block">Percentage (%):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={trade.percentage ?? 0}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, percentage: Number(e.target.value) }))
            }
          />
        </div>
        <div className="mt-2">
          <label className="block">Amount ($):</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={trade.amount ?? 0}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, amount: Number(e.target.value) }))
            }
          />
        </div>
        <div className="mt-2">
          <label className="block">Pattern:</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={trade.pattern ?? ""}
            onChange={(e) =>
              setTrade(t => t && ({ ...t, pattern: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={onSave}
          >
            Save
          </button>
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
