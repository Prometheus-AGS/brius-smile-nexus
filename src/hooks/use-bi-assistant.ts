/**
 * Main BI Assistant Hook
 * 
 * This is the primary hook for interacting with the BI Assistant store.
 * It provides a clean interface for components to access state and actions
 * without directly coupling to the Zustand store.
 * 
 * @example
 * ```tsx
 * const Component = () => {
 *   const { sendMessage, isStreaming, messages } = useBIAssistant();
 *   
 *   const handleSubmit = (content: string) => {
 *     sendMessage({ content });
 *   };
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => <div key={msg.id}>{msg.content}</div>)}
 *       {isStreaming && <div>Thinking...</div>}
 *     </div>
 *   );
 * };
 * ```
 */

import { useBIAssistantStore } from '../stores/bi-assistant-store';
import type { 
  BIMessage, 
  BIThread, 
  BISendMessageConfig,
  AssistantError
} from '../types/assistant';
import type {
  StreamingState,
  UIState,
  ConnectionState,
  ThreadState,
  MessageState,
  ConfigState
} from '../types/bi-assistant';

/**
 * Main BI Assistant hook interface
 */
export interface UseBIAssistantReturn {
  // State
  isStreaming: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: AssistantError | null;
  messages: BIMessage[];
  currentThread: BIThread | null;
  threads: BIThread[];
  
  // Actions
  sendMessage: (config: BISendMessageConfig) => Promise<void>;
  createThread: (config?: Partial<BIThread>) => Promise<string>;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  clearMessages: () => void;
  clearError: () => void;
  
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // UI State
  setUILoading: (loading: boolean) => void;
}

/**
 * Main BI Assistant hook
 * 
 * Provides a comprehensive interface to the BI Assistant functionality
 * with optimized selectors to prevent unnecessary re-renders.
 */
export const useBIAssistant = (): UseBIAssistantReturn => {
  // Streaming state
  const isStreaming = useBIAssistantStore(state => state.streaming.isStreaming);
  
  // Connection state
  const isConnected = useBIAssistantStore(state => state.connection.isConnected);
  
  // UI state
  const isLoading = useBIAssistantStore(state => state.ui.isLoading);
  const error = useBIAssistantStore(state => state.error);
  
  // Messages and threads
  const messages = useBIAssistantStore(state => state.messages.messages);
  const currentThread = useBIAssistantStore(state => state.threads.currentThread);
  const threads = useBIAssistantStore(state => state.threads.threads);
  
  // Actions
  const sendMessage = useBIAssistantStore(state => state.actions.messages.sendMessage);
  const createThread = useBIAssistantStore(state => state.actions.threads.createThread);
  const switchThread = useBIAssistantStore(state => state.actions.threads.switchThread);
  const deleteThread = useBIAssistantStore(state => state.actions.threads.deleteThread);
  const clearMessages = useBIAssistantStore(state => state.actions.messages.clearMessages);
  const clearError = useBIAssistantStore(state => state.actions.global.clearError);
  const connect = useBIAssistantStore(state => state.actions.connection.connect);
  const disconnect = useBIAssistantStore(state => state.actions.connection.disconnect);
  const setUILoading = useBIAssistantStore(state => state.actions.ui.setLoading);

  return {
    // State
    isStreaming,
    isConnected,
    isLoading,
    error,
    messages,
    currentThread,
    threads,
    
    // Actions
    sendMessage,
    createThread,
    switchThread,
    deleteThread,
    clearMessages,
    clearError,
    
    // Connection
    connect,
    disconnect,
    
    // UI State
    setUILoading
  };
};

/**
 * Hook for accessing only streaming-related state and actions
 * 
 * @example
 * ```tsx
 * const StreamingIndicator = () => {
 *   const { isStreaming, streamingContent, currentMessageId } = useBIAssistantStreaming();
 *   
 *   if (!isStreaming) return null;
 *   
 *   return <div>AI is thinking... {streamingContent}</div>;
 * };
 * ```
 */
export const useBIAssistantStreaming = () => {
  return useBIAssistantStore(state => ({
    isStreaming: state.streaming.isStreaming,
    streamingContent: state.streaming.streamingContent,
    currentMessageId: state.streaming.currentMessageId,
    streamingRole: state.streaming.streamingRole,
    error: state.streaming.error,
    startStreaming: state.actions.streaming.startStreaming,
    updateStreamingContent: state.actions.streaming.updateStreamingContent,
    finishStreaming: state.actions.streaming.finishStreaming,
    setStreamingError: state.actions.streaming.setStreamingError
  }));
};

