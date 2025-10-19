/**
 * Migration Helpers
 * 
 * Utility functions to help with the migration from legacy BI system to Mastra agent
 * Provides data transformation, compatibility layers, and migration validation
 */

import type {
  AnalyticsQuery as MastraAnalyticsQuery,
  AnalyticsResult as MastraAnalyticsResult,
  DashboardData as MastraDashboardData,
  BIQueryType as MastraBIQueryType,
} from '@/types/ai-agent';

import type {
  BIQueryType as LangfuseBIQueryType,
} from '@/types/langfuse';

// Import legacy types from the existing hooks
type LegacyAnalyticsQuery = {
  id: string;
  type: LangfuseBIQueryType;
  query: string;
  parameters?: Record<string, unknown>;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  aggregations?: string[];
  dimensions?: string[];
  metrics?: string[];
};

type LegacyAnalyticsResult = {
  id: string;
  data: unknown;
  metadata: {
    executionTime: number;
    recordCount: number;
    cacheHit: boolean;
    queryOptimized: boolean;
  };
  insights?: {
    trends: string[];
    anomalies: string[];
    recommendations: string[];
  };
};

type LegacyDashboardData = {
  id: string;
  title: string;
  widgets: Array<{
    id: string;
    type: 'chart' | 'table' | 'metric' | 'text';
    title: string;
    data: unknown;
    config: Record<string, unknown>;
  }>;
  lastUpdated: Date;
  refreshInterval: number;
};

// ============================================================================
// Query Type Mapping
// ============================================================================

/**
 * Map legacy query types to Mastra query types
 */
const QUERY_TYPE_MAPPING: Record<LangfuseBIQueryType, MastraBIQueryType> = {
  'data_analysis': 'data_analysis',
  'report_generation': 'report_generation',
  'dashboard_query': 'dashboard_query',
  'metric_calculation': 'metric_calculation',
  'trend_analysis': 'trend_analysis',
  'comparative_analysis': 'comparative_analysis',
  'predictive_analysis': 'predictive_analysis',
  'custom_query': 'custom_query',
};

/**
 * Map Mastra query types back to legacy query types
 */
const REVERSE_QUERY_TYPE_MAPPING: Record<MastraBIQueryType, LangfuseBIQueryType> = {
  'data_analysis': 'data_analysis',
  'report_generation': 'report_generation',
  'dashboard_query': 'dashboard_query',
  'metric_calculation': 'metric_calculation',
  'trend_analysis': 'trend_analysis',
  'comparative_analysis': 'comparative_analysis',
  'predictive_analysis': 'predictive_analysis',
  'custom_query': 'custom_query',
};

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform legacy analytics query to Mastra format
 */
export function transformLegacyQueryToMastra(
  legacyQuery: LegacyAnalyticsQuery
): MastraAnalyticsQuery {
  return {
    id: legacyQuery.id,
    type: QUERY_TYPE_MAPPING[legacyQuery.type] || 'custom_query',
    query: legacyQuery.query,
    parameters: legacyQuery.parameters,
    timeRange: legacyQuery.timeRange,
    filters: legacyQuery.filters,
    aggregations: legacyQuery.aggregations,
    dimensions: legacyQuery.dimensions,
    metrics: legacyQuery.metrics,
  };
}

/**
 * Transform Mastra analytics query to legacy format
 */
export function transformMastraQueryToLegacy(
  mastraQuery: MastraAnalyticsQuery
): LegacyAnalyticsQuery {
  return {
    id: mastraQuery.id,
    type: REVERSE_QUERY_TYPE_MAPPING[mastraQuery.type] || 'custom_query',
    query: mastraQuery.query,
    parameters: mastraQuery.parameters,
    timeRange: mastraQuery.timeRange,
    filters: mastraQuery.filters,
    aggregations: mastraQuery.aggregations,
    dimensions: mastraQuery.dimensions,
    metrics: mastraQuery.metrics,
  };
}

/**
 * Transform legacy analytics result to Mastra format
 */
export function transformLegacyResultToMastra(
  legacyResult: LegacyAnalyticsResult
): MastraAnalyticsResult {
  return {
    id: legacyResult.id,
    data: legacyResult.data,
    metadata: {
      executionTime: legacyResult.metadata.executionTime,
      recordCount: legacyResult.metadata.recordCount,
      cacheHit: legacyResult.metadata.cacheHit,
      queryOptimized: legacyResult.metadata.queryOptimized,
    },
    insights: legacyResult.insights,
  };
}

