import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { interceptAuthError } from './auth-error-interceptor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for environment variables
console.log('🔧 Supabase Debug - Environment Variables:');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Supabase client instance with proper TypeScript typing
 * Using singleton pattern to prevent multiple instances
 */
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn('Failed to get item from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Failed to set item in localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Failed to remove item from localStorage:', error);
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'brius-smile-nexus@1.0.0'
    }
  }
  });

  return supabaseInstance;
};

export const supabase = createSupabaseClient();

/**
 * Auth-specific utilities and configurations
 */
export const authConfig = {
  /**
   * Default redirect URLs for different auth flows
   */
  redirectUrls: {
    signIn: `${window.location.origin}/portal`,
    signUp: `${window.location.origin}/verify-email`,
    passwordReset: `${window.location.origin}/reset-password`,
    emailChange: `${window.location.origin}/portal`
  },

  /**
   * Email template configurations
   */
  emailTemplates: {
    passwordReset: {
      subject: 'Reset your Brius password',
      redirectTo: `${window.location.origin}/reset-password`
    },
    emailVerification: {
      subject: 'Verify your Brius account',
      redirectTo: `${window.location.origin}/verify-email`
    }
  },

  /**
   * Session configuration
   */
  session: {
    refreshThreshold: 60, // Refresh token when it expires in 60 seconds
    maxRetries: 3,
    retryDelay: 1000 // 1 second
  }
};

/**
 * Helper function to get the current session
 */
export const getCurrentSession = async () => {
  try {
    console.log('🔍 Supabase - getCurrentSession called');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Supabase - getCurrentSession error:', error);
      
      // Handle specific error types
      if (error.message?.includes('server responded with a status of 500')) {
        console.warn('⚠️ Supabase server error (500) - treating as no session');
        return null;
      }
      
      // Check if this is an auth error
      if (interceptAuthError(error, 'Supabase getCurrentSession')) {
        return null; // Auth error was handled
      }
      
      return null;
    }
    console.log('✅ Supabase - getCurrentSession success:', !!session);
    return session;
  } catch (error) {
    console.error('💥 Supabase - getCurrentSession failed:', error);
    
    // Handle network errors and server errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('500') || errorMessage.includes('server')) {
      console.warn('⚠️ Supabase server/network error - treating as no session');
      return null;
    }
    
    // Check if this is an auth error
    if (interceptAuthError(error, 'Supabase getCurrentSession Network')) {
      return null; // Auth error was handled
    }
    
    return null;
  }
};

/**
 * Helper function to get the current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

/**
 * Helper function to refresh the session
 */
export const refreshSession = async () => {
  try {
    console.log('🔄 Supabase - refreshSession called');
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('❌ Supabase - refreshSession error:', error);
      
      // Handle server errors gracefully
      if (error.message?.includes('server responded with a status of 500')) {
        console.warn('⚠️ Supabase server error (500) during refresh - session may be invalid');
        return null;
      }
      
      return null;
    }
    console.log('✅ Supabase - refreshSession success:', !!session);
    return session;
  } catch (error) {
    console.error('💥 Supabase - refreshSession failed:', error);
    
    // Handle network/server errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('500') || errorMessage.includes('server')) {
      console.warn('⚠️ Supabase server/network error during refresh');
    }
    
    return null;
  }
};

/**
 * Helper function to sign out
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
};

/**
 * Helper function to sign in with email and password
 */
export const signInWithPassword = async (email: string, password: string) => {
  try {
    console.log('🔍 Supabase - signInWithPassword called for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    
    if (error) {
      console.error('❌ Supabase - signInWithPassword error:', error);
      
      // Don't intercept login errors as auth failures (they're expected)
      // Just throw the original error for proper login error handling
      throw error;
    }
    
    console.log('✅ Supabase - signInWithPassword success');
    return data;
  } catch (error) {
    console.error('💥 Supabase - signInWithPassword failed:', error);
    throw error;
  }
};

/**
 * Helper function to reset password
 */
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: authConfig.emailTemplates.passwordReset.redirectTo
      }
    );
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
};

/**
 * Helper function to update password
 */
export const updatePassword = async (password: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to update password:', error);
    throw error;
  }
};

/**
 * Helper function to resend email verification
 */
export const resendEmailVerification = async () => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: '', // Will use the current user's email
      options: {
        emailRedirectTo: authConfig.emailTemplates.emailVerification.redirectTo
      }
    });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Failed to resend email verification:', error);
    throw error;
  }
};

/**
 * Type exports for convenience
 */
export type SupabaseClient = typeof supabase;
export type { Database } from '@/types/database';
