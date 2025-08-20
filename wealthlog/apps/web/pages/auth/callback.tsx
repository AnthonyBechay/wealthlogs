// pages/auth/callback.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import authService from '../../src/services/auth.service';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { token, error } = router.query;

      if (error) {
        console.error('OAuth error:', error);
        router.push('/login?error=oauth_failed');
        return;
      }

      if (token && typeof token === 'string') {
        try {
          await authService.handleGoogleCallback(token);
          router.push('/landing/landing');
        } catch (error) {
          console.error('Failed to handle OAuth callback:', error);
          router.push('/login?error=oauth_failed');
        }
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
