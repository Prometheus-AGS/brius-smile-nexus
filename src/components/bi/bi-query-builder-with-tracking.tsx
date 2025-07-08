/**
 * Business Intelligence Query Builder Component with Langfuse Tracking
 * 
 * Interactive query builder component that automatically tracks all query construction
 * and execution with comprehensive Langfuse observability integration.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBIAnalytics } from '@/hooks/use-bi-analytics';
import { useBIObservability } from '@/hooks/use-langfuse';
import type { BIObservabilityContext, BIQueryType } from '@/types/langfuse';

// ============================================================================
// Component Types
// ============================================================================

interface QueryField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description: string;
  required?: boolean;
}

interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'in' | 'between';
  value: string | number | string[] | [string | number, string | number];
}

interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

interface QueryConfig {
  dataSource: string;
  fields: string[];
  filters: QueryFilter[];
  sorts: QuerySort[];
  limit?: number;
  offset?: number;
  groupBy?: string[];
  aggregations?: Record<string, 'count' | 'sum' | 'avg' | 'min' | 'max'>;
}

interface QueryResult {
  data: Record<string, unknown>[];
  totalCount: number;
  executionTime: number;
  queryId: string;
}

interface BIQueryBuilderProps {
  availableDataSources: string[];
  onQueryExecute?: (result: QueryResult) => void;
  className?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_FIELDS: Record<string, QueryField[]> = {
  orders: [
    { name: 'id', type: 'string', description: 'Order ID' },
    { name: 'customer_name', type: 'string', description: 'Customer Name' },
    { name: 'order_date', type: 'date', description: 'Order Date' },
    { name: 'total_amount', type: 'number', description: 'Total Amount' },
    { name: 'status', type: 'string', description: 'Order Status' },
    { name: 'is_priority', type: 'boolean', description: 'Priority Order' },
  ],
  customers: [
    { name: 'id', type: 'string', description: 'Customer ID' },
    { name: 'name', type: 'string', description: 'Customer Name' },
    { name: 'email', type: 'string', description: 'Email Address' },
    { name: 'created_date', type: 'date', description: 'Registration Date' },
    { name: 'total_orders', type: 'number', description: 'Total Orders' },
    { name: 'is_active', type: 'boolean', description: 'Active Status' },
  ],
  products: [
    { name: 'id', type: 'string', description: 'Product ID' },
    { name: 'name', type: 'string', description: 'Product Name' },
    { name: 'category', type: 'string', description: 'Category' },
    { name: 'price', type: 'number', description: 'Price' },
    { name: 'stock_quantity', type: 'number', description: 'Stock Quantity' },
    { name: 'is_available', type: 'boolean', description: 'Available' },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

export const BIQueryBuilderWithTracking: React.FC<BIQueryBuilderProps> = React.memo(({
  availableDataSources = ['orders', 'customers', 'products'],
  onQueryExecute,
  className = '',
}) => {
  // Hooks
  const {
    executeQuery,
    executeBatch,
    analyzeData,
  } = useBIAnalytics();

  const {
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError,
  } = useBIObservability();

  // State
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    dataSource: '',
    fields: [],
    filters: [],
    sorts: [],
    limit: 100,
    offset: 0,
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [rawSql, setRawSql] = useState('');

  /**
   * Create query context for observability
   */
  const createQueryContext = useCallback((
    operation: string,
    queryType: BIQueryType = 'custom_query'
  ): BIObservabilityContext => ({
    queryType,
    dataSource: queryConfig.dataSource || 'unknown',
    businessContext: {
      department: 'analytics',
      useCase: operation,
      priority: 'medium',
    },
    filters: {
      dataSource: queryConfig.dataSource,
      fieldsCount: queryConfig.fields.length,
      filtersCount: queryConfig.filters.length,
      sortsCount: queryConfig.sorts.length,
    },
  }), [queryConfig]);

  // Computed values
  const availableFields = useMemo(() => {
    return queryConfig.dataSource ? MOCK_FIELDS[queryConfig.dataSource] || [] : [];
  }, [queryConfig.dataSource]);

  const generatedSql = useMemo(() => {
    if (!queryConfig.dataSource || queryConfig.fields.length === 0) {
      return '';
    }

    let sql = `SELECT ${queryConfig.fields.join(', ')}\nFROM ${queryConfig.dataSource}`;

    if (queryConfig.filters.length > 0) {
      const whereClause = queryConfig.filters.map(filter => {
        switch (filter.operator) {
          case 'equals':
            return `${filter.field} = '${filter.value}'`;
          case 'not_equals':
            return `${filter.field} != '${filter.value}'`;
          case 'greater_than':
            return `${filter.field} > ${filter.value}`;
          case 'less_than':
            return `${filter.field} < ${filter.value}`;
          case 'contains':
            return `${filter.field} LIKE '%${filter.value}%'`;
          case 'starts_with':
            return `${filter.field} LIKE '${filter.value}%'`;
          case 'in':
            return `${filter.field} IN (${Array.isArray(filter.value) ? filter.value.map(v => `'${v}'`).join(', ') : `'${filter.value}'`})`;
          case 'between':
            return Array.isArray(filter.value) && filter.value.length === 2
              ? `${filter.field} BETWEEN ${filter.value[0]} AND ${filter.value[1]}`
              : `${filter.field} = '${filter.value}'`;
          default:
            return `${filter.field} = '${filter.value}'`;
        }
      }).join(' AND ');
      sql += `\nWHERE ${whereClause}`;
    }

    if (queryConfig.groupBy && queryConfig.groupBy.length > 0) {
      sql += `\nGROUP BY ${queryConfig.groupBy.join(', ')}`;
    }

    if (queryConfig.sorts.length > 0) {
      const orderClause = queryConfig.sorts.map(sort => 
        `${sort.field} ${sort.direction.toUpperCase()}`
      ).join(', ');
      sql += `\nORDER BY ${orderClause}`;
    }

    if (queryConfig.limit) {
      sql += `\nLIMIT ${queryConfig.limit}`;
    }

    if (queryConfig.offset) {
      sql += `\nOFFSET ${queryConfig.offset}`;
    }

    return sql;
  }, [queryConfig]);

  /**
   * Handle data source change
   */
  const handleDataSourceChange = useCallback(async (dataSource: string) => {
    const traceId = await startBITrace(
      `change-data-source:${dataSource}`,
      'custom_query',
      { fromDataSource: queryConfig.dataSource, toDataSource: dataSource },
      createQueryContext('change_data_source')
    );

    try {
      setQueryConfig(prev => ({
        ...prev,
        dataSource,
        fields: [],
        filters: [],
        sorts: [],
      }));

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'data_source_changed', dataSource },
        { success: true },
        createQueryContext('change_data_source')
      );

      await endBITrace(traceId, { success: true, dataSource });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
    }
  }, [queryConfig.dataSource, startBITrace, endBITrace, trackBIQuery, handleBIError, createQueryContext]);

  /**
   * Add field to query
   */
  const handleAddField = useCallback(async (fieldName: string) => {
    const traceId = await startBITrace(
      `add-field:${fieldName}`,
      'custom_query',
      { fieldName, dataSource: queryConfig.dataSource },
      createQueryContext('add_field')
    );

    try {
      if (!queryConfig.fields.includes(fieldName)) {
        setQueryConfig(prev => ({
          ...prev,
          fields: [...prev.fields, fieldName],
        }));

        await trackBIQuery(
          traceId,
          'custom_query',
          { operation: 'field_added', fieldName },
          { success: true },
          createQueryContext('add_field')
        );
      }

      await endBITrace(traceId, { success: true, fieldName });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
    }
  }, [queryConfig.fields, queryConfig.dataSource, startBITrace, endBITrace, trackBIQuery, handleBIError, createQueryContext]);

  /**
   * Remove field from query
   */
  const handleRemoveField = useCallback(async (fieldName: string) => {
    const traceId = await startBITrace(
      `remove-field:${fieldName}`,
      'custom_query',
      { fieldName, dataSource: queryConfig.dataSource },
      createQueryContext('remove_field')
    );

    try {
      setQueryConfig(prev => ({
        ...prev,
        fields: prev.fields.filter(f => f !== fieldName),
      }));

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'field_removed', fieldName },
        { success: true },
        createQueryContext('remove_field')
      );

      await endBITrace(traceId, { success: true, fieldName });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
    }
  }, [queryConfig.dataSource, startBITrace, endBITrace, trackBIQuery, handleBIError, createQueryContext]);

  /**
   * Add filter to query
   */
  const handleAddFilter = useCallback(async () => {
    const traceId = await startBITrace(
      'add-filter',
      'custom_query',
      { dataSource: queryConfig.dataSource },
      createQueryContext('add_filter')
    );

    try {
      const newFilter: QueryFilter = {
        field: availableFields[0]?.name || '',
        operator: 'equals',
        value: '',
      };

      setQueryConfig(prev => ({
        ...prev,
        filters: [...prev.filters, newFilter],
      }));

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'filter_added' },
        { success: true },
        createQueryContext('add_filter')
      );

      await endBITrace(traceId, { success: true });
    } catch (error) {
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'low',
      });
    }
  }, [availableFields, queryConfig.dataSource, startBITrace, endBITrace, trackBIQuery, handleBIError, createQueryContext]);

  /**
   * Execute query
   */
  const handleExecuteQuery = useCallback(async () => {
    const traceId = await startBITrace(
      'execute-query',
      'custom_query',
      { queryConfig, sql: generatedSql },
      createQueryContext('execute_query')
    );

    try {
      setIsExecuting(true);
      setError(null);

      // Simulate query execution
      const mockResult: QueryResult = {
        data: Array.from({ length: Math.min(queryConfig.limit || 10, 50) }, (_, i) => {
          const row: Record<string, unknown> = {};
          queryConfig.fields.forEach(field => {
            const fieldDef = availableFields.find(f => f.name === field);
            switch (fieldDef?.type) {
              case 'string':
                row[field] = `Sample ${field} ${i + 1}`;
                break;
              case 'number':
                row[field] = Math.floor(Math.random() * 1000) + 1;
                break;
              case 'date':
                row[field] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
              case 'boolean':
                row[field] = Math.random() > 0.5;
                break;
              default:
                row[field] = `Value ${i + 1}`;
            }
          });
          return row;
        }),
        totalCount: Math.floor(Math.random() * 10000) + 100,
        executionTime: Math.random() * 500 + 50,
        queryId: `query-${Date.now()}`,
      };

      await new Promise(resolve => setTimeout(resolve, mockResult.executionTime));

      setQueryResult(mockResult);
      onQueryExecute?.(mockResult);

      await trackBIQuery(
        traceId,
        'custom_query',
        { 
          operation: 'query_executed',
          rowsReturned: mockResult.data.length,
          executionTime: mockResult.executionTime,
        },
        { result: mockResult },
        createQueryContext('execute_query')
      );

      await endBITrace(traceId, { 
        success: true, 
        rowsReturned: mockResult.data.length,
        executionTime: mockResult.executionTime,
      });
    } catch (error) {
      const errorObj = error as Error;
      setError(errorObj);
      await handleBIError(errorObj, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [
    queryConfig,
    generatedSql,
    availableFields,
    onQueryExecute,
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError,
    createQueryContext,
  ]);

  /**
   * Execute raw SQL
   */
  const handleExecuteRawSql = useCallback(async () => {
    const traceId = await startBITrace(
      'execute-raw-sql',
      'custom_query',
      { sql: rawSql },
      createQueryContext('execute_raw_sql')
    );

    try {
      setIsExecuting(true);
      setError(null);

      // Simulate raw SQL execution
      const mockResult: QueryResult = {
        data: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          result: `Raw SQL Result ${i + 1}`,
          value: Math.random() * 100,
        })),
        totalCount: 10,
        executionTime: Math.random() * 300 + 100,
        queryId: `raw-query-${Date.now()}`,
      };

      await new Promise(resolve => setTimeout(resolve, mockResult.executionTime));

      setQueryResult(mockResult);
      onQueryExecute?.(mockResult);

      await endBITrace(traceId, { 
        success: true, 
        rowsReturned: mockResult.data.length,
        executionTime: mockResult.executionTime,
      });
    } catch (error) {
      const errorObj = error as Error;
      setError(errorObj);
      await handleBIError(errorObj, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [rawSql, onQueryExecute, startBITrace, endBITrace, handleBIError, createQueryContext]);

  // Render helpers
  const renderFieldSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle>Fields</CardTitle>
        <CardDescription>Select fields to include in your query</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {availableFields.map(field => (
            <div key={field.name} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1">
                <div className="font-medium">{field.name}</div>
                <div className="text-sm text-muted-foreground">{field.description}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{field.type}</Badge>
                {queryConfig.fields.includes(field.name) ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveField(field.name)}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddField(field.name)}
                  >
                    Add
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderFilters = () => (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Add conditions to filter your data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queryConfig.filters.map((filter, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded">
              <Select
                value={filter.field}
                onValueChange={(value) => {
                  const newFilters = [...queryConfig.filters];
                  newFilters[index] = { ...filter, field: value };
                  setQueryConfig(prev => ({ ...prev, filters: newFilters }));
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={(value) => {
                  const newFilters = [...queryConfig.filters];
                  newFilters[index] = { ...filter, operator: value as QueryFilter['operator'] };
                  setQueryConfig(prev => ({ ...prev, filters: newFilters }));
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Value"
                value={filter.value as string}
                onChange={(e) => {
                  const newFilters = [...queryConfig.filters];
                  newFilters[index] = { ...filter, value: e.target.value };
                  setQueryConfig(prev => ({ ...prev, filters: newFilters }));
                }}
                className="flex-1"
              />

              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const newFilters = queryConfig.filters.filter((_, i) => i !== index);
                  setQueryConfig(prev => ({ ...prev, filters: newFilters }));
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button onClick={handleAddFilter} variant="outline">
            Add Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderQueryResult = () => {
    if (!queryResult) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Query Results</CardTitle>
          <CardDescription>
            {queryResult.data.length} rows returned in {queryResult.executionTime.toFixed(2)}ms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {queryResult.data.map((row, index) => (
                <div key={index} className="p-2 border rounded text-sm">
                  <pre>{JSON.stringify(row, null, 2)}</pre>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Query Builder</h2>
          <p className="text-muted-foreground">Build and execute custom queries with visual tools</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={activeTab === 'builder' ? handleExecuteQuery : handleExecuteRawSql}
            disabled={isExecuting || (!queryConfig.dataSource && activeTab === 'builder') || (!rawSql.trim() && activeTab === 'sql')}
          >
            {isExecuting ? 'Executing...' : 'Execute Query'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <strong>Query Error:</strong> {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          <TabsTrigger value="sql">SQL Editor</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          {/* Data Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Data Source</CardTitle>
              <CardDescription>Select the data source for your query</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={queryConfig.dataSource} onValueChange={handleDataSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {availableDataSources.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {queryConfig.dataSource && (
            <>
              {renderFieldSelector()}
              {renderFilters()}

              {/* Query Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Query Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="limit">Limit</Label>
                      <Input
                        id="limit"
                        type="number"
                        value={queryConfig.limit || ''}
                        onChange={(e) => setQueryConfig(prev => ({ 
                          ...prev, 
                          limit: parseInt(e.target.value) || undefined 
                        }))}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="offset">Offset</Label>
                      <Input
                        id="offset"
                        type="number"
                        value={queryConfig.offset || ''}
                        onChange={(e) => setQueryConfig(prev => ({ 
                          ...prev, 
                          offset: parseInt(e.target.value) || undefined 
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated SQL Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated SQL</CardTitle>
                  <CardDescription>Preview of the SQL query that will be executed</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-muted rounded text-sm overflow-x-auto">
                    {generatedSql || 'No query generated yet'}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sql" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SQL Editor</CardTitle>
              <CardDescription>Write custom SQL queries directly</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your SQL query here..."
                value={rawSql}
                onChange={(e) => setRawSql(e.target.value)}
                className="min-h-64 font-mono"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {queryResult ? (
            renderQueryResult()
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No query results yet. Execute a query to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

BIQueryBuilderWithTracking.displayName = 'BIQueryBuilderWithTracking';