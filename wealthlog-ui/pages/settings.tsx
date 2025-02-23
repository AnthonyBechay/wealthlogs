import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

/** Represents a user's financial account */
interface Account {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

/** Represents a transaction row */
interface Transaction {
  id: number;
  type: "DEPOSIT" | "WITHDRAW" | "TRANSFER";
  amount: number;
  dateTime: string;  // ISO from server
  currency: string;
  fromAccountId?: number;
  toAccountId?: number;
}

export default function Settings() {
  const router = useRouter();

  // Which tab: "money" or "values"
  const [activeTab, setActiveTab] = useState<"money" | "values">("money");

  /********************************************************
   * ACCOUNTS & TRANSACTIONS
   ********************************************************/
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // For new transaction
  const [transactionType, setTransactionType] = useState<"DEPOSIT"|"WITHDRAW"|"TRANSFER">("DEPOSIT");
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<number | null>(null);
  const [selectedToAccountId, setSelectedToAccountId] = useState<number | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0,16)); // "YYYY-MM-DDTHH:mm"

  /********************************************************
   * INSTRUMENTS & PATTERNS
   ********************************************************/
  const [instruments, setInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  const [editingInstrumentIndex, setEditingInstrumentIndex] = useState<number|null>(null);
  const [editingInstrumentValue, setEditingInstrumentValue] = useState("");

  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [editingPatternIndex, setEditingPatternIndex] = useState<number|null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");

  /********************************************************
   * BE Range
   ********************************************************/
  const [beMin, setBeMin] = useState("-0.2");
  const [beMax, setBeMax] = useState("0.3");

  useEffect(() => {
    // On mount, check token or redirect
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // fetch all data
    fetchAllData(token);
  }, [router]);

  const fetchAllData = async (token: string) => {
    try {
      await Promise.all([
        fetchAccounts(token),
        fetchTransactions(token),
        fetchSettings(token)
      ]);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  /********************************************************
   * Fetch Accounts
   ********************************************************/
  const fetchAccounts = async (token: string) => {
    try {
      const res = await api.get("/financial-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userAccounts: Account[] = res.data;
      setAccounts(userAccounts);
      // Default from/to accounts
      if (userAccounts.length > 0) {
        setSelectedFromAccountId(userAccounts[0].id);
        setSelectedToAccountId(userAccounts[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  /********************************************************
   * Fetch Transactions
   ********************************************************/
  const fetchTransactions = async (token: string) => {
    try {
      const res = await api.get("/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  /********************************************************
   * Fetch Settings (instruments, patterns, beMin, beMax)
   ********************************************************/
  const fetchSettings = async (token: string) => {
    try {
      const res = await api.get("/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstruments(res.data.instruments || []);
      setPatterns(res.data.patterns || []);
      setBeMin(String(res.data.beMin ?? -0.2));
      setBeMax(String(res.data.beMax ?? 0.3));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  /********************************************************
   * CREATE A TRANSACTION
   ********************************************************/
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    const amt = parseFloat(transactionAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Amount must be > 0");
      return;
    }

    // We store them uppercase in DB: "DEPOSIT","WITHDRAW","TRANSFER"
    const payload: any = {
      type: transactionType,
      amount: amt,
      dateTime: transactionDate,
      currency: "USD"
    };

    if (transactionType === "DEPOSIT") {
      if (!selectedToAccountId) {
        alert("Select an account to deposit into");
        return;
      }
      payload.toAccountId = selectedToAccountId;
    } else if (transactionType === "WITHDRAW") {
      if (!selectedFromAccountId) {
        alert("Select an account to withdraw from");
        return;
      }
      payload.fromAccountId = selectedFromAccountId;
    } else {
      // TRANSFER
      if (!selectedFromAccountId || !selectedToAccountId) {
        alert("Need both from and to accounts for a transfer");
        return;
      }
      if (selectedFromAccountId === selectedToAccountId) {
        alert("Cannot transfer to the same account");
        return;
      }
      payload.fromAccountId = selectedFromAccountId;
      payload.toAccountId = selectedToAccountId;
    }

    try {
      await api.post("/transactions", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // reset form
      setTransactionAmount("");
      setTransactionDate(new Date().toISOString().slice(0,16));

      // refresh transactions
      fetchTransactions(token);
    } catch (err) {
      console.error("Create transaction error:", err);
    }
  };

  /********************************************************
   * Recalc All Balances
   ********************************************************/
  const handleRecalc = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.post("/transactions/recalc", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Recalc result:", res.data);
      if (res.data.accounts) {
        setAccounts(res.data.accounts);
      }
    } catch (err) {
      console.error("Recalc error:", err);
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
          newInstrument: editingInstrumentValue
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
        { oldPattern: oldValue, newPattern: editingPatternValue },
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
   * BREAK-EVEN RANGE
   ********************************************************/
  const updateBeRange = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const minVal = parseFloat(beMin);
    const maxVal = parseFloat(beMax);
    if (isNaN(minVal) || isNaN(maxVal)) {
      alert("Invalid numeric input for break-even range.");
      return;
    }
    if (minVal >= maxVal) {
      alert("beMin must be less than beMax.");
      return;
    }

    try {
      await api.post("/settings/beRange/update", {
        beMin: minVal,
        beMax: maxVal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // refetch
      fetchSettings(token);
    } catch (error) {
      console.error("Failed to update BE range:", error);
    }
  };

  /********************************************************
   * RENDER
   ********************************************************/
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 border rounded ${activeTab === "money" ? "bg-blue-200" : ""}`}
          onClick={() => setActiveTab("money")}
        >
          Money Management
        </button>
        <button
          className={`px-4 py-2 border rounded ${activeTab === "values" ? "bg-blue-200" : ""}`}
          onClick={() => setActiveTab("values")}
        >
          List of Values
        </button>
      </div>

      {/* MONEY MANAGEMENT TAB */}
      {activeTab === "money" && (
        <>
          {/* Show accounts + recalc button */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold">Your Accounts</h2>
            {accounts.length === 0 ? (
              <p className="mt-2">No accounts found. Create them on landing or a separate page.</p>
            ) : (
              <ul className="list-disc ml-5 mt-2">
                {accounts.map(ac => (
                  <li key={ac.id}>
                    {ac.name} ({ac.accountType}) — <span className="font-semibold">Balance:</span> {ac.balance} {ac.currency}
                  </li>
                ))}
              </ul>
            )}
            {/* Recalc balances button */}
            <button
              className="mt-4 bg-gray-400 text-white px-3 py-2 rounded"
              onClick={handleRecalc}
            >
              Recalc Balances
            </button>
          </div>

          {/* Create Transaction form */}
          <div className="mt-6 p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Create a Transaction</h2>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="mr-2 font-medium">Type:</label>
                <select
                  className="border p-2"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                >
                  <option value="DEPOSIT">DEPOSIT</option>
                  <option value="WITHDRAW">WITHDRAW</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>

              {/* deposit => choose toAccount */}
              {transactionType === "DEPOSIT" && (
                <div>
                  <label className="mr-2 font-medium">To Account:</label>
                  <select
                    className="border p-2"
                    value={selectedToAccountId ?? ""}
                    onChange={(e) => setSelectedToAccountId(parseInt(e.target.value))}
                  >
                    <option value="">--Select--</option>
                    {accounts.map(ac => (
                      <option key={ac.id} value={ac.id}>{ac.name} ({ac.balance} {ac.currency})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* withdraw => choose fromAccount */}
              {transactionType === "WITHDRAW" && (
                <div>
                  <label className="mr-2 font-medium">From Account:</label>
                  <select
                    className="border p-2"
                    value={selectedFromAccountId ?? ""}
                    onChange={(e) => setSelectedFromAccountId(parseInt(e.target.value))}
                  >
                    <option value="">--Select--</option>
                    {accounts.map(ac => (
                      <option key={ac.id} value={ac.id}>{ac.name} ({ac.balance} {ac.currency})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* transfer => choose both from & to */}
              {transactionType === "TRANSFER" && (
                <div className="flex gap-4">
                  <div>
                    <label className="mr-2 font-medium">From:</label>
                    <select
                      className="border p-2"
                      value={selectedFromAccountId ?? ""}
                      onChange={(e) => setSelectedFromAccountId(parseInt(e.target.value))}
                    >
                      <option value="">--Select--</option>
                      {accounts.map(ac => (
                        <option key={ac.id} value={ac.id}>{ac.name} ({ac.balance} {ac.currency})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mr-2 font-medium">To:</label>
                    <select
                      className="border p-2"
                      value={selectedToAccountId ?? ""}
                      onChange={(e) => setSelectedToAccountId(parseInt(e.target.value))}
                    >
                      <option value="">--Select--</option>
                      {accounts.map(ac => (
                        <option key={ac.id} value={ac.id}>{ac.name} ({ac.balance} {ac.currency})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mr-2 font-medium">Amount:</label>
                <input
                  type="number"
                  className="border p-2"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  step="0.01"
                />
              </div>

              <div>
                <label className="mr-2 font-medium">Date/Time:</label>
                <input
                  type="datetime-local"
                  className="border p-2"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>

              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
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
                    <th className="p-2 text-left">From Account</th>
                    <th className="p-2 text-left">To Account</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b">
                      <td className="p-2">{new Date(tx.dateTime).toLocaleString()}</td>
                      <td className="p-2">{tx.type}</td>
                      <td className="p-2">{tx.amount}</td>
                      <td className="p-2">{tx.currency}</td>
                      <td className="p-2">{tx.fromAccountId ?? "-"}</td>
                      <td className="p-2">{tx.toAccountId ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* LIST OF VALUES TAB */}
      {activeTab === "values" && (
        <>
          {/* INSTRUMENTS */}
          <div className="p-4 border rounded mb-6">
            <h2 className="text-lg font-semibold">Manage Instruments</h2>
            <ul className="mt-2">
              {instruments.map((inst, idx) => {
                if (editingInstrumentIndex === idx) {
                  // editing mode
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
                  // view mode
                  return (
                    <li key={idx} className="flex items-center justify-between mt-2">
                      <span>{inst}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() => {
                            setEditingInstrumentIndex(idx);
                            setEditingInstrumentValue(inst);
                          }}
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

          {/* PATTERNS */}
          <div className="p-4 border rounded mb-6">
            <h2 className="text-lg font-semibold">Manage Trade Patterns</h2>
            <ul className="mt-2">
              {patterns.map((pat, idx) => {
                if (editingPatternIndex === idx) {
                  // editing
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
                  // view
                  return (
                    <li key={idx} className="flex items-center justify-between mt-2">
                      <span>{pat}</span>
                      <div className="space-x-2">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                          onClick={() => {
                            setEditingPatternIndex(idx);
                            setEditingPatternValue(pat);
                          }}
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
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold">Break-Even Range</h2>
            <label className="block mt-2">Min (beMin):</label>
            <input
              type="number"
              step="any"
              className="p-2 border rounded w-full"
              value={beMin}
              onChange={(e) => setBeMin(e.target.value)}
            />
            <label className="block mt-2">Max (beMax):</label>
            <input
              type="number"
              step="any"
              className="p-2 border rounded w-full"
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
