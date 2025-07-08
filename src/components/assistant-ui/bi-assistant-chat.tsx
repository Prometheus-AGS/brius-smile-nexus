/**
 * Business Intelligence Assistant Chat Component
 * 
 * Refactored to use new Zustand store architecture instead of runtime-based approach.
 * Maintains comprehensive UI with suggestions, streaming indicators, and proper message rendering.
 * Integrates with assistant-ui library for optimal chat experience.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  ThreadPrimitive, 
  ComposerPrimitive, 
  MessagePrimitive,
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage
} from '@assistant-ui/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Zap,
  Lightbulb,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import our new custom hooks
import { useBIAssistant } from '@/hooks/use-bi-assistant';
import {
  useStreamingState,
  useUIState,
  useConnectionState,
  useCurrentThread,
  useCurrentThreadMessages,
  useIsBusy
} from '@/hooks/use-bi-assistant-state';
import {
  useBIAssistantUIActions,
  useBIAssistantConnectionActions,
  useBIAssistantThreadActions,
  useBIAssistantMessageActions,
  useBIAssistantStreamingActions,
  useBIAssistantConfigActions,
  useBIAssistantGlobalActions
} from '@/hooks/use-bi-assistant-actions';

import type { BIMessage, BusinessIntelligenceContext, AssistantError } from '@/types/assistant';

/**
 * Utility function to create error objects
 */
const createError = (
  type: AssistantError['type'],
  message: string,
  details?: Record<string, unknown>
): AssistantError => ({
  type,
  message,
  details,
  timestamp: new Date()
});

// ============================================================================
// Component Types
// ============================================================================

interface BIAssistantChatProps {
  className?: string;
  placeholder?: string;
  maxHeight?: string;
  showSuggestions?: boolean;
  agentId?: string;
  resourceId?: string;
}

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'production' | 'quality' | 'financial' | 'customer' | 'operational' | 'analytics';
}

// ============================================================================
// BI Suggestions Data
// ============================================================================

const BI_SUGGESTIONS: SuggestionCard[] = [
  {
    id: 'production-efficiency',
    title: 'Production Efficiency',
    description: 'Analyze current production metrics and identify bottlenecks',
    prompt: 'Show me the current production efficiency metrics for this week. Include throughput, cycle times, and any bottlenecks in the dental brace manufacturing process.',
    icon: TrendingUp,
    category: 'production'
  },
  {
    id: 'quality-metrics',
    title: 'Quality Control Analysis',
    description: 'Review quality metrics and defect rates',
    prompt: 'Provide a comprehensive quality control analysis including defect rates, rework percentages, and quality trends for dental brace production this month.',
    icon: CheckCircle,
    category: 'quality'
  },
  {
    id: 'financial-performance',
    title: 'Financial Performance',
    description: 'Examine revenue, costs, and profitability trends',
    prompt: 'Generate a financial performance report showing revenue, production costs, profit margins, and year-over-year comparisons for our dental brace business.',
    icon: DollarSign,
    category: 'financial'
  },
  {
    id: 'customer-satisfaction',
    title: 'Customer Analytics',
    description: 'Analyze customer satisfaction and retention metrics',
    prompt: 'Show customer satisfaction scores, retention rates, and feedback analysis for our dental brace customers. Include any trends or areas for improvement.',
    icon: User,
    category: 'customer'
  },
  {
    id: 'operational-overview',
    title: 'Operational Dashboard',
    description: 'Get a comprehensive operational overview',
    prompt: 'Create an executive dashboard showing key operational metrics including production status, order fulfillment, inventory levels, and team performance.',
    icon: BarChart3,
    category: 'operational'
  },
  {
    id: 'predictive-analytics',
    title: 'Predictive Insights',
    description: 'Forecast trends and identify opportunities',
    prompt: 'Provide predictive analytics for the next quarter including demand forecasting, capacity planning recommendations, and potential growth opportunities in dental brace manufacturing.',
    icon: PieChart,
    category: 'analytics'
  }
];

// ============================================================================
// Business Intelligence Context Generator
// ============================================================================

