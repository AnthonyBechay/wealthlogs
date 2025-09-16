/**
 * Auth Context - Simple and reliable authentication state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import authService from '../services/auth.service';

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check for existing token
        const token = localStorage.getItem('accessToken');
        
        if (token) {
          try {
            // Try to get current user
            const userData = await authService.getCurrentUser();
            
            if (userData?.user) {
              setUser(userData.user);
              console.log('User session restored');
            }
          } catch (error) {
            console.log('Token expired or invalid, clearing...');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (error) {
        console.error('Auth initialization failed', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Input validation
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Perform login
      const response = await authService.login(username, password);
      
      if (response?.user) {
        setUser(response.user);
        console.log('Login successful');
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Login failed', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint
      await authService.logout();
      
      // Clear state
      setUser(null);
      
      console.log('Logout successful');
      
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Register new user
   */
  const register = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      // Basic validation
      if (!data.username || !data.email || !data.password) {
        throw new Error('Required fields are missing');
      }

      // Password strength check (simple)
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Perform registration
      await authService.register(data);
      
      console.log('Registration successful');
      
      // Redirect to login with success message
      router.push('/login?registered=true');
    } catch (error: any) {
      console.error('Registration failed', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      
      if (userData?.user) {
        setUser(userData.user);
        console.log('User data refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh user data', error);
      
      // If refresh fails, clear user
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Context value
  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshUser,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * HOC for protected routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    roles?: string[];
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          router.push(options?.redirectTo || '/login');
        } else if (options?.roles && user) {
          const hasRequiredRole = options.roles.some(role => 
            user.roles.includes(role)
          );
          
          if (!hasRequiredRole) {
            console.warn('Access denied - insufficient permissions');
            router.push('/unauthorized');
          }
        }
      }
    }, [loading, isAuthenticated, user, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (options?.roles && user) {
      const hasRequiredRole = options.roles.some(role => 
        user.roles.includes(role)
      );
      
      if (!hasRequiredRole) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
              <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
            </div>
          </div>
        );
      }
    }

    return <Component {...props} />;
  };
}

export default AuthContext;
