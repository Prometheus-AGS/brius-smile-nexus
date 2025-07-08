import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';

/**
 * Extended user interface that includes application-specific fields
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  avatar?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

/**
 * Complete auth store interface
 */
export interface AuthStore extends AuthState, AuthActions {}

/**
 * Login form data interface
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Password reset form data interface
 */
export interface PasswordResetFormData {
  email: string;
}

/**
 * New password form data interface
 */
export interface NewPasswordFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Auth error types
 */
export type AuthErrorType = 
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_not_found'
  | 'weak_password'
  | 'email_already_exists'
  | 'network_error'
  | 'unknown_error';

/**
 * Structured auth error interface
 */
export interface AuthErrorInfo {
  type: AuthErrorType;
  message: string;
  originalError?: AuthError;
}

/**
 * Auth redirect options
 */
export interface AuthRedirectOptions {
  redirectTo?: string;
  replace?: boolean;
}

/**
 * Protected route props
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requiredPermissions?: string[];
}

/**
 * Utility type for transforming Supabase user to app user
 */
export type UserTransformer = (supabaseUser: SupabaseUser, session?: Session) => User;

/**
 * Auth event types
 */
export type AuthEventType = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

/**
 * Auth event handler type
 */
export type AuthEventHandler = (event: AuthEventType, session: Session | null) => void;