const generateBusinessContext = (): BusinessIntelligenceContext => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Current date information
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based month
  
  // Week calculations
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  
  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(startOfWeek.getDate() - 7);
  const lastWeekEnd = new Date(endOfWeek);
  lastWeekEnd.setDate(endOfWeek.getDate() - 7);
  
  // Month calculations
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);
  
  const lastMonthStart = new Date(currentYear, currentMonth - 2, 1);
  const lastMonthEnd = new Date(currentYear, currentMonth - 1, 0);
  
  // Year calculations
  const startOfYear = new Date(currentYear, 0, 1);
  
  return {
    currentDate,
    formattedDate,
    currentYear,
    currentMonth,
    timezone,
    currentWeek: {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    },
    lastWeek: {
      start: lastWeekStart.toISOString().split('T')[0],
      end: lastWeekEnd.toISOString().split('T')[0]
    },
    currentMonthRange: {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0]
    },
    lastMonth: {
      start: lastMonthStart.toISOString().split('T')[0],
      end: lastMonthEnd.toISOString().split('T')[0]
    },
    yearToDate: {
      start: startOfYear.toISOString().split('T')[0],
      end: currentDate
    }
  };
};

// ============================================================================
// Enhanced Prompt Adapter
// ============================================================================

const adaptPromptForBI = (content: string): string => {
  const dateContext = generateBusinessContext();
  
  // Add comprehensive business intelligence context
  const contextMessage = `
BUSINESS INTELLIGENCE CONTEXT:
Current Date: ${dateContext.formattedDate} (${dateContext.currentDate})
Timezone: ${dateContext.timezone}

Date Ranges for Analysis:
- This week: ${dateContext.currentWeek.start} to ${dateContext.currentWeek.end}
- This month: ${dateContext.currentMonthRange.start} to ${dateContext.currentMonthRange.end}
- Year to date: ${dateContext.yearToDate.start} to ${dateContext.yearToDate.end}
- Last week: ${dateContext.lastWeek.start} to ${dateContext.lastWeek.end}
- Last month: ${dateContext.lastMonth.start} to ${dateContext.lastMonth.end}

DENTAL BRACE MANUFACTURING FOCUS:
You are analyzing data for a dental brace manufacturing business. Focus on:
- Production efficiency and quality metrics
- Order fulfillment and delivery performance
- Customer satisfaction and retention
- Financial performance and profitability
- Operational efficiency and cost optimization
- Quality control and defect rates

RESPONSE GUIDELINES:
- Provide executive-level insights suitable for business decision-making
- Include specific metrics, trends, and actionable recommendations
- Use clear, professional language appropriate for business stakeholders
- Highlight key performance indicators (KPIs) and critical issues
- Suggest concrete actions for improvement when relevant
- Format responses with proper markdown including tables, charts, and diagrams when helpful

USER QUERY: ${content}
`;

  return contextMessage;
};

// ============================================================================
// Message Renderer Component
// ============================================================================

