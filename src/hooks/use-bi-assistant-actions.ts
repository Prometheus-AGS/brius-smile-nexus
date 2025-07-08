import { useBIAssistantStore } from '@/stores/bi-assistant-store';
import type { 
  BIMessage, 
  BIThread, 
  MastraClientConfig, 
  BIRuntimeConfig,
  BusinessIntelligenceContext,
  BISendMessageConfig
} from '@/types/assistant';

/**
 * Custom hook for accessing BI Assistant streaming actions
 * Provides methods for managing streaming operations
 */
export const useBIAssistantStreamingActions = () => {
  const actions = useBIAssistantStore(state => state.actions.streaming);
  
  return {
    /**
     * Start streaming for a specific message
     */
    startStreaming: actions.startStreaming,
    
    /**
     * Update streaming content in real-time
     */
    updateStreamingContent: actions.updateStreamingContent,
    
    /**
     * Finish streaming operation
     */
    finishStreaming: actions.finishStreaming,
    
    /**
     * Set streaming error
     */
    setStreamingError: actions.setStreamingError,
    
    /**
     * Reset streaming state
     */
    resetStreaming: actions.resetStreaming
  };
};

/**
 * Custom hook for accessing BI Assistant UI actions
 * Provides methods for managing UI state
 */
export const useBIAssistantUIActions = () => {
  const actions = useBIAssistantStore(state => state.actions.ui);
  
  return {
    /**
     * Set loading state
     */
    setLoading: actions.setLoading,
    
    /**
     * Set processing state
     */
    setProcessing: actions.setProcessing,
    
    /**
     * Set input disabled state
     */
    setInputDisabled: actions.setInputDisabled,
    
    /**
     * Show welcome screen
     */
    showWelcomeScreen: actions.showWelcomeScreen,
    
    /**
     * Hide welcome screen
     */
    hideWelcomeScreen: actions.hideWelcomeScreen,
    
    /**
     * Update last activity timestamp
     */
    updateLastActivity: actions.updateLastActivity,
    
    /**
     * Reset UI state to initial values
     */
    resetUI: actions.resetUI
  };
};

/**
 * Custom hook for accessing BI Assistant connection actions
 * Provides methods for managing connection state
 */
export const useBIAssistantConnectionActions = () => {
  const actions = useBIAssistantStore(state => state.actions.connection);
  
  return {
    /**
     * Connect to Mastra client
     */
    connect: actions.connect,
    
    /**
     * Disconnect from Mastra client
     */
    disconnect: actions.disconnect,
    
    /**
     * Reconnect to Mastra client
     */
    reconnect: actions.reconnect,
    
    /**
     * Set connection error
     */
    setConnectionError: actions.setConnectionError,
    
    /**
     * Reset connection state
     */
    resetConnection: actions.resetConnection,
    
    /**
     * Increment retry count
     */
    incrementRetryCount: actions.incrementRetryCount,
    
    /**
     * Reset retry count
     */
    resetRetryCount: actions.resetRetryCount
  };
};

/**
 * Custom hook for accessing BI Assistant thread actions
 * Provides methods for managing thread operations
 */
export const useBIAssistantThreadActions = () => {
  const actions = useBIAssistantStore(state => state.actions.threads);
  
  return {
    /**
     * Create a new thread
     */
    createThread: (config?: Partial<BIThread>) => actions.createThread(config),
    
    /**
     * Switch to an existing thread
     */
    switchThread: actions.switchThread,
    
    /**
     * Delete a thread
     */
    deleteThread: actions.deleteThread,
    
    /**
     * Update thread properties
     */
    updateThread: actions.updateThread,
    
    /**
     * Load threads from storage
     */
    loadThreads: actions.loadThreads,
    
    /**
     * Clear thread history
     */
    clearThreadHistory: actions.clearThreadHistory,
    
    /**
     * Add thread to history
     */
    addToThreadHistory: actions.addToThreadHistory
  };
};

/**
 * Custom hook for accessing BI Assistant message actions
 * Provides methods for managing message operations
 */
