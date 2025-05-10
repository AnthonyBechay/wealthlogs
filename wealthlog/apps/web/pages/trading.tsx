// pages/trading.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";

interface FinancialAccount {
  id: number;
  userId: number;
  name: string;
  accountType: string; // e.g. "FX_COMMODITY", ...
  balance: number;
  currency: string;
}

interface FxTrade {
  amountGain?: number | null;      // e.g. 100
  percentageGain?: number | null;  // e.g. 0.05 => 5%
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
  tradeType: string; // e.g. "FX"
  instrument: string;
  tradeDirection: "LONG" | "SHORT";
  fees: number;
  entryDate: string; // e.g. "2023-03-22T10:00:00.000Z"
  pattern?: string;
  notes?: string;
  fxTrade?: FxTrade;
  media: TradeMedia[];

  // We'll store a local field for the post-trade account balance:
  postTradeBalance?: number;
}

/** Convert enum-based accountType to a label. */
function accountTypeToLabel(at: string): string {
  switch (at) {
    case "FX_COMMODITY":
      return "FX";
    case "BONDS":
      return "BOND";
    case "STOCKS":
      return "STOCK";
    case "CRYPTO":
      return "CRYPTO";
    default:
      return "OTHER";
  }
}

// We store media items for new or edit flows:
interface MediaTagItem {
  tagName: string;      // user picks from mediaTags or types new
  description: string;
  externalUrl: string;
  file?: File | null;
}

