// pages/accounts.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common"; // your shared axios instance

interface FinancialAccount {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
  active: boolean;
}

interface Transaction {
  id: number;
  type: string;      // "DEPOSIT", "WITHDRAW", "TRANSFER", "DIVIDEND"
  amount: number;
  dateTime: string;  // ISO string
  currency: string;
  description?: string;
  fromAccountId?: number;
  fromAccount?: { name: string };
  toAccountId?: number;
  toAccount?: { name: string };
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "ALL">("ALL");

  // New account form
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("CASH");
  const [newAccCurrency, setNewAccCurrency] = useState("USD");

  // Transaction form
  const [txType, setTxType] = useState<"DEPOSIT"|"WITHDRAW"|"TRANSFER">("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0,16));
  const [txFromId, setTxFromId] = useState<number|null>(null);
  const [txToId, setTxToId] = useState<number|null>(null);

  // On mount, load all accounts & all transactions
  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    try {
      await api.get("/auth/me"); // ensure the user is logged in
      loadAccounts();
      loadTransactions();
    } catch (err) {
      router.push("/login");
    }
  }

  async function loadAccounts() {
    try {
      const res = await api.get<FinancialAccount[]>("/account");
      setAccounts(res.data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  }

  async function loadTransactions() {
    try {
      const res = await api.get<Transaction[]>("/transactions");
      setTransactions(res.data || []);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  }


  
  // --- CREATE A NEW ACCOUNT ---
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccName.trim()) return alert("Account name is required.");
    try {
      await api.post("/account", {
        name: newAccName.trim(),
        accountType: newAccType,
        currency: newAccCurrency
      });
      setNewAccName("");
      loadAccounts();
    } catch (error) {
      console.error("Failed to create account:", error);
    }
  }

  // --- DELETE AN ACCOUNT ---
async function handleDeleteAccount(id: number) {
  const cascade = confirm(
    "Delete all trades & transactions attached to this account as well?"
  );
  try {
    await api.delete(`/account/${id}?cascade=${cascade ? "true" : "false"}`);
    await loadAccounts();
  } catch (err) {
    console.error("Failed to delete account:", err);
  }
}


  // --- CREATE TRANSACTION ---
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      return alert("Invalid amount");
    }
    const payload: any = {
      type: txType,
      amount: amt,
      dateTime: new Date(txDate).toISOString(),
      currency: "USD"
    };
    if (txType === "DEPOSIT") {
      if (!txToId) return alert("Select a 'to' account");
      payload.toAccountId = txToId;
    } else if (txType === "WITHDRAW") {
      if (!txFromId) return alert("Select a 'from' account");
      payload.fromAccountId = txFromId;
    } else {
      // TRANSFER
      if (!txFromId || !txToId) {
        return alert("Need from & to account for a transfer");
      }
      if (txFromId === txToId) {
        return alert("Cannot transfer to the same account");
      }
      payload.fromAccountId = txFromId;
      payload.toAccountId = txToId;
    }

