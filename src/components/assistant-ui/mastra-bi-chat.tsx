/**
 * Mastra Business Intelligence Chat Component
 * 
 * Updated chat component using Mastra client integration
 * Clean Mastra integration with optimized UI/UX
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Bot, 
  User, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypePrism from 'rehype-prism-plus';
import './prism-theme.css';

// Import our new Mastra hook
import { useMastraBIAgent } from '@/hooks/use-mastra-bi-agent';
import type { BusinessIntelligenceContext } from '@/types/assistant';

// ============================================================================
// Component Types
// ============================================================================

interface MastraBIChatProps {
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

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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

const MessageRenderer: React.FC<{ message: ChatMessage }> = ({ message }) => {
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
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
            components={{
              pre: ({ children, ...props }) => (
                <pre {...props} className="overflow-x-auto rounded-lg border bg-muted p-4 my-4">
                  {children}
                </pre>
              ),
              code: ({ className, children, ...props }) => {
                const isInlineCode = !className || !className.startsWith('language-');
                
                if (isInlineCode) {
                  return (
                    <code
                      {...props}
                      className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                    >
                      {children}
                    </code>
                  );
                }
                
                return (
                  <code {...props} className={className}>
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
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const MastraBIChat: React.FC<MastraBIChatProps> = ({
  className = '',
  placeholder = 'Ask me about your business intelligence data...',
  maxHeight = '600px',
  showSuggestions = true,
  agentId = 'business-intelligence',
  resourceId = 'default'
}) => {
  // Mastra hook
  const {
    isLoading,
    error,
    isHealthy,
    executeQuery,
    clearError
  } = useMastraBIAgent();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(async (suggestion: SuggestionCard) => {
    const enhancedPrompt = adaptPromptForBI(suggestion.prompt);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: suggestion.prompt,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const analyticsQuery = {
        id: `query-${Date.now()}`,
        query: enhancedPrompt,
        type: 'data_analysis' as const,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        },
        parameters: {
          prompt: suggestion.prompt,
          context: 'business_intelligence'
        }
      };

      const result = await executeQuery(analyticsQuery);
      
      // Simulate streaming by updating content progressively
      const content = result.data ? JSON.stringify(result.data, null, 2) : 'Analysis completed successfully';
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content }
          : msg
      ));
      setIsStreaming(false);
      setStreamingContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [executeQuery]);

  // Handle manual send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const enhancedPrompt = adaptPromptForBI(inputValue.trim());
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Add assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const analyticsQuery = {
        id: `query-${Date.now()}`,
        query: enhancedPrompt,
        type: 'data_analysis' as const,
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        },
        parameters: {
          prompt: inputValue.trim(),
          context: 'business_intelligence'
        }
      };

      const result = await executeQuery(analyticsQuery);
      
      // Simulate streaming by updating content progressively
      const content = result.data ? JSON.stringify(result.data, null, 2) : 'Analysis completed successfully';
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content }
          : msg
      ));
      setIsStreaming(false);
      setStreamingContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [inputValue, executeQuery]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
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
            Business Intelligence Assistant (Mastra)
          </CardTitle>
          <div className="flex items-center gap-2">
            {isHealthy && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {!isHealthy && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
            {isStreaming && (
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
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'An error occurred'}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={clearError}
              >
                Dismiss
              </Button>
            </AlertDescription>
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
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading || isStreaming}
                >
                  <div className="flex items-start gap-3 w-full">
                    <IconComponent className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{suggestion.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageRenderer key={message.id} message={message} />
            ))}
            
            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white border rounded-lg p-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || isStreaming}
            className="min-h-[60px] resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isStreaming}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MastraBIChat;