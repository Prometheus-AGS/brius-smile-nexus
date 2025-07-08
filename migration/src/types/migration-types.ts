/**
 * Comprehensive TypeScript types for legacy database migration
 * Based on actual legacy database structure analysis
 */

// ============================================================================
// LEGACY DATABASE TYPES
// ============================================================================

export interface LegacyUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: Date;
  last_login: Date | null;
}

export interface LegacyPatient {
  id: number;
  user_id: number;
  birthdate: Date | null;
  sex: string;
  updated_at: Date;
}

export interface LegacyOffice {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyCourse {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyInstruction {
  id: number;
  patient_id: number;
  doctor_id: number;
  office_id: number;
  course_id: number;
  title: string | null;
  description: string | null;
  priority: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  data: Record<string, unknown>;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
}

export interface LegacyProject {
  id: number;
  uid: string;
  name: string;
  size: number;
  type: number;
  status: number;
  creator_id: number;
  created_at: Date;
  public: boolean;
}

export interface LegacyState {
  id: number;
  status: number;
  on: boolean;
  changed_at: Date;
  actor_id: number;
  instruction_id: number;
}

export interface LegacyTemplate {
  id: number;
  task_name: string;
  function: number;
  predefined: boolean;
  status: number | null;
  action_name: string | null;
  text_name: string | null;
  duration: number | null;
  category_id: number | null;
  course_id: number | null;
}

export interface LegacyRecord {
  id: number;
  content_type_id: number;
  object_id: number;
  subject: string | null;
  body: string;
  sender_id: number;
  recipient_id: number | null;
  is_read: boolean;
  read_at: Date | null;
  requires_response: boolean;
  response_due_date: Date | null;
  attachments: Record<string, unknown>[];
  created_at: Date;
  updated_at: Date;
}

export interface LegacyContentType {
  id: number;
  app_label: string;
  model: string;
}

// ============================================================================
// SUPABASE TARGET TYPES
// ============================================================================

export type ProfileType =
  | 'patient'
  | 'doctor'
  | 'technician'
  | 'admin'
  | 'master'
  | 'sales_person'
  | 'agent'
  | 'client';

export type ProjectType = 
  | 'scan' 
  | 'model' 
  | 'simulation' 
  | 'treatment_plan' 
  | 'aligner_design'
  | 'impression' 
  | 'xray' 
  | 'photo' 
  | 'document' 
  | 'other';

export type ProjectStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'review' 
  | 'approved' 
  | 'archived' 
  | 'deleted';

export type TaskFunction = 
  | 'submit' 
  | 'review' 
  | 'approve' 
  | 'process' 
  | 'notify' 
  | 'archive'
  | 'scan' 
  | 'model' 
  | 'manufacture' 
  | 'quality_check' 
  | 'ship';

export type EmbeddingContentType = 
  | 'profile_summary' 
  | 'medical_history' 
  | 'treatment_notes' 
  | 'case_summary'
  | 'project_description' 
  | 'message_content' 
  | 'workflow_notes';

export type DifyKbType = 'hybrid' | 'vector' | 'full_text';

export interface SupabaseProfile {
  id: string;
  legacy_user_id: number | null;
  legacy_patient_id: number | null;
  profile_type: ProfileType;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  insurance_provider: string | null;
  insurance_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_history: string | null;
  allergies: string | null;
  medications: string | null;
  license_number: string | null;
  specialties: string[] | null;
  credentials: Record<string, unknown>;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseOffice {
  id: string;
  legacy_office_id: number | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseOrderType {
  id: string;
  legacy_course_id: number | null;
  name: string;
  key: string;
  description: string | null;
  category: string | null;
  schema: Record<string, unknown> | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseOrderState {
  id: string;
  legacy_state_id: number | null;
  name: string;
  key: string;
  description: string | null;
  color: string | null;
  sequence_order: number | null;
  is_initial: boolean;
  is_final: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseOrder {
  id: string;
  legacy_instruction_id: number | null;
  order_number: string;
  order_type_id: string;
  patient_id: string;
  doctor_id: string;
  office_id: string;
  current_state_id: string | null;
  title: string | null;
  description: string | null;
  priority: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  data: Record<string, unknown>;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
}

export interface SupabaseProject {
  id: string;
  legacy_project_id: number | null;
  legacy_uid: string | null;
  order_id: string | null;
  office_id: string;
  creator_id: string;
  project_number: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  file_size: number;
  storage_path: string | null;
  storage_bucket: string;
  mime_type: string | null;
  version: number;
  parent_project_id: string | null;
  is_public: boolean;
  metadata: Record<string, unknown>;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseMessageType {
  id: string;
  name: string;
  key: string;
  category: string | null;
  description: string | null;
  triggers_state_change: boolean;
  target_state_id: string | null;
  template: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseMessage {
  id: string;
  legacy_record_id: number | null;
  message_type_id: string;
  order_id: string | null;
  project_id: string | null;
  sender_id: string | null;
  recipient_id: string | null;
  subject: string | null;
  body: string;
  is_read: boolean;
  read_at: Date | null;
  requires_response: boolean;
  response_due_date: Date | null;
  attachments: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseWorkflowTemplate {
  id: string;
  legacy_template_id: number | null;
  name: string;
  description: string | null;
  order_type_id: string | null;
  is_predefined: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseWorkflowTask {
  id: string;
  workflow_template_id: string;
  task_name: string;
  task_order: number;
  function_type: TaskFunction;
  action_name: string | null;
  text_prompt: string | null;
  estimated_duration: string | null;
  required_roles: ProfileType[] | null;
  auto_transition: boolean;
  predecessor_tasks: string[] | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface SupabaseInstructionState {
  id: string;
  legacy_state_id: number | null;
  order_id: string;
  status_code: number;
  is_active: boolean;
  changed_by_id: string | null;
  changed_at: Date;
  notes: string | null;
  metadata: Record<string, unknown>;
  legacy_instruction_id: number | null;
  legacy_actor_id: number | null;
}

// ============================================================================
// MIGRATION MAPPING TYPES
// ============================================================================

export interface ProfileMigrationMapping {
  legacy_user: LegacyUser;
  legacy_patient?: LegacyPatient;
  profile_type: ProfileType;
  supabase_profile: Partial<SupabaseProfile>;
}

export interface ProjectMigrationMapping {
  legacy_project: LegacyProject;
  project_type: ProjectType;
  project_status: ProjectStatus;
  supabase_project: Partial<SupabaseProject>;
}

export interface MessageMigrationMapping {
  legacy_record: LegacyRecord;
  legacy_content_type: LegacyContentType;
  resolved_entity_type: 'order' | 'project';
  resolved_entity_id: string;
  message_type_key: string;
  supabase_message: Partial<SupabaseMessage>;
}

export interface StateMigrationMapping {
  legacy_state: LegacyState;
  order_id: string;
  state_name: string;
  supabase_instruction_state: Partial<SupabaseInstructionState>;
}

export interface TemplateMigrationMapping {
  legacy_template: LegacyTemplate;
  task_function: TaskFunction;
  estimated_duration: string | null;
  supabase_workflow_template: Partial<SupabaseWorkflowTemplate>;
  supabase_workflow_task: Partial<SupabaseWorkflowTask>;
}

// ============================================================================
// MIGRATION PROGRESS TYPES
// ============================================================================

export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  records_processed: number;
  records_total: number;
  substeps: MigrationSubstep[];
}

export interface MigrationSubstep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  records_processed: number;
  records_total: number;
}

export interface MigrationProgress {
  migration_id: string;
  started_at: Date;
  completed_at: Date | null;
  status: 'running' | 'completed' | 'failed' | 'rolled_back';
  current_phase: number;
  total_phases: number;
  phases: MigrationPhase[];
  overall_progress: number; // 0-100
  error_message: string | null;
  rollback_available: boolean;
}

export interface MigrationValidation {
  check_name: string;
  status: 'pass' | 'fail' | 'warn';
  details: string;
  expected_count?: number;
  actual_count?: number;
  missing_records?: string[];
  extra_records?: string[];
}

export interface MigrationReport {
  migration_id: string;
  generated_at: Date;
  overall_status: 'success' | 'partial' | 'failed';
  phases_completed: number;
  total_records_migrated: number;
  validation_results: MigrationValidation[];
  performance_metrics: MigrationPerformanceMetrics;
  recommendations: string[];
  next_steps: string[];
}

export interface MigrationPerformanceMetrics {
  total_duration_ms: number;
  phase_durations: Record<string, number>;
  records_per_second: number;
  peak_memory_usage_mb: number;
  database_connections_used: number;
  errors_encountered: number;
  retries_performed: number;
}

// ============================================================================
// AI PROCESSING TYPES (POST-MIGRATION)
// ============================================================================

export interface EmbeddingQueueItem {
  id: string;
  source_table: string;
  source_id: string;
  operation: 'create' | 'update' | 'delete';
  content_type: EmbeddingContentType | null;
  priority: number;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  process_pgvector: boolean;
  process_dify: boolean;
  pgvector_completed: boolean;
  dify_completed: boolean;
  processed_at: Date | null;
  created_at: Date;
}

export interface EmbeddingProcessingResult {
  success: boolean;
  embedding_id?: string;
  dify_document_id?: string;
  error_message?: string;
  processing_time_ms: number;
  model_used: string;
  content_length: number;
}

export interface DifyKnowledgebase {
  id: string;
  dify_kb_id: string;
  name: string;
  description: string | null;
  kb_type: DifyKbType;
  entity_type: string;
  embedding_model: string;
  rerank_model: string;
  retrieval_setting: Record<string, unknown>;
  is_active: boolean;
  sync_status: string;
  last_sync_at: Date | null;
  document_count: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface DifyDocument {
  id: string;
  dify_document_id: string;
  dify_kb_id: string;
  source_table: string;
  source_id: string;
  document_name: string;
  document_content: string;
  document_type: string;
  file_size: number | null;
  processing_status: string;
  processed_at: Date | null;
  error_message: string | null;
  dify_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface MigrationConfig {
  legacy_database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    connection_timeout_ms: number;
    query_timeout_ms: number;
  };
  supabase: {
    url: string;
    anon_key: string;
    service_role_key: string;
    schema: string;
  };
  aws_bedrock: {
    region: string;
    model_id: string;
    dimensions: number;
    max_tokens: number;
    batch_size: number;
  };
  dify: {
    api_url: string;
    api_key: string;
    timeout_ms: number;
  };
  migration: {
    batch_size: number;
    max_retries: number;
    retry_delay_ms: number;
    parallel_workers: number;
    enable_embeddings: boolean;
    validate_data: boolean;
    create_backups: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file_path: string;
    max_file_size_mb: number;
    max_files: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class MigrationError extends Error {
  public override cause?: Error;
  
  constructor(
    message: string,
    public phase: string,
    public substep: string,
    public record_id?: string | number,
    cause?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public check_name: string,
    public expected?: number,
    public actual?: number
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class EmbeddingError extends Error {
  public override cause?: Error;
  
  constructor(
    message: string,
    public source_table: string,
    public source_id: string,
    public model_name: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'EmbeddingError';
    if (cause) {
      this.cause = cause;
    }
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type MigrationResult<T> = {
  success: true;
  data: T;
  warnings?: string[];
} | {
  success: false;
  error: string;
  details?: Record<string, unknown>;
};

export type BatchProcessingResult<T> = {
  successful: T[];
  failed: Array<{
    item: Partial<T>;
    error: string;
  }>;
  total_processed: number;
  processing_time_ms: number;
};

export interface IdMapping {
  legacy_id: number;
  supabase_id: string;
  entity_type: string;
  created_at: Date;
}

export interface LegacyIdLookup {
  profiles: Map<number, string>; // legacy_user_id -> supabase_id
  patients: Map<number, string>; // legacy_patient_id -> supabase_id
  offices: Map<number, string>; // legacy_office_id -> supabase_id
  orders: Map<number, string>; // legacy_instruction_id -> supabase_id
  projects: Map<number, string>; // legacy_project_id -> supabase_id
  order_types: Map<number, string>; // legacy_course_id -> supabase_id
  states: Map<number, string>; // legacy_state_id -> supabase_id
  templates: Map<number, string>; // legacy_template_id -> supabase_id
}
