/**
 * Core Migration Types for MDW Database Migration System
 * 
 * This file contains essential TypeScript types and interfaces for the
 * database migration and synchronization infrastructure.
 * UI-specific types have been removed as part of migration UI cleanup.
 */

// Core Migration Types
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
export type MigrationOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ResolutionStrategy = 'retry' | 'skip' | 'manual' | 'abort';
export type ConflictType = 'concurrent_modification' | 'duplicate_key' | 'foreign_key_violation';

// Migration Configuration
export interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  parallelWorkers: number;
  dryRun: boolean;
  skipValidation: boolean;
  legacyDb?: DatabaseConnection;
}

// Migration Script Interface
export interface MigrationScript {
  name: string;
  description: string;
  dependencies: string[];
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  execute: (config: MigrationConfig) => Promise<MigrationResult>;
  rollback: (batchId: string) => Promise<void>;
  validate: (batchId: string) => Promise<ValidationResult>;
}

// Migration Results
export interface MigrationResult {
  batchId: string;
  recordsProcessed: number;
  recordsFailed: number;
  errors: MigrationError[];
  duration: number;
  checkpoints: string[];
}

export interface MigrationError {
  id?: string;
  legacyId: string;
  newId?: string;
  type: string;
  message: string;
  severity: ErrorSeverity;
  details?: Record<string, unknown>;
  timestamp: Date;
  recordId?: string;
}

// Validation Framework
export interface ValidationRule {
  name: string;
  description: string;
  validate: (data: unknown) => Promise<ValidationResult>;
  severity: ErrorSeverity;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

// Migration Tracking
export interface MigrationBatch {
  id: string;
  batch_name: string;
  status: MigrationStatus;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  records_processed: number;
  records_failed: number;
  created_at: Date;
}

export interface MigrationLog {
  id: string;
  batch_id: string;
  table_name: string;
  operation: string;
  legacy_id?: string;
  new_id?: string;
  status: string;
  error_details?: Record<string, unknown>;
  processing_time_ms?: number;
  created_at: Date;
}

// Legacy Data Types
export interface LegacyUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: Date;
  last_login?: Date;
}

