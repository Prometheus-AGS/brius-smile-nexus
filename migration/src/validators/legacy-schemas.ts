/**
 * Legacy Database Validation Schemas
 * 
 * Zod schemas for validating data from the legacy Django-based PostgreSQL database.
 * These schemas ensure data integrity during migration and provide type safety.
 * 
 * Based on Django models from dispatch/models.py in the legacy codebase.
 */

import { z } from 'zod';

// =============================================================================
// CORE LEGACY SCHEMAS
// =============================================================================

/**
 * Legacy auth_user table schema
 * Django's built-in User model with custom fields
 */
export const LegacyUserSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1),
  last_login: z.string().datetime().nullable(),
  is_superuser: z.boolean(),
  username: z.string().min(1).max(150),
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  email: z.string().email().optional().or(z.literal('')), // 87% of users have no email
  is_staff: z.boolean(),
  is_active: z.boolean(),
  date_joined: z.string().datetime(),
});

/**
 * Legacy dispatch_patient table schema
 * Patient-specific information linked to auth_user
 */
export const LegacyPatientSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  birthdate: z.string().datetime().nullable(),
  sex: z.enum(['M', 'F', 'O']).nullable(), // Male, Female, Other
  status: z.number().int().min(0).max(10), // Patient status (0-10 scale)
  archived: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  phone: z.string().max(20).nullable(),
  address: z.string().max(500).nullable(),
  emergency_contact: z.string().max(200).nullable(),
  insurance_info: z.string().max(1000).nullable(),
  medical_notes: z.string().nullable(),
});

/**
 * Legacy dispatch_office table schema
 * Office/practice location information
 */
export const LegacyOfficeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  address: z.string().max(500),
  apt: z.string().max(50).nullable(), // Apartment/suite number
  city: z.string().max(100),
  state: z.string().max(50),
  zip: z.string().max(20),
  phone: z.string().max(20).nullable(),
  fax: z.string().max(20).nullable(),
  emails: z.string().nullable(), // JSON string of email addresses
  sq_customer_id: z.string().max(100).nullable(), // Square customer ID
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  active: z.boolean(),
  timezone: z.string().max(50).default('America/Chicago'),
});

/**
 * Legacy dispatch_instruction table schema
 * Core order/instruction information
 */
export const LegacyInstructionSchema = z.object({
  id: z.number().int().positive(),
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  office_id: z.number().int().positive(),
  course_id: z.number().int().positive(), // References dispatch_course
  description: z.string().nullable(),
  notes: z.string().nullable(),
  price: z.number().nullable(), // Custom pricing override
  status: z.number().int().min(0).max(10),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  due_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  archived: z.boolean(),
  external_id: z.string().max(100).nullable(), // External system reference
});

/**
 * Legacy dispatch_order table schema
 * Additional order processing information
 */
export const LegacyOrderSchema = z.object({
  id: z.number().int().positive(),
  instruction_id: z.number().int().positive(),
  order_number: z.string().max(50),
  tracking_number: z.string().max(100).nullable(),
  shipping_address: z.string().max(1000).nullable(),
  billing_address: z.string().max(1000).nullable(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('pending'),
  shipping_status: z.enum(['pending', 'processing', 'shipped', 'delivered']).default('pending'),
  total_amount: z.number().min(0),
  tax_amount: z.number().min(0).default(0),
  shipping_cost: z.number().min(0).default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Legacy dispatch_course table schema
 * Order type/template definitions
 */
export const LegacyCourseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.string().max(100).nullable(),
  base_price: z.number().min(0).default(0),
  duration_days: z.number().int().min(1).default(1),
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  requirements: z.string().nullable(), // JSON string of requirements
  instructions: z.string().nullable(), // Processing instructions
});

// =============================================================================
// COMMUNICATION SCHEMAS
// =============================================================================

/**
 * Legacy dispatch_record table schema
 * Communication records and messages
 */
export const LegacyRecordSchema = z.object({
  id: z.number().int().positive(),
  content_type_id: z.number().int().positive(), // Django ContentType
  object_id: z.number().int().positive(), // Generic foreign key
  user_id: z.number().int().positive(),
  record_type: z.enum(['note', 'message', 'call', 'email', 'sms', 'system']),
  subject: z.string().max(500).nullable(),
  content: z.string().nullable(),
  metadata: z.string().nullable(), // JSON string
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  status: z.enum(['draft', 'sent', 'delivered', 'read', 'archived']).default('draft'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  parent_id: z.number().int().positive().nullable(), // For threading
  attachments: z.string().nullable(), // JSON array of file references
});

// =============================================================================
// WORKFLOW SCHEMAS
// =============================================================================

/**
 * Legacy dispatch_template table schema
 * Workflow templates and task definitions
 */
export const LegacyTemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.string().max(100).nullable(),
  tasks: z.string().nullable(), // JSON array of task definitions
  active: z.boolean(),
  predefined: z.boolean(), // System vs custom template
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by_id: z.number().int().positive().nullable(),
  duration_estimate: z.number().int().min(0).default(0), // Minutes
});

