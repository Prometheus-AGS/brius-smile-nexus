# Real-Time Analytics Integration

Advanced patterns for implementing real-time analytics and streaming data visualization with the BI Agent using WebSockets, Server-Sent Events, and reactive state management.

## 🔄 Real-Time Store Architecture

### Streaming Data Store

```typescript
// src/stores/real-time-analytics-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

// Real-time data types
interface StreamingDataPoint {
  id: string;
  timestamp: Date;
  value: number;
  metric: string;
  source: string;
  metadata?: Record<string, unknown>;
}

interface MetricStream {
  id: string;
  name: string;
  description: string;
  unit: string;
  source: string;
  updateFrequency: number; // milliseconds
  retentionPeriod: number; // milliseconds
  isActive: boolean;
  lastUpdate: Date;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
  alertThresholds?: {
    warning: number;
    critical: number;
  };
}

interface AlertRule {
  id: string;
  metricId: string;
  name: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'change_rate';
  threshold: number;
  duration: number; // milliseconds
  isActive: boolean;
  lastTriggered?: Date;
  actions: Array<{
    type: 'notification' | 'webhook' | 'email';
    config: Record<string, unknown>;
  }>;
}

interface Alert {
  id: string;
  ruleId: string;
  metricId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// Connection management
interface ConnectionState {
  websocket: WebSocket | null;
  eventSource: EventSource | null;
  isConnected: boolean;
  connectionType: 'websocket' | 'sse' | 'polling' | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  lastHeartbeat: Date | null;
}

// Dashboard configuration
interface RealTimeDashboard {
  id: string;
  name: string;
  description?: string;
  layout: Array<{
    metricId: string;
    position: { x: number; y: number; w: number; h: number };
    chartType: 'line' | 'gauge' | 'number' | 'bar' | 'area';
    config: Record<string, unknown>;
  }>;
  refreshInterval: number;
  autoRefresh: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RealTimeAnalyticsState {
  // Core data
  dataPoints: StreamingDataPoint[];
  metricStreams: MetricStream[];
  alerts: Alert[];
  alertRules: AlertRule[];
  dashboards: RealTimeDashboard[];
  
  // Connection state
  connection: ConnectionState;
  
  // UI state
  activeDashboard: RealTimeDashboard | null;
  selectedMetrics: string[];
  timeWindow: number; // milliseconds
  isPaused: boolean;
  showAlerts: boolean;
  
  // Performance metrics
  dataPointsPerSecond: number;
  memoryUsage: number;
  connectionLatency: number;
  
  // Actions - Connection Management
  connect: (url: string, type: 'websocket' | 'sse') => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Actions - Data Management
  addDataPoint: (dataPoint: StreamingDataPoint) => void;
  addDataPoints: (dataPoints: StreamingDataPoint[]) => void;
  clearOldData: () => void;
  
  // Actions - Metric Management
  addMetricStream: (stream: Omit<MetricStream, 'id' | 'lastUpdate' | 'currentValue' | 'trend'>) => void;
  updateMetricStream: (id: string, updates: Partial<MetricStream>) => void;
  removeMetricStream: (id: string) => void;
  toggleMetricStream: (id: string) => void;
  
  // Actions - Alert Management
  addAlertRule: (rule: Omit<AlertRule, 'id'>) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  acknowledgeAlert: (id: string, acknowledgedBy: string) => void;
  resolveAlert: (id: string) => void;
  
  // Actions - Dashboard Management
  createDashboard: (dashboard: Omit<RealTimeDashboard, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDashboard: (id: string, updates: Partial<RealTimeDashboard>) => void;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string | null) => void;
  
  // Actions - UI Control
  pauseUpdates: () => void;
  resumeUpdates: () => void;
  setTimeWindow: (window: number) => void;
  toggleAlerts: () => void;
  
  // Actions - Performance
  updatePerformanceMetrics: () => void;
}

export const useRealTimeAnalyticsStore = create<RealTimeAnalyticsState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        dataPoints: [],
        metricStreams: [],
        alerts: [],
        alertRules: [],
        dashboards: [],
        
        connection: {
          websocket: null,
          eventSource: null,
          isConnected: false,
          connectionType: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5,
          reconnectDelay: 1000,
          lastHeartbeat: null,
        },
        
        activeDashboard: null,
        selectedMetrics: [],
        timeWindow: 300000, // 5 minutes
        isPaused: false,
        showAlerts: true,
        
        dataPointsPerSecond: 0,
        memoryUsage: 0,
        connectionLatency: 0,

        // Connection Management
        connect: async (url, type) => {
          try {
            // Disconnect existing connection
            get().disconnect();

            set((state) => {
              state.connection.connectionType = type;
              state.connection.reconnectAttempts = 0;
            });

            if (type === 'websocket') {
              const ws = new WebSocket(url);
              
              ws.onopen = () => {
                set((state) => {
                  state.connection.websocket = ws;
                  state.connection.isConnected = true;
                  state.connection.lastHeartbeat = new Date();
                });
              };

              ws.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  
                  if (data.type === 'dataPoint') {
                    get().addDataPoint({
                      ...data.payload,
                      timestamp: new Date(data.payload.timestamp),
                    });
                  } else if (data.type === 'heartbeat') {
                    set((state) => {
                      state.connection.lastHeartbeat = new Date();
                    });
                  }
                } catch (error) {
                  console.error('Error parsing WebSocket message:', error);
                }
              };

              ws.onclose = () => {
                set((state) => {
                  state.connection.isConnected = false;
                  state.connection.websocket = null;
                });
                
                // Auto-reconnect
                if (get().connection.reconnectAttempts < get().connection.maxReconnectAttempts) {
                  setTimeout(() => {
                    get().reconnect();
                  }, get().connection.reconnectDelay);
                }
              };

              ws.onerror = (error) => {
                console.error('WebSocket error:', error);
              };

            } else if (type === 'sse') {
              const eventSource = new EventSource(url);
              
              eventSource.onopen = () => {
                set((state) => {
                  state.connection.eventSource = eventSource;
                  state.connection.isConnected = true;
                  state.connection.lastHeartbeat = new Date();
                });
              };

              eventSource.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  get().addDataPoint({
                    ...data,
                    timestamp: new Date(data.timestamp),
                  });
                } catch (error) {
                  console.error('Error parsing SSE message:', error);
                }
              };

              eventSource.onerror = () => {
                set((state) => {
                  state.connection.isConnected = false;
                });
                
                // Auto-reconnect
                if (get().connection.reconnectAttempts < get().connection.maxReconnectAttempts) {
                  setTimeout(() => {
                    get().reconnect();
                  }, get().connection.reconnectDelay);
                }
              };
            }

          } catch (error) {
            console.error('Connection error:', error);
          }
        },

        disconnect: () => {
          const { connection } = get();
          
          if (connection.websocket) {
            connection.websocket.close();
          }
          
          if (connection.eventSource) {
            connection.eventSource.close();
          }
          
          set((state) => {
            state.connection.websocket = null;
            state.connection.eventSource = null;
            state.connection.isConnected = false;
            state.connection.connectionType = null;
          });
        },

        reconnect: async () => {
          const { connection } = get();
          
          set((state) => {
            state.connection.reconnectAttempts++;
            state.connection.reconnectDelay = Math.min(
              state.connection.reconnectDelay * 2,
              30000
            );
          });

          if (connection.connectionType) {
            // This would need the original URL - in practice, store it
            // await get().connect(originalUrl, connection.connectionType);
          }
        },

        // Data Management
        addDataPoint: (dataPoint) =>
          set((state) => {
            if (!state.isPaused) {
              state.dataPoints.push(dataPoint);
              
              // Update metric stream
              const stream = state.metricStreams.find(s => s.id === dataPoint.metric);
              if (stream) {
                const previousValue = stream.currentValue;
                stream.currentValue = dataPoint.value;
                stream.lastUpdate = dataPoint.timestamp;
                
                // Calculate trend
                if (dataPoint.value > previousValue) {
                  stream.trend = 'up';
                } else if (dataPoint.value < previousValue) {
                  stream.trend = 'down';
                } else {
                  stream.trend = 'stable';
                }
                
                // Check alert rules
                state.alertRules
                  .filter(rule => rule.metricId === dataPoint.metric && rule.isActive)
                  .forEach(rule => {
                    const shouldTrigger = checkAlertCondition(rule, dataPoint.value, previousValue);
                    if (shouldTrigger) {
                      const alert: Alert = {
                        id: `alert-${Date.now()}`,
                        ruleId: rule.id,
                        metricId: dataPoint.metric,
                        severity: dataPoint.value > (stream.alertThresholds?.critical ?? Infinity) ? 'critical' : 'warning',
                        message: `${stream.name} ${rule.condition.replace('_', ' ')} ${rule.threshold}`,
                        timestamp: new Date(),
                        acknowledged: false,
                        resolved: false,
                      };
                      state.alerts.push(alert);
                    }
                  });
              }
              
              // Clean old data periodically
              if (state.dataPoints.length % 100 === 0) {
                get().clearOldData();
              }
            }
          }),

        addDataPoints: (dataPoints) =>
          set((state) => {
            if (!state.isPaused) {
              dataPoints.forEach(dataPoint => {
                state.dataPoints.push(dataPoint);
              });
            }
          }),

        clearOldData: () =>
          set((state) => {
            const cutoff = new Date(Date.now() - state.timeWindow);
            state.dataPoints = state.dataPoints.filter(
              point => point.timestamp > cutoff
            );
          }),

        // Metric Management
        addMetricStream: (stream) =>
          set((state) => {
            const newStream: MetricStream = {
              ...stream,
              id: `metric-${Date.now()}`,
              lastUpdate: new Date(),
              currentValue: 0,
              trend: 'stable',
            };
            state.metricStreams.push(newStream);
          }),

        updateMetricStream: (id, updates) =>
          set((state) => {
            const index = state.metricStreams.findIndex(s => s.id === id);
            if (index !== -1) {
              Object.assign(state.metricStreams[index], updates);
            }
          }),

        removeMetricStream: (id) =>
          set((state) => {
            state.metricStreams = state.metricStreams.filter(s => s.id !== id);
            state.selectedMetrics = state.selectedMetrics.filter(m => m !== id);
          }),

        toggleMetricStream: (id) =>
          set((state) => {
            const stream = state.metricStreams.find(s => s.id === id);
            if (stream) {
              stream.isActive = !stream.isActive;
            }
          }),

        // Alert Management
        addAlertRule: (rule) =>
          set((state) => {
            const newRule: AlertRule = {
              ...rule,
              id: `rule-${Date.now()}`,
            };
            state.alertRules.push(newRule);
          }),

        updateAlertRule: (id, updates) =>
          set((state) => {
            const index = state.alertRules.findIndex(r => r.id === id);
            if (index !== -1) {
              Object.assign(state.alertRules[index], updates);
            }
          }),

        removeAlertRule: (id) =>
          set((state) => {
            state.alertRules = state.alertRules.filter(r => r.id !== id);
          }),

        acknowledgeAlert: (id, acknowledgedBy) =>
          set((state) => {
            const alert = state.alerts.find(a => a.id === id);
            if (alert) {
              alert.acknowledged = true;
              alert.acknowledgedBy = acknowledgedBy;
              alert.acknowledgedAt = new Date();
            }
          }),

        resolveAlert: (id) =>
          set((state) => {
            const alert = state.alerts.find(a => a.id === id);
            if (alert) {
              alert.resolved = true;
              alert.resolvedAt = new Date();
            }
          }),

        // Dashboard Management
        createDashboard: (dashboard) => {
          const dashboardId = `dashboard-${Date.now()}`;
          
          set((state) => {
            const newDashboard: RealTimeDashboard = {
              ...dashboard,
              id: dashboardId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            state.dashboards.push(newDashboard);
          });
          
          return dashboardId;
        },

        updateDashboard: (id, updates) =>
          set((state) => {
            const index = state.dashboards.findIndex(d => d.id === id);
            if (index !== -1) {
              Object.assign(state.dashboards[index], {
                ...updates,
                updatedAt: new Date(),
              });
            }
          }),

        deleteDashboard: (id) =>
          set((state) => {
            state.dashboards = state.dashboards.filter(d => d.id !== id);
            if (state.activeDashboard?.id === id) {
              state.activeDashboard = null;
            }
          }),

        setActiveDashboard: (id) =>
          set((state) => {
            state.activeDashboard = id ? state.dashboards.find(d => d.id === id) ?? null : null;
          }),

        // UI Control
        pauseUpdates: () =>
          set((state) => {
            state.isPaused = true;
          }),

        resumeUpdates: () =>
          set((state) => {
            state.isPaused = false;
          }),

        setTimeWindow: (window) =>
          set((state) => {
            state.timeWindow = window;
          }),

        toggleAlerts: () =>
          set((state) => {
            state.showAlerts = !state.showAlerts;
          }),

        // Performance
        updatePerformanceMetrics: () =>
          set((state) => {
            // Calculate data points per second
            const now = Date.now();
            const oneSecondAgo = now - 1000;
            const recentPoints = state.dataPoints.filter(
              point => point.timestamp.getTime() > oneSecondAgo
            );
            state.dataPointsPerSecond = recentPoints.length;
            
            // Estimate memory usage (rough calculation)
            state.memoryUsage = state.dataPoints.length * 200; // bytes per data point
          }),
      })),
      {
        name: 'real-time-analytics-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          metricStreams: state.metricStreams,
          alertRules: state.alertRules,
          dashboards: state.dashboards,
          timeWindow: state.timeWindow,
        }),
      }
    )
  )
);

// Helper function for alert conditions
function checkAlertCondition(rule: AlertRule, currentValue: number, previousValue: number): boolean {
  switch (rule.condition) {
    case 'greater_than':
      return currentValue > rule.threshold;
    case 'less_than':
      return currentValue < rule.threshold;
    case 'equals':
      return currentValue === rule.threshold;
    case 'not_equals':
      return currentValue !== rule.threshold;
    case 'change_rate':
      const changeRate = Math.abs((currentValue - previousValue) / previousValue) * 100;
      return changeRate > rule.threshold;
    default:
      return false;
  }
}

// Optimized selectors
export const useRealTimeData = (metricIds?: string[]) =>
  useRealTimeAnalyticsStore((state) => {
    if (!metricIds) return state.dataPoints;
    return state.dataPoints.filter(point => metricIds.includes(point.metric));
  });

export const useActiveAlerts = () =>
  useRealTimeAnalyticsStore((state) => 
    state.alerts.filter(alert => !alert.resolved)
  );

export const useConnectionStatus = () =>
  useRealTimeAnalyticsStore((state) => state.connection);

export const useMetricStreams = () =>
  useRealTimeAnalyticsStore((state) => state.metricStreams);
```

