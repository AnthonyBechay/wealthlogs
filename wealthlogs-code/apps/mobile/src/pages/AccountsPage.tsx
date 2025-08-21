import React, { useEffect, useState } from 'react';
import { WealthLogAPI, FinancialAccount } from '@wealthlog/shared';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@wealthlog/ui';

interface AccountsPageProps {
  api: WealthLogAPI;
}

const AccountsPage: React.FC<AccountsPageProps> = ({ api }) => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await api.getAccounts();
      setAccounts(accountsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'CASH': 'bg-green-100 text-green-800',
      'STOCKS': 'bg-blue-100 text-blue-800',
      'CRYPTO': 'bg-orange-100 text-orange-800',
      'REAL_ESTATE': 'bg-purple-100 text-purple-800',
      'FX_COMMODITY': 'bg-yellow-100 text-yellow-800',
      'BONDS': 'bg-indigo-100 text-indigo-800',
      'ETFS': 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
            <p className="text-sm text-gray-600">{accounts.length} accounts</p>
          </div>
          <Button size="sm">
            Add Account
          </Button>
        </div>
      </div>

      <div className="px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{account.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(account.accountType)}`}
                      >
                        {account.accountType.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center gap-4">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            account.active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {account.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {account.isLiquid && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Liquid
                        </span>
                      )}
                    </div>

                    {account.identifier && (
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {account.identifier}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(account.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {accounts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
                <p className="text-gray-500 mb-6">Start tracking your wealth by adding your first account</p>
                <Button>
                  Add Your First Account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;
