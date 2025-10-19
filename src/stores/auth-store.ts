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
        console.log('🔄 Auth Store - Initialize called');
        
        if (get().isInitialized) {
          console.log('✅ Auth Store - Already initialized, skipping');
          return;
        }

        console.log('🚀 Auth Store - Starting initialization process');
        set({ isLoading: true });

        try {
          console.log('📞 Auth Store - Calling getCurrentSession...');
          // Get current session
          const session = await getCurrentSession();
          console.log('📨 Auth Store - getCurrentSession response:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            userEmail: session?.user?.email
          });
          
          if (session?.user) {
            console.log('👤 Auth Store - User found, transforming user data...');
            const user = transformSupabaseUser(session.user, session);
            console.log('✨ Auth Store - User transformed:', {
              userId: user.id,
              userEmail: user.email,
              isAuthenticated: true
            });
            
            set({
              user,
              session,
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false
            });
            console.log('✅ Auth Store - Initialization complete with authenticated user');
          } else {
            console.log('🚫 Auth Store - No user session found, setting unauthenticated state');
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isInitialized: true,
              isLoading: false
            });
            console.log('✅ Auth Store - Initialization complete without user');
          }
        } catch (error) {
          console.error('💥 Auth Store - Initialization error:', error);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
            error: 'Failed to initialize authentication'
          });
          console.log('❌ Auth Store - Initialization failed, error state set');
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
let authSubscription: { unsubscribe: () => void } | null = null;

export const initializeAuthListener = () => {
  console.log('🎧 Auth Store - initializeAuthListener called');
  
  if (authListenerInitialized && authSubscription) {
    console.log('✅ Auth Store - Auth listener already initialized, skipping');
    return authSubscription;
  }

  // Clean up any existing subscription
  if (authSubscription) {
    console.log('🧹 Auth Store - Cleaning up existing auth listener');
    authSubscription.unsubscribe();
  }

  console.log('🚀 Auth Store - Setting up auth state change listener');
  authListenerInitialized = true;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    const store = useAuthStore.getState();
    
    console.log('🔄 Auth Store - Auth state change detected:', {
      event,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      currentStoreUser: store.user?.id
    });

    switch (event) {
      case 'SIGNED_IN':
        console.log('✅ Auth Store - SIGNED_IN event processing');
        if (session?.user) {
          console.log('👤 Auth Store - Transforming user for SIGNED_IN');
          const user = transformSupabaseUser(session.user, session);
          console.log('📝 Auth Store - Setting user and session in store');
          store.setUser(user);
          store.setSession(session);
          store.clearError();
          console.log('✅ Auth Store - SIGNED_IN processing complete');
        } else {
          console.warn('⚠️ Auth Store - SIGNED_IN event but no user in session');
        }
        break;

      case 'SIGNED_OUT':
        console.log('🚪 Auth Store - SIGNED_OUT event processing');
        store.setUser(null);
        store.setSession(null);
        store.clearError();
        console.log('✅ Auth Store - SIGNED_OUT processing complete');
        break;

      case 'TOKEN_REFRESHED':
        console.log('🔄 Auth Store - TOKEN_REFRESHED event processing');
        if (session?.user) {
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
          console.log('✅ Auth Store - TOKEN_REFRESHED processing complete');
        } else {
          console.warn('⚠️ Auth Store - TOKEN_REFRESHED event but no user in session');
        }
        break;

      case 'USER_UPDATED':
        console.log('👤 Auth Store - USER_UPDATED event processing');
        if (session?.user) {
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
          console.log('✅ Auth Store - USER_UPDATED processing complete');
        } else {
          console.warn('⚠️ Auth Store - USER_UPDATED event but no user in session');
        }
        break;

      case 'PASSWORD_RECOVERY':
        console.log('🔑 Auth Store - PASSWORD_RECOVERY event detected');
        break;

      case 'INITIAL_SESSION':
        console.log('🚀 Auth Store - INITIAL_SESSION event processing');
        if (session?.user) {
          console.log('👤 Auth Store - Initial session has user, setting authenticated state');
          const user = transformSupabaseUser(session.user, session);
          store.setUser(user);
          store.setSession(session);
          store.clearError();
          console.log('✅ Auth Store - INITIAL_SESSION processing complete with user');
        } else {
          console.log('🚫 Auth Store - Initial session has no user, setting unauthenticated state');
          store.setUser(null);
          store.setSession(null);
          store.clearError();
          console.log('✅ Auth Store - INITIAL_SESSION processing complete without user');
        }
        break;

      default:
        console.log('❓ Auth Store - Unhandled auth event:', event);
    }
  });

  authSubscription = subscription;
  console.log('✅ Auth Store - Auth state change listener setup complete');
  return subscription;
};

/**
 * Initialize auth listener on store creation
 * Note: Auth state initialization is handled by AppInitializer component
 */
if (typeof window !== 'undefined') {
  // Initialize auth listener
  initializeAuthListener();
}
