/**
 * Dashboard Data Service
 * 
 * Service for fetching business metrics data from Supabase
 * Provides strongly typed queries for orders, patients, cases, and revenue analytics
 */

import { supabase } from '@/lib/supabase';
import type {
  OrdersAnalytics,
  PatientsAnalytics,
  CasesAnalytics,
  RevenueAnalytics,
  DashboardData,
  OrdersQueryParams,
  PatientsQueryParams,
  CasesQueryParams,
  RevenueQueryParams,
  AnalyticsResult,
  DashboardError,
  TimeRange,
} from '@/types/dashboard';
import type { Database } from '@/types/database';

/**
 * Dashboard Data Service Class
 */
export class DashboardDataService {
  /**
   * Create error object
   */
  private createError(
    type: DashboardError['type'],
    message: string,
    details?: Record<string, unknown>
  ): DashboardError {
    return {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable: type !== 'permission',
    };
  }

  /**
   * Create analytics metadata
   */
  private createMetadata(
    timeRange: TimeRange,
    recordCount: number,
    executionTime: number
  ) {
    return {
      generatedAt: new Date(),
      timeRange,
      recordCount,
      executionTime,
    };
  }

  // ============================================================================
  // Orders Analytics
  // ============================================================================

  /**
   * Get orders analytics data
   */
  async getOrdersAnalytics(params?: OrdersQueryParams): Promise<AnalyticsResult<OrdersAnalytics>> {
    const startTime = Date.now();
    
    try {
      // Build query with filters
      let query = supabase.from('orders').select('*');

      // Apply time range filter
      if (params?.timeRange) {
        query = query
          .gte('created_at', params.timeRange.start.toISOString())
          .lte('created_at', params.timeRange.end.toISOString());
      }
      
      if (params?.statuses?.length) {
        query = query.in('status', params.statuses);
      }
      
      if (params?.courseTypes?.length) {
        query = query.in('course_type', params.courseTypes);
      }
      
      if (params?.officeIds?.length) {
        query = query.in('office_id', params.officeIds);
      }
      
      if (params?.doctorIds?.length) {
        query = query.in('doctor_id', params.doctorIds);
      }

      if (params?.minAmount) {
        query = query.gte('amount', params.minAmount);
      }
      
      if (params?.maxAmount) {
        query = query.lte('amount', params.maxAmount);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw this.createError('query', `Failed to fetch orders: ${error.message}`, { error });
      }

      if (!orders) {
        throw this.createError('query', 'No orders data returned');
      }

      // Calculate analytics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const completedOrders = orders.filter(order => 
        order.status === 'shipped' || order.status === 'approved'
      ).length;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      orders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as Database['public']['Enums']['order_status'],
        count,
        percentage: (count / totalOrders) * 100,
        totalAmount: orders
          .filter(order => order.status === status)
          .reduce((sum, order) => sum + (order.amount || 0), 0),
      }));

      // Top doctors and offices (simplified)
      const doctorStats: Record<string, { doctorId: string; doctorName: string; orderCount: number; revenue: number }> = {};
      const officeStats: Record<string, { officeId: string; officeName: string; orderCount: number; revenue: number }> = {};

      orders.forEach(order => {
        // Doctor stats
        const doctorId = order.doctor_id;
        if (!doctorStats[doctorId]) {
          doctorStats[doctorId] = {
            doctorId,
            doctorName: `Doctor ${doctorId.slice(0, 8)}`,
            orderCount: 0,
            revenue: 0,
          };
        }
        doctorStats[doctorId].orderCount++;
        doctorStats[doctorId].revenue += order.amount || 0;

        // Office stats
        if (order.office_id) {
          const officeId = order.office_id;
          if (!officeStats[officeId]) {
            officeStats[officeId] = {
              officeId,
              officeName: `Office ${officeId.slice(0, 8)}`,
              orderCount: 0,
              revenue: 0,
            };
          }
          officeStats[officeId].orderCount++;
          officeStats[officeId].revenue += order.amount || 0;
        }
      });

      const analytics: OrdersAnalytics = {
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          completionRate,
        },
        statusDistribution,
        trends: [], // Would be calculated with time-series data
        topDoctors: Object.values(doctorStats).slice(0, 10),
        topOffices: Object.values(officeStats).slice(0, 10),
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          totalOrders,
          Date.now() - startTime
        ),
      };

      return {
        success: true,
        data: analytics,
        metadata: analytics.metadata,
      };
    } catch (error) {
      const dashboardError = this.isDashboardError(error) 
        ? error
        : this.createError('query', error instanceof Error ? error.message : 'Unknown error', { error });

      return {
        success: false,
        error: dashboardError,
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          0,
          Date.now() - startTime
        ),
      };
    }
  }

  // ============================================================================
  // Patients Analytics
  // ============================================================================

  /**
   * Get patients analytics data
   */
  async getPatientsAnalytics(params?: PatientsQueryParams): Promise<AnalyticsResult<PatientsAnalytics>> {
    const startTime = Date.now();
    
    try {
      let query = supabase.from('patients').select('*');

      // Apply filters
      if (params?.timeRange) {
        query = query
          .gte('enrolled_at', params.timeRange.start.toISOString())
          .lte('enrolled_at', params.timeRange.end.toISOString());
      }
      
      if (params?.statuses?.length) {
        query = query.in('status', params.statuses);
      }
      
      if (params?.officeIds?.length) {
        query = query.in('assigned_office_id', params.officeIds);
      }

      const { data: patients, error } = await query;

      if (error) {
        throw this.createError('query', `Failed to fetch patients: ${error.message}`, { error });
      }

      if (!patients) {
        throw this.createError('query', 'No patients data returned');
      }

      // Calculate analytics
      const totalPatients = patients.length;
      const activePatients = patients.filter(p => 
        p.status === 'active' || p.status === 'in_treatment'
      ).length;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newPatientsThisMonth = patients.filter(p => {
        if (!p.enrolled_at) return false;
        const enrolledDate = new Date(p.enrolled_at);
        return enrolledDate >= thisMonth;
      }).length;

      // Status distribution
      const statusCounts: Record<string, number> = {};
      patients.forEach(patient => {
        const status = patient.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as Database['public']['Enums']['patient_status_type'],
        count,
        percentage: (count / totalPatients) * 100,
      }));

      const analytics: PatientsAnalytics = {
        summary: {
          totalPatients,
          activePatients,
          newPatientsThisMonth,
          averageTreatmentDuration: 12, // Would be calculated from actual data
        },
        statusDistribution,
        demographics: {
          ageGroups: [], // Would be calculated from date_of_birth
          genderDistribution: [], // Would be calculated from sex field
          geographicDistribution: [], // Would be calculated from office locations
        },
        enrollmentTrends: [], // Would be calculated with time-series data
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          totalPatients,
          Date.now() - startTime
        ),
      };

      return {
        success: true,
        data: analytics,
        metadata: analytics.metadata,
      };
    } catch (error) {
      const dashboardError = this.isDashboardError(error) 
        ? error
        : this.createError('query', error instanceof Error ? error.message : 'Unknown error', { error });

      return {
        success: false,
        error: dashboardError,
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          0,
          Date.now() - startTime
        ),
      };
    }
  }

  // ============================================================================
  // Cases Analytics
  // ============================================================================

  /**
   * Get cases analytics data
   */
  async getCasesAnalytics(params?: CasesQueryParams): Promise<AnalyticsResult<CasesAnalytics>> {
    const startTime = Date.now();
    
    try {
      let query = supabase.from('cases').select('*');

      // Apply filters
      if (params?.timeRange) {
        query = query
          .gte('created_at', params.timeRange.start.toISOString())
          .lte('created_at', params.timeRange.end.toISOString());
      }
      
      if (params?.statuses?.length) {
        query = query.in('status', params.statuses);
      }
      
      if (params?.complexities?.length) {
        query = query.in('complexity', params.complexities);
      }

      const { data: cases, error } = await query;

      if (error) {
        throw this.createError('query', `Failed to fetch cases: ${error.message}`, { error });
      }

      if (!cases) {
        throw this.createError('query', 'No cases data returned');
      }

      // Calculate analytics
      const totalCases = cases.length;
      const activeCases = cases.filter(c => 
        c.status === 'active' || c.status === 'treatment_plan'
      ).length;
      const completedCases = cases.filter(c => c.status === 'completed').length;
      
      // Calculate average treatment duration
      const casesWithDuration = cases.filter(c => c.actual_duration_months);
      const averageTreatmentDuration = casesWithDuration.length > 0
        ? casesWithDuration.reduce((sum, c) => sum + (c.actual_duration_months || 0), 0) / casesWithDuration.length
        : 0;

      // Complexity distribution
      const complexityCounts: Record<string, number> = {};
      cases.forEach(case_ => {
        const complexity = case_.complexity || 'simple';
        complexityCounts[complexity] = (complexityCounts[complexity] || 0) + 1;
      });

      const complexityDistribution = Object.entries(complexityCounts).map(([complexity, count]) => ({
        complexity: complexity as Database['public']['Enums']['case_complexity_type'],
        count,
        percentage: (count / totalCases) * 100,
        averageDuration: cases
          .filter(c => c.complexity === complexity && c.actual_duration_months)
          .reduce((sum, c, _, arr) => sum + (c.actual_duration_months || 0) / arr.length, 0),
      }));

      // Status distribution
      const statusCounts: Record<string, number> = {};
      cases.forEach(case_ => {
        const status = case_.status || 'consultation';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as Database['public']['Enums']['case_status_type'],
        count,
        percentage: (count / totalCases) * 100,
      }));

      const analytics: CasesAnalytics = {
        summary: {
          totalCases,
          activeCases,
          completedCases,
          averageTreatmentDuration,
        },
        complexityDistribution,
        statusDistribution,
        successMetrics: {
          completionRate: totalCases > 0 ? (completedCases / totalCases) * 100 : 0,
          averageTreatmentTime: averageTreatmentDuration,
          refinementRate: 15, // Would be calculated from actual refinement data
          patientSatisfactionScore: 4.2, // Would come from feedback data
        },
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          totalCases,
          Date.now() - startTime
        ),
      };

      return {
        success: true,
        data: analytics,
        metadata: analytics.metadata,
      };
    } catch (error) {
      const dashboardError = this.isDashboardError(error) 
        ? error
        : this.createError('query', error instanceof Error ? error.message : 'Unknown error', { error });

      return {
        success: false,
        error: dashboardError,
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          0,
          Date.now() - startTime
        ),
      };
    }
  }

  // ============================================================================
  // Revenue Analytics
  // ============================================================================

  /**
   * Get revenue analytics data
   */
  async getRevenueAnalytics(params?: RevenueQueryParams): Promise<AnalyticsResult<RevenueAnalytics>> {
    const startTime = Date.now();
    
    try {
      let query = supabase.from('payments').select('*');

      // Apply filters
      if (params?.timeRange) {
        query = query
          .gte('created_at', params.timeRange.start.toISOString())
          .lte('created_at', params.timeRange.end.toISOString());
      }
      
      if (params?.paymentStatuses?.length) {
        query = query.in('status', params.paymentStatuses);
      }
      
      if (params?.minAmount) {
        query = query.gte('amount', params.minAmount);
      }
      
      if (params?.maxAmount) {
        query = query.lte('amount', params.maxAmount);
      }

      const { data: payments, error } = await query;

      if (error) {
        throw this.createError('query', `Failed to fetch payments: ${error.message}`, { error });
      }

      if (!payments) {
        throw this.createError('query', 'No payments data returned');
      }

      // Calculate analytics
      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const paidRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);
      const pendingRevenue = payments
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const totalPayments = payments.length;
      const averageOrderValue = totalPayments > 0 ? totalRevenue / totalPayments : 0;

      // Payment status distribution
      const statusCounts: Record<string, number> = {};
      payments.forEach(payment => {
        statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
      });

      const paymentStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as Database['public']['Enums']['payment_status'],
        count,
        totalAmount: payments
          .filter(p => p.status === status)
          .reduce((sum, payment) => sum + payment.amount, 0),
        percentage: (count / totalPayments) * 100,
      }));

      const analytics: RevenueAnalytics = {
        summary: {
          totalRevenue,
          paidRevenue,
          pendingRevenue,
          averageOrderValue,
          monthlyGrowthRate: 0, // Would be calculated from historical data
        },
        revenueByPeriod: [], // Would be calculated with time-series grouping
        paymentStatusDistribution,
        revenueByOffice: [], // Would be calculated from office data
        revenueByDoctor: [], // Would be calculated from doctor data
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          totalPayments,
          Date.now() - startTime
        ),
      };

      return {
        success: true,
        data: analytics,
        metadata: analytics.metadata,
      };
    } catch (error) {
      const dashboardError = this.isDashboardError(error) 
        ? error
        : this.createError('query', error instanceof Error ? error.message : 'Unknown error', { error });

      return {
        success: false,
        error: dashboardError,
        metadata: this.createMetadata(
          params?.timeRange || { start: new Date(0), end: new Date() },
          0,
          Date.now() - startTime
        ),
      };
    }
  }

  // ============================================================================
  // Combined Dashboard Data
  // ============================================================================

  /**
   * Get complete dashboard data
   */
  async getDashboardData(
    ordersParams?: OrdersQueryParams,
    patientsParams?: PatientsQueryParams,
    casesParams?: CasesQueryParams,
    revenueParams?: RevenueQueryParams
  ): Promise<AnalyticsResult<DashboardData>> {
    const startTime = Date.now();
    
    try {
      // Fetch all analytics in parallel
      const [ordersResult, patientsResult, casesResult, revenueResult] = await Promise.all([
        this.getOrdersAnalytics(ordersParams),
        this.getPatientsAnalytics(patientsParams),
        this.getCasesAnalytics(casesParams),
        this.getRevenueAnalytics(revenueParams),
      ]);

      // Check for any failures
      const failures = [ordersResult, patientsResult, casesResult, revenueResult]
        .filter(result => !result.success);

      if (failures.length > 0) {
        const errorMessages = failures
          .map(f => f.error?.message)
          .filter(Boolean)
          .join('; ');
        
        throw this.createError('query', `Failed to fetch dashboard data: ${errorMessages}`);
      }

      const dashboardData: DashboardData = {
        orders: ordersResult.data!,
        patients: patientsResult.data!,
        cases: casesResult.data!,
        revenue: revenueResult.data!,
        lastUpdated: new Date(),
        refreshInterval: 300000, // 5 minutes
      };

      return {
        success: true,
        data: dashboardData,
        metadata: this.createMetadata(
          { start: new Date(0), end: new Date() },
          ordersResult.data!.summary.totalOrders + patientsResult.data!.summary.totalPatients,
          Date.now() - startTime
        ),
      };
    } catch (error) {
      const dashboardError = this.isDashboardError(error) 
        ? error
        : this.createError('query', error instanceof Error ? error.message : 'Unknown error', { error });

      return {
        success: false,
        error: dashboardError,
        metadata: this.createMetadata(
          { start: new Date(0), end: new Date() },
          0,
          Date.now() - startTime
        ),
      };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Type guard to check if error is a DashboardError
   */
  private isDashboardError(error: unknown): error is DashboardError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      'message' in error &&
      'timestamp' in error &&
      'recoverable' in error
    );
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: string }> {
    try {
      const { error } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

      return {
        status: error ? 'unhealthy' : 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

/**
 * Default dashboard data service instance
 */
export const dashboardDataService = new DashboardDataService();

/**
 * Create a custom dashboard data service
 */
export function createDashboardDataService(): DashboardDataService {
  return new DashboardDataService();
}