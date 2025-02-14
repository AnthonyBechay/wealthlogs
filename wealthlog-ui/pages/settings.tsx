import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

/** Represents a money transaction (deposit/withdraw) */
interface Transaction {
  id: number;
  amount: number;
  type: "deposit" | "withdraw";
  dateTime: string;  // ISO string from the server
  currency: string;  // e.g. "USD"
}

export default function Settings() {
  const router = useRouter();

  /********************************************************
   * SUB-MENU (TABS) STATE
   ********************************************************/
  const [activeSubMenu, setActiveSubMenu] = useState<"money" | "values">("money");

  /********************************************************
   * MONEY MANAGEMENT STATES
   ********************************************************/
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Use a string so the field can start blank and accept partial input
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().slice(0, 16) // e.g. "YYYY-MM-DDTHH:mm"
  );
  const [transactionCurrency, setTransactionCurrency] = useState("USD");

  /********************************************************
   * LIST OF VALUES: INSTRUMENTS & PATTERNS
   ********************************************************/
  const [instruments, setInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [editingInstrumentIndex, setEditingInstrumentIndex] = useState<number | null>(null);
  const [editingInstrumentValue, setEditingInstrumentValue] = useState("");

  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [editingPatternIndex, setEditingPatternIndex] = useState<number | null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");

  /********************************************************
   * BREAK-EVEN RANGE (store as strings to allow negative sign)
   ********************************************************/
  const [beMin, setBeMin] = useState<string>("-0.2");
  const [beMax, setBeMax] = useState<string>("0.3");

  /********************************************************
   * FETCH DATA ON MOUNT
   ********************************************************/
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Fetch everything needed
    fetchAccountBalance(token);
    fetchTransactionHistory(token);
    fetchSettings(token);
  }, []);

  /********************************************************
   * API CALLS
   ********************************************************/

  // 1) Fetch account balance
  const fetchAccountBalance = async (token: string) => {
    try {
      const response = await api.get("/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(response.data.accountBalance ?? 0);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setBalance(0);
    }
  };

  // 2) Fetch transaction history
  const fetchTransactionHistory = async (token: string) => {
    try {
      const response = await api.get("/account/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  // 3) Fetch settings (instruments, patterns, beMin, beMax)
  const fetchSettings = async (token: string) => {
    try {
      const response = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // The response should have: { instruments, patterns, beMin, beMax }
      setInstruments(response.data.instruments || []);
      setPatterns(response.data.patterns || []);

      // Convert the numeric beMin/beMax from server to strings so user can type freely
      setBeMin(String(response.data.beMin ?? -0.2));
      setBeMax(String(response.data.beMax ?? 0.3));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  /********************************************************
   * MONEY MANAGEMENT HANDLERS
   ********************************************************/
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return console.error("No token found.");

    const amountNum = Number(transactionAmount);
    // Validate that it's > 0
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter an amount greater than 0.");
      return;
    }

    try {
      await api.post(
        "/account/transaction",
        {
          amount: amountNum,
          type: transactionType,
          dateTime: transactionDate,
          currency: transactionCurrency
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh data
      fetchAccountBalance(token);
      fetchTransactionHistory(token);

      // Reset form
      setTransactionAmount("");
      setTransactionType("deposit");
      setTransactionDate(new Date().toISOString().slice(0, 16));
      setTransactionCurrency("USD");
    } catch (err) {
      console.error("Failed to process transaction:", err);
    }
  };

  /********************************************************
   * INSTRUMENTS: ADD, EDIT, DELETE
   ********************************************************/
  const handleAddInstrument = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!newInstrument.trim()) return;

    try {
      const res = await api.post(
        "/settings/instruments/add",
        { instrument: newInstrument },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInstruments(res.data.instruments);
      setNewInstrument("");
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
      cancelEditingInstrument();
      return;
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

  /********************************************************
   * PATTERNS: ADD, EDIT, DELETE
   ********************************************************/
  const handleAddPattern = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!newPattern.trim()) return;

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
      cancelEditingPattern();
      return;
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

  /********************************************************
   * UPDATE BREAK-EVEN RANGE (ONLY beMin / beMax)
   ********************************************************/
  const updateBeRange = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Parse the strings to numbers
    const minNum = parseFloat(beMin);
    const maxNum = parseFloat(beMax);

    // Validate both are numbers
    if (isNaN(minNum) || isNaN(maxNum)) {
      alert("Invalid numeric input for Break-Even Range.");
      return;
    }

    // Validate beMin < beMax
    if (minNum >= maxNum) {
      alert("Minimum BE must be less than Maximum BE.");
      return;
    }

    try {
      // Calls the dedicated route to ONLY update beMin / beMax
      await api.post(
        "/settings/beRange/update",
        {
          beMin: minNum,
          beMax: maxNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refetch to ensure UI sync
      fetchSettings(token);
      console.log("BE range updated successfully");
    } catch (err) {
      console.error("Failed to update BE range.", err);
    }
  };

  /********************************************************
   * RENDER
   ********************************************************/
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

      {/* MONEY MANAGEMENT TAB */}
      {activeSubMenu === "money" && (
        <>
          {/* Current Balance */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold">Current Balance</h2>
            <p className="text-xl mb-4">
              {balance !== null ? `$${balance.toFixed(2)}` : "Loading..."}
            </p>

            {/* Deposit/Withdraw Form */}
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              {/* Transaction Type */}
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

              {/* Amount (no initial "0") */}
              <div>
                <label className="block">Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  className="p-2 border rounded w-full"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="e.g. 100.00"
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

              {/* Currency (disabled) */}
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

          {/* Transaction History */}
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

      {/* LIST OF VALUES TAB */}
      {activeSubMenu === "values" && (
        <>
          {/* INSTRUMENTS SECTION */}
          <div className="p-4 border rounded mb-6">
            <h2 className="text-lg font-semibold">Manage Instruments</h2>
            <ul className="mt-2">
              {instruments.map((inst, idx) => {
                if (editingInstrumentIndex === idx) {
                  // Editing mode
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
                        onClick={() => handleUpdateInstrument(inst)}
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
                  // View mode
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between mt-2"
                    >
                      <span>{inst}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() => startEditingInstrument(idx, inst)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded"
                          onClick={() => handleDeleteInstrument(inst)}
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
              {patterns.map((pat, idx) => {
                if (editingPatternIndex === idx) {
                  // Editing mode
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
                        onClick={() => handleUpdatePattern(pat)}
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
                  // View mode
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between mt-2"
                    >
                      <span>{pat}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() => startEditingPattern(idx, pat)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded"
                          onClick={() => handleDeletePattern(pat)}
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

          {/* BREAK-EVEN RANGE SECTION */}
          <div className="mt-6 p-4 border rounded">
            <h2 className="text-lg font-semibold">Break-Even Range</h2>

            <label>Min:</label>
            {/*
              Use type="number" but store as string in state 
              so partial negative inputs ("-") are possible.
            */}
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded"
              value={beMin}
              onChange={(e) => setBeMin(e.target.value)}
            />

            <label>Max:</label>
            <input
              type="number"
              step="any"
              className="w-full p-2 border rounded mt-2"
              value={beMax}
              onChange={(e) => setBeMax(e.target.value)}
            />

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
