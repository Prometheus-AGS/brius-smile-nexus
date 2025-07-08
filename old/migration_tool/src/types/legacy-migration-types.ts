/**
 * TypeScript types for Legacy Django MDW to Supabase migration
 * Based on live database inspection via brius_postgres MCP server
 */

// Legacy Django Database Types
// CORRECTED: Based on actual database inspection via brius_postgres MCP server
export interface LegacyPatient {
  // Fields that actually exist in dispatch_patient table
  id: number;
  user_id: number;
  birthdate?: string; // actual field name in dispatch_patient
  sex?: string; // actual field name in dispatch_patient
  doctor_id?: number;
  office_id?: number;
  archived?: boolean;
  status?: string;
  submitted_at?: string;
  suffix?: string;
  updated_at?: string;
  suspended?: boolean;
  schemes?: string;
  
  // Fields from auth_user table (via JOIN)
  first_name?: string; // from auth_user.first_name
  last_name?: string; // from auth_user.last_name
  email?: string; // from auth_user.email
  username?: string; // from auth_user.username
  user_email?: string; // alias for email for backward compatibility
  
  // Compatibility fields for existing code (mapped from actual fields)
  date_of_birth?: string; // mapped from birthdate
  gender?: string; // mapped from sex
  created_at?: string; // DEFAULT: updated_at or current timestamp
  
  // Fields that DON'T exist in legacy database - will be set to defaults
  phone?: string; // DEFAULT: null
  address?: string; // DEFAULT: null
  city?: string; // DEFAULT: null
  state?: string; // DEFAULT: null
  zip_code?: string; // DEFAULT: null
  insurance_provider?: string; // DEFAULT: null
  insurance_id?: string; // DEFAULT: null
  emergency_contact_name?: string; // DEFAULT: null
  emergency_contact_phone?: string; // DEFAULT: null
  medical_history?: string; // DEFAULT: null
  allergies?: string; // DEFAULT: null
  medications?: string; // DEFAULT: null
}

export interface LegacyPractice {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string; // mapped from 'zip' field
  phone?: string;
  email?: string; // mapped from 'emails' boolean field (will be empty string if false)
  created_at: string; // will be set to current timestamp as fallback
  updated_at: string; // will be set to current timestamp as fallback
  // Additional fields from dispatch_office table
  doctor_id?: number;
  apt?: string;
  country?: string;
  tax_rate?: number;
  valid?: boolean;
  sq_customer_id?: string;
  emails?: boolean; // original emails field
}

export interface LegacyUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined: string;
  last_login?: string;
}


export interface LegacyComment {
  id: number;
  content_type_id: number;
  object_id: number;
  text: string;
  comment?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  content_type_app?: string;
  content_type_model?: string;
  user_username?: string;
  user_first_name?: string;
  user_last_name?: string;
}

export interface LegacyState {
  id: number;
  content_type_id?: number;
  object_id?: number;
  state?: string;
  metadata?: string;
  instruction_id?: number;
  actor_id?: number;
  created_at: string;
  updated_at: string;
  content_type_app?: string;
  content_type_model?: string;
}

export interface LegacyContentType {
  id: number;
  app_label: string;
  model: string;
}

