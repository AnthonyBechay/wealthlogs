import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { createWealthLogAPI, type FinancialAccount } from "@wealthlog/shared";

const api = createWealthLogAPI();

// Status change reasons - keeping local for now
export type StatusChangeReason = 
  | "ACCOUNT_CLOSED"
  | "MAINTENANCE"
  | "SUSPENDED"
  | "REACTIVATED"
  | "ARCHIVED"
  | "MANUAL";

export type LoadingState = "loading" | "success" | "error";
export type TransactionTypeValue = "DEPOSIT" | "WITHDRAW" | "TRANSFER";

// Local FinancialAccount and AccountWithHistory are removed.
// StatusChange remains local as AccountStatusHistoryItem is a placeholder in common/types.ts for now.
// If StatusChange were to be shared, AccountStatusHistoryItem in common/types.ts would need to be fully defined
// to match this StatusChange interface, and then StatusChange could also be imported.
interface StatusChange {
  id: number;
  accountId: number;
  previousStatus: boolean;
  newStatus: boolean;
  reason?: string;
  comment?: string;
  changedAt: string;
  changedBy?: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  dateTime: string;
  currency: string;
  description?: string;
  fromAccountId?: number;
  fromAccount?: { name: string };
  toAccountId?: number;
  toAccount?: { name: string };
}

// Keep a more specific type for the form if needed, derived from the common type
type FormTransactionType = Extract<TransactionTypeValue, "DEPOSIT" | "WITHDRAW" | "TRANSFER">;

interface FormErrors {
  [key: string]: string;
}

