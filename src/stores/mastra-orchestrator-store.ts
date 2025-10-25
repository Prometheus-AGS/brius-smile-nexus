/**
 * Mastra Orchestrator Store
 * 
 * Zustand store for managing multi-agent orchestrator state, routing decisions,
 * agent health, and execution metadata. This store provides centralized state
 * management for the orchestrator integration.
 * 
 * Follows mandatory Zustand patterns where components never directly access stores.
 * All interactions must go through custom hooks.
 */
import { extractAgentContext } from '@/lib/agent-context-processor';
import { getMastraDataSyncService } from '@/services/mastra-data-sync-service';
import { createClient } from '@supabase/supabase-js';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  AgentHealthStatus,
  MastraMultiAgentError,
  MultiAgentExecutionResult,
  MastraOrchestratorResponse,
  IntentClassificationOutput,
} from '@/types/mastra-agents-types';
import {
  MastraAgentType,
} from '@/types/mastra-agents-types';

// ============================================================================
// Store State Interface
// ============================================================================

interface MastraOrchestratorState {
  // Agent Health and Status
  agentHealth: Map<MastraAgentType, AgentHealthStatus>;
  lastHealthCheck: Date | null;
  isSystemHealthy: boolean;
  
  // Current Execution State
  isLoading: boolean;
  error: MastraMultiAgentError | null;
  lastExecutedBy: MastraAgentType | null;
  
  // Routing and Classification Metadata
  routingHistory: Array<{
    id: string;
    timestamp: Date;
    query: string;
    selectedAgent: string;
    confidence: number;
    reasoning: string;
    classificationDetails: IntentClassificationOutput;
    executionPath: string[];
    executionTime: number;
    success: boolean;
  }>;
  
  currentRouting: {
    selectedAgent?: string;
    confidence?: number;
    reasoning?: string;
    classificationDetails?: IntentClassificationOutput;
    executionPath?: string[];
  } | null;
  
  // Performance Metrics
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    agentUsage: Record<MastraAgentType, number>;
    fallbackUsage: number;
    averageResponseTime: number;
    lastRequestTime: Date | null;
  };
  
  // Configuration and Preferences
  preferences: {
    preferredAgent: MastraAgentType;
    enableFallback: boolean;
    showRoutingMetadata: boolean;
    enableDebugMode: boolean;
  };
}

// ============================================================================
// Store Actions Interface
// ============================================================================

interface MastraOrchestratorActions {
  // Agent Health Management
  updateAgentHealth: (health: Map<MastraAgentType, AgentHealthStatus>) => void;
  setSystemHealth: (isHealthy: boolean) => void;
  fetchAgentHealthFromServer: () => Promise<void>;
  
  // Execution State Management
  setLoading: (loading: boolean) => void;
  setError: (error: MastraMultiAgentError | null) => void;
  clearError: () => void;
  setLastExecutedBy: (agent: MastraAgentType | null) => void;
  
  // Routing and Classification
  updateCurrentRouting: (routing: {
    selectedAgent?: string;
    confidence?: number;
    reasoning?: string;
    classificationDetails?: IntentClassificationOutput;
    executionPath?: string[];
  } | null) => void;
  
  addRoutingHistory: (entry: {
    id: string;
    query: string;
    selectedAgent: string;
    confidence: number;
    reasoning: string;
    classificationDetails: IntentClassificationOutput;
    executionPath: string[];
    executionTime: number;
    success: boolean;
  }) => void;
  
  clearRoutingHistory: () => void;
  
  // Performance Tracking
  updateStats: (update: {
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    agentUsage?: Partial<Record<MastraAgentType, number>>;
    fallbackUsage?: number;
    averageResponseTime?: number;
  }) => void;
  
  recordExecution: (result: MultiAgentExecutionResult) => void;
  
  // Preferences Management
  updatePreferences: (preferences: Partial<MastraOrchestratorState['preferences']>) => void;
  setPreferredAgent: (agent: MastraAgentType) => void;
  toggleFallback: () => void;
  toggleRoutingMetadata: () => void;
  toggleDebugMode: () => void;
  
  // Utility Actions
  reset: () => void;
  clearHistory: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

type MastraOrchestratorStore = MastraOrchestratorState & MastraOrchestratorActions;

/**
 * Initial store state
 */
const initialState: MastraOrchestratorState = {
  // Agent Health and Status
  agentHealth: new Map(),
  lastHealthCheck: null,
  isSystemHealthy: true,
  
  // Current Execution State
  isLoading: false,
  error: null,
  lastExecutedBy: null,
  
  // Routing and Classification Metadata
  routingHistory: [],
  currentRouting: null,
  
  // Performance Metrics
  stats: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    agentUsage: {
      [MastraAgentType.ORCHESTRATOR]: 0,
      [MastraAgentType.BUSINESS_INTELLIGENCE]: 0,
      [MastraAgentType.DEFAULT]: 0,
    },
    fallbackUsage: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
  },
  
