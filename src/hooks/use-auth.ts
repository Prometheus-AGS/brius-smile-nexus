import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/auth';

/**
 * Custom hook for accessing authentication state and actions
 * This hook provides a clean interface to the auth store following the established pattern
 */
export const useAuth = () => {
  // Auth state selectors
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);

  // Auth actions
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const resendVerification = useAuthStore((state) => state.resendVerification);
  const setUser = useAuthStore((state) => state.setUser);
  const setError = useAuthStore((state) => state.setError);
  const clearError = useAuthStore((state) => state.clearError);
  const initialize = useAuthStore((state) => state.initialize);

  // Memoized helper functions
  const hasPermission = useCallback((requiredPermissions: string[]): boolean => {
    if (!user || !requiredPermissions.length) {
      return true;
    }
    
    return requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
  }, [user]);

  const hasRole = useCallback((requiredRole: string): boolean => {
    return user?.role === requiredRole;
  }, [user]);

  const isEmailVerified = useCallback((): boolean => {
    return user?.email_verified === true;
  }, [user]);

  // Wrapped login function with additional error handling
  const loginWithErrorHandling = useCallback(async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (error) {
      // Error is already handled in the store, but we can add additional logging here
      console.error('Login failed:', error);
      throw error;
    }
  }, [login]);

  // Wrapped logout function with additional cleanup
  const logoutWithCleanup = useCallback(async () => {
    try {
      await logout();
      // Additional cleanup can be added here if needed
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [logout]);

  // Wrapped password reset with validation
  const resetPasswordWithValidation = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    
    try {
      await resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, [resetPassword]);

  // Wrapped password update with validation
  const updatePasswordWithValidation = useCallback(async (password: string) => {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    try {
      await updatePassword(password);
    } catch (error) {
      console.error('Password update failed:', error);
      throw error;
    }
  }, [updatePassword]);

  return {
    // State
    user,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,

    // Actions
    login: loginWithErrorHandling,
    logout: logoutWithCleanup,
    resetPassword: resetPasswordWithValidation,
    updatePassword: updatePasswordWithValidation,
    resendVerification,
    setUser,
    setError,
    clearError,
    initialize,

    // Helper functions
    hasPermission,
    hasRole,
    isEmailVerified,
  };
};

/**
 * Hook for accessing only authentication state (no actions)
 * Useful for components that only need to read auth state
 */
export const useAuthState = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
  };
};

/**
 * Hook for accessing only authentication actions
 * Useful for components that only need to perform auth actions
 */
export const useAuthActions = () => {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const resendVerification = useAuthStore((state) => state.resendVerification);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    login,
    logout,
    resetPassword,
    updatePassword,
    resendVerification,
    clearError,
  };
};

/**
 * Hook for checking user permissions
 * Returns a function that can check if user has specific permissions
 */
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  const hasPermission = useCallback((requiredPermissions: string | string[]): boolean => {
    if (!user) {
      return false;
    }

    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    return permissions.every(permission => 
      user.permissions.includes(permission)
    );
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user || !permissions.length) {
      return false;
    }

    return permissions.some(permission => 
      user.permissions.includes(permission)
    );
  }, [user]);

  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role;
  }, [user]);

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    userPermissions: user?.permissions || [],
    userRole: user?.role,
  };
};
