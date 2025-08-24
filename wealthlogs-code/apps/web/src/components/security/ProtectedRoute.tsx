/**
 * Protected Route Component with Security Features
 * Provides route protection with role-based access control
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { logger, metrics } from '@wealthlog/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireEmailVerification?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Protected Route Component
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requireEmailVerification = true,
  redirectTo = '/login',
  fallback = <LoadingSpinner />
}) => {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      // Wait for auth to load
      if (loading) return;

      // Check authentication
      if (!isAuthenticated || !user) {
        logger.warn('Unauthenticated access attempt', {
          path: router.pathname,
          query: router.query
        });
        metrics.increment('security.unauthorized_access');
        
        // Store attempted URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', router.asPath);
        
        router.push(`${redirectTo}?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }

      // Check email verification
      if (requireEmailVerification && !user.emailVerified) {
        logger.warn('Unverified email access attempt', {
          userId: user.id,
          path: router.pathname
        });
        router.push('/verify-email');
        return;
      }

      // Check role-based access
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => 
          user.roles.includes(role)
        );

        if (!hasRequiredRole) {
          logger.warn('Insufficient permissions', {
            userId: user.id,
            userRoles: user.roles,
            requiredRoles,
            path: router.pathname
          });
          metrics.increment('security.forbidden_access');
          
          router.push('/unauthorized');
          return;
        }
      }

      // All checks passed
      setAuthorized(true);
      
      logger.info('Authorized access', {
        userId: user.id,
        path: router.pathname
      });
    };

    checkAuthorization();
  }, [user, loading, isAuthenticated, requiredRoles, requireEmailVerification, router, redirectTo]);

  // Show loading state
  if (loading || !authorized) {
    return <>{fallback}</>;
  }

  // Render protected content
  return <>{children}</>;
};

/**
 * Loading Spinner Component
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

/**
 * Admin Route Component
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute requiredRoles={['ADMIN']} redirectTo="/unauthorized">
      {children}
    </ProtectedRoute>
  );
};

/**
 * Member Route Component
 */
export const MemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute requiredRoles={['MEMBER', 'ADMIN']}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Public Route Component (opposite of protected)
 */
export const PublicRoute: React.FC<{ 
  children: React.ReactNode;
  redirectTo?: string;
}> = ({ children, redirectTo = '/dashboard' }) => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect authenticated users away from public routes
      const redirect = router.query.redirect as string || redirectTo;
      router.push(redirect);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  if (loading || isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
};

/**
 * Route Guard HOC
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRoles?: string[];
    requireEmailVerification?: boolean;
    redirectTo?: string;
  }
) {
  return function GuardedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Permission Check Component
 */
export const PermissionCheck: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permissions: string[];
  requireAll?: boolean;
}> = ({ children, fallback = null, permissions, requireAll = false }) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  const hasPermission = requireAll
    ? permissions.every(perm => user.roles.includes(perm))
    : permissions.some(perm => user.roles.includes(perm));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default {
  ProtectedRoute,
  AdminRoute,
  MemberRoute,
  PublicRoute,
  withRouteGuard,
  PermissionCheck
};