  // Configuration and Preferences
  preferences: {
    preferredAgent: MastraAgentType.DEFAULT,
    enableFallback: true,
    showRoutingMetadata: true,
    enableDebugMode: false,
  },
};

/**
 * Mastra Orchestrator Zustand Store
 */
export const useMastraOrchestratorStore = create<MastraOrchestratorStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Agent Health Management
        updateAgentHealth: (health: Map<MastraAgentType, AgentHealthStatus>) => {
          set((state) => ({
            agentHealth: health,
            lastHealthCheck: new Date(),
            isSystemHealthy: Array.from(health.values()).some(h => h.status === 'healthy'),
          }), false, 'updateAgentHealth');
        },
        
        setSystemHealth: (isHealthy: boolean) => {
          set({ isSystemHealthy: isHealthy }, false, 'setSystemHealth');
        },
        
        
        fetchAgentHealthFromServer: async () => {
          console.log('[DEBUG] MastraOrchestratorStore: Fetching agent health from server', {
            timestamp: new Date().toISOString()
          });
          
          try {
            // Get current user and session from Supabase
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              console.warn('[DEBUG] MastraOrchestratorStore: Supabase config missing, skipping health fetch');
              return;
            }
            
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data: { user } } = await supabase.auth.getUser();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!user) {
              console.warn('[DEBUG] MastraOrchestratorStore: User not authenticated, skipping health fetch');
              return;
            }
            
            // Extract agent context
            const agentContext = await extractAgentContext(user, session);
            
            console.log('[DEBUG] MastraOrchestratorStore: Agent context created for health fetch');
            
            // Get Mastra data sync service
            const syncService = getMastraDataSyncService();
            
            // Fetch agent health
            const healthMap = await syncService.fetchAgentHealth(agentContext);
            
            console.log('[DEBUG] MastraOrchestratorStore: Agent health fetched from server', {
              agentCount: healthMap.size
            });
            
            // Update store with health data
            set((state) => ({
              agentHealth: healthMap,
              lastHealthCheck: new Date(),
              isSystemHealthy: Array.from(healthMap.values()).some(h => h.status === 'healthy'),
            }), false, 'fetchAgentHealthFromServer');
            
            console.log('[DEBUG] MastraOrchestratorStore: Agent health updated successfully');
          } catch (error) {
            console.error('[DEBUG] MastraOrchestratorStore: Failed to fetch agent health', error);
            // Don't set error state - allow graceful degradation
            // The system can still function with cached or default health data
          }
        },
        // Execution State Management
        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, 'setLoading');
        },
        
        setError: (error: MastraMultiAgentError | null) => {
          set({ error }, false, 'setError');
        },
        
        clearError: () => {
          set({ error: null }, false, 'clearError');
        },
        
        setLastExecutedBy: (agent: MastraAgentType | null) => {
          set({ lastExecutedBy: agent }, false, 'setLastExecutedBy');
        },
        
        // Routing and Classification
        updateCurrentRouting: (routing) => {
          set({ currentRouting: routing }, false, 'updateCurrentRouting');
        },
        
        addRoutingHistory: (entry) => {
          set((state) => ({
            routingHistory: [
              {
                ...entry,
                timestamp: new Date(),
              },
              ...state.routingHistory.slice(0, 99), // Keep last 100 entries
            ],
          }), false, 'addRoutingHistory');
        },
        
        clearRoutingHistory: () => {
          set({ routingHistory: [] }, false, 'clearRoutingHistory');
        },
        
        // Performance Tracking
        updateStats: (update) => {
          set((state) => ({
            stats: {
              ...state.stats,
              ...update,
              agentUsage: {
                ...state.stats.agentUsage,
                ...update.agentUsage,
              },
              lastRequestTime: new Date(),
            },
          }), false, 'updateStats');
        },
        
        recordExecution: (result: MultiAgentExecutionResult) => {
          const state = get();
          const executionTime = result.execution_metadata.total_time_ms;
          
          // Update statistics
          const newTotalRequests = state.stats.totalRequests + 1;
          const newSuccessfulRequests = state.stats.successfulRequests + 1;
          const newAverageResponseTime = 
            (state.stats.averageResponseTime * state.stats.totalRequests + executionTime) / newTotalRequests;
          
          const newAgentUsage = { ...state.stats.agentUsage };
          newAgentUsage[result.executed_by] = (newAgentUsage[result.executed_by] || 0) + 1;
          
          // Extract orchestrator metadata if available
          const orchestratorResponse = result.response as MastraOrchestratorResponse;
          let routingEntry = null;
          
          if (orchestratorResponse.orchestration) {
            routingEntry = {
              id: result.response.id,
              query: 'query' in result.request ? (result.request as { query: string }).query : 'Unknown query',
              selectedAgent: orchestratorResponse.orchestration.routing_decision.selected_agent,
              confidence: orchestratorResponse.orchestration.routing_decision.confidence,
              reasoning: orchestratorResponse.orchestration.routing_decision.reasoning,
              classificationDetails: orchestratorResponse.orchestration.routing_decision.classification_details,
              executionPath: orchestratorResponse.orchestration.orchestration_metadata.routing_path,
              executionTime,
              success: true,
            };
          }
          
          set((state) => ({
            stats: {
              ...state.stats,
              totalRequests: newTotalRequests,
              successfulRequests: newSuccessfulRequests,
              averageResponseTime: newAverageResponseTime,
              agentUsage: newAgentUsage,
              fallbackUsage: result.execution_metadata.agents_attempted.length > 1 
                ? state.stats.fallbackUsage + 1 
                : state.stats.fallbackUsage,
              lastRequestTime: new Date(),
            },
            lastExecutedBy: result.executed_by,
            agentHealth: new Map(
              result.execution_metadata.agent_health.map(health => [health.agent, health])
            ),
            currentRouting: orchestratorResponse.orchestration ? {
              selectedAgent: orchestratorResponse.orchestration.routing_decision.selected_agent,
              confidence: orchestratorResponse.orchestration.routing_decision.confidence,
              reasoning: orchestratorResponse.orchestration.routing_decision.reasoning,
              classificationDetails: orchestratorResponse.orchestration.routing_decision.classification_details,
              executionPath: orchestratorResponse.orchestration.orchestration_metadata.routing_path,
            } : {
              selectedAgent: result.executed_by,
              confidence: 0.8,
              reasoning: `Direct execution via ${result.executed_by} agent`,
              executionPath: [result.executed_by],
            },
            routingHistory: routingEntry ? [
              routingEntry,
              ...state.routingHistory.slice(0, 99),
            ] : state.routingHistory,
          }), false, 'recordExecution');
        },
        
        // Preferences Management
        updatePreferences: (preferences) => {
          set((state) => ({
            preferences: { ...state.preferences, ...preferences },
          }), false, 'updatePreferences');
        },
        
        setPreferredAgent: (agent: MastraAgentType) => {
          set((state) => ({
            preferences: { ...state.preferences, preferredAgent: agent },
          }), false, 'setPreferredAgent');
        },
        
        toggleFallback: () => {
          set((state) => ({
            preferences: { 
              ...state.preferences, 
              enableFallback: !state.preferences.enableFallback 
            },
          }), false, 'toggleFallback');
        },
        
        toggleRoutingMetadata: () => {
          set((state) => ({
            preferences: { 
              ...state.preferences, 
              showRoutingMetadata: !state.preferences.showRoutingMetadata 
            },
          }), false, 'toggleRoutingMetadata');
        },
        
        toggleDebugMode: () => {
          set((state) => ({
            preferences: { 
              ...state.preferences, 
              enableDebugMode: !state.preferences.enableDebugMode 
            },
          }), false, 'toggleDebugMode');
        },
        
        // Utility Actions
        reset: () => {
          set(initialState, false, 'reset');
        },
        
        clearHistory: () => {
          set({ routingHistory: [] }, false, 'clearHistory');
        },
      }),
      {
        name: 'mastra-orchestrator-store',
        partialize: (state) => ({
          preferences: state.preferences,
          routingHistory: state.routingHistory.slice(0, 50), // Persist only last 50 entries
          stats: {
            ...state.stats,
            // Don't persist real-time stats
            lastRequestTime: null,
          },
        }),
      }
    ),
    {
      name: 'mastra-orchestrator-store',
    }
  )
);

