# Data Visualization Integration

Complete guide for integrating charts, graphs, and interactive visualizations with the BI Agent using modern React charting libraries and the Components → Hooks → Stores pattern.

## 📊 Visualization Architecture

### Enhanced Store with Chart Data Management

```typescript
// src/stores/visualization-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Chart data types
interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'treemap';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  responsive?: boolean;
  animated?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

interface Visualization {
  id: string;
  title: string;
  description?: string;
  chartType: ChartConfig['type'];
  data: ChartDataPoint[];
  config: ChartConfig;
  query: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublic: boolean;
}

// Dashboard layout
interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  visualizations: Array<{
    visualizationId: string;
    position: { x: number; y: number; w: number; h: number };
    config?: Partial<ChartConfig>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface VisualizationState {
  // Core state
  visualizations: Visualization[];
  dashboards: DashboardLayout[];
  activeVisualization: Visualization | null;
  activeDashboard: DashboardLayout | null;
  
  // UI state
  isGenerating: boolean;
  error: string | null;
  selectedChartType: ChartConfig['type'];
  
  // Export state
  exportFormats: Array<'png' | 'svg' | 'pdf' | 'csv' | 'json'>;
  isExporting: boolean;
  
  // Actions - Visualization Management
  createVisualization: (query: string, chartType: ChartConfig['type'], config?: Partial<ChartConfig>) => Promise<void>;
  updateVisualization: (id: string, updates: Partial<Visualization>) => void;
  deleteVisualization: (id: string) => void;
  duplicateVisualization: (id: string) => void;
  
  // Actions - Dashboard Management
  createDashboard: (name: string, description?: string) => string;
  updateDashboard: (id: string, updates: Partial<DashboardLayout>) => void;
  deleteDashboard: (id: string) => void;
  addVisualizationToDashboard: (dashboardId: string, visualizationId: string, position: { x: number; y: number; w: number; h: number }) => void;
  
  // Actions - Data Processing
  processChartData: (rawData: unknown[], chartType: ChartConfig['type']) => ChartDataPoint[];
  generateChartConfig: (data: ChartDataPoint[], chartType: ChartConfig['type'], options?: Partial<ChartConfig>) => ChartConfig;
  
  // Actions - Export
  exportVisualization: (id: string, format: 'png' | 'svg' | 'pdf' | 'csv' | 'json') => Promise<void>;
  exportDashboard: (id: string, format: 'png' | 'pdf') => Promise<void>;
  
  // Actions - UI
  setActiveVisualization: (id: string | null) => void;
  setActiveDashboard: (id: string | null) => void;
  setSelectedChartType: (type: ChartConfig['type']) => void;
}

export const useVisualizationStore = create<VisualizationState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      visualizations: [],
      dashboards: [],
      activeVisualization: null,
      activeDashboard: null,
      isGenerating: false,
      error: null,
      selectedChartType: 'bar',
      exportFormats: ['png', 'svg', 'pdf', 'csv', 'json'],
      isExporting: false,

      // Visualization Management
      createVisualization: async (query, chartType, config = {}) => {
        try {
          set((state) => {
            state.isGenerating = true;
            state.error = null;
          });

          // Call BI agent for visualization data
          const response = await fetch('http://localhost:4113/api/agents/businessIntelligenceAgent/visualize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              chartType,
              config,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Process the data
          const processedData = get().processChartData(data.data, chartType);
          const chartConfig = get().generateChartConfig(processedData, chartType, {
            title: data.title ?? `${chartType} Chart`,
            ...config,
          });

          const visualization: Visualization = {
            id: `viz-${Date.now()}`,
            title: chartConfig.title,
            description: data.description,
            chartType,
            data: processedData,
            config: chartConfig,
            query,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: data.tags ?? [],
            isPublic: false,
          };

          set((state) => {
            state.visualizations.push(visualization);
            state.activeVisualization = visualization;
            state.isGenerating = false;
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set((state) => {
            state.error = errorMessage;
            state.isGenerating = false;
          });
        }
      },

      updateVisualization: (id, updates) =>
        set((state) => {
          const index = state.visualizations.findIndex(v => v.id === id);
          if (index !== -1) {
            Object.assign(state.visualizations[index], {
              ...updates,
              updatedAt: new Date(),
            });
            
            if (state.activeVisualization?.id === id) {
              state.activeVisualization = state.visualizations[index];
            }
          }
        }),

      deleteVisualization: (id) =>
        set((state) => {
          state.visualizations = state.visualizations.filter(v => v.id !== id);
          if (state.activeVisualization?.id === id) {
            state.activeVisualization = null;
          }
          
          // Remove from dashboards
          state.dashboards.forEach(dashboard => {
            dashboard.visualizations = dashboard.visualizations.filter(
              v => v.visualizationId !== id
            );
          });
        }),

      duplicateVisualization: (id) =>
        set((state) => {
          const original = state.visualizations.find(v => v.id === id);
          if (original) {
            const duplicate: Visualization = {
              ...original,
              id: `viz-${Date.now()}`,
              title: `${original.title} (Copy)`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            state.visualizations.push(duplicate);
          }
        }),

      // Dashboard Management
      createDashboard: (name, description) => {
        const dashboardId = `dashboard-${Date.now()}`;
        
        set((state) => {
          const dashboard: DashboardLayout = {
            id: dashboardId,
            name,
            description,
            visualizations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.dashboards.push(dashboard);
          state.activeDashboard = dashboard;
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
            
            if (state.activeDashboard?.id === id) {
              state.activeDashboard = state.dashboards[index];
            }
          }
        }),

      deleteDashboard: (id) =>
        set((state) => {
          state.dashboards = state.dashboards.filter(d => d.id !== id);
          if (state.activeDashboard?.id === id) {
            state.activeDashboard = null;
          }
        }),

      addVisualizationToDashboard: (dashboardId, visualizationId, position) =>
        set((state) => {
          const dashboard = state.dashboards.find(d => d.id === dashboardId);
          if (dashboard) {
            dashboard.visualizations.push({
              visualizationId,
              position,
            });
            dashboard.updatedAt = new Date();
          }
        }),

      // Data Processing
      processChartData: (rawData, chartType) => {
        if (!Array.isArray(rawData)) return [];

        return rawData.map((item, index) => {
          // Handle different data formats
          if (typeof item === 'object' && item !== null) {
            const keys = Object.keys(item);
            const xKey = keys.find(k => ['x', 'label', 'name', 'date', 'category'].includes(k.toLowerCase())) ?? keys[0];
            const yKey = keys.find(k => ['y', 'value', 'amount', 'count', 'total'].includes(k.toLowerCase())) ?? keys[1];
            
            return {
              x: item[xKey] ?? index,
              y: Number(item[yKey]) ?? 0,
              category: item.category ?? item.group,
              metadata: item,
            };
          }
          
          return {
            x: index,
            y: Number(item) ?? 0,
          };
        });
      },

      generateChartConfig: (data, chartType, options = {}) => {
        const baseConfig: ChartConfig = {
          type: chartType,
          title: options.title ?? `${chartType} Chart`,
          responsive: true,
          animated: true,
          showLegend: true,
          showTooltip: true,
          ...options,
        };

        // Chart-specific configurations
        switch (chartType) {
          case 'line':
          case 'area':
            baseConfig.colors = options.colors ?? ['#3b82f6', '#ef4444', '#10b981'];
            break;
          case 'bar':
            baseConfig.colors = options.colors ?? ['#6366f1'];
            break;
          case 'pie':
            baseConfig.colors = options.colors ?? [
              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'
            ];
            break;
          case 'scatter':
            baseConfig.colors = options.colors ?? ['#ec4899'];
            break;
          case 'heatmap':
            baseConfig.colors = options.colors ?? ['#dbeafe', '#3b82f6', '#1e40af'];
            break;
        }

        return baseConfig;
      },

      // Export Functions
      exportVisualization: async (id, format) => {
        try {
          set((state) => {
            state.isExporting = true;
          });

          const visualization = get().visualizations.find(v => v.id === id);
          if (!visualization) {
            throw new Error('Visualization not found');
          }

          // Implementation would depend on the charting library
          // This is a placeholder for the actual export logic
          await new Promise(resolve => setTimeout(resolve, 1000));

          set((state) => {
            state.isExporting = false;
          });

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Export failed';
            state.isExporting = false;
          });
        }
      },

      exportDashboard: async (id, format) => {
        try {
          set((state) => {
            state.isExporting = true;
          });

          const dashboard = get().dashboards.find(d => d.id === id);
          if (!dashboard) {
            throw new Error('Dashboard not found');
          }

          // Implementation would depend on the charting library
          await new Promise(resolve => setTimeout(resolve, 2000));

          set((state) => {
            state.isExporting = false;
          });

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Export failed';
            state.isExporting = false;
          });
        }
      },

      // UI Actions
      setActiveVisualization: (id) =>
        set((state) => {
          state.activeVisualization = id ? state.visualizations.find(v => v.id === id) ?? null : null;
        }),

      setActiveDashboard: (id) =>
        set((state) => {
          state.activeDashboard = id ? state.dashboards.find(d => d.id === id) ?? null : null;
        }),

      setSelectedChartType: (type) =>
        set((state) => {
          state.selectedChartType = type;
        }),
    })),
    {
      name: 'visualization-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visualizations: state.visualizations,
        dashboards: state.dashboards,
      }),
    }
  )
);

// Optimized selectors
export const useVisualizationList = () =>
  useVisualizationStore((state) => state.visualizations);

export const useDashboardList = () =>
  useVisualizationStore((state) => state.dashboards);

export const useActiveVisualization = () =>
  useVisualizationStore((state) => state.activeVisualization);

export const useActiveDashboard = () =>
  useVisualizationStore((state) => state.activeDashboard);
```

