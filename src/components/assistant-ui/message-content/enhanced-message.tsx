/**
 * Enhanced message component with advanced content rendering
 * Supports code blocks, Mermaid diagrams, and copy functionality
 */

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCopyButton } from './copy-button';
import { CodeBlock, InlineCode } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { SVGRenderer } from './svg-renderer';
import { useClipboard } from '@/hooks/use-clipboard';
import type { EnhancedMessageProps } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';

/**
 * Custom components for ReactMarkdown
 */
const MarkdownComponents = {
  // Code blocks
  code: ({ node, inline, className, children, ...props }: {
    node?: unknown;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeContent = String(children).replace(/\n$/, '');

    // Handle Mermaid diagrams
    if (language === 'mermaid') {
      return (
        <MermaidDiagram
          code={codeContent}
          className="my-4"
        />
      );
    }

    // Handle SVG content
    if (language === 'svg' || (language === '' && codeContent.trim().startsWith('<svg'))) {
      return (
        <SVGRenderer
          code={codeContent}
          className="my-4"
        />
      );
    }

    // Handle inline code
    if (inline) {
      return <InlineCode code={codeContent} />;
    }

    // Handle code blocks
    return (
      <CodeBlock
        code={codeContent}
        language={language}
        showLineNumbers={codeContent.split('\n').length > 10}
        className="my-4"
      />
    );
  },

  // Block quotes
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-muted-foreground/25 pl-4 italic text-muted-foreground my-4">
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/50">
      {children}
    </thead>
  ),

  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-4 py-2 text-left font-semibold">
      {children}
    </th>
  ),

  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border px-4 py-2">
      {children}
    </td>
  ),

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 my-4">
      {children}
    </ul>
  ),

  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 my-4">
      {children}
    </ol>
  ),

  // Headings
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0">
      {children}
    </h1>
  ),

  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold mt-5 mb-3 first:mt-0">
      {children}
    </h2>
  ),

  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-medium mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  ),

  // Links
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:no-underline"
    >
      {children}
    </a>
  ),

  // Horizontal rule
  hr: () => (
    <hr className="border-border my-6" />
  ),

  // Paragraphs
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 last:mb-0 leading-relaxed">
      {children}
    </p>
  )
};

/**
 * Enhanced message component
 */
export const EnhancedMessage: React.FC<EnhancedMessageProps> = memo(({
  message,
  className,
  actionsConfig,
  renderingOptions,
  onCopy
}) => {
  const { copy } = useClipboard();

  /**
   * Handle copy result feedback
   */
  const handleCopyResult = (result: CopyResult) => {
    onCopy?.(result);
  };

  /**
   * Handle full message copy
   */
  const handleMessageCopy = async () => {
    const result = await copy(message.content, 'text');
    handleCopyResult(result);
  };

  /**
   * Get role-specific styling
   */
  const getRoleStyles = () => {
    switch (message.role) {
      case 'user':
        return {
          container: 'bg-primary/5 border-primary/20',
          badge: 'bg-primary text-primary-foreground'
        };
      case 'assistant':
        return {
          container: 'bg-muted/30 border-muted',
          badge: 'bg-secondary text-secondary-foreground'
        };
      default:
        return {
          container: 'bg-background border-border',
          badge: 'bg-muted text-muted-foreground'
        };
    }
  };

  const roleStyles = getRoleStyles();
  const showCopyButton = actionsConfig?.enableCopy !== false;
  const showTimestamp = true; // Default to showing timestamp

  return (
    <Card className={cn(
      'relative group',
      roleStyles.container,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn('text-xs', roleStyles.badge)}>
            {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
          </Badge>
          
          {showTimestamp && message.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {showCopyButton && (
          <MessageCopyButton
            content={message.content}
            onCopy={handleCopyResult}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Content statistics for large messages */}
      {message.content.length > 1000 && (
        <div className="absolute bottom-2 right-2 opacity-50">
          <Badge variant="outline" className="text-xs">
            {Math.round(message.content.length / 1000)}k chars
          </Badge>
        </div>
      )}
    </Card>
  );
});

EnhancedMessage.displayName = 'EnhancedMessage';

/**
 * Message actions component for additional functionality
 */
export const MessageActions: React.FC<{
  content: string;
  onCopy?: (result: CopyResult) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}> = memo(({ content, onCopy, onEdit, onDelete, className }) => {
  const { copy } = useClipboard();

  const handleCopyResult = async () => {
    const result = await copy(content, 'text');
    onCopy?.(result);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <MessageCopyButton
        content={content}
        onCopy={onCopy}
      />
      
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Edit message"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
          title="Delete message"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
});

MessageActions.displayName = 'MessageActions';

export default EnhancedMessage;