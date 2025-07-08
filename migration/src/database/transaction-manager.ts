/**
 * Database Transaction Manager
 * Provides transaction management for both legacy PostgreSQL and Supabase databases
 */

import { Client } from 'pg';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { MigrationError } from '../types/migration-types';

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  rollbackReason?: string;
}

export interface TransactionContext {
  id: string;
  startTime: Date;
  operations: string[];
  client: Client;
  committed: boolean;
  rolledBack: boolean;
}

/**
 * PostgreSQL Transaction Manager
 */
export class PostgresTransactionManager {
  private logger: Logger;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'PostgresTransactionManager' });
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction<T>(
    client: Client,
    operations: (client: Client, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    
    const context: TransactionContext = {
      id: transactionId,
      startTime: new Date(),
      operations: [],
      client,
      committed: false,
      rolledBack: false
    };

    this.activeTransactions.set(transactionId, context);

    try {
      this.logger.info('Starting transaction', {
        transactionId,
        isolationLevel: options.isolationLevel,
        timeout: options.timeout
      });

      // Begin transaction
      await this.beginTransaction(client, options);
      context.operations.push('BEGIN');

      // Set timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
        context.operations.push(`SET statement_timeout = ${options.timeout}`);
      }

      // Execute operations
      const result = await operations(client, context);

      // Commit transaction
      await client.query('COMMIT');
      context.committed = true;
      context.operations.push('COMMIT');

      const duration = Date.now() - startTime;

      this.logger.info('Transaction committed successfully', {
        transactionId,
        duration,
        operationsCount: context.operations.length
      });

      return {
        success: true,
        data: result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      try {
        // Rollback transaction
        await client.query('ROLLBACK');
        context.rolledBack = true;
        context.operations.push('ROLLBACK');

        this.logger.warn('Transaction rolled back', {
          transactionId,
          duration,
          error: error instanceof Error ? error.message : String(error),
          operationsCount: context.operations.length
        });

      } catch (rollbackError) {
        this.logger.error('Failed to rollback transaction', {
          transactionId,
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
        rollbackReason: error instanceof Error ? error.message : String(error)
      };

    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute operations with retry logic
   */
  async withRetryableTransaction<T>(
    client: Client,
    operations: (client: Client, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const maxAttempts = options.retryAttempts || 3;
    const retryDelay = options.retryDelay || 1000;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.withTransaction(client, operations, options);
        
        if (result.success) {
          if (attempt > 1) {
            this.logger.info('Transaction succeeded after retry', {
              attempt,
              maxAttempts
            });
          }
          return result;
        }

        lastError = result.error;

        // Check if error is retryable
        if (!this.isRetryableError(result.error)) {
          this.logger.warn('Non-retryable error encountered', {
            attempt,
            error: result.error?.message
          });
          return result;
        }

        if (attempt < maxAttempts) {
          this.logger.warn('Transaction failed, retrying', {
            attempt,
            maxAttempts,
            retryDelay,
            error: result.error?.message
          });
          
          await this.delay(retryDelay * attempt); // Exponential backoff
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxAttempts) {
          this.logger.warn('Transaction attempt failed, retrying', {
            attempt,
            maxAttempts,
            error: lastError.message
          });
          
          await this.delay(retryDelay * attempt);
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Transaction failed after all retry attempts'),
      duration: 0,
      rollbackReason: 'Max retry attempts exceeded'
    };
  }

  /**
   * Begin transaction with optional isolation level
   */
  private async beginTransaction(client: Client, options: TransactionOptions): Promise<void> {
    if (options.isolationLevel) {
      await client.query(`BEGIN ISOLATION LEVEL ${options.isolationLevel}`);
    } else {
      await client.query('BEGIN');
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error?: Error): boolean {
    if (!error) return false;

    const retryableErrors = [
      'connection terminated',
      'connection reset',
      'server closed the connection',
      'timeout',
      'deadlock detected',
      'serialization failure'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active transaction count
   */
  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Get transaction details
   */
  getTransactionDetails(transactionId: string): TransactionContext | undefined {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }
}

/**
 * Supabase Transaction Manager
 * Note: Supabase doesn't support traditional transactions, so we implement
 * a pattern for batch operations with rollback simulation
 */
export class SupabaseTransactionManager {
  private logger: Logger;
  private activeOperations: Map<string, SupabaseOperationContext> = new Map();

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'SupabaseTransactionManager' });
  }

  /**
   * Execute batch operations with rollback capability
   */
  async withBatchOperations<T>(
    supabase: SupabaseClient,
    operations: (supabase: SupabaseClient, context: SupabaseOperationContext) => Promise<T>,
    options: { timeout?: number; retryAttempts?: number } = {}
  ): Promise<TransactionResult<T>> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    const context: SupabaseOperationContext = {
      id: operationId,
      startTime: new Date(),
      operations: [],
      rollbackOperations: [],
      completed: false,
      rolledBack: false
    };

    this.activeOperations.set(operationId, context);

    try {
      this.logger.info('Starting Supabase batch operations', {
        operationId,
        timeout: options.timeout
      });

      // Execute operations
      const result = await operations(supabase, context);
      context.completed = true;

      const duration = Date.now() - startTime;

      this.logger.info('Batch operations completed successfully', {
        operationId,
        duration,
        operationsCount: context.operations.length
      });

      return {
        success: true,
        data: result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      try {
        // Execute rollback operations
        await this.executeRollback(supabase, context);
        context.rolledBack = true;

        this.logger.warn('Batch operations rolled back', {
          operationId,
          duration,
          error: error instanceof Error ? error.message : String(error),
          rollbackOperationsCount: context.rollbackOperations.length
        });

      } catch (rollbackError) {
        this.logger.error('Failed to execute rollback operations', {
          operationId,
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
        rollbackReason: error instanceof Error ? error.message : String(error)
      };

    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Execute rollback operations
   */
  private async executeRollback(
    supabase: SupabaseClient,
    context: SupabaseOperationContext
  ): Promise<void> {
    // Execute rollback operations in reverse order
    for (let i = context.rollbackOperations.length - 1; i >= 0; i--) {
      const rollbackOp = context.rollbackOperations[i];
      if (rollbackOp) {
        try {
          await rollbackOp();
          this.logger.debug('Rollback operation executed', {
            operationId: context.id,
            rollbackIndex: i
          });
        } catch (error) {
          this.logger.error('Rollback operation failed', {
            operationId: context.id,
            rollbackIndex: i,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue with other rollback operations
        }
      }
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }
}

/**
 * Supabase Operation Context
 */
export interface SupabaseOperationContext {
  id: string;
  startTime: Date;
  operations: string[];
  rollbackOperations: (() => Promise<void>)[];
  completed: boolean;
  rolledBack: boolean;
}

/**
 * Transaction Manager Factory
 */
export class TransactionManagerFactory {
  static createPostgresManager(logger: Logger): PostgresTransactionManager {
    return new PostgresTransactionManager(logger);
  }

  static createSupabaseManager(logger: Logger): SupabaseTransactionManager {
    return new SupabaseTransactionManager(logger);
  }
}

/**
 * Utility functions for transaction management
 */
export const TransactionUtils = {
  /**
   * Validate transaction options
   */
  validateTransactionOptions(options: TransactionOptions): void {
    if (options.timeout && options.timeout <= 0) {
      throw new MigrationError(
        'Transaction timeout must be positive',
        'transaction-validation',
        'timeout-validation',
        undefined,
        undefined
      );
    }

    if (options.retryAttempts && options.retryAttempts < 0) {
      throw new MigrationError(
        'Retry attempts must be non-negative',
        'transaction-validation',
        'retry-attempts-validation',
        undefined,
        undefined
      );
    }

    if (options.retryDelay && options.retryDelay < 0) {
      throw new MigrationError(
        'Retry delay must be non-negative',
        'transaction-validation',
        'retry-delay-validation',
        undefined,
        undefined
      );
    }
  },

  /**
   * Calculate optimal batch size based on data size
   */
  calculateOptimalBatchSize(totalRecords: number, recordSize: number): number {
    const maxBatchSize = 1000;
    const minBatchSize = 10;
    const targetMemoryMB = 50; // Target 50MB per batch
    
    const recordsPerMB = Math.floor((1024 * 1024) / recordSize);
    const optimalBatchSize = Math.floor(targetMemoryMB * recordsPerMB);
    
    return Math.max(minBatchSize, Math.min(maxBatchSize, optimalBatchSize));
  },

  /**
   * Estimate transaction duration
   */
  estimateTransactionDuration(operationCount: number, avgOperationTime: number): number {
    const overhead = 100; // 100ms overhead
    return (operationCount * avgOperationTime) + overhead;
  }
};