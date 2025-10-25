/**
 * Message component that renders individual chat messages with full markdown support
 * Supports both user and assistant messages with proper styling and rich content rendering
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypePrism from 'rehype-prism-plus';
import { MessageCopyButton } from './message-content/copy-button';
import { MermaidDiagram } from './message-content/mermaid-diagram';
import { SVGRenderer } from './message-content/svg-renderer';
import type { MessageProps } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';
import './prism-theme.css'; // Import Prism theme styles

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return timestamp.toLocaleDateString();
};

/**
 * Custom markdown components for rich content rendering
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

  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-medium mt-3 mb-2 first:mt-0">
      {children}
    </h4>
  ),

  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-sm font-medium mt-2 mb-1 first:mt-0">
      {children}
    </h5>
  ),

  h6: ({ children }: { children?: React.ReactNode }) => (
    <h6 className="text-xs font-medium mt-2 mb-1 first:mt-0">
      {children}
    </h6>
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
  ),

  // Images
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full h-auto rounded-md my-4"
      loading="lazy"
    />
  ),

  // Strong/Bold
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold">
      {children}
    </strong>
  ),

  // Emphasis/Italic
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">
      {children}
    </em>
  ),

  // Strikethrough (from GFM)
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="line-through">
      {children}
    </del>
  )
};

/**
 * Message component renders individual chat messages with full markdown support
 */
export const Message: React.FC<MessageProps> = ({
  message,
  className
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopyResult = (result: CopyResult) => {
    // Copy result feedback is handled by the MessageCopyButton component
  };

  return (
    <div className={cn('flex gap-4 group', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={isUser ? undefined : '/bot-avatar.png'} 
            alt={isUser ? 'User' : 'Assistant'} 
          />
          <AvatarFallback className={cn(
            'text-xs font-medium',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'Assistant'}
          </span>
          
          {/* Role Badge */}
          {isAssistant && (
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          )}
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.timestamp)}</span>
          </div>

          {/* Copy Button */}
          <div className="ml-auto">
            <MessageCopyButton
              content={message.content}
              onCopy={handleCopyResult}
            />
          </div>
        </div>

        {/* Message Body with Markdown */}
        <Card className={cn(
          'p-4 max-w-none',
          isUser 
            ? 'bg-primary/5 border-primary/20' 
            : 'bg-muted/30'
        )}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[[rehypePrism, { ignoreMissing: true, showLineNumbers: true }]]}
              components={MarkdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Metadata display for debugging */}
          {message.metadata && Object.keys(message.metadata).length > 0 && (
            <details className="mt-4 text-xs opacity-70">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                Metadata
              </summary>
              <pre className="mt-2 text-xs bg-background/50 p-3 rounded overflow-x-auto">
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            </details>
          )}
        </Card>

        {/* Thread ID indicator (for debugging) */}
        {message.threadId && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground opacity-50">
            Thread: {message.threadId}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;