/**
 * Business Intelligence Monitoring Hook with Langfuse Integration
 * 
 * Specialized hook for real-time BI monitoring, alerts, and system health tracking.
 * Provides comprehensive observability for system performance and business metrics.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useBIObservability } from './use-langfuse';
import type {
  BIQueryType,
  BIObservabilityContext,
} from '@/types/langfuse';

// ============================================================================
// Monitoring Types
// ============================================================================

interface MonitoringMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata: Record<string, unknown>;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  details: Record<string, unknown>;
}

interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  activeUsers: number;
  activeQueries: number;
}

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseBIMonitoringReturn {
  // State
  metrics: Map<string, MonitoringMetric>;
  alerts: Alert[];
  healthChecks: Map<string, HealthCheck>;
  performanceHistory: PerformanceSnapshot[];
  isMonitoring: boolean;
  
  // Monitoring Operations
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordMetric: (metric: Omit<MonitoringMetric, 'timestamp'>) => Promise<void>;
  
  // Alert Management
  createAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => Promise<string>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  
  // Health Monitoring
  checkServiceHealth: (service: string) => Promise<HealthCheck>;
  getAllHealthChecks: () => Promise<Map<string, HealthCheck>>;
  
  // Performance Monitoring
  capturePerformanceSnapshot: () => Promise<PerformanceSnapshot>;
  getPerformanceTrends: (timeRange: { start: Date; end: Date }) => PerformanceSnapshot[];
  
  // Threshold Management
  setMetricThreshold: (metricId: string, threshold: MonitoringMetric['threshold']) => void;
  checkThresholds: () => Promise<Alert[]>;
  
  // Utility
  clearAlerts: () => void;
  exportMetrics: (format: 'json' | 'csv') => Promise<string>;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useBIMonitoring(): UseBIMonitoringReturn {
  const {
    startBITrace,
    endBITrace,
    trackBIQuery,
    measureQueryPerformance,
    handleBIError,
  } = useBIObservability();

  // State
  const [metrics, setMetrics] = useState<Map<string, MonitoringMetric>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthChecks, setHealthChecks] = useState<Map<string, HealthCheck>>(new Map());
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceSnapshot[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const performanceInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Create monitoring context for observability
   */
  const createMonitoringContext = useCallback((
    operation: string,
    service?: string
  ): BIObservabilityContext => ({
    queryType: 'custom_query',
    dataSource: 'monitoring_system',
    businessContext: {
      department: 'operations',
      useCase: operation,
      priority: 'high',
    },
    ...(service && { filters: { service } }),
  }), []);

  /**
   * Start comprehensive monitoring
   */
  const startMonitoring = useCallback(async () => {
    const traceId = await startBITrace(
      'start-bi-monitoring',
      'custom_query',
      { operation: 'start_monitoring' },
      createMonitoringContext('start_monitoring')
    );

    try {
      setIsMonitoring(true);

      // Start metric collection
      monitoringInterval.current = setInterval(async () => {
        try {
          await collectSystemMetrics();
          await checkThresholds();
        } catch (error) {
          console.error('Monitoring error:', error);
        }
      }, 30000); // Every 30 seconds

      // Start health checks
      healthCheckInterval.current = setInterval(async () => {
        try {
          await performHealthChecks();
        } catch (error) {
          console.error('Health check error:', error);
        }
      }, 60000); // Every minute

      // Start performance monitoring
      performanceInterval.current = setInterval(async () => {
        try {
          await capturePerformanceSnapshot();
        } catch (error) {
          console.error('Performance monitoring error:', error);
        }
      }, 15000); // Every 15 seconds

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'monitoring_started' },
        { success: true },
        createMonitoringContext('start_monitoring')
      );

      await endBITrace(traceId, { success: true, monitoringActive: true });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, handleBIError, createMonitoringContext]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(async () => {
    const traceId = await startBITrace(
      'stop-bi-monitoring',
      'custom_query',
      { operation: 'stop_monitoring' },
      createMonitoringContext('stop_monitoring')
    );

    try {
      setIsMonitoring(false);

      // Clear intervals
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
        monitoringInterval.current = null;
      }
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
        healthCheckInterval.current = null;
      }
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
        performanceInterval.current = null;
      }

      await endBITrace(traceId, { success: true, monitoringActive: false });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'medium',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, handleBIError, createMonitoringContext]);

  /**
   * Record a custom metric
   */
  const recordMetric = useCallback(async (
    metric: Omit<MonitoringMetric, 'timestamp'>
  ): Promise<void> => {
    const traceId = await startBITrace(
      `record-metric:${metric.name}`,
      'metric_calculation',
      { metric },
      createMonitoringContext('record_metric')
    );

    try {
      const timestampedMetric: MonitoringMetric = {
        ...metric,
        timestamp: new Date(),
      };

      setMetrics(prev => new Map(prev).set(metric.id, timestampedMetric));

      await trackBIQuery(
        traceId,
        'metric_calculation',
        { operation: 'metric_recorded', metricId: metric.id, metricName: metric.name },
        { metric: timestampedMetric },
        createMonitoringContext('record_metric')
      );

      // Check if metric exceeds thresholds
      if (metric.threshold) {
        if (metric.value >= metric.threshold.critical) {
          await createAlert({
            severity: 'critical',
            title: `Critical threshold exceeded: ${metric.name}`,
            message: `Metric ${metric.name} value ${metric.value} exceeds critical threshold ${metric.threshold.critical}`,
            source: 'threshold_monitor',
            metadata: { metric: timestampedMetric },
          });
        } else if (metric.value >= metric.threshold.warning) {
          await createAlert({
            severity: 'warning',
            title: `Warning threshold exceeded: ${metric.name}`,
            message: `Metric ${metric.name} value ${metric.value} exceeds warning threshold ${metric.threshold.warning}`,
            source: 'threshold_monitor',
            metadata: { metric: timestampedMetric },
          });
        }
      }

      await endBITrace(traceId, { success: true, metricId: metric.id });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'metric_calculation',
        severity: 'medium',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, handleBIError, createMonitoringContext]);

  /**
   * Create a new alert
   */
  const createAlert = useCallback(async (
    alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>
  ): Promise<string> => {
    const traceId = await startBITrace(
      `create-alert:${alertData.severity}`,
      'custom_query',
      { alertData },
      createMonitoringContext('create_alert')
    );

    try {
      const alert: Alert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        acknowledged: false,
      };

      setAlerts(prev => [alert, ...prev]);

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'alert_created', alertId: alert.id, severity: alert.severity },
        { alert },
        createMonitoringContext('create_alert')
      );

      await endBITrace(traceId, { success: true, alertId: alert.id, severity: alert.severity });

      return alert.id;
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, handleBIError, createMonitoringContext]);

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    const traceId = await startBITrace(
      `acknowledge-alert:${alertId}`,
      'custom_query',
      { alertId },
      createMonitoringContext('acknowledge_alert')
    );

    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      ));

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'alert_acknowledged', alertId },
        { success: true },
        createMonitoringContext('acknowledge_alert')
      );

      await endBITrace(traceId, { success: true, alertId });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, handleBIError, createMonitoringContext]);

  /**
   * Resolve an alert
   */
  const resolveAlert = useCallback(async (alertId: string): Promise<void> => {
    const traceId = await startBITrace(
      `resolve-alert:${alertId}`,
      'custom_query',
      { alertId },
      createMonitoringContext('resolve_alert')
    );

    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, resolvedAt: new Date() }
          : alert
      ));

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'alert_resolved', alertId },
        { success: true },
        createMonitoringContext('resolve_alert')
      );

      await endBITrace(traceId, { success: true, alertId });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, handleBIError, createMonitoringContext]);

  /**
   * Check health of a specific service
   */
  const checkServiceHealth = useCallback(async (service: string): Promise<HealthCheck> => {
    const traceId = await startBITrace(
      `health-check:${service}`,
      'custom_query',
      { service },
      createMonitoringContext('health_check', service)
    );

    try {
      const healthCheck = await measureQueryPerformance(
        async (): Promise<HealthCheck> => {
          // Simulate health check
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
          const responseTime = Date.now() - startTime;

          const isHealthy = Math.random() > 0.1; // 90% healthy
          const isDegraded = !isHealthy && Math.random() > 0.5;

          return {
            service,
            status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
            lastCheck: new Date(),
            responseTime,
            details: {
              version: '1.0.0',
              uptime: Math.random() * 86400000, // Random uptime
              connections: Math.floor(Math.random() * 100),
            },
          };
        },
        `health-check-${service}`,
        traceId,
        'custom_query'
      );

      setHealthChecks(prev => new Map(prev).set(service, healthCheck));

      // Create alert if service is unhealthy
      if (healthCheck.status === 'unhealthy') {
        await createAlert({
          severity: 'critical',
          title: `Service ${service} is unhealthy`,
          message: `Health check failed for service ${service}`,
          source: 'health_monitor',
          metadata: { healthCheck },
        });
      } else if (healthCheck.status === 'degraded') {
        await createAlert({
          severity: 'warning',
          title: `Service ${service} is degraded`,
          message: `Service ${service} is experiencing performance issues`,
          source: 'health_monitor',
          metadata: { healthCheck },
        });
      }

      await endBITrace(traceId, { 
        success: true, 
        service, 
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
      });

      return healthCheck;
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'medium',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, measureQueryPerformance, handleBIError, createMonitoringContext, createAlert]);

  /**
   * Get all health checks
   */
  const getAllHealthChecks = useCallback(async (): Promise<Map<string, HealthCheck>> => {
    const services = ['database', 'api', 'cache', 'queue', 'storage'];
    
    const healthChecks = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );

    const healthCheckMap = new Map<string, HealthCheck>();
    healthChecks.forEach(check => {
      healthCheckMap.set(check.service, check);
    });

    return healthCheckMap;
  }, [checkServiceHealth]);

  /**
   * Capture performance snapshot
   */
  const capturePerformanceSnapshot = useCallback(async (): Promise<PerformanceSnapshot> => {
    const traceId = await startBITrace(
      'capture-performance-snapshot',
      'custom_query',
      { operation: 'performance_snapshot' },
      createMonitoringContext('performance_snapshot')
    );

    try {
      const snapshot = await measureQueryPerformance(
        async (): Promise<PerformanceSnapshot> => {
          // Simulate performance data collection
          await new Promise(resolve => setTimeout(resolve, 100));

          return {
            timestamp: new Date(),
            metrics: {
              responseTime: Math.random() * 1000 + 100,
              throughput: Math.random() * 1000 + 500,
              errorRate: Math.random() * 0.05,
              memoryUsage: Math.random() * 100,
              cpuUsage: Math.random() * 100,
            },
            activeUsers: Math.floor(Math.random() * 100 + 10),
            activeQueries: Math.floor(Math.random() * 50 + 5),
          };
        },
        'performance-snapshot-capture',
        traceId,
        'custom_query'
      );

      setPerformanceHistory(prev => {
        const updated = [...prev, snapshot];
        // Keep only last 100 snapshots
        return updated.slice(-100);
      });

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'performance_snapshot_captured' },
        { snapshot },
        createMonitoringContext('performance_snapshot')
      );

      await endBITrace(traceId, { 
        success: true, 
        responseTime: snapshot.metrics.responseTime,
        activeUsers: snapshot.activeUsers,
      });

      return snapshot;
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
      throw error;
    }
  }, [startBITrace, endBITrace, trackBIQuery, measureQueryPerformance, handleBIError, createMonitoringContext]);

  /**
   * Get performance trends for a time range
   */
  const getPerformanceTrends = useCallback((timeRange: { start: Date; end: Date }): PerformanceSnapshot[] => {
    return performanceHistory.filter(snapshot => 
      snapshot.timestamp >= timeRange.start && snapshot.timestamp <= timeRange.end
    );
  }, [performanceHistory]);

  /**
   * Set threshold for a metric
   */
  const setMetricThreshold = useCallback((
    metricId: string, 
    threshold: MonitoringMetric['threshold']
  ) => {
    setMetrics(prev => {
      const updated = new Map(prev);
      const metric = updated.get(metricId);
      if (metric) {
        updated.set(metricId, { ...metric, threshold });
      }
      return updated;
    });
  }, []);

  /**
   * Check all metrics against thresholds
   */
  const checkThresholds = useCallback(async (): Promise<Alert[]> => {
    const newAlerts: Alert[] = [];

    for (const [, metric] of metrics) {
      if (metric.threshold) {
        if (metric.value >= metric.threshold.critical) {
          const alertId = await createAlert({
            severity: 'critical',
            title: `Critical threshold exceeded: ${metric.name}`,
            message: `Metric ${metric.name} value ${metric.value} exceeds critical threshold ${metric.threshold.critical}`,
            source: 'threshold_monitor',
            metadata: { metric },
          });
          const alert = alerts.find(a => a.id === alertId);
          if (alert) newAlerts.push(alert);
        } else if (metric.value >= metric.threshold.warning) {
          const alertId = await createAlert({
            severity: 'warning',
            title: `Warning threshold exceeded: ${metric.name}`,
            message: `Metric ${metric.name} value ${metric.value} exceeds warning threshold ${metric.threshold.warning}`,
            source: 'threshold_monitor',
            metadata: { metric },
          });
          const alert = alerts.find(a => a.id === alertId);
          if (alert) newAlerts.push(alert);
        }
      }
    }

    return newAlerts;
  }, [metrics, alerts, createAlert]);

  /**
   * Clear all alerts
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Export metrics in specified format
   */
  const exportMetrics = useCallback(async (format: 'json' | 'csv'): Promise<string> => {
    const traceId = await startBITrace(
      `export-metrics:${format}`,
      'custom_query',
      { format, metricsCount: metrics.size },
      createMonitoringContext('export_metrics')
    );

    try {
      const metricsArray = Array.from(metrics.values());

      let exportData: string;
      if (format === 'json') {
        exportData = JSON.stringify(metricsArray, null, 2);
      } else {
        // CSV format
        const headers = ['id', 'name', 'type', 'value', 'timestamp', 'labels'];
        const rows = metricsArray.map(metric => [
          metric.id,
          metric.name,
          metric.type,
          metric.value.toString(),
          metric.timestamp.toISOString(),
          JSON.stringify(metric.labels),
        ]);
        exportData = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      }

      await endBITrace(traceId, { 
        success: true, 
        format, 
        metricsCount: metrics.size,
        exportSize: exportData.length,
      });

      return exportData;
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
      throw error;
    }
  }, [metrics, startBITrace, endBITrace, handleBIError, createMonitoringContext]);

  // Helper functions for monitoring
  const collectSystemMetrics = useCallback(async () => {
    const systemMetrics = [
      {
        id: 'system-cpu',
        name: 'CPU Usage',
        type: 'gauge' as const,
        value: Math.random() * 100,
        labels: { component: 'system' },
        threshold: { warning: 70, critical: 90 },
      },
      {
        id: 'system-memory',
        name: 'Memory Usage',
        type: 'gauge' as const,
        value: Math.random() * 100,
        labels: { component: 'system' },
        threshold: { warning: 80, critical: 95 },
      },
      {
        id: 'active-queries',
        name: 'Active Queries',
        type: 'gauge' as const,
        value: Math.floor(Math.random() * 50),
        labels: { component: 'database' },
        threshold: { warning: 30, critical: 45 },
      },
    ];

    for (const metric of systemMetrics) {
      await recordMetric(metric);
    }
  }, [recordMetric]);

  const performHealthChecks = useCallback(async () => {
    await getAllHealthChecks();
  }, [getAllHealthChecks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoringInterval.current) clearInterval(monitoringInterval.current);
      if (healthCheckInterval.current) clearInterval(healthCheckInterval.current);
      if (performanceInterval.current) clearInterval(performanceInterval.current);
    };
  }, []);

  return {
    // State
    metrics,
    alerts,
    healthChecks,
    performanceHistory,
    isMonitoring,
    
    // Monitoring Operations
    startMonitoring,
    stopMonitoring,
    recordMetric,
    
    // Alert Management
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    
    // Health Monitoring
    checkServiceHealth,
    getAllHealthChecks,
    
    // Performance Monitoring
    capturePerformanceSnapshot,
    getPerformanceTrends,
    
    // Threshold Management
    setMetricThreshold,
    checkThresholds,
    
    // Utility
    clearAlerts,
    exportMetrics,
  };
}