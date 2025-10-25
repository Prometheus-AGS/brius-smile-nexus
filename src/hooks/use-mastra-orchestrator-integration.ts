/**
 * Mastra Orchestrator Integration Hook
 * 
 * Comprehensive React hook that integrates the orchestrator store with the agent manager
 * to provide a complete orchestrator experience. This hook handles all orchestrator
 * functionality including routing, classification, health monitoring, and state management.
 * 
 * This is the primary hook that components should use for orchestrator functionality.
 * Follows mandatory hook-based data orchestration pattern.
 */

import { useCallback, useEffect } from 'react';
import { getMastraAgentManager } from '@/services/mastra-agent-manager';
import {
  useMastraOrchestratorStore,
  selectAgentHealth,
  selectExecutionState,
  selectRoutingMetadata,
  selectPerformanceStats,
  selectPreferences,
  selectRoutingInsights,
  selectActions,
} from '@/stores/mastra-orchestrator-store';
import type {
  MastraOrchestratorRequest,
  MastraOrchestratorResponse,
  MastraAgentType,
  AgentHealthStatus,
  MastraMultiAgentError,
  MultiAgentExecutionResult,
} from '@/types/mastra-agents-types';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseMastraOrchestratorIntegrationReturn {
  // State
  isLoading: boolean;
  error: MastraMultiAgentError | null;
  isSystemHealthy: boolean;
  agentHealth: AgentHealthStatus[];
  lastExecutedBy: MastraAgentType | null;
  
  // Routing and Classification
  routingMetadata: {
    selectedAgent?: string;
    confidence?: number;
    reasoning?: string;
    classificationDetails?: Record<string, unknown>;
    executionPath?: string[];
  } | null;
  routingHistory: Array<{
    id: string;
    timestamp: Date;
    query: string;
    selectedAgent: string;
    confidence: number;
    reasoning: string;
    executionTime: number;
    success: boolean;
  }>;
  
  // Performance Insights
  insights: {
    agentUsagePercentages: Record<string, number>;
    averageConfidenceByAgent: Record<string, number>;
    successRate: number;
    fallbackRate: number;
    averageResponseTime: number;
    totalRequests: number;
    recentActivity: Array<{
      id: string;
      timestamp: Date;
      query: string;
      selectedAgent: string;
      confidence: number;
      reasoning: string;
      executionTime: number;
      success: boolean;
    }>;
  };
  
  // Core Operations
  executeQuery: (request: MastraOrchestratorRequest) => Promise<MastraOrchestratorResponse>;
  executeSimpleQuery: (query: string, context?: Record<string, unknown>) => Promise<MastraOrchestratorResponse>;
  executeAnalyticsQuery: (
    query: string,
    options?: {
      dataSources?: string[];
      timeRange?: { start: Date; end: Date };
      metrics?: string[];
      dimensions?: string[];
      filters?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }
  ) => Promise<MastraOrchestratorResponse>;
  
  // Agent Management
  checkAllAgentsHealth: () => Promise<void>;
  refreshAgentStatus: () => Promise<void>;
  
  // Preferences
  preferences: {
    preferredAgent: MastraAgentType;
    enableFallback: boolean;
    showRoutingMetadata: boolean;
    enableDebugMode: boolean;
  };
  updatePreferences: (preferences: Partial<{
    preferredAgent: MastraAgentType;
    enableFallback: boolean;
    showRoutingMetadata: boolean;
    enableDebugMode: boolean;
  }>) => void;
  setPreferredAgent: (agent: MastraAgentType) => void;
  toggleFallback: () => void;
  toggleRoutingMetadata: () => void;
  toggleDebugMode: () => void;
  
  // Utility
  clearError: () => void;
  clearHistory: () => void;
  reset: () => void;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useMastraOrchestratorIntegration(): UseMastraOrchestratorIntegrationReturn {
  // Store selectors
  const agentHealthData = useMastraOrchestratorStore(selectAgentHealth);
  const executionState = useMastraOrchestratorStore(selectExecutionState);
  const routingData = useMastraOrchestratorStore(selectRoutingMetadata);
  const performanceStats = useMastraOrchestratorStore(selectPerformanceStats);
  const preferences = useMastraOrchestratorStore(selectPreferences);
  const insights = useMastraOrchestratorStore(selectRoutingInsights);
  const actions = useMastraOrchestratorStore(selectActions);

  // Agent manager instance (singleton)
  const agentManager = getMastraAgentManager();

  /**
   * Execute orchestrator query with full state integration
   */
  const executeQuery = useCallback(async (request: MastraOrchestratorRequest): Promise<MastraOrchestratorResponse> => {
    actions.setLoading(true);
    actions.clearError();

    try {
      // Execute query through agent manager
      const result: MultiAgentExecutionResult = await agentManager.executeQuery(request, {
        preferredAgent: preferences.preferences.preferredAgent,
        bypassFallback: !preferences.preferences.enableFallback,
      });

      // Record execution in store
      actions.recordExecution(result);

      // Return the orchestrator response
      return result.response as MastraOrchestratorResponse;
    } catch (err) {
      const error = err as MastraMultiAgentError;
      actions.setError(error);
      
      // Update stats for failed request
      actions.updateStats({
        totalRequests: performanceStats.stats.totalRequests + 1,
        failedRequests: performanceStats.stats.failedRequests + 1,
      });
      
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions, agentManager, preferences.preferences.preferredAgent, preferences.preferences.enableFallback, performanceStats.stats.totalRequests, performanceStats.stats.failedRequests]);

  /**
   * Execute simple query with orchestrator
   */
  const executeSimpleQuery = useCallback(async (
    query: string,
    context?: Record<string, unknown>
  ): Promise<MastraOrchestratorResponse> => {
    const request: MastraOrchestratorRequest = {
      id: `simple-${Date.now()}`,
      query,
      type: 'general',
      context: {
        userId: 'default-user',
        sessionId: `session-${Date.now()}`,
        ...context,
      },
    };

    return executeQuery(request);
  }, [executeQuery]);

  /**
   * Execute analytics query with BI routing hints
   */
  const executeAnalyticsQuery = useCallback(async (
    query: string,
    options: {
      dataSources?: string[];
      timeRange?: { start: Date; end: Date };
      metrics?: string[];
      dimensions?: string[];
      filters?: Record<string, unknown>;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<MastraOrchestratorResponse> => {
    const request: MastraOrchestratorRequest = {
      id: `analytics-${Date.now()}`,
      query,
      type: 'analytics',
      context: {
        userId: 'default-user',
        sessionId: `session-${Date.now()}`,
        ...options.context,
        analyticsOptions: {
          dataSources: options.dataSources,
          timeRange: options.timeRange,
          metrics: options.metrics,
          dimensions: options.dimensions,
          filters: options.filters,
        },
      },
      routing_hints: {
        preferred_agent: 'business-intelligence-agent',
        complexity_override: 'force_complex',
        bypass_classification: false,
      },
    };

    return executeQuery(request);
  }, [executeQuery]);

  /**
   * Check health of all agents and update store
   */
  const checkAllAgentsHealth = useCallback(async () => {
    try {
      const healthMap = await agentManager.checkAllAgentsHealth();
      actions.updateAgentHealth(healthMap);
      
      const healthyAgents = Array.from(healthMap.values()).filter(
        health => health.status === 'healthy'
      );
      actions.setSystemHealth(healthyAgents.length > 0);
    } catch (err) {
      const error = err as MastraMultiAgentError;
      actions.setError(error);
      actions.setSystemHealth(false);
    }
  }, [agentManager, actions]);

  /**
   * Refresh agent status and update store
   */
  const refreshAgentStatus = useCallback(async () => {
    await checkAllAgentsHealth();
  }, [checkAllAgentsHealth]);

  // Initialize health check on mount
  useEffect(() => {
    checkAllAgentsHealth();
  }, [checkAllAgentsHealth]);

  // Set up periodic health monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      checkAllAgentsHealth().catch(error => {
        console.warn('Periodic health check failed:', error);
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkAllAgentsHealth]);

  return {
    // State
    isLoading: executionState.isLoading,
    error: executionState.error,
    isSystemHealthy: agentHealthData.isSystemHealthy,
    agentHealth: Array.from(agentHealthData.agentHealth.values()),
    lastExecutedBy: executionState.lastExecutedBy,
    
    // Routing and Classification
    routingMetadata: routingData.currentRouting,
    routingHistory: routingData.routingHistory,
    
    // Performance Insights
    insights,
    
    // Core Operations
    executeQuery,
    executeSimpleQuery,
    executeAnalyticsQuery,
    
    // Agent Management
    checkAllAgentsHealth,
    refreshAgentStatus,
    
    // Preferences
    preferences: preferences.preferences,
    updatePreferences: actions.updatePreferences,
    setPreferredAgent: actions.setPreferredAgent,
    toggleFallback: actions.toggleFallback,
    toggleRoutingMetadata: actions.toggleRoutingMetadata,
    toggleDebugMode: actions.toggleDebugMode,
    
    // Utility
    clearError: actions.clearError,
    clearHistory: actions.clearHistory,
    reset: actions.reset,
  };
}

// ============================================================================
// Specialized Hook Variants
// ============================================================================

/**
 * Hook for orchestrator with automatic BI preference
 */
export function useMastraOrchestratorBI() {
  const orchestrator = useMastraOrchestratorIntegration();
  
  // Override executeQuery to always prefer BI agent
  const executeQuery = useCallback(async (request: Omit<MastraOrchestratorRequest, 'routing_hints'>) => {
    return orchestrator.executeQuery({
      ...request,
      routing_hints: {
        preferred_agent: 'business-intelligence-agent',
        complexity_override: 'force_complex',
        bypass_classification: false,
      },
    });
  }, [orchestrator]);

  return {
    ...orchestrator,
    executeQuery,
  };
}

/**
 * Hook for orchestrator with automatic default agent preference
 */
export function useMastraOrchestratorDefault() {
  const orchestrator = useMastraOrchestratorIntegration();
  
  // Override executeQuery to always prefer default agent
  const executeQuery = useCallback(async (request: Omit<MastraOrchestratorRequest, 'routing_hints'>) => {
    return orchestrator.executeQuery({
      ...request,
      routing_hints: {
        preferred_agent: 'default-agent',
        complexity_override: 'force_simple',
        bypass_classification: false,
      },
    });
  }, [orchestrator]);

  return {
    ...orchestrator,
    executeQuery,
  };
}

/**
 * Hook for orchestrator routing insights and analytics
 */
export function useMastraOrchestratorInsights() {
  const insights = useMastraOrchestratorStore(selectRoutingInsights);
  const agentHealth = useMastraOrchestratorStore(selectAgentHealth);
  const performanceStats = useMastraOrchestratorStore(selectPerformanceStats);
  
  return {
    insights,
    agentHealth: Array.from(agentHealth.agentHealth.values()),
    isSystemHealthy: agentHealth.isSystemHealthy,
    lastHealthCheck: agentHealth.lastHealthCheck,
    stats: performanceStats.stats,
  };
}