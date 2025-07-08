/**
 * BI Assistant State Hooks
 * 
 * Provides granular access to specific state slices from the BI Assistant store.
 * These hooks are optimized for performance by subscribing only to specific
 * state slices, preventing unnecessary re-renders.
 * 
 * @fileoverview Custom hooks for accessing BI Assistant state slices
 */

import { useBIAssistantStore } from '../stores/bi-assistant-store';
import type {
  StreamingState,
  UIState,
  ConnectionState,
  ThreadState,
  MessageState,
  ConfigState
} from '../types/bi-assistant';

/**
 * Hook for accessing streaming state
 * 
 * @example
 * ```tsx
 * const StreamingIndicator = () => {
 *   const { isStreaming, streamProgress } = useStreamingState();
 *   
 *   if (!isStreaming) return null;
 *   
 *   return (
 *     <div className="streaming-indicator">
 *       Streaming... {streamProgress}%
 *     </div>
 *   );
 * };
 * ```
 */
export const useStreamingState = (): StreamingState => {
  return useBIAssistantStore(state => state.streaming);
};

/**
 * Hook for accessing UI state
 * 
 * @example
 * ```tsx
 * const LoadingSpinner = () => {
 *   const { isLoading, isProcessing } = useUIState();
 *   
 *   if (!isLoading && !isProcessing) return null;
 *   
 *   return <div className="spinner">Loading...</div>;
 * };
 * ```
 */
export const useUIState = (): UIState => {
  return useBIAssistantStore(state => state.ui);
};

/**
 * Hook for accessing connection state
 * 
 * @example
 * ```tsx
 * const ConnectionStatus = () => {
 *   const { isConnected, connectionError } = useConnectionState();
 *   
 *   return (
 *     <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
 *       {isConnected ? 'Connected' : 'Disconnected'}
 *       {connectionError && <span className="error">{connectionError.message}</span>}
 *     </div>
 *   );
 * };
 * ```
 */
export const useConnectionState = (): ConnectionState => {
  return useBIAssistantStore(state => state.connection);
};

/**
 * Hook for accessing thread state
 * 
 * @example
 * ```tsx
 * const ThreadList = () => {
 *   const { threads, currentThreadId } = useThreadState();
 *   
 *   return (
 *     <div className="thread-list">
 *       {threads.map(thread => (
 *         <div 
 *           key={thread.id} 
 *           className={thread.id === currentThreadId ? 'active' : ''}
 *         >
 *           {thread.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export const useThreadState = (): ThreadState => {
  return useBIAssistantStore(state => state.threads);
};

/**
 * Hook for accessing message state
 * 
 * @example
 * ```tsx
 * const MessageCount = () => {
 *   const { messages } = useMessageState();
 *   
 *   return (
 *     <div className="message-count">
 *       {messages.length} messages
 *     </div>
 *   );
 * };
 * ```
 */
export const useMessageState = (): MessageState => {
  return useBIAssistantStore(state => state.messages);
};

/**
 * Hook for accessing configuration state
 * 
 * @example
 * ```tsx
 * const ConfigDisplay = () => {
 *   const { agentId, businessContext } = useConfigState();
 *   
 *   return (
 *     <div className="config-display">
 *       <div>Agent: {agentId || 'Not configured'}</div>
 *       <div>Context: {businessContext ? 'Loaded' : 'None'}</div>
 *     </div>
 *   );
 * };
 * ```
 */
export const useConfigState = (): ConfigState => {
  return useBIAssistantStore(state => state.config);
};

/**
 * Hook for accessing initialization state
 * 
 * @example
 * ```tsx
 * const InitializationGuard = ({ children }: { children: React.ReactNode }) => {
 *   const initialized = useInitializationState();
 *   
 *   if (!initialized) {
 *     return <div>Initializing BI Assistant...</div>;
 *   }
 *   
 *   return <>{children}</>;
 * };
 * ```
 */
export const useInitializationState = (): boolean => {
  return useBIAssistantStore(state => state.initialized);
};

/**
 * Hook for accessing error state
 * 
 * @example
 * ```tsx
 * const ErrorBanner = () => {
 *   const error = useErrorState();
 *   
 *   if (!error) return null;
 *   
 *   return (
 *     <div className="error-banner">
 *       <span>{error.message}</span>
 *       <button onClick={() => window.location.reload()}>
 *         Retry
 *       </button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useErrorState = () => {
  return useBIAssistantStore(state => state.error);
};

/**
 * Hook for accessing current thread messages
 * Optimized selector that only re-renders when current thread messages change
 * 
 * @example
 * ```tsx
 * const CurrentThreadMessages = () => {
 *   const messages = useCurrentThreadMessages();
 *   
 *   return (
 *     <div className="messages">
 *       {messages.map(message => (
 *         <MessageComponent key={message.id} message={message} />
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export const useCurrentThreadMessages = () => {
  return useBIAssistantStore(state => {
    const { currentThreadId } = state.threads;
    if (!currentThreadId) return [];
    
    return state.messages.messages.filter(
      message => message.threadId === currentThreadId
    );
  });
};

/**
 * Hook for accessing current thread
 * Returns the currently active thread or null if none selected
 * 
 * @example
 * ```tsx
 * const ThreadHeader = () => {
 *   const currentThread = useCurrentThread();
 *   
 *   if (!currentThread) {
 *     return <div>No thread selected</div>;
 *   }
 *   
 *   return (
 *     <div className="thread-header">
 *       <h2>{currentThread.title}</h2>
 *       <span>{currentThread.messageCount} messages</span>
 *     </div>
 *   );
 * };
 * ```
 */
export const useCurrentThread = () => {
  return useBIAssistantStore(state => {
    const { currentThreadId, threads } = state.threads;
    if (!currentThreadId) return null;
    
    return threads.find(thread => thread.id === currentThreadId) || null;
  });
};

/**
 * Hook for checking if assistant is busy
 * Returns true if any operation is in progress
 * 
 * @example
 * ```tsx
 * const SubmitButton = () => {
 *   const isBusy = useIsBusy();
 *   
 *   return (
 *     <button disabled={isBusy}>
 *       {isBusy ? 'Processing...' : 'Submit'}
 *     </button>
 *   );
 * };
 * ```
 */
export const useIsBusy = (): boolean => {
  return useBIAssistantStore(state => 
    state.ui.isLoading || 
    state.ui.isProcessing || 
    state.ui.isInitializing ||
    state.streaming.isStreaming
  );
};

/**
 * Hook for accessing connection status
 * Returns a simplified connection status
 * 
 * @example
 * ```tsx
 * const ConnectionIndicator = () => {
 *   const status = useConnectionStatus();
 *   
 *   return (
 *     <div className={`connection-status ${status}`}>
 *       {status === 'connected' && '🟢'}
 *       {status === 'connecting' && '🟡'}
 *       {status === 'disconnected' && '🔴'}
 *       {status === 'error' && '❌'}
 *     </div>
 *   );
 * };
 * ```
 */
export const useConnectionStatus = (): 'connected' | 'connecting' | 'disconnected' | 'error' => {
  return useBIAssistantStore(state => {
    const { isConnected, isConnecting, connectionError } = state.connection;
    
    if (connectionError) return 'error';
    if (isConnecting) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  });
};