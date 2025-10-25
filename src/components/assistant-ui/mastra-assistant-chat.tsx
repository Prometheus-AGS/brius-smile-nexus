/**
 * Mastra Assistant Chat Component
 * 
 * AG-UI based chat component using @assistant-ui/react
 * Integrates with Mastra agents for real-time streaming responses
 * 
 * MASTRA-ONLY: No fallbacks, connects exclusively to real Mastra servers
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Bot, 
  User, 
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import our custom hook
import { useMastraChat } from '@/hooks/use-mastra-chat';
import type { MastraChatMessage } from '@/lib/mastra-runtime-adapter';

// ============================================================================
// Component Types
// ============================================================================

export interface MastraAssistantChatProps {
  className?: string;
  placeholder?: string;
  maxHeight?: string;
  debug?: boolean;
}

// ============================================================================
// Message Renderer Component
// ============================================================================

const MessageRenderer: React.FC<{ message: MastraChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-900">{message.content}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {message.createdAt.toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
        <Bot className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border rounded-lg p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                
                if (!isInline) {
                  // Filter out problematic props for SyntaxHighlighter
                  const { ref, key, ...syntaxProps } = props;
                  return (
                    <SyntaxHighlighter
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      style={tomorrow as any}
                      language={match?.[1] || 'text'}
                      PreTag="div"
                      {...syntaxProps}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  );
                }
                
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-gray-300">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-4 py-2">
                  {children}
                </td>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {message.createdAt.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const MastraAssistantChat: React.FC<MastraAssistantChatProps> = ({
  className = '',
  placeholder = 'Ask me anything about your business...',
  maxHeight = '600px',
  debug = false,
}) => {
  // Use our custom Mastra chat hook
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    isConnected,
    sendMessage,
    clearMessages,
    clearError,
    retry,
    inputRef,
  } = useMastraChat({ debug });

  // Refs for auto-scroll
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    const input = inputRef.current;
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';
    
    await sendMessage(message);
  }, [sendMessage, inputRef]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Card className={`flex flex-col ${className}`} style={{ maxHeight }}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Mastra Business Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {!isConnected && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
            {isStreaming && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Streaming
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error.message}</span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={retry}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={clearError}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="space-y-2">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full p-8 text-center">
                <div className="space-y-2">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-500">
                    Start a conversation with the Mastra BI assistant
                  </p>
                  <p className="text-sm text-gray-400">
                    Ask questions about your business data and analytics
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <MessageRenderer key={message.id} message={message} />
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 space-y-2">
          {messages.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearMessages}
                className="text-gray-500 hover:text-gray-700"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Chat
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder={placeholder}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              onKeyDown={handleKeyPress}
              disabled={isLoading || !isConnected}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !isConnected}
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {!isConnected && (
            <p className="text-xs text-red-600">
              Not connected to Mastra server. Please check your configuration.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MastraAssistantChat;