## 🎨 Visualization Hook

### Chart Integration Hook

```typescript
// src/hooks/use-chart-integration.ts
import { useCallback, useMemo } from 'react';
import { useVisualizationStore } from '../stores/visualization-store';

interface ChartOptions {
  width?: number;
  height?: number;
  responsive?: boolean;
  animated?: boolean;
  theme?: 'light' | 'dark';
}

export function useChartIntegration() {
  const {
    visualizations,
    dashboards,
    activeVisualization,
    activeDashboard,
    isGenerating,
    isExporting,
    error,
    selectedChartType,
    createVisualization,
    updateVisualization,
    deleteVisualization,
    duplicateVisualization,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    addVisualizationToDashboard,
    exportVisualization,
    exportDashboard,
    setActiveVisualization,
    setActiveDashboard,
    setSelectedChartType,
  } = useVisualizationStore();

  // Generate visualization from natural language query
  const generateChart = useCallback(async (
    query: string,
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'treemap',
    options: ChartOptions = {}
  ) => {
    const type = chartType ?? selectedChartType;
    
    await createVisualization(query, type, {
      responsive: options.responsive ?? true,
      animated: options.animated ?? true,
    });
  }, [createVisualization, selectedChartType]);

  // Smart chart type suggestion based on data
  const suggestChartType = useCallback((data: unknown[]): Array<{ type: string; confidence: number; reason: string }> => {
    if (!Array.isArray(data) || data.length === 0) {
      return [{ type: 'bar', confidence: 0.5, reason: 'Default fallback' }];
    }

    const suggestions = [];
    const sample = data[0];
    
    if (typeof sample === 'object' && sample !== null) {
      const keys = Object.keys(sample);
      const hasTimeField = keys.some(k => 
        k.toLowerCase().includes('date') || 
        k.toLowerCase().includes('time') ||
        k.toLowerCase().includes('timestamp')
      );
      
      const numericFields = keys.filter(k => typeof sample[k] === 'number').length;
      const categoricalFields = keys.filter(k => typeof sample[k] === 'string').length;

      if (hasTimeField && numericFields >= 1) {
        suggestions.push({ type: 'line', confidence: 0.9, reason: 'Time series data detected' });
        suggestions.push({ type: 'area', confidence: 0.7, reason: 'Good for time series trends' });
      }

      if (categoricalFields >= 1 && numericFields >= 1) {
        suggestions.push({ type: 'bar', confidence: 0.8, reason: 'Categorical data with numeric values' });
        
        if (data.length <= 10) {
          suggestions.push({ type: 'pie', confidence: 0.7, reason: 'Small number of categories' });
        }
      }

      if (numericFields >= 2) {
        suggestions.push({ type: 'scatter', confidence: 0.6, reason: 'Multiple numeric fields for correlation' });
      }

      if (data.length > 100 && numericFields >= 2) {
        suggestions.push({ type: 'heatmap', confidence: 0.5, reason: 'Large dataset with multiple dimensions' });
      }
    }

    return suggestions.length > 0 ? suggestions : [{ type: 'bar', confidence: 0.5, reason: 'Default fallback' }];
  }, []);

  // Chart data transformation utilities
  const transformDataForChart = useCallback((
    data: unknown[],
    chartType: string,
    xField?: string,
    yField?: string
  ) => {
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const keys = Object.keys(item);
        const x = xField ? item[xField] : item[keys[0]] ?? index;
        const y = yField ? item[yField] : item[keys[1]] ?? 0;
        
        return {
          x,
          y: Number(y) || 0,
          label: String(x),
          value: Number(y) || 0,
          category: item.category ?? item.group,
          ...item,
        };
      }
      
      return {
        x: index,
        y: Number(item) || 0,
        label: String(index),
        value: Number(item) || 0,
      };
    });
  }, []);

  // Dashboard utilities
  const createVisualizationDashboard = useCallback(async (
    queries: Array<{ query: string; chartType: string; title?: string }>,
    dashboardName: string
  ) => {
    const dashboardId = createDashboard(dashboardName);
    
    // Create visualizations and add to dashboard
    for (let i = 0; i < queries.length; i++) {
      const { query, chartType, title } = queries[i];
      
      await createVisualization(query, chartType as any, { title });
      
      // Get the latest visualization (just created)
      const latestViz = visualizations[visualizations.length - 1];
      if (latestViz) {
        // Calculate grid position (2 columns)
        const col = i % 2;
        const row = Math.floor(i / 2);
        
        addVisualizationToDashboard(dashboardId, latestViz.id, {
          x: col * 6,
          y: row * 4,
          w: 6,
          h: 4,
        });
      }
    }
    
    return dashboardId;
  }, [createDashboard, createVisualization, addVisualizationToDashboard, visualizations]);

  // Export utilities
  const exportMultipleVisualizations = useCallback(async (
    visualizationIds: string[],
    format: 'png' | 'svg' | 'pdf' | 'csv' | 'json'
  ) => {
    const results = [];
    
    for (const id of visualizationIds) {
      try {
        await exportVisualization(id, format);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ 
          id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Export failed' 
        });
      }
    }
    
    return results;
  }, [exportVisualization]);

  // Chart configuration helpers
  const chartTypeOptions = useMemo(() => [
    { value: 'bar', label: 'Bar Chart', icon: '📊', description: 'Compare categories' },
    { value: 'line', label: 'Line Chart', icon: '📈', description: 'Show trends over time' },
    { value: 'pie', label: 'Pie Chart', icon: '🥧', description: 'Show proportions' },
    { value: 'area', label: 'Area Chart', icon: '🏔️', description: 'Filled line chart' },
    { value: 'scatter', label: 'Scatter Plot', icon: '⚪', description: 'Show correlations' },
    { value: 'heatmap', label: 'Heatmap', icon: '🔥', description: 'Show intensity patterns' },
    { value: 'treemap', label: 'Treemap', icon: '🌳', description: 'Hierarchical data' },
  ], []);

  const colorSchemes = useMemo(() => ({
    default: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
    business: ['#1e40af', '#dc2626', '#059669', '#d97706', '#7c3aed'],
    pastel: ['#93c5fd', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd'],
    monochrome: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'],
  }), []);

  return {
    // State
    visualizations,
    dashboards,
    activeVisualization,
    activeDashboard,
    isGenerating,
    isExporting,
    error,
    selectedChartType,
    
    // Chart generation
    generateChart,
    suggestChartType,
    transformDataForChart,
    
    // Visualization management
    updateVisualization,
    deleteVisualization,
    duplicateVisualization,
    setActiveVisualization,
    
    // Dashboard management
    createVisualizationDashboard,
    updateDashboard,
    deleteDashboard,
    setActiveDashboard,
    
    // Export
    exportVisualization,
    exportDashboard,
    exportMultipleVisualizations,
    
    // UI helpers
    setSelectedChartType,
    chartTypeOptions,
    colorSchemes,
  };
}
```

