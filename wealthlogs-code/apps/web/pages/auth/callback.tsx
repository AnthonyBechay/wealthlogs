// pages/auth/callback.tsx
// OAuth callback handler page

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from query params or handle OAuth response
        const { token, error } = router.query;

        if (error) {
          // Handle OAuth error
          console.error('OAuth error:', error);
          router.push(`/login?error=${error}`);
          return;
        }

        if (token) {
          // Store token and refresh user
          localStorage.setItem('accessToken', token as string);
          await refreshUser();
          router.push('/dashboard');
        } else {
          // No token, redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        router.push('/login?error=oauth_failed');
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
