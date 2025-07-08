/**
 * Migration Script Types
 * 
 * TypeScript interfaces for migration script structure, data transformation
 * function signatures, error handling, and progress reporting.
 */

import type {
  MigrationScript,
  MigrationConfig,
  MigrationResult,
  MigrationError,
  ValidationResult,
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
  Practitioner,
  Product,
  CaseMessage,
  CaseFile
} from './database';

// Base Migration Script Interface
export interface BaseMigrationScript extends MigrationScript {
  scriptType: MigrationScriptType;
  sourceTable: string;
  targetTable: string;
  estimatedRecords?: number;
  prerequisites: string[];
  postProcessing?: string[];
}

// Migration Script Types
export type MigrationScriptType = 
  | 'patient'
  | 'clinical'
  | 'laboratory'
  | 'imaging'
  | 'medication'
  | 'provider';

// Data Transformation Function Signatures
export interface DataTransformer<TSource, TTarget> {
  transform(source: TSource): Promise<TTarget>;
  validate(source: TSource): Promise<ValidationResult>;
  handleConflict?(existing: TTarget, incoming: TSource): Promise<TTarget>;
}

// Patient Migration Types
export interface PatientMigrationScript extends BaseMigrationScript {
  scriptType: 'patient';
  transformer: DataTransformer<LegacyPatient, Patient>;
  deduplicationEnabled: boolean;
  mergeStrategy: PatientMergeStrategy;
}

export interface PatientMergeStrategy {
  enableAutoMerge: boolean;
  confidenceThreshold: number;
  conflictResolution: 'prefer_newest' | 'prefer_oldest' | 'prefer_complete' | 'manual_review';
  preserveAllIds: boolean;
}

// Clinical Migration Types
export interface ClinicalMigrationScript extends BaseMigrationScript {
  scriptType: 'clinical';
  transformer: DataTransformer<LegacyCase, Case>;
  codeTransformation: ClinicalCodeTransformation;
  relationshipMapping: ClinicalRelationshipMapping;
}

export interface ClinicalCodeTransformation {
  diagnosisCodes: CodeMappingRule[];
  procedureCodes: CodeMappingRule[];
  terminologyMappings: TerminologyMapping[];
}

export interface CodeMappingRule {
  sourceCodeSystem: string;
  targetCodeSystem: string;
  mappingTable: Record<string, string>;
  defaultMapping?: string;
}

export interface TerminologyMapping {
  sourceTerminology: string;
  targetTerminology: string;
  mappingService?: string;
  fallbackStrategy: 'preserve_original' | 'use_default' | 'flag_for_review';
}

export interface ClinicalRelationshipMapping {
  patientRelationships: boolean;
  providerRelationships: boolean;
  encounterHierarchy: boolean;
  preserveTimestamps: boolean;
}

// Laboratory Migration Types
export interface LaboratoryMigrationScript extends BaseMigrationScript {
  scriptType: 'laboratory';
  transformer: DataTransformer<LegacyRecord, CaseMessage>;
  labCodeTransformation: LabCodeTransformation;
  unitConversion: UnitConversionRules;
  temporalMapping: TemporalRelationshipMapping;
}

export interface LabCodeTransformation {
  loincMappings: Record<string, string>;
  localCodeMappings: Record<string, string>;
  testNameNormalization: boolean;
  preserveOriginalCodes: boolean;
}

export interface UnitConversionRules {
  enableConversion: boolean;
  conversionTable: Record<string, UnitConversion>;
  preserveOriginalUnits: boolean;
}

export interface UnitConversion {
  sourceUnit: string;
  targetUnit: string;
  conversionFactor: number;
  conversionFormula?: string;
}

export interface TemporalRelationshipMapping {
  orderToResultMapping: boolean;
  panelComponentMapping: boolean;
  preserveCollectionTimes: boolean;
  timeZoneHandling: 'preserve' | 'convert_to_utc' | 'use_facility_timezone';
}

