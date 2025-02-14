import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

/** 
 * An example interface for a Transaction. 
 * Make sure this matches your backend response shape.
 */
interface Transaction {
  id: number;
  amount: number;
  type: string;       // e.g. "deposit" or "withdraw"
  dateTime: string;   // ISO string from the server
  currency: string;   // e.g. "USD"
}

export default function Settings() {
  const router = useRouter();

  /***********************************
   * SUB-MENU / TAB STATE
   ***********************************/
  const [activeSubMenu, setActiveSubMenu] = useState<"money" | "values">("money");

  /***********************************
   * MONEY MANAGEMENT STATES
   ***********************************/
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().slice(0, 16) // default current date/time (YYYY-MM-DDTHH:mm)
  );
  const [transactionCurrency, setTransactionCurrency] = useState("USD");

  /***********************************
   * LIST OF VALUES STATES
   ***********************************/
  // Instruments
  const [instruments, setInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [editingInstrumentIndex, setEditingInstrumentIndex] = useState<number | null>(null);
  const [editingInstrumentValue, setEditingInstrumentValue] = useState("");

  // Patterns
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [editingPatternIndex, setEditingPatternIndex] = useState<number | null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");

  // Break-Even Range
  const [beRange, setBeRange] = useState({ min: -0.2, max: 0.3 });

  /***********************************
   * LIFECYCLE: FETCH DATA ON MOUNT
   ***********************************/
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Fetch all data when component mounts
    fetchAccountBalance(token);
    fetchTransactionHistory(token);
    fetchSettings(token);
  }, []);

  /***********************************
   * API CALLS
   ***********************************/

  /** Fetch current account balance. */
  const fetchAccountBalance = async (token: string) => {
    try {
      const response = await api.get("/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(response.data.accountBalance ?? 0);
    } catch (err) {
      console.error("Failed to fetch balance.", err);
      setBalance(0);
    }
  };

  /** Fetch transaction history. */
  const fetchTransactionHistory = async (token: string) => {
    try {
      const response = await api.get("/account/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to fetch transaction history.", err);
    }
  };

  /** Fetch settings (instruments, patterns, beMin, beMax). */
  const fetchSettings = async (token: string) => {
    try {
      const response = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Instruments
      setInstruments(
        Array.isArray(response.data.instruments) ? response.data.instruments : []
      );

      // Patterns
      setPatterns(
        Array.isArray(response.data.patterns) ? response.data.patterns : []
      );

      // Break-Even Range
      setBeRange({
        min: response.data.beMin ?? -0.2,
        max: response.data.beMax ?? 0.3,
      });
    } catch (err) {
      console.error("Failed to fetch settings.", err);
    }
  };

  /***********************************
   * MONEY MANAGEMENT HANDLERS
   ***********************************/

  /**
   * Submit a transaction (deposit or withdraw).
   * Also includes date/time and currency (default USD).
   */
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return console.error("No token found.");

    try {
      await api.post(
        "/account/transaction",
        {
          amount: transactionAmount,
          type: transactionType,
          dateTime: transactionDate,   // user-chosen date/time
          currency: transactionCurrency,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh balance and transaction list
      fetchAccountBalance(token);
      fetchTransactionHistory(token);

      // Reset form
      setTransactionAmount(0);
      setTransactionType("deposit");
      setTransactionDate(new Date().toISOString().slice(0, 16));
      setTransactionCurrency("USD");
    } catch (err) {
      console.error("Failed to process transaction.", err);
    }
  };

  /***********************************
   * INSTRUMENTS: ADD, EDIT, DELETE
   ***********************************/
  const handleAddInstrument = async () => {
    if (!newInstrument.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.post(
        "/settings/instruments/add",
        { instrument: newInstrument },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInstruments(res.data.instruments);
      setNewInstrument(""); // Reset input
    } catch (error) {
      console.error("Failed to add instrument:", error);
    }
  };

  const handleDeleteInstrument = async (instrument: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.post(
        "/settings/instruments/delete",
        { instrument },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInstruments(res.data.instruments);
    } catch (error) {
      console.error("Failed to delete instrument:", error);
    }
  };

  const startEditingInstrument = (index: number, currentValue: string) => {
    setEditingInstrumentIndex(index);
    setEditingInstrumentValue(currentValue);
  };

  const cancelEditingInstrument = () => {
    setEditingInstrumentIndex(null);
    setEditingInstrumentValue("");
  };

  const handleUpdateInstrument = async (oldValue: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!editingInstrumentValue.trim()) {
      // If the new value is empty, we can just cancel
      return cancelEditingInstrument();
    }

    try {
      const res = await api.post(
        "/settings/instruments/edit",
        {
          oldInstrument: oldValue,
          newInstrument: editingInstrumentValue,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInstruments(res.data.instruments);
    } catch (error) {
      console.error("Failed to update instrument:", error);
    } finally {
      cancelEditingInstrument();
    }
  };

  /***********************************
   * PATTERNS: ADD, EDIT, DELETE
   ***********************************/
  const handleAddPattern = async () => {
    if (!newPattern.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.post(
        "/settings/patterns/add",
        { pattern: newPattern },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatterns(res.data.patterns);
      setNewPattern("");
    } catch (error) {
      console.error("Failed to add pattern:", error);
    }
  };

  const handleDeletePattern = async (pattern: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.post(
        "/settings/patterns/delete",
        { pattern },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatterns(res.data.patterns);
    } catch (error) {
      console.error("Failed to delete pattern:", error);
    }
  };

  const startEditingPattern = (index: number, currentValue: string) => {
    setEditingPatternIndex(index);
    setEditingPatternValue(currentValue);
  };

  const cancelEditingPattern = () => {
    setEditingPatternIndex(null);
    setEditingPatternValue("");
  };

  const handleUpdatePattern = async (oldValue: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!editingPatternValue.trim()) {
      return cancelEditingPattern();
    }

    try {
      const res = await api.post(
        "/settings/patterns/edit",
        {
          oldPattern: oldValue,
          newPattern: editingPatternValue,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatterns(res.data.patterns);
    } catch (error) {
      console.error("Failed to update pattern:", error);
    } finally {
      cancelEditingPattern();
    }
  };

  /***********************************
   * BREAK-EVEN RANGE UPDATE
   ***********************************/
  const updateBeRange = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.post(
        "/settings/update",
        {
          instruments, // keep current arrays
          patterns,
          beMin: beRange.min,
          beMax: beRange.max,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optionally refetch settings to ensure sync
      fetchSettings(token);
    } catch (err) {
      console.error("Failed to update BE range.", err);
    }
  };

  /***********************************
   * RENDER
   ***********************************/
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      {/* SUB-MENU TABS */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 border rounded ${
            activeSubMenu === "money" ? "bg-blue-200" : ""
          }`}
          onClick={() => setActiveSubMenu("money")}
        >
          Money Management
        </button>
        <button
          className={`px-4 py-2 border rounded ${
            activeSubMenu === "values" ? "bg-blue-200" : ""
          }`}
          onClick={() => setActiveSubMenu("values")}
        >
          List of Values Data
        </button>
      </div>

      {/* MONEY MANAGEMENT SUB-MENU */}
      {activeSubMenu === "money" && (
        <>
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold">Current Balance</h2>
            <p className="text-xl mb-4">
              {balance !== null ? `$${balance.toFixed(2)}` : "Loading..."}
            </p>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              {/* Transaction Type: deposit or withdraw */}
              <div>
                <label className="mr-4">Transaction Type:</label>
                <select
                  value={transactionType}
                  onChange={(e) =>
                    setTransactionType(e.target.value as "deposit" | "withdraw")
                  }
                  className="p-2 border rounded"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block">Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  className="p-2 border rounded w-full"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(Number(e.target.value))}
                  required
                />
              </div>

              {/* Date/Time */}
              <div>
                <label className="block">Date/Time:</label>
                <input
                  type="datetime-local"
                  className="p-2 border rounded w-full"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>

              {/* Currency (disabled for now, default "USD") */}
              <div>
                <label className="block">Currency:</label>
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  value={transactionCurrency}
                  onChange={(e) => setTransactionCurrency(e.target.value)}
                  disabled
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded"
              >
                Submit
              </button>
            </form>
          </div>

          {/* TRANSACTION HISTORY */}
          <div className="mt-6 p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Transaction History</h2>
            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2 text-left">Date/Time</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b">
                      <td className="p-2">
                        {new Date(tx.dateTime).toLocaleString()}
                      </td>
                      <td className="p-2">{tx.type}</td>
                      <td className="p-2">{tx.amount}</td>
                      <td className="p-2">{tx.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* LIST OF VALUES SUB-MENU */}
      {activeSubMenu === "values" && (
        <>
          {/* INSTRUMENTS SECTION */}
          <div className="p-4 border rounded mb-6">
            <h2 className="text-lg font-semibold">Manage Instruments</h2>
            <ul className="mt-2">
              {instruments.map((instrument, idx) => {
                // Check if this instrument is being edited
                if (editingInstrumentIndex === idx) {
                  return (
                    <li key={idx} className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        className="p-2 border rounded"
                        value={editingInstrumentValue}
                        onChange={(e) => setEditingInstrumentValue(e.target.value)}
                      />
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => handleUpdateInstrument(instrument)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-300 px-2 py-1 rounded"
                        onClick={cancelEditingInstrument}
                      >
                        Cancel
                      </button>
                    </li>
                  );
                } else {
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between mt-2"
                    >
                      <span>{instrument}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() =>
                            startEditingInstrument(idx, instrument)
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded"
                          onClick={() => handleDeleteInstrument(instrument)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                }
              })}
            </ul>

            {/* Add New Instrument */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                className="p-2 border rounded w-full"
                placeholder="New Instrument"
                value={newInstrument}
                onChange={(e) => setNewInstrument(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleAddInstrument}
              >
                Add
              </button>
            </div>
          </div>

          {/* PATTERNS SECTION */}
          <div className="p-4 border rounded mb-6">
            <h2 className="text-lg font-semibold">Manage Trade Patterns</h2>
            <ul className="mt-2">
              {patterns.map((pattern, idx) => {
                if (editingPatternIndex === idx) {
                  return (
                    <li key={idx} className="flex items-center space-x-2 mt-2">
                      <input
                        type="text"
                        className="p-2 border rounded"
                        value={editingPatternValue}
                        onChange={(e) => setEditingPatternValue(e.target.value)}
                      />
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => handleUpdatePattern(pattern)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-300 px-2 py-1 rounded"
                        onClick={cancelEditingPattern}
                      >
                        Cancel
                      </button>
                    </li>
                  );
                } else {
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between mt-2"
                    >
                      <span>{pattern}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() => startEditingPattern(idx, pattern)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded"
                          onClick={() => handleDeletePattern(pattern)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                }
              })}
            </ul>

            {/* Add New Pattern */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                className="p-2 border rounded w-full"
                placeholder="New Pattern"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleAddPattern}
              >
                Add
              </button>
            </div>
          </div>

          {/* BREAK-EVEN RANGE */}
          <div className="mt-6 p-4 border rounded">
            <h2 className="text-lg font-semibold">Break-Even Range</h2>
            <div className="flex flex-col gap-2 mt-2">
              <label>Min:</label>
              <input
                type="number"
                className="p-2 border rounded"
                value={beRange.min}
                onChange={(e) =>
                  setBeRange({ ...beRange, min: Number(e.target.value) })
                }
              />
              <label>Max:</label>
              <input
                type="number"
                className="p-2 border rounded"
                value={beRange.max}
                onChange={(e) =>
                  setBeRange({ ...beRange, max: Number(e.target.value) })
                }
              />
            </div>
            <button
              className="w-full mt-4 bg-green-500 text-white py-2 rounded"
              onClick={updateBeRange}
            >
              Save BE Range
            </button>
          </div>
        </>
      )}
    </div>
  );
}
