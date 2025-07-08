# Advanced BI Query Patterns

Advanced patterns for complex business intelligence queries using the BI Agent with sophisticated state management and query optimization.

## 🧠 Advanced Store Architecture

### Enhanced Query Store with Caching

```typescript
// src/stores/advanced-bi-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

// Advanced query types
type QueryType = 'sql' | 'analysis' | 'visualization' | 'prediction' | 'comparison';
type DataSource = 'sales' | 'customers' | 'inventory' | 'finance' | 'operations';
type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

interface QueryMetadata {
  queryType: QueryType;
  dataSource: DataSource;
  timeRange?: TimeRange;
  filters?: Record<string, unknown>;
  aggregations?: string[];
  executionTime: number;
  resultCount?: number;
  confidence: number;
  cacheKey?: string;
}

interface BIQuery {
  id: string;
  content: string;
  timestamp: Date;
  metadata: QueryMetadata;
  results?: unknown;
  cached?: boolean;
}

interface BIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  query?: BIQuery;
  attachments?: Array<{
    type: 'chart' | 'table' | 'export';
    data: unknown;
    format: string;
  }>;
}

// Query cache management
interface QueryCache {
  [key: string]: {
    results: unknown;
    timestamp: Date;
    ttl: number;
    hitCount: number;
  };
}

// Performance metrics
interface PerformanceMetrics {
  totalQueries: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  queryTypeDistribution: Record<QueryType, number>;
  dataSourceUsage: Record<DataSource, number>;
}

interface AdvancedBIState {
  // Core state
  messages: BIMessage[];
  queries: BIQuery[];
  isLoading: boolean;
  error: string | null;
  
  // Query management
  queryCache: QueryCache;
  activeQuery: BIQuery | null;
  queryHistory: BIQuery[];
  
  // Performance tracking
  metrics: PerformanceMetrics;
  
  // Advanced features
  autoSuggestions: string[];
  queryTemplates: Array<{
    id: string;
    name: string;
    description: string;
    template: string;
    category: QueryType;
  }>;
  
  // Actions - Core
  addMessage: (message: BIMessage) => void;
  executeQuery: (content: string, options?: Partial<QueryMetadata>) => Promise<void>;
  retryQuery: (queryId: string) => Promise<void>;
  
  // Actions - Cache Management
  getCachedResult: (cacheKey: string) => unknown | null;
  setCachedResult: (cacheKey: string, result: unknown, ttl?: number) => void;
  clearCache: () => void;
  
  // Actions - Query Management
  saveQuery: (query: BIQuery) => void;
  loadQueryFromHistory: (queryId: string) => void;
  generateQuerySuggestions: (context: string) => void;
  
  // Actions - Performance
  updateMetrics: (query: BIQuery, success: boolean) => void;
  getPerformanceReport: () => PerformanceMetrics;
}

export const useAdvancedBIStore = create<AdvancedBIState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        messages: [],
        queries: [],
        isLoading: false,
        error: null,
        queryCache: {},
        activeQuery: null,
        queryHistory: [],
        
        metrics: {
          totalQueries: 0,
          averageResponseTime: 0,
          cacheHitRate: 0,
          errorRate: 0,
          queryTypeDistribution: {
            sql: 0,
            analysis: 0,
            visualization: 0,
            prediction: 0,
            comparison: 0,
          },
          dataSourceUsage: {
            sales: 0,
            customers: 0,
            inventory: 0,
            finance: 0,
            operations: 0,
          },
        },
        
        autoSuggestions: [],
        queryTemplates: [
          {
            id: 'revenue-trend',
            name: 'Revenue Trend Analysis',
            description: 'Analyze revenue trends over time',
            template: 'Show me revenue trends for {timeRange} broken down by {dimension}',
            category: 'analysis',
          },
          {
            id: 'top-products',
            name: 'Top Products Report',
            description: 'Find top performing products',
            template: 'What are the top {count} products by {metric} in {timeRange}?',
            category: 'sql',
          },
          {
            id: 'customer-segmentation',
            name: 'Customer Segmentation',
            description: 'Analyze customer segments',
            template: 'Segment customers by {criteria} and show {metrics}',
            category: 'analysis',
          },
        ],

        // Core Actions
        addMessage: (message) =>
          set((state) => {
            state.messages.push(message);
          }),

        executeQuery: async (content, options = {}) => {
          const startTime = Date.now();
          let success = false;
          
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            // Create query object
            const query: BIQuery = {
              id: `query-${Date.now()}`,
              content,
              timestamp: new Date(),
              metadata: {
                queryType: options.queryType ?? 'analysis',
                dataSource: options.dataSource ?? 'sales',
                timeRange: options.timeRange,
                filters: options.filters,
                aggregations: options.aggregations,
                executionTime: 0,
                confidence: 0,
                cacheKey: generateCacheKey(content, options),
              },
            };

            // Check cache first
            const cachedResult = get().getCachedResult(query.metadata.cacheKey ?? '');
            if (cachedResult) {
              query.results = cachedResult;
              query.cached = true;
              query.metadata.executionTime = Date.now() - startTime;
              
              set((state) => {
                state.activeQuery = query;
                state.queries.push(query);
                state.isLoading = false;
              });
              
              success = true;
              return;
            }

            // Execute query via API
            const response = await fetch('http://localhost:4113/api/agents/businessIntelligenceAgent/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: content,
                metadata: options,
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update query with results
            query.results = data.results;
            query.metadata.executionTime = Date.now() - startTime;
            query.metadata.confidence = data.confidence ?? 0.8;
            query.metadata.resultCount = data.resultCount;

            // Cache the result
            if (query.metadata.cacheKey) {
              get().setCachedResult(query.metadata.cacheKey, data.results);
            }

            // Add messages
            const userMessage: BIMessage = {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content,
              timestamp: new Date(),
              query,
            };

            const assistantMessage: BIMessage = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: data.explanation ?? 'Query executed successfully',
              timestamp: new Date(),
              query,
              attachments: data.attachments,
            };

            set((state) => {
              state.activeQuery = query;
              state.queries.push(query);
              state.messages.push(userMessage, assistantMessage);
              state.queryHistory.unshift(query);
              state.isLoading = false;
            });

            success = true;
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
            
          } finally {
            // Update metrics
            const finalQuery = get().activeQuery;
            if (finalQuery) {
              get().updateMetrics(finalQuery, success);
            }
          }
        },

        retryQuery: async (queryId) => {
          const query = get().queries.find(q => q.id === queryId);
          if (query) {
            await get().executeQuery(query.content, query.metadata);
          }
        },

        // Cache Management
        getCachedResult: (cacheKey) => {
          const cached = get().queryCache[cacheKey];
          if (!cached) return null;
          
          const now = Date.now();
          const age = now - cached.timestamp.getTime();
          
          if (age > cached.ttl) {
            // Cache expired
            set((state) => {
              delete state.queryCache[cacheKey];
            });
            return null;
          }
          
          // Update hit count
          set((state) => {
            if (state.queryCache[cacheKey]) {
              state.queryCache[cacheKey].hitCount++;
            }
          });
          
          return cached.results;
        },

        setCachedResult: (cacheKey, result, ttl = 300000) => { // 5 minutes default
          set((state) => {
            state.queryCache[cacheKey] = {
              results: result,
              timestamp: new Date(),
              ttl,
              hitCount: 0,
            };
          });
        },

        clearCache: () =>
          set((state) => {
            state.queryCache = {};
          }),

        // Query Management
        saveQuery: (query) =>
          set((state) => {
            const existingIndex = state.queryHistory.findIndex(q => q.id === query.id);
            if (existingIndex >= 0) {
              state.queryHistory[existingIndex] = query;
            } else {
              state.queryHistory.unshift(query);
            }
          }),

        loadQueryFromHistory: (queryId) => {
          const query = get().queryHistory.find(q => q.id === queryId);
          if (query) {
            get().executeQuery(query.content, query.metadata);
          }
        },

        generateQuerySuggestions: (context) => {
          // Simple suggestion generation based on context
          const suggestions = [];
          
          if (context.toLowerCase().includes('revenue')) {
            suggestions.push('Show revenue trends for the last quarter');
            suggestions.push('Compare revenue by product category');
          }
          
          if (context.toLowerCase().includes('customer')) {
            suggestions.push('Analyze customer acquisition trends');
            suggestions.push('Show customer lifetime value by segment');
          }
          
          set((state) => {
            state.autoSuggestions = suggestions;
          });
        },

        // Performance Tracking
        updateMetrics: (query, success) =>
          set((state) => {
            const { metrics } = state;
            const newTotal = metrics.totalQueries + 1;
            
            // Update average response time
            metrics.averageResponseTime = 
              (metrics.averageResponseTime * metrics.totalQueries + query.metadata.executionTime) / newTotal;
            
            // Update error rate
            const errorCount = Math.round(metrics.errorRate * metrics.totalQueries / 100);
            metrics.errorRate = ((errorCount + (success ? 0 : 1)) / newTotal) * 100;
            
            // Update query type distribution
            metrics.queryTypeDistribution[query.metadata.queryType]++;
            
            // Update data source usage
            metrics.dataSourceUsage[query.metadata.dataSource]++;
            
            // Update cache hit rate
            const cacheHits = Object.values(state.queryCache).reduce((sum, cache) => sum + cache.hitCount, 0);
            metrics.cacheHitRate = (cacheHits / newTotal) * 100;
            
            metrics.totalQueries = newTotal;
          }),

        getPerformanceReport: () => get().metrics,
      })),
      {
        name: 'advanced-bi-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          queryHistory: state.queryHistory.slice(0, 50), // Keep last 50 queries
          queryTemplates: state.queryTemplates,
          metrics: state.metrics,
        }),
      }
    )
  )
);

// Helper function to generate cache keys
function generateCacheKey(content: string, options: Partial<QueryMetadata>): string {
  const key = {
    content: content.toLowerCase().trim(),
    queryType: options.queryType,
    dataSource: options.dataSource,
    timeRange: options.timeRange,
    filters: options.filters,
  };
  
  return btoa(JSON.stringify(key)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Optimized selectors
export const useQueryMetrics = () => 
  useAdvancedBIStore((state) => state.metrics);

export const useQueryCache = () =>
  useAdvancedBIStore((state) => ({
    cache: state.queryCache,
    getCached: state.getCachedResult,
    setCached: state.setCachedResult,
    clearCache: state.clearCache,
  }));

export const useQueryHistory = () =>
  useAdvancedBIStore((state) => ({
    history: state.queryHistory,
    loadQuery: state.loadQueryFromHistory,
    saveQuery: state.saveQuery,
  }));
```

