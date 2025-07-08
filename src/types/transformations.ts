/**
 * Transformation Types for Legacy-to-New Schema Mapping
 * 
 * This file contains all TypeScript types and interfaces for the
 * data transformation engine that handles complex mapping between
 * legacy healthcare data formats and the new AI-ready MDW schema.
 */

import type { 
  ValidationResult, 
  MigrationError, 
  ErrorSeverity,
  LegacyPatient,
  LegacyCase,
  LegacyOrder,
  LegacyUser,
  LegacyManufacturer,
  LegacyProduct,
  LegacyWorkflowStep,
  LegacyNote,
  LegacyAttachment,
  LegacyRecord
} from './migration';

import type {
  Patient,
  Case,
  Order,
  Profile,
  Practice,
  Product,
  WorkflowStep,
  CaseMessage,
  CaseFile
} from './database';

// Core Transformation Types
export type TransformationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type DataTypeCategory = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'uuid' | 'json';
export type MappingStrategy = 'direct' | 'computed' | 'lookup' | 'conditional' | 'custom' | 'default';
export type ValidationLevel = 'strict' | 'moderate' | 'lenient';
export type CodeSystemType = 'icd9' | 'icd10' | 'cpt' | 'snomed' | 'loinc' | 'rxnorm' | 'custom';