/**
 * Transform Mastra analytics result to legacy format
 */
export function transformMastraResultToLegacy(
  mastraResult: MastraAnalyticsResult
): LegacyAnalyticsResult {
  return {
    id: mastraResult.id,
    data: mastraResult.data,
    metadata: {
      executionTime: mastraResult.metadata.executionTime,
      recordCount: mastraResult.metadata.recordCount,
      cacheHit: mastraResult.metadata.cacheHit,
      queryOptimized: mastraResult.metadata.queryOptimized,
    },
    insights: mastraResult.insights,
  };
}

/**
 * Transform legacy dashboard data to Mastra format
 */
export function transformLegacyDashboardToMastra(
  legacyDashboard: LegacyDashboardData
): MastraDashboardData {
  return {
    id: legacyDashboard.id,
    title: legacyDashboard.title,
    widgets: legacyDashboard.widgets.map(widget => ({
      id: widget.id,
      type: widget.type === 'text' ? 'text' : widget.type === 'metric' ? 'metric' : widget.type,
      title: widget.title,
      data: widget.data,
      config: widget.config,
    })),
    lastUpdated: legacyDashboard.lastUpdated,
    refreshInterval: legacyDashboard.refreshInterval,
  };
}

/**
 * Transform Mastra dashboard data to legacy format
 */
