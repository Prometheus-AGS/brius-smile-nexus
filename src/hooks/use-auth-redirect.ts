import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from '@/hooks/use-auth';
import { getRedirectPath, setStorageItem, getStorageItem, removeStorageItem, AUTH_STORAGE_KEYS } from '@/lib/auth-utils';

/**
 * Hook for managing authentication-related redirects
 */
export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthState();

  /**
   * Stores the current path for redirect after login
   */
  const storeRedirectPath = useCallback((path?: string) => {
    const redirectPath = path || location.pathname + location.search;
    
    // Don't store auth-related paths as redirect targets
    const authPaths = ['/login', '/reset-password', '/verify-email'];
    if (!authPaths.some(authPath => redirectPath.startsWith(authPath))) {
      setStorageItem(AUTH_STORAGE_KEYS.AUTH_REDIRECT, redirectPath);
    }
  }, [location]);

  /**
   * Gets the stored redirect path and clears it
   */
  const getAndClearRedirectPath = useCallback((): string => {
    const storedPath = getStorageItem(AUTH_STORAGE_KEYS.AUTH_REDIRECT);
    removeStorageItem(AUTH_STORAGE_KEYS.AUTH_REDIRECT);
    
    // Validate the stored path
    if (storedPath && storedPath.startsWith('/') && !storedPath.startsWith('//')) {
      return storedPath;
    }
    
    return '/portal';
  }, []);

  /**
   * Redirects to the appropriate page after login
   */
  const redirectAfterLogin = useCallback(() => {
    const redirectPath = getAndClearRedirectPath();
    navigate(redirectPath, { replace: true });
  }, [navigate, getAndClearRedirectPath]);

  /**
   * Redirects to login page with current path stored for later redirect
   */
  const redirectToLogin = useCallback((options?: { replace?: boolean; storePath?: boolean }) => {
    const { replace = false, storePath = true } = options || {};
    
    if (storePath) {
      storeRedirectPath();
    }
    
    navigate('/login', { replace });
  }, [navigate, storeRedirectPath]);

  /**
   * Redirects to portal if already authenticated
   */
  const redirectIfAuthenticated = useCallback((targetPath: string = '/portal') => {
    if (isAuthenticated && isInitialized) {
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);

  /**
   * Redirects to login if not authenticated
   */
  const redirectIfNotAuthenticated = useCallback(() => {
    if (!isAuthenticated && isInitialized) {
      redirectToLogin({ replace: true });
    }
  }, [isAuthenticated, isInitialized, redirectToLogin]);

  return {
    storeRedirectPath,
    getAndClearRedirectPath,
    redirectAfterLogin,
    redirectToLogin,
    redirectIfAuthenticated,
    redirectIfNotAuthenticated,
  };
};

/**
 * Hook for protecting routes that require authentication
 * Automatically redirects to login if not authenticated
 */
export const useProtectedRoute = (options?: { 
  requiredPermissions?: string[];
  fallbackPath?: string;
}) => {
  const { isAuthenticated, isInitialized, user } = useAuthState();
  const { redirectToLogin } = useAuthRedirect();
  const { requiredPermissions = [], fallbackPath = '/login' } = options || {};

  useEffect(() => {
    if (!isInitialized) {
      return; // Wait for auth to initialize
    }

    if (!isAuthenticated) {
      redirectToLogin({ replace: true });
      return;
    }

    // Check permissions if required
    if (requiredPermissions.length > 0 && user) {
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        user.permissions.includes(permission)
      );

      if (!hasRequiredPermissions) {
        // User doesn't have required permissions, redirect to fallback
        window.location.href = fallbackPath;
        return;
      }
    }
  }, [isAuthenticated, isInitialized, user, requiredPermissions, fallbackPath, redirectToLogin]);

  return {
    isAuthenticated,
    isInitialized,
    isLoading: !isInitialized,
    hasAccess: isAuthenticated && (
      requiredPermissions.length === 0 || 
      (user && requiredPermissions.every(permission => user.permissions.includes(permission)))
    ),
  };
};

/**
 * Hook for public routes that should redirect authenticated users
 * Automatically redirects to portal if already authenticated
 */
export const usePublicRoute = (options?: { 
  redirectPath?: string;
  allowAuthenticated?: boolean;
}) => {
  const { isAuthenticated, isInitialized } = useAuthState();
  const { redirectIfAuthenticated } = useAuthRedirect();
  const { redirectPath = '/portal', allowAuthenticated = false } = options || {};

  useEffect(() => {
    if (!isInitialized) {
      return; // Wait for auth to initialize
    }

    if (isAuthenticated && !allowAuthenticated) {
      redirectIfAuthenticated(redirectPath);
    }
  }, [isAuthenticated, isInitialized, allowAuthenticated, redirectPath, redirectIfAuthenticated]);

  return {
    isAuthenticated,
    isInitialized,
    isLoading: !isInitialized,
    shouldRender: !isAuthenticated || allowAuthenticated,
  };
};

/**
 * Hook for handling URL-based authentication flows (email verification, password reset)
 */
export const useAuthFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Extracts auth tokens from URL hash or search params
   */
  const extractAuthTokens = useCallback(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const searchParams = new URLSearchParams(location.search);
    
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const type = hashParams.get('type') || searchParams.get('type');
    const error = hashParams.get('error') || searchParams.get('error');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

    return {
      accessToken,
      refreshToken,
      type,
      error,
      errorDescription,
    };
  }, [location]);

  /**
   * Clears auth tokens from URL
   */
  const clearAuthTokensFromUrl = useCallback(() => {
    // Remove hash and search params related to auth
    const newUrl = window.location.pathname;
    navigate(newUrl, { replace: true });
  }, [navigate]);

  /**
   * Handles auth flow completion
   */
  const handleAuthFlowComplete = useCallback((success: boolean, redirectPath?: string) => {
    clearAuthTokensFromUrl();
    
    if (success) {
      navigate(redirectPath || '/portal', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, clearAuthTokensFromUrl]);

  return {
    extractAuthTokens,
    clearAuthTokensFromUrl,
    handleAuthFlowComplete,
  };
};