// apps/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
// ✅ CORRECTED IMPORT: Import the new 'User' type and the 'api' helper
import { api, setAuthToken, User } from '@wealthlog/common';

interface AuthContextType {
  user: User | null; // ✅ Use the new User type
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// A helper type for the decoded JWT payload
interface DecodedToken {
  exp: number;
  // Add other properties from your JWT payload if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); // ✅ Use the new User type
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleToken = useCallback(async (token: string | null) => {
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setAuthToken(token); // Set token for future api requests
          const { data } = await api.get<User>('/auth/me'); // Expect a User object
          setUser(data);
        } else {
          // Token is expired, clear it
          throw new Error('Token expired');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('accessToken');
      }
    } else {
      // No token found
      setAuthToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    handleToken(token);
  }, [handleToken]);

  const login = (token: string) => {
    // Persist the token in localStorage
    localStorage.setItem('accessToken', token);
    handleToken(token);
  };

  const logout = useCallback(async () => {
    // Optimistically update UI
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('accessToken');
    router.push('/login');

    // Attempt to invalidate token on backend
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // This error is not critical for the user flow
      console.error('Failed to logout on server:', error);
    }
  }, [router]);

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
