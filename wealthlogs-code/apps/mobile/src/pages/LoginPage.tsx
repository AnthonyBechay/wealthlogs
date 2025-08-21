import React, { useState } from 'react';
import { WealthLogAPI } from '@wealthlog/shared';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@wealthlog/ui';

interface LoginPageProps {
  onLogin: () => void;
  api: WealthLogAPI;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, api }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.login({ username, password });
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 safe-area-inset">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">WealthLog</h1>
          <p className="text-gray-600 mt-2">Track your financial journey</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                id="username"
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />

              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />

              {error && (
                <div className="text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a 
                href="#" 
                className="text-sm text-primary-600 hover:text-primary-500"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Handle forgot password
                  alert('Forgot password functionality will be implemented');
                }}
              >
                Forgot your password?
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
