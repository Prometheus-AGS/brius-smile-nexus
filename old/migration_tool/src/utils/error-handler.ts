import chalk from '../../$node_modules/chalk/source/index.js';
import { createComponentLogger } from './logger';

const logger = createComponentLogger('error-handler');

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better classification
 */
export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  CONFIGURATION = 'configuration',
  PROCESSING = 'processing',
  FILE_SYSTEM = 'file_system',
  EXTERNAL_API = 'external_api',
  UNKNOWN = 'unknown'
}

/**
 * Enhanced error interface with migration context
 */
export interface MigrationError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  phase?: string | undefined;
  recordId?: string | number | undefined;
  context?: Record<string, unknown> | undefined;
  retryable?: boolean;
  timestamp: Date;
  originalError?: Error | undefined;
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  ABORT = 'abort',
  MANUAL = 'manual'
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  failFast: boolean;
  maxRetries: number;
  retryDelay: number;
  continueOnError: boolean;
  logErrors: boolean;
  reportToConsole: boolean;
}

/**
 * Default error handling configuration
 */
const defaultConfig: ErrorHandlingConfig = {
  failFast: true,
  maxRetries: 3,
  retryDelay: 1000,
  continueOnError: false,
  logErrors: true,
  reportToConsole: true
};

/**
 * Migration error handler class
 */
