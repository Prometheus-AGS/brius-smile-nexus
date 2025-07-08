/**
 * Clipboard service for handling copy-to-clipboard operations
 * Provides modern Clipboard API with fallback support for older browsers
 */

import type { CopyResult, CopyType } from '@/types/content-types';

/**
 * Clipboard service class with modern API and fallback support
 */
export class ClipboardService {
  /**
   * Check if the Clipboard API is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'clipboard' in navigator &&
      'writeText' in navigator.clipboard
    );
  }

  /**
   * Check if the browser has clipboard write permissions
   */
  static async hasPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ 
        name: 'clipboard-write' as PermissionName 
      });
      return permission.state === 'granted' || permission.state === 'prompt';
    } catch (error) {
      // Some browsers don't support permission query for clipboard
      return true;
    }
  }

  /**
   * Copy text to clipboard using modern Clipboard API
   */
  static async copyWithClipboardAPI(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed:', error);
      return false;
    }
  }

  /**
   * Copy text to clipboard using fallback method (execCommand)
   */
  static copyWithFallback(text: string): boolean {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      
      document.body.appendChild(textarea);
      
      // Select and copy the text
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      return success;
    } catch (error) {
      console.warn('Fallback copy failed:', error);
      return false;
    }
  }

  /**
   * Main copy method that tries modern API first, then fallback
   */
  static async copyText(text: string, type: CopyType = 'text'): Promise<CopyResult> {
    if (!text) {
      return {
        success: false,
        type,
        content: text,
        error: 'No content to copy'
      };
    }

    // Try modern Clipboard API first
    if (this.isSupported()) {
      const hasPermission = await this.hasPermission();
      if (hasPermission) {
        const success = await this.copyWithClipboardAPI(text);
        if (success) {
          return {
            success: true,
            type,
            content: text
          };
        }
      }
    }

    // Fallback to execCommand
    const fallbackSuccess = this.copyWithFallback(text);
    
    return {
      success: fallbackSuccess,
      type,
      content: text,
      error: fallbackSuccess ? undefined : 'Copy operation failed'
    };
  }

  /**
   * Copy code block with proper formatting
   */
  static async copyCode(code: string, language?: string): Promise<CopyResult> {
    let formattedCode = code;
    
    // Add language comment if specified
    if (language) {
      const languageComment = this.getLanguageComment(language);
      if (languageComment) {
        formattedCode = `${languageComment}\n${code}`;
      }
    }

    return this.copyText(formattedCode, 'code');
  }

  /**
   * Copy Mermaid diagram source
   */
  static async copyMermaid(code: string, title?: string): Promise<CopyResult> {
    let formattedCode = code;
    
    // Add title comment if specified
    if (title) {
      formattedCode = `%% ${title}\n${code}`;
    }

    return this.copyText(formattedCode, 'mermaid');
  }

  /**
   * Copy full message content with proper formatting
   */
  static async copyFullMessage(content: string): Promise<CopyResult> {
    return this.copyText(content, 'full');
  }

  /**
   * Get appropriate comment syntax for language
   */
  private static getLanguageComment(language: string): string | null {
    const commentMap: Record<string, string> = {
      // C-style languages
      'javascript': '// JavaScript',
      'typescript': '// TypeScript',
      'java': '// Java',
      'c': '// C',
      'cpp': '// C++',
      'csharp': '// C#',
      'go': '// Go',
      'rust': '// Rust',
      'swift': '// Swift',
      'kotlin': '// Kotlin',
      'dart': '// Dart',
      
      // Hash-style languages
      'python': '# Python',
      'ruby': '# Ruby',
      'perl': '# Perl',
      'bash': '# Bash',
      'shell': '# Shell',
      'powershell': '# PowerShell',
      'yaml': '# YAML',
      'toml': '# TOML',
      
      // HTML-style languages
      'html': '<!-- HTML -->',
      'xml': '<!-- XML -->',
      'svg': '<!-- SVG -->',
      
      // CSS
      'css': '/* CSS */',
      'scss': '/* SCSS */',
      'sass': '/* Sass */',
      'less': '/* Less */',
      
      // SQL
      'sql': '-- SQL',
      'mysql': '-- MySQL',
      'postgresql': '-- PostgreSQL',
      'sqlite': '-- SQLite',
      
      // Other languages
      'lua': '-- Lua',
      'haskell': '-- Haskell',
      'elm': '-- Elm',
      'clojure': ';; Clojure',
      'lisp': ';; Lisp',
      'scheme': ';; Scheme',
      
      // Markup languages
      'markdown': '<!-- Markdown -->',
      'latex': '% LaTeX',
      
      // Configuration files
      'json': '',  // JSON doesn't support comments
      'ini': '; INI',
      'conf': '# Config',
      'dockerfile': '# Dockerfile',
      
      // Web technologies
      'php': '<?php // PHP',
      'jsx': '// JSX',
      'tsx': '// TSX',
      'vue': '<!-- Vue -->',
      'svelte': '<!-- Svelte -->'
    };

    return commentMap[language.toLowerCase()] || null;
  }

  /**
   * Sanitize content before copying (remove potential security risks)
   */
  static sanitizeContent(content: string): string {
    // Remove potential script tags and other dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');
  }

  /**
   * Format content for clipboard based on type
   */
  static formatForClipboard(content: string, type: CopyType): string {
    const sanitized = this.sanitizeContent(content);
    
    switch (type) {
      case 'code':
        // Preserve code formatting
        return sanitized;
      
      case 'mermaid':
        // Ensure Mermaid syntax is preserved
        return sanitized;
      
      case 'full':
        // Clean up extra whitespace for full message
        return sanitized
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
          .trim();
      
      case 'text':
      default:
        return sanitized.trim();
    }
  }

  /**
   * Get user-friendly error message for copy failures
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        return 'Copy permission denied. Please allow clipboard access.';
      }
      if (error.name === 'NotSupportedError') {
        return 'Copy not supported in this browser.';
      }
      return error.message;
    }
    
    return 'Failed to copy content to clipboard.';
  }
}

/**
 * Convenience function for copying text
 */
export const copyToClipboard = ClipboardService.copyText;

/**
 * Convenience function for copying code
 */
export const copyCode = ClipboardService.copyCode;

/**
 * Convenience function for copying Mermaid diagrams
 */
export const copyMermaid = ClipboardService.copyMermaid;

/**
 * Convenience function for copying full messages
 */
export const copyFullMessage = ClipboardService.copyFullMessage;

/**
 * Check if clipboard is supported
 */
export const isClipboardSupported = ClipboardService.isSupported;

export default ClipboardService;