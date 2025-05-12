// pages/trading.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

/*─────────────────────────────── Types ───────────────────────────────*/
interface FinancialAccount {
  id: number;
  userId: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

interface FxTrade {
  amountGain?: number | null;
  percentageGain?: number | null;
  lots?: number | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLossPips?: number | null;
  pipsGain?: number | null;
  source?: string | null;
}

interface MediaLabel {
  id: number;
  name: string;
}

interface TradeMedia {
  id: number;
  imageUrl: string;
  description?: string | null;
  label?: MediaLabel | null;
}

interface Trade {
  id: number;
  tradeType: string;
  instrument: string;
  tradeDirection: "LONG" | "SHORT";
  fees: number;
  entryDate: string;
  pattern?: string;
  notes?: string;

  /** These three now come from the backend */
  openingBalance?: number | null;
  closingBalance?: number | null;
  realizedPL?: number | null;

  fxTrade?: FxTrade;
  media: TradeMedia[];
}

interface MediaTagItem {
  tagName: string;
  description: string;
  externalUrl: string;
  file?: File | null;
}

/*──────────────────────────── Component ─────────────────────────────*/
export default function TradingPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  /*────────── Accounts ─────────*/
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  /*────────── Trades ─────────*/
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pageSize, setPageSize] = useState(10);

  /*────────── Settings (instrument list, pattern list, media tags) ─────────*/
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [mediaTags, setMediaTags] = useState<string[]>([]);

  /*────────── Create account controls ─────────*/
  const [showAcctForm, setShowAcctForm] = useState(false);
  const [newAcctName, setNewAcctName] = useState("");

  /*────────── Create trade controls ─────────*/
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [formInstrument, setFormInstrument] = useState("");
  const [formDirection, setFormDirection] = useState<"LONG" | "SHORT">("LONG");
  const [formFees, setFormFees] = useState("0");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 19));
  const [formPattern, setFormPattern] = useState("");
  const [fxAmountGain, setFxAmountGain] = useState("0");
  const [fxPercentageGain, setFxPercentageGain] = useState("0");
  const [createMediaList, setCreateMediaList] = useState<MediaTagItem[]>([
    { tagName: "", description: "", externalUrl: "", file: null },
  ]);

  /* Advanced FX sub-fields */
  const [showFxAdvanced, setShowFxAdvanced] = useState(false);
  const [fxLots, setFxLots] = useState("0");
  const [fxEntryPrice, setFxEntryPrice] = useState("0");
  const [fxExitPrice, setFxExitPrice] = useState("0");
  const [fxStopLossPips, setFxStopLossPips] = useState("0");
  const [fxPipsGain, setFxPipsGain] = useState("0");

  /*────────── Edit modal state ─────────*/
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTrade, setEditTrade] = useState<Partial<Trade>>({});
  const [editFxAmount, setEditFxAmount] = useState("0");
  const [editFxPercent, setEditFxPercent] = useState("0");
  const [editMediaList, setEditMediaList] = useState<MediaTagItem[]>([
    { tagName: "", description: "", externalUrl: "", file: null },
  ]);

  /*────────────────── Initial load (auth check + settings) ─────────────────*/
  useEffect(() => {
    (async () => {
      try {
        await api.get("/auth/me");
        await loadAccounts();

        const resp = await api.get("/settings");
        setInstruments(resp.data.instruments || []);
        setPatterns(resp.data.patterns || []);
        setMediaTags(resp.data.mediaTags || []);
      } catch {
        router.push("/login");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  /*────────────────── Account & Trade loaders ─────────────────*/
  async function loadAccounts() {
    try {
      const res = await api.get<FinancialAccount[]>("/account");
      const fxAccounts = res.data.filter((a) => a.accountType === "FX_COMMODITY");
      setAccounts(fxAccounts);

      if (fxAccounts.length && !selectedAccountId) {
        setSelectedAccountId(fxAccounts[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load accounts");
    }
  }

  useEffect(() => {
    if (selectedAccountId) loadTrades(selectedAccountId);
    else setTrades([]);
  }, [selectedAccountId]);

  async function loadTrades(acctId: number) {
    setError("");
    try {
      const res = await api.get<Trade[]>(`/trade?accountId=${acctId}&tradeType=FX`);
      const sorted = res.data.sort(
        (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      );
      setTrades(sorted);
    } catch (err) {
      setError("Could not load trades");
      console.error(err);
    }
  }

  /*────────────────── Create FX Account ─────────────────*/
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAcctName.trim()) return;
    try {
      await api.post("/account", { name: newAcctName.trim(), accountType: "FX_COMMODITY" });
      setNewAcctName("");
      setShowAcctForm(false);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Could not create account");
    }
  }

  /*────────────────── Create FX Trade ─────────────────*/
  async function handleCreateTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) return setError("No account selected");
    if (!formInstrument.trim()) return setError("Instrument is required");

    const numericFees = parseFloat(formFees) || 0;
    const aGain = parseFloat(fxAmountGain) || 0;
    const pGain = parseFloat(fxPercentageGain) || 0;

    /* percentage overrides when both are filled */
    let fxData: any = {};
    if (aGain !== 0 && pGain !== 0) fxData = { amountGain: null, percentageGain: pGain / 100 };
    else if (pGain !== 0) fxData = { percentageGain: pGain / 100 };
    else if (aGain !== 0) fxData = { amountGain: aGain };

    fxData = {
      ...fxData,
      lots: parseFloat(fxLots) || null,
      entryPrice: parseFloat(fxEntryPrice) || null,
      exitPrice: parseFloat(fxExitPrice) || null,
      stopLossPips: parseFloat(fxStopLossPips) || null,
      pipsGain: parseFloat(fxPipsGain) || null,
    };

    const body = {
      tradeType: "FX",
      accountId: selectedAccountId,
      instrument: formInstrument.trim(),
      direction: formDirection === "SHORT" ? "Short" : "Long",
      fees: numericFees,
      entryDate: new Date(formDate).toISOString(), //  ← correct field
      pattern: formPattern || "",
      fx: fxData,
    };

    try {
      const creationRes = await api.post("/trade", body);
      const newTradeId = creationRes.data.tradeId;

      /*──────── Upload media if any ────────*/
      const files: (File | null)[] = [];
      const mediaData = createMediaList.map((m) => {
        let index: number | null = null;
        if (m.file) {
          index = files.length;
          files.push(m.file);
        }
        return { tagName: m.tagName, description: m.description, externalUrl: m.externalUrl, index };
      });

      if (mediaData.length) {
        const fd = new FormData();
        files.forEach((f) => f && fd.append("images", f));
        fd.append("mediaData", JSON.stringify(mediaData));
        await api.post(`/trade/${newTradeId}/media`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      /*──────── Reset form ────────*/
      setFormInstrument("");
      setFormDirection("LONG");
      setFormFees("0");
      setFormDate(new Date().toISOString().slice(0, 19));
      setFormPattern("");
      setFxAmountGain("0");
      setFxPercentageGain("0");
      setFxLots("0");
      setFxEntryPrice("0");
      setFxExitPrice("0");
      setFxStopLossPips("0");
      setFxPipsGain("0");
      setCreateMediaList([{ tagName: "", description: "", externalUrl: "", file: null }]);
      setShowFxAdvanced(false);
      setShowNewTrade(false);

      await loadTrades(selectedAccountId);
      await loadAccounts();
    } catch (err) {
      console.error("Create trade error:", err);
      setError("Could not create trade. Please check your inputs and try again.");
    }
  }

  /*────────────────── Delete trade ─────────────────*/
  async function handleDeleteTrade(tradeId: number) {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    try {
      await api.delete(`/trade/${tradeId}`);
      await loadTrades(selectedAccountId!);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Failed to delete trade");
    }
  }

  /*────────────────── Edit helpers unchanged … ─────────────────*/
  // EDIT trade
  function openEditModal(trade: Trade) {
    setEditTrade(trade);
    setEditFxAmount(String(trade.fxTrade?.amountGain || "0"));
    setEditFxPercent(String(trade.fxTrade?.percentageGain ? (trade.fxTrade.percentageGain * 100) : "0"));
    setShowEditModal(true);
  }

  async function handleEditTradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTrade.id) return;

    try {
      const numericFees = parseFloat(String(editTrade.fees)) || 0;
      const aGain = parseFloat(editFxAmount) || 0;
      const pGain = parseFloat(editFxPercent) || 0;

      let fxData: any = {};
      if (aGain !== 0 && pGain !== 0) {
        fxData = { amountGain: null, percentageGain: pGain / 100 };
      } else if (aGain !== 0) {
        fxData = { amountGain: aGain };
      } else if (pGain !== 0) {
        fxData = { percentageGain: pGain / 100 };
      }

      await api.put(`/trade/${editTrade.id}`, {
        instrument: editTrade.instrument,
        direction: editTrade.tradeDirection === "SHORT" ? "Short" : "Long",
        fees: numericFees,
        dateTime: editTrade.entryDate ? new Date(editTrade.entryDate).toISOString() : new Date().toISOString(),
        pattern: editTrade.pattern,
        fx: fxData,
      });

      setShowEditModal(false);
      if (selectedAccountId) await loadTrades(selectedAccountId);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Failed to edit trade. Please check your inputs and try again.");
    }
  }
  /*────────────────── Loading splash ─────────────────*/
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)] text-[var(--text)]">
        <p>Loading Trading Page...</p>
      </div>
    );
  }

  /*────────────────── Helper: render trades table rows ─────────────────*/
  const renderTradeRows = trades.slice(0, pageSize).map((t) => {
    const amountGain = t.realizedPL ?? 0;
    const percentGain =
      t.openingBalance && t.realizedPL != null ? (t.realizedPL / t.openingBalance) * 100 : 0;

    return (
      <tr key={t.id} className="hover:bg-[var(--background-2)]">
        <td className="border p-2 text-sm">{new Date(t.entryDate).toLocaleString()}</td>
        <td className="border p-2 text-sm">{t.instrument}</td>
        <td className="border p-2 text-sm">{t.tradeDirection === "LONG" ? "Long" : "Short"}</td>
        <td className="border p-2 text-sm">{t.fees.toFixed(2)}</td>
        <td className="border p-2 text-sm">
          {percentGain.toFixed(2)}% / ${amountGain.toFixed(2)}
        </td>
        <td className="border p-2 text-sm">
          {t.openingBalance != null ? t.openingBalance.toFixed(2) : "N/A"}
        </td>
        <td className="border p-2 text-sm">
          {t.closingBalance != null ? t.closingBalance.toFixed(2) : "N/A"}
        </td>
        <td className="border p-2 text-sm">
          <div className="flex gap-1">
            <button
              onClick={() => openEditModal(t)}
              className="px-2 py-1 bg-yellow-400 text-gray-800 rounded text-xs"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteTrade(t.id)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
    );
  });

  /*────────────────── JSX ─────────────────*/
  return (
    <div className="p-4 min-h-screen bg-[var(--background)] text-[var(--text)]">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/*──────── Header + advanced filter shortcut────────*/}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">FX Trading</h1>
          <button
            onClick={() => router.push("/trading/advanced-filter")}
            className="mt-2 md:mt-0 px-4 py-2 bg-[var(--primary)] text-white font-semibold rounded"
          >
            Advanced Filter
          </button>
        </div>

        {/*──────── Account selector────────*/}
        <div className="bg-[var(--background-2)] p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">FX Accounts</h2>
            <button
              onClick={() => setShowAcctForm((s) => !s)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              {showAcctForm ? "Cancel" : "+ Account"}
            </button>
          </div>

          {showAcctForm && (
            <form onSubmit={handleCreateAccount} className="mb-4">
              <input
                type="text"
                className="border p-2 rounded w-full mb-2 bg-[var(--background)] text-[var(--text)]"
                placeholder="New FX Account Name"
                value={newAcctName}
                onChange={(e) => setNewAcctName(e.target.value)}
              />
              <button type="submit" className="w-full py-2 bg-[var(--primary)] text-white rounded">
                Create
              </button>
            </form>
          )}

          {accounts.length === 0 ? (
            <p className="text-sm">No FX accounts found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {accounts.map((ac) => (
                <button
                  key={ac.id}
                  onClick={() => setSelectedAccountId(ac.id)}
                  className={`p-3 border rounded-lg text-left ${
                    ac.id === selectedAccountId
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background-2)] hover:bg-[var(--background)]"
                  }`}
                >
                  <div className="font-medium">{ac.name}</div>
                  <div className="text-sm">
                    {ac.balance.toFixed(2)} {ac.currency}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/*──────── Trades Panel────────*/}
        <div className="bg-[var(--background-2)] p-4 rounded-lg shadow">
          {selectedAccountId ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-xl font-semibold mb-2 sm:mb-0">Trades</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border p-1 rounded text-sm bg-[var(--background)]"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                  <button
                    onClick={() => setShowNewTrade((v) => !v)}
                    className="px-3 py-1 bg-[var(--primary)] text-white rounded"
                  >
                    {showNewTrade ? "Close" : "New Trade"}
                  </button>
                </div>
              </div>

              {/*──────── New Trade Form────────*/}
              {showNewTrade && (
                <div className="border bg-[var(--background-2)] p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-3">New FX Trade</h3>
                  <form onSubmit={handleCreateTrade} className="space-y-4">
                    {/* instrument / direction */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-medium text-sm mb-1">Instrument</label>
                        <select
                          className="border p-2 rounded w-full bg-[var(--background)]"
                          value={formInstrument}
                          onChange={(e) => setFormInstrument(e.target.value)}
                          required
                        >
                          <option value="">Select instrument</option>
                          {instruments.map((inst) => (
                            <option key={inst} value={inst}>
                              {inst}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-sm mb-1">Direction</label>
                        <select
                          className="border p-2 rounded w-full bg-[var(--background)]"
                          value={formDirection}
                          onChange={(e) =>
                            setFormDirection(e.target.value as "LONG" | "SHORT")
                          }
                        >
                          <option value="LONG">Long</option>
                          <option value="SHORT">Short</option>
                        </select>
                      </div>
                    </div>

                    {/* fees / date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-medium text-sm mb-1">Fees</label>
                        <input
                          type="text"
                          className="border p-2 rounded w-full bg-[var(--background)]"
                          value={formFees}
                          onChange={(e) => setFormFees(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-sm mb-1">Date/Time</label>
                        <input
                          type="datetime-local"
                            step="1"
                          className="border p-2 rounded w-full bg-[var(--background)]"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* pattern */}
                    <div>
                      <label className="block font-medium text-sm mb-1">Pattern</label>
                      <select
                        className="border p-2 rounded w-full bg-[var(--background)]"
                        value={formPattern}
                        onChange={(e) => setFormPattern(e.target.value)}
                      >
                        <option value="">(none)</option>
                        {patterns.map((pat) => (
                          <option key={pat} value={pat}>
                            {pat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/*──────── FX basic gains────────*/}
                    <div className="border bg-[var(--background-2)] p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm">FX Gains</h4>
                        <button
                          type="button"
                          onClick={() => setShowFxAdvanced((v) => !v)}
                          className="text-sm text-blue-600"
                        >
                          {showFxAdvanced ? "Hide Advanced" : "Show Advanced"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-1">Amount Gain ($)</label>
                          <input
                            type="text"
                            className="w-full border p-2 rounded bg-[var(--background)]"
                            value={fxAmountGain}
                            onChange={(e) => setFxAmountGain(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">% Gain</label>
                          <input
                            type="text"
                            className="w-full border p-2 rounded bg-[var(--background)]"
                            value={fxPercentageGain}
                            onChange={(e) => setFxPercentageGain(e.target.value)}
                          />
                        </div>
                      </div>

                      {showFxAdvanced && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-sm mb-1">Lots</label>
                            <input
                              type="text"
                              className="w-full border p-2 rounded bg-[var(--background)]"
                              value={fxLots}
                              onChange={(e) => setFxLots(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Entry Price</label>
                            <input
                              type="text"
                              className="w-full border p-2 rounded bg-[var(--background)]"
                              value={fxEntryPrice}
                              onChange={(e) => setFxEntryPrice(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Exit Price</label>
                            <input
                              type="text"
                              className="w-full border p-2 rounded bg-[var(--background)]"
                              value={fxExitPrice}
                              onChange={(e) => setFxExitPrice(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Stop-Loss (pips)</label>
                            <input
                              type="text"
                              className="w-full border p-2 rounded bg-[var(--background)]"
                              value={fxStopLossPips}
                              onChange={(e) => setFxStopLossPips(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Pips Gain</label>
                            <input
                              type="text"
                              className="w-full border p-2 rounded bg-[var(--background)]"
                              value={fxPipsGain}
                              onChange={(e) => setFxPipsGain(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[var(--primary)] text-white rounded"
                    >
                      Create Trade
                    </button>
                  </form>
                </div>
              )}

              {/*──────── Trades table────────*/}
              {trades.length === 0 ? (
                <p>No trades found for this account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-[var(--background-2)]">
                      <tr>
                        <th className="border p-2 text-left text-sm">Date/Time</th>
                        <th className="border p-2 text-left text-sm">Instrument</th>
                        <th className="border p-2 text-left text-sm">Direction</th>
                        <th className="border p-2 text-left text-sm">Fees</th>
                        <th className="border p-2 text-left text-sm">Gain</th>
                        <th className="border p-2 text-left text-sm">Pre-Trade</th>
                        <th className="border p-2 text-left text-sm">Post-Trade</th>
                        <th className="border p-2 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{renderTradeRows}</tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p>Please select an account.</p>
          )}
        </div>
      </div>

      {/*──────── Edit modal (unchanged from your original) ────────*/}
  {showEditModal && editTrade.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background-2)] rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Edit Trade #{editTrade.id}</h3>
              
              <form onSubmit={handleEditTradeSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-sm mb-1">Instrument</label>
                    <input
                      type="text"
                      className="border p-2 rounded w-full bg-[var(--background)] text-[var(--text)]"
                      value={editTrade.instrument || ""}
                      onChange={(e) =>
                        setEditTrade((prev) => ({ ...prev, instrument: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-sm mb-1">Direction</label>
                    <select
                      className="border p-2 rounded w-full bg-[var(--background)] text-[var(--text)]"
                      value={editTrade.tradeDirection || "LONG"}
                      onChange={(e) =>
                        setEditTrade((prev) => ({
                          ...prev,
                          tradeDirection: e.target.value === "SHORT" ? "SHORT" : "LONG",
                        }))
                      }
                    >
                      <option value="LONG">Long</option>
                      <option value="SHORT">Short</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-sm mb-1">Fees</label>
                    <input
                      type="text"
                      className="border p-2 rounded w-full bg-[var(--background)] text-[var(--text)]"
                      value={String(editTrade.fees ?? "0")}
                      onChange={(e) =>
                        setEditTrade((prev) => ({
                          ...prev,
                          fees: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-sm mb-1">Date/Time</label>
                    <input
                      type="datetime-local"
                      className="border p-2 rounded w-full bg-[var(--background)] text-[var(--text)]"
                      value={
                        editTrade.entryDate
                          ? new Date(editTrade.entryDate).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditTrade((prev) => ({ ...prev, entryDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-sm mb-1">Pattern</label>
                  <select
                    className="border p-2 rounded w-full bg-[var(--background)] text-[var(--text)]"
                    value={editTrade.pattern || ""}
                    onChange={(e) => setEditTrade((prev) => ({ ...prev, pattern: e.target.value }))}
                  >
                    <option value="">(none)</option>
                    {patterns.map((pat) => (
                      <option key={pat} value={pat}>
                        {pat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border bg-[var(--background-2)] p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">FX Gains</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Amount Gain ($)</label>
                      <input
                        type="text"
                        className="w-full border p-2 rounded bg-[var(--background)] text-[var(--text)]"
                        value={editFxAmount}
                        onChange={(e) => setEditFxAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">% Gain</label>
                      <input
                        type="text"
                        className="w-full border p-2 rounded bg-[var(--background)] text-[var(--text)]"
                        value={editFxPercent}
                        onChange={(e) => setEditFxPercent(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border rounded bg-[var(--background)] text-[var(--text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}