import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WealthLogAPI, FinancialAccount } from '@wealthlog/shared';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@wealthlog/ui';

interface DashboardPageProps {
  api: WealthLogAPI;
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ api, onLogout }) => {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const accountsData = await api.getAccounts();
      setAccounts(accountsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
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
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back!</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-red-600 hover:text-red-700"
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Total Balance Card */}
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-sm text-gray-600 mb-2">Total Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(getTotalBalance())}
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-sm text-gray-600 mb-1">Accounts</p>
              <p className="text-2xl font-semibold text-gray-900">{accounts.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-semibold text-green-600">
                {accounts.filter(acc => acc.active).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Accounts</CardTitle>
              <Link 
                to="/accounts"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {accounts.slice(0, 3).map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.accountType}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
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
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No accounts found</p>
                <Button className="mt-4" size="sm">
                  Add Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16">
            Add Account
          </Button>
          <Button variant="outline" className="h-16">
            Add Trade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
