/**
 * Langfuse React Hook
 * 
 * Custom React hook for integrating Langfuse observability into React components
 * with comprehensive tracking, error handling, and business intelligence features.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLangfuseClientService } from '../services/langfuse-client';
import { getObservabilityService } from '../services/observability-service';
import {
  type UseLangfuseReturn,
  type LangfuseConfig,
  type BIObservabilityContext,
  type BIQueryType,
  type ErrorSeverity,
  type ErrorCategory,
} from '../types/langfuse';

// ============================================================================
// Hook State Types
// ============================================================================

interface LangfuseHookState {
  isEnabled: boolean;
  isInitialized: boolean;
  config: LangfuseConfig | null;
  error: Error | null;
}

// ============================================================================
// Main Langfuse Hook
// ============================================================================

/**
 * Main Langfuse hook for React components
 */
export function useLangfuse(): UseLangfuseReturn {
  const [state, setState] = useState<LangfuseHookState>({
    isEnabled: false,
    isInitialized: false,
    config: null,
    error: null,
  });

  const clientService = useRef(getLangfuseClientService());
  const observabilityService = useRef(getObservabilityService());

  // Initialize hook state
  useEffect(() => {
    try {
      const isEnabled = clientService.current.isEnabled();
      const config = isEnabled ? clientService.current.getConfig() : null;

      setState({
        isEnabled,
        isInitialized: true,
        config,
        error: null,
      });
    } catch (error) {
      setState({
        isEnabled: false,
        isInitialized: true,
        config: null,
        error: error as Error,
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isEnabled) {
        clientService.current.flush().catch(console.error);
      }
    };
  }, [state.isEnabled]);

  return {
    client: clientService.current,
    observability: observabilityService.current,
    isEnabled: state.isEnabled,
    config: state.config || ({} as LangfuseConfig),
  };
}

// ============================================================================
// Business Intelligence Observability Hook
// ============================================================================

/**
 * Specialized hook for Business Intelligence observability
 */
export function useBIObservability() {
  const { client, observability, isEnabled } = useLangfuse();
  const activeTraces = useRef(new Set<string>());

  const startBITrace = useCallback(async (
    name: string,
    queryType: BIQueryType,
    input?: unknown,
    context?: Partial<BIObservabilityContext>
  ): Promise<string> => {
    if (!isEnabled) {
      return 'disabled-trace';
    }

    try {
      const biContext: BIObservabilityContext = {
        queryType,
        ...context,
      };

      const traceId = await observability.startTrace(name, input, biContext);
      activeTraces.current.add(traceId);
      return traceId;
    } catch (error) {
      console.error('Failed to start BI trace:', error);
      return 'error-trace';
    }
  }, [isEnabled, observability]);

  const endBITrace = useCallback(async (
    traceId: string,
    output?: unknown
  ): Promise<void> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await observability.endTrace(traceId, output);
      activeTraces.current.delete(traceId);
    } catch (error) {
      console.error('Failed to end BI trace:', error);
    }
  }, [isEnabled, observability]);

  const trackBIQuery = useCallback(async (
    traceId: string,
    queryType: BIQueryType,
    query: unknown,
    result?: unknown,
    context?: Partial<BIObservabilityContext>
  ): Promise<string> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return 'disabled-span';
    }

    try {
      return await client.createBISpan({
        traceId,
        name: `bi-query:${queryType}`,
        input: query,
        output: result,
        biContext: {
          queryType,
          ...context,
        },
      });
    } catch (error) {
      console.error('Failed to track BI query:', error);
      return 'error-span';
    }
  }, [isEnabled, client]);

  const trackToolUsage = useCallback(async (
    traceId: string,
    toolName: string,
    input: unknown,
    output?: unknown,
    parentId?: string
  ): Promise<string> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return 'disabled-span';
    }

    try {
      return await client.trackToolCall({
        traceId,
        parentObservationId: parentId,
        toolName,
        input,
        output,
        startTime: new Date(),
        endTime: new Date(),
        success: output !== undefined,
      });
    } catch (error) {
      console.error('Failed to track tool usage:', error);
      return 'error-span';
    }
  }, [isEnabled, client]);

  const measureQueryPerformance = useCallback(async <T>(
    operation: () => T | Promise<T>,
    queryName: string,
    traceId: string,
    queryType: BIQueryType
  ): Promise<T> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return await operation();
    }

    try {
      return await observability.measurePerformance(operation, `bi-query:${queryName}`, traceId);
    } catch (error) {
      console.error('Failed to measure query performance:', error);
      return await operation();
    }
  }, [isEnabled, observability]);

  const handleBIError = useCallback(async (
    error: Error,
    traceId: string,
    context?: {
      queryType?: BIQueryType;
      severity?: ErrorSeverity;
      parentId?: string;
    }
  ): Promise<void> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await observability.handleError(error, traceId, {
        severity: context?.severity,
        category: 'business_logic',
        parentId: context?.parentId,
      });
    } catch (trackingError) {
      console.error('Failed to handle BI error:', trackingError);
    }
  }, [isEnabled, observability]);

  // Cleanup active traces on unmount
  useEffect(() => {
    return () => {
      if (isEnabled && activeTraces.current.size > 0) {
        Promise.all(
          Array.from(activeTraces.current).map(traceId => 
            observability.endTrace(traceId).catch(console.error)
          )
        ).catch(console.error);
        activeTraces.current.clear();
      }
    };
  }, [isEnabled, observability]);

  return {
    startBITrace,
    endBITrace,
    trackBIQuery,
    trackToolUsage,
    measureQueryPerformance,
    handleBIError,
  };
}

