/**
 * Supabase Target Database Validation Schemas
 * 
 * Zod schemas for validating data in the target Supabase PostgreSQL database.
 * These schemas ensure data integrity after migration and provide type safety
 * for the new AI-optimized data model.
 * 
 * Based on FINALIZED_SUPABASE_MODEL.md specifications.
 */

import { z } from 'zod';

// =============================================================================
// CORE SUPABASE SCHEMAS
// =============================================================================

/**
 * Supabase profiles table schema
 * Unified user and patient data with AI-ready structure
 */
export const SupabaseProfileSchema = z.object({
  id: z.string().uuid(),
  legacy_user_id: z.number().int().positive(),
  legacy_patient_id: z.number().int().positive().nullable(),
  email: z.string().email().nullable(), // 87% of users have no email
  full_name: z.string().min(1).max(300),
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  profile_type: z.enum(['patient', 'doctor', 'technician', 'admin']),
  date_of_birth: z.string().datetime().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable(),
  phone: z.string().max(20).nullable(),
  address: z.string().max(500).nullable(),
  emergency_contact: z.string().max(200).nullable(),
  insurance_info: z.string().max(1000).nullable(),
  medical_notes: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'suspended', 'archived']),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_login: z.string().datetime().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
  embedding_content: z.string().nullable(), // AI embedding preparation
  embedding_vector: z.array(z.number()).nullable(), // AI vector storage
});

/**
 * Supabase offices table schema
 * Practice locations with enhanced structure and UUID primary keys
 */