## 🔌 Real-Time Integration Hook

### Streaming Data Hook

```typescript
// src/hooks/use-real-time-analytics.ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRealTimeAnalyticsStore } from '../stores/real-time-analytics-store';

interface RealTimeConfig {
  url: string;
  connectionType: 'websocket' | 'sse' | 'polling';
  pollingInterval?: number;
  autoConnect?: boolean;
  maxRetries?: number;
}

export function useRealTimeAnalytics(config: RealTimeConfig) {
  const {
    dataPoints,
    metricStreams,
    alerts,
    connection,
    isPaused,
    timeWindow,
    connect,
    disconnect,
    addDataPoint,
    pauseUpdates,
    resumeUpdates,
    setTimeWindow,
    updatePerformanceMetrics,
  } = useRealTimeAnalyticsStore();

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-connect on mount
  useEffect(() => {
    if (config.autoConnect !== false) {
      handleConnect();
    }

    // Start performance monitoring
    performanceIntervalRef.current = setInterval(() => {
      updatePerformanceMetrics();
    }, 1000);

    return () => {
      handleDisconnect();
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
    };
  }, [config.url, config.connectionType]);

  // Connection management
  const handleConnect = useCallback(async () => {
    try {
      if (config.connectionType === 'polling') {
        // Implement polling
        const poll = async () => {
          try {
            const response = await fetch(`${config.url}/data`);
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                data.forEach(point => {
                  addDataPoint({
                    ...point,
                    timestamp: new Date(point.timestamp),
                  });
                });
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        };

        // Initial poll
        await poll();
        
        // Set up polling interval
        pollingIntervalRef.current = setInterval(poll, config.pollingInterval ?? 5000);
      } else {
        await connect(config.url, config.connectionType);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, [config, connect, addDataPoint]);

  const handleDisconnect = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    disconnect();
  }, [disconnect]);

  // Data filtering and aggregation
  const getFilteredData = useCallback((
    metricIds?: string[],
    timeRange?: number
  ) => {
    let filtered = dataPoints;
    
    if (metricIds && metricIds.length > 0) {
      filtered = filtered.filter(point => metricIds.includes(point.metric));
    }
    
    if (timeRange) {
      const cutoff = new Date(Date.now() - timeRange);
      filtered = filtered.filter(point => point.timestamp > cutoff);
    }
    
    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [dataPoints]);

  // Real-time aggregations
  const getAggregatedData = useCallback((
    metricId: string,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count',
    intervalMs: number = 60000 // 1 minute buckets
  ) => {
    const metricData = dataPoints.filter(point => point.metric === metricId);
    const buckets = new Map<number, number[]>();
    
    // Group data into time buckets
    metricData.forEach(point => {
      const bucketTime = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(point.value);
    });
    
    // Calculate aggregations
    return Array.from(buckets.entries()).map(([timestamp, values]) => {
      let aggregatedValue: number;
      
      switch (aggregation) {
        case 'avg':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        default:
          aggregatedValue = 0;
      }
      
      return {
        timestamp: new Date(timestamp),
        value: aggregatedValue,
        metric: metricId,
      };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [dataPoints]);

  // Statistical calculations
  const getStatistics = useCallback((metricId: string, timeRange?: number) => {
    const filtered = getFilteredData([metricId], timeRange);
    const values = filtered.map(point => point.value);
    
    if (values.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        stdDev: 0,
      };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev: Math.sqrt(variance),
    };
  }, [getFilteredData]);

  // Anomaly detection
  const detectAnomalies = useCallback((
    metricId: string,
    threshold: number = 2 // standard deviations
  ) => {
    const stats = getStatistics(metricId);
    const recentData = getFilteredData([metricId], 300000); // last 5 minutes
    
    return recentData.filter(point => {
      const zScore = Math.abs(point.value - stats.avg) / stats.stdDev;
      return zScore > threshold;
    });
  }, [getStatistics, getFilteredData]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const { dataPointsPerSecond, memoryUsage, connectionLatency } = useRealTimeAnalyticsStore.getState();
    
    return {
      dataPointsPerSecond,
      memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      connectionLatency: `${connectionLatency}ms`,
      totalDataPoints: dataPoints.length,
      activeStreams: metricStreams.filter(s => s.isActive).length,
      connectionStatus: connection.isConnected ? 'Connected' : 'Disconnected',
    };
  }, [dataPoints.length, metricStreams, connection.isConnected]);

  return {
    // Connection state
    isConnected: connection.isConnected,
    connectionType: connection.connectionType,
    
    // Data access
    dataPoints,
    metricStreams,
    alerts: alerts.filter(alert => !alert.resolved),
    
    // Connection control
    connect: handleConnect,
    disconnect: handleDisconnect,
    
    // Playback control
    isPaused,
    pauseUpdates,
    resumeUpdates,
    
    // Time window control
    timeWindow,
    setTimeWindow,
    
    // Data utilities
    getFilteredData,
    getAggregatedData,
    getStatistics,
    detectAnomalies,
    
    // Performance
    performanceMetrics,
  };
}
```

## 📊 Real-Time Components

### Live Dashboard Component

```typescript
// src/components/LiveDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useRealTimeAnalytics } from '../hooks/use-real-time-analytics';
import { 
  Activity, 
  Pause, 
  Play, 
  Settings, 
  AlertTriangle,
  Wifi,
  WifiOff,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface LiveDashboardProps {
  config: {
    url: string;
    connectionType: 'websocket' | 'sse' | 'polling';
    pollingInterval?: number;
  };
}

export function LiveDashboard({ config }: LiveDashboardProps) {
  const {
    isConnected,
    dataPoints,
    metricStreams,
    alerts,
    isPaused,
    timeWindow,
    connect,
    disconnect,
    pauseUpdates,
    resumeUpdates,
    setTimeWindow,
    getFilteredData,
    getStatistics,
    performanceMetrics,
  } = useRealTimeAnalytics(config);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-select first few metrics
  useEffect(() => {
    if (metricStreams.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics(metricStreams.slice(0, 3).map(m => m.id));
    }
  }, [metricStreams, selectedMetrics.length]);

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Live Analytics</h1>
            
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-