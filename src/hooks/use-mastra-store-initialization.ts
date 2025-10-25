/**
 * Mastra Store Initialization Hook
 * 
 * Orchestrates initialization of all Zustand stores with data from the Mastra agent server.
 * Called on app startup after user authentication to populate stores with cached data.
 * 
 * @module use-mastra-store-initialization
 */

import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/assistant/chat-store';
import { useMastraOrchestratorStore } from '@/stores/mastra-orchestrator-store';

/**
 * Store initialization status interface
 */
export interface StoreInitializationStatus {
  chatStore: 'idle' | 'loading' | 'success' | 'error';
  orchestratorStore: 'idle' | 'loading' | 'success' | 'error';
  isInitialized: boolean;
  errors: string[];
}

/**
 * Hook for initializing all Mastra-integrated stores on app startup
 * 
 * @param userId - The authenticated user's ID (required)
 * @param enabled - Whether to run initialization (default: true)
 * @returns Initialization status and control functions
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { user } = useAuth();
 *   const { isInitialized, errors } = useMastraStoreInitialization(user?.id, !!user);
 *   
 *   if (!isInitialized) {
 *     return <LoadingScreen />;
 *   }
 *   
 *   return <MainApp />;
 * }
 * ```
 */
export function useMastraStoreInitialization(
  userId: string | undefined,
  enabled: boolean = true
) {
  const [status, setStatus] = useState<StoreInitializationStatus>({
    chatStore: 'idle',
    orchestratorStore: 'idle',
    isInitialized: false,
    errors: [],
  });
  
  // Use ref to track if initialization has been attempted
  const initializationAttempted = useRef(false);
  
  // Get store initialization functions
  const initializeChatStore = useChatStore(state => state.initializeWithMastra);
  const fetchAgentHealth = useMastraOrchestratorStore(state => state.fetchAgentHealthFromServer);
  
  useEffect(() => {
    // Skip if not enabled or userId not provided
    if (!enabled || !userId) {
      console.log('[MastraStoreInit] Initialization skipped', { enabled, hasUserId: !!userId });
      return;
    }
    
    // Skip if already attempted initialization
    if (initializationAttempted.current) {
      console.log('[MastraStoreInit] Already attempted initialization, skipping');
      return;
    }
    
    initializationAttempted.current = true;
    
    console.log('[MastraStoreInit] Starting store initialization', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    const initializeStores = async () => {
      const errors: string[] = [];
      
      // Initialize chat store (assistant/chat-store.ts)
      try {
        setStatus(prev => ({ ...prev, chatStore: 'loading' }));
        console.log('[MastraStoreInit] Initializing chat store');
        
        await initializeChatStore(userId);
        
        setStatus(prev => ({ ...prev, chatStore: 'success' }));
        console.log('[MastraStoreInit] Chat store initialized successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Chat store initialization failed';
        errors.push(errorMessage);
        setStatus(prev => ({ ...prev, chatStore: 'error' }));
        console.error('[MastraStoreInit] Chat store initialization failed', error);
      }
      
      // Initialize orchestrator store (fetch agent health)
      try {
        setStatus(prev => ({ ...prev, orchestratorStore: 'loading' }));
        console.log('[MastraStoreInit] Fetching agent health for orchestrator store');
        
        await fetchAgentHealth();
        
        setStatus(prev => ({ ...prev, orchestratorStore: 'success' }));
        console.log('[MastraStoreInit] Orchestrator store initialized successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Orchestrator store initialization failed';
        errors.push(errorMessage);
        setStatus(prev => ({ ...prev, orchestratorStore: 'error' }));
        console.error('[MastraStoreInit] Orchestrator store initialization failed', error);
      }
      
      // Mark as initialized even if there were errors
      // This prevents infinite retry loops and allows the app to function with local data
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        errors,
      }));
      
      const finalStatus = {
        chatStore: errors.length === 2 ? 'error' as const : 'success' as const,
        orchestratorStore: errors.length >= 1 ? 'error' as const : 'success' as const,
      };
      
      console.log('[MastraStoreInit] Store initialization complete', {
        ...finalStatus,
        errorCount: errors.length,
        errors
      });
    };
    
    initializeStores();
  }, [enabled, userId, initializeChatStore, fetchAgentHealth]);
  
  /**
   * Force re-initialization of all stores
   */
  const reinitialize = async () => {
    if (!userId) {
      console.warn('[MastraStoreInit] Cannot reinitialize without userId');
      return;
    }
    
    console.log('[MastraStoreInit] Force reinitializing stores');
    
    // Reset ref and status to trigger reinitialization
    initializationAttempted.current = false;
    
    setStatus({
      chatStore: 'idle',
      orchestratorStore: 'idle',
      isInitialized: false,
      errors: [],
    });
  };
  
  return {
    ...status,
    reinitialize,
    // Convenience flags
    hasErrors: status.errors.length > 0,
    allStoresReady: status.chatStore === 'success' &&
                    status.orchestratorStore === 'success',
  };
}

/**
 * Hook variant that returns just the initialization status boolean
 * Useful for simple loading screens
 * 
 * @param userId - The authenticated user's ID
 * @param enabled - Whether initialization is enabled (default: true)
 * @returns Boolean indicating if initialization is complete
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { user } = useAuth();
 *   const isReady = useMastraStoresReady(user?.id, !!user);
 *   
 *   if (!isReady) return <LoadingScreen />;
 *   return <MainApp />;
 * }
 * ```
 */
export function useMastraStoresReady(
  userId: string | undefined,
  enabled: boolean = true
): boolean {
  const { isInitialized } = useMastraStoreInitialization(userId, enabled);
  return isInitialized;
}

/**
 * Export convenience function to get initialization status from stores
 * without triggering initialization
 */
export function getMastraStoreInitializationStatus() {
  const chatInitialized = useChatStore.getState().isInitialized;
  
  return {
    chatStoreInitialized: chatInitialized,
    allInitialized: chatInitialized,
  };
}