export class MigrationErrorHandler {
  private config: ErrorHandlingConfig;
  private errorCount: number = 0;
  private errorsByCategory: Map<ErrorCategory, number> = new Map();
  private errorsByPhase: Map<string, number> = new Map();
  private criticalErrors: MigrationError[] = [];

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initializeErrorCounts();
  }

  /**
   * Initialize error count tracking
   */
  private initializeErrorCounts(): void {
    Object.values(ErrorCategory).forEach(category => {
      this.errorsByCategory.set(category, 0);
    });
  }

  /**
   * Handle a migration error
   */
  public async handleError(
    error: Error | MigrationError,
    context?: {
      phase?: string;
      recordId?: string | number;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      retryable?: boolean;
      additionalContext?: Record<string, unknown>;
    }
  ): Promise<RecoveryStrategy> {
    const migrationError = this.enhanceError(error, context);
    
    this.trackError(migrationError);
    
    if (this.config.logErrors) {
      this.logError(migrationError);
    }
    
    if (this.config.reportToConsole) {
      this.reportErrorToConsole(migrationError);
    }
    
    // Store critical errors for final report
    if (migrationError.severity === ErrorSeverity.CRITICAL) {
      this.criticalErrors.push(migrationError);
    }
    
    return this.determineRecoveryStrategy(migrationError);
  }

  /**
   * Enhance a basic error with migration context
   */
  private enhanceError(
    error: Error | MigrationError,
    context?: {
      phase?: string;
      recordId?: string | number;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      retryable?: boolean;
      additionalContext?: Record<string, unknown>;
    }
  ): MigrationError {
    if (this.isMigrationError(error)) {
      return error;
    }
    
    const migrationError = error as MigrationError;
    migrationError.category = context?.category || this.categorizeError(error);
    migrationError.severity = context?.severity || this.determineSeverity(error, migrationError.category);
    migrationError.phase = context?.phase;
    migrationError.recordId = context?.recordId;
    migrationError.context = context?.additionalContext;
    migrationError.retryable = context?.retryable ?? this.isRetryable(migrationError);
    migrationError.timestamp = new Date();
    migrationError.originalError = error;
    
    return migrationError;
  }

  /**
   * Check if error is already a MigrationError
   */
  private isMigrationError(error: Error | MigrationError): error is MigrationError {
    return 'category' in error && 'severity' in error && 'timestamp' in error;
  }

  /**
   * Categorize error based on message and type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('timeout') || message.includes('network')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return ErrorCategory.DATABASE;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }
    
    if (message.includes('auth') || message.includes('permission') || message.includes('unauthorized')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (message.includes('config') || message.includes('environment') || message.includes('missing')) {
      return ErrorCategory.CONFIGURATION;
    }
    
    if (message.includes('file') || message.includes('directory') || message.includes('path')) {
      return ErrorCategory.FILE_SYSTEM;
    }
    
    if (message.includes('api') || message.includes('http') || message.includes('request')) {
      return ErrorCategory.EXTERNAL_API;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(_error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that should stop migration immediately
    if (category === ErrorCategory.CONFIGURATION || category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.CRITICAL;
    }
    
    // High severity for database and network issues
    if (category === ErrorCategory.DATABASE || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.HIGH;
    }
    
    // Medium severity for validation and processing issues
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.PROCESSING) {
      return ErrorSeverity.MEDIUM;
    }
    
    // Low severity for other issues
    return ErrorSeverity.LOW;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: MigrationError): boolean {
    // Configuration and validation errors are typically not retryable
    if (error.category === ErrorCategory.CONFIGURATION || error.category === ErrorCategory.VALIDATION) {
      return false;
    }
    
    // Network and database errors are often retryable
    if (error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.DATABASE) {
      return true;
    }
    
    // External API errors might be retryable
    if (error.category === ErrorCategory.EXTERNAL_API) {
      return true;
    }
    
    return false;
  }

  /**
   * Track error statistics
   */
  private trackError(error: MigrationError): void {
    this.errorCount++;
    
    const categoryCount = this.errorsByCategory.get(error.category) || 0;
    this.errorsByCategory.set(error.category, categoryCount + 1);
    
    if (error.phase) {
      const phaseCount = this.errorsByPhase.get(error.phase) || 0;
      this.errorsByPhase.set(error.phase, phaseCount + 1);
    }
  }

  /**
   * Log error with structured data
   */
  private logError(error: MigrationError): void {
    logger.error('Migration error occurred', {
      message: error.message,
      category: error.category,
      severity: error.severity,
      phase: error.phase,
      recordId: error.recordId,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      stack: error.stack,
      context: error.context
    });
  }

  /**
   * Report error to console with formatting
   */
  private reportErrorToConsole(error: MigrationError): void {
    const severityColor = this.getSeverityColor(error.severity);
    const categoryIcon = this.getCategoryIcon(error.category);
    
    console.log(severityColor(`\n${categoryIcon} ${error.severity.toUpperCase()} ERROR`));
    console.log(chalk.white(`Message: ${error.message}`));
    
    if (error.phase) {
      console.log(chalk.gray(`Phase: ${error.phase}`));
    }
    
    if (error.recordId) {
      console.log(chalk.gray(`Record ID: ${error.recordId}`));
    }
    
    console.log(chalk.gray(`Category: ${error.category}`));
    console.log(chalk.gray(`Retryable: ${error.retryable ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Timestamp: ${error.timestamp.toLocaleString()}`));
    
    if (error.context && Object.keys(error.context).length > 0) {
      console.log(chalk.gray('Context:'));
      Object.entries(error.context).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}: ${JSON.stringify(value)}`));
      });
    }
  }

  /**
   * Get color for error severity
   */
  private getSeverityColor(severity: ErrorSeverity): typeof chalk.red {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return chalk.red.bold;
      case ErrorSeverity.HIGH:
        return chalk.red;
      case ErrorSeverity.MEDIUM:
        return chalk.yellow;
      case ErrorSeverity.LOW:
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }

  /**
   * Get icon for error category
   */
  private getCategoryIcon(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.DATABASE:
        return '🗄️';
      case ErrorCategory.NETWORK:
        return '🌐';
      case ErrorCategory.VALIDATION:
        return '✅';
      case ErrorCategory.AUTHENTICATION:
        return '🔐';
      case ErrorCategory.CONFIGURATION:
        return '⚙️';
      case ErrorCategory.PROCESSING:
        return '⚡';
      case ErrorCategory.FILE_SYSTEM:
        return '📁';
      case ErrorCategory.EXTERNAL_API:
        return '🔌';
      default:
        return '❓';
    }
  }

  /**
   * Determine recovery strategy based on error and configuration
   */
  private determineRecoveryStrategy(error: MigrationError): RecoveryStrategy {
    // Critical errors always abort
    if (error.severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.ABORT;
    }
    
    // If fail-fast is enabled, abort on any error
    if (this.config.failFast && !this.config.continueOnError) {
      return RecoveryStrategy.ABORT;
    }
    
    // If error is retryable, suggest retry
    if (error.retryable) {
      return RecoveryStrategy.RETRY;
    }
    
    // If continue on error is enabled, skip
    if (this.config.continueOnError) {
      return RecoveryStrategy.SKIP;
    }
    
    // Default to abort
    return RecoveryStrategy.ABORT;
  }

  /**
   * Get error statistics summary
   */
  public getErrorSummary(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByPhase: Record<string, number>;
    criticalErrors: number;
  } {
    return {
      totalErrors: this.errorCount,
      errorsByCategory: Object.fromEntries(this.errorsByCategory),
      errorsByPhase: Object.fromEntries(this.errorsByPhase),
      criticalErrors: this.criticalErrors.length
    };
  }

  /**
   * Generate final error report
   */
  public generateErrorReport(): string {
    const summary = this.getErrorSummary();
    
    let report = chalk.red.bold('\n📊 MIGRATION ERROR REPORT\n');
    report += chalk.gray('='.repeat(50)) + '\n';
    
    report += chalk.white(`Total Errors: ${summary.totalErrors}\n`);
    report += chalk.red(`Critical Errors: ${summary.criticalErrors}\n\n`);
    
    if (Object.keys(summary.errorsByCategory).length > 0) {
      report += chalk.blue('Errors by Category:\n');
      Object.entries(summary.errorsByCategory).forEach(([category, count]) => {
        if (count > 0) {
          report += chalk.gray(`  ${category}: ${count}\n`);
        }
      });
      report += '\n';
    }
    
    if (Object.keys(summary.errorsByPhase).length > 0) {
      report += chalk.blue('Errors by Phase:\n');
      Object.entries(summary.errorsByPhase).forEach(([phase, count]) => {
        if (count > 0) {
          report += chalk.gray(`  ${phase}: ${count}\n`);
        }
      });
      report += '\n';
    }
    
    if (this.criticalErrors.length > 0) {
      report += chalk.red.bold('Critical Errors:\n');
      this.criticalErrors.forEach((error, index) => {
        report += chalk.red(`  ${index + 1}. ${error.message}\n`);
        if (error.phase) {
          report += chalk.gray(`     Phase: ${error.phase}\n`);
        }
      });
    }
    
    return report;
  }

  /**
   * Reset error tracking
   */
  public reset(): void {
    this.errorCount = 0;
    this.errorsByCategory.clear();
    this.errorsByPhase.clear();
    this.criticalErrors = [];
    this.initializeErrorCounts();
  }
}

/**
 * Create a new error handler instance
 */
export function createErrorHandler(config?: Partial<ErrorHandlingConfig>): MigrationErrorHandler {
  return new MigrationErrorHandler(config);
}

/**
 * Create a migration error
 */
export function createMigrationError(
  message: string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  context?: {
    phase?: string;
    recordId?: string | number;
    retryable?: boolean;
    additionalContext?: Record<string, unknown>;
    originalError?: Error;
  }
): MigrationError {
  const error = new Error(message) as MigrationError;
  error.category = category;
  error.severity = severity;
  error.phase = context?.phase;
  error.recordId = context?.recordId;
  error.retryable = context?.retryable ?? false;
  error.context = context?.additionalContext;
  error.timestamp = new Date();
  error.originalError = context?.originalError;
  
  return error;
}