/**
 * TypeScript type definitions for Business Intelligence features
 * Defines interfaces for dashboard data, analytics, and business metrics
 */

/**
 * Business Intelligence Dashboard Data
 */
export interface DashboardData {
  id: string;
  title: string;
  description?: string;
  lastUpdated: Date;
  metrics: BusinessMetric[];
  charts: ChartData[];
  alerts: BusinessAlert[];
}

/**
 * Business Metric Definition
 */
export interface BusinessMetric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  category: 'orders' | 'revenue' | 'performance' | 'risk' | 'customer';
  description?: string;
  lastUpdated: Date;
}

/**
 * Chart Data for Business Visualizations
 */
export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
}

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * Business Alert/Risk Assessment
 */
export interface BusinessAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'operational' | 'financial' | 'customer' | 'performance';
  timestamp: Date;
  resolved: boolean;
  actionRequired?: string;
}

/**
 * Order Analytics Data
 */
export interface OrderAnalytics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  orderTrends: ChartData;
  topServices: ServiceMetric[];
}

/**
 * Service Performance Metric
 */
export interface ServiceMetric {
  serviceName: string;
  orderCount: number;
  revenue: number;
  averageCompletionTime: number;
  customerSatisfaction?: number;
}

/**
 * Technician Performance Data
 */
export interface TechnicianPerformance {
  technicianId: string;
  name: string;
  completedJobs: number;
  averageRating: number;
  onTimePercentage: number;
  issuesReported: number;
  revenueGenerated: number;
  efficiency: number;
}

/**
 * Customer Complaint Analysis
 */
export interface CustomerComplaint {
  id: string;
  customerId: string;
  customerName: string;
  complaintType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
}

/**
 * Revenue Analysis Data
 */
export interface RevenueAnalysis {
  totalRevenue: number;
  monthlyRevenue: ChartData;
  quarterlyRevenue: ChartData;
  revenueByService: ChartData;
  profitMargin: number;
  growthRate: number;
}

/**
 * Operational Risk Assessment
 */
export interface OperationalRisk {
  id: string;
  riskType: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskScore: number;
  mitigationStrategy?: string;
  owner?: string;
  dueDate?: Date;
}

/**
 * Dashboard Store State
 */
export interface DashboardState {
  dashboards: DashboardData[];
  currentDashboard: DashboardData | null;
  orderAnalytics: OrderAnalytics | null;
  technicianPerformance: TechnicianPerformance[];
  customerComplaints: CustomerComplaint[];
  revenueAnalysis: RevenueAnalysis | null;
  operationalRisks: OperationalRisk[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

/**
 * Dashboard Store Actions
 */
export interface DashboardActions {
  loadDashboard: (dashboardId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  loadOrderAnalytics: () => Promise<void>;
  loadTechnicianPerformance: () => Promise<void>;
  loadCustomerComplaints: () => Promise<void>;
  loadRevenueAnalysis: () => Promise<void>;
  loadOperationalRisks: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Complete Dashboard Store Interface
 */
export interface DashboardStore extends DashboardState, DashboardActions {}

/**
 * Chat History Entry
 */
export interface ChatHistoryEntry {
  id: string;
  threadId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  category?: 'analytics' | 'support' | 'general';
}

/**
 * Persistent Chat Store State
 */
export interface PersistentChatState {
  history: ChatHistoryEntry[];
  favorites: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastSyncTimestamp: Date | null;
  userMemories: import('@/types/memory').UserMemory[];
}

/**
 * Persistent Chat Store Actions
 */
export interface PersistentChatActions {
  addToHistory: (entry: ChatHistoryEntry) => void;
  removeFromHistory: (entryId: string) => void;
  toggleFavorite: (entryId: string) => void;
  searchHistory: (query: string) => void;
  clearHistory: () => void;
  loadHistory: () => Promise<void>;
  setError: (error: string | null) => void;
  initializeWithMastraData: (userId: string) => Promise<void>;
}

/**
 * Complete Persistent Chat Store Interface
 */
export interface PersistentChatStore extends PersistentChatState, PersistentChatActions {}

/**
 * Business Intelligence Query Types
 */
export type BusinessQueryType = 
  | 'order_analytics'
  | 'technician_performance'
  | 'customer_complaints'
  | 'operational_risks'
  | 'revenue_analysis'
  | 'general_business';

/**
 * Business Intelligence Context for Mastra
 */
export interface BusinessContext {
  userId: string;
  userRole: string;
  companyId?: string;
  permissions: string[];
  preferences: {
    defaultDashboard?: string;
    refreshInterval?: number;
    timezone?: string;
  };
}