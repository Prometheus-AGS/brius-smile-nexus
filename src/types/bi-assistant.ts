/**
 * TypeScript type definitions for Business Intelligence Assistant Store
 * Extends existing assistant types with BI-specific state management
 */

import type {
  BIMessage,
  BIThread,
  BusinessIntelligenceContext,
  BISendMessageConfig,
  BIRuntimeConfig,
  AssistantError,
  AIClientConfig
} from './assistant';
import type { ChatHistoryEntry } from './business-intelligence';
import type { MastraBIClient } from '@/services/mastra-bi-client';

/**
 * Streaming state for real-time message updates
 */
export interface StreamingState {
  isStreaming: boolean;
  currentMessageId: string | null;
  streamingContent: string;
  streamingRole: 'user' | 'assistant';
  error: string | null;
}

/**
 * UI state for loading indicators and user feedback
 */
export interface UIState {
  isLoading: boolean;
  isInitializing: boolean;
  isProcessing: boolean;
  showWelcome: boolean;
  inputDisabled: boolean;
  lastActivity: Date | null;
}

/**
 * Connection state for Mastra client management
 */
export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastConnectionAttempt: Date | null;
  retryCount: number;
  maxRetries: number;
}

/**
 * Thread management state
 */
export interface ThreadState {
  threads: BIThread[];
  currentThreadId: string | null;
  currentThread: BIThread | null;
  threadHistory: string[];
  maxThreadHistory: number;
}

/**
 * Message management state
 */
export interface MessageState {
  messages: BIMessage[];
  messageHistory: Map<string, BIMessage[]>;
  pendingMessage: BIMessage | null;
  lastMessageId: string | null;
}

/**
 * Configuration state
 */
export interface ConfigState {
  aiClientConfig: AIClientConfig;
  runtimeConfig: BIRuntimeConfig;
  businessContext: BusinessIntelligenceContext | null;
  agentId: string | null;
  resourceId: string | null;
}

/**
 * Complete BI Assistant Store State
 */
export interface BIAssistantState {
  // Core state slices
  streaming: StreamingState;
  ui: UIState;
  connection: ConnectionState;
  threads: ThreadState;
  messages: MessageState;
  config: ConfigState;
  
  // Global state
  client: MastraBIClient | null;
  error: AssistantError | null;
  initialized: boolean;
  version: string;
}

/**
 * Streaming actions for real-time updates
 */
export interface StreamingActions {
  startStreaming: (messageId: string, role: 'user' | 'assistant') => void;
  updateStreamingContent: (content: string) => void;
  finishStreaming: () => void;
  setStreamingError: (error: string | null) => void;
  resetStreaming: () => void;
}

/**
 * UI actions for user interface management
 */
export interface UIActions {
  setLoading: (loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setInputDisabled: (disabled: boolean) => void;
  showWelcomeScreen: () => void;
  hideWelcomeScreen: () => void;
  updateLastActivity: () => void;
  resetUI: () => void;
}

/**
 * Connection actions for Mastra client management
 */
export interface ConnectionActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  setConnectionError: (error: string | null) => void;
  resetConnection: () => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
}

/**
 * Thread management actions
 */
export interface ThreadActions {
  createThread: (config?: Partial<BIThread>) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  updateThread: (threadId: string, updates: Partial<BIThread>) => void;
  loadThreads: () => Promise<void>;
  clearThreadHistory: () => void;
  addToThreadHistory: (threadId: string) => void;
}

/**
 * Message management actions
 */
export interface MessageActions {
  sendMessage: (config: BISendMessageConfig) => Promise<void>;
  addMessage: (message: BIMessage) => void;
  updateMessage: (messageId: string, updates: Partial<BIMessage>) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  loadMessageHistory: (threadId: string) => Promise<void>;
  setPendingMessage: (message: BIMessage | null) => void;
}

/**
 * Configuration actions
 */
export interface ConfigActions {
  initialize: (config?: BIRuntimeConfig) => Promise<void>;
  updateAIClientConfig: (config: Partial<AIClientConfig>) => void;
  updateRuntimeConfig: (config: Partial<BIRuntimeConfig>) => void;
  setBusinessContext: (context: BusinessIntelligenceContext | null) => void;
  setAgentId: (agentId: string | null) => void;
  setResourceId: (resourceId: string | null) => void;
}