## 📈 Chart Components

### Universal Chart Component

```typescript
// src/components/UniversalChart.tsx
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartData {
  x: string | number | Date;
  y: number;
  category?: string;
  [key: string]: unknown;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'treemap';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  responsive?: boolean;
  animated?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

interface UniversalChartProps {
  data: ChartData[];
  config: ChartConfig;
  width?: number;
  height?: number;
  className?: string;
}

export function UniversalChart({ 
  data, 
  config, 
  width, 
  height = 400, 
  className 
}: UniversalChartProps) {
  // Transform data for different chart types
  const chartData = useMemo(() => {
    switch (config.type) {
      case 'pie':
        return data.map((item, index) => ({
          name: String(item.x),
          value: item.y,
          fill: config.colors?.[index % (config.colors?.length ?? 1)] ?? `hsl(${index * 45}, 70%, 50%)`,
        }));
      
      default:
        return data.map(item => ({
          x: item.x,
          y: item.y,
          name: String(item.x),
          value: item.y,
          category: item.category,
        }));
    }
  }, [data, config]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (config.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            {config.showTooltip && <Tooltip />}
            {config.showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey="y" 
              stroke={config.colors?.[0] ?? '#3b82f6'}
              strokeWidth={2}
              dot={{ fill: config.colors?.[0] ?? '#3b82f6' }}
              animationDuration={config.animated ? 1000 : 0}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x"
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            {config.showTooltip && <Tooltip />}
            {config.showLegend && <Legend />}
            <Bar 
              dataKey="y" 
              fill={config.colors?.[0] ?? '#3b82f6'}
              animationDuration={config.animated ? 1000 : 0}
            />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x"
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            {config.showTooltip && <Tooltip />}
            {config.showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey="y" 
              stroke={config.colors?.[0] ?? '#3b82f6'}
              fill={config.colors?.[0] ?? '#3b82f6'}
              fillOpacity={0.6}
              animationDuration={config.animated ? 1000 : 0}
            />
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x"
              label={{ value: config.xAxisLabel, position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            {config.showTooltip && <Tooltip />}
            {config.showLegend && <Legend />}
            <Scatter 
              dataKey="y" 
              fill={config.colors?.[0] ?? '#ec4899'}
              animationDuration={config.animated ? 1000 : 0}
            />
          </ScatterChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            {config.showTooltip && <Tooltip />}
            {config.showLegend && <Legend />}
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height * 0.3, 120)}
              dataKey="value"
              animationDuration={config.animated ? 1000 : 0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Chart type "{config.type}" not supported
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className ?? ''}`}>
      {/* Chart Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
      </div>

      {/* Chart Container */}
      <div style={{ width: width ?? '100%', height }}>
        {config.responsive ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
```

### Chart Gallery Component

```typescript
// src/components/ChartGallery.tsx
import React, { useState } from 'react