// Imaging Migration Types
export interface ImagingMigrationScript extends BaseMigrationScript {
  scriptType: 'imaging';
  transformer: DataTransformer<LegacyAttachment, CaseFile>;
  dicomTransformation: DicomTransformation;
  modalityMapping: ModalityMapping;
  studyHierarchy: StudyHierarchyMapping;
}

export interface DicomTransformation {
  preserveMetadata: boolean;
  extractKeyTags: string[];
  anonymizationRules?: AnonymizationRule[];
  compressionSettings?: CompressionSettings;
}

export interface AnonymizationRule {
  tagId: string;
  action: 'remove' | 'replace' | 'hash' | 'preserve';
  replacementValue?: string;
}

export interface CompressionSettings {
  enableCompression: boolean;
  compressionType: 'lossless' | 'lossy';
  qualityLevel?: number;
}

export interface ModalityMapping {
  modalityCodeMappings: Record<string, string>;
  bodyPartMappings: Record<string, string>;
  procedureCodeMappings: Record<string, string>;
}

export interface StudyHierarchyMapping {
  preserveStudyStructure: boolean;
  seriesGrouping: boolean;
  instanceOrdering: boolean;
  crossReferenceMapping: boolean;
}

// Medication Migration Types
export interface MedicationMigrationScript extends BaseMigrationScript {
  scriptType: 'medication';
  transformer: DataTransformer<LegacyRecord, CaseMessage>;
  drugCodeTransformation: DrugCodeTransformation;
  dosageNormalization: DosageNormalization;
  allergyMapping: AllergyMapping;
}

export interface DrugCodeTransformation {
  ndcMappings: Record<string, string>;
  rxNormMappings: Record<string, string>;
  localFormularyMappings: Record<string, string>;
  strengthNormalization: boolean;
}

export interface DosageNormalization {
  enableNormalization: boolean;
  unitStandardization: Record<string, string>;
  frequencyMappings: Record<string, string>;
  routeMappings: Record<string, string>;
}

export interface AllergyMapping {
  allergenCodeMappings: Record<string, string>;
  severityMappings: Record<string, string>;
  reactionMappings: Record<string, string>;
  preserveNarrative: boolean;
}

// Provider Migration Types
export interface ProviderMigrationScript extends BaseMigrationScript {
  scriptType: 'provider';
  transformer: DataTransformer<LegacyRecord, CaseMessage>;
  credentialMapping: CredentialMapping;
  specialtyMapping: SpecialtyMapping;
  organizationMapping: OrganizationMapping;
}

export interface CredentialMapping {
  licenseNumberValidation: boolean;
  credentialVerification: boolean;
  expirationDateHandling: 'preserve' | 'validate' | 'flag_expired';
  multiStateHandling: boolean;
}

export interface SpecialtyMapping {
  specialtyCodeMappings: Record<string, string>;
  boardCertificationMapping: Record<string, string>;
  subspecialtyHandling: boolean;
}

export interface OrganizationMapping {
  facilityMappings: Record<string, string>;
  departmentMappings: Record<string, string>;
  hierarchyPreservation: boolean;
  affiliationTracking: boolean;
}

// Progress Reporting Interfaces
export interface MigrationProgress {
  scriptName: string;
  currentPhase: MigrationPhase;
  recordsProcessed: number;
  recordsTotal: number;
  recordsFailed: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  throughputPerSecond: number;
  memoryUsage: number;
}

export type MigrationPhase = 
  | 'initializing'
  | 'validating'
  | 'extracting'
  | 'transforming'
  | 'loading'
  | 'post_processing'
  | 'completed'
  | 'failed';

export interface ProgressReporter {
  reportProgress(progress: MigrationProgress): void;
  reportError(error: MigrationError): void;
  reportWarning(warning: string): void;
  reportInfo(message: string): void;
}

// Error Handling Types
export interface MigrationErrorHandler {
  handleError(error: Error, context: MigrationErrorContext): Promise<ErrorResolution>;
  shouldRetry(error: Error, retryCount: number): boolean;
  getRetryDelay(retryCount: number): number;
}