/**
 * Global actions for error handling and state management
 */
export interface GlobalActions {
  setError: (error: AssistantError | null) => void;
  clearError: () => void;
  reset: () => void;
  cleanup: () => void;
}

/**
 * Complete BI Assistant Store Actions
 */
export interface BIAssistantActions {
  streaming: StreamingActions;
  ui: UIActions;
  connection: ConnectionActions;
  threads: ThreadActions;
  messages: MessageActions;
  config: ConfigActions;
  global: GlobalActions;
}

/**
 * Complete BI Assistant Store Interface
 */
export interface BIAssistantStore extends BIAssistantState {
  actions: BIAssistantActions;
}

/**
 * Store slice selectors for optimized subscriptions
 */
export interface BIAssistantSelectors {
  // Streaming selectors
  isStreaming: (state: BIAssistantState) => boolean;
  streamingContent: (state: BIAssistantState) => string;
  streamingError: (state: BIAssistantState) => string | null;
  
  // UI selectors
  isLoading: (state: BIAssistantState) => boolean;
  isProcessing: (state: BIAssistantState) => boolean;
  showWelcome: (state: BIAssistantState) => boolean;
  inputDisabled: (state: BIAssistantState) => boolean;
  
  // Connection selectors
  isConnected: (state: BIAssistantState) => boolean;
  connectionError: (state: BIAssistantState) => string | null;
  canRetry: (state: BIAssistantState) => boolean;
  
  // Thread selectors
  currentThread: (state: BIAssistantState) => BIThread | null;
  currentThreadId: (state: BIAssistantState) => string | null;
  threads: (state: BIAssistantState) => BIThread[];
  threadCount: (state: BIAssistantState) => number;
  
  // Message selectors
  currentMessages: (state: BIAssistantState) => BIMessage[];
  messageCount: (state: BIAssistantState) => number;
  lastMessage: (state: BIAssistantState) => BIMessage | null;
  pendingMessage: (state: BIAssistantState) => BIMessage | null;
  
  // Global selectors
  error: (state: BIAssistantState) => AssistantError | null;
  initialized: (state: BIAssistantState) => boolean;
  client: (state: BIAssistantState) => MastraBIClient | null;
}

/**
 * Hook return types for custom hooks
 */
export interface UseBIAssistantReturn {
  // State
  state: BIAssistantState;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  
  // Computed values
  isReady: boolean;
  canSendMessage: boolean;
  hasError: boolean;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

export interface UseBIAssistantStateReturn {
  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamingError: string | null;
  
  // UI state
  isLoading: boolean;
  isProcessing: boolean;
  showWelcome: boolean;
  inputDisabled: boolean;
  
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Thread state
  currentThread: BIThread | null;
  threads: BIThread[];
  
  // Message state
  messages: BIMessage[];
  pendingMessage: BIMessage | null;
  
  // Global state
  error: AssistantError | null;
  initialized: boolean;
}

export interface UseBIAssistantActionsReturn {
  // Core actions
  sendMessage: (config: BISendMessageConfig) => Promise<void>;
  createThread: (config?: Partial<BIThread>) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: AssistantError | null) => void;
  clearError: () => void;
  reset: () => void;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

/**
 * Integration types for persistence layer
 */
export interface PersistenceIntegration {
  saveChatHistory: (entry: ChatHistoryEntry) => void;
  loadChatHistory: () => ChatHistoryEntry[];
  syncWithPersistentStore: (threadId: string, title: string, lastMessage: string) => void;
}

/**
 * Event types for store subscriptions
 */
export type BIAssistantEvent = 
  | 'message_sent'
  | 'message_received'
  | 'thread_created'
  | 'thread_switched'
  | 'thread_deleted'
  | 'streaming_started'
  | 'streaming_finished'
  | 'connection_established'
  | 'connection_lost'
  | 'error_occurred'
  | 'state_reset';

export interface BIAssistantEventPayload {
  event: BIAssistantEvent;
  timestamp: Date;
  data?: Record<string, unknown>;
}

/**
 * Store configuration options
 */
export interface BIAssistantStoreConfig {
  enablePersistence: boolean;
  enableEventLogging: boolean;
  maxRetries: number;
  retryDelay: number;
  maxThreadHistory: number;
  maxMessageHistory: number;
  autoReconnect: boolean;
  debugMode: boolean;
}