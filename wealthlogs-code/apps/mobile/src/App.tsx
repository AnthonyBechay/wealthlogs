import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { createWealthLogAPI, WealthLogAPI } from '@wealthlog/shared';
import { Button } from '@wealthlog/ui';

// Import mobile pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';

// Create API instance
const api = createWealthLogAPI();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initialize Capacitor
    initializeApp();
    
    // Check authentication status
    checkAuthStatus();
  }, []);

  const initializeApp = async () => {
    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Default });
      
      // Handle app state changes
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        // You can add logic here for background/foreground handling
      });

      // Handle back button on Android
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });

    } catch (error) {
      console.warn('Could not initialize Capacitor features:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const isAuth = api.isAuthenticated();
      
      if (isAuth) {
        // Verify token is still valid
        await api.getCurrentUser();
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading WealthLog...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/login" element={<LoginPage onLogin={handleLogin} api={api} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<DashboardPage api={api} onLogout={handleLogout} />} />
              <Route path="/accounts" element={<AccountsPage api={api} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
