/**
 * Business Intelligence Assistant Runtime
 * Integrates Mastra client with assistant-ui's useExternalStoreRuntime
 * Provides specialized BI functionality and context-aware prompts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  useExternalStoreRuntime, 
  type ThreadMessageLike,
  type AppendMessage,
  type AssistantRuntime
} from '@assistant-ui/react';
import { useMastraChat } from '@/hooks/use-mastra-chat';
import type {
  BIMessage,
  BIThread,
  BusinessIntelligenceContext,
  BIRuntimeConfig,
  BISendMessageConfig,
  AssistantError
} from '@/types/assistant';

/**
 * Custom hook that creates a Business Intelligence Assistant Runtime
 * Integrates with assistant-ui for optimal chat experience
 */
export function useBIAssistantRuntime(config: BIRuntimeConfig = {}) {
  const {
    agentId = import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence',
    resourceId = 'default',
    businessContext,
    mastraConfig
  } = config;

  // Use existing Mastra chat hook
  const {
    messages,
    threads,
    currentThreadId,
    isLoading,
    isStreaming,
    error,
    client,
    sendMessage,
    createThread,
    switchThread,
    deleteThread,
    clearError,
    initialize
  } = useMastraChat();

  // State for assistant-ui integration
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Initialize the runtime on mount
   */
  useEffect(() => {
    if (!client) {
      initialize(mastraConfig).catch(console.error);
    }
  }, [client, initialize, mastraConfig]);

  /**
   * Generate current date context for business intelligence queries
   */
  const getCurrentDateContext = useCallback((): BusinessIntelligenceContext => {
    if (businessContext) {
      return businessContext;
    }

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
  }, [businessContext]);

  /**
   * Enhanced prompt adapter for Business Intelligence queries
   */
  const adaptPromptForBI = useCallback((content: string): string => {
    const dateContext = getCurrentDateContext();
    
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

USER QUERY: ${content}
`;

    return contextMessage;
  }, [getCurrentDateContext]);

  /**
   * Handle new message from assistant-ui
   */
  const handleNewMessage = useCallback(async (message: AppendMessage) => {
    console.log('🔍 DEBUG: handleNewMessage called:', { message, isStreaming, isLoading });
    setIsRunning(true);
    abortControllerRef.current = new AbortController();

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
      let threadId = currentThreadId;
      if (!threadId) {
        threadId = await createThread({
          title: 'Business Intelligence Analysis',
          agentId,
          resourceId,
          metadata: {
            type: 'business-intelligence',
            createdAt: new Date().toISOString()
          }
        });
      }

      // Enhance the prompt with BI context
      const enhancedPrompt = adaptPromptForBI(textContent);

      const config: BISendMessageConfig = {
        content: enhancedPrompt,
        threadId,
        resourceId,
        businessContext: getCurrentDateContext(),
        metadata: {
          agentId,
          timestamp: new Date().toISOString(),
          originalQuery: textContent,
          analysisType: 'general'
        }
      };

      await sendMessage(config);
    } catch (err) {
      console.error('Failed to send BI message:', err);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [currentThreadId, createThread, agentId, resourceId, adaptPromptForBI, getCurrentDateContext, sendMessage, isLoading, isStreaming]);

  /**
   * Convert messages to ThreadMessageLike format
   */
  const threadMessages = useMemo((): ThreadMessageLike[] => {
    return messages.map(message => ({
      id: message.id,
      role: message.role,
      content: Array.isArray(message.content) 
        ? message.content 
        : [{ type: 'text', text: message.content }],
      metadata: {
        custom: {}
      },
      createdAt: new Date()
    }));
  }, [messages]);

  /**
   * Convert messages to BI format for enhanced functionality
   */
  const biMessages = useMemo((): BIMessage[] => {
    return messages.map(message => ({
      ...message,
      type: message.role === 'assistant' ? 'insight' : 'query',
      businessContext: {
        domain: 'dental-brace-manufacturing',
        metrics: ['production', 'quality', 'financial', 'customer'],
        timeframe: 'current',
        confidence: message.role === 'assistant' ? 0.85 : undefined
      }
    }));
  }, [messages]);

  /**
   * Create assistant-ui runtime
   */
  const runtime = useExternalStoreRuntime({
    messages: threadMessages,
    isRunning: isRunning || isStreaming,
    onNew: handleNewMessage,
    convertMessage: (message: ThreadMessageLike) => message
  });

  /**
   * Enhanced return object with BI-specific functionality
   */
  return {
    // Assistant-UI runtime
    runtime,
    
    // Enhanced state
    messages: biMessages,
    threads: threads as BIThread[],
    currentThreadId,
    isLoading,
    isStreaming,
    isRunning,
    error,
    client,
    
    // Enhanced actions
    sendMessage: handleNewMessage,
    createThread: async (title?: string) => {
      return createThread({
        title: title || 'Business Intelligence Analysis',
        agentId,
        resourceId,
        metadata: {
          type: 'business-intelligence',
          domain: 'dental-brace-manufacturing',
          createdAt: new Date().toISOString()
        }
      });
    },
    switchThread,
    deleteThread,
    clearError,
    initialize: () => initialize(mastraConfig),
    
    // BI-specific utilities
    getCurrentDateContext,
    adaptPromptForBI
  };
}

/**
 * Type for the return value of useBIAssistantRuntime
 */
export type BIAssistantRuntime = ReturnType<typeof useBIAssistantRuntime>;