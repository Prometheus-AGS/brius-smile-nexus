/**
 * TypeScript type definitions for the Assistant UI components
 * Defines interfaces for Mastra client integration and assistant chat functionality
 */


import type {
  ParsedMessageContent,
  MessageActionsConfig,
  ContentRenderingOptions,
  CopyType,
  CopyResult
} from './content-types';


/**
 * Configuration for initializing the Mastra client
 */
export interface AIClientConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
  debug?: boolean;
}

/**
 * Represents a chat message in the assistant interface
 */
export interface AssistantMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a conversation thread
 */
export interface AssistantThread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  agentId?: string;
}

/**
 * Configuration for creating a new thread
 */
export interface CreateThreadConfig {
  title?: string;
  metadata?: Record<string, unknown>;
  agentId?: string;
  resourceId?: string;
}

/**
 * Configuration for sending a message
 */
export interface SendMessageConfig {
  content: string;
  threadId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from the AI agent (replaces Mastra AgentResponse)
 */
export interface AgentResponse {
  id: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls?: Record<string, unknown>[]; // TODO: Replace with proper Mastra tool call types
}

/**
 * Error types that can occur during assistant operations
 */
export interface AssistantError {
  type: 'connection' | 'authentication' | 'validation' | 'server' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * State for the assistant chat hook
 */
export interface AssistantChatState {
  messages: AssistantMessage[];
  threads: AssistantThread[];
  currentThreadId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: AssistantError | null;
  client: unknown | null; // Will be properly typed when we refactor the store
}

/**
 * Actions available in the assistant chat hook
 */
export interface AssistantChatActions {
  sendMessage: (config: SendMessageConfig) => Promise<void>;
  createThread: (config?: CreateThreadConfig) => Promise<string>;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  clearError: () => void;
  initialize: (config?: AIClientConfig) => Promise<void>;
}

/**
 * Complete interface for the assistant chat hook
 */
export interface UseAssistantChatReturn extends AssistantChatState, AssistantChatActions {}

/**
 * Props for the main AssistantChat component
 */
export interface AssistantChatProps {
  agentId?: string;
  resourceId?: string;
  initialThreadId?: string;
  className?: string;
  onError?: (error: AssistantError) => void;
  onMessageSent?: (message: AssistantMessage) => void;
  onThreadCreated?: (thread: AssistantThread) => void;
}

/**
 * Props for the Thread component
 */
export interface ThreadProps {
  messages: AssistantMessage[];
  isLoading?: boolean;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Props for the Message component
 */
export interface MessageProps {
  message: AssistantMessage;
  className?: string;
}

/**
 * Props for the Enhanced Message component
 */
export interface EnhancedMessageProps {
  message: AssistantMessage;
  className?: string;
  actionsConfig?: MessageActionsConfig;
  renderingOptions?: ContentRenderingOptions;
  onCopy?: (result: CopyResult) => void;
}

/**
 * Props for the Message Content component
 */
export interface MessageContentProps {
  content: string;
  parsed?: ParsedMessageContent;
  className?: string;
  renderingOptions?: ContentRenderingOptions;
}

/**
 * Props for the Code Block component
 */
export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: 'light' | 'dark';
  onCopy?: (code: string) => void;
  className?: string;
}

/**
 * Props for the SVG Renderer component
 */
export interface SVGRendererProps {
  code: string;
  title?: string;
  className?: string;
  onCopy?: (result: CopyResult) => void;
  showControls?: boolean;
  maxWidth?: string;
  maxHeight?: string;
}

/**
 * SVG validation result
 */
export interface SVGValidationResult {
  isValid: boolean;
  sanitizedSVG?: string;
  errors?: string[];
  warnings?: string[];
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * SVG renderer state
 */
export interface SVGRendererState {
  isLoading: boolean;
  error: string | null;
  isFullscreen: boolean;
  showCode: boolean;
}

/**
 * Props for the Mermaid Diagram component
 */
export interface MermaidDiagramProps {
  code: string;
  title?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  onCopy?: (code: string) => void;
  className?: string;
}

/**
 * Props for the Message Actions component
 */
export interface MessageActionsProps {
  message: AssistantMessage;
  config: MessageActionsConfig;
  onCopy: (type: CopyType, content: string) => void;
  className?: string;
}

/**
 * Props for the Copy Button component
 */
export interface CopyButtonProps {
  content: string;
  type: CopyType;
  onCopy?: (result: CopyResult) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  showOnHover?: boolean;
}

/**
 * Props for the Composer component
 */
export interface ComposerProps {
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Welcome suggestions for the assistant
 */
export interface WelcomeSuggestion {
  id: string;
  text: string;
  prompt: string;
}

/**
 * Props for welcome suggestions
 */
export interface WelcomeSuggestionsProps {
  suggestions?: WelcomeSuggestion[];
  onSuggestionClick: (prompt: string) => void;
  className?: string;
}

/**
 * Business Intelligence specific types for assistant-ui integration
 */

/**
 * Business Intelligence message with enhanced metadata
 */
export interface BIMessage extends AssistantMessage {
  type?: 'query' | 'insight' | 'summary' | 'recommendation';
  businessContext?: {
    domain: string;
    metrics: string[];
    timeframe: string;
    confidence?: number;
  };
  executiveSummary?: {
    keyPoints: string[];
    actionItems: string[];
    recommendations: string[];
  };
}

/**
 * Business Intelligence thread with enhanced metadata
 */
export interface BIThread extends AssistantThread {
  businessDomain?: string;
  analysisType?: string;
  lastInsight?: string;
}

/**
 * Business Intelligence context for enhanced prompts
 */
export interface BusinessIntelligenceContext {
  currentDate: string;
  formattedDate: string;
  currentYear: number;
  currentMonth: number;
  timezone: string;
  currentWeek: {
    start: string;
    end: string;
  };
  lastWeek: {
    start: string;
    end: string;
  };
  currentMonthRange: {
    start: string;
    end: string;
  };
  lastMonth: {
    start: string;
    end: string;
  };
  yearToDate: {
    start: string;
    end: string;
  };
}

/**
 * External store adapter for assistant-ui integration
 */
export interface ExternalStoreAdapter {
  messages: BIMessage[];
  isRunning: boolean;
  onNew: (message: { content: string; role: 'user' }) => Promise<void>;
  onEdit: (message: { id: string; content: string }) => Promise<void>;
  onReload: (parentId: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Business Intelligence Runtime configuration
 */
export interface BIRuntimeConfig {
  agentId?: string;
  resourceId?: string;
  businessContext?: BusinessIntelligenceContext;
  aiClientConfig?: AIClientConfig;
}

/**
 * Enhanced send message config for BI
 */
export interface BISendMessageConfig extends SendMessageConfig {
  businessContext?: BusinessIntelligenceContext;
  analysisType?: 'production' | 'financial' | 'quality' | 'customer' | 'operational';
}