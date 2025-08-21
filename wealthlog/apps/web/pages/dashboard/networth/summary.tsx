// pages/dashboard/networth/summary.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function NetWorthSummary() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Redirect to the landing page which contains the actual dashboard
    // This page exists to handle the /dashboard/networth/summary route
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/landing/landing');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