export default function AccountsPage() {
  const router = useRouter();
  
  // State management
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]); // StatusChange is still local
  const [selectedAccountId, setSelectedAccountId] = useState<number | "ALL">("ALL");
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status management
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAccountForStatus, setSelectedAccountForStatus] = useState<FinancialAccount | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState<StatusChangeReason>("MANUAL");
  const [statusChangeComment, setStatusChangeComment] = useState("");

  // New account form state
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("CASH");
  const [newAccCurrency, setNewAccCurrency] = useState("USD");
  const [accountFormErrors, setAccountFormErrors] = useState<FormErrors>({});

  // Transaction form state
  const [txType, setTxType] = useState<FormTransactionType>("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0,16));
  const [txFromId, setTxFromId] = useState<number|null>(null);
  const [txToId, setTxToId] = useState<number|null>(null);
  const [txDescription, setTxDescription] = useState("");
  const [transactionFormErrors, setTransactionFormErrors] = useState<FormErrors>({});

  // Memoized values
  const filteredTx = useMemo(() => {
    if (selectedAccountId === "ALL") return transactions;
    return transactions.filter(tx =>
      tx.fromAccountId === selectedAccountId || tx.toAccountId === selectedAccountId
    );
  }, [transactions, selectedAccountId]);

  const totalBalance = useMemo(() => {
    return accounts.reduce((total, account) => {
      if (account.currency === "USD" && account.active) {
        return total + account.balance;
      }
      return total;
    }, 0);
  }, [accounts]);

  // Get status history for a specific account
  const getAccountStatusHistory = useCallback((accountId: number) => {
    return statusHistory
      .filter(change => change.accountId === accountId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }, [statusHistory]);

  // Initial load
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setLoadingState("loading");
    try {
      // Check authentication first
      await api.getCurrentUser();
      
      // Load essential data in parallel
      const [accountsRes, transactionsRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactions()
      ]);

      setAccounts(accountsRes || []);
      setTransactions(transactionsRes.data || []);

      // Try to load status history (optional - may not exist yet)
      try {
        const statusHistoryRes = await api.get<StatusChange[]>("/account/status-history");
        setStatusHistory(statusHistoryRes.data || []);
      } catch (statusError) {
        console.warn("Status history endpoint not available yet:", statusError);
        setStatusHistory([]); // Set empty array as fallback
      }

      setLoadingState("success");
    } catch (error) {
      console.error("Initialization failed:", error);
      if (error.response?.status === 401) {
        router.push("/login");
      } else {
        setLoadingState("error");
      }
    }
  };

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.get<FinancialAccount[]>("/account");
      setAccounts(res.data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      throw error;
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await api.get<Transaction[]>("/transactions");
      setTransactions(res.data || []);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      throw error;
    }
  }, []);

  const loadStatusHistory = useCallback(async () => {
    try {
      const res = await api.get<StatusChange[]>("/account/status-history");
      setStatusHistory(res.data || []);
    } catch (error) {
      console.error("Failed to load status history:", error);
    }
  }, []);

  // Form validation functions
  const validateAccountForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!newAccName.trim()) {
      errors.name = "Account name is required";
    } else if (newAccName.trim().length < 2) {
      errors.name = "Account name must be at least 2 characters";
    } else if (accounts.some(acc => acc.name.toLowerCase() === newAccName.trim().toLowerCase())) {
      errors.name = "Account name already exists";
    }

    setAccountFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTransactionForm = (): boolean => {
    const errors: FormErrors = {};
    const amount = parseFloat(txAmount);

    if (!txAmount || isNaN(amount) || amount <= 0) {
      errors.amount = "Please enter a valid amount greater than 0";
    }

    if (txType === "DEPOSIT" && !txToId) {
      errors.toAccount = "Please select a destination account";
    }

    if (txType === "WITHDRAW") {
      if (!txFromId) {
        errors.fromAccount = "Please select a source account";
      } else {
        const fromAccount = accounts.find(acc => acc.id === txFromId);
        if (fromAccount && fromAccount.balance < amount) {
          errors.amount = "Insufficient balance in source account";
        }
      }
    }

    if (txType === "TRANSFER") {
      if (!txFromId) {
        errors.fromAccount = "Please select a source account";
      }
      if (!txToId) {
        errors.toAccount = "Please select a destination account";
      }
      if (txFromId && txToId && txFromId === txToId) {
        errors.toAccount = "Cannot transfer to the same account";
      }
      if (txFromId) {
        const fromAccount = accounts.find(acc => acc.id === txFromId);
        if (fromAccount && fromAccount.balance < amount) {
          errors.amount = "Insufficient balance in source account";
        }
      }
    }

    const transactionDate = new Date(txDate);
    if (transactionDate > new Date()) {
      errors.date = "Transaction date cannot be in the future";
    }

    setTransactionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Status management functions
  const validateStatusChange = (account: FinancialAccount, newStatus: boolean): string[] => {
    const errors: string[] = [];
    
    // Rule: Cannot deactivate account with non-zero balance
    if (!newStatus && account.balance !== 0) {
      errors.push(`Cannot deactivate account with non-zero balance (${formatCurrency(account.balance, account.currency)})`);
    }
    
    // Rule: Check for recent transactions
    const recentTransactions = transactions.filter(tx => 
      (tx.fromAccountId === account.id || tx.toAccountId === account.id) &&
      new Date(tx.dateTime) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h
    );
    
    if (!newStatus && recentTransactions.length > 0) {
      errors.push(`Account has ${recentTransactions.length} transaction(s) in the last 24 hours`);
    }
    
    return errors;
  };

  const openStatusModal = (account: FinancialAccount) => {
    setSelectedAccountForStatus(account);
    setShowStatusModal(true);
  };

  const handleStatusChange = async (account: FinancialAccount, newStatus: boolean, reason: StatusChangeReason, comment?: string) => {
    const validationErrors = validateStatusChange(account, newStatus);
    
    if (validationErrors.length > 0) {
      const proceed = confirm(
        `Warning:\n${validationErrors.join('\n')}\n\nDo you want to proceed anyway?`
      );
      if (!proceed) return;
    }
    
    setActionLoading(`status-${account.id}`);
    try {
      // Try the new endpoint first
      try {
        await api.patch(`/account/${account.id}/status`, {
          active: newStatus,
          reason,
          comment: comment?.trim() || undefined
        });
      } catch (patchError) {
        // Fallback to simple update if new endpoint doesn't exist
        console.warn("New status endpoint not available, using fallback");
        await api.patch(`/account/${account.id}`, {
          active: newStatus
        });
      }
      
      // Reload data
      await loadAccounts();
      
      // Try to reload status history (may not exist yet)
      try {
        await loadStatusHistory();
      } catch (historyError) {
        console.warn("Could not reload status history:", historyError);
      }
      
      // Close modal
      setShowStatusModal(false);
      setSelectedAccountForStatus(null);
      setStatusChangeComment("");
      setStatusChangeReason("MANUAL");
      
    } catch (error) {
      console.error("Failed to change status:", error);
      alert(error.response?.data?.message || "Failed to change account status");
    } finally {
      setActionLoading(null);
    }
  };

  // Account management functions
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAccountForm()) return;

    setActionLoading("create-account");
    try {
      await api.post("/account", {
        name: newAccName.trim(),
        accountType: newAccType,
        currency: newAccCurrency
      });

      // Reset form
      setNewAccName("");
      setNewAccType("CASH");
      setNewAccCurrency("USD");
      setAccountFormErrors({});

      // Reload accounts
      await loadAccounts();
    } catch (error) {
      console.error("Failed to create account:", error);
      setAccountFormErrors({ 
        submit: error.response?.data?.message || "Failed to create account" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    const account = accounts.find(acc => acc.id === id);
    if (!account) return;

    // Suggest deactivation first for active accounts
    if (account.active) {
      const shouldDeactivate = confirm(
        `"${account.name}" is currently active. Would you like to deactivate it instead of deleting it? This preserves the account history.`
      );
      if (shouldDeactivate) {
        openStatusModal(account);
        return;
      }
    }

    const confirmText = `Are you sure you want to permanently delete "${account.name}"?`;
    if (!confirm(confirmText)) return;

    const cascade = account.balance !== 0 ? 
      confirm("This account has a non-zero balance. Delete all related transactions as well?") : 
      confirm("Delete all trades & transactions attached to this account as well?");

    setActionLoading(`delete-${id}`);
    try {
      await api.delete(`/account/${id}?cascade=${cascade}`);
      await loadAccounts();
      
      // Reset selected account if it was deleted
      if (selectedAccountId === id) {
        setSelectedAccountId("ALL");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert(error.response?.data?.message || "Failed to delete account");
    } finally {
      setActionLoading(null);
    }
  };

  // Transaction management
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTransactionForm()) return;

    const amount = parseFloat(txAmount);
    const payload: any = {
      type: txType,
      amount,
      dateTime: new Date(txDate).toISOString(),
      currency: "USD",
      description: txDescription.trim() || undefined
    };

    if (txType !== "WITHDRAW") payload.toAccountId = txToId;
    if (txType !== "DEPOSIT") payload.fromAccountId = txFromId;

    setActionLoading("create-transaction");
    try {
      await api.post("/transactions", payload);

      // Reset form
      setTxAmount("");
      setTxDate(new Date().toISOString().slice(0,16));
      setTxFromId(null);
      setTxToId(null);
      setTxDescription("");
      setTransactionFormErrors({});

      // Reload data
      await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (error) {
      console.error("Failed to create transaction:", error);
      setTransactionFormErrors({ 
        submit: error.response?.data?.message || "Failed to create transaction" 
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const dataToExport = filteredTx;
    
    if (!dataToExport.length) {
      alert("No transactions to export!");
      return;
    }

    const headers = [
      "ID", "Type", "Amount", "Currency", "Date", 
      "From Account", "To Account", "Description"
    ];
    
    const rows = dataToExport.map(tx => [
      tx.id,
      tx.type,
      tx.amount,
      tx.currency,
      new Date(tx.dateTime).toLocaleString(),
      tx.fromAccount?.name || tx.fromAccountId || "-",
      tx.toAccount?.name || tx.toAccountId || "-",
      tx.description || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Utility functions
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getTransactionBackgroundColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'var(--success)';
      case 'WITHDRAW': return 'var(--danger)';
      case 'TRANSFER': return 'var(--primary)';
      default: return '#6b7280';
    }
  };

  const getStatusChangeReasonLabel = (reason: StatusChangeReason) => {
    switch (reason) {
      case 'ACCOUNT_CLOSED': return 'Account Closed';
      case 'MAINTENANCE': return 'Maintenance';
      case 'SUSPENDED': return 'Suspended';
      case 'REACTIVATED': return 'Reactivated';
      case 'ARCHIVED': return 'Archived';
      case 'MANUAL': return 'Manual Change';
      default: return reason;
    }
  };

  // Render loading state
  if (loadingState === "loading") {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <div className="text-xl">Loading your accounts...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (loadingState === "error") {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <div className="text-center">
          <div className="text-xl mb-4" style={{ color: 'var(--danger)' }}>Failed to load data</div>
          <button 
            onClick={initializeData}
            className="px-4 py-2 text-white rounded hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Accounts & Balances</h1>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Active Balance (USD)</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
              {formatCurrency(totalBalance)}
            </div>
          </div>
        </div>

        {/* Accounts List & Create Form */}
        <div className="mb-8 p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
          <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>

          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No accounts found. Create your first account below.</p>
            </div>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Name</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Type</th>
                    <th className="border p-3 text-right" style={{ borderColor: '#ddd' }}>Balance</th>
                    <th className="border p-3 text-center" style={{ borderColor: '#ddd' }}>Status</th>
                    <th className="border p-3 text-center" style={{ borderColor: '#ddd' }}>Last Status Change</th>
                    <th className="border p-3 text-center" style={{ borderColor: '#ddd' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => (
                    <tr key={account.id} className="hover:opacity-90">
                      <td className="border p-3 font-medium" style={{ borderColor: '#ddd' }}>{account.name}</td>
                      <td className="border p-3" style={{ borderColor: '#ddd' }}>{account.accountType}</td>
                      <td className="border p-3 text-right font-semibold" style={{ borderColor: '#ddd' }}>
                        {formatCurrency(account.balance, account.currency)}
                      </td>
                      <td className="border p-3 text-center" style={{ borderColor: '#ddd' }}>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: account.active ? 'var(--success)' : 'var(--danger)' }}
                        >
                          {account.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="border p-3 text-center text-sm text-gray-500" style={{ borderColor: '#ddd' }}>
                        {account.lastStatusChange ? (
                          <div>
                            <div>{new Date(account.lastStatusChange).toLocaleDateString()}</div>
                            <div className="text-xs">
                              {new Date(account.lastStatusChange).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="border p-3 text-center" style={{ borderColor: '#ddd' }}>
                        <div className="flex gap-2 justify-center">
                          <button
                            className="px-3 py-1 hover:opacity-90 text-white rounded text-sm transition-opacity"
                            style={{ backgroundColor: account.active ? 'var(--warning)' : 'var(--success)' }}
                            onClick={() => openStatusModal(account)}
                            disabled={actionLoading === `status-${account.id}`}
                          >
                            {actionLoading === `status-${account.id}` 
                              ? 'Updating...' 
                              : account.active ? 'Deactivate' : 'Activate'
                            }
                          </button>
                          <button
                            className="px-3 py-1 hover:opacity-90 text-white rounded text-sm transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: 'var(--danger)' }}
                            onClick={() => handleDeleteAccount(account.id)}
                            disabled={actionLoading === `delete-${account.id}`}
                          >
                            {actionLoading === `delete-${account.id}` ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Account Form */}
          <div className="p-4 rounded" style={{ backgroundColor: 'var(--background)' }}>
            <h3 className="text-lg font-medium mb-3">Create New Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <input
                    type="text"
                    className="w-full border p-2 rounded"
                    style={{ 
                      backgroundColor: 'var(--background-2)', 
                      color: 'var(--text)',
                      borderColor: accountFormErrors.name ? 'var(--danger)' : '#ddd'
                    }}
                    placeholder="Account Name"
                    value={newAccName}
                    onChange={e => {
                      setNewAccName(e.target.value);
                      if (accountFormErrors.name) {
                        setAccountFormErrors(prev => ({ ...prev, name: "" }));
                      }
                    }}
                  />
                  {accountFormErrors.name && (
                    <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>{accountFormErrors.name}</p>
                  )}
                </div>
                
                <select
                  className="border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background-2)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                  value={newAccType}
                  onChange={e => setNewAccType(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="FX_COMMODITY">FX</option>
                  <option value="STOCKS">Stocks</option>
                  <option value="CRYPTO">Crypto</option>
                </select>
                
                <select
                  className="border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background-2)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                  value={newAccCurrency}
                  onChange={e => setNewAccCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>

                <button 
                  className="px-6 py-2 hover:opacity-90 text-white rounded transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: 'var(--success)' }}
                  type="submit"
                  disabled={actionLoading === "create-account"}
                >
                  {actionLoading === "create-account" ? 'Creating...' : 'Create Account'}
                </button>
              </div>
              
              {accountFormErrors.submit && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{accountFormErrors.submit}</p>
              )}
            </form>
          </div>
        </div>

        {/* Transaction Form */}
        <div className="mb-8 p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
          <h2 className="text-xl font-semibold mb-4">Create Transaction</h2>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium mb-1">Type:</label>
                <select 
                  value={txType} 
                  onChange={e => {
                    setTxType(e.target.value as FormTransactionType);
                    setTransactionFormErrors({});
                  }}
                  className="w-full border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                >
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              {txType !== "DEPOSIT" && (
                <div>
                  <label className="block font-medium mb-1">From Account:</label>
                  <select
                    className="w-full border rounded p-2"
                    style={{ 
                      backgroundColor: 'var(--background)', 
                      color: 'var(--text)',
                      borderColor: transactionFormErrors.fromAccount ? 'var(--danger)' : '#ddd'
                    }}
                    value={txFromId ?? ""}
                    onChange={e => {
                      setTxFromId(Number(e.target.value) || null);
                      if (transactionFormErrors.fromAccount) {
                        setTransactionFormErrors(prev => ({ ...prev, fromAccount: "" }));
                      }
                    }}
                  >
                    <option value="">--Select--</option>
                    {accounts.filter(acc => acc.active).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance, account.currency)})
                      </option>
                    ))}
                  </select>
                  {transactionFormErrors.fromAccount && (
                    <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>{transactionFormErrors.fromAccount}</p>
                  )}
                </div>
              )}

              {txType !== "WITHDRAW" && (
                <div>
                  <label className="block font-medium mb-1">To Account:</label>
                  <select
                    className="w-full border rounded p-2"
                    style={{ 
                      backgroundColor: 'var(--background)', 
                      color: 'var(--text)',
                      borderColor: transactionFormErrors.toAccount ? 'var(--danger)' : '#ddd'
                    }}
                    value={txToId ?? ""}
                    onChange={e => {
                      setTxToId(Number(e.target.value) || null);
                      if (transactionFormErrors.toAccount) {
                        setTransactionFormErrors(prev => ({ ...prev, toAccount: "" }));
                      }
                    }}
                  >
                    <option value="">--Select--</option>
                    {accounts.filter(acc => acc.active).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance, account.currency)})
                      </option>
                    ))}
                  </select>
                  {transactionFormErrors.toAccount && (
                    <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>{transactionFormErrors.toAccount}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: transactionFormErrors.amount ? 'var(--danger)' : '#ddd'
                  }}
                  placeholder="0.00"
                  value={txAmount}
                  onChange={e => {
                    setTxAmount(e.target.value);
                    if (transactionFormErrors.amount) {
                      setTransactionFormErrors(prev => ({ ...prev, amount: "" }));
                    }
                  }}
                />
                {transactionFormErrors.amount && (
                  <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>{transactionFormErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">Date/Time:</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: transactionFormErrors.date ? 'var(--danger)' : '#ddd'
                  }}
                  value={txDate}
                  onChange={e => {
                    setTxDate(e.target.value);
                    if (transactionFormErrors.date) {
                      setTransactionFormErrors(prev => ({ ...prev, date: "" }));
                    }
                  }}
                />
                {transactionFormErrors.date && (
                  <p className="text-sm mt-1" style={{ color: 'var(--danger)' }}>{transactionFormErrors.date}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Description (Optional):</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                  placeholder="Transaction description..."
                  value={txDescription}
                  onChange={e => setTxDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                className="px-6 py-2 hover:opacity-90 text-white rounded transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
                type="submit"
                disabled={actionLoading === "create-transaction"}
              >
                {actionLoading === "create-transaction" ? 'Creating...' : 'Create Transaction'}
              </button>
              
              {transactionFormErrors.submit && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{transactionFormErrors.submit}</p>
              )}
            </div>
          </form>
        </div>

        {/* Transactions Table */}
        <div className="p-4 rounded shadow" style={{ backgroundColor: 'var(--background-2)' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="border rounded p-2"
                style={{ 
                  backgroundColor: 'var(--background)', 
                  color: 'var(--text)',
                  borderColor: '#ddd'
                }}
                value={selectedAccountId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedAccountId(val === "ALL" ? "ALL" : Number(val));
                }}
              >
                <option value="ALL">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 hover:opacity-90 text-white rounded transition-opacity"
                style={{ backgroundColor: 'var(--primary)' }}
                disabled={filteredTx.length === 0}
              >
                Export CSV ({filteredTx.length})
              </button>
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found.</p>
              {selectedAccountId !== "ALL" && (
                <button 
                  onClick={() => setSelectedAccountId("ALL")}
                  className="mt-2 hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  View all transactions
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Type</th>
                    <th className="border p-3 text-right" style={{ borderColor: '#ddd' }}>Amount</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Date</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>From</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>To</th>
                    <th className="border p-3 text-left" style={{ borderColor: '#ddd' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map(transaction => (
                    <tr key={transaction.id} className="hover:opacity-90">
                      <td className="border p-3" style={{ borderColor: '#ddd' }}>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: getTransactionBackgroundColor(transaction.type) }}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="border p-3 text-right font-semibold" style={{ borderColor: '#ddd' }}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="border p-3" style={{ borderColor: '#ddd' }}>
                        <div>{new Date(transaction.dateTime).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="border p-3" style={{ borderColor: '#ddd' }}>
                        {transaction.fromAccount?.name || transaction.fromAccountId || "-"}
                      </td>
                      <td className="border p-3" style={{ borderColor: '#ddd' }}>
                        {transaction.toAccount?.name || transaction.toAccountId || "-"}
                      </td>
                      <td className="border p-3 text-sm text-gray-500" style={{ borderColor: '#ddd' }}>
                        {transaction.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Change Modal */}
        {showStatusModal && selectedAccountForStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStatusModal(false)}>
            <div 
              className="p-6 rounded shadow-lg max-w-md w-full mx-4"
              style={{ backgroundColor: 'var(--background-2)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                {selectedAccountForStatus.active ? 'Deactivate' : 'Activate'} Account
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Account: <strong>{selectedAccountForStatus.name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Current Status: 
                  <span 
                    className="ml-2 px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: selectedAccountForStatus.active ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {selectedAccountForStatus.active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-2">Reason:</label>
                <select
                  className="w-full border rounded p-2"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                  value={statusChangeReason}
                  onChange={e => setStatusChangeReason(e.target.value as StatusChangeReason)}
                >
                  <option value="MANUAL">Manual Change</option>
                  <option value="ACCOUNT_CLOSED">Account Closed</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REACTIVATED">Reactivated</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block font-medium mb-2">Comment (Optional):</label>
                <textarea
                  className="w-full border rounded p-2 h-20"
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    color: 'var(--text)',
                    borderColor: '#ddd'
                  }}
                  placeholder="Add a note about this status change..."
                  value={statusChangeComment}
                  onChange={e => setStatusChangeComment(e.target.value)}
                />
              </div>

              {/* Recent Status Changes */}
              {getAccountStatusHistory(selectedAccountForStatus.id).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Recent Status Changes:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {getAccountStatusHistory(selectedAccountForStatus.id).slice(0, 3).map(change => (
                      <div key={change.id} className="text-sm p-2 mb-1 rounded" style={{ backgroundColor: 'var(--background)' }}>
                        <div className="flex justify-between">
                          <span>{change.newStatus ? 'Activated' : 'Deactivated'}</span>
                          <span className="text-gray-500">
                            {new Date(change.changedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {change.reason && (
                          <div className="text-gray-600 text-xs mt-1">
                            Reason: {getStatusChangeReasonLabel(change.reason as StatusChangeReason)}
                          </div>
                        )}
                        {change.comment && (
                          <div className="text-gray-600 text-xs mt-1">
                            Note: {change.comment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  className="px-4 py-2 border rounded hover:opacity-90"
                  style={{ color: 'var(--text)', borderColor: '#ddd' }}
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 hover:opacity-90 text-white rounded transition-opacity"
                  style={{ backgroundColor: selectedAccountForStatus.active ? 'var(--warning)' : 'var(--success)' }}
                  onClick={() => handleStatusChange(
                    selectedAccountForStatus, 
                    !selectedAccountForStatus.active, 
                    statusChangeReason,
                    statusChangeComment
                  )}
                  disabled={actionLoading === `status-${selectedAccountForStatus.id}`}
                >
                  {actionLoading === `status-${selectedAccountForStatus.id}` 
                    ? 'Updating...' 
                    : `${selectedAccountForStatus.active ? 'Deactivate' : 'Activate'} Account`
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

