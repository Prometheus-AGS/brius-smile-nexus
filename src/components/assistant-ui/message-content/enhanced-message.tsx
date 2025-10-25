/**
 * Enhanced message component with advanced content rendering
 * Supports code blocks, Mermaid diagrams, SVG, and copy functionality
 */

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypePrism from 'rehype-prism-plus';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCopyButton } from './copy-button';
import { MermaidDiagram } from './mermaid-diagram';
import { SVGRenderer } from './svg-renderer';
import { useClipboard } from '@/hooks/use-clipboard';
import type { EnhancedMessageProps } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';
import '../prism-theme.css';

/**
 * Custom components for ReactMarkdown
 */
const MarkdownComponents = {
  // Pre-formatted code blocks with copy button  
  pre: ({ children, ...props }: { children?: React.ReactNode }) => {
    // Extract code content and language from children
    const childArray = React.Children.toArray(children);
    const codeElement = childArray.find(
      (child): child is React.ReactElement => 
        React.isValidElement(child) && child.type === 'code'
    );
    
    if (codeElement && React.isValidElement(codeElement)) {
      const codeProps = codeElement.props as { className?: string; children?: React.ReactNode };
      const className = codeProps.className || '';
      const match = /language-(\w+)/.exec(className);
      const language = match ? match[1] : '';
      const codeContent = String(codeProps.children).replace(/\n$/, '');

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
      if (language === 'svg' || codeContent.trim().startsWith('<svg')) {
        return (
          <SVGRenderer
            code={codeContent}
            className="my-4"
          />
        );
      }

      // Regular code block with copy button
      return (
        <div className="relative group my-4">
          <div className="absolute top-2 right-2 z-10">
            <MessageCopyButton content={codeContent} />
          </div>
          <pre {...props} className={cn('overflow-x-auto rounded-lg border bg-muted p-4', className)}>
            {children}
          </pre>
        </div>
      );
    }

    // Fallback for non-code pre blocks
    return (
      <pre {...props} className="overflow-x-auto rounded-lg border bg-muted p-4 my-4">
        {children}
      </pre>
    );
  },

  // Inline code
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const isInlineCode = !className || !className.startsWith('language-');
    
    if (isInlineCode) {
      return (
        <code 
          {...props}
          className={cn(
            'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
            className
          )}
        >
          {children}
        </code>
      );
    }
    
    // For code blocks, render normally (will be wrapped by pre)
    return (
      <code {...props} className={className}>
        {children}
      </code>
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
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[[rehypePrism, { ignoreMissing: true, showLineNumbers: true }]]}
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

export default EnhancedMessage;