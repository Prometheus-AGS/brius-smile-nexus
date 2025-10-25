/**
 * Barrel export for assistant-ui components
 * Provides clean imports for all assistant chat components
 * 
 * MASTRA-ONLY ARCHITECTURE:
 * - MastraAssistantChat: Primary chat component using Mastra agents
 * - BIAssistantChat: BI-specific wrapper for MastraAssistantChat
 * - Legacy AssistantChat (OpenAI) is deprecated and should not be used
 */

// Primary Mastra-based chat components
export { MastraAssistantChat } from './mastra-assistant-chat';
export { default as BIAssistantChat } from './bi-assistant-chat';
export { default as MastraBIChat } from './mastra-bi-chat';

// AG-UI base components (for custom implementations)
export { Thread } from './thread';
export { Message } from './message';
export { Composer } from './composer';
export { WelcomeSuggestions } from './welcome-suggestions';

// DEPRECATED: Legacy OpenAI-based chat (DO NOT USE)
// export { AssistantChat } from './assistant-chat';

// Re-export types for convenience
export type {
  AssistantChatProps,
  ThreadProps,
  MessageProps,
  ComposerProps,
  WelcomeSuggestionsProps,
  WelcomeSuggestion
} from '@/types/assistant';

// Export Mastra-specific types
export type { MastraAssistantChatProps } from './mastra-assistant-chat';