/**
 * Assistant Chat Component with Langfuse Integration
 *
 * Main chat interface for the BI assistant with comprehensive Langfuse observability.
 * Integrates with existing Mastra chat functionality while adding full tracking capabilities.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Send,
  MessageSquare,
  Bot,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useMastraChat } from '@/hooks/use-mastra-chat';
import { useBIObservability } from '@/hooks/use-langfuse';
import { getLangfuseConfig } from '@/lib/langfuse-config';
import { EnhancedMessage } from '@/components/assistant-ui/message-content';
import type { AssistantMessage } from '@/types/assistant';
import type { BIQueryType } from '@/types/langfuse';
import type { CopyResult } from '@/types/content-types';

// ============================================================================
// Component Types
// ============================================================================

interface AssistantChatProps {
  className?: string;
  placeholder?: string;
  maxHeight?: string;
  showObservabilityStatus?: boolean;
}

interface ChatMessage extends AssistantMessage {
  traceId?: string;
  processingTime?: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function AssistantChat({
  className = '',
  placeholder = 'Ask me anything about your dental manufacturing data...',
  maxHeight = '600px',
  showObservabilityStatus = true,
}: AssistantChatProps) {
  // ============================================================================
  // Hooks and State
  // ============================================================================

  // Get Langfuse configuration
  const langfuseConfig = getLangfuseConfig();
  const isLangfuseEnabled = langfuseConfig.enabled;
  
  // Initialize hooks
  const biObservability = useBIObservability();
  const mastraChat = useMastraChat();

  const {
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError,
  } = biObservability || {};

  const {
    messages,
    isLoading,
    error,
    sendMessage,
  } = mastraChat || {};

  // Local state for enhanced chat functionality
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [observabilityStats, setObservabilityStats] = useState({
    totalTraces: 0,
    successfulQueries: 0,
    averageResponseTime: 0,
  });

  // Get streaming state from Mastra chat hook
  const { isStreaming } = mastraChat || {};

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // Sync messages from Mastra chat with enhanced chat messages
  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      const enhancedMessages: ChatMessage[] = messages.map((msg, index) => ({
        ...msg,
        traceId: msg.id ? `trace-${msg.id}` : undefined,
      }));
      setChatMessages(enhancedMessages);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ============================================================================
  // Langfuse Integration Functions
  // ============================================================================

  const startChatTrace = useCallback(async (userMessage: string): Promise<string> => {
    if (!isLangfuseEnabled) {
      return 'disabled-trace';
    }

    try {
      const traceId = await startBITrace(
        'bi-assistant-chat',
        'data_analysis' as BIQueryType,
        { userMessage },
        {
          queryType: 'data_analysis' as BIQueryType,
          businessContext: {
            department: 'operations',
            useCase: 'business_intelligence',
            priority: 'high' as const,
          },
        }
      );

      setCurrentTraceId(traceId);
      return traceId;
    } catch (error) {
      console.error('Failed to start chat trace:', error);
      return 'error-trace';
    }
  }, [isLangfuseEnabled, startBITrace]);

  const endChatTrace = useCallback(async (
    traceId: string,
    response: string,
    processingTime: number
  ): Promise<void> => {
    if (!isLangfuseEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await endBITrace(traceId, {
        response,
        processingTime,
        success: true,
        timestamp: new Date().toISOString(),
      });

      // Update observability stats
      setObservabilityStats(prev => ({
        totalTraces: prev.totalTraces + 1,
        successfulQueries: prev.successfulQueries + 1,
        averageResponseTime: (prev.averageResponseTime + processingTime) / 2,
      }));
    } catch (error) {
      console.error('Failed to end chat trace:', error);
    }
  }, [isLangfuseEnabled, endBITrace]);

  const trackChatError = useCallback(async (
    error: Error,
    traceId: string,
    userMessage: string
  ): Promise<void> => {
    if (!isLangfuseEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await handleBIError(error, traceId, {
        queryType: 'data_analysis' as BIQueryType,
        severity: 'medium' as const,
      });
    } catch (trackingError) {
      console.error('Failed to track chat error:', trackingError);
    }
  }, [isLangfuseEnabled, handleBIError]);

  // ============================================================================
  // Chat Functions
  // ============================================================================

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || isStreaming) {
      console.log('🚫 DEBUG: Message send blocked:', {
        hasInput: !!input.trim(),
        isLoading,
        isStreaming,
        reason: !input.trim() ? 'no input' : isLoading ? 'loading' : 'streaming'
      });
      return;
    }

    const userMessage = input.trim();
    const startTime = Date.now();

    console.log('🚀 DEBUG: Starting message send:', {
      message: userMessage,
      isLoading,
      isStreaming,
      timestamp: new Date().toISOString()
    });

    // Start Langfuse trace
    const traceId = await startChatTrace(userMessage);

    try {
      // Send message using Mastra chat
      await sendMessage({
        content: userMessage,
        metadata: {
          traceId,
          timestamp: new Date().toISOString(),
        },
      });
      
      const processingTime = Date.now() - startTime;

      // Track the query in Langfuse
      if (isLangfuseEnabled && traceId !== 'disabled-trace' && traceId !== 'error-trace') {
        await trackBIQuery(
          traceId,
          'data_analysis' as BIQueryType,
          { query: userMessage },
          { processingTime },
          {
            queryType: 'data_analysis' as BIQueryType,
            businessContext: {
              department: 'operations',
              useCase: 'business_intelligence',
              priority: 'high' as const,
            },
          }
        );
      }

      // End trace with success
      await endChatTrace(traceId, 'Message sent successfully', processingTime);

      // Clear input
      setInput('');

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Track error in Langfuse
      await trackChatError(error as Error, traceId, userMessage);
      
      // End trace with error
      if (traceId !== 'disabled-trace' && traceId !== 'error-trace') {
        await endBITrace(traceId, {
          error: (error as Error).message,
          success: false,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setCurrentTraceId(null);
    }
  }, [
    input,
    isLoading,
    isStreaming,
    sendMessage,
    startChatTrace,
    endChatTrace,
    trackChatError,
    trackBIQuery,
    isLangfuseEnabled,
    endBITrace,
  ]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleClearChat = useCallback(async () => {
    // Since clearMessages doesn't exist in the Mastra hook, we'll handle clearing locally
    setChatMessages([]);
    setInput('');
    setObservabilityStats({
      totalTraces: 0,
      successfulQueries: 0,
      averageResponseTime: 0,
    });
    
    // Track clear action
    if (isLangfuseEnabled) {
      try {
        await trackBIQuery('chat_cleared', 'data_analysis', {
          queryType: 'data_analysis' as const,
          severity: 'low' as const,
        });
      } catch (error) {
        console.error('Error tracking chat clear:', error);
      }
    }
  }, [setChatMessages, setInput, setObservabilityStats, isLangfuseEnabled, trackBIQuery]);

  const handleCopyResult = useCallback((result: CopyResult) => {
    console.log('🔍 DEBUG: Copy result:', result);
    // Could add toast notification here if needed
  }, []);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderObservabilityStatus = () => {
    if (!showObservabilityStatus) return null;

    return (
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={isLangfuseEnabled ? 'default' : 'secondary'} className="flex items-center gap-1">
          {isLangfuseEnabled ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Langfuse Active
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              Langfuse Disabled
            </>
          )}
        </Badge>
        
        {isLangfuseEnabled && (
          <>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {observabilityStats.totalTraces} traces
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(observabilityStats.averageResponseTime)}ms avg
            </Badge>
            {currentTraceId && (
              <Badge variant="outline" className="flex items-center gap-1 animate-pulse">
                <Zap className="h-3 w-3" />
                Tracking...
              </Badge>
            )}
          </>
        )}
      </div>
    );
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    console.log('🔍 DEBUG: Rendering message with EnhancedMessage:', {
      messageId: message.id,
      role: message.role,
      contentLength: message.content?.length || 0,
      timestamp: message.timestamp
    });

    // Convert ChatMessage to AssistantMessage format for EnhancedMessage
    const assistantMessage: AssistantMessage = {
      id: message.id,
      content: message.content || '',
      role: message.role,
      timestamp: message.timestamp,
      threadId: message.threadId,
      metadata: message.metadata
    };

    return (
      <div
        key={`${message.id}-${index}`}
        className="flex w-full gap-3 p-4"
      >
        <EnhancedMessage
          message={assistantMessage}
          onCopy={handleCopyResult}
        />
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            BI Assistant Chat
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={chatMessages.length === 0}
          >
            Clear Chat
          </Button>
        </div>
        {renderObservabilityStatus()}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'An error occurred while processing your request.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1" style={{ maxHeight }}>
          <div className="space-y-4 pr-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with your BI assistant</p>
                <p className="text-sm mt-1">Ask about your dental manufacturing data and analytics</p>
              </div>
            ) : (
              chatMessages.map((message, index) => renderMessage(message, index))
            )}
            
            {isLoading && (() => {
              console.log('🔄 DEBUG: Loading indicator visible:', { isLoading, timestamp: new Date().toISOString() });
              return (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Streaming Indicator */}
            {isStreaming && (() => {
              console.log('🌊 DEBUG: Streaming indicator visible:', { isStreaming, timestamp: new Date().toISOString() });
              return (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-sm text-green-700">Streaming response...</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || isStreaming}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isStreaming}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Info */}
        <div className="text-xs text-muted-foreground text-center">
          {isLangfuseEnabled ? (
            <span className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" />
              All interactions are being tracked for analytics and improvement
            </span>
          ) : (
            <span>Chat functionality active • Analytics disabled</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AssistantChat;