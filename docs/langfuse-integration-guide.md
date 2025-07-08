# Langfuse Integration Guide

## Overview

This guide provides comprehensive documentation for the client-side Langfuse integration implemented in the brius-smile-nexus React 19 application. The integration provides full observability for Business Intelligence (BI) assistant interactions with automatic trace creation, tool call monitoring, performance metrics, and error tracking.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [Core Components](#core-components)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

## Architecture Overview

The Langfuse integration follows a layered architecture:

```
┌─────────────────────────────────────────┐
│           React Components              │
│  (Dashboard, Query Builder, etc.)       │
├─────────────────────────────────────────┤
│           Custom Hooks                  │
│  (useBIAnalytics, useBIMonitoring)      │
├─────────────────────────────────────────┤
│         Observability Layer             │
│      (useBIObservability hook)          │
├─────────────────────────────────────────┤
│          Service Layer                  │
│  (LangfuseClient, ObservabilityService) │
├─────────────────────────────────────────┤
│        Configuration Layer              │
│      (Environment Variables)            │
└─────────────────────────────────────────┘
```

### Key Features

- **Automatic Trace Creation**: Every BI operation automatically creates Langfuse traces
- **Performance Monitoring**: Query execution times and system metrics tracking
- **Error Tracking**: Comprehensive error capture with context
- **Business Context**: Domain-specific metadata for dental manufacturing analytics
- **Real-time Monitoring**: Live system health and alert management
- **Query Analytics**: Visual query builder with execution tracking

## Setup and Configuration

### 1. Environment Variables

Create or update your `.env` file with the following Langfuse configuration:

```bash
# Langfuse Configuration
VITE_LANGFUSE_PUBLIC_KEY=pk_lf_your_public_key_here
VITE_LANGFUSE_SECRET_KEY=sk_lf_your_secret_key_here
VITE_LANGFUSE_BASE_URL=https://cloud.langfuse.com
VITE_LANGFUSE_ENABLED=true

# Optional Configuration
VITE_LANGFUSE_DEBUG=false
VITE_LANGFUSE_FLUSH_INTERVAL=2000
VITE_LANGFUSE_FLUSH_AT=20
VITE_LANGFUSE_REQUEST_TIMEOUT=10000
VITE_LANGFUSE_SDK_INTEGRATION=brius-smile-nexus-web
VITE_LANGFUSE_RELEASE=1.0.0
```

### 2. Installation

The integration uses the existing Langfuse Web SDK. Ensure it's installed:

```bash
yarn add langfuse
```

### 3. Configuration Validation

The system automatically validates configuration on startup using Zod schemas. Invalid configuration will prevent the application from starting with clear error messages.

## Core Components

### 1. Configuration Service (`src/lib/langfuse-config.ts`)

Handles environment variable validation and configuration management:

```typescript
import { getLangfuseConfig } from '@/lib/langfuse-config';

const config = getLangfuseConfig();
console.log('Langfuse enabled:', config.enabled);
```

### 2. Langfuse Client Service (`src/services/langfuse-client.ts`)

Singleton service managing the Langfuse client instance:

```typescript
import { LangfuseClientService } from '@/services/langfuse-client';

const client = LangfuseClientService.getInstance();
await client.initialize();
```

### 3. Observability Service (`src/services/observability-service.ts`)

High-level service providing observability operations:

```typescript
import { ObservabilityService } from '@/services/observability-service';

const service = ObservabilityService.getInstance();
const traceId = await service.startTrace('my-operation', { data: 'example' });
```

### 4. React Hooks

#### Main Langfuse Hook (`src/hooks/use-langfuse.ts`)

```typescript
import { useLangfuse, useBIObservability } from '@/hooks/use-langfuse';

function MyComponent() {
  const { isInitialized, error } = useLangfuse();
  const { startBITrace, trackBIQuery } = useBIObservability();
  
  // Use observability functions
}
```

#### BI Analytics Hook (`src/hooks/use-bi-analytics.ts`)

```typescript
import { useBIAnalytics } from '@/hooks/use-bi-analytics';

function AnalyticsComponent() {
  const { executeQuery, generateReport, analyzeData } = useBIAnalytics();
  
  // All operations automatically tracked with Langfuse
}
```

#### BI Monitoring Hook (`src/hooks/use-bi-monitoring.ts`)

```typescript
import { useBIMonitoring } from '@/hooks/use-bi-monitoring';

function MonitoringComponent() {
  const { 
    startMonitoring, 
    metrics, 
    alerts, 
    createAlert 
  } = useBIMonitoring();
  
  // Real-time monitoring with Langfuse tracking
}
```

### 5. Enhanced Components

#### BI Dashboard with Tracking (`src/components/bi/bi-dashboard-with-tracking.tsx`)

```typescript
import { BIDashboardWithTracking } from '@/components/bi/bi-dashboard-with-tracking';

function App() {
  return (
    <BIDashboardWithTracking
      dashboardId="main-dashboard"
      title="Business Intelligence Dashboard"
      autoRefresh={true}
    />
  );
}
```

#### Query Builder with Tracking (`src/components/bi/bi-query-builder-with-tracking.tsx`)

```typescript
import { BIQueryBuilderWithTracking } from '@/components/bi/bi-query-builder-with-tracking';

function QueryPage() {
  return (
    <BIQueryBuilderWithTracking
      availableDataSources={['orders', 'customers', 'products']}
      onQueryExecute={(result) => console.log('Query result:', result)}
    />
  );
}
```

## Usage Examples

### 1. Basic BI Query Tracking

```typescript
import { useBIObservability } from '@/hooks/use-langfuse';

function useCustomQuery() {
  const { startBITrace, endBITrace, trackBIQuery } = useBIObservability();
  
  const executeCustomQuery = async (query: string) => {
    const traceId = await startBITrace(
      'custom-query-execution',
      'custom_query',
      { query },
      {
        queryType: 'custom_query',
        dataSource: 'orders',
        businessContext: {
          department: 'sales',
          useCase: 'revenue_analysis',
          priority: 'high',
        },
      }
    );
    
    try {
      const result = await executeQuery(query);
      
      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'query_executed', rowCount: result.length },
        { result },
        { queryType: 'custom_query', dataSource: 'orders' }
      );
      
      await endBITrace(traceId, { success: true, rowCount: result.length });
      return result;
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
      throw error;
    }
  };
  
  return { executeCustomQuery };
}
```

### 2. Enhanced Mastra Chat Integration

```typescript
import { useMastraChatWithLangfuse } from '@/hooks/use-mastra-chat-with-langfuse';

function ChatComponent() {
  const {
    messages,
    sendMessage,
    isLoading,
    error,
    // Langfuse-specific features
    conversationMetrics,
    exportConversation,
  } = useMastraChatWithLangfuse({
    sessionId: 'user-session-123',
    businessContext: {
      department: 'operations',
      useCase: 'dental_manufacturing_analysis',
      priority: 'high',
    },
  });
  
  const handleSendMessage = async (content: string) => {
    await sendMessage(content, {
      messageType: 'user_query',
      expectedResponseType: 'analysis_result',
    });
  };
  
  return (
    <div>
      {/* Chat UI */}
      <button onClick={() => exportConversation('json')}>
        Export Conversation
      </button>
    </div>
  );
}
```

### 3. Real-time Monitoring Setup

```typescript
import { useBIMonitoring } from '@/hooks/use-bi-monitoring';

function MonitoringDashboard() {
  const {
    startMonitoring,
    stopMonitoring,
    metrics,
    alerts,
    isMonitoring,
    recordMetric,
    createAlert,
  } = useBIMonitoring();
  
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);
  
  const handleCustomMetric = async () => {
    await recordMetric({
      id: 'custom-metric-1',
      name: 'Custom Business Metric',
      type: 'gauge',
      value: 42,
      labels: { department: 'manufacturing', type: 'efficiency' },
      threshold: { warning: 30, critical: 20 },
    });
  };
  
  return (
    <div>
      <div>Monitoring Status: {isMonitoring ? 'Active' : 'Inactive'}</div>
      <div>Active Metrics: {metrics.size}</div>
      <div>Unacknowledged Alerts: {alerts.filter(a => !a.acknowledged).length}</div>
    </div>
  );
}
```

## Best Practices

### 1. Trace Naming Conventions

Use descriptive, hierarchical trace names:

```typescript
// Good
await startBITrace('dashboard-load:main-dashboard', 'dashboard_query', ...);
await startBITrace('query-execution:revenue-analysis', 'analytical_query', ...);
await startBITrace('report-generation:monthly-summary', 'report_generation', ...);

// Avoid
await startBITrace('operation', 'custom_query', ...);
await startBITrace('query', 'dashboard_query', ...);
```

### 2. Business Context

Always provide meaningful business context:

```typescript
const context: BIObservabilityContext = {
  queryType: 'analytical_query',
  dataSource: 'orders',
  businessContext: {
    department: 'sales',           // Which department
    useCase: 'revenue_analysis',   // What business purpose
    priority: 'high',             // Business priority
  },
  filters: {
    dateRange: '2024-01-01_to_2024-12-31',
    customerSegment: 'enterprise',
  },
};
```

### 3. Error Handling

Implement comprehensive error tracking:

```typescript
try {
  // BI operation
} catch (error) {
  await handleBIError(error as Error, traceId, {
    queryType: 'analytical_query',
    severity: 'high',
    context: {
      operation: 'revenue_analysis',
      dataSource: 'orders',
      userAction: 'dashboard_refresh',
    },
  });
  throw error; // Re-throw for component error handling
}
```

### 4. Performance Monitoring

Use performance measurement for critical operations:

```typescript
const result = await measureQueryPerformance(
  async () => {
    return await executeComplexQuery(params);
  },
  'complex-revenue-analysis',
  traceId,
  'analytical_query'
);
```

### 5. Memory Management

Properly clean up resources:

```typescript
useEffect(() => {
  const cleanup = async () => {
    if (isMonitoring) {
      await stopMonitoring();
    }
  };
  
  return cleanup;
}, [isMonitoring, stopMonitoring]);
```

## Troubleshooting

### Common Issues

#### 1. Configuration Errors

**Problem**: Application fails to start with configuration errors.

**Solution**: Check environment variables and ensure all required values are set:

```bash
# Check if variables are loaded
echo $VITE_LANGFUSE_PUBLIC_KEY
echo $VITE_LANGFUSE_SECRET_KEY
echo $VITE_LANGFUSE_BASE_URL
```

#### 2. Initialization Failures

**Problem**: Langfuse client fails to initialize.

**Solution**: Check network connectivity and API credentials:

```typescript
import { useLangfuse } from '@/hooks/use-langfuse';

function DebugComponent() {
  const { isInitialized, error, initializationStatus } = useLangfuse();
  
  if (error) {
    console.error('Langfuse initialization error:', error);
  }
  
  return <div>Status: {initializationStatus}</div>;
}
```

#### 3. Missing Traces

**Problem**: Traces not appearing in Langfuse dashboard.

**Solution**: 
1. Check if `VITE_LANGFUSE_ENABLED=true`
2. Verify API credentials
3. Check network requests in browser dev tools
4. Ensure proper trace completion with `endBITrace()`

#### 4. Performance Issues

**Problem**: Application slowdown due to excessive tracking.

**Solution**: 
1. Increase flush interval: `VITE_LANGFUSE_FLUSH_INTERVAL=5000`
2. Increase batch size: `VITE_LANGFUSE_FLUSH_AT=50`
3. Disable debug mode: `VITE_LANGFUSE_DEBUG=false`

### Debug Mode

Enable debug mode for detailed logging:

```bash
VITE_LANGFUSE_DEBUG=true
```

This will log all Langfuse operations to the browser console.

### Health Checks

Use the built-in health check functionality:

```typescript
import { LangfuseClientService } from '@/services/langfuse-client';

const client = LangfuseClientService.getInstance();
const isHealthy = await client.healthCheck();
console.log('Langfuse health:', isHealthy);
```

## API Reference

### Types

#### BIObservabilityContext
```typescript
interface BIObservabilityContext {
  queryType: BIQueryType;
  dataSource: string;
  businessContext: {
    department: string;
    useCase: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  filters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

#### BIQueryType
```typescript
type BIQueryType = 
  | 'dashboard_query'
  | 'analytical_query' 
  | 'report_generation'
  | 'data_export'
  | 'metric_calculation'
  | 'custom_query';
```

### Hook APIs

#### useBIObservability()

```typescript
interface UseBIObservabilityReturn {
  // Trace Management
  startBITrace: (name: string, type: BIQueryType, input: unknown, context: BIObservabilityContext) => Promise<string>;
  endBITrace: (traceId: string, output: unknown) => Promise<void>;
  
  // Query Tracking
  trackBIQuery: (traceId: string, type: BIQueryType, input: unknown, output: unknown, context: BIObservabilityContext) => Promise<void>;
  
  // Performance Monitoring
  measureQueryPerformance: <T>(operation: () => Promise<T>, name: string, traceId: string, type: BIQueryType) => Promise<T>;
  
  // Error Handling
  handleBIError: (error: Error, traceId?: string, context?: Partial<BIObservabilityContext>) => Promise<void>;
  
  // Utility
  isEnabled: boolean;
  getTraceUrl: (traceId: string) => string;
}
```

#### useBIAnalytics()

```typescript
interface UseBIAnalyticsReturn {
  // Query Operations
  executeQuery: (config: QueryConfig) => Promise<QueryResult>;
  executeBatch: (queries: QueryConfig[]) => Promise<BatchResult>;
  
  // Data Analysis
  analyzeData: (data: unknown[], analysisType: AnalysisType) => Promise<AnalysisResult>;
  
  // Report Generation
  generateReport: (config: ReportConfig) => Promise<ReportResult>;
  
  // Dashboard Operations
  loadDashboard: (dashboardId: string) => Promise<DashboardConfig>;
  refreshDashboard: (dashboardId: string) => Promise<void>;
}
```

#### useBIMonitoring()

```typescript
interface UseBIMonitoringReturn {
  // State
  metrics: Map<string, MonitoringMetric>;
  alerts: Alert[];
  healthChecks: Map<string, HealthCheck>;
  performanceHistory: PerformanceSnapshot[];
  isMonitoring: boolean;
  
  // Operations
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordMetric: (metric: Omit<MonitoringMetric, 'timestamp'>) => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => Promise<string>;
  
  // Utility
  exportMetrics: (format: 'json' | 'csv') => Promise<string>;
}
```

### Service APIs

#### LangfuseClientService

```typescript
class LangfuseClientService {
  static getInstance(): LangfuseClientService;
  
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
  async healthCheck(): Promise<boolean>;
  
  createTrace(params: TraceParams): LangfuseTraceClient;
  flush(): Promise<void>;
}
```

#### ObservabilityService

```typescript
class ObservabilityService {
  static getInstance(): ObservabilityService;
  
  async startTrace(name: string, input?: unknown, metadata?: Record<string, unknown>): Promise<string>;
  async endTrace(traceId: string, output?: unknown): Promise<void>;
  async addEvent(traceId: string, name: string, data?: unknown): Promise<void>;
  async recordError(error: Error, traceId?: string, context?: Record<string, unknown>): Promise<void>;
}
```

## Migration Guide

### From Basic Mastra Chat to Enhanced Version

1. Replace the import:
```typescript
// Before
import { useMastraChat } from '@/hooks/use-mastra-chat';

// After
import { useMastraChatWithLangfuse } from '@/hooks/use-mastra-chat-with-langfuse';
```

2. Update the hook usage:
```typescript
// Before
const { messages, sendMessage } = useMastraChat();

// After
const { 
  messages, 
  sendMessage,
  conversationMetrics,
  exportConversation 
} = useMastraChatWithLangfuse({
  sessionId: 'unique-session-id',
  businessContext: {
    department: 'your-department',
    useCase: 'your-use-case',
    priority: 'medium',
  },
});
```

### Adding Tracking to Existing Components

1. Import the observability hook:
```typescript
import { useBIObservability } from '@/hooks/use-langfuse';
```

2. Wrap operations with tracing:
```typescript
const { startBITrace, endBITrace, trackBIQuery } = useBIObservability();

const handleOperation = async () => {
  const traceId = await startBITrace('operation-name', 'custom_query', input, context);
  try {
    const result = await performOperation();
    await endBITrace(traceId, result);
    return result;
  } catch (error) {
    await handleBIError(error as Error, traceId);
    throw error;
  }
};
```

## Performance Considerations

### Optimization Settings

For production environments, consider these optimizations:

```bash
# Reduce tracking frequency
VITE_LANGFUSE_FLUSH_INTERVAL=5000
VITE_LANGFUSE_FLUSH_AT=50

# Disable debug logging
VITE_LANGFUSE_DEBUG=false

# Optimize request timeout
VITE_LANGFUSE_REQUEST_TIMEOUT=5000
```

### Memory Management

The integration automatically manages memory through:
- Automatic trace cleanup after completion
- Batched data transmission
- Configurable flush intervals
- Proper cleanup in React hooks

### Network Optimization

- Traces are batched and sent periodically
- Failed requests are retried with exponential backoff
- Network errors don't affect application functionality
- Offline support with local queuing

## Security Considerations

### API Key Management

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Rotate keys regularly
- Use different keys for different environments

### Data Privacy

- The integration only tracks operational metadata
- No sensitive user data is transmitted to Langfuse
- All data transmission uses HTTPS
- Configure data retention policies in Langfuse dashboard

### Access Control

- Limit Langfuse dashboard access to authorized personnel
- Use role-based access control in Langfuse
- Monitor API key usage and access patterns

## Support and Resources

### Documentation Links

- [Langfuse Official Documentation](https://langfuse.com/docs)
- [Langfuse Web SDK Reference](https://langfuse.com/docs/sdk/typescript/guide)
- [React 19 Documentation](https://react.dev)

### Getting Help

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify Langfuse dashboard for trace data
4. Check network requests in browser dev tools

### Contributing

When contributing to the Langfuse integration:

1. Follow TypeScript strict mode requirements
2. Add comprehensive error handling
3. Include proper JSDoc comments
4. Write unit tests for new functionality
5. Update this documentation for any changes

---

This integration provides comprehensive observability for your BI operations while maintaining high performance and reliability. The modular architecture allows for easy extension and customization based on your specific business needs.