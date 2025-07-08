/**
 * TypeScript type definitions for enhanced message content types
 * Supports code blocks, Mermaid diagrams, and copy functionality
 */

/**
 * Represents different types of content blocks within a message
 */
export type MessageContentBlockType = 'text' | 'code' | 'mermaid';

/**
 * Base interface for all content blocks
 */
export interface BaseContentBlock {
  id: string;
  type: MessageContentBlockType;
  content: string;
}

/**
 * Text content block for regular markdown/text content
 */
export interface TextContentBlock extends BaseContentBlock {
  type: 'text';
}

/**
 * Code content block with syntax highlighting support
 */
export interface CodeContentBlock extends BaseContentBlock {
  type: 'code';
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

/**
 * Mermaid diagram content block
 */
export interface MermaidContentBlock extends BaseContentBlock {
  type: 'mermaid';
  title?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

/**
 * Union type for all content block types
 */
export type MessageContentBlock = TextContentBlock | CodeContentBlock | MermaidContentBlock;

/**
 * Parsed message content with structured blocks
 */
export interface ParsedMessageContent {
  blocks: MessageContentBlock[];
  rawContent: string;
  hasCodeBlocks: boolean;
  hasMermaidDiagrams: boolean;
}

/**
 * Copy operation types
 */
export type CopyType = 'full' | 'code' | 'mermaid' | 'text';

/**
 * Copy operation result
 */
export interface CopyResult {
  success: boolean;
  type: CopyType;
  content: string;
  error?: string;
}

/**
 * Copy feedback configuration
 */
export interface CopyFeedbackConfig {
  showToast: boolean;
  toastDuration?: number;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Code block theme configuration
 */
export interface CodeBlockTheme {
  name: string;
  background: string;
  foreground: string;
  selection: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  operator: string;
  function: string;
  variable: string;
}

/**
 * Syntax highlighting language support
 */
export interface SupportedLanguage {
  id: string;
  name: string;
  aliases: string[];
  extensions: string[];
  mimeTypes: string[];
}

/**
 * Mermaid diagram configuration
 */
export interface MermaidConfig {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  themeVariables?: Record<string, string>;
  startOnLoad: boolean;
  securityLevel: 'strict' | 'loose' | 'antiscript' | 'sandbox';
  maxTextSize: number;
  maxEdges: number;
}

/**
 * Content parser configuration
 */
export interface ContentParserConfig {
  enableCodeBlocks: boolean;
  enableMermaidDiagrams: boolean;
  defaultCodeLanguage?: string;
  codeBlockTheme?: string;
  mermaidTheme?: MermaidConfig['theme'];
  preserveWhitespace: boolean;
}

/**
 * Enhanced message props extending the base message interface
 */
export interface EnhancedMessageContent {
  parsed: ParsedMessageContent;
  config: ContentParserConfig;
}

/**
 * Copy button configuration
 */
export interface CopyButtonConfig {
  showOnHover: boolean;
  alwaysVisible: boolean;
  position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  size: 'sm' | 'md' | 'lg';
  variant: 'default' | 'outline' | 'ghost' | 'secondary';
}

/**
 * Message actions configuration
 */
export interface MessageActionsConfig {
  enableCopy: boolean;
  enableCodeCopy: boolean;
  enableMermaidCopy: boolean;
  copyButton: CopyButtonConfig;
  feedback: CopyFeedbackConfig;
}

/**
 * Content rendering options
 */
export interface ContentRenderingOptions {
  maxHeight?: number;
  enableScrolling: boolean;
  enableZoom: boolean;
  enableFullscreen: boolean;
  lazyLoading: boolean;
  errorBoundary: boolean;
}

/**
 * Error types for content processing
 */
export type ContentError = 
  | 'parse_error'
  | 'render_error'
  | 'copy_error'
  | 'mermaid_error'
  | 'syntax_error'
  | 'network_error'
  | 'permission_error';

/**
 * Content processing error
 */
export interface ContentProcessingError {
  type: ContentError;
  message: string;
  details?: Record<string, unknown>;
  blockId?: string;
  recoverable: boolean;
}

/**
 * Content processing result
 */
export interface ContentProcessingResult {
  success: boolean;
  content?: ParsedMessageContent;
  errors: ContentProcessingError[];
  warnings: string[];
  processingTime: number;
}

/**
 * Accessibility configuration for content
 */
export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  ariaLabels: Record<string, string>;
}

/**
 * Performance monitoring for content rendering
 */
export interface PerformanceMetrics {
  parseTime: number;
  renderTime: number;
  totalBlocks: number;
  codeBlocks: number;
  mermaidBlocks: number;
  memoryUsage?: number;
}

/**
 * Content cache entry
 */
export interface ContentCacheEntry {
  id: string;
  content: ParsedMessageContent;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

/**
 * Content cache configuration
 */
export interface ContentCacheConfig {
  maxEntries: number;
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  enableCompression: boolean;
  evictionStrategy: 'lru' | 'lfu' | 'ttl';
}