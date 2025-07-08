/**
 * Dashboard Store for Business Intelligence Data
 * Manages business metrics, analytics, and dashboard state using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DashboardStore,
  DashboardData,
  OrderAnalytics,
  TechnicianPerformance,
  CustomerComplaint,
  RevenueAnalysis,
  OperationalRisk,
  BusinessMetric,
  ChartData,
  BusinessAlert
} from '@/types/business-intelligence';

/**
 * Mock data generators for development
 * In production, these would be replaced with actual API calls
 */
const generateMockOrderAnalytics = (): OrderAnalytics => ({
  totalOrders: 1247,
  completedOrders: 1089,
  pendingOrders: 158,
  cancelledOrders: 23,
  averageOrderValue: 485.50,
  orderTrends: {
    id: 'order-trends',
    title: 'Order Trends (Last 30 Days)',
    type: 'line',
    data: Array.from({ length: 30 }, (_, i) => ({
      x: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      y: Math.floor(Math.random() * 50) + 20
    })),
    xAxisLabel: 'Date',
    yAxisLabel: 'Orders'
  },
  topServices: [
    { serviceName: 'HVAC Repair', orderCount: 342, revenue: 165840, averageCompletionTime: 2.5, customerSatisfaction: 4.6 },
    { serviceName: 'Plumbing', orderCount: 298, revenue: 144520, averageCompletionTime: 1.8, customerSatisfaction: 4.4 },
    { serviceName: 'Electrical', orderCount: 267, revenue: 129465, averageCompletionTime: 2.1, customerSatisfaction: 4.5 },
    { serviceName: 'Appliance Repair', orderCount: 182, revenue: 88360, averageCompletionTime: 1.5, customerSatisfaction: 4.3 }
  ]
});

const generateMockTechnicianPerformance = (): TechnicianPerformance[] => [
  {
    technicianId: 'tech-001',
    name: 'John Smith',
    completedJobs: 89,
    averageRating: 4.7,
    onTimePercentage: 94,
    issuesReported: 2,
    revenueGenerated: 43250,
    efficiency: 92
  },
  {
    technicianId: 'tech-002',
    name: 'Sarah Johnson',
    completedJobs: 76,
    averageRating: 4.8,
    onTimePercentage: 97,
    issuesReported: 1,
    revenueGenerated: 38900,
    efficiency: 95
  },
  {
    technicianId: 'tech-003',
    name: 'Mike Davis',
    completedJobs: 82,
    averageRating: 4.5,
    onTimePercentage: 89,
    issuesReported: 4,
    revenueGenerated: 39840,
    efficiency: 87
  }
];

const generateMockCustomerComplaints = (): CustomerComplaint[] => [
  {
    id: 'complaint-001',
    customerId: 'cust-123',
    customerName: 'Robert Wilson',
    complaintType: 'Service Quality',
    severity: 'medium',
    description: 'Technician arrived late and work quality was below expectations',
    status: 'investigating',
    createdAt: new Date('2025-01-03'),
    assignedTo: 'manager-001'
  },
  {
    id: 'complaint-002',
    customerId: 'cust-456',
    customerName: 'Lisa Brown',
    complaintType: 'Billing Issue',
    severity: 'low',
    description: 'Discrepancy in final invoice amount',
    status: 'resolved',
    createdAt: new Date('2025-01-02'),
    resolvedAt: new Date('2025-01-04'),
    assignedTo: 'billing-team'
  },
  {
    id: 'complaint-003',
    customerId: 'cust-789',
    customerName: 'David Martinez',
    complaintType: 'Equipment Damage',
    severity: 'high',
    description: 'Property damage occurred during service call',
    status: 'open',
    createdAt: new Date('2025-01-04'),
    assignedTo: 'supervisor-001'
  }
];