export interface LegacyPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  practice_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyCase {
  id: string;
  patient_id: string;
  order_id: string;
  case_number: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyDesign {
  id: string;
  case_id: string;
  design_type: string;
  file_path: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyManufacturer {
  id: string;
  name: string;
  contact_info?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyProduct {
  id: string;
  manufacturer_id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyWorkflowStep {
  id: string;
  case_id: number;
  step_name: string;
  step_order: number;
  status: string;
  assigned_user_id?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyNote {
  id: string;
  case_id: number;
  user_id: string;
  note_text: string;
  note_type?: string;
  is_internal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyAttachment {
  id: string;
  case_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyOrder {
  id: string;
  patient_id?: string;
  course_id?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyRecord {
  id: string;
  target_type_id: number;
  target_id: string;
  text: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

// New Schema Types (from AI-ready design)
export interface Patient {
  id: string;
  practice_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  legacy_ids: string[]; // Track merged legacy IDs
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  patient_id: string;
  practice_id: string;
  order_number: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowState {
  id: string;
  order_id: string;
  state: string;
  previous_state?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Patient Deduplication
export interface PatientGroup {
  primaryPatient: LegacyPatient;
  patients: LegacyPatient[];
  duplicates?: LegacyPatient[];
  confidence: number;
  mergeStrategy: MergeStrategy;
}

export interface MergeStrategy {
  type: 'automatic' | 'manual' | 'skip';
  rules: MergeRule[];
  confidence: number;
}

// Synchronization Types
export interface SyncConfiguration {
  syncIntervalMs: number;
  batchSize: number;
  conflictResolution: 'supabase_wins' | 'legacy_wins' | 'manual_review' | 'merge';
  enableRealtime: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface ChangeLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  timestamp: Date;
  synced: boolean;
}

export interface ConflictResolution {
  id: string;
  type: 'data_conflict' | 'schema_conflict' | 'business_rule_conflict';
  table_name: string;
  record_id: string;
  legacy_data: Record<string, unknown>;
  supabase_data: Record<string, unknown>;
  conflict_fields: string[];
  resolution: 'supabase_wins' | 'legacy_wins' | 'manual_review' | 'merge';
  timestamp: Date;
  action: 'apply' | 'skip' | 'manual_review';
  resolved_data?: Record<string, unknown>;
}

export interface SyncStatus {
  id: string;
  start_time: Date;
  end_time: Date;
  direction: 'legacy_to_supabase' | 'supabase_to_legacy' | 'bidirectional';
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  errors: SyncError[];
  status: 'running' | 'completed' | 'failed' | 'completed_with_errors';
}

export interface SyncError {
  id: string;
  type: 'connection_error' | 'data_error' | 'conflict_error' | 'sync_error';
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface SyncMetrics {
  total_sync_cycles: number;
  total_records_processed: number;
  total_records_succeeded: number;
  total_records_failed: number;
  average_sync_duration: number;
  last_sync_time: Date;
  conflicts_detected: number;
  conflicts_resolved: number;
}

export interface DataTransformation {
  source_table: string;
  target_table: string;
  field_mappings: Record<string, string>;
  transformation_rules: TransformationRule[];
  validation_rules: ValidationRule[];
}

export interface TransformationRule {
  field: string;
  type: 'direct_copy' | 'computed' | 'lookup' | 'default_value';
  source_field?: string;
  computation?: string;
  lookup_table?: string;
  default_value?: unknown;
}

export interface MergeRule {
  field: string;
  strategy: 'prefer_newest' | 'prefer_oldest' | 'prefer_complete' | 'manual_review';
  weight: number;
}

export interface SimilarityResult {
  score: number;
  factors: {
    name: number;
    dateOfBirth: number;
    email: number;
    phone: number;
  };
}

export interface DeduplicationResult {
  mergedPatients: Patient[];
  duplicateMap: Map<string, string>;
  duplicatesFound: number;
}

export interface SyncEvent {
  table: string;
  operation: MigrationOperation;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  timestamp: Date;
}

export interface TableProcessor {
  handleInsert(data: Record<string, unknown>, legacyId: string): Promise<void>;
  handleUpdate(oldData: Record<string, unknown>, newData: Record<string, unknown>, legacyId: string): Promise<void>;
  handleDelete(data: Record<string, unknown>, legacyId: string): Promise<void>;
}

export interface SyncProcessor {
  processEvent(event: SyncEvent): Promise<void>;
  handleConflict(conflict: DataConflict): Promise<Resolution>;
}

// Conflict Resolution
export interface DataConflict {
  type: ConflictType;
  existingData: Record<string, unknown>;
  incomingOldData: Record<string, unknown>;
  incomingNewData: Record<string, unknown>;
  conflictFields: string[];
}

export interface Resolution {
  strategy: ResolutionStrategy;
  appliedData?: Record<string, unknown>;
  notes?: string;
}

// Error Handling
export interface MigrationContext {
  scriptName: string;
  batchId: string;
  recordId?: string;
  retryCount: number;
  retryFunction?: () => Promise<unknown>;
}

export interface ErrorResolutionStrategy {
  strategy: ResolutionStrategy;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  delay: number;
  maxRetries: number;
}

export interface ErrorResolution {
  strategy: ResolutionStrategy;
  success: boolean;
  result?: unknown;
}

// Database Connection Types
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface MigrationEnvironment {
  legacyDb: DatabaseConnection;
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseAnonKey: string;
}

// Utility Types
export type MigrationPhase = 'infrastructure' | 'bulk_migration' | 'sync_setup' | 'monitoring';

export interface MigrationProgress {
  phase: MigrationPhase;
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  startTime: Date;
  estimatedCompletion?: Date;
}