// ============================================================================
// Store Selectors (for use in custom hooks)
// ============================================================================

/**
 * Selector for agent health status
 */
export const selectAgentHealth = (state: MastraOrchestratorStore) => ({
  agentHealth: state.agentHealth,
  lastHealthCheck: state.lastHealthCheck,
  isSystemHealthy: state.isSystemHealthy,
});

/**
 * Selector for execution state
 */
export const selectExecutionState = (state: MastraOrchestratorStore) => ({
  isLoading: state.isLoading,
  error: state.error,
  lastExecutedBy: state.lastExecutedBy,
});

/**
 * Selector for routing metadata
 */
export const selectRoutingMetadata = (state: MastraOrchestratorStore) => ({
  currentRouting: state.currentRouting,
  routingHistory: state.routingHistory,
});

/**
 * Selector for performance stats
 */
export const selectPerformanceStats = (state: MastraOrchestratorStore) => ({
  stats: state.stats,
});

/**
 * Selector for user preferences
 */
export const selectPreferences = (state: MastraOrchestratorStore) => ({
  preferences: state.preferences,
});

/**
 * Selector for routing insights (derived data)
 */
export const selectRoutingInsights = (state: MastraOrchestratorStore) => {
  const history = state.routingHistory;
  const agentUsage = state.stats.agentUsage;
  
  // Calculate agent usage percentages
  const totalUsage = Object.values(agentUsage).reduce((sum, count) => sum + count, 0);
  const agentUsagePercentages = Object.entries(agentUsage).reduce(
    (acc, [agent, count]) => ({
      ...acc,
      [agent]: totalUsage > 0 ? (count / totalUsage) * 100 : 0,
    }),
    {} as Record<string, number>
  );
  
  // Calculate average confidence by agent
  const confidenceByAgent = history.reduce((acc, entry) => {
    const agent = entry.selectedAgent;
    if (!acc[agent]) {
      acc[agent] = { total: 0, count: 0 };
    }
    acc[agent].total += entry.confidence;
    acc[agent].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);
  
  const averageConfidenceByAgent = Object.entries(confidenceByAgent).reduce(
    (acc, [agent, data]) => ({
      ...acc,
      [agent]: data.count > 0 ? data.total / data.count : 0,
    }),
    {} as Record<string, number>
  );
  
  // Calculate success rate
  const successRate = state.stats.totalRequests > 0 
    ? (state.stats.successfulRequests / state.stats.totalRequests) * 100 
    : 0;
  
  return {
    agentUsagePercentages,
    averageConfidenceByAgent,
    successRate,
    fallbackRate: state.stats.totalRequests > 0 
      ? (state.stats.fallbackUsage / state.stats.totalRequests) * 100 
      : 0,
    averageResponseTime: state.stats.averageResponseTime,
    totalRequests: state.stats.totalRequests,
    recentActivity: history.slice(0, 10),
  };
};

// ============================================================================
// Store Actions (for use in custom hooks)
// ============================================================================

/**
 * Selector for all store actions
 */
export const selectActions = (state: MastraOrchestratorStore) => ({
  updateAgentHealth: state.updateAgentHealth,
  setSystemHealth: state.setSystemHealth,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  setLastExecutedBy: state.setLastExecutedBy,
  updateCurrentRouting: state.updateCurrentRouting,
  addRoutingHistory: state.addRoutingHistory,
  clearRoutingHistory: state.clearRoutingHistory,
  updateStats: state.updateStats,
  recordExecution: state.recordExecution,
  updatePreferences: state.updatePreferences,
  setPreferredAgent: state.setPreferredAgent,
  toggleFallback: state.toggleFallback,
  toggleRoutingMetadata: state.toggleRoutingMetadata,
  toggleDebugMode: state.toggleDebugMode,
  reset: state.reset,
  clearHistory: state.clearHistory,
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get agent health status for a specific agent
 */
export const getAgentHealthStatus = (
  agentHealth: Map<MastraAgentType, AgentHealthStatus>,
  agent: MastraAgentType
): AgentHealthStatus | null => {
  return agentHealth.get(agent) || null;
};

/**
 * Check if any agents are healthy
 */
export const hasHealthyAgents = (agentHealth: Map<MastraAgentType, AgentHealthStatus>): boolean => {
  return Array.from(agentHealth.values()).some(health => health.status === 'healthy');
};

/**
 * Get the most reliable agent based on health and performance
 */
export const getMostReliableAgent = (
  agentHealth: Map<MastraAgentType, AgentHealthStatus>,
  stats: MastraOrchestratorState['stats']
): MastraAgentType | null => {
  const healthyAgents = Array.from(agentHealth.entries())
    .filter(([_, health]) => health.status === 'healthy')
    .map(([agent, _]) => agent);
  
  if (healthyAgents.length === 0) {
    return null;
  }
  
  // Prefer agent with best performance (lowest response time and highest usage)
  return healthyAgents.reduce((best, current) => {
    const bestUsage = stats.agentUsage[best] || 0;
    const currentUsage = stats.agentUsage[current] || 0;
    
    // Prefer agent with more usage (indicates reliability)
    return currentUsage > bestUsage ? current : best;
  });
};