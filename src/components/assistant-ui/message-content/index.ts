/**
 * Message Content Components
 * 
 * Enhanced message components with advanced features including:
 * - Syntax highlighting for code blocks (via rehype-prism-plus)
 * - Mermaid diagram rendering
 * - SVG rendering
 * - Copy-to-clipboard functionality
 * - Markdown rendering with custom components
 * - Theme-aware styling
 */

// Core enhanced message component
export { default as EnhancedMessage } from './enhanced-message';

// Specialized content components
export { default as MermaidDiagram } from './mermaid-diagram';
export { default as SVGRenderer } from './svg-renderer';
export { default as MessageCopyButton } from './copy-button';

// Re-export types for convenience
export type {
  EnhancedMessageProps,
  MermaidDiagramProps,
  SVGRendererProps,
  SVGValidationResult,
  SVGRendererState,
  CopyButtonProps
} from '../../../types/assistant';

export type {
  MessageContentBlock,
  CopyResult
} from '../../../types/content-types';