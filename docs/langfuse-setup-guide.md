# Langfuse Setup and Configuration Guide

## Quick Start

This guide will help you set up the Langfuse integration in your React 19 + Vite 7 application in under 10 minutes.

## Prerequisites

- Node.js 18+ and Yarn package manager
- React 19 application with Vite 7
- Langfuse account (free at [langfuse.com](https://langfuse.com))

## Step 1: Langfuse Account Setup

### 1.1 Create Langfuse Account

1. Visit [langfuse.com](https://langfuse.com) and sign up
2. Create a new project for your application
3. Navigate to **Settings > API Keys**
4. Generate a new API key pair (Public Key and Secret Key)

### 1.2 Configure Project Settings

In your Langfuse dashboard:

1. **Project Settings**:
   - Set project name: "Brius Smile Nexus"
   - Set description: "Dental Manufacturing BI Analytics"
   - Configure data retention policy (recommended: 90 days)

2. **Team Settings**:
   - Invite team members if needed
   - Set appropriate role permissions

## Step 2: Environment Configuration

### 2.1 Update Environment Variables

Create or update your `.env` file in the project root:

```bash
# Langfuse Configuration (Required)
VITE_LANGFUSE_PUBLIC_KEY=pk_lf_your_public_key_here
VITE_LANGFUSE_SECRET_KEY=sk_lf_your_secret_key_here
VITE_LANGFUSE_BASE_URL=https://cloud.langfuse.com
VITE_LANGFUSE_ENABLED=true

# Optional Configuration (with defaults)
VITE_LANGFUSE_DEBUG=false
VITE_LANGFUSE_FLUSH_INTERVAL=2000
VITE_LANGFUSE_FLUSH_AT=20
VITE_LANGFUSE_REQUEST_TIMEOUT=10000
VITE_LANGFUSE_SDK_INTEGRATION=brius-smile-nexus-web
VITE_LANGFUSE_RELEASE=1.0.0
```

### 2.2 Environment-Specific Configuration

#### Development Environment (`.env.development`)
```bash
VITE_LANGFUSE_DEBUG=true
VITE_LANGFUSE_FLUSH_INTERVAL=1000
VITE_LANGFUSE_ENABLED=true
```

#### Production Environment (`.env.production`)
```bash
VITE_LANGFUSE_DEBUG=false
VITE_LANGFUSE_FLUSH_INTERVAL=5000
VITE_LANGFUSE_FLUSH_AT=50
VITE_LANGFUSE_ENABLED=true
```

#### Testing Environment (`.env.test`)
```bash
VITE_LANGFUSE_ENABLED=false
VITE_LANGFUSE_DEBUG=false
```

### 2.3 Update .env.example

Update your `.env.example` file to include the new variables:

```bash
# Langfuse Observability Platform
VITE_LANGFUSE_PUBLIC_KEY=pk_lf_your_public_key_here
VITE_LANGFUSE_SECRET_KEY=sk_lf_your_secret_key_here
VITE_LANGFUSE_BASE_URL=https://cloud.langfuse.com
VITE_LANGFUSE_ENABLED=true
VITE_LANGFUSE_DEBUG=false
VITE_LANGFUSE_FLUSH_INTERVAL=2000
VITE_LANGFUSE_FLUSH_AT=20
VITE_LANGFUSE_REQUEST_TIMEOUT=10000
VITE_LANGFUSE_SDK_INTEGRATION=brius-smile-nexus-web
VITE_LANGFUSE_RELEASE=1.0.0
```

## Step 3: Package Installation

The Langfuse Web SDK should already be installed. If not, install it:

```bash
yarn add langfuse
```

Verify the installation:

```bash
yarn list langfuse
```

## Step 4: Application Integration

### 4.1 Basic Integration

Add the Langfuse initialization to your main App component:

```typescript
// src/App.tsx
import React from 'react';
import { useLangfuse } from '@/hooks/use-langfuse';

function App() {
  const { isInitialized, error, initializationStatus } = useLangfuse();

  if (error) {
    console.error('Langfuse initialization failed:', error);
    // Continue with app functionality even if Langfuse fails
  }

  return (
    <div className="App">
      {/* Your existing app content */}
      
      {/* Optional: Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white text-xs rounded">
          Langfuse: {initializationStatus}
        </div>
      )}
    </div>
  );
}

export default App;
```

### 4.2 Enhanced Mastra Chat Integration

Replace your existing Mastra chat usage:

```typescript
// Before
import { useMastraChat } from '@/hooks/use-mastra-chat';

function ChatComponent() {
  const { messages, sendMessage, isLoading } = useMastraChat();
  // ...
}

// After
import { useMastraChatWithLangfuse } from '@/hooks/use-mastra-chat-with-langfuse';

function ChatComponent() {
  const { 
    messages, 
    sendMessage, 
    isLoading,
    conversationMetrics,
    exportConversation 
  } = useMastraChatWithLangfuse({
    sessionId: `session-${Date.now()}`,
    businessContext: {
      department: 'manufacturing',
      useCase: 'dental_analytics',
      priority: 'medium',
    },
  });
  
  // Enhanced functionality now available
  const handleExportConversation = async () => {
    const data = await exportConversation('json');
    console.log('Conversation data:', data);
  };
  
  return (
    <div>
      {/* Your existing chat UI */}
      <button onClick={handleExportConversation}>
        Export Conversation
      </button>
    </div>
  );
}
```

### 4.3 BI Dashboard Integration

Add the enhanced dashboard component:

```typescript
// src/pages/DashboardPage.tsx
import React from 'react';
import { BIDashboardWithTracking } from '@/components/bi/bi-dashboard-with-tracking';

function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <BIDashboardWithTracking
        dashboardId="main-dashboard"
        title="Manufacturing Analytics Dashboard"
        description="Real-time insights into dental manufacturing operations"
        autoRefresh={true}
        refreshInterval={30000}
      />
    </div>
  );
}

export default DashboardPage;
```

### 4.4 Query Builder Integration

Add the query builder component:

```typescript
// src/pages/QueryBuilderPage.tsx
import React from 'react';
import { BIQueryBuilderWithTracking } from '@/components/bi/bi-query-builder-with-tracking';

function QueryBuilderPage() {
  const handleQueryExecute = (result) => {
    console.log('Query executed:', result);
    // Handle query results
  };

  return (
    <div className="container mx-auto py-6">
      <BIQueryBuilderWithTracking
        availableDataSources={['orders', 'customers', 'products', 'manufacturing']}
        onQueryExecute={handleQueryExecute}
      />
    </div>
  );
}

export default QueryBuilderPage;
```

## Step 5: Verification and Testing

### 5.1 Development Verification

1. Start your development server:
```bash
yarn dev
```

2. Open browser console and look for Langfuse initialization messages
3. Navigate to your application and perform some BI operations
4. Check the Langfuse dashboard for incoming traces

### 5.2 Configuration Test

Create a simple test component to verify the integration:

```typescript
// src/components/LangfuseTest.tsx
import React, { useEffect } from 'react';
import { useBIObservability } from '@/hooks/use-langfuse';

export function LangfuseTest() {
  const { startBITrace, endBITrace, isEnabled } = useBIObservability();

  useEffect(() => {
    const testLangfuse = async () => {
      if (!isEnabled) {
        console.log('Langfuse is disabled');
        return;
      }

      try {
        const traceId = await startBITrace(
          'test-trace',
          'custom_query',
          { test: 'data' },
          {
            queryType: 'custom_query',
            dataSource: 'test',
            businessContext: {
              department: 'testing',
              useCase: 'integration_test',
              priority: 'low',
            },
          }
        );

        console.log('Test trace created:', traceId);

        await endBITrace(traceId, { success: true, test: 'completed' });
        console.log('Test trace completed');
      } catch (error) {
        console.error('Langfuse test failed:', error);
      }
    };

    testLangfuse();
  }, [startBITrace, endBITrace, isEnabled]);

  return (
    <div className="p-4 border rounded">
      <h3>Langfuse Integration Test</h3>
      <p>Status: {isEnabled ? 'Enabled' : 'Disabled'}</p>
      <p>Check console for test results</p>
    </div>
  );
}
```

Add this component temporarily to your app to test the integration.

### 5.3 Langfuse Dashboard Verification

1. Log into your Langfuse dashboard
2. Navigate to **Traces** section
3. Look for traces with names like:
   - `test-trace` (from the test component)
   - `mastra-chat-*` (from chat interactions)
   - `dashboard-*` (from dashboard operations)
   - `query-*` (from query builder)

4. Click on traces to see detailed information including:
   - Input/output data
   - Performance metrics
   - Business context metadata
   - Error information (if any)

## Step 6: Production Deployment

### 6.1 Environment Variables Setup

For production deployment, ensure environment variables are properly configured:

#### Vercel
```bash
vercel env add VITE_LANGFUSE_PUBLIC_KEY
vercel env add VITE_LANGFUSE_SECRET_KEY
vercel env add VITE_LANGFUSE_BASE_URL
vercel env add VITE_LANGFUSE_ENABLED
```

#### Netlify
Add to your Netlify dashboard under Site Settings > Environment Variables

#### Docker
```dockerfile
# Dockerfile
ENV VITE_LANGFUSE_PUBLIC_KEY=pk_lf_your_public_key_here
ENV VITE_LANGFUSE_SECRET_KEY=sk_lf_your_secret_key_here
ENV VITE_LANGFUSE_BASE_URL=https://cloud.langfuse.com
ENV VITE_LANGFUSE_ENABLED=true
```

### 6.2 Build Verification

Test the production build locally:

```bash
yarn build
yarn preview
```

Verify that:
1. Build completes without errors
2. Langfuse configuration is properly loaded
3. All tracking functionality works in production mode

### 6.3 Performance Optimization

For production, consider these optimizations:

```bash
# .env.production
VITE_LANGFUSE_FLUSH_INTERVAL=5000
VITE_LANGFUSE_FLUSH_AT=50
VITE_LANGFUSE_DEBUG=false
VITE_LANGFUSE_REQUEST_TIMEOUT=5000
```

## Step 7: Monitoring and Maintenance

### 7.1 Health Monitoring

Add a health check endpoint or component:

```typescript
// src/components/LangfuseHealthCheck.tsx
import React, { useState, useEffect } from 'react';
import { LangfuseClientService } from '@/services/langfuse-client';

export function LangfuseHealthCheck() {
  const [health, setHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const client = LangfuseClientService.getInstance();
        const isHealthy = await client.healthCheck();
        setHealth(isHealthy ? 'healthy' : 'unhealthy');
        setLastCheck(new Date());
      } catch (error) {
        setHealth('unhealthy');
        setLastCheck(new Date());
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`p-2 rounded text-sm ${
      health === 'healthy' ? 'bg-green-100 text-green-800' :
      health === 'unhealthy' ? 'bg-red-100 text-red-800' :
      'bg-yellow-100 text-yellow-800'
    }`}>
      Langfuse: {health} {lastCheck && `(${lastCheck.toLocaleTimeString()})`}
    </div>
  );
}
```

### 7.2 Error Monitoring

Set up error tracking for Langfuse-related issues:

```typescript
// src/utils/error-tracking.ts
export function trackLangfuseError(error: Error, context?: Record<string, unknown>) {
  console.error('Langfuse Error:', error, context);
  
  // Send to your error tracking service (Sentry, etc.)
  // Example:
  // Sentry.captureException(error, { tags: { component: 'langfuse' }, extra: context });
}
```

### 7.3 Usage Analytics

Monitor Langfuse usage in your dashboard:

1. **Trace Volume**: Monitor daily/weekly trace counts
2. **Error Rates**: Track failed traces and operations
3. **Performance**: Monitor trace processing times
4. **Business Metrics**: Track BI operation success rates

## Troubleshooting

### Common Issues

#### 1. "Configuration validation failed"
**Cause**: Missing or invalid environment variables
**Solution**: 
- Check all required environment variables are set
- Verify API keys are correct
- Ensure BASE_URL is properly formatted

#### 2. "Failed to initialize Langfuse client"
**Cause**: Network issues or invalid credentials
**Solution**:
- Check internet connectivity
- Verify API keys in Langfuse dashboard
- Check if BASE_URL is accessible

#### 3. "Traces not appearing in dashboard"
**Cause**: Various issues with data transmission
**Solution**:
- Check browser network tab for failed requests
- Verify LANGFUSE_ENABLED=true
- Check flush interval settings
- Ensure traces are properly ended with endBITrace()

#### 4. Performance issues
**Cause**: Too frequent flushing or large trace data
**Solution**:
- Increase FLUSH_INTERVAL
- Increase FLUSH_AT batch size
- Reduce trace data size
- Disable debug mode in production

### Debug Mode

Enable debug mode for detailed logging:

```bash
VITE_LANGFUSE_DEBUG=true
```

This will log all Langfuse operations to the browser console.

### Support Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse Discord Community](https://discord.gg/7NXusRtqYU)
- [GitHub Issues](https://github.com/langfuse/langfuse/issues)

## Security Checklist

- [ ] API keys are stored securely (not in code)
- [ ] Different API keys for different environments
- [ ] API key rotation schedule established
- [ ] Access to Langfuse dashboard is restricted
- [ ] Data retention policies configured
- [ ] Network security (HTTPS) verified
- [ ] No sensitive data in trace payloads

## Next Steps

After successful setup:

1. **Customize Business Context**: Update business context metadata to match your specific use cases
2. **Create Custom Dashboards**: Set up Langfuse dashboards for your specific metrics
3. **Set Up Alerts**: Configure alerts for error rates or performance thresholds
4. **Team Training**: Train team members on using Langfuse dashboard
5. **Integration Expansion**: Add tracking to additional components as needed

## Advanced Configuration

### Custom Trace Processing

```typescript
// src/utils/custom-trace-processor.ts
import { useBIObservability } from '@/hooks/use-langfuse';

export function useCustomTraceProcessor() {
  const { startBITrace, endBITrace } = useBIObservability();

  const processWithCustomMetrics = async (operation: () => Promise<any>) => {
    const startTime = performance.now();
    const traceId = await startBITrace('custom-operation', 'custom_query', {}, {
      queryType: 'custom_query',
      dataSource: 'custom',
      businessContext: {
        department: 'custom',
        useCase: 'custom_processing',
        priority: 'medium',
      },
    });

    try {
      const result = await operation();
      const endTime = performance.now();
      
      await endBITrace(traceId, {
        success: true,
        duration: endTime - startTime,
        result,
      });
      
      return result;
    } catch (error) {
      await endBITrace(traceId, {
        success: false,
        error: error.message,
      });
      throw error;
    }
  };

  return { processWithCustomMetrics };
}
```

### Batch Operations

```typescript
// src/utils/batch-operations.ts
import { useBIAnalytics } from '@/hooks/use-bi-analytics';

export function useBatchOperations() {
  const { executeBatch } = useBIAnalytics();

  const processBatchQueries = async (queries: QueryConfig[]) => {
    // Automatically tracked with Langfuse
    return await executeBatch(queries);
  };

  return { processBatchQueries };
}
```

This completes the comprehensive setup and configuration guide for the Langfuse integration. The integration is now fully functional with complete observability for all BI operations.