export function transformMastraDashboardToLegacy(
  mastraDashboard: MastraDashboardData
): LegacyDashboardData {
  return {
    id: mastraDashboard.id,
    title: mastraDashboard.title,
    widgets: mastraDashboard.widgets.map(widget => ({
      id: widget.id,
      type: widget.type === 'alert' ? 'text' : widget.type,
      title: widget.title,
      data: widget.data,
      config: widget.config,
    })),
    lastUpdated: mastraDashboard.lastUpdated,
    refreshInterval: mastraDashboard.refreshInterval,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate that a query is compatible with both systems
 */
export function validateQueryCompatibility(query: MastraAnalyticsQuery): {
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check query type compatibility
  if (!REVERSE_QUERY_TYPE_MAPPING[query.type]) {
    issues.push(`Query type '${query.type}' is not supported in legacy system`);
    recommendations.push('Use a supported query type or enable Mastra agent');
  }

  // Check for complex parameters that might not be supported
  if (query.parameters && Object.keys(query.parameters).length > 10) {
    issues.push('Query has many parameters that might not be fully supported in legacy system');
    recommendations.push('Simplify query parameters or use Mastra agent for complex queries');
  }

  // Check time range format
  if (query.timeRange && (!query.timeRange.start || !query.timeRange.end)) {
    issues.push('Time range must have both start and end dates');
    recommendations.push('Provide complete time range or remove time range filter');
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * Validate dashboard compatibility
 */
export function validateDashboardCompatibility(dashboard: MastraDashboardData): {
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check widget types
  const unsupportedWidgets = dashboard.widgets.filter(widget => 
    widget.type === 'alert' // Alert widgets are not supported in legacy system
  );

  if (unsupportedWidgets.length > 0) {
    issues.push(`${unsupportedWidgets.length} widgets use types not supported in legacy system`);
    recommendations.push('Convert alert widgets to text widgets or enable Mastra agent');
  }

  // Check refresh interval
  if (dashboard.refreshInterval < 10000) {
    issues.push('Refresh interval is too short for legacy system');
    recommendations.push('Increase refresh interval to at least 10 seconds');
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    recommendations,
  };
}

// ============================================================================
// Migration Status Tracking
// ============================================================================

/**
 * Migration status for individual components
 */
export interface ComponentMigrationStatus {
  componentName: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  usingMastraAgent: boolean;
  fallbackAvailable: boolean;
  lastMigrationAttempt?: Date;
  migrationErrors?: string[];
  performanceComparison?: {
    legacy: { averageResponseTime: number; errorRate: number };
    mastra: { averageResponseTime: number; errorRate: number };
  };
}

/**
 * Track migration status for components
 */
export class MigrationStatusTracker {
  private static instance: MigrationStatusTracker;
  private componentStatus = new Map<string, ComponentMigrationStatus>();

  private constructor() {}

  static getInstance(): MigrationStatusTracker {
    if (!MigrationStatusTracker.instance) {
      MigrationStatusTracker.instance = new MigrationStatusTracker();
    }
    return MigrationStatusTracker.instance;
  }

  /**
   * Update component migration status
   */
  updateComponentStatus(componentName: string, updates: Partial<ComponentMigrationStatus>): void {
    const existing = this.componentStatus.get(componentName) || {
      componentName,
      status: 'not_started',
      usingMastraAgent: false,
      fallbackAvailable: true,
    };

    const updated = { ...existing, ...updates };
    this.componentStatus.set(componentName, updated);

    // Persist to localStorage for debugging
    this.persistStatus();
  }

  /**
   * Get component migration status
   */
  getComponentStatus(componentName: string): ComponentMigrationStatus | null {
    return this.componentStatus.get(componentName) || null;
  }

  /**
   * Get all component statuses
   */
  getAllStatuses(): ComponentMigrationStatus[] {
    return Array.from(this.componentStatus.values());
  }

  /**
   * Get migration summary
   */
  getMigrationSummary(): {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    failed: number;
    usingMastra: number;
  } {
    const statuses = this.getAllStatuses();
    
    return {
      total: statuses.length,
      notStarted: statuses.filter(s => s.status === 'not_started').length,
      inProgress: statuses.filter(s => s.status === 'in_progress').length,
      completed: statuses.filter(s => s.status === 'completed').length,
      failed: statuses.filter(s => s.status === 'failed').length,
      usingMastra: statuses.filter(s => s.usingMastraAgent).length,
    };
  }

  /**
   * Persist status to localStorage
   */
  private persistStatus(): void {
    try {
      const statusArray = this.getAllStatuses();
      localStorage.setItem('mastra_migration_status', JSON.stringify(statusArray));
    } catch (error) {
      console.warn('Failed to persist migration status:', error);
    }
  }

  /**
   * Load status from localStorage
   */
  loadPersistedStatus(): void {
    try {
      const stored = localStorage.getItem('mastra_migration_status');
      if (stored) {
        const statusArray: ComponentMigrationStatus[] = JSON.parse(stored);
        statusArray.forEach(status => {
          this.componentStatus.set(status.componentName, status);
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted migration status:', error);
    }
  }
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Create a fallback error handler for migration scenarios
 */
export function createMigrationErrorHandler(
  componentName: string,
  fallbackFunction?: () => void
) {
  const tracker = MigrationStatusTracker.getInstance();

  return (error: Error, context?: Record<string, unknown>) => {
    console.error(`Migration error in ${componentName}:`, error);

    // Update migration status
    tracker.updateComponentStatus(componentName, {
      status: 'failed',
      lastMigrationAttempt: new Date(),
      migrationErrors: [error.message],
    });

    // Execute fallback if provided
    if (fallbackFunction) {
      try {
        fallbackFunction();
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${componentName}:`, fallbackError);
      }
    }

    // Re-throw error for component handling
    throw error;
  };
}

/**
 * Create a performance comparison utility
 */
export function createPerformanceComparator(componentName: string) {
  const tracker = MigrationStatusTracker.getInstance();
  const measurements = {
    legacy: { responseTimes: [] as number[], errors: 0, calls: 0 },
    mastra: { responseTimes: [] as number[], errors: 0, calls: 0 },
  };

  return {
    measureLegacy: async <T>(operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      measurements.legacy.calls++;

      try {
        const result = await operation();
        measurements.legacy.responseTimes.push(Date.now() - startTime);
        return result;
      } catch (error) {
        measurements.legacy.errors++;
        throw error;
      }
    },

    measureMastra: async <T>(operation: () => Promise<T>): Promise<T> => {
      const startTime = Date.now();
      measurements.mastra.calls++;

      try {
        const result = await operation();
        measurements.mastra.responseTimes.push(Date.now() - startTime);
        return result;
      } catch (error) {
        measurements.mastra.errors++;
        throw error;
      }
    },

    getComparison: () => {
      const legacyAvg = measurements.legacy.responseTimes.length > 0
        ? measurements.legacy.responseTimes.reduce((a, b) => a + b, 0) / measurements.legacy.responseTimes.length
        : 0;

      const mastraAvg = measurements.mastra.responseTimes.length > 0
        ? measurements.mastra.responseTimes.reduce((a, b) => a + b, 0) / measurements.mastra.responseTimes.length
        : 0;

      const comparison = {
        legacy: {
          averageResponseTime: legacyAvg,
          errorRate: measurements.legacy.calls > 0 ? measurements.legacy.errors / measurements.legacy.calls : 0,
        },
        mastra: {
          averageResponseTime: mastraAvg,
          errorRate: measurements.mastra.calls > 0 ? measurements.mastra.errors / measurements.mastra.calls : 0,
        },
      };

      // Update tracker with performance data
      tracker.updateComponentStatus(componentName, {
        performanceComparison: comparison,
      });

      return comparison;
    },
  };
}

// ============================================================================
// Compatibility Checkers
// ============================================================================

/**
 * Check if current environment supports Mastra agent
 */
export function checkMastraCompatibility(): {
  isSupported: boolean;
  issues: string[];
  requirements: string[];
} {
  const issues: string[] = [];
  const requirements: string[] = [];

  // Check environment variables
  if (!import.meta.env.VITE_MASTRA_SERVER_URL) {
    issues.push('VITE_MASTRA_SERVER_URL environment variable not set');
    requirements.push('Set VITE_MASTRA_SERVER_URL to your Mastra server endpoint');
  }

  // Check browser compatibility
  if (typeof fetch === 'undefined') {
    issues.push('Fetch API not available');
    requirements.push('Use a modern browser or add fetch polyfill');
  }

  if (typeof ReadableStream === 'undefined') {
    issues.push('ReadableStream API not available');
    requirements.push('Use a modern browser that supports streaming');
  }

  // Check localStorage availability
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (error) {
    issues.push('localStorage not available');
    requirements.push('Enable localStorage or use alternative storage');
  }

  return {
    isSupported: issues.length === 0,
    issues,
    requirements,
  };
}

/**
 * Create a migration readiness checker
 */
export function createMigrationReadinessChecker() {
  return {
    checkComponent: (componentName: string): {
      ready: boolean;
      blockers: string[];
      recommendations: string[];
    } => {
      const blockers: string[] = [];
      const recommendations: string[] = [];

      // Check Mastra compatibility
      const compatibility = checkMastraCompatibility();
      if (!compatibility.isSupported) {
        blockers.push(...compatibility.issues);
        recommendations.push(...compatibility.requirements);
      }

      // Check component-specific readiness
      const tracker = MigrationStatusTracker.getInstance();
      const status = tracker.getComponentStatus(componentName);

      if (status?.status === 'failed') {
        blockers.push('Previous migration attempt failed');
        recommendations.push('Resolve previous migration errors before retrying');
      }

      return {
        ready: blockers.length === 0,
        blockers,
        recommendations,
      };
    },

    checkOverallReadiness: (): {
      ready: boolean;
      systemHealth: 'healthy' | 'degraded' | 'unhealthy';
      blockers: string[];
      recommendations: string[];
    } => {
      const compatibility = checkMastraCompatibility();
      const tracker = MigrationStatusTracker.getInstance();
      const summary = tracker.getMigrationSummary();

      const blockers: string[] = [];
      const recommendations: string[] = [];

      if (!compatibility.isSupported) {
        blockers.push(...compatibility.issues);
        recommendations.push(...compatibility.requirements);
      }

      if (summary.failed > 0) {
        blockers.push(`${summary.failed} components have failed migrations`);
        recommendations.push('Resolve failed component migrations before proceeding');
      }

      let systemHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (summary.failed > summary.completed) {
        systemHealth = 'unhealthy';
      } else if (summary.failed > 0 || summary.inProgress > 0) {
        systemHealth = 'degraded';
      }

      return {
        ready: blockers.length === 0,
        systemHealth,
        blockers,
        recommendations,
      };
    },
  };
}

// ============================================================================
// Export Default Instances
// ============================================================================

/**
 * Default migration status tracker instance
 */
export const migrationStatusTracker = MigrationStatusTracker.getInstance();

/**
 * Default migration readiness checker
 */
export const migrationReadinessChecker = createMigrationReadinessChecker();

/**
 * Initialize migration utilities
 */
export function initializeMigrationUtilities(): void {
  migrationStatusTracker.loadPersistedStatus();
}