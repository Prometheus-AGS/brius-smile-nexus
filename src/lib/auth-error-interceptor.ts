/**
 * Authentication Error Interceptor
 * 
 * Centralized error handling for authentication failures across all API calls
 * Detects expired tokens and automatically clears auth state + redirects to login
 */

import { useAuthStore } from '@/stores/auth-store';

/**
 * Authentication error types that should trigger logout
 */
const AUTH_ERROR_CODES = [
  'INVALID_JWT',
  'JWT_EXPIRED', 
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'TOKEN_EXPIRED',
  'SESSION_EXPIRED'
];

/**
 * HTTP status codes that indicate authentication failure
 */
const AUTH_ERROR_STATUS_CODES = [401, 403];

/**
 * Check if an error indicates authentication failure
 */
export function isAuthenticationError(error: unknown): boolean {
  console.log('🔍 Auth Interceptor - Checking if error is auth-related:', error);
  
  if (!error) return false;

  // Check Supabase auth errors
  if (typeof error === 'object' && error !== null) {
    // Type guard for objects with potential auth error properties
    const hasCode = 'code' in error && typeof (error as { code: unknown }).code === 'string';
    const hasMessage = 'message' in error && typeof (error as { message: unknown }).message === 'string';
    const hasStatus = 'status' in error && typeof (error as { status: unknown }).status === 'number';
    
    // Check error code
    if (hasCode) {
      const code = (error as { code: string }).code;
      if (AUTH_ERROR_CODES.includes(code)) {
        console.log('🚨 Auth Interceptor - Detected auth error by code:', code);
        return true;
      }
    }
    
    // Check error message
    if (hasMessage) {
      const message = (error as { message: string }).message.toLowerCase();
      const authKeywords = ['jwt', 'token', 'expired', 'unauthorized', 'forbidden', 'invalid credentials'];
      if (authKeywords.some(keyword => message.includes(keyword))) {
        console.log('🚨 Auth Interceptor - Detected auth error by message:', (error as { message: string }).message);
        return true;
      }
    }
    
    // Check HTTP status codes
    if (hasStatus) {
      const status = (error as { status: number }).status;
      if (AUTH_ERROR_STATUS_CODES.includes(status)) {
        console.log('🚨 Auth Interceptor - Detected auth error by status:', status);
        return true;
      }
    }
  }

  // Check if it's a fetch Response with auth error status
  if (error instanceof Response && AUTH_ERROR_STATUS_CODES.includes(error.status)) {
    console.log('🚨 Auth Interceptor - Detected auth error from Response status:', error.status);
    return true;
  }

  // Check if it's a generic Error with auth-related message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const authKeywords = ['jwt', 'token', 'expired', 'unauthorized', 'forbidden', 'invalid credentials'];
    if (authKeywords.some(keyword => message.includes(keyword))) {
      console.log('🚨 Auth Interceptor - Detected auth error from Error message:', error.message);
      return true;
    }
  }

  console.log('✅ Auth Interceptor - Error is not auth-related');
  return false;
}

/**
 * Handle authentication error by clearing auth state and redirecting
 */
export function handleAuthenticationError(error: unknown, context?: string): void {
  console.log('🚨 Auth Interceptor - Handling authentication error:', { error, context });
  
  const authStore = useAuthStore.getState();
  
  // Clear auth state
  console.log('🧹 Auth Interceptor - Clearing auth state');
  authStore.setUser(null);
  authStore.setSession(null);
  authStore.clearError();
  
  // Clear any stored auth data
  try {
    localStorage.removeItem('brius-auth-storage');
    sessionStorage.clear();
    console.log('🧹 Auth Interceptor - Cleared stored auth data');
  } catch (storageError) {
    console.warn('⚠️ Auth Interceptor - Failed to clear storage:', storageError);
  }
  
  // Redirect to login
  console.log('🔄 Auth Interceptor - Redirecting to login');
  if (typeof window !== 'undefined') {
    // Use replace to prevent back button issues
    window.location.replace('/login');
  }
}

/**
 * Global error interceptor function
 * Call this from any API error handler to check for auth failures
 */
export function interceptAuthError(error: unknown, context?: string): boolean {
  console.log('🔍 Auth Interceptor - interceptAuthError called:', { context, error });
  
  if (isAuthenticationError(error)) {
    console.log('🚨 Auth Interceptor - Authentication error detected, handling...');
    handleAuthenticationError(error, context);
    return true; // Error was handled
  }
  
  console.log('✅ Auth Interceptor - No auth error detected, continuing normal error handling');
  return false; // Error was not an auth error
}

/**
 * Wrapper for API calls that automatically handles auth errors
 */
export async function withAuthErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    console.log('🔄 Auth Interceptor - Executing API call with auth error handling:', context);
    const result = await apiCall();
    console.log('✅ Auth Interceptor - API call successful:', context);
    return result;
  } catch (error) {
    console.log('❌ Auth Interceptor - API call failed:', { context, error });
    
    // Check if it's an auth error and handle it
    if (interceptAuthError(error, context)) {
      // Auth error was handled, throw a user-friendly error
      throw new Error('Your session has expired. Please log in again.');
    }
    
    // Not an auth error, re-throw the original error
    throw error;
  }
}