    try {
      await api.post("/transactions", payload);
      setTxAmount("");
      setTxDate(new Date().toISOString().slice(0,16));
      loadAccounts();      // re-fetch accounts to get updated balances
      loadTransactions();  // re-fetch transactions
    } catch (error) {
      console.error("Failed to create transaction:", error);
    }
  }

  // --- EXPORT TRANSACTIONS to CSV ---
  function handleExportCsv() {
    // If the user selected a single account, filter
    let data = transactions;
    if (selectedAccountId !== "ALL") {
      data = data.filter(tx =>
        tx.fromAccountId === selectedAccountId ||
        tx.toAccountId === selectedAccountId
      );
    }
    if (!data.length) {
      alert("No transactions to export!");
      return;
    }

    // Build CSV data
    const headers = ["ID", "Type", "Amount", "Currency", "Date", "FromAccount", "ToAccount"];
    const rows = data.map(tx => [
      tx.id,
      tx.type,
      tx.amount,
      tx.currency,
      new Date(tx.dateTime).toLocaleString(),
      tx.fromAccountId ?? "",
      tx.toAccountId ?? ""
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.join(",") + "\n";
    });

    // Download as a file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Filter transactions for a given selected account
  const filteredTx = selectedAccountId === "ALL"
    ? transactions
    : transactions.filter(tx =>
        tx.fromAccountId === selectedAccountId ||
        tx.toAccountId === selectedAccountId
      );

  return (
    <div className="p-6 min-h-screen bg-[var(--background)] bg-[var(--background)] text-[var(--text)]">
      <h1 className="text-3xl font-bold mb-6">Accounts & Balances</h1>

      {/* =========== Accounts List & Create Form =========== */}
      <div className="mb-8 p-4 bg-[var(--background-2)] rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>

        {accounts.length === 0 ? (
          <p>No accounts found.</p>
        ) : (
          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--background-2)]">
                <tr>
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Balance</th>
                  <th className="border p-2 text-left">Currency</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(ac => (
                  <tr key={ac.id}>
                    <td className="border p-2">{ac.id}</td>
                    <td className="border p-2">{ac.name}</td>
                    <td className="border p-2">{ac.accountType}</td>
                    <td className="border p-2">{ac.balance}</td>
                    <td className="border p-2">{ac.currency}</td>
                    <td className="border p-2 text-center">
                      {/* Delete example */}
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded"
                        onClick={() => handleDeleteAccount(ac.id)}
                      >
                        Delete
                      </button>
                      {/* You can add an Edit button to open a modal, etc. */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="flex gap-2">
          <input
            type="text"
            className="border p-2 flex-1"
            placeholder="Account Name"
            value={newAccName}
            onChange={e => setNewAccName(e.target.value)}
          />
          <select
            className="border p-2"
            value={newAccType}
            onChange={e => setNewAccType(e.target.value)}
          >
            <option value="CASH">Cash</option>
            <option value="FX_COMMODITY">FX</option>
            <option value="STOCKS">Stocks</option>
            <option value="CRYPTO">Crypto</option>
            {/* etc. fill from your FinancialAccountType enum */}
          </select>
          <select
            className="border p-2"
            value={newAccCurrency}
            onChange={e => setNewAccCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            {/* etc. */}
          </select>

          <button className="px-4 py-2 bg-green-600 text-white rounded" type="submit">
            Create
          </button>
        </form>
      </div>

      {/* =========== Transaction Form =========== */}
      <div className="mb-8 p-4 bg-[var(--background-2)] rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Create Transaction</h2>
        <form onSubmit={handleCreateTransaction} className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block font-medium">Type:</label>
            <select value={txType} onChange={e => setTxType(e.target.value as any)} className="border p-2">
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAW">Withdraw</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {txType !== "DEPOSIT" && (
            <div>
              <label className="block font-medium">From Account:</label>
              <select
                className="border p-2"
                value={txFromId ?? ""}
                onChange={e => setTxFromId(Number(e.target.value))}
              >
                <option value="">--Select--</option>
                {accounts.map(ac => (
                  <option key={ac.id} value={ac.id}>
                    {ac.name} (bal: {ac.balance})
                  </option>
                ))}
              </select>
            </div>
          )}

          {txType !== "WITHDRAW" && (
            <div>
              <label className="block font-medium">To Account:</label>
              <select
                className="border p-2"
                value={txToId ?? ""}
                onChange={e => setTxToId(Number(e.target.value))}
              >
                <option value="">--Select--</option>
                {accounts.map(ac => (
                  <option key={ac.id} value={ac.id}>
                    {ac.name} (bal: {ac.balance})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium">Amount:</label>
            <input
              type="number"
              step="0.01"
              className="border p-2 w-full"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium">Date/Time:</label>
            <input
              type="datetime-local"
              className="border p-2"
              value={txDate}
              onChange={e => setTxDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button className="px-4 py-2 bg-[var(--primary)] text-white rounded h-10 self-end" type="submit">
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* =========== Transactions Table =========== */}
      <div className="p-4 bg-[var(--background-2)] rounded shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1 bg-yellow-400 text-[var(--text)] font-semibold rounded"
          >
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <label>Select Account:</label>
          <select
            className="border p-2"
            value={selectedAccountId}
            onChange={e => {
              const val = e.target.value;
              setSelectedAccountId(val === "ALL" ? "ALL" : Number(val));
            }}
          >
            <option value="ALL">All</option>
            {accounts.map(ac => (
              <option key={ac.id} value={ac.id}>
                {ac.name}
              </option>
            ))}
          </select>
        </div>
        {filteredTx.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-[var(--background-2)]">
              <tr>
                <th className="border p-2 text-left">ID</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Amount</th>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">From</th>
                <th className="border p-2 text-left">To</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id}>
                  <td className="border p-2">{tx.id}</td>
                  <td className="border p-2">{tx.type}</td>
                  <td className="border p-2">{tx.amount}</td>
                  <td className="border p-2">
                    {new Date(tx.dateTime).toLocaleString()}
                  </td>
                  <td className="border p-2">{tx.fromAccountId ?? "-"}</td>
                  <td className="border p-2">{tx.toAccountId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}