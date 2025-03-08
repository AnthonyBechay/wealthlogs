import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";

// ---------- Types (Your existing code) ----------
interface Account {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}
interface Transaction {
  id: number;
  type: "DEPOSIT" | "WITHDRAW" | "TRANSFER";
  amount: number;
  dateTime: string; // ISO
  currency: string;
  fromAccountId?: number;
  toAccountId?: number;
}

// ---------- Additional for communities + coaching ----------
interface Community {
  id: number;
  name: string;
  description?: string;
  type?: string; // e.g. "PRIVATE"
}
interface CommunityMembership {
  userId: number;
  username: string;
  role: string;
}

export default function Settings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"money" | "values" | "community" | "delegation" | "coaching">("money");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // On mount, check if logged in + fetch data
  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me", { withCredentials: true });
      await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchSettings(),
        fetchAllCommunities(),
        fetchUserCommunities(),
        fetchAccountsForDelegation(),
      ]);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  // ---------- MONEY TAB ----------
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionType, setTransactionType] = useState<"DEPOSIT"|"WITHDRAW"|"TRANSFER">("DEPOSIT");
  const [selectedFromAccountId, setSelectedFromAccountId] = useState<number | null>(null);
  const [selectedToAccountId, setSelectedToAccountId] = useState<number | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 16));

  async function fetchAccounts() {
    try {
      const res = await api.get("/financial-accounts", { withCredentials: true });
      const userAccounts: Account[] = res.data;
      setAccounts(userAccounts);
      if (userAccounts.length > 0) {
        setSelectedFromAccountId(userAccounts[0].id);
        setSelectedToAccountId(userAccounts[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  }
  async function fetchTransactions() {
    try {
      const res = await api.get("/transactions", { withCredentials: true });
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }
  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(transactionAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Amount must be > 0");
      return;
    }
    const payload: any = {
      type: transactionType,
      amount: amt,
      dateTime: transactionDate,
      currency: "USD",
    };
    if (transactionType === "DEPOSIT") {
      if (!selectedToAccountId) return alert("Select account to deposit into");
      payload.toAccountId = selectedToAccountId;
    } else if (transactionType === "WITHDRAW") {
      if (!selectedFromAccountId) return alert("Select account to withdraw from");
      payload.fromAccountId = selectedFromAccountId;
    } else {
      // TRANSFER
      if (!selectedFromAccountId || !selectedToAccountId) {
        return alert("Need from + to accounts for transfer");
      }
      if (selectedFromAccountId === selectedToAccountId) {
        return alert("Cannot transfer to the same account");
      }
      payload.fromAccountId = selectedFromAccountId;
      payload.toAccountId = selectedToAccountId;
    }
    try {
      await api.post("/transactions", payload, { withCredentials: true });
      setTransactionAmount("");
      setTransactionDate(new Date().toISOString().slice(0, 16));
      fetchTransactions();
    } catch (err) {
      console.error("Create transaction error:", err);
    }
  }
  async function handleRecalc() {
    try {
      const res = await api.post("/transactions/recalc", {}, { withCredentials: true });
      if (res.data.accounts) {
        setAccounts(res.data.accounts);
      }
    } catch (err) {
      console.error("Recalc error:", err);
    }
  }

  // ---------- VALUES TAB (instruments, patterns, beRange) ----------
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [beMin, setBeMin] = useState("-0.2");
  const [beMax, setBeMax] = useState("0.3");

  const [newInstrument, setNewInstrument] = useState("");
  const [editingInstrumentIndex, setEditingInstrumentIndex] = useState<number|null>(null);
  const [editingInstrumentValue, setEditingInstrumentValue] = useState("");
  
  const [newPattern, setNewPattern] = useState("");
  const [editingPatternIndex, setEditingPatternIndex] = useState<number|null>(null);
  const [editingPatternValue, setEditingPatternValue] = useState("");

  async function fetchSettings() {
    try {
      const res = await api.get("/settings", { withCredentials: true });
      setInstruments(res.data.instruments || []);
      setPatterns(res.data.patterns || []);
      setBeMin(String(res.data.beMin ?? -0.2));
      setBeMax(String(res.data.beMax ?? 0.3));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }
  async function handleAddInstrument() {
    if (!newInstrument.trim()) return;
    try {
      const res = await api.post("/settings/instruments/add", { instrument: newInstrument }, { withCredentials: true });
      setInstruments(res.data.instruments);
      setNewInstrument("");
    } catch (err) {
      console.error("Failed to add instrument:", err);
    }
  }
  async function handleDeleteInstrument(instrument: string) {
    try {
      const res = await api.post("/settings/instruments/delete", { instrument }, { withCredentials: true });
      setInstruments(res.data.instruments);
    } catch (err) {
      console.error("Failed to delete instrument:", err);
    }
  }
  function startEditingInstrument(index: number, currentValue: string) {
    setEditingInstrumentIndex(index);
    setEditingInstrumentValue(currentValue);
  }
  function cancelEditingInstrument() {
    setEditingInstrumentIndex(null);
    setEditingInstrumentValue("");
  }
  async function handleUpdateInstrument(oldValue: string) {
    if (!editingInstrumentValue.trim()) {
      cancelEditingInstrument();
      return;
    }
    try {
      const res = await api.post(
        "/settings/instruments/edit",
        { oldInstrument: oldValue, newInstrument: editingInstrumentValue },
        { withCredentials: true }
      );
      setInstruments(res.data.instruments);
    } catch (err) {
      console.error("Failed to update instrument:", err);
    } finally {
      cancelEditingInstrument();
    }
  }

  // Patterns
  async function handleAddPattern() {
    if (!newPattern.trim()) return;
    try {
      const res = await api.post("/settings/patterns/add", { pattern: newPattern }, { withCredentials: true });
      setPatterns(res.data.patterns);
      setNewPattern("");
    } catch (err) {
      console.error("Failed to add pattern:", err);
    }
  }
  async function handleDeletePattern(pattern: string) {
    try {
      const res = await api.post("/settings/patterns/delete", { pattern }, { withCredentials: true });
      setPatterns(res.data.patterns);
    } catch (err) {
      console.error("Failed to delete pattern:", err);
    }
  }
  function startEditingPattern(index: number, currentValue: string) {
    setEditingPatternIndex(index);
    setEditingPatternValue(currentValue);
  }
  function cancelEditingPattern() {
    setEditingPatternIndex(null);
    setEditingPatternValue("");
  }
  async function handleUpdatePattern(oldValue: string) {
    if (!editingPatternValue.trim()) {
      cancelEditingPattern();
      return;
    }
    try {
      const res = await api.post(
        "/settings/patterns/edit",
        { oldPattern: oldValue, newPattern: editingPatternValue },
        { withCredentials: true }
      );
      setPatterns(res.data.patterns);
    } catch (err) {
      console.error("Failed to update pattern:", err);
    } finally {
      cancelEditingPattern();
    }
  }
  async function updateBeRange() {
    const minVal = parseFloat(beMin);
    const maxVal = parseFloat(beMax);
    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
      alert("Invalid beMin/beMax");
      return;
    }
    try {
      await api.post("/settings/beRange/update", { beMin: minVal, beMax: maxVal }, { withCredentials: true });
      fetchSettings();
    } catch (err) {
      console.error("Failed to update BE range:", err);
    }
  }

  // ---------- COMMUNITY TAB ----------
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [communityName, setCommunityName] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<number|null>(null);
  const [communityMembers, setCommunityMembers] = useState<CommunityMembership[]>([]);

  async function fetchAllCommunities() {
    // GET /community
    try {
      const res = await api.get("/community", { withCredentials: true });
      setAllCommunities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch all communities:", err);
    }
  }
  async function fetchUserCommunities() {
    // GET /community/my
    try {
      const res = await api.get("/community/my", { withCredentials: true });
      setMyCommunities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch user communities:", err);
    }
  }
  async function createCommunity() {
    if (!communityName.trim()) return;
    try {
      await api.post("/community/create", { name: communityName }, { withCredentials: true });
      setCommunityName("");
      fetchAllCommunities();
      fetchUserCommunities();
    } catch (err) {
      console.error("Failed to create community:", err);
    }
  }
  async function joinCommunity(id: number) {
    try {
      await api.post("/community/join", { communityId: id }, { withCredentials: true });
      fetchUserCommunities();
    } catch (err) {
      console.error("Join community error:", err);
    }
  }
  async function leaveCommunity(id: number) {
    try {
      await api.post("/community/leave", { communityId: id }, { withCredentials: true });
      fetchUserCommunities();
    } catch (err) {
      console.error("Leave community error:", err);
    }
  }
  async function loadCommunityMembers(communityId: number) {
    setSelectedCommunityId(communityId);
    try {
      const res = await api.get(`/community/${communityId}/members`, { withCredentials: true });
      setCommunityMembers(res.data);
    } catch (err) {
      console.error("Fetch members error:", err);
    }
  }
  async function assignCommunityCoach(userId: number) {
    if (!selectedCommunityId) return;
    try {
      await api.post("/community/assignCoach", {
        communityId: selectedCommunityId,
        userId,
      }, { withCredentials: true });
      loadCommunityMembers(selectedCommunityId);
    } catch (err) {
      console.error("Assign coach error:", err);
    }
  }

  // ---------- DELEGATION TAB ----------
  const [delegationUser, setDelegationUser] = useState("");
  const [delegationAccounts, setDelegationAccounts] = useState<number[]>([]);
  const [allAccountsForDelegation, setAllAccountsForDelegation] = useState<Account[]>([]);

  async function fetchAccountsForDelegation() {
    try {
      const res = await api.get("/financial-accounts", { withCredentials: true });
      setAllAccountsForDelegation(res.data || []);
    } catch (err) {
      console.error("Fetch accounts for delegation error:", err);
    }
  }
  function toggleDelegationAccount(acctId: number) {
    setDelegationAccounts(prev =>
      prev.includes(acctId) ? prev.filter(id => id !== acctId) : [...prev, acctId]
    );
  }
  async function giveDelegatedAccess() {
    if (!delegationUser.trim() || delegationAccounts.length === 0) return;
    try {
      await api.post("/settings/delegation/give", {
        userName: delegationUser,
        accountIds: delegationAccounts,
      }, { withCredentials: true });
      setDelegationUser("");
      setDelegationAccounts([]);
    } catch (err) {
      console.error("giveDelegatedAccess error:", err);
    }
  }
  async function revokeDelegatedAccess() {
    if (!delegationUser.trim() || delegationAccounts.length === 0) return;
    try {
      await api.post("/settings/delegation/revoke", {
        userName: delegationUser,
        accountIds: delegationAccounts,
      }, { withCredentials: true });
      setDelegationUser("");
      setDelegationAccounts([]);
    } catch (err) {
      console.error("revokeDelegatedAccess error:", err);
    }
  }

  // ---------- COACHING TAB ----------
  const [coachUsername, setCoachUsername] = useState("");
  const [coachAccounts, setCoachAccounts] = useState<number[]>([]);

  function toggleCoachAccount(acctId: number) {
    setCoachAccounts(prev =>
      prev.includes(acctId) ? prev.filter(id => id !== acctId) : [...prev, acctId]
    );
  }
  async function assignCoach() {
    if (!coachUsername.trim() || coachAccounts.length === 0) return;
    try {
      // POST /coaching/assign
      await api.post("/coaching/assign", {
        coachUsername,
        accountIds: coachAccounts,
      }, { withCredentials: true });
      setCoachUsername("");
      setCoachAccounts([]);
    } catch (err) {
      console.error("assignCoach error:", err);
    }
  }

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: "#FAFAFA", color: "#37474F" }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#FAFAFA", color: "#37474F" }}>
      <h1 className="text-3xl font-bold mb-6" style={{ color: "#37474F" }}>Settings</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* TAB NAV */}
      <div className="flex gap-2 mb-6">
        <TabButton label="Money" active={activeTab === "money"} onClick={() => setActiveTab("money")} />
        <TabButton label="Values" active={activeTab === "values"} onClick={() => setActiveTab("values")} />
        <TabButton label="Community" active={activeTab === "community"} onClick={() => setActiveTab("community")} />
        <TabButton label="Delegation" active={activeTab === "delegation"} onClick={() => setActiveTab("delegation")} />
        <TabButton label="Coaching" active={activeTab === "coaching"} onClick={() => setActiveTab("coaching")} />
      </div>

      {activeTab === "money" && renderMoneyTab()}
      {activeTab === "values" && renderValuesTab()}
      {activeTab === "community" && renderCommunityTab()}
      {activeTab === "delegation" && renderDelegationTab()}
      {activeTab === "coaching" && renderCoachingTab()}
    </div>
  );

  // ---------- SUB-RENDERS ----------
  function renderMoneyTab() {
    return (
      <div className="space-y-6">
        {/** ACCOUNTS */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Your Accounts</h2>
          {accounts.length === 0 ? (
            <p>No accounts found.</p>
          ) : (
            <ul className="list-disc ml-5">
              {accounts.map(ac => (
                <li key={ac.id}>
                  {ac.name} ({ac.accountType}) — Balance: {ac.balance} {ac.currency}
                </li>
              ))}
            </ul>
          )}
          <button
            className="mt-4 px-4 py-2 text-white font-semibold rounded"
            style={{ backgroundColor: "#00796B" }}
            onClick={handleRecalc}
          >
            Recalc Balances
          </button>
        </div>

        {/** CREATE TRANSACTION */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00C853" }}>Create Transaction</h2>
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div>
              <label className="mr-2 font-medium">Type:</label>
              <select
                className="p-2 border rounded"
                style={{ borderColor: "#37474F" }}
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as any)}
              >
                <option value="DEPOSIT">DEPOSIT</option>
                <option value="WITHDRAW">WITHDRAW</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>
            {transactionType === "DEPOSIT" && (
              <div>
                <label className="mr-2 font-medium">To Account:</label>
                <select
                  className="p-2 border rounded"
                  style={{ borderColor: "#37474F" }}
                  value={selectedToAccountId ?? ""}
                  onChange={(e) => setSelectedToAccountId(parseInt(e.target.value))}
                >
                  <option value="">--Select--</option>
                  {accounts.map(ac => (
                    <option key={ac.id} value={ac.id}>
                      {ac.name} ({ac.balance} {ac.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {transactionType === "WITHDRAW" && (
              <div>
                <label className="mr-2 font-medium">From Account:</label>
                <select
                  className="p-2 border rounded"
                  style={{ borderColor: "#37474F" }}
                  value={selectedFromAccountId ?? ""}
                  onChange={(e) => setSelectedFromAccountId(parseInt(e.target.value))}
                >
                  <option value="">--Select--</option>
                  {accounts.map(ac => (
                    <option key={ac.id} value={ac.id}>
                      {ac.name} ({ac.balance} {ac.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {transactionType === "TRANSFER" && (
              <div className="flex gap-4">
                <div>
                  <label className="mr-2 font-medium">From:</label>
                  <select
                    className="p-2 border rounded"
                    style={{ borderColor: "#37474F" }}
                    value={selectedFromAccountId ?? ""}
                    onChange={(e) => setSelectedFromAccountId(parseInt(e.target.value))}
                  >
                    <option value="">--Select--</option>
                    {accounts.map(ac => (
                      <option key={ac.id} value={ac.id}>
                        {ac.name} ({ac.balance} {ac.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mr-2 font-medium">To:</label>
                  <select
                    className="p-2 border rounded"
                    style={{ borderColor: "#37474F" }}
                    value={selectedToAccountId ?? ""}
                    onChange={(e) => setSelectedToAccountId(parseInt(e.target.value))}
                  >
                    <option value="">--Select--</option>
                    {accounts.map(ac => (
                      <option key={ac.id} value={ac.id}>
                        {ac.name} ({ac.balance} {ac.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="mr-2 font-medium">Amount:</label>
              <input
                type="number"
                step="0.01"
                className="p-2 border rounded"
                style={{ borderColor: "#37474F" }}
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mr-2 font-medium">Date/Time:</label>
              <input
                type="datetime-local"
                className="p-2 border rounded"
                style={{ borderColor: "#37474F" }}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded text-white font-semibold"
              style={{ backgroundColor: "#00C853" }}
            >
              Submit
            </button>
          </form>
        </div>

        {/** TRANSACTION HISTORY */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#FAFAFA", borderColor: "#37474F" }}>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>Date/Time</th>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>Type</th>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>Amount</th>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>Currency</th>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>From</th>
                  <th className="p-2 text-left" style={{ border: "1px solid #37474F" }}>To</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ border: "1px solid #37474F" }}>
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
      </div>
    );
  }

  function renderValuesTab() {
    return (
      <div className="space-y-6">
        {/** INSTRUMENTS */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Manage Instruments</h2>
          <ul>
            {instruments.map((inst, idx) => {
              if (editingInstrumentIndex === idx) {
                return (
                  <li key={inst} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="p-2 border rounded"
                      style={{ borderColor: "#37474F" }}
                      value={editingInstrumentValue}
                      onChange={e => setEditingInstrumentValue(e.target.value)}
                    />
                    <button
                      className="px-3 py-1 rounded text-white"
                      style={{ backgroundColor: "#00C853" }}
                      onClick={() => handleUpdateInstrument(inst)}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 rounded"
                      style={{ backgroundColor: "#B0BEC5" }}
                      onClick={cancelEditingInstrument}
                    >
                      Cancel
                    </button>
                  </li>
                );
              } else {
                return (
                  <li key={inst} className="flex items-center justify-between mb-2">
                    <span>{inst}</span>
                    <div className="space-x-2">
                      <button
                        className="px-3 py-1 rounded text-white"
                        style={{ backgroundColor: "#00796B" }}
                        onClick={() => {
                          setEditingInstrumentIndex(idx);
                          setEditingInstrumentValue(inst);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 rounded text-white"
                        style={{ backgroundColor: "#E53935" }}
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
              className="p-2 border rounded flex-1"
              style={{ borderColor: "#37474F" }}
              placeholder="New Instrument"
              value={newInstrument}
              onChange={e => setNewInstrument(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: "#00796B" }}
              onClick={handleAddInstrument}
            >
              Add
            </button>
          </div>
        </div>

        {/** PATTERNS */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Manage Patterns</h2>
          <ul>
            {patterns.map((pat, idx) => {
              if (editingPatternIndex === idx) {
                return (
                  <li key={pat} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="p-2 border rounded"
                      style={{ borderColor: "#37474F" }}
                      value={editingPatternValue}
                      onChange={e => setEditingPatternValue(e.target.value)}
                    />
                    <button
                      className="px-3 py-1 rounded text-white"
                      style={{ backgroundColor: "#00C853" }}
                      onClick={() => handleUpdatePattern(pat)}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 rounded"
                      style={{ backgroundColor: "#B0BEC5" }}
                      onClick={cancelEditingPattern}
                    >
                      Cancel
                    </button>
                  </li>
                );
              } else {
                return (
                  <li key={pat} className="flex items-center justify-between mb-2">
                    <span>{pat}</span>
                    <div className="space-x-2">
                      <button
                        className="px-3 py-1 rounded text-white"
                        style={{ backgroundColor: "#00796B" }}
                        onClick={() => {
                          setEditingPatternIndex(idx);
                          setEditingPatternValue(pat);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 rounded text-white"
                        style={{ backgroundColor: "#E53935" }}
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
              className="p-2 border rounded flex-1"
              style={{ borderColor: "#37474F" }}
              placeholder="New Pattern"
              value={newPattern}
              onChange={e => setNewPattern(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: "#00796B" }}
              onClick={handleAddPattern}
            >
              Add
            </button>
          </div>
        </div>

        {/** BREAK-EVEN RANGE */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Break-Even Range</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block">Min (beMin):</label>
              <input
                type="number"
                step="any"
                className="p-2 border rounded w-full"
                style={{ borderColor: "#37474F" }}
                value={beMin}
                onChange={e => setBeMin(e.target.value)}
              />
            </div>
            <div>
              <label className="block">Max (beMax):</label>
              <input
                type="number"
                step="any"
                className="p-2 border rounded w-full"
                style={{ borderColor: "#37474F" }}
                value={beMax}
                onChange={e => setBeMax(e.target.value)}
              />
            </div>
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: "#00C853" }}
              onClick={updateBeRange}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCommunityTab() {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold" style={{ color: "#00796B" }}>Create Community</h2>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              className="p-2 border rounded flex-1"
              style={{ borderColor: "#37474F" }}
              placeholder="Community Name"
              value={communityName}
              onChange={e => setCommunityName(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: "#00C853" }}
              onClick={createCommunity}
            >
              Create
            </button>
          </div>
        </div>

        {/* All communities */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#37474F" }}>All Communities</h2>
          {allCommunities.length === 0 ? (
            <p>No communities found.</p>
          ) : (
            <ul>
              {allCommunities.map(c => (
                <li key={c.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "#37474F" }}>
                  <span>{c.name}</span>
                  <button
                    className="px-3 py-1 rounded text-white"
                    style={{ backgroundColor: "#00796B" }}
                    onClick={() => joinCommunity(c.id)}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My communities */}
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#37474F" }}>My Communities</h2>
          {myCommunities.length === 0 ? (
            <p>You are not in any community yet.</p>
          ) : (
            <ul>
              {myCommunities.map(c => (
                <li key={c.id} className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    <button
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: "#FFD700", color: "#37474F" }}
                      onClick={() => loadCommunityMembers(c.id)}
                    >
                      Manage
                    </button>
                    <button
                      className="px-2 py-1 rounded text-white"
                      style={{ backgroundColor: "#00796B" }}
                      onClick={() => leaveCommunity(c.id)}
                    >
                      Leave
                    </button>
                  </div>
                  {selectedCommunityId === c.id && (
                    <div className="ml-4 mt-2">
                      <p className="font-semibold" style={{ color: "#37474F" }}>Members:</p>
                      {communityMembers.length === 0 ? (
                        <p>No members found or you might not be manager.</p>
                      ) : (
                        <ul>
                          {communityMembers.map(m => (
                            <li key={m.userId} className="flex items-center gap-2 mb-1">
                              <span>{m.username} (role: {m.role})</span>
                              <button
                                className="px-2 py-1 rounded text-white"
                                style={{ backgroundColor: "#00796B" }}
                                onClick={() => assignCommunityCoach(m.userId)}
                              >
                                Assign Coach
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  function renderDelegationTab() {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Delegated Access</h2>
          <div className="flex flex-col gap-2">
            <div>
              <label className="block font-medium">Delegate to user:</label>
              <input
                type="text"
                className="p-2 border rounded w-full"
                style={{ borderColor: "#37474F" }}
                value={delegationUser}
                onChange={e => setDelegationUser(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium">Select Accounts:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {allAccountsForDelegation.map(acct => (
                  <label key={acct.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={delegationAccounts.includes(acct.id)}
                      onChange={() => toggleDelegationAccount(acct.id)}
                    />
                    {acct.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="px-4 py-2 text-white font-semibold rounded"
                style={{ backgroundColor: "#00C853" }}
                onClick={giveDelegatedAccess}
              >
                Give Access
              </button>
              <button
                className="px-4 py-2 text-white font-semibold rounded"
                style={{ backgroundColor: "#00796B" }}
                onClick={revokeDelegatedAccess}
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCoachingTab() {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded" style={{ backgroundColor: "#FFF" }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "#00796B" }}>Coaching</h2>
          <div className="flex flex-col gap-2">
            <div>
              <label className="block font-medium">Coach Username:</label>
              <input
                type="text"
                className="p-2 border rounded w-full"
                style={{ borderColor: "#37474F" }}
                value={coachUsername}
                onChange={e => setCoachUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium">Select Accounts:</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {allAccountsForDelegation.map(acct => (
                  <label key={acct.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={coachAccounts.includes(acct.id)}
                      onChange={() =>
                        setCoachAccounts(prev =>
                          prev.includes(acct.id)
                            ? prev.filter(id => id !== acct.id)
                            : [...prev, acct.id]
                        )
                      }
                    />
                    {acct.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="px-4 py-2 text-white font-semibold rounded"
                style={{ backgroundColor: "#00C853" }}
                onClick={assignCoach}
              >
                Assign Coach
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Helper for tab buttons
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded font-semibold"
      style={{
        backgroundColor: active ? "#00796B" : "#FAFAFA",
        color: active ? "#FAFAFA" : "#37474F",
        border: "1px solid #37474F",
      }}
    >
      {label}
    </button>
  );
}
