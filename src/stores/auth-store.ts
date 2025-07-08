import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, AuthError } from '@supabase/supabase-js';
import type { AuthStore, User, AuthEventHandler } from '@/types/auth';
import { 
  supabase, 
  signInWithPassword, 
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  updatePassword as supabaseUpdatePassword,
  resendEmailVerification,
  getCurrentSession,
  getCurrentUser
} from '@/lib/supabase';
import { 
  mapAuthError, 
  transformSupabaseUser,
  getRedirectPath,
  setStorageItem,
  removeStorageItem,
  AUTH_STORAGE_KEYS
} from '@/lib/auth-utils';

/**
 * Zustand store for authentication state management
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        console.log('🏪 Auth Store - Login attempt started');
        console.log('Email:', email);
        console.log('Password length:', password.length);
        
        set({ isLoading: true, error: null });
        
        try {
          console.log('📞 Calling signInWithPassword...');
          const { user: supabaseUser, session } = await signInWithPassword(email, password);
          
          console.log('📨 signInWithPassword response:');
          console.log('User:', supabaseUser);
          console.log('Session:', session);
          
          if (!supabaseUser || !session) {
            console.error('❌ No user or session returned from Supabase');
            throw new Error('Login failed: No user or session returned');
          }

          console.log('🔄 Transforming Supabase user...');
          const user = transformSupabaseUser(supabaseUser, session);
          console.log('Transformed user:', user);
          
          console.log('💾 Updating auth store state...');
          set({
            user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          // Store email for "remember me" functionality
          setStorageItem(AUTH_STORAGE_KEYS.LAST_LOGIN_EMAIL, email);
          console.log('✅ Login successful - auth store updated');

        } catch (error) {
          console.error('💥 Auth Store - Login error caught:', error);
          const authError = mapAuthError(error as AuthError);
          console.log('🔄 Mapped auth error:', authError);
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: authError.message
          });
          
          console.log('❌ Auth store updated with error state');
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await supabaseSignOut();
          
          // Clear stored data
          removeStorageItem(AUTH_STORAGE_KEYS.REMEMBER_EMAIL);
          removeStorageItem(AUTH_STORAGE_KEYS.AUTH_REDIRECT);
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

          // Navigate to landing page after successful logout
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Even if logout fails, clear local state and redirect
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });

          // Navigate to landing page even if logout fails
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await supabaseResetPassword(email);
          set({ isLoading: false });
        } catch (error) {
          const authError = mapAuthError(error as AuthError);
          set({
            isLoading: false,
            error: authError.message
          });
          throw error;
        }
      },

      updatePassword: async (password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await supabaseUpdatePassword(password);
          set({ isLoading: false });
        } catch (error) {
          const authError = mapAuthError(error as AuthError);
          set({
            isLoading: false,
            error: authError.message
          });
          throw error;
        }
      },

      resendVerification: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await resendEmailVerification();
          set({ isLoading: false });
        } catch (error) {
          const authError = mapAuthError(error as AuthError);
          set({
            isLoading: false,
            error: authError.message
          });
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user,
          isAuthenticated: !!user
        });
      },

      setSession: (session: Session | null) => {
        set({ session });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      initialize: async () => {
        if (get().isInitialized) {
          return;
        }

        set({ isLoading: true });

        try {
          // Get current session
          const session = await getCurrentSession();
          
          if (session?.user) {
            const user = transformSupabaseUser(session.user, session);
            set({
              user,
              session,
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false
            });
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isInitialized: true,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
            error: 'Failed to initialize authentication'
          });
        }
      }
    }),
    {
      name: 'brius-auth-storage',
      partialize: (state) => ({
        // Only persist essential state, not sensitive data
        isInitialized: state.isInitialized,
        // Don't persist user, session, or error - these will be restored from Supabase
      }),
    }
  )
);

/**
 * Set up Supabase auth state change listener
 */
let authListenerInitialized = false;

export const initializeAuthListener = () => {
  if (authListenerInitialized) {
    return;
  }

  authListenerInitialized = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    const store = useAuthStore.getState();
    
    console.log('Auth state change:', event, session?.user?.email);

    switch (event) {
      case 'SIGNED_IN':
        if (session?.user) {
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
          store.clearError();
        }
        break;

      case 'SIGNED_OUT':
        store.setUser(null);
        store.setSession(null);
        store.clearError();
        break;

      case 'TOKEN_REFRESHED':
        if (session?.user) {
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
        }
        break;

      case 'USER_UPDATED':
        if (session?.user) {
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
        }
        break;

      case 'PASSWORD_RECOVERY':
        // Handle password recovery if needed
        console.log('Password recovery event detected');
        break;

      default:
        console.log('Unhandled auth event:', event);
    }
  });
};

/**
 * Initialize auth on store creation
 */
if (typeof window !== 'undefined') {
  // Initialize auth listener
  initializeAuthListener();
  
  // Initialize auth state
  useAuthStore.getState().initialize();
}
