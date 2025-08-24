/**
 * Security Dashboard Component
 * Displays security metrics and monitoring information
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/api-service';
import { logger, metrics } from '@wealthlog/shared';

interface SecuritySession {
  id: string;
  device: string;
  ip: string;
  lastActive: Date;
  current: boolean;
}

interface SecurityMetrics {
  failedLoginAttempts: number;
  activeSessionsCount: number;
  lastPasswordChange: Date | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

/**
 * Security Dashboard Component
 */
export const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [twoFactorModal, setTwoFactorModal] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load sessions (you'll need to implement this endpoint)
      // const sessionsData = await AuthService.getSessions();
      // setSessions(sessionsData);
      
      // Load security metrics
      // const metricsData = await AuthService.getSecurityMetrics();
      // setSecurityMetrics(metricsData);
      
      // Mock data for demonstration
      setSessions([
        {
          id: '1',
          device: 'Chrome on Windows',
          ip: '192.168.1.***',
          lastActive: new Date(),
          current: true
        },
        {
          id: '2',
          device: 'Safari on iPhone',
          ip: '10.0.0.***',
          lastActive: new Date(Date.now() - 3600000),
          current: false
        }
      ]);
      
      setSecurityMetrics({
        failedLoginAttempts: 2,
        activeSessionsCount: 2,
        lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        twoFactorEnabled: false,
        emailVerified: true
      });
    } catch (error) {
      logger.error('Failed to load security data', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      // await AuthService.revokeSession(sessionId);
      logger.info('Session revoked', { sessionId });
      await loadSecurityData();
    } catch (error) {
      logger.error('Failed to revoke session', error);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will log you out from all devices except this one. Continue?')) {
      return;
    }
    
    try {
      // await AuthService.revokeAllSessions();
      logger.info('All sessions revoked');
      await loadSecurityData();
    } catch (error) {
      logger.error('Failed to revoke all sessions', error);
    }
  };

  if (loading) {
    return <div>Loading security information...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Security Settings</h2>
      
      {/* Security Overview */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Security Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Email Verification Status */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Email Verification</span>
              <span className={`px-2 py-1 rounded text-sm ${
                securityMetrics?.emailVerified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {securityMetrics?.emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
          
          {/* Two-Factor Authentication */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Two-Factor Auth</span>
              <button
                onClick={() => setTwoFactorModal(true)}
                className={`px-2 py-1 rounded text-sm ${
                  securityMetrics?.twoFactorEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {securityMetrics?.twoFactorEnabled ? 'Enabled' : 'Set Up'}
              </button>
            </div>
          </div>
          
          {/* Password Age */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Password Age</span>
              <span className="text-sm">
                {securityMetrics?.lastPasswordChange
                  ? `${Math.floor((Date.now() - new Date(securityMetrics.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24))} days`
                  : 'Never changed'}
              </span>
            </div>
          </div>
          
          {/* Failed Login Attempts */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Failed Logins (24h)</span>
              <span className={`text-sm ${
                (securityMetrics?.failedLoginAttempts || 0) > 3 
                  ? 'text-red-600' 
                  : 'text-gray-800'
              }`}>
                {securityMetrics?.failedLoginAttempts || 0}
              </span>
            </div>
          </div>
          
          {/* Active Sessions */}
          <div className="border rounded p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Sessions</span>
              <span className="text-sm">
                {securityMetrics?.activeSessionsCount || 0}
              </span>
            </div>
          </div>
        </div>
        
        {/* Security Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setShowPasswordChange(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Change Password
          </button>
          
          <button
            onClick={revokeAllSessions}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Revoke All Sessions
          </button>
        </div>
      </div>
      
      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {session.device}
                    {session.current && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    IP: {session.ip} • Last active: {new Date(session.lastActive).toLocaleString()}
                  </div>
                </div>
                
                {!session.current && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChangeModal onClose={() => setShowPasswordChange(false)} />
      )}
      
      {/* Two-Factor Setup Modal */}
      {twoFactorModal && (
        <TwoFactorSetupModal onClose={() => setTwoFactorModal(false)} />
      )}
    </div>
  );
};

/**
 * Password Change Modal
 */
const PasswordChangeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await updatePassword(currentPassword, newPassword);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Two-Factor Setup Modal
 */
const TwoFactorSetupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load 2FA setup data
    // This would typically call an API endpoint to get QR code and secret
    setQrCode('data:image/png;base64,placeholder');
    setSecret('XXXX-XXXX-XXXX-XXXX');
  }, []);

  const handleVerify = async () => {
    try {
      setLoading(true);
      // Verify 2FA code
      // await AuthService.enable2FA(verificationCode);
      logger.info('2FA enabled successfully');
      onClose();
    } catch (error) {
      logger.error('Failed to enable 2FA', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Setup Two-Factor Authentication</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
              {/* QR Code would go here */}
              <span className="text-gray-500">QR Code</span>
            </div>
          </div>
          
          <div className="p-3 bg-gray-100 rounded mb-4">
            <p className="text-xs text-gray-600 mb-1">Can't scan? Enter this code manually:</p>
            <code className="text-sm font-mono">{secret}</code>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 border rounded-md text-center text-lg font-mono"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