/**
 * Legacy dispatch_state table schema
 * Workflow state tracking
 */
export const LegacyStateSchema = z.object({
  id: z.number().int().positive(),
  content_type_id: z.number().int().positive(), // Django ContentType
  object_id: z.number().int().positive(), // Generic foreign key
  state_name: z.string().max(100),
  state_data: z.string().nullable(), // JSON state information
  entered_at: z.string().datetime(),
  exited_at: z.string().datetime().nullable(),
  duration_seconds: z.number().int().min(0).nullable(),
  user_id: z.number().int().positive().nullable(), // Who triggered the state
  notes: z.string().nullable(),
});

// =============================================================================
// FILE MANAGEMENT SCHEMAS
// =============================================================================

/**
 * Legacy dispatch_project table schema
 * File and project management
 */
export const LegacyProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  content_type_id: z.number().int().positive(), // Django ContentType
  object_id: z.number().int().positive(), // Generic foreign key
  files: z.string().nullable(), // JSON array of file information
  status: z.enum(['active', 'completed', 'archived', 'cancelled']).default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by_id: z.number().int().positive(),
  due_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  metadata: z.string().nullable(), // JSON metadata
});

// =============================================================================
// DJANGO SYSTEM SCHEMAS
// =============================================================================

/**
 * Django ContentType schema
 * For resolving generic foreign key relationships
 */
export const DjangoContentTypeSchema = z.object({
  id: z.number().int().positive(),
  app_label: z.string().min(1),
  model: z.string().min(1),
});

// =============================================================================
// COMPOSITE SCHEMAS FOR JOINS
// =============================================================================

/**
 * Combined User + Patient data for profile migration
 */
export const LegacyUserPatientSchema = z.object({
  // User fields
  user_id: z.number().int().positive(),
  username: z.string().min(1).max(150),
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  email: z.string().email().optional().or(z.literal('')),
  is_active: z.boolean(),
  date_joined: z.string().datetime(),
  last_login: z.string().datetime().nullable(),
  
  // Patient fields (nullable for non-patient users)
  patient_id: z.number().int().positive().nullable(),
  doctor_id: z.number().int().positive().nullable(),
  birthdate: z.string().datetime().nullable(),
  sex: z.enum(['M', 'F', 'O']).nullable(),
  status: z.number().int().min(0).max(10).nullable(),
  phone: z.string().max(20).nullable(),
  address: z.string().max(500).nullable(),
  emergency_contact: z.string().max(200).nullable(),
  insurance_info: z.string().max(1000).nullable(),
  medical_notes: z.string().nullable(),
  archived: z.boolean().nullable(),
});

/**
 * Combined Instruction + Order data for unified orders
 */
export const LegacyInstructionOrderSchema = z.object({
  // Instruction fields
  instruction_id: z.number().int().positive(),
  patient_id: z.number().int().positive(),
  doctor_id: z.number().int().positive(),
  office_id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  custom_price: z.number().nullable(),
  status: z.number().int().min(0).max(10),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  due_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  archived: z.boolean(),
  external_id: z.string().max(100).nullable(),
  
  // Order fields (nullable if no order exists)
  order_id: z.number().int().positive().nullable(),
  order_number: z.string().max(50).nullable(),
  tracking_number: z.string().max(100).nullable(),
  shipping_address: z.string().max(1000).nullable(),
  billing_address: z.string().max(1000).nullable(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).nullable(),
  shipping_status: z.enum(['pending', 'processing', 'shipped', 'delivered']).nullable(),
  total_amount: z.number().min(0).nullable(),
  tax_amount: z.number().min(0).nullable(),
  shipping_cost: z.number().min(0).nullable(),
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate legacy data with detailed error reporting
 */
export function validateLegacyData<T>(
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
        `Legacy data validation failed for ${context}: ${JSON.stringify(errorDetails, null, 2)}`
      );
    }
    throw error;
  }
}

/**
 * Safe parsing with detailed error context
 */
export function safeParseLegacyData<T>(
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
    error: `Legacy data validation failed for ${context}: ${JSON.stringify(errorDetails, null, 2)}`
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LegacyUser = z.infer<typeof LegacyUserSchema>;
export type LegacyPatient = z.infer<typeof LegacyPatientSchema>;
export type LegacyOffice = z.infer<typeof LegacyOfficeSchema>;
export type LegacyInstruction = z.infer<typeof LegacyInstructionSchema>;
export type LegacyOrder = z.infer<typeof LegacyOrderSchema>;
export type LegacyCourse = z.infer<typeof LegacyCourseSchema>;
export type LegacyRecord = z.infer<typeof LegacyRecordSchema>;
export type LegacyTemplate = z.infer<typeof LegacyTemplateSchema>;
export type LegacyState = z.infer<typeof LegacyStateSchema>;
export type LegacyProject = z.infer<typeof LegacyProjectSchema>;
export type DjangoContentType = z.infer<typeof DjangoContentTypeSchema>;
export type LegacyUserPatient = z.infer<typeof LegacyUserPatientSchema>;
export type LegacyInstructionOrder = z.infer<typeof LegacyInstructionOrderSchema>;