/**
 * Dashboard Data Types
 * 
 * Type definitions for business metrics dashboard data
 * Uses strongly typed Supabase database interfaces for data operations
 */

import type { Database, Tables } from '@/types/database';

// ============================================================================
// Base Database Types
// ============================================================================

export type OrderRow = Tables<'orders'>;
export type PatientRow = Tables<'patients'>;
export type CaseRow = Tables<'cases'>;
export type PaymentRow = Tables<'payments'>;
export type OfficeRow = Tables<'offices'>;
export type DoctorRow = Tables<'doctors'>;

// ============================================================================
// Dashboard Analytics Types
// ============================================================================

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Common analytics metadata
 */
export interface AnalyticsMetadata {
  generatedAt: Date;
  timeRange: TimeRange;
  recordCount: number;
  executionTime: number;
}

// ============================================================================
// Orders Analytics Types
// ============================================================================

/**
 * Order status distribution analytics
 */
export interface OrderStatusDistribution {
  status: Database['public']['Enums']['order_status'];
  count: number;
  percentage: number;
  totalAmount: number;
}

/**
 * Order trends over time
 */
export interface OrderTrends {
  period: string; // e.g., '2024-01', '2024-01-15'
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
}

/**
 * Orders analytics result
 */
export interface OrdersAnalytics {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completionRate: number;
  };
  statusDistribution: OrderStatusDistribution[];
  trends: OrderTrends[];
  topDoctors: Array<{
    doctorId: string;
    doctorName: string;
    orderCount: number;
    revenue: number;
  }>;
  topOffices: Array<{
    officeId: string;
    officeName: string;
    orderCount: number;
    revenue: number;
  }>;
  metadata: AnalyticsMetadata;
}

// ============================================================================
// Patients Analytics Types
// ============================================================================

/**
 * Patient status distribution
 */
export interface PatientStatusDistribution {
  status: Database['public']['Enums']['patient_status_type'];
  count: number;
  percentage: number;
}

/**
 * Patient demographics
 */
export interface PatientDemographics {
  ageGroups: Array<{
    ageRange: string;
    count: number;
    percentage: number;
  }>;
  genderDistribution: Array<{
    gender: Database['public']['Enums']['gender'];
    count: number;
    percentage: number;
  }>;
  geographicDistribution: Array<{
    state: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Patient enrollment trends
 */
export interface PatientEnrollmentTrends {
  period: string;
  newPatients: number;
  activePatients: number;
  completedTreatments: number;
  retentionRate: number;
}

/**
 * Patients analytics result
 */
export interface PatientsAnalytics {
  summary: {
    totalPatients: number;
    activePatients: number;
    newPatientsThisMonth: number;
    averageTreatmentDuration: number;
  };
  statusDistribution: PatientStatusDistribution[];
  demographics: PatientDemographics;
  enrollmentTrends: PatientEnrollmentTrends[];
  metadata: AnalyticsMetadata;
}

// ============================================================================
// Cases Analytics Types
// ============================================================================

/**
 * Case complexity distribution
 */
export interface CaseComplexityDistribution {
  complexity: Database['public']['Enums']['case_complexity_type'];
  count: number;
  percentage: number;
  averageDuration: number;
}

/**
 * Case status distribution
 */
export interface CaseStatusDistribution {
  status: Database['public']['Enums']['case_status_type'];
  count: number;
  percentage: number;
}

/**
 * Treatment success metrics
 */
export interface TreatmentSuccessMetrics {
  completionRate: number;
  averageTreatmentTime: number;
  refinementRate: number;
  patientSatisfactionScore: number;
}

/**
 * Cases analytics result
 */
export interface CasesAnalytics {
  summary: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    averageTreatmentDuration: number;
  };
  complexityDistribution: CaseComplexityDistribution[];
  statusDistribution: CaseStatusDistribution[];
  successMetrics: TreatmentSuccessMetrics;
  metadata: AnalyticsMetadata;
}

// ============================================================================
// Revenue Analytics Types
// ============================================================================

/**
 * Revenue by period
 */
export interface RevenuePeriod {
  period: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  growth: number; // percentage growth from previous period
}

/**
 * Payment status distribution
 */
export interface PaymentStatusDistribution {
  status: Database['public']['Enums']['payment_status'];
  count: number;
  totalAmount: number;
  percentage: number;
}

/**
 * Revenue by source
 */
export interface RevenueBySource {
  source: 'office' | 'doctor' | 'product';
  sourceId: string;
  sourceName: string;
  revenue: number;
  orderCount: number;
  percentage: number;
}

/**
 * Revenue analytics result
 */
export interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    averageOrderValue: number;
    monthlyGrowthRate: number;
  };
  revenueByPeriod: RevenuePeriod[];
  paymentStatusDistribution: PaymentStatusDistribution[];
  revenueByOffice: RevenueBySource[];
  revenueByDoctor: RevenueBySource[];
  metadata: AnalyticsMetadata;
}

// ============================================================================
// Combined Dashboard Data Types
// ============================================================================

/**
 * Complete dashboard data
 */
export interface DashboardData {
  orders: OrdersAnalytics;
  patients: PatientsAnalytics;
  cases: CasesAnalytics;
  revenue: RevenueAnalytics;
  lastUpdated: Date;
  refreshInterval: number;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'trend';
  title: string;
  description?: string;
  data: unknown;
  config: {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    timeRange?: TimeRange;
    refreshInterval?: number;
    [key: string]: unknown;
  };
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  title: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    rows: number;
  };
  refreshInterval: number;
  permissions: string[];
}

// ============================================================================
// Query Parameters Types
// ============================================================================

/**
 * Common query parameters for analytics
 */
export interface AnalyticsQueryParams {
  timeRange?: TimeRange;
  officeIds?: string[];
  doctorIds?: string[];
  patientIds?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Orders query parameters
 */
export interface OrdersQueryParams extends AnalyticsQueryParams {
  statuses?: Database['public']['Enums']['order_status'][];
  courseTypes?: Database['public']['Enums']['course_type'][];
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Patients query parameters
 */
export interface PatientsQueryParams extends AnalyticsQueryParams {
  statuses?: Database['public']['Enums']['patient_status_type'][];
  ageRange?: { min: number; max: number };
  states?: string[];
}

/**
 * Cases query parameters
 */
export interface CasesQueryParams extends AnalyticsQueryParams {
  statuses?: Database['public']['Enums']['case_status_type'][];
  complexities?: Database['public']['Enums']['case_complexity_type'][];
  treatmentTypes?: string[];
}

/**
 * Revenue query parameters
 */
export interface RevenueQueryParams extends AnalyticsQueryParams {
  paymentStatuses?: Database['public']['Enums']['payment_status'][];
  minAmount?: number;
  maxAmount?: number;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Dashboard data error
 */
export interface DashboardError {
  type: 'query' | 'network' | 'permission' | 'validation';
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Analytics operation result
 */
export interface AnalyticsResult<T> {
  success: boolean;
  data?: T;
  error?: DashboardError;
  metadata: AnalyticsMetadata;
}