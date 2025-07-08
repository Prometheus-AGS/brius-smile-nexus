/**
 * Business Intelligence Dashboard Component with Langfuse Tracking
 * 
 * Enhanced dashboard component that automatically tracks all BI interactions
 * with comprehensive Langfuse observability integration.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useBIAnalytics } from '@/hooks/use-bi-analytics';
import { useBIMonitoring } from '@/hooks/use-bi-monitoring';
import { useBIObservability } from '@/hooks/use-langfuse';
import type { BIObservabilityContext } from '@/types/langfuse';

// ============================================================================
// Component Types
// ============================================================================

interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  description: string;
  category: 'performance' | 'business' | 'operational';
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'metric' | 'alert';
  data: unknown;
  refreshInterval?: number;
}

interface BIDashboardProps {
  dashboardId: string;
  title?: string;
  description?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const BIDashboardWithTracking: React.FC<BIDashboardProps> = React.memo(({
  dashboardId,
  title = 'Business Intelligence Dashboard',
  description = 'Comprehensive view of business metrics and analytics',
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
}) => {
  // Hooks
  const {
    loadDashboard,
    refreshDashboard,
    executeQuery,
    generateReport,
  } = useBIAnalytics();

  const {
    metrics,
    alerts,
    healthChecks,
    performanceHistory,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  } = useBIMonitoring();

  const {
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError,
  } = useBIObservability();

  // State
  const [dashboardData, setDashboardData] = useState<{
    metrics: DashboardMetric[];
    widgets: DashboardWidget[];
    lastUpdated: Date;
  } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create dashboard context for observability
   */
  const createDashboardContext = useCallback((
    operation: string
  ): BIObservabilityContext => ({
    queryType: 'dashboard_query',
    dataSource: 'dashboard_system',
    businessContext: {
      department: 'analytics',
      useCase: operation,
      priority: 'medium',
    },
    filters: {
      dashboardId,
      activeTab,
    },
  }), [dashboardId, activeTab]);

  /**
   * Load dashboard data with tracking
   */
  const loadDashboardData = useCallback(async () => {
    const traceId = await startBITrace(
      `load-dashboard:${dashboardId}`,
      'dashboard_query',
      { dashboardId, operation: 'load' },
      createDashboardContext('load_dashboard')
    );

    try {
      setIsRefreshing(true);
      setIsLoading(true);
      setError(null);

      // Load dashboard configuration and data
      const dashboardConfig = await loadDashboard(dashboardId);

      // Generate sample metrics
      const sampleMetrics: DashboardMetric[] = [
        {
          id: 'total-revenue',
          title: 'Total Revenue',
          value: '$2,847,392',
          change: 12.5,
          changeType: 'increase',
          description: 'Monthly recurring revenue',
          category: 'business',
        },
        {
          id: 'active-users',
          title: 'Active Users',
          value: 18742,
          change: -2.3,
          changeType: 'decrease',
          description: 'Daily active users',
          category: 'operational',
        },
        {
          id: 'query-performance',
          title: 'Avg Query Time',
          value: '247ms',
          change: 8.1,
          changeType: 'decrease',
          description: 'Average database query response time',
          category: 'performance',
        },
        {
          id: 'error-rate',
          title: 'Error Rate',
          value: '0.12%',
          change: -15.7,
          changeType: 'decrease',
          description: 'Application error rate',
          category: 'performance',
        },
      ];

      // Generate sample widgets
      const sampleWidgets: DashboardWidget[] = [
        {
          id: 'revenue-chart',
          title: 'Revenue Trend',
          type: 'chart',
          data: { chartType: 'line', dataPoints: 30 },
          refreshInterval: 60000,
        },
        {
          id: 'user-activity',
          title: 'User Activity',
          type: 'table',
          data: { rows: 10, columns: 5 },
          refreshInterval: 30000,
        },
        {
          id: 'system-alerts',
          title: 'System Alerts',
          type: 'alert',
          data: { alertCount: alerts.length },
        },
      ];

      const newDashboardData = {
        metrics: sampleMetrics,
        widgets: sampleWidgets,
        lastUpdated: new Date(),
      };

      setDashboardData(newDashboardData);

      await trackBIQuery(
        traceId,
        'dashboard_query',
        { 
          operation: 'dashboard_loaded',
          dashboardId,
          metricsCount: sampleMetrics.length,
          widgetsCount: sampleWidgets.length,
        },
        { dashboardData: newDashboardData },
        createDashboardContext('load_dashboard')
      );

      await endBITrace(traceId, { 
        success: true, 
        dashboardId,
        metricsLoaded: sampleMetrics.length,
        widgetsLoaded: sampleWidgets.length,
      });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'dashboard_query',
        severity: 'high',
      });
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [
    dashboardId,
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError,
    loadDashboard,
    alerts.length,
    createDashboardContext,
  ]);

  /**
   * Refresh dashboard data
   */
  const handleRefresh = useCallback(async () => {
    const traceId = await startBITrace(
      `refresh-dashboard:${dashboardId}`,
      'dashboard_query',
      { dashboardId, operation: 'refresh' },
      createDashboardContext('refresh_dashboard')
    );

    try {
      await refreshDashboard(dashboardId);
      await loadDashboardData();

      await endBITrace(traceId, { success: true, dashboardId });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'dashboard_query',
        severity: 'medium',
      });
    }
  }, [dashboardId, refreshDashboard, loadDashboardData, startBITrace, endBITrace, handleBIError, createDashboardContext]);

  /**
   * Handle tab change with tracking
   */
  const handleTabChange = useCallback(async (newTab: string) => {
    const traceId = await startBITrace(
      `dashboard-tab-change:${newTab}`,
      'dashboard_query',
      { dashboardId, fromTab: activeTab, toTab: newTab },
      createDashboardContext('tab_change')
    );

    try {
      setActiveTab(newTab);

      await trackBIQuery(
        traceId,
        'dashboard_query',
        { operation: 'tab_changed', fromTab: activeTab, toTab: newTab },
        { success: true },
        createDashboardContext('tab_change')
      );

      await endBITrace(traceId, { success: true, activeTab: newTab });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'dashboard_query',
        severity: 'low',
      });
    }
  }, [activeTab, dashboardId, startBITrace, endBITrace, trackBIQuery, handleBIError, createDashboardContext]);

  /**
   * Generate dashboard report
   */
  const handleGenerateReport = useCallback(async () => {
    const traceId = await startBITrace(
      `generate-dashboard-report:${dashboardId}`,
      'report_generation',
      { dashboardId, reportType: 'dashboard_summary' },
      createDashboardContext('generate_report')
    );

    try {
      const reportConfig = {
        type: 'summary' as const,
        dataSource: 'dashboard_system',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date(),
        },
        dimensions: ['metrics', 'alerts', 'performance'],
        format: 'json' as const,
        metrics: ['total_revenue', 'active_users', 'query_performance', 'error_rate'],
        metadata: {
          dashboardId,
          metrics: dashboardData?.metrics || [],
          alerts: alerts.filter(alert => !alert.acknowledged),
          performanceSummary: performanceHistory.slice(-10),
          generatedAt: new Date(),
        },
      };

      await generateReport(reportConfig);

      await endBITrace(traceId, { 
        success: true, 
        dashboardId,
        reportGenerated: true,
      });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'report_generation',
        severity: 'medium',
      });
    }
  }, [
    dashboardId,
    dashboardData,
    alerts,
    performanceHistory,
    generateReport,
    startBITrace,
    endBITrace,
    handleBIError,
    createDashboardContext,
  ]);

  // Computed values
  const unacknowledgedAlerts = useMemo(() => 
    alerts.filter(alert => !alert.acknowledged),
    [alerts]
  );

  const criticalAlerts = useMemo(() => 
    unacknowledgedAlerts.filter(alert => alert.severity === 'critical'),
    [unacknowledgedAlerts]
  );

  const healthyServices = useMemo(() => 
    Array.from(healthChecks.values()).filter(check => check.status === 'healthy').length,
    [healthChecks]
  );

  const totalServices = useMemo(() => 
    healthChecks.size,
    [healthChecks]
  );

  // Effects
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, handleRefresh]);

  // Render helpers
  const renderMetricCard = (metric: DashboardMetric) => (
    <Card key={metric.id} className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </CardTitle>
          <Badge 
            variant={metric.category === 'performance' ? 'default' : 
                    metric.category === 'business' ? 'secondary' : 'outline'}
          >
            {metric.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          <span className={`inline-flex items-center ${
            metric.changeType === 'increase' ? 'text-green-600' :
            metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {metric.changeType === 'increase' ? '↗' : 
             metric.changeType === 'decrease' ? '↘' : '→'}
            {Math.abs(metric.change)}%
          </span>
          <span className="ml-1">{metric.description}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderWidget = (widget: DashboardWidget) => (
    <Card key={widget.id}>
      <CardHeader>
        <CardTitle className="text-lg">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          {widget.type === 'chart' && '📊 Chart Widget'}
          {widget.type === 'table' && '📋 Table Widget'}
          {widget.type === 'alert' && `🚨 ${alerts.length} Alerts`}
          {widget.type === 'metric' && '📈 Metric Widget'}
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Alert className="m-4">
        <AlertDescription>
          Failed to load dashboard: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateReport}
            disabled={isLoading}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="text-sm">
            Services: {healthyServices}/{totalServices} healthy
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="text-sm">
            Alerts: {criticalAlerts.length} critical, {unacknowledgedAlerts.length} total
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {dashboardData?.lastUpdated.toLocaleTimeString() || 'Never'}
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <strong>{criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''}</strong>
            {' '}require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardData?.metrics.map(renderMetricCard)}
          </div>

          {/* Widgets */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboardData?.widgets.map(renderWidget)}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>Real-time system performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(metrics.values()).map(metric => (
                  <div key={metric.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {Object.entries(metric.labels).map(([key, value]) => 
                          `${key}: ${value}`
                        ).join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{metric.value}</div>
                      <div className="text-xs text-muted-foreground">{metric.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>System alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No active alerts
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Badge 
                        variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'warning' ? 'default' :
                          alert.severity === 'error' ? 'destructive' : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleString()} • {alert.source}
                        </div>
                      </div>
                      {alert.acknowledged && (
                        <Badge variant="outline">Acknowledged</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>System performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceHistory.slice(-5).map((snapshot, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{snapshot.timestamp.toLocaleTimeString()}</span>
                      <span>{snapshot.activeUsers} active users</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between">
                          <span>Response Time</span>
                          <span>{Math.round(snapshot.metrics.responseTime)}ms</span>
                        </div>
                        <Progress 
                          value={Math.min(snapshot.metrics.responseTime / 10, 100)} 
                          className="h-1"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span>CPU Usage</span>
                          <span>{Math.round(snapshot.metrics.cpuUsage)}%</span>
                        </div>
                        <Progress 
                          value={snapshot.metrics.cpuUsage} 
                          className="h-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

BIDashboardWithTracking.displayName = 'BIDashboardWithTracking';