## 🔧 Advanced Query Hook

### Multi-Modal Query Processing

```typescript
// src/hooks/use-advanced-bi-queries.ts
import { useCallback, useMemo } from 'react';
import { useAdvancedBIStore } from '../stores/advanced-bi-store';

interface QueryOptions {
  queryType?: 'sql' | 'analysis' | 'visualization' | 'prediction' | 'comparison';
  dataSource?: 'sales' | 'customers' | 'inventory' | 'finance' | 'operations';
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
  filters?: Record<string, unknown>;
  useCache?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export function useAdvancedBIQueries() {
  const {
    messages,
    queries,
    isLoading,
    error,
    activeQuery,
    executeQuery,
    retryQuery,
    queryHistory,
    autoSuggestions,
    generateQuerySuggestions,
    queryTemplates,
  } = useAdvancedBIStore();

  // Enhanced query execution with preprocessing
  const executeAdvancedQuery = useCallback(async (
    content: string, 
    options: QueryOptions = {}
  ) => {
    // Preprocess query to detect intent
    const processedOptions = await preprocessQuery(content, options);
    
    // Execute with enhanced options
    await executeQuery(content, processedOptions);
  }, [executeQuery]);

  // Batch query execution
  const executeBatchQueries = useCallback(async (
    queries: Array<{ content: string; options?: QueryOptions }>
  ) => {
    const results = [];
    
    for (const query of queries) {
      try {
        await executeAdvancedQuery(query.content, query.options);
        results.push({ success: true, query: query.content });
      } catch (error) {
        results.push({ 
          success: false, 
          query: query.content, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }, [executeAdvancedQuery]);

  // Query comparison
  const compareQueries = useCallback(async (
    baseQuery: string,
    comparisonQueries: string[],
    options: QueryOptions = {}
  ) => {
    const comparisonOptions = {
      ...options,
      queryType: 'comparison' as const,
    };

    const comparisonContent = `
      Base Query: ${baseQuery}
      
      Compare with:
      ${comparisonQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}
      
      Provide a detailed comparison analysis including:
      - Key differences in results
      - Performance implications
      - Recommendations for optimization
    `;

    await executeQuery(comparisonContent, comparisonOptions);
  }, [executeQuery]);

  // Predictive analysis
  const executePredictiveQuery = useCallback(async (
    historicalQuery: string,
    predictionPeriod: string,
    options: QueryOptions = {}
  ) => {
    const predictiveOptions = {
      ...options,
      queryType: 'prediction' as const,
    };

    const predictiveContent = `
      Based on historical data from: ${historicalQuery}
      
      Generate predictions for: ${predictionPeriod}
      
      Include:
      - Trend analysis
      - Confidence intervals
      - Key assumptions
      - Risk factors
    `;

    await executeQuery(predictiveContent, predictiveOptions);
  }, [executeQuery]);

  // Query optimization suggestions
  const getQueryOptimizations = useCallback(async (queryId: string) => {
    const query = queries.find(q => q.id === queryId);
    if (!query) return null;

    const optimizationContent = `
      Analyze and optimize this query:
      ${query.content}
      
      Current performance:
      - Execution time: ${query.metadata.executionTime}ms
      - Result count: ${query.metadata.resultCount ?? 'unknown'}
      
      Provide:
      - Performance bottlenecks
      - Optimization suggestions
      - Alternative query approaches
      - Index recommendations
    `;

    await executeQuery(optimizationContent, {
      queryType: 'analysis',
      dataSource: query.metadata.dataSource,
    });
  }, [queries, executeQuery]);

  // Smart query suggestions based on context
  const getSmartSuggestions = useCallback((context: string) => {
    generateQuerySuggestions(context);
    
    // Enhanced suggestions based on query history
    const recentQueries = queryHistory.slice(0, 10);
    const contextSuggestions = recentQueries
      .filter(q => q.content.toLowerCase().includes(context.toLowerCase()))
      .map(q => q.content)
      .slice(0, 3);
    
    return [...autoSuggestions, ...contextSuggestions];
  }, [generateQuerySuggestions, queryHistory, autoSuggestions]);

  // Query template expansion
  const expandTemplate = useCallback((templateId: string, variables: Record<string, string>) => {
    const template = queryTemplates.find(t => t.id === templateId);
    if (!template) return null;

    let expandedQuery = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      expandedQuery = expandedQuery.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return {
      content: expandedQuery,
      category: template.category,
      description: template.description,
    };
  }, [queryTemplates]);

  // Performance insights
  const performanceInsights = useMemo(() => {
    const recentQueries = queries.slice(-20);
    const avgTime = recentQueries.reduce((sum, q) => sum + q.metadata.executionTime, 0) / recentQueries.length;
    const slowQueries = recentQueries.filter(q => q.metadata.executionTime > avgTime * 1.5);
    
    return {
      averageExecutionTime: avgTime,
      slowQueries: slowQueries.length,
      cacheEfficiency: recentQueries.filter(q => q.cached).length / recentQueries.length * 100,
      recommendations: generatePerformanceRecommendations(recentQueries),
    };
  }, [queries]);

  return {
    // Core state
    messages,
    queries,
    isLoading,
    error,
    activeQuery,
    
    // Enhanced query execution
    executeAdvancedQuery,
    executeBatchQueries,
    compareQueries,
    executePredictiveQuery,
    retryQuery,
    
    // Query optimization
    getQueryOptimizations,
    getSmartSuggestions,
    expandTemplate,
    
    // Analytics
    performanceInsights,
    queryHistory,
    queryTemplates,
  };
}

// Helper functions
async function preprocessQuery(content: string, options: QueryOptions): Promise<QueryOptions> {
  const processed = { ...options };
  
  // Auto-detect query type
  if (!processed.queryType) {
    if (content.toLowerCase().includes('predict') || content.toLowerCase().includes('forecast')) {
      processed.queryType = 'prediction';
    } else if (content.toLowerCase().includes('compare') || content.toLowerCase().includes('vs')) {
      processed.queryType = 'comparison';
    } else if (content.toLowerCase().includes('chart') || content.toLowerCase().includes('graph')) {
      processed.queryType = 'visualization';
    } else if (content.toLowerCase().includes('select') || content.toLowerCase().includes('from')) {
      processed.queryType = 'sql';
    } else {
      processed.queryType = 'analysis';
    }
  }
  
  // Auto-detect data source
  if (!processed.dataSource) {
    const contentLower = content.toLowerCase();
    if (contentLower.includes('sales') || contentLower.includes('revenue')) {
      processed.dataSource = 'sales';
    } else if (contentLower.includes('customer') || contentLower.includes('client')) {
      processed.dataSource = 'customers';
    } else if (contentLower.includes('inventory') || contentLower.includes('stock')) {
      processed.dataSource = 'inventory';
    } else if (contentLower.includes('finance') || contentLower.includes('budget')) {
      processed.dataSource = 'finance';
    } else {
      processed.dataSource = 'operations';
    }
  }
  
  // Auto-detect time range
  if (!processed.timeRange) {
    const contentLower = content.toLowerCase();
    if (contentLower.includes('hour')) {
      processed.timeRange = '1h';
    } else if (contentLower.includes('today') || contentLower.includes('24 hour')) {
      processed.timeRange = '24h';
    } else if (contentLower.includes('week')) {
      processed.timeRange = '7d';
    } else if (contentLower.includes('month')) {
      processed.timeRange = '30d';
    } else if (contentLower.includes('quarter')) {
      processed.timeRange = '90d';
    } else if (contentLower.includes('year')) {
      processed.timeRange = '1y';
    }
  }
  
  return processed;
}

function generatePerformanceRecommendations(queries: Array<{ metadata: { executionTime: number; queryType: string } }>): string[] {
  const recommendations = [];
  
  const avgTime = queries.reduce((sum, q) => sum + q.metadata.executionTime, 0) / queries.length;
  
  if (avgTime > 5000) {
    recommendations.push('Consider adding database indexes for frequently queried columns');
  }
  
  const sqlQueries = queries.filter(q => q.metadata.queryType === 'sql');
  if (sqlQueries.length > queries.length * 0.7) {
    recommendations.push('Consider using cached aggregations for common SQL patterns');
  }
  
  if (queries.length > 10) {
    recommendations.push('Enable query result caching to improve response times');
  }
  
  return recommendations;
}
```

