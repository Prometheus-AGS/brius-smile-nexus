/**
 * Barrel export for assistant-ui components
 * Provides clean imports for all assistant chat components
 */

export { AssistantChat } from './assistant-chat';
export { Thread } from './thread';
export { Message } from './message';
export { Composer } from './composer';
export { WelcomeSuggestions } from './welcome-suggestions';

// Re-export types for convenience
export type {
  AssistantChatProps,
  ThreadProps,
  MessageProps,
  ComposerProps,
  WelcomeSuggestionsProps,
  WelcomeSuggestion
} from '@/types/assistant';