// New Legacy Table Types - Discovered during database analysis
export interface LegacyProject {
  id: number;
  practice_id?: number;
  case_id?: number;
  creator_id?: number;
  name: string;
  project_type?: string;
  status?: string;
  file_size?: number;
  storage_path?: string;
  is_public?: boolean;
  metadata?: string;
  version?: number;
  parent_project_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LegacyTemplate {
  id: number;
  workflow_template_id?: number;
  task_name: string;
  task_order: number;
  function_type: string;
  is_predefined?: boolean;
  action_name?: string;
  text_prompt?: string;
  estimated_duration?: string;
  required_roles?: string;
  category?: string;
  auto_transition?: boolean;
  predecessor_tasks?: string;
  metadata?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LegacyInstructionState {
  id: number;
  case_id?: number;
  instruction_type: string;
  status_code: number;
  is_active?: boolean;
  changed_by?: number;
  changed_at?: string;
  metadata?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Target Supabase Schema Types
export interface TargetProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'doctor' | 'technician' | 'admin' | 'support';
  created_at: string;
  updated_at: string;
}

export interface TargetPractice {
  id: string;
  name: string;
  address?: Record<string, unknown>;
  phone?: string;
  email?: string;
  license_number?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TargetPatient {
  id: string;
  profile_id?: string;
  practice_id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  medical_history: Record<string, unknown>;
  preferences: Record<string, unknown>;
  emergency_contact?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TargetCase {
  id: string;
  patient_id: string;
  practice_id: string;
  assigned_practitioner_id?: string;
  case_number: string;
  title: string;
  description?: string;
  case_type: 'initial_consultation' | 'treatment_planning' | 'active_treatment' | 'refinement' | 'retention' | 'emergency' | 'follow_up';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  current_state: 'submitted' | 'under_review' | 'planning' | 'approved' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'completed' | 'on_hold' | 'cancelled';
  workflow_template_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TargetCaseMessage {
  id: string;
  case_id: string;
  sender_id: string;
  message_type: 'general' | 'status_update' | 'question' | 'instruction' | 'approval_request' | 'system_notification';
  subject?: string;
  content: string;
  attachments: unknown[];
  read_by: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}


// New Target Schema Types - For newly discovered tables
export interface TargetProject {
  id: string;
  legacy_id?: number;
  practice_id: string;
  case_id?: string;
  creator_id: string;
  name: string;
  project_type: 'scan' | 'model' | 'simulation' | 'treatment_plan' | 'aligner_design' | 'impression' | 'xray' | 'photo' | 'document' | 'other';
  status: 'draft' | 'in_progress' | 'review' | 'approved' | 'archived' | 'deleted';
  file_size?: number;
  storage_path?: string;
  storage_bucket: string;
  is_public: boolean;
  metadata: Record<string, unknown>;
  version: number;
  parent_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TargetWorkflowTemplateTask {
  id: string;
  workflow_template_id: string;
  legacy_template_id?: number;
  task_name: string;
  task_order: number;
  function_type: 'submit' | 'review' | 'approve' | 'process' | 'notify' | 'archive' | 'scan' | 'model' | 'manufacture' | 'quality_check' | 'ship';
  is_predefined: boolean;
  action_name?: string;
  text_prompt?: string;
  estimated_duration?: string;
  required_roles?: string[];
  category?: 'submission' | 'review' | 'production' | 'quality_check' | 'delivery' | 'follow_up' | 'scanning' | 'modeling' | 'manufacturing';
  auto_transition: boolean;
  predecessor_tasks?: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TargetInstructionState {
  id: string;
  case_id: string;
  instruction_type: string;
  status_code: number;
  is_active: boolean;
  changed_by: string;
  changed_at: string;
  metadata: Record<string, unknown>;
  legacy_instruction_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Migration Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface MigrationConfig {
  legacyDb: DatabaseConfig;
  supabaseDb: DatabaseConfig;
  openaiApiKey: string;
  batchSize: number;
  dryRun: boolean;
  enableAI: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxRetries: number;
  retryDelay: number;
}

// Migration Process Types
export interface MigrationProgress {
  phase: 'preparation' | 'extraction' | 'transformation' | 'deduplication' | 'ai_enhancement' | 'validation' | 'completion';
  step: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: MigrationError[];
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface MigrationError {
  id: string;
  phase: string;
  step: string;
  recordId?: string | number;
  errorType: 'validation' | 'transformation' | 'database' | 'api' | 'network';
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
}

export interface MigrationResult {
  success: boolean;
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  duration: number;
  errors: MigrationError[];
  summary: Record<string, unknown>;
}

// Deduplication Types
export interface DeduplicationCandidate {
  primaryRecord: LegacyPatient;
  duplicateRecords: LegacyPatient[];
  confidenceScore: number;
  similarityFactors: {
    nameScore: number;
    emailScore: number;
    phoneScore: number;
    dobScore: number;
  };
  mergeStrategy: 'automatic' | 'manual_review' | 'skip';
  mergedData?: TargetPatient;
}

export interface DeduplicationResult {
  totalCandidates: number;
  automaticMerges: number;
  manualReviewRequired: number;
  skipped: number;
  mergedRecords: TargetPatient[];
  reviewQueue: DeduplicationCandidate[];
}

// State Machine Reconstruction Types
export interface StateTransition {
  fromState: string | null;
  toState: string;
  timestamp: Date;
  actor: string;
  reason: string;
  confidence: number;
  extractedFrom: 'comment' | 'state_table' | 'inferred';
}

export interface WorkflowReconstruction {
  caseId: string;
  transitions: StateTransition[];
  currentState: string;
  confidence: number;
  issues: string[];
}

// AI Embeddings Types
export interface EmbeddingRequest {
  id: string;
  content: string;
  contentType: 'case_summary' | 'treatment_plan' | 'notes' | 'diagnosis';
  sourceId: string;
  sourceTable: string;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
  success: boolean;
  error?: string;
  tokenCount?: number;
  processingTime?: number;
}

export interface EmbeddingBatch {
  requests: EmbeddingRequest[];
  batchId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
}

// Validation Types
export interface ValidationRule {
  name: string;
  description: string;
  type: 'data_integrity' | 'business_logic' | 'referential_integrity' | 'ai_quality';
  severity: 'error' | 'warning' | 'info';
  validator: (data: unknown) => ValidationResult;
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export interface ValidationReport {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warnings: number;
  errors: ValidationResult[];
  summary: Record<string, unknown>;
}

// Connection Manager Types
export interface ConnectionPool {
  legacy: unknown; // pg.Pool
  supabase: unknown; // pg.Pool
  isConnected: boolean;
  connectionCount: number;
  maxConnections: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
  duration: number;
}

// Progress Tracking Types
export interface ProgressCallback {
  (progress: MigrationProgress): void;
}

export interface MigrationMetrics {
  recordsPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  apiCallsRemaining: number;
  estimatedTimeRemaining: number;
}

// Rollback Types
export interface RollbackPoint {
  id: string;
  phase: string;
  timestamp: Date;
  description: string;
  affectedTables: string[];
  recordCounts: Record<string, number>;
}

export interface RollbackPlan {
  rollbackPoints: RollbackPoint[];
  strategy: 'full' | 'partial' | 'checkpoint';
}

// Additional AI Embeddings Types
export interface EmbeddingVector {
  id: string;
  entityType: 'patient' | 'case' | 'case_message' | 'order';
  entityId: string;
  vector: number[];
  metadata: EmbeddingMetadata;
}

export interface EmbeddingMetadata {
  // Patient metadata
  patientId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  
  // Case metadata
  caseId?: string;
  caseType?: string;
  
  // Case message metadata
  messageId?: string;
  senderId?: string;
  messageType?: string;
  
  // Order metadata
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  currency?: string;
  
  // Common metadata
  practiceId?: string;
  priority?: string;
  currentState?: string;
  searchableText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIEmbeddingsConfig {
  openaiApiKey: string;
  model?: string;
  batchSize?: number;
  rateLimitDelay?: number;
  maxRetries?: number;
}

export interface EmbeddingProgress {
  totalItems: number;
  processedItems: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  stage: 'generating_embeddings' | 'storing_vectors' | 'indexing' | 'complete';
}


// Export utility type for the main migration engine
export interface MigrationEngine {
  config: MigrationConfig;
  progress: MigrationProgress;
  metrics: MigrationMetrics;
  connectionPool: ConnectionPool;
  
  // Core methods
  initialize(): Promise<void>;
  execute(): Promise<MigrationResult>;
  rollback(rollbackPoint?: string): Promise<void>;
  cleanup(): Promise<void>;
  
  // Progress tracking
  onProgress(callback: ProgressCallback): void;
  getProgress(): MigrationProgress;
  getMetrics(): MigrationMetrics;
}

// Data Extraction Types
export interface ExtractionConfig {
  batchSize: number;
  enableValidation: boolean;
  skipOrphaned: boolean;
  includeInactive: boolean;
}

export interface ExtractionProgress {
  stage: string;
  message: string;
  percentage: number;
  timestamp: Date;
}

export interface ExtractionStats {
  totalRecords: number;
  extractedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  extractionTimeMs: number;
}

export interface ExtractionResult {
  patients: LegacyPatient[];
  comments: LegacyComment[];
  states: LegacyState[];
  users: LegacyUser[];
  practices: LegacyPractice[];
  contentTypes: LegacyContentType[];
  projects: LegacyProject[];
  templates: LegacyTemplate[];
  instructionStates: LegacyInstructionState[];
  stats: ExtractionStats;
}

export interface TargetPatientFlag {
  id: string;
  patient_id: string;
  flag_type: string;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface TargetPatientNote {
  id: string;
  patient_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

export interface TargetCaseFlag {
  id: string;
  case_id: string;
  flag_type: string;
  reason:string;
  created_by: string;
  created_at: string;
}

export interface TargetCaseNote {
  id: string;
  case_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

export interface TargetCaseAction {
    id: string;
    case_id: string;
    action_type: string;
    description: string;
    performed_by: string;
    performed_at: string;
}

// Additional Target Schema Types for Phase 2 and Phase 5
export interface TargetPractitioner {
    id: string;
    practice_id: string;
    profile_id: string;
    role: string;
    specialization?: string;
    license_number?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface TargetPracticeMember {
    id: string;
    practice_id: string;
    profile_id: string;
    practitioner_id?: string;
    role: string;
    permissions?: string;
    joined_at: string;
    created_at: string;
    updated_at: string;
}

export interface TargetOrder {
    id: string;
    case_id: string;
    practice_id: string;
    order_number: string;
    order_type: string;
    status: string;
    description?: string;
    total_amount?: number;
    currency?: string;
    ordered_at: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
}