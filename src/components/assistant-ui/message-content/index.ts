/**
 * Message Content Components
 * 
 * Enhanced message components with advanced features including:
 * - Syntax highlighting for code blocks
 * - Mermaid diagram rendering
 * - Copy-to-clipboard functionality
 * - Markdown rendering with custom components
 * - Theme-aware styling
 */

// Core enhanced message component
export { default as EnhancedMessage, MessageActions } from './enhanced-message';

// Specialized content components
export { default as CodeBlock } from './code-block';
export { default as MermaidDiagram } from './mermaid-diagram';
export { default as MessageCopyButton } from './copy-button';

// Re-export types for convenience
export type {
  EnhancedMessageProps,
  MessageActionsProps,
  CodeBlockProps,
  MermaidDiagramProps,
  CopyButtonProps
} from '../../../types/assistant';

export type {
  MessageContentBlock,
  CopyResult
} from '../../../types/content-types';