export default function TradingPage() {
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Accounts & tabs
  const [allAccounts, setAllAccounts] = useState<FinancialAccount[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [typeAccounts, setTypeAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Trades
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pageSize, setPageSize] = useState(10);

  // Settings: instruments, patterns, media tags
  const [instruments, setInstruments] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [mediaTags, setMediaTags] = useState<string[]>([]);

  // CREATE ACCOUNT
  const [showAcctForm, setShowAcctForm] = useState(false);
  const [newAcctName, setNewAcctName] = useState("");

  // CREATE TRADE (inline)
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [formInstrument, setFormInstrument] = useState("");
  const [formDirection, setFormDirection] = useState("Long");
  const [formFees, setFormFees] = useState("0");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [formPattern, setFormPattern] = useState("");
  const [fxAmountGain, setFxAmountGain] = useState("0");
  const [fxPercentageGain, setFxPercentageGain] = useState("0");
  const [createMediaList, setCreateMediaList] = useState<MediaTagItem[]>([]);
  const [showFxAdvanced, setShowFxAdvanced] = useState(false);
  const [fxLots, setFxLots] = useState("0");
  const [fxEntryPrice, setFxEntryPrice] = useState("0");
  const [fxExitPrice, setFxExitPrice] = useState("0");
  const [fxStopLossPips, setFxStopLossPips] = useState("0");
  const [fxPipsGain, setFxPipsGain] = useState("0");


  // EDIT TRADE
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTrade, setEditTrade] = useState<Partial<Trade>>({});
  const [editMediaList, setEditMediaList] = useState<MediaTagItem[]>([]);
  const [editFxAmount, setEditFxAmount] = useState("0");
  const [editFxPercent, setEditFxPercent] = useState("0");

  // OLD separate "upload image"
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [activeTradeId, setActiveTradeId] = useState<number | null>(null);
  const [labelName, setLabelName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me");

      // load accounts
      await loadAccounts();

      // load settings
      const s = await api.get("/settings");
      setInstruments(s.data.instruments || []);
      setPatterns(s.data.patterns || []);
      setMediaTags(s.data.mediaTags || []);
    } catch (err) {
      router.push("/login");
    } finally {
      setInitialLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const res = await api.get<FinancialAccount[]>("/account");
      const accounts = res.data || [];
      setAllAccounts(accounts);

      // build tabs
      const uniqueTypes = new Set<string>();
      for (const ac of accounts) {
        uniqueTypes.add(accountTypeToLabel(ac.accountType));
      }
      const tabLabels = Array.from(uniqueTypes);
      setTabs(tabLabels);

      if (tabLabels.length > 0) {
        if (!tabLabels.includes(activeTab)) {
          setActiveTab(tabLabels[0]);
        }
      } else {
        setActiveTab("");
      }
    } catch (err) {
      setError("Failed to load accounts");
      console.error(err);
    }
  }

  // whenever activeTab changes, filter accounts
  useEffect(() => {
    if (!activeTab) {
      setTypeAccounts([]);
      setSelectedAccountId(null);
      setTrades([]);
      return;
    }
    const mapped = allAccounts.filter(
      (a) => accountTypeToLabel(a.accountType) === activeTab
    );
    setTypeAccounts(mapped);
    if (mapped.length > 0) {
      if (!mapped.some((a) => a.id === selectedAccountId)) {
        setSelectedAccountId(mapped[0].id);
      }
    } else {
      setSelectedAccountId(null);
      setTrades([]);
    }
  }, [activeTab, allAccounts]);

  // load trades for selected account
  useEffect(() => {
    if (selectedAccountId) {
      loadTrades(selectedAccountId);
    } else {
      setTrades([]);
    }
  }, [selectedAccountId]);

  async function loadTrades(acctId: number) {
    setError("");
    try {
      const acct = allAccounts.find((a) => a.id === acctId);
      if (!acct) return;
      const tType = accountTypeToLabel(acct.accountType);

      const params = new URLSearchParams({
        accountId: String(acctId),
        tradeType: tType,
      });
      const res = await api.get<Trade[]>(`/trade?${params.toString()}`);
      const rawTrades = res.data || [];

      // We do a local pass to compute postTradeBalance after each trade
      // sort them by entryDate ascending
      const sortedTrades = [...rawTrades].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      );
      let runningBalance = acct.balance; // or 0 if you want a "start"?
      for (const trade of sortedTrades) {
        // subtract fees
        runningBalance -= trade.fees;
        // if FX => do Gains
        let amtGain = 0;
        if (trade.tradeType === "FX" && trade.fxTrade) {
          // if we have percentageGain, apply it
          if (trade.fxTrade.percentageGain != null) {
            amtGain = runningBalance * trade.fxTrade.percentageGain;
          } else if (trade.fxTrade.amountGain != null) {
            amtGain = trade.fxTrade.amountGain;
          }
          runningBalance += amtGain;
        }
        // if BOND, STOCK, etc. you'd do logic for Gains or dividends
        trade.postTradeBalance = runningBalance;
      }

      // Now store them back in descending order for the table if desired
      // or keep them in ascending. Let's keep descending for your UI
      sortedTrades.reverse();
      setTrades(sortedTrades);
    } catch (err) {
      setError("Could not load trades");
      console.error(err);
    }
  }

  // CREATE ACCOUNT
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAcctName.trim()) return;
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
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Could not create account");
    }
  }

  // TOGGLE new trade form inline
  function toggleNewTradeForm() {
    if (!showNewTrade) {
      // reset fields
      setFormInstrument("");
      setFormDirection("Long");
      setFormFees("0");
      setFormDate(new Date().toISOString().slice(0, 16));
      setFormPattern("");
      setFxAmountGain("0");
      setFxPercentageGain("0");
      setCreateMediaList([{ tagName: "", description: "", externalUrl: "", file: null }]);
    }
    setShowNewTrade(!showNewTrade);
  }

  function addCreateMediaItem() {
    setCreateMediaList((prev) => [...prev, { tagName: "", description: "", externalUrl: "", file: null }]);
  }

  function handleCreateMediaChange(
    index: number,
    field: keyof MediaTagItem,
    value: string | File | null
  ) {
    setCreateMediaList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  // CREATE trade with Gains
  async function handleCreateTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) {
      setError("No account selected");
      return;
    }
    if (!formInstrument.trim()) {
      setError("Instrument is required");
      return;
    }

    // parse fees
    const numericFees = parseFloat(formFees) || 0;

    // parse Gains
    let fxData: any = undefined;
    if (activeTab === "FX") {
      const lots                = parseFloat(fxLots)        || null;
      const entryPrice          = parseFloat(fxEntryPrice)  || null;
      const exitPrice           = parseFloat(fxExitPrice)   || null;
      const stopLossPips        = parseFloat(fxStopLossPips)|| null;
      const pipsGain            = parseFloat(fxPipsGain)    || null;
      const aGain = parseFloat(fxAmountGain) || 0;
      const pGain = parseFloat(fxPercentageGain) || 0;
      if (aGain !== 0 && pGain !== 0) {
        // prefer percentage => convert pGain from % to fraction
        fxData = { amountGain: null, percentageGain: pGain / 100 };
      } else if (aGain !== 0) {
        fxData = { amountGain: aGain };
      } else if (pGain !== 0) {
        fxData = { percentageGain: pGain / 100 };
      }

      fxData = {
        ...fxData,
        lots,
        entryPrice,
        exitPrice,
        stopLossPips,
        pipsGain,
      };
      
    }

    

    // pick tradeType from account
    const acct = allAccounts.find((a) => a.id === selectedAccountId);
    if (!acct) return;
    const tradeType = accountTypeToLabel(acct.accountType);

    const body: any = {
      tradeType,
      accountId: selectedAccountId,
      instrument: formInstrument.trim(),
      direction: formDirection,
      fees: numericFees,
      dateTime: new Date(formDate).toISOString(),
      pattern: formPattern || "",
    };
    if (fxData) body.fx = fxData;

    try {
      const creationRes = await api.post("/trade", body);
      const newTradeId = creationRes.data.tradeId;

      // attach multiple media
      const files: (File | null)[] = [];
      const mediaData = createMediaList.map((m, i) => {
        let index: number | null = null;
        if (m.file) {
          index = files.length;
          files.push(m.file);
        }
        return {
          tagName: m.tagName,
          description: m.description,
          externalUrl: m.externalUrl,
          index,
        };
      });
      if (mediaData.length > 0) {
        const formData = new FormData();
        files.forEach((f) => {
          if (f) formData.append("images", f);
        });
        formData.append("mediaData", JSON.stringify(mediaData));
        await api.post(`/trade/${newTradeId}/media`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Trade created");
      setShowNewTrade(false);
      await loadTrades(selectedAccountId);
      await loadAccounts();
    } catch (err) {
      console.error("Create trade error:", err);
      setError("Could not create trade");
    }
  }

  // DELETE trade
  async function handleDeleteTrade(tradeId: number) {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/trade/${tradeId}`);
      if (selectedAccountId) await loadTrades(selectedAccountId);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Failed to delete trade");
    }
  }

  // EDIT trade
  function openEditModal(trade: Trade) {
    setError("");
    setEditTrade({
      id: trade.id,
      tradeType: trade.tradeType,
      instrument: trade.instrument,
      tradeDirection: trade.tradeDirection,
      fees: trade.fees,
      entryDate: trade.entryDate,
      pattern: trade.pattern || "",
    });

    // if FX => fill Gains
    if (trade.tradeType === "FX" && trade.fxTrade) {
      const aGain = trade.fxTrade.amountGain || 0;
      const pGain = trade.fxTrade.percentageGain || 0;
      // convert fraction to percent
      setEditFxAmount(String(aGain));
      setEditFxPercent(String(pGain ? pGain * 100 : 0));
    } else {
      setEditFxAmount("0");
      setEditFxPercent("0");
    }

    // init with 1 blank media item
    setEditMediaList([{ tagName: "", description: "", externalUrl: "", file: null }]);
    setShowEditModal(true);
  }

  function addEditMediaItem() {
    setEditMediaList((prev) => [...prev, { tagName: "", description: "", externalUrl: "", file: null }]);
  }

  function handleEditMediaChange(
    index: number,
    field: keyof MediaTagItem,
    value: string | File | null
  ) {
    setEditMediaList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleEditTradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTrade.id) return;

    try {
      const dt = editTrade.entryDate
        ? new Date(editTrade.entryDate).toISOString()
        : new Date().toISOString();
      // parse fees
      const numericFees = parseFloat(String(editTrade.fees)) || 0;

      // handle Gains if FX
      let fxData: any = null;
      if (editTrade.tradeType === "FX") {
        const aGain = parseFloat(editFxAmount) || 0;
        const pGain = parseFloat(editFxPercent) || 0;
        if (aGain !== 0 && pGain !== 0) {
          // prefer percentage
          fxData = { amountGain: null, percentageGain: pGain / 100 };
        } else if (aGain !== 0) {
          fxData = { amountGain: aGain };
        } else if (pGain !== 0) {
          fxData = { percentageGain: pGain / 100 };
        }
      }

      // update main trade
      await api.put(`/trade/${editTrade.id}`, {
        instrument: editTrade.instrument,
        direction: editTrade.tradeDirection === "SHORT" ? "Short" : "Long",
        fees: numericFees,
        dateTime: dt,
        pattern: editTrade.pattern,
        fx: fxData || {},
      });

      // attach multiple new media
      const files: (File | null)[] = [];
      const mediaData = editMediaList.map((m, i) => {
        let index: number | null = null;
        if (m.file) {
          index = files.length;
          files.push(m.file);
        }
        return {
          tagName: m.tagName,
          description: m.description,
          externalUrl: m.externalUrl,
          index,
        };
      });
      if (mediaData.length > 0) {
        const formData = new FormData();
        files.forEach((f) => {
          if (f) formData.append("images", f);
        });
        formData.append("mediaData", JSON.stringify(mediaData));
        await api.post(`/trade/${editTrade.id}/media`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Trade updated");
      setShowEditModal(false);
      if (selectedAccountId) await loadTrades(selectedAccountId);
      await loadAccounts();
    } catch (err) {
      console.error(err);
      setError("Failed to edit trade");
    }
  }

  // DELETE existing media from a trade
  async function handleDeleteMedia(mediaId: number) {
    if (!confirm("Are you sure you want to delete this media?")) return;
    try {
      // Suppose your route is: DELETE /trade/media/:mediaId
      await api.delete(`/trade/media/${mediaId}`);
      alert("Media deleted");
      // optionally reload the trade
      if (selectedAccountId) await loadTrades(selectedAccountId);
    } catch (err) {
      console.error("Failed to delete media:", err);
      setError("Could not delete media");
    }
  }

  // Old separate +Img approach
  async function handleUploadImage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTradeId || !selectedFile) return;
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      if (labelName.trim()) formData.append("labelName", labelName);

      await api.post(`/trade/${activeTradeId}/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Image uploaded");
      setShowImageUploadModal(false);
      setLabelName("");
      setSelectedFile(null);
      if (selectedAccountId) await loadTrades(selectedAccountId);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError("Could not upload image");
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)]">
        <p>Loading Trading Page...</p>
      </div>
    );
  }

  // show trades up to pageSize
  const shownTrades = trades.slice(0, pageSize);

  return (
    <div className="p-4 min-h-screen bg-[var(--background-2)] text-[var(--text)] bg-[var(--background)] text-[var(--text)]">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 0 ? (
        <div className="flex gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded font-semibold ${
                t === activeTab ? "bg-[var(--primary)] text-white" : "bg-[var(--background-2)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[var(--text)] mb-4">No accounts found yet.</p>
      )}

      {/* Layout: Accounts on left, Trades on right */}
      <div className="flex gap-4">
        {/* Left: Accounts */}
        <div className="w-1/4 bg-[var(--background-2)] p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Accounts</h2>
            <button
              onClick={() => setShowAcctForm(!showAcctForm)}
              className="px-2 py-1 bg-green-600 text-white rounded text-sm"
            >
              {showAcctForm ? "Cancel" : "+ Account"}
            </button>
          </div>
          {showAcctForm && (
            <form onSubmit={handleCreateAccount} className="mb-4">
              <input
                type="text"
                className="border p-2 rounded w-full mb-2"
                placeholder={`New ${activeTab} Account Name`}
                value={newAcctName}
                onChange={(e) => setNewAcctName(e.target.value)}
              />
              <button
                type="submit"
                className="w-full py-2 bg-[var(--primary)] text-white font-semibold rounded"
              >
                Create
              </button>
            </form>
          )}
          {typeAccounts.length === 0 ? (
            <p className="text-sm text-[var(--text)]">No {activeTab} accounts found.</p>
          ) : (
            <div className="space-y-2">
              {typeAccounts.map((ac) => (
                <button
                  key={ac.id}
                  onClick={() => setSelectedAccountId(ac.id)}
                  className={`block w-full text-left p-2 border rounded ${
                    ac.id === selectedAccountId
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--background-2)] hover:bg-[var(--background-2)]"
                  }`}
                >
                  {ac.name}{" "}
                  <span className="text-xs">
                    (bal: {ac.balance} {ac.currency})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Trades */}
        <div className="flex-1 bg-[var(--background-2)] p-4 rounded shadow">
          {selectedAccountId ? (
            <>
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold">Trades</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Page Size:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="border p-1 rounded"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <button
                    onClick={toggleNewTradeForm}
                    className="px-3 py-1 bg-[var(--primary)] text-white rounded"
                  >
                    {showNewTrade ? "Close" : "New Trade"}
                  </button>
                </div>
              </div>

              {/* Inline "New Trade" form */}
              {showNewTrade && (
                <div className="border p-3 bg-[var(--background-2)] rounded mb-4">
                  <h3 className="text-lg font-semibold mb-2">Create New Trade</h3>
                  <form onSubmit={handleCreateTrade} className="space-y-3">
                    <div>
                      <label className="block font-medium">Instrument</label>
                      <select
                        className="border p-2 rounded w-full"
                        value={formInstrument}
                        onChange={(e) => setFormInstrument(e.target.value)}
                        required
                      >
                        <option value="">--Select--</option>
                        {instruments.map((inst) => (
                          <option key={inst} value={inst}>
                            {inst}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium">Direction</label>
                      <select
                        className="border p-2 rounded w-full"
                        value={formDirection}
                        onChange={(e) => setFormDirection(e.target.value)}
                      >
                        <option value="Long">Long</option>
                        <option value="Short">Short</option>
                      </select>
                    </div>

                    {/* Fees => type="text" to avoid scroll changes */}
                    <div>
                      <label className="block font-medium">Fees</label>
                      <input
                        type="text"
                        className="border p-2 rounded w-full"
                        value={formFees}
                        onChange={(e) => setFormFees(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block font-medium">Date/Time</label>
                      <input
                        type="datetime-local"
                        className="border p-2 rounded w-full"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>

                    {/* Pattern => from settings */}
                    <div>
                      <label className="block font-medium">Pattern</label>
                      <select
                        className="border p-2 rounded w-full"
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

                    {activeTab === "FX" && (
  <div className="border bg-[var(--background-2)] p-3 rounded space-y-3">
    <div className="flex justify-between items-center">
      <p className="font-medium text-sm">FX Details</p>
      <button
        type="button"
        onClick={() => setShowFxAdvanced(!showFxAdvanced)}
        className="text-sm text-blue-600"
      >
        {showFxAdvanced ? "Hide Advanced" : "Show Advanced"}
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* amount & percentage */}
      <div>
        <label className="block text-sm">Amount Gain ($)</label>
        <input
          type="text"
          className="w-full border p-1 rounded"
          value={fxAmountGain}
          onChange={e => setFxAmountGain(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm">% Gain</label>
        <input
          type="text"
          className="w-full border p-1 rounded"
          value={fxPercentageGain}
          onChange={e => setFxPercentageGain(e.target.value)}
        />
      </div>

          {/* advanced fields, only if toggled */}
          {showFxAdvanced && (
            <>
              <div>
                <label className="block text-sm">Lots</label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={fxLots}
                  onChange={e => setFxLots(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm">Entry Price</label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={fxEntryPrice}
                  onChange={e => setFxEntryPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm">Exit Price</label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={fxExitPrice}
                  onChange={e => setFxExitPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm">Stop-Loss (pips)</label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={fxStopLossPips}
                  onChange={e => setFxStopLossPips(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm">Pips Gain</label>
                <input
                  type="text"
                  className="w-full border p-1 rounded"
                  value={fxPipsGain}
                  onChange={e => setFxPipsGain(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    )}


                    {/* Multiple media items */}
                    <div className="border bg-[var(--background)] p-3 rounded">
                      <h4 className="font-medium text-sm mb-2">Attach Multiple Media</h4>
                      {createMediaList.map((m, i) => (
                        <div key={i} className="border p-2 rounded mb-2 bg-[var(--background-2)] ">
                          <label className="block text-sm font-semibold">Tag:</label>
                          <select
                            className="border p-1 rounded w-full"
                            value={m.tagName}
                            onChange={(e) => handleCreateMediaChange(i, "tagName", e.target.value)}
                          >
                            <option value="">--None--</option>
                            {mediaTags.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="or new tag"
                            className="border p-1 rounded w-full mt-1"
                            value={m.tagName}
                            onChange={(e) => handleCreateMediaChange(i, "tagName", e.target.value)}
                          />
                          <label className="block text-sm font-semibold mt-2">
                            Description
                          </label>
                          <input
                            type="text"
                            className="border p-1 rounded w-full"
                            value={m.description}
                            onChange={(e) =>
                              handleCreateMediaChange(i, "description", e.target.value)
                            }
                          />
                          <label className="block text-sm font-semibold mt-2">
                            External URL
                          </label>
                          <input
                            type="text"
                            className="border p-1 rounded w-full"
                            value={m.externalUrl}
                            onChange={(e) =>
                              handleCreateMediaChange(i, "externalUrl", e.target.value)
                            }
                          />
                          <p className="text-xs text-[var(--text)]">If provided, file is ignored.</p>
                          <label className="block text-sm font-semibold mt-2">Local File</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleCreateMediaChange(i, "file", e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCreateMediaItem}
                        className="px-2 py-1 bg-green-600 text-white rounded"
                      >
                        + Media
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-[var(--primary)] text-white font-semibold rounded"
                    >
                      Create
                    </button>
                  </form>
                </div>
              )}

              {/* TRADES TABLE */}
              {shownTrades.length === 0 ? (
                <p className="text-[var(--text)]">No trades found for this account.</p>
              ) : (
                <table className="w-full border text-sm">
                  <thead className="bg-[var(--background-2)]">
                    <tr>
                      <th className="border p-2">Date/Time</th>
                      <th className="border p-2">Instrument</th>
                      <th className="border p-2">Direction</th>
                      <th className="border p-2">Fees</th>
                      {/* #6 Gains column with % and $ */}
                      <th className="border p-2">Gain</th>
                      {/* #3 Add "Account Amount" column */}
                      <th className="border p-2">Account Amount</th>
                      {/* #4 Pattern was changed to a dropdown above, but we can still show it here */}
                      <th className="border p-2">Pattern</th>
                      <th className="border p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownTrades.map((t) => {
                      let amountGain = 0;
                      let percentGain = 0;
                      if (t.tradeType === "FX" && t.fxTrade) {
                        // parse either
                        if (t.fxTrade.amountGain != null) {
                          amountGain = t.fxTrade.amountGain;
                        }
                        if (t.fxTrade.percentageGain != null) {
                          percentGain = t.fxTrade.percentageGain * 100;
                        }
                        // if only amountGain was stored, compute approximate percent:
                        if (amountGain && !percentGain && t.postTradeBalance != null) {
                          // recalculate the true pre-trade balance by undoing both gain and fees:
                          const preBalance = t.postTradeBalance - amountGain + (t.fees || 0);
                          // now %-gain = profit ÷ true starting balance
                          percentGain = 100 * (amountGain / (preBalance || 1));
                        }
                        else if (percentGain && !amountGain && t.postTradeBalance) {
                          // if only % => compute approximate $?
                          amountGain = (percentGain / 100) * (t.postTradeBalance / (1 + percentGain / 100));
                        }
                      }

                      return (
                        <tr key={t.id}>
                          <td className="border p-2">
                            {new Date(t.entryDate).toLocaleString()}
                          </td>
                          <td className="border p-2">{t.instrument}</td>
                          <td className="border p-2">
                            {t.tradeDirection === "LONG" ? "Long" : "Short"}
                          </td>
                          {/* #5 number fields replaced => we just show them, no changes needed here */}
                          <td className="border p-2">{t.fees}</td>
                          {/* #6 show both % and $ */}
                          <td className="border p-2">
                            {percentGain.toFixed(2)}% / ${amountGain.toFixed(2)}
                          </td>
                          {/* #3 show "Account Amount" => t.postTradeBalance */}
                          <td className="border p-2">
                            {t.postTradeBalance != null
                              ? t.postTradeBalance.toFixed(2)
                              : "??"}
                          </td>
                          <td className="border p-2">{t.pattern || ""}</td>
                          <td className="border p-2">
                            <button
                              onClick={() => openEditModal(t)}
                              className="px-2 py-1 bg-yellow-400 text-[var(--text)] rounded mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded mr-2"
                            >
                              Del
                            </button>
                            <button
                              onClick={() => {
                                setActiveTradeId(t.id);
                                setShowImageUploadModal(true);
                              }}
                              className="px-2 py-1 bg-green-600 text-white rounded"
                            >
                              +Img
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* #1 “Use advanced filter” button at bottom */}
              <div className="mt-4">
                <button
                  onClick={() => router.push("/tradeAdvancedFilter")}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded"
                >
                  Use Advanced Filter
                </button>
              </div>
            </>
          ) : (
            <p className="text-[var(--text)]">No account selected.</p>
          )}
        </div>
      </div>

      {/* EDIT TRADE MODAL (#2, scrollable, user sees media => can delete) */}
      {showEditModal && editTrade.id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-[var(--background-2)] p-4 rounded shadow w-full max-w-xl max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-3">Edit Trade #{editTrade.id}</h3>
            {/* If we want to show existing media to let user delete it: */}
            {selectedAccountId && (
              <ExistingMediaList
                tradeId={editTrade.id!}
                handleDeleteMedia={handleDeleteMedia}
              />
            )}

            <form onSubmit={handleEditTradeSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block font-medium">Instrument</label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  value={editTrade.instrument || ""}
                  onChange={(e) =>
                    setEditTrade((prev) => ({ ...prev, instrument: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium">Direction</label>
                <select
                  className="border p-2 rounded w-full"
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
              <div>
                <label className="block font-medium">Fees</label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
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
                <label className="block font-medium">Date/Time</label>
                <input
                  type="datetime-local"
                  className="border p-2 rounded w-full"
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
              {/* #4 pattern => from settings */}
              <div>
                <label className="block font-medium">Pattern</label>
                <select
                  className="border p-2 rounded w-full"
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

              {/* Gains if tradeType=FX */}
              {editTrade.tradeType === "FX" && (
                <FxGainEditSection
                  editTrade={editTrade}
                  setEditTrade={setEditTrade}
                />
              )}

              {/* Additional media */}
              <div className="border bg-[var(--background-2)] p-3 rounded">
                <h4 className="font-medium mb-2">Attach Additional Media</h4>
                {editMediaList.map((m, i) => (
                  <div key={i} className="border p-2 rounded mb-2 bg-[var(--background-2)]">
                    <label className="block text-sm font-semibold">Tag:</label>
                    <select
                      className="border p-1 rounded w-full"
                      value={m.tagName}
                      onChange={(e) =>
                        handleEditMediaChange(i, "tagName", e.target.value)
                      }
                    >
                      <option value="">(none)</option>
                      {mediaTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="or new tag"
                      className="border p-1 rounded w-full mt-1"
                      value={m.tagName}
                      onChange={(e) =>
                        handleEditMediaChange(i, "tagName", e.target.value)
                      }
                    />

                    <label className="block text-sm font-semibold mt-2">Description</label>
                    <input
                      type="text"
                      className="border p-1 rounded w-full"
                      value={m.description}
                      onChange={(e) =>
                        handleEditMediaChange(i, "description", e.target.value)
                      }
                    />

                    <label className="block text-sm font-semibold mt-2">External URL</label>
                    <input
                      type="text"
                      className="border p-1 rounded w-full"
                      value={m.externalUrl}
                      onChange={(e) =>
                        handleEditMediaChange(i, "externalUrl", e.target.value)
                      }
                    />
                    <p className="text-xs text-[var(--text)]">If provided, file is ignored.</p>

                    <label className="block text-sm font-semibold mt-2">Local File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(ev) => {
                        if (ev.target.files && ev.target.files.length > 0) {
                          handleEditMediaChange(i, "file", ev.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEditMediaItem}
                  className="px-2 py-1 bg-green-600 text-white rounded"
                >
                  + Media
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-[var(--background-2)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* old separate +Img modal */}
      {showImageUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setShowImageUploadModal(false)}
        >
          <div
            className="bg-[var(--background-2)] p-4 rounded shadow w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-3">
              Upload Image for Trade #{activeTradeId}
            </h3>
            <form onSubmit={handleUploadImage} className="space-y-2">
              <div>
                <label className="block font-medium text-sm">Label (optional)</label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-sm">Select Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowImageUploadModal(false)}
                  className="px-4 py-2 bg-[var(--background-2)] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** A helper component that loads existing media for a trade and shows a "Delete" button. */
function ExistingMediaList({
  tradeId,
  handleDeleteMedia,
}: {
  tradeId: number;
  handleDeleteMedia: (mediaId: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<TradeMedia[]>([]);

  useEffect(() => {
    loadMedia();
  }, [tradeId]);

  async function loadMedia() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/trade?tradeId=${tradeId}`); // Or a custom route
      // ... in a real scenario, you'd fetch a single trade. We'll do a hack:
      // Actually let's do a separate route "GET /trade/:id" to get the single trade.
      // We'll do a naive approach for demonstration:
      const data = await res.json();
      if (res.ok) {
        // data might be the single trade or an array
        const singleTrade = Array.isArray(data) ? data[0] : data;
        setMedia(singleTrade?.media || []);
      } else {
        setError("Failed to load existing media");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load media");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text)]">Loading existing media...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }
  if (media.length === 0) {
    return <p className="text-sm text-[var(--text)]">No existing media</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm mb-1">Existing Media</h4>
      {media.map((m) => (
        <div key={m.id} className="border p-2 rounded bg-[var(--background-2)] flex items-center justify-between">
          <div>
            <a
              href={"/" + m.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline text-sm"
            >
              {m.label?.name || "Media"}
            </a>
            {m.description && (
              <div className="text-xs text-[var(--text)]">{m.description}</div>
            )}
          </div>
          <button
            onClick={() => handleDeleteMedia(m.id)}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

/** A helper for editing Gains if tradeType=FX in the edit modal. */
function FxGainEditSection({
  editTrade,
  setEditTrade,
}: {
  editTrade: Partial<Trade>;
  setEditTrade: React.Dispatch<React.SetStateAction<Partial<Trade>>>;
}) {
  // if you want a separate approach, or you can inline it in the form
  return (
    <div className="border bg-[var(--background-2)] p-3 rounded">
      <p className="font-medium text-sm mb-2">Edit FX Gains</p>
      <p className="text-xs text-[var(--text)]">
        (We read or store them in the “fx” object on submit.)
      </p>
      {/* Implementation left as an exercise, or see handleEditTradeSubmit. */}
    </div>
  );
}