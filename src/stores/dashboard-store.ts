/**
 * Dashboard Store for Business Intelligence Data
 * Manages business metrics, analytics, and dashboard state using Zustand
 * 
 * NOTE: Store has been reset to minimal state pending future implementation
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
  OperationalRisk
} from '@/types/business-intelligence';

/**
 * Create the dashboard store with persistence
 * All state has been cleared to null/empty arrays
 */
export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      // State - All cleared to minimal values
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

      // Actions - Cleared implementations
      loadDashboard: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      refreshDashboard: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      loadOrderAnalytics: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      loadTechnicianPerformance: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      loadCustomerComplaints: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      loadRevenueAnalysis: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
      },

      loadOperationalRisks: async () => {
        set({ isLoading: true, error: null });
        set({ isLoading: false });
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