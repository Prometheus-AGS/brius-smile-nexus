/**
 * TypeScript interfaces for the general testing framework
 * Migration-specific testing types have been removed as part of migration UI cleanup
 */

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: TestError;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface TestError {
  message: string;
  stack?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority: TestPriority;
  tags: string[];
  timeout?: number;
  retries?: number;
  execute: () => Promise<TestResult>;
  dependencies?: string[];
}

export type TestCategory = 
  | 'unit'
  | 'integration'
  | 'performance'
  | 'validation'
  | 'transformation'
  | 'end-to-end';

export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestConfiguration {
  environment: TestEnvironment;
  database: TestDatabaseConfig;
  performance: PerformanceTestConfig;
  validation: ValidationTestConfig;
  reporting: TestReportingConfig;
}

export interface TestEnvironment {
  name: string;
  isolated: boolean;
  cleanup: boolean;
  parallel: boolean;
  maxConcurrency?: number;
  timeout: number;
}

export interface TestDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  resetBetweenTests: boolean;
}

export interface PerformanceTestConfig {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  sampleSize: number;
  warmupRuns: number;
  benchmarkRuns: number;
}

export interface ValidationTestConfig {
  strictMode: boolean;
  businessRules: boolean;
  dataIntegrity: boolean;
  referentialIntegrity: boolean;
  complianceChecks: boolean;
}

export interface TestReportingConfig {
  format: 'json' | 'xml' | 'html' | 'console';
  outputPath: string;
  includeMetrics: boolean;
  includeCoverage: boolean;
  includePerformance: boolean;
}

export interface MockDataConfig {
  entityType: string;
  count: number;
  seed?: number;
  anonymize: boolean;
  includeEdgeCases: boolean;
  customFields?: Record<string, unknown>;
}

export interface MockDataGenerator<T = unknown> {
  generate(config: MockDataConfig): Promise<T[]>;
  generateSingle(config: Omit<MockDataConfig, 'count'>): Promise<T>;
  generateEdgeCases(entityType: string): Promise<T[]>;
  anonymize(data: T): T;
}

export interface TestDataSet<T = unknown> {
  id: string;
  name: string;
  description: string;
  entityType: string;
  data: T[];
  metadata: TestDataMetadata;
}

export interface TestDataMetadata {
  createdAt: Date;
  size: number;
  checksum: string;
  schema: string;
  tags: string[];
  anonymized: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  validate: (data: unknown) => Promise<ValidationResult>;
  applicableEntities: string[];
}

export type ValidationCategory = 
  | 'business-rule'
  | 'data-integrity'
  | 'referential-integrity'
  | 'compliance'
  | 'clinical-safety'
  | 'data-quality';

export type ValidationSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ValidationResult {
  ruleId: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  affectedRecords?: string[];
  suggestions?: string[];
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskIO: number;
  networkIO: number;
  databaseConnections: number;
  queriesExecuted: number;
  recordsProcessed: number;
}

export interface PerformanceBenchmark {
  name: string;
  baseline: PerformanceMetrics;
  current: PerformanceMetrics;
  threshold: PerformanceMetrics;
  status: 'passed' | 'failed' | 'degraded';
  regression?: number;
}

export interface TestExecutionContext {
  testId: string;
  suiteId: string;
  environment: string;
  startTime: Date;
  endTime?: Date;
  database: TestDatabaseConnection;
  cleanup: CleanupFunction[];
  metrics: PerformanceMetrics;
}

export interface TestDatabaseConnection {
  connection: unknown; // Database connection object
  transaction?: unknown; // Transaction object
  isolated: boolean;
  cleanup: () => Promise<void>;
}

export type CleanupFunction = () => Promise<void>;

export interface TestReport {
  id: string;
  name: string;
  timestamp: Date;
  environment: string;
  summary: TestSummary;
  suites: TestSuiteResult[];
  performance: PerformanceBenchmark[];
  coverage?: TestCoverage;
  metadata: Record<string, unknown>;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
}

export interface TestSuiteResult {
  suite: TestSuite;
  results: TestResult[];
  summary: TestSummary;
  performance: PerformanceMetrics;
}

export interface TestCoverage {
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
}

export interface CoverageMetrics {
  total: number;
  covered: number;
  percentage: number;
}

export interface TransformationTestCase {
  id: string;
  name: string;
  description: string;
  sourceSchema: string;
  targetSchema: string;
  inputData: unknown;
  expectedOutput: unknown;
  mappingRules: string[];
  validationRules: string[];
}

export interface DataVolumeConfig {
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
}

export interface SuccessCriteria {
  dataIntegrity: number; // percentage
  performance: PerformanceMetrics;
  businessRules: number; // percentage
  compliance: number; // percentage
}

export interface TestAssertion<T = unknown> {
  name: string;
  description: string;
  assert: (actual: T, expected: T) => boolean;
  message: (actual: T, expected: T) => string;
}

export interface CustomMatcher<T = unknown> {
  name: string;
  matcher: (received: T, ...args: unknown[]) => {
    pass: boolean;
    message: () => string;
  };
}

export interface TestFixture<T = unknown> {
  name: string;
  description: string;
  data: T;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestHook {
  type: 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach';
  name: string;
  execute: (context: TestExecutionContext) => Promise<void>;
}

export interface TestRunner {
  run(suites: TestSuite[], config: TestConfiguration): Promise<TestReport>;
  runSuite(suite: TestSuite, config: TestConfiguration): Promise<TestSuiteResult>;
  runTest(test: TestCase, context: TestExecutionContext): Promise<TestResult>;
}

export interface TestScheduler {
  schedule(suites: TestSuite[], config: TestConfiguration): Promise<void>;
  getStatus(): TestSchedulerStatus;
  cancel(): Promise<void>;
}

export interface TestSchedulerStatus {
  running: boolean;
  queued: number;
  completed: number;
  failed: number;
  progress: number;
}