export const useBIAssistantMessageActions = () => {
  const actions = useBIAssistantStore(state => state.actions.messages);
  
  return {
    /**
     * Send a message and handle streaming response
     */
    sendMessage: (config: BISendMessageConfig) => actions.sendMessage(config),
    
    /**
     * Add a message to the current thread
     */
    addMessage: actions.addMessage,
    
    /**
     * Update an existing message
     */
    updateMessage: actions.updateMessage,
    
    /**
     * Delete a message
     */
    deleteMessage: actions.deleteMessage,
    
    /**
     * Clear all messages in current thread
     */
    clearMessages: actions.clearMessages,
    
    /**
     * Load messages for a specific thread
     */
    loadMessageHistory: actions.loadMessageHistory,
    
    /**
     * Set pending message
     */
    setPendingMessage: actions.setPendingMessage
  };
};

/**
 * Custom hook for accessing BI Assistant configuration actions
 * Provides methods for managing configuration state
 */
export const useBIAssistantConfigActions = () => {
  const actions = useBIAssistantStore(state => state.actions.config);
  
  return {
    /**
     * Initialize the assistant with configuration
     */
    initialize: (config?: BIRuntimeConfig) => actions.initialize(config),
    
    /**
     * Update Mastra client configuration
     */
    updateMastraConfig: (config: Partial<MastraClientConfig>) => actions.updateMastraConfig(config),
    
    /**
     * Update runtime configuration
     */
    updateRuntimeConfig: (config: Partial<BIRuntimeConfig>) => actions.updateRuntimeConfig(config),
    
    /**
     * Set business intelligence context
     */
    setBusinessContext: (context: BusinessIntelligenceContext | null) => actions.setBusinessContext(context),
    
    /**
     * Set agent ID
     */
    setAgentId: (agentId: string | null) => actions.setAgentId(agentId),
    
    /**
     * Set resource ID
     */
    setResourceId: (resourceId: string | null) => actions.setResourceId(resourceId)
  };
};

/**
 * Custom hook for accessing BI Assistant global actions
 * Provides methods for global state management
 */
export const useBIAssistantGlobalActions = () => {
  const actions = useBIAssistantStore(state => state.actions.global);
  
  return {
    /**
     * Set global error state
     */
    setError: actions.setError,
    
    /**
     * Clear global error state
     */
    clearError: actions.clearError,
    
    /**
     * Reset entire store to initial state
     */
    reset: actions.reset,
    
    /**
     * Cleanup store and disconnect
     */
    cleanup: actions.cleanup
  };
};

/**
 * Main hook that provides access to all BI Assistant actions
 * Organized by functional area for easy access
 */
export const useBIAssistantActions = () => {
  const streamingActions = useBIAssistantStreamingActions();
  const uiActions = useBIAssistantUIActions();
  const connectionActions = useBIAssistantConnectionActions();
  const threadActions = useBIAssistantThreadActions();
  const messageActions = useBIAssistantMessageActions();
  const configActions = useBIAssistantConfigActions();
  const globalActions = useBIAssistantGlobalActions();
  
  return {
    streaming: streamingActions,
    ui: uiActions,
    connection: connectionActions,
    threads: threadActions,
    messages: messageActions,
    config: configActions,
    global: globalActions
  };
};

/**
 * Convenience hooks for common action combinations
 */

/**
 * Hook for sending messages with proper error handling
 */
export const useSendMessage = () => {
  const { sendMessage } = useBIAssistantMessageActions();
  const { setError, clearError } = useBIAssistantGlobalActions();
  
  return async (config: BISendMessageConfig) => {
    try {
      clearError();
      await sendMessage(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError({
        type: 'server',
        message: errorMessage,
        timestamp: new Date(),
        details: { error }
      });
      throw error;
    }
  };
};

/**
 * Hook for initializing the assistant with error handling
 */
export const useInitializeAssistant = () => {
  const { initialize } = useBIAssistantConfigActions();
  const { setError, clearError } = useBIAssistantGlobalActions();
  
  return async (config?: BIRuntimeConfig) => {
    try {
      clearError();
      await initialize(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize assistant';
      setError({
        type: 'connection',
        message: errorMessage,
        timestamp: new Date(),
        details: { error }
      });
      throw error;
    }
  };
};

/**
 * Hook for creating threads with error handling
 */
export const useCreateThread = () => {
  const { createThread } = useBIAssistantThreadActions();
  const { setError, clearError } = useBIAssistantGlobalActions();
  
  return async (config?: Partial<BIThread>) => {
    try {
      clearError();
      return await createThread(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create thread';
      setError({
        type: 'unknown',
        message: errorMessage,
        timestamp: new Date(),
        details: { error }
      });
      throw error;
    }
  };
};