/**
 * Hook for accessing only thread-related state and actions
 * 
 * @example
 * ```tsx
 * const ThreadSidebar = () => {
 *   const { threads, currentThread, createThread, switchThread } = useBIAssistantThreads();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => createThread()}>New Thread</button>
 *       {threads.map(thread => (
 *         <div key={thread.id} onClick={() => switchThread(thread.id)}>
 *           {thread.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export const useBIAssistantThreads = () => {
  return useBIAssistantStore(state => ({
    threads: state.threads.threads,
    currentThread: state.threads.currentThread,
    currentThreadId: state.threads.currentThreadId,
    createThread: state.actions.threads.createThread,
    switchThread: state.actions.threads.switchThread,
    updateThread: state.actions.threads.updateThread,
    deleteThread: state.actions.threads.deleteThread
  }));
};

/**
 * Hook for accessing only message-related state and actions
 * 
 * @example
 * ```tsx
 * const MessageList = () => {
 *   const { messages, addMessage, clearMessages } = useBIAssistantMessages();
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export const useBIAssistantMessages = () => {
  return useBIAssistantStore(state => ({
    messages: state.messages.messages,
    messageHistory: state.messages.messageHistory,
    lastMessageId: state.messages.lastMessageId,
    sendMessage: state.actions.messages.sendMessage,
    addMessage: state.actions.messages.addMessage,
    updateMessage: state.actions.messages.updateMessage,
    deleteMessage: state.actions.messages.deleteMessage,
    clearMessages: state.actions.messages.clearMessages
  }));
};

/**
 * Hook for accessing only connection-related state and actions
 * 
 * @example
 * ```tsx
 * const ConnectionStatus = () => {
 *   const { isConnected, isConnecting, connect, disconnect } = useBIAssistantConnection();
 *   
 *   return (
 *     <div>
 *       Status: {isConnected ? 'Connected' : 'Disconnected'}
 *       {!isConnected && (
 *         <button onClick={connect} disabled={isConnecting}>
 *           Connect
 *         </button>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 */
export const useBIAssistantConnection = () => {
  return useBIAssistantStore(state => ({
    isConnected: state.connection.isConnected,
    isConnecting: state.connection.isConnecting,
    connectionError: state.connection.connectionError,
    lastConnectionAttempt: state.connection.lastConnectionAttempt,
    connect: state.actions.connection.connect,
    disconnect: state.actions.connection.disconnect
  }));
};

/**
 * Hook for accessing only UI-related state and actions
 * 
 * @example
 * ```tsx
 * const LoadingOverlay = () => {
 *   const { isLoading, setLoading } = useBIAssistantUI();
 *   
 *   if (!isLoading) return null;
 *   
 *   return <div className="loading-spinner">Loading...</div>;
 * };
 * ```
 */
export const useBIAssistantUI = () => {
  return useBIAssistantStore(state => ({
    isLoading: state.ui.isLoading,
    isInitializing: state.ui.isInitializing,
    isProcessing: state.ui.isProcessing,
    showWelcome: state.ui.showWelcome,
    inputDisabled: state.ui.inputDisabled,
    lastActivity: state.ui.lastActivity,
    setLoading: state.actions.ui.setLoading,
    setInitializing: (initializing: boolean) => {
      // UI actions don't have setInitializing, but we can use the internal state update
      // This would need to be implemented in the store if needed
    },
    setProcessing: state.actions.ui.setProcessing,
    showWelcomeScreen: state.actions.ui.showWelcomeScreen,
    hideWelcomeScreen: state.actions.ui.hideWelcomeScreen,
    setInputDisabled: state.actions.ui.setInputDisabled,
    updateLastActivity: state.actions.ui.updateLastActivity
  }));
};

/**
 * Hook for accessing configuration state and actions
 * 
 * @example
 * ```tsx
 * const ConfigPanel = () => {
 *   const { config, updateConfig } = useBIAssistantConfig();
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={config.agentId} 
 *         onChange={(e) => updateConfig({ agentId: e.target.value })}
 *       />
 *     </div>
 *   );
 * };
 * ```
 */
export const useBIAssistantConfig = () => {
  return useBIAssistantStore(state => ({
    config: state.config,
    updateMastraConfig: state.actions.config.updateMastraConfig,
    updateRuntimeConfig: state.actions.config.updateRuntimeConfig,
    setBusinessContext: state.actions.config.setBusinessContext,
    setAgentId: state.actions.config.setAgentId,
    setResourceId: state.actions.config.setResourceId
  }));
};

/**
 * Hook for accessing global error state and actions
 * 
 * @example
 * ```tsx
 * const ErrorBanner = () => {
 *   const { error, clearError } = useBIAssistantError();
 *   
 *   if (!error) return null;
 *   
 *   return (
 *     <div className="error-banner">
 *       {error.message}
 *       <button onClick={clearError}>×</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useBIAssistantError = () => {
  return useBIAssistantStore(state => ({
    error: state.error,
    setError: state.actions.global.setError,
    clearError: state.actions.global.clearError
  }));
};