## 📊 Advanced Query Components

### Query Builder Interface

```typescript
// src/components/QueryBuilder.tsx
import React, { useState, useCallback } from 'react';
import { useAdvancedBIQueries } from '../hooks/use-advanced-bi-queries';
import { 
  Play, 
  Save, 
  History, 
  Zap, 
  BarChart3, 
  Database,
  Clock,
  Filter
} from 'lucide-react';

interface QueryBuilderProps {
  onQueryExecute?: (query: string) => void;
}

export function QueryBuilder({ onQueryExecute }: QueryBuilderProps) {
  const {
    executeAdvancedQuery,
    getSmartSuggestions,
    expandTemplate,
    queryTemplates,
    queryHistory,
  } = useAdvancedBIQueries();

  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [queryOptions, setQueryOptions] = useState({
    queryType: 'analysis' as const,
    dataSource: 'sales' as const,
    timeRange: '30d' as const,
    useCache: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExecuteQuery = useCallback(async () => {
    if (!query.trim()) return;
    
    await executeAdvancedQuery(query, queryOptions);
    onQueryExecute?.(query);
  }, [query, queryOptions, executeAdvancedQuery, onQueryExecute]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    const template = queryTemplates.find(t => t.id === templateId);
    if (template) {
      setQuery(template.template);
      setQueryOptions(prev => ({
        ...prev,
        queryType: template.category,
      }));
    }
  }, [queryTemplates]);

  const suggestions = getSmartSuggestions(query);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Query Builder</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Query Templates
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {queryTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`p-3 text-left border rounded-md hover:bg-gray-50 transition-colors ${
                selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{template.name}</div>
              <div className="text-sm text-gray-500 mt-1">{template.description}</div>
              <div className="flex items-center gap-1 mt-2">
                {template.category === 'sql' && <Database className="h-3 w-3 text-blue-500" />}
                {template.category === 'analysis' && <BarChart3 className="h-3 w-3 text-green-500" />}
                {template.category === 'visualization' && <BarChart3 className="h-3 w-3 text-purple-500" />}
                <span className="text-xs text-gray-400 capitalize">{template.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your business intelligence query..."
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        
        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Suggestions:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Basic Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Query Type
          </label>
          <select
            value={queryOptions.queryType}
            onChange={(e) => setQueryOptions(prev => ({ 
              ...prev, 
              queryType: e.target.value as any 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="analysis">Analysis</option>
            <option value="sql">SQL Query</option>
            <option value="visualization">Visualization</option>
            <option value="prediction">Prediction</option>
            <option value="comparison">Comparison</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source
          </label>
          <select
            value={queryOptions.dataSource}
            onChange={(e) => setQueryOptions(prev => ({ 
              ...prev, 
              dataSource: e.target.value as any 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sales">Sales</option>
            <option value="customers">Customers</option>
            <option value="inventory">Inventory</option>