const generateMockRevenueAnalysis = (): RevenueAnalysis => ({
  totalRevenue: 485750,
  monthlyRevenue: {
    id: 'monthly-revenue',
    title: 'Monthly Revenue',
    type: 'bar',
    data: [
      { x: 'Jan', y: 485750 },
      { x: 'Dec', y: 467200 },
      { x: 'Nov', y: 452800 },
      { x: 'Oct', y: 478900 },
      { x: 'Sep', y: 461300 },
      { x: 'Aug', y: 489600 }
    ],
    xAxisLabel: 'Month',
    yAxisLabel: 'Revenue ($)'
  },
  quarterlyRevenue: {
    id: 'quarterly-revenue',
    title: 'Quarterly Revenue',
    type: 'line',
    data: [
      { x: 'Q1 2024', y: 1425600 },
      { x: 'Q2 2024', y: 1389200 },
      { x: 'Q3 2024', y: 1456800 },
      { x: 'Q4 2024', y: 1405750 }
    ],
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($)'
  },
  revenueByService: {
    id: 'revenue-by-service',
    title: 'Revenue by Service Type',
    type: 'pie',
    data: [
      { x: 'HVAC', y: 165840 },
      { x: 'Plumbing', y: 144520 },
      { x: 'Electrical', y: 129465 },
      { x: 'Appliance', y: 88360 }
    ]
  },
  profitMargin: 23.5,
  growthRate: 8.2
});

const generateMockOperationalRisks = (): OperationalRisk[] => [
  {
    id: 'risk-001',
    riskType: 'Staff Shortage',
    description: 'Potential shortage of certified technicians during peak season',
    probability: 'medium',
    impact: 'high',
    riskScore: 6,
    mitigationStrategy: 'Hire and train additional technicians, establish contractor partnerships',
    owner: 'HR Manager',
    dueDate: new Date('2025-03-01')
  },
  {
    id: 'risk-002',
    riskType: 'Equipment Failure',
    description: 'Aging fleet vehicles may require significant maintenance',
    probability: 'high',
    impact: 'medium',
    riskScore: 6,
    mitigationStrategy: 'Implement preventive maintenance schedule, budget for replacements',
    owner: 'Operations Manager',
    dueDate: new Date('2025-02-15')
  },
  {
    id: 'risk-003',
    riskType: 'Supply Chain',
    description: 'Potential delays in parts availability from key suppliers',
    probability: 'low',
    impact: 'medium',
    riskScore: 3,
    mitigationStrategy: 'Diversify supplier base, maintain higher inventory levels',
    owner: 'Procurement Manager',
    dueDate: new Date('2025-04-01')
  }
];

const generateMockDashboard = (): DashboardData => {
  const orderAnalytics = generateMockOrderAnalytics();
  const revenueAnalysis = generateMockRevenueAnalysis();
  
  return {
    id: 'main-dashboard',
    title: 'Business Intelligence Dashboard',
    description: 'Comprehensive view of business operations and performance',
    lastUpdated: new Date(),
    metrics: [
      {
        id: 'total-orders',
        name: 'Total Orders',
        value: orderAnalytics.totalOrders,
        unit: 'orders',
        trend: 'up',
        trendPercentage: 12.5,
        category: 'orders',
        description: 'Total orders this month',
        lastUpdated: new Date()
      },
      {
        id: 'total-revenue',
        name: 'Total Revenue',
        value: revenueAnalysis.totalRevenue,
        unit: '$',
        trend: 'up',
        trendPercentage: 8.2,
        category: 'revenue',
        description: 'Total revenue this month',
        lastUpdated: new Date()
      },
      {
        id: 'avg-order-value',
        name: 'Average Order Value',
        value: orderAnalytics.averageOrderValue,
        unit: '$',
        trend: 'stable',
        category: 'orders',
        description: 'Average value per order',
        lastUpdated: new Date()
      },
      {
        id: 'profit-margin',
        name: 'Profit Margin',
        value: revenueAnalysis.profitMargin,
        unit: '%',
        trend: 'up',
        trendPercentage: 2.1,
        category: 'revenue',
        description: 'Current profit margin',
        lastUpdated: new Date()
      }
    ],
    charts: [
      orderAnalytics.orderTrends,
      revenueAnalysis.monthlyRevenue,
      revenueAnalysis.revenueByService
    ],
    alerts: [
      {
        id: 'alert-001',
        title: 'High Priority Complaint',
        message: 'Equipment damage complaint requires immediate attention',
        severity: 'high',
        category: 'customer',
        timestamp: new Date(),
        resolved: false,
        actionRequired: 'Contact customer and insurance provider'
      },
      {
        id: 'alert-002',
        title: 'Technician Performance',
        message: 'Mike Davis has 4 reported issues this month',
        severity: 'medium',
        category: 'performance',
        timestamp: new Date(),
        resolved: false,
        actionRequired: 'Schedule performance review'
      }
    ]
  };
};

/**
 * Create the dashboard store with persistence
 */
