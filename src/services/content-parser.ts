/**
 * Content parser service for processing message content into structured blocks
 * Handles markdown parsing, code block extraction, and Mermaid diagram detection
 */

import type {
  ParsedMessageContent,
  MessageContentBlock,
  TextContentBlock,
  CodeContentBlock,
  MermaidContentBlock,
  ContentParserConfig,
  ContentProcessingResult,
  ContentProcessingError
} from '@/types/content-types';

/**
 * Default configuration for content parsing
 */
const DEFAULT_CONFIG: ContentParserConfig = {
  enableCodeBlocks: true,
  enableMermaidDiagrams: true,
  defaultCodeLanguage: 'text',
  codeBlockTheme: 'github',
  mermaidTheme: 'default',
  preserveWhitespace: true
};

/**
 * Regular expressions for content parsing
 */
const PATTERNS = {
  // Code blocks with language specification
  CODE_BLOCK: /```(\w+)?\n?([\s\S]*?)```/g,
  
  // Inline code
  INLINE_CODE: /`([^`]+)`/g,
  
  // Mermaid diagrams
  MERMAID_BLOCK: /```mermaid\n?([\s\S]*?)```/g,
  
  // Alternative Mermaid syntax
  MERMAID_ALT: /```(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph)\n?([\s\S]*?)```/g,
  
  // Line breaks and whitespace
  EXCESSIVE_WHITESPACE: /\n\s*\n\s*\n/g,
  TRAILING_WHITESPACE: /[ \t]+$/gm
};

/**
 * Supported programming languages for syntax highlighting
 */
const SUPPORTED_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go',
  'rust', 'swift', 'kotlin', 'dart', 'php', 'ruby', 'perl', 'lua', 'r',
  'scala', 'clojure', 'haskell', 'elm', 'fsharp', 'ocaml', 'erlang', 'elixir',
  'html', 'css', 'scss', 'sass', 'less', 'xml', 'svg', 'json', 'yaml', 'toml',
  'sql', 'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis',
  'bash', 'shell', 'powershell', 'batch', 'dockerfile', 'makefile',
  'markdown', 'latex', 'tex', 'plaintext', 'text'
]);

/**
 * Mermaid diagram types
 */
const MERMAID_TYPES = new Set([
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'erDiagram', 'journey', 'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline',
  'sankey', 'requirement', 'c4Context'
]);

/**
 * Content parser service class
 */
export class ContentParser {
  private config: ContentParserConfig;

  constructor(config: Partial<ContentParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Parse message content into structured blocks
   */
  async parseContent(content: string): Promise<ContentProcessingResult> {
    const startTime = performance.now();
    const errors: ContentProcessingError[] = [];
    const warnings: string[] = [];

    try {
      // Sanitize and normalize content
      const normalizedContent = this.normalizeContent(content);
      
      // Extract blocks from content
      const blocks = await this.extractBlocks(normalizedContent, errors);
      
      // Create parsed content structure
      const parsedContent: ParsedMessageContent = {
        blocks,
        rawContent: content,
        hasCodeBlocks: blocks.some(block => block.type === 'code'),
        hasMermaidDiagrams: blocks.some(block => block.type === 'mermaid')
      };

      const processingTime = performance.now() - startTime;

      return {
        success: errors.length === 0,
        content: parsedContent,
        errors,
        warnings,
        processingTime
      };
    } catch (error) {
      const processingError: ContentProcessingError = {
        type: 'parse_error',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        details: { error },
        recoverable: false
      };

      return {
        success: false,
        errors: [processingError],
        warnings,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Extract structured blocks from normalized content
   */
  private async extractBlocks(
    content: string, 
    errors: ContentProcessingError[]
  ): Promise<MessageContentBlock[]> {
    const blocks: MessageContentBlock[] = [];
    let processedContent = content;
    let blockIndex = 0;

    // Extract Mermaid diagrams first (they use code block syntax)
    if (this.config.enableMermaidDiagrams) {
      const mermaidBlocks = this.extractMermaidBlocks(processedContent, blockIndex, errors);
      blocks.push(...mermaidBlocks);
      
      // Remove Mermaid blocks from content to prevent double processing
      processedContent = processedContent.replace(PATTERNS.MERMAID_BLOCK, '');
      processedContent = processedContent.replace(PATTERNS.MERMAID_ALT, '');
      blockIndex += mermaidBlocks.length;
    }

    // Extract code blocks
    if (this.config.enableCodeBlocks) {
      const codeBlocks = this.extractCodeBlocks(processedContent, blockIndex, errors);
      blocks.push(...codeBlocks);
      
      // Remove code blocks from content
      processedContent = processedContent.replace(PATTERNS.CODE_BLOCK, '');
      blockIndex += codeBlocks.length;
    }

    // Process remaining content as text blocks
    const textBlocks = this.extractTextBlocks(processedContent, blockIndex);
    blocks.push(...textBlocks);

    // Sort blocks by their original position in the content
    return this.sortBlocksByPosition(blocks, content);
  }

  /**
   * Extract Mermaid diagram blocks
   */
  private extractMermaidBlocks(
    content: string, 
    startIndex: number, 
    errors: ContentProcessingError[]
  ): MermaidContentBlock[] {
    const blocks: MermaidContentBlock[] = [];
    let match;
    let index = startIndex;

    // Match explicit mermaid blocks
    PATTERNS.MERMAID_BLOCK.lastIndex = 0;
    while ((match = PATTERNS.MERMAID_BLOCK.exec(content)) !== null) {
      const code = match[1]?.trim() || '';
      
      if (this.isValidMermaidCode(code)) {
        blocks.push({
          id: `mermaid-${index}`,
          type: 'mermaid',
          content: code,
          theme: this.config.mermaidTheme
        });
        index++;
      } else {
        errors.push({
          type: 'mermaid_error',
          message: 'Invalid Mermaid diagram syntax',
          blockId: `mermaid-${index}`,
          recoverable: true
        });
      }
    }

    // Match alternative Mermaid syntax
    PATTERNS.MERMAID_ALT.lastIndex = 0;
    while ((match = PATTERNS.MERMAID_ALT.exec(content)) !== null) {
      const code = match[1]?.trim() || '';
      
      if (this.isValidMermaidCode(code)) {
        blocks.push({
          id: `mermaid-${index}`,
          type: 'mermaid',
          content: code,
          theme: this.config.mermaidTheme
        });
        index++;
      }
    }

    return blocks;
  }

  /**
   * Extract code blocks
   */
  private extractCodeBlocks(
    content: string, 
    startIndex: number, 
    errors: ContentProcessingError[]
  ): CodeContentBlock[] {
    const blocks: CodeContentBlock[] = [];
    let match;
    let index = startIndex;

    PATTERNS.CODE_BLOCK.lastIndex = 0;
    while ((match = PATTERNS.CODE_BLOCK.exec(content)) !== null) {
      const language = match[1]?.toLowerCase() || this.config.defaultCodeLanguage || 'text';
      const code = match[2]?.trim() || '';

      if (code) {
        // Validate language
        const validatedLanguage = this.validateLanguage(language);
        
        blocks.push({
          id: `code-${index}`,
          type: 'code',
          content: code,
          language: validatedLanguage,
          showLineNumbers: this.shouldShowLineNumbers(code)
        });
        index++;
      }
    }

    return blocks;
  }

  /**
   * Extract text blocks from remaining content
   */
  private extractTextBlocks(content: string, startIndex: number): TextContentBlock[] {
    const blocks: TextContentBlock[] = [];
    
    // Split content by double line breaks to create paragraphs
    const paragraphs = content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    paragraphs.forEach((paragraph, index) => {
      if (paragraph) {
        blocks.push({
          id: `text-${startIndex + index}`,
          type: 'text',
          content: paragraph
        });
      }
    });

    return blocks;
  }

  /**
   * Normalize content for processing
   */
  private normalizeContent(content: string): string {
    let normalized = content;

    if (!this.config.preserveWhitespace) {
      // Remove excessive whitespace
      normalized = normalized.replace(PATTERNS.EXCESSIVE_WHITESPACE, '\n\n');
      normalized = normalized.replace(PATTERNS.TRAILING_WHITESPACE, '');
    }

    return normalized.trim();
  }

  /**
   * Validate Mermaid code syntax
   */
  private isValidMermaidCode(code: string): boolean {
    if (!code || code.length === 0) {
      return false;
    }

    // Basic validation - check for common Mermaid keywords
    const mermaidKeywords = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
      'erDiagram', 'journey', 'gantt', 'pie', 'gitgraph', '-->', '---', '==>'
    ];

    return mermaidKeywords.some(keyword => code.includes(keyword));
  }

  /**
   * Validate and normalize programming language
   */
  private validateLanguage(language: string): string {
    const normalized = language.toLowerCase();
    
    // Check if language is supported
    if (SUPPORTED_LANGUAGES.has(normalized)) {
      return normalized;
    }

    // Try common aliases
    const aliases: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'yml': 'yaml',
      'md': 'markdown',
      'tex': 'latex',
      'c++': 'cpp',
      'c#': 'csharp',
      'f#': 'fsharp'
    };

    if (aliases[normalized]) {
      return aliases[normalized];
    }

    // Default to text if language is not recognized
    return 'text';
  }

  /**
   * Determine if line numbers should be shown for code block
   */
  private shouldShowLineNumbers(code: string): boolean {
    // Show line numbers for code blocks with more than 3 lines
    return code.split('\n').length > 3;
  }

  /**
   * Sort blocks by their original position in content
   */
  private sortBlocksByPosition(blocks: MessageContentBlock[], originalContent: string): MessageContentBlock[] {
    return blocks.sort((a, b) => {
      const posA = originalContent.indexOf(a.content);
      const posB = originalContent.indexOf(b.content);
      return posA - posB;
    });
  }

  /**
   * Update parser configuration
   */
  updateConfig(config: Partial<ContentParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContentParserConfig {
    return { ...this.config };
  }

  /**
   * Check if content contains code blocks
   */
  static hasCodeBlocks(content: string): boolean {
    return PATTERNS.CODE_BLOCK.test(content);
  }

  /**
   * Check if content contains Mermaid diagrams
   */
  static hasMermaidDiagrams(content: string): boolean {
    return PATTERNS.MERMAID_BLOCK.test(content) || PATTERNS.MERMAID_ALT.test(content);
  }

  /**
   * Extract just the code from code blocks (utility function)
   */
  static extractCodeOnly(content: string): string[] {
    const codes: string[] = [];
    let match;

    PATTERNS.CODE_BLOCK.lastIndex = 0;
    while ((match = PATTERNS.CODE_BLOCK.exec(content)) !== null) {
      const code = match[2]?.trim();
      if (code) {
        codes.push(code);
      }
    }

    return codes;
  }

  /**
   * Extract just the Mermaid diagrams (utility function)
   */
  static extractMermaidOnly(content: string): string[] {
    const diagrams: string[] = [];
    let match;

    PATTERNS.MERMAID_BLOCK.lastIndex = 0;
    while ((match = PATTERNS.MERMAID_BLOCK.exec(content)) !== null) {
      const diagram = match[1]?.trim();
      if (diagram) {
        diagrams.push(diagram);
      }
    }

    PATTERNS.MERMAID_ALT.lastIndex = 0;
    while ((match = PATTERNS.MERMAID_ALT.exec(content)) !== null) {
      const diagram = match[1]?.trim();
      if (diagram) {
        diagrams.push(diagram);
      }
    }

    return diagrams;
  }
}

/**
 * Default content parser instance
 */
export const defaultContentParser = new ContentParser();

/**
 * Convenience function for parsing content
 */
export const parseMessageContent = (
  content: string, 
  config?: Partial<ContentParserConfig>
): Promise<ContentProcessingResult> => {
  const parser = config ? new ContentParser(config) : defaultContentParser;
  return parser.parseContent(content);
};

/**
 * Quick check functions
 */
export const hasCodeBlocks = ContentParser.hasCodeBlocks;
export const hasMermaidDiagrams = ContentParser.hasMermaidDiagrams;
export const extractCodeOnly = ContentParser.extractCodeOnly;
export const extractMermaidOnly = ContentParser.extractMermaidOnly;

export default ContentParser;