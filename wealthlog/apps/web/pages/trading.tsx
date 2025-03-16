// pages/trading.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface FinancialAccount {
  id: number;
  userId: number;
  name: string;
  accountType: string;  // e.g. "FX_COMMODITY", "BONDS", "STOCKS", "CRYPTO"
  balance: number;
  currency: string;
}

interface FxTrade {
  amountGain?: number | null;
  percentageGain?: number | null;
}

interface Trade {
  id: number;
  tradeType: string;    // "FX", "BOND", "STOCK", "CRYPTO", ...
  instrument: string;
  tradeDirection: "LONG"|"SHORT";
  fees: number;
  entryDate: string;
  pattern?: string;
  notes?: string;
  fxTrade?: FxTrade;
  // bondTrade?, stocksTrade? etc.
}

/**
 * Utility: map an accountType => user-facing label
 */
function accountTypeToLabel(at: string): string {
  if (at === "FX_COMMODITY") return "FX";
  if (at === "BONDS") return "BOND";
  if (at === "STOCKS") return "STOCK";
  if (at === "CRYPTO") return "CRYPTO";
  return "OTHER";
}

export default function TradingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [allAccounts, setAllAccounts] = useState<FinancialAccount[]>([]);

  // We'll discover which account types exist, build dynamic tabs
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("");

  // Filtered accounts for active tab
  const [typeAccounts, setTypeAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // trade listing
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pageSize, setPageSize] = useState(10);

  // for new account
  const [showAcctForm, setShowAcctForm] = useState(false);
  const [newAcctName, setNewAcctName] = useState("");

  // instruments for new trade
  const [instruments, setInstruments] = useState<string[]>([]);

  // newTrade form
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [formInstrument, setFormInstrument] = useState("");
  const [formDirection, setFormDirection] = useState("Long");
  const [formFees, setFormFees] = useState("0");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0,16));
  const [formPattern, setFormPattern] = useState("");
  // For FX sub-trade
  const [fxAmountGain, setFxAmountGain] = useState("0");
  const [fxPercentageGain, setFxPercentageGain] = useState("0");

  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me");
      // fetch accounts
      const acctRes = await api.get<FinancialAccount[]>("/account");
      setAllAccounts(acctRes.data || []);

      // fetch instruments
      const setRes = await api.get("/settings");
      setInstruments(setRes.data.instruments || []);

      // Now figure out which account types exist
      const uniqueTypes = new Set<string>();
      acctRes.data.forEach(ac => {
        uniqueTypes.add(ac.accountType);
      });
      // Convert them to user-facing labels
      // e.g. "FX_COMMODITY" => "FX"
      const tabLabels = Array.from(uniqueTypes).map(accountTypeToLabel);
      // e.g. if user has "FX_COMMODITY" and "CRYPTO", tabLabels might be ["FX", "CRYPTO"]
      setTabs(tabLabels);

      if (tabLabels.length > 0) {
        setActiveTab(tabLabels[0]);
      }

    } catch (err) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  // filter accounts based on activeTab
  useEffect(() => {
    if (!activeTab) {
      setTypeAccounts([]);
      setSelectedAccountId(null);
      setTrades([]);
      return;
    }
    // we want to find all accounts whose accountType => the label == activeTab
    const mappedAccounts = allAccounts.filter(ac => {
      const label = accountTypeToLabel(ac.accountType);
      return label === activeTab;
    });
    setTypeAccounts(mappedAccounts);
    if (mappedAccounts.length > 0) {
      setSelectedAccountId(mappedAccounts[0].id);
    } else {
      setSelectedAccountId(null);
      setTrades([]);
    }
  }, [activeTab, allAccounts]);

  // load trades for selected account
  useEffect(() => {
    if (!selectedAccountId) {
      setTrades([]);
      return;
    }
    loadTrades(selectedAccountId);
  }, [selectedAccountId]);

  async function loadTrades(acctId: number) {
    setError("");
    try {
      // figure out the underlying tradeType from the account
      const acct = allAccounts.find(a => a.id === acctId);
      if (!acct) return;
      const tType = accountTypeToLabel(acct.accountType);
      const params = new URLSearchParams({
        accountId: String(acctId),
        tradeType: tType,
      });
      const res = await api.get<Trade[]>(`/trade?${params.toString()}`);
      setTrades(res.data || []);
    } catch (err) {
      console.error("Failed to load trades:", err);
      setError("Could not load trades");
    }
  }

  // new account
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newAcctName.trim()) return;

    // map activeTab => actual accountType
    let acctType = "OTHER";
    if (activeTab === "FX") acctType = "FX_COMMODITY";
    if (activeTab === "BOND") acctType = "BONDS";
    if (activeTab === "STOCK") acctType = "STOCKS";
    if (activeTab === "CRYPTO") acctType = "CRYPTO";

    try {
      await api.post("/account", {
        name: newAcctName.trim(),
        accountType: acctType,
      });
      setNewAcctName("");
      setShowAcctForm(false);
      // reload accounts
      const acctRes = await api.get<FinancialAccount[]>("/account");
      setAllAccounts(acctRes.data || []);
    } catch (err) {
      console.error("Failed to create account:", err);
      setError("Could not create account");
    }
  }

  // new trade
  async function handleCreateTrade(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedAccountId) {
      setError("No account selected");
      return;
    }
    if (!formInstrument.trim()) {
      setError("Instrument is required");
      return;
    }

    // figure out tradeType from the account
    const acct = allAccounts.find(a => a.id === selectedAccountId);
    if (!acct) return;
    const tType = accountTypeToLabel(acct.accountType);

    let fx = undefined;
    if (tType === "FX") {
      let aGain = parseFloat(fxAmountGain) || 0;
      let pGain = parseFloat(fxPercentageGain) || 0;
      if (aGain !== 0 && pGain !== 0) {
        // prefer pGain
        aGain = 0;
      }
      fx = {
        amountGain: aGain !== 0 ? aGain : undefined,
        percentageGain: pGain !== 0 ? pGain : undefined,
      };
    }

    const body: any = {
      tradeType: tType,
      accountId: selectedAccountId,
      instrument: formInstrument.trim(),
      direction: formDirection,
      fees: parseFloat(formFees) || 0,
      dateTime: new Date(formDate).toISOString(),
      pattern: formPattern.trim(),
    };
    if (fx) body.fx = fx;

    try {
      await api.post("/trade", body);
      alert("Trade created successfully");
      setShowNewTrade(false);
      resetForm();
      loadTrades(selectedAccountId);
    } catch (err) {
      console.error("Failed to create trade:", err);
      setError("Could not create trade");
    }
  }

  function resetForm() {
    setFormInstrument("");
    setFormDirection("Long");
    setFormFees("0");
    setFormDate(new Date().toISOString().slice(0,16));
    setFormPattern("");
    setFxAmountGain("0");
    setFxPercentageGain("0");
  }

  async function handleDeleteTrade(tradeId: number) {
    if (!confirm("Are you sure?")) return;
    setError("");
    try {
      await api.delete(`/trade/${tradeId}`);
      if (selectedAccountId) loadTrades(selectedAccountId);
    } catch (err) {
      console.error("Failed to delete trade:", err);
      setError("Could not delete trade");
    }
  }

  // client-side pagination
  const paginatedTrades = trades.slice(0, pageSize);

  if (loading) {
    return <div className="p-4">Loading trading page...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dynamic tabs from user account types */}
      <div className="p-4 bg-white flex gap-2 shadow">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1 rounded font-semibold ${
              t === activeTab ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => router.push("/tradeFilter")}
          className="ml-auto px-3 py-1 bg-yellow-400 text-gray-800 rounded"
        >
          Advanced Filter Page
        </button>
      </div>

      {error && <div className="p-4 text-red-600">{error}</div>}

      {/* Add account for the current tab */}
      <div className="p-4 bg-white flex items-center gap-2">
        <button
          onClick={() => setShowAcctForm(!showAcctForm)}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          {showAcctForm ? "Cancel" : `+ Add ${activeTab} Account`}
        </button>
        {showAcctForm && (
          <form onSubmit={handleCreateAccount} className="flex items-center gap-2">
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Account Name"
              value={newAcctName}
              onChange={e => setNewAcctName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Create
            </button>
          </form>
        )}
      </div>

      {/* List of accounts for this tab */}
      <div className="p-4 flex gap-2 overflow-x-auto">
        {typeAccounts.length === 0 ? (
          <p className="text-gray-500">No {activeTab} accounts found.</p>
        ) : (
          typeAccounts.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              className={`px-4 py-2 border rounded ${
                a.id === selectedAccountId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {a.name} (bal: {a.balance} {a.currency})
            </button>
          ))
        )}
      </div>

      {/* Trades for the selected account */}
      {selectedAccountId && (
        <div className="p-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Trade History</h2>
              <button
                onClick={() => setShowNewTrade(!showNewTrade)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                {showNewTrade ? "Close New Trade" : "New Trade"}
              </button>
            </div>

            {/* simple page size control */}
            <div className="mt-2 flex items-center gap-2">
              <label>Show</label>
              <select
                value={pageSize}
                onChange={e => setPageSize(parseInt(e.target.value))}
                className="border p-1 rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={100}>100</option>
              </select>
              <span>trades</span>
            </div>

            {trades.length === 0 ? (
              <p className="mt-2 text-gray-500">No trades for this account yet.</p>
            ) : (
              <table className="mt-3 w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Date/Time</th>
                    <th className="border p-2">Instrument</th>
                    <th className="border p-2">Direction</th>
                    <th className="border p-2">Fees</th>
                    <th className="border p-2">Gain</th>
                    <th className="border p-2">Pattern</th>
                    <th className="border p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrades.map(t => (
                    <tr key={t.id}>
                      <td className="border p-2">{new Date(t.entryDate).toLocaleString()}</td>
                      <td className="border p-2">{t.instrument}</td>
                      <td className="border p-2">{t.tradeDirection === "LONG" ? "Long" : "Short"}</td>
                      <td className="border p-2">{t.fees}</td>
                      <td className="border p-2">
                        {t.tradeType === "FX" && t.fxTrade
                          ? t.fxTrade.percentageGain != null
                            ? (t.fxTrade.percentageGain * 100).toFixed(2) + "%"
                            : t.fxTrade.amountGain != null
                              ? "$" + t.fxTrade.amountGain
                              : ""
                          : ""
                        }
                      </td>
                      <td className="border p-2">{t.pattern || ""}</td>
                      <td className="border p-2">
                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* New Trade Form */}
            {showNewTrade && (
              <div className="mt-4 border p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-medium mb-2">New {activeTab} Trade</h3>
                <form onSubmit={handleCreateTrade} className="space-y-3">
                  <div>
                    <label className="block font-medium">Instrument</label>
                    <select
                      className="w-full border p-2 rounded"
                      value={formInstrument}
                      onChange={e => setFormInstrument(e.target.value)}
                      required
                    >
                      <option value="">--Select--</option>
                      {instruments.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium">Direction</label>
                    <select
                      className="w-full border p-2 rounded"
                      value={formDirection}
                      onChange={e => setFormDirection(e.target.value)}
                    >
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium">Fees</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border p-2 rounded"
                      value={formFees}
                      onChange={e => setFormFees(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium">Date/Time</label>
                    <input
                      type="datetime-local"
                      className="w-full border p-2 rounded"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-medium">Pattern</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded"
                      value={formPattern}
                      onChange={e => setFormPattern(e.target.value)}
                    />
                  </div>

                  {/* If activeTab is "FX", show amountGain or percentageGain */}
                  {activeTab === "FX" && (
                    <div className="border bg-white p-3 rounded">
                      <p className="font-medium text-sm mb-2">FX Gains</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm">amountGain ($)</label>
                          <input
                            type="number"
                            step="any"
                            className="w-full border p-2 rounded"
                            value={fxAmountGain}
                            onChange={e => setFxAmountGain(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm">percentageGain (0.05 = +5%)</label>
                          <input
                            type="number"
                            step="any"
                            className="w-full border p-2 rounded"
                            value={fxPercentageGain}
                            onChange={e => setFxPercentageGain(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        If both fields are non-zero, we'll prefer percentageGain.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Submit
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
