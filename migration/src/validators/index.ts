/**
 * Validation Schemas Index
 * 
 * Centralized exports for all Zod validation schemas used in the database migration tool.
 * Provides a single import point for legacy and Supabase validation schemas.
 */

// Legacy database schemas
export {
  // Core legacy schemas
  LegacyUserSchema,
  LegacyPatientSchema,
  LegacyOfficeSchema,
  LegacyInstructionSchema,
  LegacyOrderSchema,
  LegacyCourseSchema,
  
  // Communication schemas
  LegacyRecordSchema,
  
  // Workflow schemas
  LegacyTemplateSchema,
  LegacyStateSchema,
  
  // File management schemas
  LegacyProjectSchema,
  
  // System schemas
  DjangoContentTypeSchema,
  
  // Composite schemas
  LegacyUserPatientSchema,
  LegacyInstructionOrderSchema,
  
  // Validation helpers
  validateLegacyData,
  safeParseLegacyData,
  
  // Type exports
  type LegacyUser,
  type LegacyPatient,
  type LegacyOffice,
  type LegacyInstruction,
  type LegacyOrder,
  type LegacyCourse,
  type LegacyRecord,
  type LegacyTemplate,
  type LegacyState,
  type LegacyProject,
  type DjangoContentType,
  type LegacyUserPatient,
  type LegacyInstructionOrder,
} from './legacy-schemas';

// Supabase target schemas
export {
  // Core Supabase schemas
  SupabaseProfileSchema,
  SupabaseOfficeSchema,
  SupabaseOrderTypeSchema,
  SupabaseOrderSchema,
  
  // Workflow schemas
  SupabaseWorkflowTemplateSchema,
  SupabaseWorkflowTaskSchema,
  SupabaseOrderStateSchema,
  
  // Communication schemas
  SupabaseMessageTypeSchema,
  SupabaseMessageSchema,
  
  // Project management schemas
  SupabaseProjectSchema,
  SupabaseProjectFileSchema,
  
  // AI and embedding schemas
  SupabaseEmbeddingSchema,
  SupabaseSearchQuerySchema,
  
  // Validation helpers
  validateSupabaseData,
  safeParseSupabaseData,
  validateDataTransformation,
  
  // Type exports
  type SupabaseProfile,
  type SupabaseOffice,
  type SupabaseOrderType,
  type SupabaseOrder,
  type SupabaseWorkflowTemplate,
  type SupabaseWorkflowTask,
  type SupabaseOrderState,
  type SupabaseMessageType,
  type SupabaseMessage,
  type SupabaseProject,
  type SupabaseProjectFile,
  type SupabaseEmbedding,
  type SupabaseSearchQuery,
} from './supabase-schemas';

// =============================================================================
// TRANSFORMATION VALIDATION UTILITIES
// =============================================================================

/**
 * Common validation patterns for data transformation
 */
export const ValidationPatterns = {
  /**
   * UUID validation pattern
   */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  /**
   * Email validation pattern (basic)
   */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  /**
   * Phone number validation pattern (US format)
   */
  PHONE: /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
  
  /**
   * Zip code validation pattern (US format)
   */
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
} as const;

/**
 * Common validation error messages
 */
export const ValidationMessages = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_UUID: 'Please enter a valid UUID',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_ZIP: 'Please enter a valid zip code',
  INVALID_DATE: 'Please enter a valid date',
  TOO_SHORT: (min: number) => `Must be at least ${min} characters long`,
  TOO_LONG: (max: number) => `Must be no more than ${max} characters long`,
  INVALID_RANGE: (min: number, max: number) => `Must be between ${min} and ${max}`,
} as const;

/**
 * Migration-specific validation utilities
 */
export const MigrationValidation = {
  /**
   * Validate legacy ID preservation
   */
  validateLegacyIdPreservation: (legacyId: number, targetRecord: { legacy_user_id?: number; legacy_patient_id?: number; legacy_office_id?: number; legacy_instruction_id?: number }) => {
    const hasLegacyId = Object.values(targetRecord).some(id => id === legacyId);
    if (!hasLegacyId) {
      throw new Error(`Legacy ID ${legacyId} not preserved in target record`);
    }
    return true;
  },
  
  /**
   * Validate ContentTypes normalization
   */
  validateContentTypesNormalization: (record: Record<string, unknown>) => {
    const hasContentType = 'content_type_id' in record;
    const hasObjectId = 'object_id' in record;
    
    if (hasContentType || hasObjectId) {
      throw new Error('ContentTypes generic relationships found - must be normalized to explicit foreign keys');
    }
    return true;
  },
  
  /**
   * Validate UUID format
   */
  validateUUID: (uuid: string) => {
    if (!ValidationPatterns.UUID.test(uuid)) {
      throw new Error(`Invalid UUID format: ${uuid}`);
    }
    return true;
  },
  
  /**
   * Validate data consistency between legacy and target
   */
  validateDataConsistency: <L, S>(
    legacy: L,
    target: S,
    fieldMappings: Array<{ legacy: keyof L; target: keyof S; transform?: (value: L[keyof L]) => S[keyof S] }>
  ) => {
    for (const mapping of fieldMappings) {
      const legacyValue = legacy[mapping.legacy];
      const targetValue = target[mapping.target];
      
      if (mapping.transform) {
        const expectedValue = mapping.transform(legacyValue);
        if (JSON.stringify(expectedValue) !== JSON.stringify(targetValue)) {
          throw new Error(`Data inconsistency: ${String(mapping.legacy)} -> ${String(mapping.target)}`);
        }
      } else if (JSON.stringify(legacyValue) !== JSON.stringify(targetValue)) {
        throw new Error(`Data inconsistency: ${String(mapping.legacy)} -> ${String(mapping.target)}`);
      }
    }
    return true;
  },
} as const;

/**
 * Batch validation utilities for processing multiple records
 */
export const BatchValidation = {
  /**
   * Validate multiple records with detailed error reporting
   */
  validateBatch: <T>(
    schema: import('zod').ZodSchema<T>,
    records: unknown[],
    context: string
  ): { valid: T[]; invalid: Array<{ index: number; record: unknown; error: string }> } => {
    const valid: T[] = [];
    const invalid: Array<{ index: number; record: unknown; error: string }> = [];
    
    records.forEach((record, index) => {
      try {
        const validRecord = schema.parse(record);
        valid.push(validRecord);
      } catch (error) {
        invalid.push({
          index,
          record,
          error: `${context} validation failed at index ${index}: ${error instanceof Error ? error.message : 'Unknown validation error'}`
        });
      }
    });
    
    return { valid, invalid };
  },
  
  /**
   * Get validation statistics for a batch
   */
  getValidationStats: (validCount: number, invalidCount: number) => ({
    total: validCount + invalidCount,
    valid: validCount,
    invalid: invalidCount,
    successRate: validCount / (validCount + invalidCount),
    errorRate: invalidCount / (validCount + invalidCount),
  }),
} as const;