// Schema Mapping Configuration
export interface SchemaMapping {
  id: string;
  name: string;
  description: string;
  sourceSchema: string;
  targetSchema: string;
  version: string;
  fieldMappings: FieldMapping[];
  transformationRules: TransformationRule[];
  validationRules: ValidationRule[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  sourceType: DataTypeCategory;
  targetType: DataTypeCategory;
  strategy: MappingStrategy;
  required: boolean;
  defaultValue?: unknown;
  transformationFunction?: string;
  validationRules?: string[];
  metadata?: Record<string, unknown>;
}

export interface TransformationRule {
  id: string;
  name: string;
  description: string;
  sourceFields: string[];
  targetField: string;
  ruleType: 'field_mapping' | 'data_conversion' | 'business_logic' | 'validation' | 'enrichment';
  condition?: string;
  transformation: string;
  priority: number;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  field: string;
  ruleType: 'required' | 'format' | 'range' | 'custom' | 'business_rule';
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: unknown[];
  customValidator?: string;
  severity: ErrorSeverity;
  active: boolean;
}

// Data Type Conversion
export interface DataTypeConverter {
  sourceType: DataTypeCategory;
  targetType: DataTypeCategory;
  convert: (value: unknown, options?: ConversionOptions) => unknown;
  validate: (value: unknown) => boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversionOptions {
  format?: string;
  timezone?: string;
  precision?: number;
  scale?: number;
  encoding?: string;
  locale?: string;
  strict?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversionResult {
  success: boolean;
  value?: unknown;
  originalValue: unknown;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// Code System Mapping
export interface CodeSystemMapping {
  id: string;
  sourceSystem: CodeSystemType;
  targetSystem: CodeSystemType;
  sourceCode: string;
  targetCode: string;
  sourceDisplay?: string;
  targetDisplay?: string;
  equivalence: 'exact' | 'equivalent' | 'wider' | 'narrower' | 'inexact' | 'unmatched';
  confidence: number;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface CodeSystemMapper {
  sourceSystem: CodeSystemType;
  targetSystem: CodeSystemType;
  mapCode: (sourceCode: string) => Promise<CodeMappingResult>;
  validateCode: (code: string, system: CodeSystemType) => Promise<boolean>;
  getMapping: (sourceCode: string) => Promise<CodeSystemMapping | null>;
  metadata?: Record<string, unknown>;
}

export interface CodeMappingResult {
  success: boolean;
  sourceCode: string;
  targetCode?: string;
  equivalence?: string;
  confidence?: number;
  alternatives?: CodeSystemMapping[];
  error?: string;
  metadata?: Record<string, unknown>;
}

// Transformation Pipeline
export interface TransformationPipeline {
  id: string;
  name: string;
  description: string;
  stages: TransformationStage[];
  configuration: PipelineConfiguration;
  status: TransformationStatus;
  created_at: Date;
  updated_at: Date;
}

export interface TransformationStage {
  id: string;
  name: string;
  description: string;
  order: number;
  processor: string;
  configuration: Record<string, unknown>;
  dependencies: string[];
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface PipelineConfiguration {
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  parallelWorkers: number;
  validationLevel: ValidationLevel;
  continueOnError: boolean;
  enableAuditLog: boolean;
  enablePerformanceMetrics: boolean;
  metadata?: Record<string, unknown>;
}

// Transformation Execution
export interface TransformationContext {
  pipelineId: string;
  stageId: string;
  batchId: string;
  recordId?: string;
  sourceData: Record<string, unknown>;
  targetData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TransformationResult {
  success: boolean;
  recordId: string;
  sourceData: Record<string, unknown>;
  transformedData?: Record<string, unknown>;
  validationResult?: ValidationResult;
  errors: TransformationError[];
  warnings: string[];
  processingTimeMs: number;
  metadata?: Record<string, unknown>;
}

export interface TransformationError {
  id: string;
  type: 'mapping_error' | 'conversion_error' | 'validation_error' | 'business_rule_error' | 'system_error';
  field?: string;
  message: string;
  severity: ErrorSeverity;
  sourceValue?: unknown;
  targetValue?: unknown;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface BatchTransformationResult {
  batchId: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  results: TransformationResult[];
  errors: TransformationError[];
  processingTimeMs: number;
  metadata?: Record<string, unknown>;
}

// Legacy Schema Definitions
export interface LegacySchemaDefinition {
  name: string;
  version: string;
  description: string;
  tables: LegacyTableDefinition[];
  relationships: LegacyRelationship[];
  constraints: LegacyConstraint[];
  metadata?: Record<string, unknown>;
}

export interface LegacyTableDefinition {
  name: string;
  description?: string;
  fields: LegacyFieldDefinition[];
  primaryKey: string[];
  indexes: LegacyIndex[];
  metadata?: Record<string, unknown>;
}

export interface LegacyFieldDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
  maxLength?: number;
  precision?: number;
  scale?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface LegacyRelationship {
  name: string;
  sourceTable: string;
  sourceFields: string[];
  targetTable: string;
  targetFields: string[];
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  metadata?: Record<string, unknown>;
}

export interface LegacyConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  table: string;
  fields: string[];
  referencedTable?: string;
  referencedFields?: string[];
  condition?: string;
  metadata?: Record<string, unknown>;
}

export interface LegacyIndex {
  name: string;
  fields: string[];
  unique: boolean;
  type?: string;
  metadata?: Record<string, unknown>;
}

// Validation Engine
export interface ValidationEngine {
  validatePreTransformation: (data: Record<string, unknown>, rules: ValidationRule[]) => Promise<ValidationResult>;
  validatePostTransformation: (data: Record<string, unknown>, rules: ValidationRule[]) => Promise<ValidationResult>;
  validateBusinessRules: (data: Record<string, unknown>, rules: BusinessRule[]) => Promise<ValidationResult>;
  generateQualityScore: (data: Record<string, unknown>) => Promise<DataQualityScore>;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'reject' | 'warn' | 'transform' | 'enrich';
  severity: ErrorSeverity;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  details: QualityMetric[];
  metadata?: Record<string, unknown>;
}

export interface QualityMetric {
  field: string;
  metric: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

// Performance and Monitoring
export interface TransformationMetrics {
  pipelineId: string;
  stageId?: string;
  recordsPerSecond: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  successRate: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TransformationAuditLog {
  id: string;
  pipelineId: string;
  stageId: string;
  recordId: string;
  operation: string;
  sourceData: Record<string, unknown>;
  targetData?: Record<string, unknown>;
  transformationRules: string[];
  validationResults?: ValidationResult;
  errors?: TransformationError[];
  processingTimeMs: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Legacy Data Type Unions
export type LegacyDataRecord = 
  | LegacyPatient 
  | LegacyCase 
  | LegacyOrder 
  | LegacyUser 
  | LegacyManufacturer 
  | LegacyProduct 
  | LegacyWorkflowStep 
  | LegacyNote 
  | LegacyAttachment 
  | LegacyRecord;

export type NewDataRecord = 
  | Patient 
  | Case 
  | Order 
  | Profile 
  | Practice 
  | Product 
  | WorkflowStep 
  | CaseMessage 
  | CaseFile;

// Transformation Registry
export interface TransformationRegistry {
  getMapping: (sourceSchema: string, targetSchema: string) => Promise<SchemaMapping | null>;
  registerMapping: (mapping: SchemaMapping) => Promise<void>;
  getConverter: (sourceType: DataTypeCategory, targetType: DataTypeCategory) => DataTypeConverter | null;
  registerConverter: (converter: DataTypeConverter) => void;
  getCodeMapper: (sourceSystem: CodeSystemType, targetSystem: CodeSystemType) => CodeSystemMapper | null;
  registerCodeMapper: (mapper: CodeSystemMapper) => void;
}

// Configuration Interfaces
export interface TransformationConfiguration {
  enableStrictValidation: boolean;
  enableBusinessRules: boolean;
  enableCodeMapping: boolean;
  enableAuditLogging: boolean;
  enablePerformanceMetrics: boolean;
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  parallelWorkers: number;
  validationLevel: ValidationLevel;
  metadata?: Record<string, unknown>;
}

export interface MappingConfiguration {
  sourceSchema: string;
  targetSchema: string;
  mappingVersion: string;
  enableFieldValidation: boolean;
  enableTypeConversion: boolean;
  enableBusinessRules: boolean;
  strictMode: boolean;
  metadata?: Record<string, unknown>;
}