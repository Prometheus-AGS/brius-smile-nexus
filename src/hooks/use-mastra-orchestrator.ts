/**
 * Mastra Orchestrator Hook
 * 
 * Primary React hook for interacting with the Mastra orchestrator agent.
 * Provides intelligent routing, classification metadata, and comprehensive
 * fallback handling. This is the recommended hook for most use cases.
 * 
 * Follows mandatory hook-based data orchestration pattern where components
 * never directly access Zustand stores.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { getMastraAgentManager } from '@/services/mastra-agent-manager';
import type {
  MastraAgentRequest,
  MastraOrchestratorRequest,
  MastraOrchestratorResponse,
  MultiAgentExecutionResult,
  AgentHealthStatus,
  MastraAgentType,
  MastraMultiAgentError,
  MastraMultiAgentConfig,
} from '@/types/mastra-agents-types';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseMastraOrchestratorReturn {
  // State
  isLoading: boolean;
  error: MastraMultiAgentError | null;
  isHealthy: boolean;
  agentHealth: AgentHealthStatus[];
  lastExecutedBy: MastraAgentType | null;
  routingMetadata: {
    selectedAgent?: string;
    confidence?: number;
    reasoning?: string;
    classificationDetails?: Record<string, unknown>;
    executionPath?: string[];
  } | null;
  
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
  getManagerStatus: () => {
    config: MastraMultiAgentConfig;
    stats: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      agentUsage: Record<MastraAgentType, number>;
      fallbackUsage: number;
      averageResponseTime: number;
    };
    agentHealth: AgentHealthStatus[];
    healthMonitoringActive: boolean;
  };
  
  // Utility
  clearError: () => void;
  retryLastQuery: () => Promise<MastraOrchestratorResponse | null>;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useMastraOrchestrator(): UseMastraOrchestratorReturn {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MastraMultiAgentError | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);
  const [agentHealth, setAgentHealth] = useState<AgentHealthStatus[]>([]);
  const [lastExecutedBy, setLastExecutedBy] = useState<MastraAgentType | null>(null);
  const [routingMetadata, setRoutingMetadata] = useState<{
    selectedAgent?: string;
    confidence?: number;
    reasoning?: string;
    classificationDetails?: Record<string, unknown>;
    executionPath?: string[];
  } | null>(null);
  
  // Refs for retry functionality
  const lastQueryRef = useRef<MastraOrchestratorRequest | null>(null);
  
  // Agent manager instance
  const [agentManager] = useState(() => getMastraAgentManager());

  /**
   * Execute orchestrator query with intelligent routing
   */
  const executeQuery = useCallback(async (request: MastraOrchestratorRequest): Promise<MastraOrchestratorResponse> => {
    setIsLoading(true);
    setError(null);
    lastQueryRef.current = request;

    try {
      const result: MultiAgentExecutionResult = await agentManager.executeQuery(request);
      
      // Extract orchestrator-specific metadata
      const orchestratorResponse = result.response as MastraOrchestratorResponse;
      
      // Update state with routing information
      setLastExecutedBy(result.executed_by);
      setAgentHealth(result.execution_metadata.agent_health);
      
      if (orchestratorResponse.orchestration) {
        setRoutingMetadata({
          selectedAgent: orchestratorResponse.orchestration.routing_decision.selected_agent,
          confidence: orchestratorResponse.orchestration.routing_decision.confidence,
          reasoning: orchestratorResponse.orchestration.routing_decision.reasoning,
          classificationDetails: orchestratorResponse.orchestration.routing_decision.classification_details,
          executionPath: orchestratorResponse.orchestration.orchestration_metadata.routing_path,
        });
      } else {
        // Fallback metadata for non-orchestrator responses
        setRoutingMetadata({
          selectedAgent: result.executed_by,
          confidence: 0.8,
          reasoning: `Direct execution via ${result.executed_by} agent`,
          executionPath: [result.executed_by],
        });
      }
      
      // Update health status
      const healthyAgents = result.execution_metadata.agent_health.filter(
        health => health.status === 'healthy'
      );
      setIsHealthy(healthyAgents.length > 0);
      
      return orchestratorResponse;
    } catch (err) {
      const error = err as MastraMultiAgentError;
      setError(error);
      setIsHealthy(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [agentManager]);

  /**
   * Execute simple query with automatic orchestrator routing
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
   * Check health of all agents
   */
  const checkAllAgentsHealth = useCallback(async () => {
    try {
      const healthMap = await agentManager.checkAllAgentsHealth();
      const healthArray = Array.from(healthMap.values());
      
      setAgentHealth(healthArray);
      
      const healthyAgents = healthArray.filter(health => health.status === 'healthy');
      setIsHealthy(healthyAgents.length > 0);
    } catch (err) {
      const error = err as MastraMultiAgentError;
      setError(error);
      setIsHealthy(false);
    }
  }, [agentManager]);

  /**
   * Get manager status
   */
  const getManagerStatus = useCallback(() => {
    return agentManager.getStatus();
  }, [agentManager]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry last query
   */
  const retryLastQuery = useCallback(async (): Promise<MastraOrchestratorResponse | null> => {
    if (!lastQueryRef.current) {
      return null;
    }

    return executeQuery(lastQueryRef.current);
  }, [executeQuery]);

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
    isLoading,
    error,
    isHealthy,
    agentHealth,
    lastExecutedBy,
    routingMetadata,
    
    // Core Operations
    executeQuery,
    executeSimpleQuery,
    executeAnalyticsQuery,
    
    // Agent Management
    checkAllAgentsHealth,
    getManagerStatus,
    
    // Utility
    clearError,
    retryLastQuery,
  };
}

// ============================================================================
// Specialized Hook Variants
// ============================================================================

/**
 * Hook for orchestrator with BI preference
 */
export function useMastraOrchestratorBI() {
  const orchestrator = useMastraOrchestrator();
  
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
 * Hook for orchestrator with default agent preference
 */
export function useMastraOrchestratorDefault() {
  const orchestrator = useMastraOrchestrator();
  
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