// ============================================================================
// Trace Management Hook
// ============================================================================

/**
 * Hook for managing individual traces
 */
export function useTrace(traceName?: string) {
  const { observability, isEnabled } = useLangfuse();
  const [traceId, setTraceId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startTrace = useCallback(async (
    name: string,
    input?: unknown,
    biContext?: BIObservabilityContext
  ): Promise<string> => {
    if (!isEnabled) {
      return 'disabled-trace';
    }

    try {
      const newTraceId = await observability.startTrace(name, input, biContext);
      setTraceId(newTraceId);
      setIsActive(true);
      return newTraceId;
    } catch (error) {
      console.error('Failed to start trace:', error);
      return 'error-trace';
    }
  }, [isEnabled, observability]);

  const endTrace = useCallback(async (output?: unknown): Promise<void> => {
    if (!isEnabled || !traceId || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await observability.endTrace(traceId, output);
      setIsActive(false);
    } catch (error) {
      console.error('Failed to end trace:', error);
    }
  }, [isEnabled, observability, traceId]);

  const addSpan = useCallback(async (
    name: string,
    input?: unknown,
    parentId?: string
  ): Promise<string> => {
    if (!isEnabled || !traceId || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return 'disabled-span';
    }

    try {
      return await observability.startSpan(traceId, name, input, parentId);
    } catch (error) {
      console.error('Failed to add span:', error);
      return 'error-span';
    }
  }, [isEnabled, observability, traceId]);

  const endSpan = useCallback(async (
    spanId: string,
    output?: unknown
  ): Promise<void> => {
    if (!isEnabled || spanId === 'disabled-span' || spanId === 'error-span') {
      return;
    }

    try {
      await observability.endSpan(spanId, output);
    } catch (error) {
      console.error('Failed to end span:', error);
    }
  }, [isEnabled, observability]);

  // Auto-start trace if name is provided
  useEffect(() => {
    if (traceName && isEnabled && !traceId) {
      startTrace(traceName).catch(console.error);
    }
  }, [traceName, isEnabled, traceId, startTrace]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive && traceId) {
        endTrace().catch(console.error);
      }
    };
  }, [isActive, traceId, endTrace]);

  return {
    traceId,
    isActive,
    startTrace,
    endTrace,
    addSpan,
    endSpan,
  };
}

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const { observability, isEnabled } = useLangfuse();

  const measurePerformance = useCallback(async <T>(
    operation: () => T | Promise<T>,
    operationName: string,
    traceId: string
  ): Promise<T> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return await operation();
    }

    try {
      return await observability.measurePerformance(operation, operationName, traceId);
    } catch (error) {
      console.error('Failed to measure performance:', error);
      return await operation();
    }
  }, [isEnabled, observability]);

  const wrapFunction = useCallback(<T extends (...args: unknown[]) => unknown>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T => {
    if (!isEnabled) {
      return fn;
    }

    return observability.wrapFunction(fn, name, options);
  }, [isEnabled, observability]);

  const wrapAsyncFunction = useCallback(<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T => {
    if (!isEnabled) {
      return fn;
    }

    return observability.wrapAsyncFunction(fn, name, options);
  }, [isEnabled, observability]);

  return {
    measurePerformance,
    wrapFunction,
    wrapAsyncFunction,
  };
}

// ============================================================================
// Error Tracking Hook
// ============================================================================

/**
 * Hook for error tracking
 */
export function useErrorTracking() {
  const { observability, isEnabled } = useLangfuse();

  const trackError = useCallback(async (
    error: Error,
    traceId: string,
    context?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      parentId?: string;
    }
  ): Promise<void> => {
    if (!isEnabled || traceId === 'disabled-trace' || traceId === 'error-trace') {
      return;
    }

    try {
      await observability.handleError(error, traceId, context);
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  }, [isEnabled, observability]);

  const createErrorBoundary = useCallback((
    traceId: string,
    onError?: (error: Error) => void
  ) => {
    return (error: Error, errorInfo: { componentStack: string }) => {
      // Track the error
      trackError(error, traceId, {
        severity: 'high',
        category: 'system',
      }).catch(console.error);

      // Call custom error handler if provided
      if (onError) {
        onError(error);
      }

      // Log to console for development
      console.error('Component error boundary caught error:', error, errorInfo);
    };
  }, [trackError]);

  return {
    trackError,
    createErrorBoundary,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if Langfuse is enabled and ready
 */
export function useLangfuseStatus() {
  const { isEnabled, config } = useLangfuse();
  const [status, setStatus] = useState<{
    enabled: boolean;
    configured: boolean;
    ready: boolean;
  }>({
    enabled: false,
    configured: false,
    ready: false,
  });

  useEffect(() => {
    setStatus({
      enabled: isEnabled,
      configured: config !== null && Object.keys(config).length > 0,
      ready: isEnabled && config !== null,
    });
  }, [isEnabled, config]);

  return status;
}

/**
 * Hook for debugging Langfuse integration
 */
export function useLangfuseDebug() {
  const { config, isEnabled } = useLangfuse();
  const [debugInfo, setDebugInfo] = useState<{
    isEnabled: boolean;
    config: LangfuseConfig | null;
    environment: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (config?.debug) {
      setDebugInfo({
        isEnabled,
        config,
        environment: import.meta.env.MODE || 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  }, [isEnabled, config]);

  const logDebugInfo = useCallback(() => {
    if (debugInfo) {
      console.log('Langfuse Debug Info:', debugInfo);
    }
  }, [debugInfo]);

  return {
    debugInfo,
    logDebugInfo,
    isDebugMode: config?.debug || false,
  };
}