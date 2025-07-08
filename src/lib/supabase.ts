import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Failed to get current session:', error);
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
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Failed to refresh session:', error);
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to sign in:', error);
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
