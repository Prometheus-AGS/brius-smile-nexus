/**
 * Business Intelligence Assistant Runtime
 * Integrates OpenAI client with assistant-ui's useExternalStoreRuntime
 * Provides specialized BI functionality and context-aware prompts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  useExternalStoreRuntime, 
  type ThreadMessageLike,
  type AppendMessage,
  type AssistantRuntime
} from '@assistant-ui/react';
import { useOpenAIChat } from '@/hooks/use-openai-chat';
import { useChatStore } from '@/stores/assistant/chat-store';
import { useAuth } from '@/hooks/use-auth';
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
 * Integrates with assistant-ui for optimal chat experience using OpenAI
 */
export function useBIAssistantRuntime(config: BIRuntimeConfig = {}) {
  const {
    agentId = import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence',
    resourceId = 'default',
    businessContext,
  } = config;

  // Get current user for OpenAI chat
  const { user } = useAuth();

  // Use OpenAI chat hook instead of Mastra
  const openaiChat = useOpenAIChat(user || undefined);

  // Get chat store state
  const {
    threads,
    messages: storeMessages,
    activeThreadId: currentThreadId,
    isLoading,
    isStreaming,
    error: storeError,
  } = useChatStore();

  // State for assistant-ui integration
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Initialize the runtime on mount
   */
  useEffect(() => {
    // The useOpenAIChat hook handles initialization automatically
    // No manual initialization needed
  }, []);

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
      if (!threadId && openaiChat.createNewThread) {
        openaiChat.createNewThread();
        threadId = openaiChat.activeThreadId;
      }

      // Enhance the prompt with BI context
      const enhancedPrompt = adaptPromptForBI(textContent);

      // Send the enhanced prompt using the OpenAI chat hook
      if (openaiChat.sendMessage) {
        await openaiChat.sendMessage(enhancedPrompt);
      }
    } catch (err) {
      console.error('Failed to send BI message:', err);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [currentThreadId, adaptPromptForBI, openaiChat, isLoading, isStreaming]);

  /**
   * Convert store messages to ThreadMessageLike format
   */
  const threadMessages = useMemo((): ThreadMessageLike[] => {
    return storeMessages
      .filter(msg => msg.thread_id === currentThreadId)
      .map(message => ({
        id: message.id,
        role: message.role,
        content: [{ type: 'text', text: message.content }],
        metadata: {
          custom: {}
        },
        createdAt: new Date(message.created_at)
      }));
  }, [storeMessages, currentThreadId]);

  /**
   * Convert messages to BI format for enhanced functionality
   */
  const biMessages = useMemo((): BIMessage[] => {
    return storeMessages
      .filter(msg => msg.thread_id === currentThreadId)
      .map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.created_at),
        type: message.role === 'assistant' ? 'insight' : 'query',
        businessContext: {
          domain: 'dental-brace-manufacturing',
          metrics: ['production', 'quality', 'financial', 'customer'],
          timeframe: 'current',
          confidence: message.role === 'assistant' ? 0.85 : undefined
        }
      }));
  }, [storeMessages, currentThreadId]);

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
    threads: threads.map(thread => ({
      ...thread,
      createdAt: new Date(thread.created_at),
      updatedAt: new Date(thread.updated_at)
    })) as BIThread[],
    currentThreadId,
    isLoading: isLoading || openaiChat.isLoading,
    isStreaming: isStreaming || openaiChat.isStreaming,
    isRunning,
    error: storeError || openaiChat.error?.message || null,
    client: openaiChat, // Return the OpenAI chat hook as the client
    
    // Enhanced actions
    sendMessage: handleNewMessage,
    createThread: async (title?: string) => {
      if (openaiChat.createNewThread) {
        openaiChat.createNewThread();
        return openaiChat.activeThreadId || 'new-thread';
      }
      return 'new-thread';
    },
    switchThread: openaiChat.switchThread,
    deleteThread: openaiChat.deleteThread,
    clearError: openaiChat.clearError,
    initialize: () => Promise.resolve(),
    
    // BI-specific utilities
    getCurrentDateContext,
    adaptPromptForBI
  };
}

/**
 * Type for the return value of useBIAssistantRuntime
 */
export type BIAssistantRuntime = ReturnType<typeof useBIAssistantRuntime>;