export interface MigrationErrorContext {
  scriptName: string;
  recordId: string;
  batchId: string;
  phase: MigrationPhase;
  sourceData?: Record<string, unknown>;
  targetData?: Record<string, unknown>;
}

export interface ErrorResolution {
  action: ErrorAction;
  modifiedData?: Record<string, unknown>;
  skipRecord?: boolean;
  retryWithDelay?: number;
  escalateToManual?: boolean;
}

export type ErrorAction = 
  | 'retry'
  | 'skip'
  | 'modify_and_retry'
  | 'manual_review'
  | 'abort_batch'
  | 'abort_migration';

// Validation Types
export interface MigrationValidator {
  validateSource(data: Record<string, unknown>): Promise<ValidationResult>;
  validateTarget(data: Record<string, unknown>): Promise<ValidationResult>;
  validateTransformation(source: Record<string, unknown>, target: Record<string, unknown>): Promise<ValidationResult>;
}

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validator: (data: Record<string, unknown>) => Promise<boolean>;
  errorMessage: string;
}

// Batch Processing Types
export interface BatchConfiguration {
  batchSize: number;
  maxConcurrentBatches: number;
  batchTimeout: number;
  retryPolicy: BatchRetryPolicy;
  checkpointInterval: number;
}

export interface BatchRetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

export interface BatchResult<T> {
  batchId: string;
  processed: T[];
  failed: MigrationError[];
  skipped: string[];
  processingTime: number;
  memoryUsage: number;
}

// Checkpoint and Recovery Types
export interface MigrationCheckpoint {
  scriptName: string;
  batchId: string;
  timestamp: Date;
  recordsProcessed: number;
  lastProcessedId: string;
  state: Record<string, unknown>;
}

export interface RecoveryManager {
  saveCheckpoint(checkpoint: MigrationCheckpoint): Promise<void>;
  loadCheckpoint(scriptName: string): Promise<MigrationCheckpoint | null>;
  clearCheckpoint(scriptName: string): Promise<void>;
  listCheckpoints(): Promise<MigrationCheckpoint[]>;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  scriptName: string;
  startTime: Date;
  endTime?: Date;
  totalRecords: number;
  recordsPerSecond: number;
  averageBatchTime: number;
  peakMemoryUsage: number;
  errorRate: number;
  retryRate: number;
}

export interface PerformanceMonitor {
  startMonitoring(scriptName: string): void;
  recordMetric(metric: string, value: number): void;
  getMetrics(scriptName: string): PerformanceMetrics;
  stopMonitoring(scriptName: string): PerformanceMetrics;
}

// Script Registry Types
export interface MigrationScriptRegistry {
  registerScript(script: BaseMigrationScript): void;
  getScript(name: string): BaseMigrationScript | null;
  listScripts(): BaseMigrationScript[];
  getScriptsByType(type: MigrationScriptType): BaseMigrationScript[];
  validateDependencies(scripts: BaseMigrationScript[]): ValidationResult;
  getExecutionOrder(scripts: BaseMigrationScript[]): BaseMigrationScript[];
}

export interface ScriptDependency {
  scriptName: string;
  dependsOn: string[];
  optional: boolean;
  version?: string;
}

// Configuration Types
export interface MigrationScriptConfig extends MigrationConfig {
  enableDeduplication: boolean;
  enableValidation: boolean;
  enableCheckpoints: boolean;
  enablePerformanceMonitoring: boolean;
  customTransformations: Record<string, unknown>;
  outputFormat: 'json' | 'csv' | 'xml';
  compressionEnabled: boolean;
}

// Export utility type for script creation
export type CreateMigrationScript<T extends BaseMigrationScript> = Omit<T, 'execute' | 'rollback' | 'validate'> & {
  executeFunction: (config: MigrationConfig) => Promise<MigrationResult>;
  rollbackFunction: (batchId: string) => Promise<void>;
  validateFunction: (batchId: string) => Promise<ValidationResult>;
};