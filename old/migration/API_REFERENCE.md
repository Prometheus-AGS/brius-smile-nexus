# Healthcare Data Migration System - API Reference

## Table of Contents

1. [Overview](#overview)
2. [Migration Engine API](#migration-engine-api)
3. [Zustand Store API](#zustand-store-api)
4. [Custom Hooks Reference](#custom-hooks-reference)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Configuration Options](#configuration-options)
7. [Transformation Pipeline API](#transformation-pipeline-api)
8. [Validation Engine API](#validation-engine-api)
9. [Error Handling API](#error-handling-api)
10. [Utility Functions](#utility-functions)
11. [Event System API](#event-system-api)
12. [Testing Utilities](#testing-utilities)

## Overview

This document provides comprehensive API reference for the healthcare data migration system. It covers all public interfaces, methods, types, and configuration options available for developers working with the migration system.

### API Design Principles

- **Type Safety**: All APIs are fully typed with TypeScript
- **Consistency**: Consistent naming conventions and patterns
- **Error Handling**: Comprehensive error handling with typed exceptions
- **Async/Await**: Modern async patterns throughout
- **Immutability**: State updates follow immutable patterns
- **Composability**: APIs designed for composition and reuse

### Import Patterns

```typescript
// Migration Engine
import { MigrationEngine } from '@/lib/migration-engine';
import type { MigrationConfig, MigrationStatus } from '@/types/migration';

// Stores and Hooks
import { useMigrationStore } from '@/stores/migration-store';
import { useMigrationActions } from '@/hooks/use-migration-actions';

// Transformation Pipeline
import { TransformationPipeline } from '@/lib/transformations/transformation-pipeline';
import type { TransformationRule } from '@/types/transformations';

// Utilities
import { validatePatientData } from '@/lib/validation/patient-validator';
import { formatMedicalCode } from '@/utils/medical-code-formatter';
```

## Migration Engine API

### MigrationEngine Class

The core migration engine that orchestrates data migration operations.

```typescript
class MigrationEngine {
  constructor(config: MigrationConfig);
  
  // Core migration methods
  async startMigration(jobId: string): Promise<MigrationJob>;
  async pauseMigration(jobId: string): Promise<void>;
  async resumeMigration(jobId: string): Promise<void>;
  async stopMigration(jobId: string): Promise<void>;
  async emergencyStop(): Promise<void>;
  
  // Status and monitoring
  async getStatus(jobId: string): Promise<MigrationStatus>;
  async getProgress(jobId: string): Promise<MigrationProgress>;
  async getMetrics(): Promise<MigrationMetrics>;
  
  // Configuration
  updateConfig(config: Partial<MigrationConfig>): void;
  getConfig(): MigrationConfig;
  
  // Event handling
  on(event: MigrationEvent, handler: EventHandler): void;
  off(event: MigrationEvent, handler: EventHandler): void;
  emit(event: MigrationEvent, data: any): void;
}
```

#### Constructor

```typescript
constructor(config: MigrationConfig)
```

**Parameters:**
- `config: MigrationConfig` - Migration configuration object

**Example:**
```typescript
const migrationEngine = new MigrationEngine({
  batchSize: 1000,
  maxConcurrency: 3,
  timeout: 300000,
  retryAttempts: 3,
  retryDelay: 5000,
  enableLogging: true,
  logLevel: 'info'
});
```

#### startMigration()

```typescript
async startMigration(jobId: string): Promise<MigrationJob>
```

Starts a new migration job or resumes an existing one.

**Parameters:**
- `jobId: string` - Unique identifier for the migration job

**Returns:**
- `Promise<MigrationJob>` - Migration job object with status and metadata

**Throws:**
- `MigrationError` - If migration cannot be started
- `ValidationError` - If job configuration is invalid

**Example:**
```typescript
try {
  const job = await migrationEngine.startMigration('migration-001');
  console.log(`Migration started: ${job.id}, Status: ${job.status}`);
} catch (error) {
  if (error instanceof MigrationError) {
    console.error('Migration failed to start:', error.message);
  }
}
```

#### getStatus()

```typescript
async getStatus(jobId: string): Promise<MigrationStatus>
```

Retrieves the current status of a migration job.

**Parameters:**
- `jobId: string` - Migration job identifier

**Returns:**
- `Promise<MigrationStatus>` - Current migration status

**Example:**
```typescript
const status = await migrationEngine.getStatus('migration-001');
console.log(`Status: ${status.state}, Progress: ${status.progress}%`);
```

#### getProgress()

```typescript
async getProgress(jobId: string): Promise<MigrationProgress>
```

Gets detailed progress information for a migration job.

**Parameters:**
- `jobId: string` - Migration job identifier

**Returns:**
- `Promise<MigrationProgress>` - Detailed progress information

**Example:**
```typescript
const progress = await migrationEngine.getProgress('migration-001');
console.log(`Processed: ${progress.recordsProcessed}/${progress.totalRecords}`);
console.log(`Errors: ${progress.errorCount}, Success Rate: ${progress.successRate}%`);
```

### Migration Configuration

```typescript
interface MigrationConfig {
  // Processing configuration
  batchSize: number;
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  
  // Data source configuration
  sourceDatabase: DatabaseConfig;
  targetDatabase: DatabaseConfig;
  
  // Transformation configuration
  transformationRules: TransformationRule[];
  validationRules: ValidationRule[];
  
  // Performance configuration
  memoryLimit: string;
  enableParallelProcessing: boolean;
  enableCaching: boolean;
  
  // Logging configuration
  enableLogging: boolean;
  logLevel: LogLevel;
  logDestination: string;
  
  // Security configuration
  enableEncryption: boolean;
  encryptionKey: string;
  enableAuditLogging: boolean;
}
```

### Migration Status Types

```typescript
interface MigrationStatus {
  jobId: string;
  state: MigrationState;
  progress: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  totalRecords: number;
  errorCount: number;
  successRate: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number;
}

type MigrationState = 
  | 'pending'
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface MigrationProgress {
  recordsProcessed: number;
  totalRecords: number;
  errorCount: number;
  successRate: number;
  throughput: number;
  averageProcessingTime: number;
  estimatedTimeRemaining: number;
  currentPhase: MigrationPhase;
  phaseProgress: number;
}

type MigrationPhase = 
  | 'initialization'
  | 'data_extraction'
  | 'data_transformation'
  | 'data_validation'
  | 'data_loading'
  | 'finalization';
```

## Zustand Store API

### Migration Store

The central state management store for migration operations.

```typescript
interface MigrationStore {
  // State
  jobs: Record<string, MigrationJob>;
  activeJobId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setActiveJob: (jobId: string) => void;
  addJob: (job: MigrationJob) => void;
  updateJob: (jobId: string, updates: Partial<MigrationJob>) => void;
  removeJob: (jobId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed values
  getActiveJob: () => MigrationJob | null;
  getJobsByStatus: (status: MigrationState) => MigrationJob[];
  getTotalJobs: () => number;
  getRunningJobs: () => MigrationJob[];
}
```

### Store Implementation

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useMigrationStore = create<MigrationStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        jobs: {},
        activeJobId: null,
        isLoading: false,
        error: null,
        
        // Actions
        setActiveJob: (jobId: string) => 
          set({ activeJobId: jobId }, false, 'setActiveJob'),
          
        addJob: (job: MigrationJob) =>
          set(
            (state) => ({
              jobs: { ...state.jobs, [job.id]: job }
            }),
            false,
            'addJob'
          ),
          
        updateJob: (jobId: string, updates: Partial<MigrationJob>) =>
          set(
            (state) => ({
              jobs: {
                ...state.jobs,
                [jobId]: { ...state.jobs[jobId], ...updates }
              }
            }),
            false,
            'updateJob'
          ),
          
        removeJob: (jobId: string) =>
          set(
            (state) => {
              const { [jobId]: removed, ...remainingJobs } = state.jobs;
              return {
                jobs: remainingJobs,
                activeJobId: state.activeJobId === jobId ? null : state.activeJobId
              };
            },
            false,
            'removeJob'
          ),
          
        setLoading: (loading: boolean) =>
          set({ isLoading: loading }, false, 'setLoading'),
          
        setError: (error: string | null) =>
          set({ error }, false, 'setError'),
          
        clearError: () =>
          set({ error: null }, false, 'clearError'),
          
        // Computed values
        getActiveJob: () => {
          const { jobs, activeJobId } = get();
          return activeJobId ? jobs[activeJobId] || null : null;
        },
        
        getJobsByStatus: (status: MigrationState) => {
          const { jobs } = get();
          return Object.values(jobs).filter(job => job.status === status);
        },
        
        getTotalJobs: () => {
          const { jobs } = get();
          return Object.keys(jobs).length;
        },
        
        getRunningJobs: () => {
          const { jobs } = get();
          return Object.values(jobs).filter(job => 
            ['running', 'initializing'].includes(job.status)
          );
        }
      }),
      {
        name: 'migration-store',
        partialize: (state) => ({
          jobs: state.jobs,
          activeJobId: state.activeJobId
        })
      }
    ),
    { name: 'migration-store' }
  )
);
```

## Custom Hooks Reference

### useMigrationActions

Custom hook for migration actions with proper error handling and loading states.

```typescript
export function useMigrationActions() {
  const store = useMigrationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMigration = useCallback(async (config: MigrationConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const job = await migrationEngine.startMigration(config.jobId);
      store.addJob(job);
      store.setActiveJob(job.id);
      return job;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const pauseMigration = useCallback(async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await migrationEngine.pauseMigration(jobId);
      store.updateJob(jobId, { status: 'paused' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const resumeMigration = useCallback(async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await migrationEngine.resumeMigration(jobId);
      store.updateJob(jobId, { status: 'running' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  const stopMigration = useCallback(async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await migrationEngine.stopMigration(jobId);
      store.updateJob(jobId, { status: 'cancelled' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  return {
    startMigration,
    pauseMigration,
    resumeMigration,
    stopMigration,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
```

### useMigrationStatus

Hook for real-time migration status updates.

```typescript
export function useMigrationStatus(jobId: string | null) {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    let intervalId: NodeJS.Timeout;
    
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const currentStatus = await migrationEngine.getStatus(jobId);
        setStatus(currentStatus);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling for active migrations
    if (status?.state === 'running' || status?.state === 'initializing') {
      intervalId = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, status?.state]);

  return { status, isLoading, error };
}
```

### useMigrationProgress

Hook for detailed migration progress tracking.

```typescript
export function useMigrationProgress(jobId: string | null) {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setProgress(null);
      return;
    }

    let intervalId: NodeJS.Timeout;
    
    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const currentProgress = await migrationEngine.getProgress(jobId);
        setProgress(currentProgress);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Set up polling for active migrations
    intervalId = setInterval(fetchProgress, 2000); // Poll every 2 seconds

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId]);

  return { progress, isLoading, error };
}
```

## TypeScript Interfaces

### Core Migration Types

```typescript
interface MigrationJob {
  id: string;
  name: string;
  description?: string;
  status: MigrationState;
  config: MigrationConfig;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  organizationId: string;
  sourceSystem: string;
  targetSystem: string;
  recordCount: number;
  processedCount: number;
  errorCount: number;
  metadata: Record<string, any>;
}

interface MigrationMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRecordsProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  throughput: number;
  errorRate: number;
  systemLoad: SystemLoad;
}

interface SystemLoad {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  databaseConnections: number;
}
```

### Database Types

```typescript
interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
  poolSize?: number;
  schema?: string;
}

type DatabaseType = 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'sqlite';

interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
  indexes: IndexDefinition[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}
```

### Transformation Types

```typescript
interface TransformationRule {
  id: string;
  name: string;
  description?: string;
  sourceTable: string;
  targetTable: string;
  fieldMappings: FieldMapping[];
  conditions?: TransformationCondition[];
  enabled: boolean;
  priority: number;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: TransformationType;
  defaultValue?: any;
  required: boolean;
  validation?: ValidationRule[];
}

type TransformationType = 
  | 'direct'
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'date_format'
  | 'code_mapping'
  | 'concatenate'
  | 'split'
  | 'custom';

interface TransformationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: any;
  action: 'include' | 'exclude' | 'transform';
}
```

### Validation Types

```typescript
interface ValidationRule {
  id: string;
  name: string;
  type: ValidationType;
  field: string;
  parameters: Record<string, any>;
  errorMessage: string;
  severity: ValidationSeverity;
  enabled: boolean;
}

type ValidationType = 
  | 'required'
  | 'min_length'
  | 'max_length'
  | 'pattern'
  | 'date_range'
  | 'numeric_range'
  | 'code_system'
  | 'referential_integrity'
  | 'custom';

type ValidationSeverity = 'error' | 'warning' | 'info';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recordsValidated: number;
  errorCount: number;
  warningCount: number;
}

interface ValidationError {
  ruleId: string;
  field: string;
  message: string;
  value: any;
  recordId?: string;
  severity: ValidationSeverity;
}

interface ValidationWarning {
  ruleId: string;
  field: string;
  message: string;
  value: any;
  recordId?: string;
}
```

## Configuration Options

### Migration Engine Configuration

```typescript
interface MigrationEngineConfig {
  // Core settings
  batchSize: number; // Default: 1000
  maxConcurrency: number; // Default: 3
  timeout: number; // Default: 300000 (5 minutes)
  retryAttempts: number; // Default: 3
  retryDelay: number; // Default: 5000 (5 seconds)
  
  // Performance settings
  memoryLimit: string; // Default: '2GB'
  enableParallelProcessing: boolean; // Default: true
  enableCaching: boolean; // Default: true
  cacheSize: number; // Default: 10000
  
  // Logging settings
  enableLogging: boolean; // Default: true
  logLevel: LogLevel; // Default: 'info'
  logDestination: string; // Default: 'console'
  enablePerformanceLogging: boolean; // Default: false
  
  // Security settings
  enableEncryption: boolean; // Default: true
  encryptionAlgorithm: string; // Default: 'AES-256-GCM'
  enableAuditLogging: boolean; // Default: true
  
  // Error handling settings
  continueOnError: boolean; // Default: false
  errorThreshold: number; // Default: 0.05 (5%)
  enableErrorRecovery: boolean; // Default: true
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

### Transformation Pipeline Configuration

```typescript
interface TransformationPipelineConfig {
  // Processing settings
  enableParallelTransformation: boolean; // Default: true
  transformationTimeout: number; // Default: 30000 (30 seconds)
  enableTransformationCaching: boolean; // Default: true
  
  // Validation settings
  enablePreTransformationValidation: boolean; // Default: true
  enablePostTransformationValidation: boolean; // Default: true
  validationMode: ValidationMode; // Default: 'strict'
  
  // Error handling
  transformationErrorAction: ErrorAction; // Default: 'skip'
  enableTransformationRetry: boolean; // Default: true
  maxTransformationRetries: number; // Default: 3
  
  // Performance settings
  enableTransformationMetrics: boolean; // Default: true
  enableTransformationProfiling: boolean; // Default: false
}

type ValidationMode = 'strict' | 'lenient' | 'disabled';
type ErrorAction = 'skip' | 'fail' | 'retry' | 'log';
```

## Transformation Pipeline API

### TransformationPipeline Class

```typescript
class TransformationPipeline {
  constructor(config: TransformationPipelineConfig);
  
  // Core transformation methods
  async transform(data: Record<string, any>, rules: TransformationRule[]): Promise<TransformationResult>;
  async transformBatch(data: Record<string, any>[], rules: TransformationRule[]): Promise<BatchTransformationResult>;
  
  // Rule management
  addRule(rule: TransformationRule): void;
  removeRule(ruleId: string): void;
  updateRule(ruleId: string, updates: Partial<TransformationRule>): void;
  getRules(): TransformationRule[];
  
  // Validation
  async validate(data: Record<string, any>, rules: ValidationRule[]): Promise<ValidationResult>;
  
  // Configuration
  updateConfig(config: Partial<TransformationPipelineConfig>): void;
  getConfig(): TransformationPipelineConfig;
}
```

#### transform()

```typescript
async transform(
  data: Record<string, any>, 
  rules: TransformationRule[]
): Promise<TransformationResult>
```

Transforms a single record according to the provided rules.

**Parameters:**
- `data: Record<string, any>` - Source data record
- `rules: TransformationRule[]` - Array of transformation rules to apply

**Returns:**
- `Promise<TransformationResult>` - Transformation result with transformed data and metadata

**Example:**
```typescript
const sourceData = {
  pat_id: '12345',
  pat_fname: '  John  ',
  pat_lname: 'DOE',
  birth_dt: '1990-01-15'
};

const rules: TransformationRule[] = [
  {
    id: 'patient-mapping',
    name: 'Patient Data Mapping',
    sourceTable: 'legacy_patients',
    targetTable: 'patients',
    fieldMappings: [
      {
        sourceField: 'pat_id',
        targetField: 'patient_id',
        transformation: 'direct',
        required: true
      },
      {
        sourceField: 'pat_fname',
        targetField: 'first_name',
        transformation: 'trim',
        required: true
      },
      {
        sourceField: 'pat_lname',
        targetField: 'last_name',
        transformation: 'lowercase',
        required: true
      },
      {
        sourceField: 'birth_dt',
        targetField: 'birth_date',
        transformation: 'date_format',
        required: true
      }
    ],
    enabled: true,
    priority: 1
  }
];

const result = await transformationPipeline.transform(sourceData, rules);
console.log(result.transformedData);
// Output: {
//   patient_id: '12345',
//   first_name: 'John',
//   last_name: 'doe',
//   birth_date: '1990-01-15T00:00:00.000Z'
// }
```

### Transformation Result Types

```typescript
interface TransformationResult {
  success: boolean;
  transformedData: Record<string, any>;
  originalData: Record<string, any>;
  appliedRules: string[];
  errors: TransformationError[];
  warnings: TransformationWarning[];
  metadata: TransformationMetadata;
}

interface BatchTransformationResult {
  success: boolean;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  transformedData: Record<string, any>[];
  errors: TransformationError[];
  warnings: TransformationWarning[];
  metadata: BatchTransformationMetadata;
}

interface TransformationError {
  ruleId: string;
  field: string;
  message: string;
  originalValue: any;
  errorCode: string;
}

interface TransformationWarning {
  ruleId: string;
  field: string;
  message: string;
  originalValue: any;
  warningCode: string;
}

interface TransformationMetadata {
  processingTime: number;
  rulesApplied: number;
  fieldsTransformed: number;
  validationsPassed: number;
  validationsFailed: number;
}
```

## Validation Engine API

### ValidationEngine Class

```typescript
class ValidationEngine {
  constructor(config: ValidationEngineConfig);
  
  // Core validation methods
  async validate(data: Record<string, any>, rules: ValidationRule[]): Promise<ValidationResult>;
  async validateBatch(data: Record<string, any>[], rules: ValidationRule[]): Promise<BatchValidationResult>;
  
  // Rule management
  addRule(rule: ValidationRule): void;
  removeRule(ruleId: string): void;
  updateRule(ruleId: string, updates: Partial<ValidationRule>): void;
  getRules(): ValidationRule[];
  
  // Custom validators
  registerCustomValidator(name: string, validator: CustomValidator): void;
  unregisterCustomValidator(name: string): void;
  
  // Configuration
  updateConfig(config: Partial<ValidationEngineConfig>): void;
  getConfig(): ValidationEngineConfig;
}
```

#### validate()

```typescript
async validate(
  data: Record<string, any>, 
  rules: ValidationRule[]
): Promise<ValidationResult>
```

Validates a single record against the provided validation rules.

**Parameters:**
- `data: Record<string, any>` - Data record to validate
- `rules: ValidationRule[]` - Array of validation rules to apply

**Returns:**
- `Promise<ValidationResult>` - Validation result with errors and warnings

**Example:**
```typescript
const patientData = {
  patient_id: '12345',
  first_name: 'John',
  last_name: 'Doe',
  birth_date: '1990-01-15',
  email: 'john.doe@example.com'
};

const validationRules: ValidationRule[] = [
  {
    id: 'patient-id-required',
    name: 'Patient ID Required',
    type: 'required',
    field: 'patient_id',
    parameters: {},
    errorMessage: 'Patient ID is required',
    severity: 'error',
    enabled: true
  },
  {
    id: 'email-format',
    name: 'Email Format Validation',
    type: 'pattern',
    field: 'email',
    parameters: {
      pattern: '^[^@]+@[^@]+\\.[^@]+$'
    },
    errorMessage: 'Invalid email format',
    severity: 'error',
    enabled: true
  },
  {
    id: 'birth-date-range',
    name: 'Birth Date Range',
    type: 'date_range',
    field: 'birth_date',
    parameters: {
      minDate: '1900-01-01',
      maxDate: new Date().toISOString().split('T')[0]
    },
    errorMessage: 'Birth date must be between 1900 and today',
    severity: 'warning',
    enabled: true
  }
];

const result = await validationEngine.validate(patientData, validationRules);
console.log(`Validation passed: ${result.isValid}`);
console.log(`Errors: ${result.errorCount}, Warnings: ${result.warningCount}`);
```

### Custom Validator Interface

```typescript
interface CustomValidator {
  name: string;
  description: string;
  validate: (value: any, parameters