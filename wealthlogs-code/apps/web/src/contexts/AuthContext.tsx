/**
 * Enhanced Auth Context with Security Features
 * Provides secure authentication state management across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { AuthService } from '../services/api-service';
import {
  logger,
  metrics,
  SecurityService,
  RateLimiter,
  AppError
} from '@wealthlog/shared';

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  emailVerified: boolean;
  lastLogin?: Date;
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
  checkSession: () => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Inactivity timeout (15 minutes)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Refs for timeout management
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();
  const inactivityTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Rate limiter for sensitive operations
  const rateLimiter = useRef(new RateLimiter(5, 60000));

  /**
   * Clear all timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
  }, []);

  /**
   * Setup session timeout
   */
  const setupSessionTimeout = useCallback(() => {
    clearTimeouts();
    
    // Session timeout
    sessionTimeoutRef.current = setTimeout(() => {
      logger.warn('Session timeout reached');
      metrics.increment('auth.session_timeout');
      handleSessionExpired();
    }, SESSION_TIMEOUT);

    // Inactivity timeout
    resetInactivityTimeout();
  }, [clearTimeouts]);

  /**
   * Reset inactivity timeout on user activity
   */
  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      
      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        logger.warn('Inactivity timeout reached');
        metrics.increment('auth.inactivity_timeout');
        handleSessionExpired();
      } else {
        resetInactivityTimeout();
      }
    }, INACTIVITY_TIMEOUT);
  }, []);

  /**
   * Track user activity
   */
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetInactivityTimeout();
  }, [resetInactivityTimeout]);

  /**
   * Handle session expiration
   */
  const handleSessionExpired = useCallback(async () => {
    setUser(null);
    clearTimeouts();
    
    // Clear auth data
    AuthService.logout();
    
    // Show notification
    if (typeof window !== 'undefined') {
      alert('Your session has expired. Please login again.');
    }
    
    router.push('/login');
  }, [clearTimeouts, router]);

  /**
   * Check if session is valid
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        return false;
      }

      // Validate token format (basic check)
      if (token.split('.').length !== 3) {
        logger.warn('Invalid token format detected');
        return false;
      }

      // Check token expiration (decode JWT)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logger.info('Token expired');
          
          // Try to refresh
          await AuthService.refreshToken();
          return true;
        }
      } catch (e) {
        logger.error('Failed to decode token', e);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Session check failed', error);
      return false;
    }
  }, []);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check for existing session
        const hasValidSession = await checkSession();
        
        if (hasValidSession) {
          const userData = await AuthService.getCurrentUser();
          
          if (userData?.user) {
            setUser(userData.user);
            setupSessionTimeout();
            
            logger.info('User session restored');
            metrics.increment('auth.session_restored');
          }
        }
      } catch (error) {
        logger.error('Auth initialization failed', error);
        setError('Failed to restore session');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Setup activity tracking
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => {
        window.addEventListener(event, trackActivity);
      });

      // Cleanup
      return () => {
        events.forEach(event => {
          window.removeEventListener(event, trackActivity);
        });
        clearTimeouts();
      };
    }
  }, [checkSession, setupSessionTimeout, trackActivity, clearTimeouts]);

  /**
   * Login with security checks
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Rate limiting check
      if (!rateLimiter.current.isAllowed('login')) {
        throw new AppError({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts. Please wait.',
          statusCode: 429
        });
      }

      // Input validation
      if (!username || !password) {
        throw new AppError({
          code: 'VALIDATION_FAILED',
          message: 'Username and password are required',
          statusCode: 400
        });
      }

      // Sanitize inputs
      const sanitizedUsername = SecurityService.sanitizeHtml(username);
      
      // Perform login
      const response = await AuthService.login(sanitizedUsername, password);
      
      if (response?.user) {
        setUser(response.user);
        setupSessionTimeout();
        
        logger.info('Login successful', { 
          userId: response.user.id,
          username: response.user.username 
        });
        metrics.increment('auth.login.success');
        
        // Redirect based on role
        if (response.user.roles.includes('ADMIN')) {
          router.push('/admin/dashboard');
        } else {
          router.push('/landing/landing');
        }
      }
    } catch (error: any) {
      logger.error('Login failed', error);
      metrics.increment('auth.login.failed');
      
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router, setupSessionTimeout]);

  /**
   * Logout with cleanup
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear session
      await AuthService.logout();
      
      // Clear state
      setUser(null);
      clearTimeouts();
      
      logger.info('Logout successful');
      metrics.increment('auth.logout');
      
      router.push('/login');
    } catch (error) {
      logger.error('Logout failed', error);
    } finally {
      setLoading(false);
    }
  }, [clearTimeouts, router]);

  /**
   * Register with validation
   */
  const register = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      // Rate limiting check
      if (!rateLimiter.current.isAllowed('register')) {
        throw new AppError({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration attempts. Please wait.',
          statusCode: 429
        });
      }

      // Validate password strength
      const passwordStrength = SecurityService.getPasswordStrength(data.password);
      if (!passwordStrength.isStrong) {
        throw new AppError({
          code: 'VALIDATION_FAILED',
          message: 'Password is not strong enough',
          statusCode: 400,
          details: { feedback: passwordStrength.feedback }
        });
      }

      // Sanitize inputs
      const sanitizedData = {
        ...data,
        username: SecurityService.sanitizeHtml(data.username),
        email: SecurityService.sanitizeHtml(data.email),
        firstName: SecurityService.sanitizeHtml(data.firstName),
        lastName: SecurityService.sanitizeHtml(data.lastName)
      };

      // Perform registration
      await AuthService.register(sanitizedData);
      
      logger.info('Registration successful');
      metrics.increment('auth.register.success');
      
      // Redirect to login with success message
      router.push('/login?registered=true');
    } catch (error: any) {
      logger.error('Registration failed', error);
      metrics.increment('auth.register.failed');
      
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
      const userData = await AuthService.getCurrentUser();
      
      if (userData?.user) {
        setUser(userData.user);
        logger.info('User data refreshed');
      }
    } catch (error) {
      logger.error('Failed to refresh user data', error);
      
      // If refresh fails, check if session is still valid
      const isValid = await checkSession();
      if (!isValid) {
        handleSessionExpired();
      }
    }
  }, [checkSession, handleSessionExpired]);

  /**
   * Update password with validation
   */
  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate new password strength
      const passwordStrength = SecurityService.getPasswordStrength(newPassword);
      if (!passwordStrength.isStrong) {
        throw new AppError({
          code: 'VALIDATION_FAILED',
          message: 'New password is not strong enough',
          statusCode: 400,
          details: { feedback: passwordStrength.feedback }
        });
      }

      // Change password
      await AuthService.changePassword(currentPassword, newPassword);
      
      logger.info('Password updated successfully');
      metrics.increment('auth.password_change.success');
      
      // Force re-login for security
      await logout();
    } catch (error: any) {
      logger.error('Password update failed', error);
      metrics.increment('auth.password_change.failed');
      
      setError(error.message || 'Failed to update password');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [logout]);

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
    clearError,
    checkSession,
    updatePassword
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
            logger.warn('Access denied - insufficient permissions', {
              userId: user.id,
              requiredRoles: options.roles,
              userRoles: user.roles
            });
            router.push('/unauthorized');
          }
        }
      }
    }, [loading, isAuthenticated, user, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return null;
    }

    if (options?.roles && user) {
      const hasRequiredRole = options.roles.some(role => 
        user.roles.includes(role)
      );
      
      if (!hasRequiredRole) {
        return <div>Unauthorized</div>;
      }
    }

    return <Component {...props} />;
  };
}

export default AuthContext;
