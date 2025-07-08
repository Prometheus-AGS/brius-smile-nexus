/**
 * Comprehensive error handling utility for migration operations
 * Provides structured error handling, recovery, and reporting
 */

import { MigrationError, ValidationError, EmbeddingError } from '../types/migration-types';
import { Logger } from './logger';

// Re-export MigrationError for use in migrators
export { MigrationError };

export class ErrorHandler {
  private logger: Logger;
  private errorCounts: Map<string, number> = new Map();
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(logger: Logger, maxRetries: number = 3, retryDelay: number = 1000) {
    this.logger = logger;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Handle critical errors that should stop migration
   */
  async handleCriticalError(error: Error, context: string): Promise<void> {
    const errorKey = `${context}:${error.constructor.name}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    await this.logger.error('Critical migration error encountered', {
      context,
      error: error.message,
      error_type: error.constructor.name,
      stack: error.stack,
      occurrence_count: count + 1
    });

    // Log additional context for specific error types
    if (error instanceof MigrationError) {
      await this.logger.error('Migration error details', {
        phase: error.phase,
        substep: error.substep,
        record_id: error.record_id,
        cause: error.cause?.message
      });
    } else if (error instanceof ValidationError) {
      await this.logger.error('Validation error details', {
        check_name: error.check_name,
        expected: error.expected,
        actual: error.actual
      });
    } else if (error instanceof EmbeddingError) {
      await this.logger.error('Embedding error details', {
        source_table: error.source_table,
        source_id: error.source_id,
        model_name: error.model_name,
        cause: error.cause?.message
      });
    }
  }

  /**
   * Handle recoverable errors with retry logic
   */
  async handleRecoverableError<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.maxRetries;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          await this.logger.info('Operation succeeded after retry', {
            context,
            attempt,
            total_attempts: retries
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        await this.logger.warn(`Operation failed, attempt ${attempt}/${retries}`, {
          context,
          attempt,
          error: lastError.message,
          will_retry: attempt < retries
        });

        // Don't wait after the last attempt
        if (attempt < retries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries exhausted
    await this.logger.error('Operation failed after all retries', {
      context,
      total_attempts: retries,
      final_error: lastError!.message
    });

    throw lastError!;
  }

  /**
   * Handle batch processing errors
   */
  async handleBatchError<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    context: string,
    continueOnError: boolean = true
  ): Promise<{
    successful: T[];
    failed: Array<{ item: T; error: Error }>;
  }> {
    const successful: T[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    for (const item of items) {
      try {
        await processor(item);
        successful.push(item);
      } catch (error) {
        const err = error as Error;
        failed.push({ item, error: err });

        await this.logger.warn('Batch item processing failed', {
          context,
          error: err.message,
          item_info: this.getItemInfo(item),
          continue_processing: continueOnError
        });

        if (!continueOnError) {
          await this.logger.error('Stopping batch processing due to error', {
            context,
            processed: successful.length,
            failed: failed.length,
            remaining: items.length - successful.length - failed.length
          });
          break;
        }
      }
    }

    await this.logger.info('Batch processing completed', {
      context,
      total_items: items.length,
      successful: successful.length,
      failed: failed.length,
      success_rate: Math.round((successful.length / items.length) * 100)
    });

    return { successful, failed };
  }

  /**
   * Validate data and handle validation errors
   */
  async validateAndHandle<T>(
    data: T,
    validator: (data: T) => Promise<boolean>,
    context: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const isValid = await validator(data);
      
      if (!isValid) {
        const error = new ValidationError(
          errorMessage || `Validation failed for ${context}`,
          context
        );
        await this.handleCriticalError(error, context);
        return false;
      }
      
      return true;
    } catch (error) {
      await this.handleCriticalError(error as Error, context);
      return false;
    }
  }

  /**
   * Create a migration error with context
   */
  createMigrationError(
    message: string,
    phase: string,
    substep: string,
    recordId?: string | number,
    cause?: Error
  ): MigrationError {
    return new MigrationError(message, phase, substep, recordId, cause);
  }

  /**
   * Create a validation error with context
   */
  createValidationError(
    message: string,
    checkName: string,
    expected?: number,
    actual?: number
  ): ValidationError {
    return new ValidationError(message, checkName, expected, actual);
  }

  /**
   * Create an embedding error with context
   */
  createEmbeddingError(
    message: string,
    sourceTable: string,
    sourceId: string,
    modelName: string,
    cause?: Error
  ): EmbeddingError {
    return new EmbeddingError(message, sourceTable, sourceId, modelName, cause);
  }

  /**
   * Wrap an async operation with error handling
   */
  async wrapOperation<T>(
    operation: () => Promise<T>,
    context: string,
    options: {
      retries?: number;
      critical?: boolean;
      validator?: (result: T) => Promise<boolean>;
    } = {}
  ): Promise<T> {
    const { retries = 0, critical = false, validator } = options;

    try {
      let result: T;
      
      if (retries > 0) {
        result = await this.handleRecoverableError(operation, context, retries);
      } else {
        result = await operation();
      }

      // Validate result if validator provided
      if (validator) {
        const isValid = await validator(result);
        if (!isValid) {
          throw new ValidationError(`Result validation failed for ${context}`, context);
        }
      }

      return result;
    } catch (error) {
      if (critical) {
        await this.handleCriticalError(error as Error, context);
      } else {
        await this.logger.warn('Operation failed', {
          context,
          error: (error as Error).message
        });
      }
      throw error;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.errorCounts.forEach((count, key) => {
      stats[key] = count;
    });
    return stats;
  }

  /**
   * Reset error counts
   */
  resetErrorCounts(): void {
    this.errorCounts.clear();
  }

  /**
   * Check if error threshold exceeded
   */
  isErrorThresholdExceeded(context: string, threshold: number = 10): boolean {
    let totalErrors = 0;
    this.errorCounts.forEach((count, key) => {
      if (key.startsWith(context)) {
        totalErrors += count;
      }
    });
    return totalErrors >= threshold;
  }

  /**
   * Generate error report
   */
  async generateErrorReport(): Promise<string> {
    const stats = this.getErrorStatistics();
    const totalErrors = Object.values(stats).reduce((sum, count) => sum + count, 0);

    let report = `Error Report\n`;
    report += `============\n`;
    report += `Total Errors: ${totalErrors}\n\n`;

    if (totalErrors > 0) {
      report += `Error Breakdown:\n`;
      Object.entries(stats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([key, count]) => {
          report += `  ${key}: ${count}\n`;
        });
    } else {
      report += `No errors encountered.\n`;
    }

    await this.logger.info('Error report generated', { total_errors: totalErrors });
    return report;
  }

  /**
   * Delay execution for retry logic
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get string representation of item for logging
   */
  private getItemInfo(item: unknown): string {
    if (typeof item === 'object' && item !== null) {
      if ('id' in item) {
        return `id: ${(item as { id: unknown }).id}`;
      }
      if ('name' in item) {
        return `name: ${(item as { name: unknown }).name}`;
      }
      return `type: ${item.constructor.name}`;
    }
    return `value: ${String(item)}`;
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Initialize global error handler
 */
export function initializeGlobalErrorHandler(logger: Logger): ErrorHandler {
  globalErrorHandler = new ErrorHandler(logger);
  return globalErrorHandler;
}

/**
 * Get global error handler
 */
export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    throw new Error('Global error handler not initialized');
  }
  return globalErrorHandler;
}

/**
 * Utility function to handle unhandled promise rejections
 */
export function setupGlobalErrorHandling(logger: Logger): void {
  process.on('unhandledRejection', async (reason, promise) => {
    await logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: String(promise)
    });
  });

  process.on('uncaughtException', async (error) => {
    await logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}