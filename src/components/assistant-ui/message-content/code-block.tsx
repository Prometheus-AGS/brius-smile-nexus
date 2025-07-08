/**
 * Code block component with syntax highlighting and copy functionality
 * Uses react-syntax-highlighter for syntax highlighting with theme support
 */

import React, { memo, useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeCopyButton } from './copy-button';
import { useTheme } from '@/hooks/use-theme';
import type { CodeBlockProps } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';

/**
 * Language display names for better UX
 */
const LANGUAGE_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  toml: 'TOML',
  sql: 'SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  markdown: 'Markdown',
  latex: 'LaTeX',
  plaintext: 'Plain Text',
  text: 'Text'
};

/**
 * Get theme based on current theme mode
 */
const getCodeTheme = (isDark: boolean) => {
  return isDark ? oneDark : oneLight;
};

/**
 * Code block component with syntax highlighting
 */
export const CodeBlock: React.FC<CodeBlockProps> = memo(({
  code,
  language = 'text',
  showLineNumbers = false,
  theme,
  onCopy,
  className
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { theme: currentTheme } = useTheme();
  
  // Determine if we should use dark theme
  const isDark = theme === 'dark' || (theme !== 'light' && currentTheme === 'dark');
  
  // Get the appropriate syntax highlighter theme
  const syntaxTheme = getCodeTheme(isDark);
  
  // Get display name for language
  const languageDisplayName = LANGUAGE_NAMES[language.toLowerCase()] || language;

  /**
   * Handle copy result feedback
   */
  const handleCopyResult = useCallback((result: CopyResult) => {
    if (result.success) {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
    
    // Call onCopy with the result if provided
    if (onCopy) {
      onCopy(result.success ? 'success' : 'error');
    }
  }, [onCopy]);

  /**
   * Custom style for syntax highlighter
   */
  const customStyle = {
    margin: 0,
    padding: '1rem',
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.5'
  };

  return (
    <Card className={cn('relative group overflow-hidden', className)}>
      {/* Header with language badge and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <Badge variant="secondary" className="text-xs font-mono">
          {languageDisplayName}
        </Badge>
        
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className={cn(
              'text-xs font-medium transition-colors',
              copyFeedback === 'Copied!' ? 'text-green-600' : 'text-red-600'
            )}>
              {copyFeedback}
            </span>
          )}
          <CodeCopyButton
            code={code}
            language={language}
            onCopy={handleCopyResult}
          />
        </div>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          customStyle={customStyle}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: isDark ? '#6b7280' : '#9ca3af',
            borderRight: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            marginRight: '1em',
            textAlign: 'right'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
            }
          }}
          PreTag={({ children, ...props }) => (
            <pre {...props} className="!bg-transparent">
              {children}
            </pre>
          )}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Line count indicator for large code blocks */}
      {code.split('\n').length > 20 && (
        <div className="absolute bottom-2 right-2 opacity-50">
          <Badge variant="outline" className="text-xs">
            {code.split('\n').length} lines
          </Badge>
        </div>
      )}
    </Card>
  );
});

CodeBlock.displayName = 'CodeBlock';

/**
 * Inline code component for smaller code snippets
 */
export const InlineCode: React.FC<{
  code: string;
  className?: string;
}> = memo(({ code, className }) => {
  return (
    <code className={cn(
      'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      className
    )}>
      {code}
    </code>
  );
});

InlineCode.displayName = 'InlineCode';

/**
 * Code block with minimal styling for embedding in text
 */
export const EmbeddedCodeBlock: React.FC<{
  code: string;
  language?: string;
  className?: string;
}> = memo(({ code, language = 'text', className }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const syntaxTheme = getCodeTheme(isDark);

  return (
    <div className={cn('rounded-md border overflow-hidden', className)}>
      <SyntaxHighlighter
        language={language}
        style={syntaxTheme}
        customStyle={{
          margin: 0,
          padding: '0.75rem',
          background: 'transparent',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}
        PreTag={({ children, ...props }) => (
          <pre {...props} className="!bg-transparent">
            {children}
          </pre>
        )}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

EmbeddedCodeBlock.displayName = 'EmbeddedCodeBlock';

export default CodeBlock;