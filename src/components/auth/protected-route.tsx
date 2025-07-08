import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProtectedRoute } from '@/hooks/use-auth-redirect';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { ProtectedRouteProps } from '@/types/auth';

/**
 * Loading component displayed while authentication is being verified
 */
const AuthLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Protected Route Component
 * 
 * Wraps components that require authentication and optionally specific permissions.
 * Automatically redirects to login if user is not authenticated or lacks required permissions.
 * 
 * @param children - The component(s) to render if access is granted
 * @param fallback - Custom loading component (optional)
 * @param redirectTo - Custom redirect path for unauthorized access (optional)
 * @param requiredPermissions - Array of permissions required to access this route (optional)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = '/login',
  requiredPermissions = []
}) => {
  const location = useLocation();
  const { isAuthenticated, isInitialized, isLoading, hasAccess } = useProtectedRoute({
    requiredPermissions,
    fallbackPath: redirectTo
  });

  // Show loading state while authentication is being verified
  if (isLoading || !isInitialized) {
    return fallback || <AuthLoadingFallback />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname + location.search }}
        replace 
      />
    );
  }

  // Redirect to specified path if user lacks required permissions
  if (!hasAccess) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ 
          from: location.pathname + location.search,
          error: 'insufficient_permissions'
        }}
        replace 
      />
    );
  }

  // Render the protected content
  return <>{children}</>;
};

/**
 * Higher-order component for creating protected routes
 * 
 * @param Component - The component to protect
 * @param options - Protection options
 * @returns Protected component
 */
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermissions?: string[];
    fallback?: React.ReactNode;
    redirectTo?: string;
  }
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

/**
 * Role-based protected route component
 * 
 * @param children - The component(s) to render if access is granted
 * @param requiredRole - The role required to access this route
 * @param fallback - Custom loading component (optional)
 * @param redirectTo - Custom redirect path for unauthorized access (optional)
 */
export const RoleProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}> = ({
  children,
  requiredRole,
  fallback,
  redirectTo = '/portal'
}) => {
  const location = useLocation();
  const { isAuthenticated, isInitialized, isLoading } = useProtectedRoute();

  // Show loading state while authentication is being verified
  if (isLoading || !isInitialized) {
    return fallback || <AuthLoadingFallback />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname + location.search }}
        replace 
      />
    );
  }

  // Note: Role checking would need to be implemented in the useProtectedRoute hook
  // For now, we'll allow access if authenticated
  // TODO: Implement role-based access control

  return <>{children}</>;
};

/**
 * Permission-based route guard hook
 * Can be used within components to conditionally render content based on permissions
 */
export const usePermissionGuard = (requiredPermissions: string[]) => {
  const { hasAccess, isAuthenticated, isInitialized } = useProtectedRoute({
    requiredPermissions
  });

  return {
    hasAccess: hasAccess && isAuthenticated,
    isAuthenticated,
    isInitialized,
    canRender: isInitialized && isAuthenticated && hasAccess
  };
};

/**
 * Component for conditionally rendering content based on permissions
 */
export const PermissionGuard: React.FC<{
  requiredPermissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ requiredPermissions, children, fallback = null }) => {
  const { canRender } = usePermissionGuard(requiredPermissions);
  
  return canRender ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component for conditionally rendering content based on authentication status
 */
export const AuthGuard: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}> = ({ children, fallback = null, requireAuth = true }) => {
  const { isAuthenticated, isInitialized } = useProtectedRoute();
  
  if (!isInitialized) {
    return <>{fallback}</>;
  }
  
  const shouldRender = requireAuth ? isAuthenticated : !isAuthenticated;
  
  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;