const MessageRenderer: React.FC<{ message: BIMessage }> = ({ message }) => {
  const content = Array.isArray(message.content) 
    ? message.content.find(part => part.type === 'text')?.text || ''
    : message.content;

  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-900">{content}</p>
          </div>
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
              code({ node, className, children, ...props }) {
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
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BIAssistantChat: React.FC<BIAssistantChatProps> = ({
  className = '',
  placeholder = 'Ask me about your business intelligence data...',
  maxHeight = '600px',
  showSuggestions = true,
  agentId = 'business-intelligence',
  resourceId = 'default'
}) => {
  // State hooks
  const streamingState = useStreamingState();
  const uiState = useUIState();
  const connectionState = useConnectionState();
  const currentThread = useCurrentThread();
  const messages = useCurrentThreadMessages();
  const isBusy = useIsBusy();

  // Action hooks
  const uiActions = useBIAssistantUIActions();
  const connectionActions = useBIAssistantConnectionActions();
  const threadActions = useBIAssistantThreadActions();
  const messageActions = useBIAssistantMessageActions();
  const streamingActions = useBIAssistantStreamingActions();
  const configActions = useBIAssistantConfigActions();
  const globalActions = useBIAssistantGlobalActions();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize connection on mount
  useEffect(() => {
    if (!connectionState.isConnected && !connectionState.isConnecting) {
      connectionActions.connect();
    }
  }, [connectionState.isConnected, connectionState.isConnecting, connectionActions]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Convert messages to ThreadMessageLike format for assistant-ui
  const threadMessages = useMemo((): ThreadMessageLike[] => {
    return messages.map(message => ({
      id: message.id,
      role: message.role,
      content: Array.isArray(message.content) 
        ? message.content 
        : [{ type: 'text', text: message.content }],
      metadata: {
        custom: message.metadata || {}
      },
      createdAt: new Date(message.timestamp)
    }));
  }, [messages]);

  // Handle new message from assistant-ui
  const handleNewMessage = useCallback(async (message: AppendMessage) => {
    try {
      // Extract text content from the message
      const textContent = Array.isArray(message.content) 
        ? message.content.find(part => part.type === 'text')?.text || ''
        : typeof message.content === 'string' 
        ? message.content 
        : message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '';

      if (!textContent) {
        console.warn('No text content found in message');
        return;
      }

      // Create thread if none exists
      let threadId = currentThread?.id;
      if (!threadId) {
        threadId = await threadActions.createThread({
          title: 'Business Intelligence Analysis'
        });
      }

      // Enhance the prompt with BI context
      const enhancedPrompt = adaptPromptForBI(textContent);

      // Send the message
      await messageActions.sendMessage({
        content: enhancedPrompt,
        threadId,
        resourceId,
        businessContext: generateBusinessContext(),
        metadata: {
          agentId,
          timestamp: new Date().toISOString(),
          originalQuery: textContent,
          analysisType: 'general'
        }
      });
    } catch (error) {
      console.error('Failed to send BI message:', error);
      globalActions.setError(createError('unknown', error instanceof Error ? error.message : 'Failed to send message', { error }));
    }
  }, [currentThread?.id, threadActions, messageActions, uiActions, agentId, resourceId]);

  // Create assistant-ui runtime
  const runtime = useExternalStoreRuntime({
    messages: threadMessages,
    isRunning: streamingState.isStreaming || isBusy,
    onNew: handleNewMessage,
    convertMessage: (message: ThreadMessageLike) => message
  });

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SuggestionCard) => {
    messageActions.sendMessage({ content: suggestion.prompt });
  }, [messageActions]);

  // Handle manual send
  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      messageActions.sendMessage({
        content: inputValue.trim()
      });
      setInputValue('');
    }
  }, [inputValue, messageActions]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Card className={`flex flex-col ${className}`} style={{ maxHeight }}>
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Business Intelligence Assistant
            </CardTitle>
            <div className="flex items-center gap-2">
              {connectionState.isConnected && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
              {connectionState.isConnecting && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Connecting
                </Badge>
              )}
              {streamingState.isStreaming && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <Activity className="w-3 h-3 mr-1" />
                  Processing
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Error Display */}
          {connectionState.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionState.connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Suggestions */}
          {showSuggestions && messages.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BI_SUGGESTIONS.map((suggestion) => {
                const IconComponent = suggestion.icon;
                return (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    className="h-auto p-4 text-left justify-start hover:bg-blue-50 hover:border-blue-200"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <IconComponent className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {suggestion.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
            <div className="space-y-1">
              {messages.map((message) => (
                <MessageRenderer key={message.id} message={message} />
              ))}
              
              {streamingState.isStreaming && (
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Activity className="w-4 h-4 animate-spin" />
                        Analyzing your request...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="flex-shrink-0">
            <ThreadPrimitive.Root>
              <ComposerPrimitive.Root>
                <div className="flex gap-2">
                  <ComposerPrimitive.Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={!connectionState.isConnected || streamingState.isStreaming}
                    className="flex-1 min-h-[40px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <ComposerPrimitive.Send asChild>
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || !connectionState.isConnected || streamingState.isStreaming}
                      size="sm"
                      className="px-3"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </ComposerPrimitive.Send>
                </div>
              </ComposerPrimitive.Root>
            </ThreadPrimitive.Root>
          </div>
        </CardContent>
      </Card>
    </AssistantRuntimeProvider>
  );
};

export default BIAssistantChat;