export const SupabaseOfficeSchema = z.object({
  id: z.string().uuid(),
  legacy_office_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  address: z.string().max(500),
  apartment: z.string().max(50).nullable(), // Renamed from 'apt'
  city: z.string().max(100),
  state: z.string().max(50),
  zip_code: z.string().max(20),
  phone: z.string().max(20).nullable(),
  fax: z.string().max(20).nullable(),
  email_notifications: z.array(z.string().email()).nullable(), // Enhanced from 'emails'
  square_customer_id: z.string().max(100).nullable(), // Renamed from 'sq_customer_id'
  timezone: z.string().max(50).default('America/Chicago'),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase order_types table schema
 * Enhanced categorization from legacy dispatch_course
 */
export const SupabaseOrderTypeSchema = z.object({
  id: z.string().uuid(),
  legacy_course_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.string().max(100).nullable(),
  subcategory: z.string().max(100).nullable(), // Enhanced categorization
  base_price: z.number().min(0).default(0),
  duration_days: z.number().int().min(1).default(1),
  is_active: z.boolean(),
  is_predefined: z.boolean(), // System vs custom
  requirements: z.array(z.string()).nullable(), // Enhanced from JSON string
  instructions: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase orders table schema
 * Unified instruction and order data with enhanced workflow
 */
export const SupabaseOrderSchema = z.object({
  id: z.string().uuid(),
  legacy_instruction_id: z.number().int().positive(),
  legacy_order_id: z.number().int().positive().nullable(),
  order_number: z.string().max(50),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  office_id: z.string().uuid(),
  order_type_id: z.string().uuid(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  custom_price: z.number().nullable(), // Renamed from 'price'
  base_price: z.number().min(0).default(0),
  total_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  shipping_cost: z.number().min(0).default(0),
  status: z.enum(['draft', 'pending', 'processing', 'completed', 'cancelled', 'archived']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('pending'),
  shipping_status: z.enum(['pending', 'processing', 'shipped', 'delivered']).default('pending'),
  tracking_number: z.string().max(100).nullable(),
  shipping_address: z.string().max(1000).nullable(),
  billing_address: z.string().max(1000).nullable(),
  external_id: z.string().max(100).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  due_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
  embedding_content: z.string().nullable(), // AI embedding preparation
  embedding_vector: z.array(z.number()).nullable(), // AI vector storage
});

// =============================================================================
// WORKFLOW SCHEMAS
// =============================================================================

/**
 * Supabase workflow_templates table schema
 * Enhanced template system with better structure
 */
export const SupabaseWorkflowTemplateSchema = z.object({
  id: z.string().uuid(),
  legacy_template_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.string().max(100).nullable(),
  version: z.string().max(20).default('1.0.0'),
  is_active: z.boolean(),
  is_predefined: z.boolean(), // System vs custom template
  duration_estimate_minutes: z.number().int().min(0).default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase workflow_tasks table schema
 * Individual tasks within workflow templates
 */
export const SupabaseWorkflowTaskSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  task_type: z.enum(['manual', 'automated', 'approval', 'notification']),
  sequence_order: z.number().int().min(0),
  duration_minutes: z.number().int().min(0).default(0),
  is_required: z.boolean().default(true),
  dependencies: z.array(z.string().uuid()).nullable(), // Task dependencies
  assignee_role: z.string().max(50).nullable(),
  instructions: z.string().nullable(),
  validation_rules: z.record(z.unknown()).nullable(), // JSON validation rules
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase order_states table schema
 * Enhanced workflow state tracking with explicit relationships
 */
export const SupabaseOrderStateSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(), // Explicit foreign key (no ContentTypes)
  state_name: z.string().max(100),
  state_type: z.enum(['pending', 'active', 'completed', 'failed', 'cancelled']),
  state_data: z.record(z.unknown()).nullable(), // JSON state information
  entered_at: z.string().datetime(),
  exited_at: z.string().datetime().nullable(),
  duration_seconds: z.number().int().min(0).nullable(),
  triggered_by_id: z.string().uuid().nullable(), // Who triggered the state
  notes: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

// =============================================================================
// COMMUNICATION SCHEMAS
// =============================================================================

/**
 * Supabase message_types table schema
 * Enhanced message categorization system
 */
export const SupabaseMessageTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  category: z.enum(['clinical', 'administrative', 'system', 'notification']),
  priority_level: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  retention_days: z.number().int().min(0).nullable(), // Message retention policy
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase messages table schema
 * Enhanced communication system with explicit relationships
 */
export const SupabaseMessageSchema = z.object({
  id: z.string().uuid(),
  legacy_record_id: z.number().int().positive(),
  message_type_id: z.string().uuid(),
  related_order_id: z.string().uuid().nullable(), // Explicit relationship
  related_profile_id: z.string().uuid().nullable(), // Explicit relationship
  sender_id: z.string().uuid(),
  recipient_id: z.string().uuid().nullable(),
  subject: z.string().max(500).nullable(),
  content: z.string().nullable(),
  content_type: z.enum(['text', 'html', 'markdown']).default('text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['draft', 'sent', 'delivered', 'read', 'archived']).default('draft'),
  parent_message_id: z.string().uuid().nullable(), // For threading
  thread_id: z.string().uuid().nullable(), // Message threading
  attachments: z.array(z.object({
    filename: z.string(),
    file_path: z.string(),
    file_size: z.number().int().min(0),
    mime_type: z.string(),
  })).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  sent_at: z.string().datetime().nullable(),
  read_at: z.string().datetime().nullable(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
  embedding_content: z.string().nullable(), // AI embedding preparation
  embedding_vector: z.array(z.number()).nullable(), // AI vector storage
});

// =============================================================================
// PROJECT MANAGEMENT SCHEMAS
// =============================================================================

/**
 * Supabase projects table schema
 * Enhanced file and project management with versioning
 */
export const SupabaseProjectSchema = z.object({
  id: z.string().uuid(),
  legacy_project_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  related_order_id: z.string().uuid().nullable(), // Explicit relationship
  related_profile_id: z.string().uuid().nullable(), // Explicit relationship
  project_type: z.enum(['clinical', 'administrative', 'research', 'other']),
  status: z.enum(['active', 'completed', 'archived', 'cancelled']).default('active'),
  version: z.string().max(20).default('1.0.0'),
  created_by_id: z.string().uuid(),
  assigned_to_id: z.string().uuid().nullable(),
  due_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
  embedding_content: z.string().nullable(), // AI embedding preparation
  embedding_vector: z.array(z.number()).nullable(), // AI vector storage
});

/**
 * Supabase project_files table schema
 * Enhanced file management with versioning and metadata
 */
export const SupabaseProjectFileSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  original_filename: z.string().max(255),
  file_path: z.string().max(1000),
  file_size: z.number().int().min(0),
  mime_type: z.string().max(100),
  file_hash: z.string().max(64), // For integrity checking
  version: z.string().max(20).default('1.0.0'),
  is_current_version: z.boolean().default(true),
  upload_status: z.enum(['pending', 'uploading', 'completed', 'failed']).default('pending'),
  uploaded_by_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

// =============================================================================
// AI AND EMBEDDING SCHEMAS
// =============================================================================

/**
 * Supabase embeddings table schema
 * Centralized AI embedding storage for vector search
 */
export const SupabaseEmbeddingSchema = z.object({
  id: z.string().uuid(),
  content_type: z.enum(['profile', 'order', 'message', 'project']),
  content_id: z.string().uuid(),
  content_text: z.string().min(1),
  embedding_vector: z.array(z.number()).min(1), // Vector dimensions
  embedding_model: z.string().max(100).default('amazon.titan-embed-text-v2:0'),
  embedding_version: z.string().max(20).default('1.0.0'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

/**
 * Supabase search_queries table schema
 * AI-powered search query tracking and optimization
 */
export const SupabaseSearchQuerySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  query_text: z.string().min(1),
  query_vector: z.array(z.number()).nullable(), // Query embedding
  search_type: z.enum(['semantic', 'keyword', 'hybrid']),
  filters: z.record(z.unknown()).nullable(), // Search filters
  results_count: z.number().int().min(0),
  response_time_ms: z.number().int().min(0),
  created_at: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(), // JSON metadata
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate Supabase data with detailed error reporting
 */
export function validateSupabaseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
        input: 'input' in err ? err.input : undefined,
      }));
      
      throw new Error(
        `Supabase data validation failed for ${context}: ${JSON.stringify(errorDetails, null, 2)}`
      );
    }
    throw error;
  }
}

/**
 * Safe parsing with detailed error context for Supabase data
 */
export function safeParseSupabaseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorDetails = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
  
  return {
    success: false,
    error: `Supabase data validation failed for ${context}: ${JSON.stringify(errorDetails, null, 2)}`
  };
}

/**
 * Validate data transformation from legacy to Supabase format
 */
export function validateDataTransformation<L, S>(
  legacySchema: z.ZodSchema<L>,
  supabaseSchema: z.ZodSchema<S>,
  legacyData: unknown,
  supabaseData: unknown,
  context: string
): { legacy: L; supabase: S } {
  try {
    const legacy = legacySchema.parse(legacyData);
    const supabase = supabaseSchema.parse(supabaseData);
    
    return { legacy, supabase };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
        input: 'input' in err ? err.input : undefined,
      }));
      
      throw new Error(
        `Data transformation validation failed for ${context}: ${JSON.stringify(errorDetails, null, 2)}`
      );
    }
    throw error;
  }
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SupabaseProfile = z.infer<typeof SupabaseProfileSchema>;
export type SupabaseOffice = z.infer<typeof SupabaseOfficeSchema>;
export type SupabaseOrderType = z.infer<typeof SupabaseOrderTypeSchema>;
export type SupabaseOrder = z.infer<typeof SupabaseOrderSchema>;
export type SupabaseWorkflowTemplate = z.infer<typeof SupabaseWorkflowTemplateSchema>;
export type SupabaseWorkflowTask = z.infer<typeof SupabaseWorkflowTaskSchema>;
export type SupabaseOrderState = z.infer<typeof SupabaseOrderStateSchema>;
export type SupabaseMessageType = z.infer<typeof SupabaseMessageTypeSchema>;
export type SupabaseMessage = z.infer<typeof SupabaseMessageSchema>;
export type SupabaseProject = z.infer<typeof SupabaseProjectSchema>;
export type SupabaseProjectFile = z.infer<typeof SupabaseProjectFileSchema>;
export type SupabaseEmbedding = z.infer<typeof SupabaseEmbeddingSchema>;
export type SupabaseSearchQuery = z.infer<typeof SupabaseSearchQuerySchema>;