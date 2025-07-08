import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import type { User, AuthErrorInfo, AuthErrorType, UserTransformer } from '@/types/auth';

/**
 * Maps Supabase auth errors to user-friendly error messages
 */
export const mapAuthError = (error: AuthError): AuthErrorInfo => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
    return {
      type: 'invalid_credentials',
      message: 'Invalid email or password. Please check your credentials and try again.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email address not confirmed')) {
    return {
      type: 'email_not_confirmed',
      message: 'Please check your email and click the verification link before signing in.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('user not found')) {
    return {
      type: 'user_not_found',
      message: 'No account found with this email address.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('short'))) {
    return {
      type: 'weak_password',
      message: 'Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('already registered') || errorMessage.includes('email already exists')) {
    return {
      type: 'email_already_exists',
      message: 'An account with this email address already exists.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      type: 'network_error',
      message: 'Network error. Please check your connection and try again.',
      originalError: error
    };
  }
  
  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error
  };
};

/**
 * Transforms a Supabase user to our application user format
 */
export const transformSupabaseUser: UserTransformer = (supabaseUser: SupabaseUser, session?: Session): User => {
  // Extract user metadata or use defaults
  const userMetadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0] || 'User',
    role: appMetadata.role || 'Operations Manager',
    permissions: appMetadata.permissions || ['home', 'assistant', 'library', 'orders', 'reports'],
    avatar: userMetadata.avatar_url || undefined,
    email_verified: supabaseUser.email_confirmed_at ? true : false,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at
  };
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  return { isValid: true };
};

/**
 * Generates a secure redirect URL for auth flows
 */
export const getAuthRedirectUrl = (path: string = '/portal'): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
};

/**
 * Extracts redirect path from URL parameters
 */
export const getRedirectPath = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirectTo');
  
  // Validate redirect path to prevent open redirects
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo;
  }
  
  return '/portal';
};

/**
 * Checks if user has required permissions
 */
export const hasPermission = (user: User | null, requiredPermissions: string[]): boolean => {
  if (!user || !requiredPermissions.length) {
    return true;
  }
  
  return requiredPermissions.every(permission => 
    user.permissions.includes(permission)
  );
};

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Debounce function for form validation
 */
export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Storage keys for auth-related data
 */
export const AUTH_STORAGE_KEYS = {
  REMEMBER_EMAIL: 'brius-remember-email',
  LAST_LOGIN_EMAIL: 'brius-last-login-email',
  AUTH_REDIRECT: 'brius-auth-redirect'
} as const;

/**
 * Safely stores data in localStorage
 */
export const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to store item in localStorage:', error);
  }
};

/**
 * Safely retrieves data from localStorage
 */
export const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to retrieve item from localStorage:', error);
    return null;
  }
};

/**
 * Safely removes data from localStorage
 */
export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove item from localStorage:', error);
  }
};