export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // State
      dashboards: [],
      currentDashboard: null,
      orderAnalytics: null,
      technicianPerformance: [],
      customerComplaints: [],
      revenueAnalysis: null,
      operationalRisks: [],
      isLoading: false,
      error: null,
      lastRefresh: null,

      // Actions
      loadDashboard: async (dashboardId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const dashboard = generateMockDashboard();
          
          set({
            currentDashboard: dashboard,
            dashboards: [dashboard],
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
          set({ error: errorMessage, isLoading: false });
        }
      },

      refreshDashboard: async () => {
        const { currentDashboard } = get();
        if (currentDashboard) {
          await get().loadDashboard(currentDashboard.id);
        }
      },

      loadOrderAnalytics: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const analytics = generateMockOrderAnalytics();
          
          set({
            orderAnalytics: analytics,
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load order analytics';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadTechnicianPerformance: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const performance = generateMockTechnicianPerformance();
          
          set({
            technicianPerformance: performance,
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load technician performance';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadCustomerComplaints: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const complaints = generateMockCustomerComplaints();
          
          set({
            customerComplaints: complaints,
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load customer complaints';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadRevenueAnalysis: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const revenue = generateMockRevenueAnalysis();
          
          set({
            revenueAnalysis: revenue,
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load revenue analysis';
          set({ error: errorMessage, isLoading: false });
        }
      },

      loadOperationalRisks: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const risks = generateMockOperationalRisks();
          
          set({
            operationalRisks: risks,
            isLoading: false,
            lastRefresh: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load operational risks';
          set({ error: errorMessage, isLoading: false });
        }
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'dashboard-store',
      partialize: (state) => ({
        dashboards: state.dashboards,
        currentDashboard: state.currentDashboard,
        lastRefresh: state.lastRefresh
      })
    }
  )
);

/**
 * Custom hooks for accessing dashboard store data
 * Following the project's Zustand patterns
 */

export const useDashboardData = () => {
  const currentDashboard = useDashboardStore(state => state.currentDashboard);
  const isLoading = useDashboardStore(state => state.isLoading);
  const error = useDashboardStore(state => state.error);
  const lastRefresh = useDashboardStore(state => state.lastRefresh);
  
  return { currentDashboard, isLoading, error, lastRefresh };
};

export const useOrderAnalytics = () => {
  const orderAnalytics = useDashboardStore(state => state.orderAnalytics);
  const loadOrderAnalytics = useDashboardStore(state => state.loadOrderAnalytics);
  const isLoading = useDashboardStore(state => state.isLoading);
  
  return { orderAnalytics, loadOrderAnalytics, isLoading };
};

export const useTechnicianPerformance = () => {
  const technicianPerformance = useDashboardStore(state => state.technicianPerformance);
  const loadTechnicianPerformance = useDashboardStore(state => state.loadTechnicianPerformance);
  const isLoading = useDashboardStore(state => state.isLoading);
  
  return { technicianPerformance, loadTechnicianPerformance, isLoading };
};

export const useCustomerComplaints = () => {
  const customerComplaints = useDashboardStore(state => state.customerComplaints);
  const loadCustomerComplaints = useDashboardStore(state => state.loadCustomerComplaints);
  const isLoading = useDashboardStore(state => state.isLoading);
  
  return { customerComplaints, loadCustomerComplaints, isLoading };
};

export const useRevenueAnalysis = () => {
  const revenueAnalysis = useDashboardStore(state => state.revenueAnalysis);
  const loadRevenueAnalysis = useDashboardStore(state => state.loadRevenueAnalysis);
  const isLoading = useDashboardStore(state => state.isLoading);
  
  return { revenueAnalysis, loadRevenueAnalysis, isLoading };
};

export const useOperationalRisks = () => {
  const operationalRisks = useDashboardStore(state => state.operationalRisks);
  const loadOperationalRisks = useDashboardStore(state => state.loadOperationalRisks);
  const isLoading = useDashboardStore(state => state.isLoading);
  
  return { operationalRisks, loadOperationalRisks, isLoading };
};

export const useDashboardActions = () => {
  const loadDashboard = useDashboardStore(state => state.loadDashboard);
  const refreshDashboard = useDashboardStore(state => state.refreshDashboard);
  const setError = useDashboardStore(state => state.setError);
  const clearError = useDashboardStore(state => state.clearError);
  
  return { loadDashboard, refreshDashboard, setError, clearError };
};