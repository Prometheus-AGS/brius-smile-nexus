/**
 * Supabase Database Query Utilities
 * Provides standardized queries and operations for the target Supabase database
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { MigrationError } from '../types/migration-types';
import {
  SupabaseProfile,
  SupabaseOffice,
  SupabaseOrder,
  SupabaseOrderType,
  SupabaseOrderState,
  SupabaseProject,
  SupabaseMessage,
  SupabaseWorkflowTemplate,
  SupabaseWorkflowTask
} from '../types/migration-types';

export interface SupabaseQueryOptions {
  batchSize?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface BatchInsertResult {
  success: boolean;
  insertedCount: number;
  errors: Error[];
  duration: number;
}

export interface QueryMetrics {
  queryCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
}

/**
 * Supabase Query Manager
 * Provides high-level query operations for the target database
 */
export class SupabaseQueryManager {
  private logger: Logger;
  private queryMetrics: QueryMetrics = {
    queryCount: 0,
    totalDuration: 0,
    averageDuration: 0,
    errorCount: 0
  };

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'SupabaseQueryManager' });
  }

  /**
   * Insert profiles in batches
   */
  async insertProfiles(
    supabase: SupabaseClient,
    profiles: Partial<SupabaseProfile>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      this.logger.info('Starting profiles batch insert', {
        totalRecords: profiles.length,
        batchSize
      });

      for (let i = 0; i < profiles.length; i += batchSize) {
        const batch = profiles.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert profiles batch: ${error.message}`,
              'supabase-insert',
              'profiles-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;
          
          this.logger.debug('Profiles batch inserted', {
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
            insertedInBatch: data?.length || 0
          });

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
          
          this.logger.error('Profiles batch insert failed', {
            batchIndex: Math.floor(i / batchSize) + 1,
            error: batchError.message
          });
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      this.logger.info('Profiles batch insert completed', {
        totalRecords: profiles.length,
        insertedCount,
        errorCount: errors.length,
        duration
      });

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Profiles batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'profiles-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert offices in batches
   */
  async insertOffices(
    supabase: SupabaseClient,
    offices: Partial<SupabaseOffice>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      this.logger.info('Starting offices batch insert', {
        totalRecords: offices.length,
        batchSize
      });

      for (let i = 0; i < offices.length; i += batchSize) {
        const batch = offices.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('offices')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert offices batch: ${error.message}`,
              'supabase-insert',
              'offices-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Offices batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'offices-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert order types
   */
  async insertOrderTypes(
    supabase: SupabaseClient,
    orderTypes: Partial<SupabaseOrderType>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      for (let i = 0; i < orderTypes.length; i += batchSize) {
        const batch = orderTypes.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('order_types')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert order types batch: ${error.message}`,
              'supabase-insert',
              'order-types-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Order types batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'order-types-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert order states
   */
  async insertOrderStates(
    supabase: SupabaseClient,
    orderStates: Partial<SupabaseOrderState>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      for (let i = 0; i < orderStates.length; i += batchSize) {
        const batch = orderStates.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('order_states')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert order states batch: ${error.message}`,
              'supabase-insert',
              'order-states-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Order states batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'order-states-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert orders in batches
   */
  async insertOrders(
    supabase: SupabaseClient,
    orders: Partial<SupabaseOrder>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      this.logger.info('Starting orders batch insert', {
        totalRecords: orders.length,
        batchSize
      });

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('orders')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert orders batch: ${error.message}`,
              'supabase-insert',
              'orders-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Orders batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'orders-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert messages in batches
   */
  async insertMessages(
    supabase: SupabaseClient,
    messages: Partial<SupabaseMessage>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      this.logger.info('Starting messages batch insert', {
        totalRecords: messages.length,
        batchSize
      });

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('messages')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert messages batch: ${error.message}`,
              'supabase-insert',
              'messages-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Messages batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'messages-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert projects in batches
   */
  async insertProjects(
    supabase: SupabaseClient,
    projects: Partial<SupabaseProject>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      this.logger.info('Starting projects batch insert', {
        totalRecords: projects.length,
        batchSize
      });

      for (let i = 0; i < projects.length; i += batchSize) {
        const batch = projects.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('projects')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert projects batch: ${error.message}`,
              'supabase-insert',
              'projects-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Projects batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'projects-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert workflow templates
   */
  async insertWorkflowTemplates(
    supabase: SupabaseClient,
    templates: Partial<SupabaseWorkflowTemplate>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      for (let i = 0; i < templates.length; i += batchSize) {
        const batch = templates.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('workflow_templates')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert workflow templates batch: ${error.message}`,
              'supabase-insert',
              'workflow-templates-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Workflow templates batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'workflow-templates-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Insert workflow tasks
   */
  async insertWorkflowTasks(
    supabase: SupabaseClient,
    tasks: Partial<SupabaseWorkflowTask>[],
    options: SupabaseQueryOptions = {}
  ): Promise<BatchInsertResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let insertedCount = 0;
    const errors: Error[] = [];

    try {
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        
        try {
          const { data, error } = await supabase
            .from('workflow_tasks')
            .insert(batch)
            .select();

          if (error) {
            throw new MigrationError(
              `Failed to insert workflow tasks batch: ${error.message}`,
              'supabase-insert',
              'workflow-tasks-batch',
              undefined,
              error
            );
          }

          insertedCount += data?.length || 0;

        } catch (error) {
          const batchError = error instanceof Error ? error : new Error(String(error));
          errors.push(batchError);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, errors.length > 0);

      return {
        success: errors.length === 0,
        insertedCount,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Workflow tasks batch insert failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-insert',
        'workflow-tasks-batch-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get record count for a table
   */
  async getRecordCount(
    supabase: SupabaseClient,
    tableName: string
  ): Promise<number> {
    const startTime = Date.now();

    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new MigrationError(
          `Failed to get record count for ${tableName}: ${error.message}`,
          'supabase-query',
          'record-count',
          undefined,
          error
        );
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, false);

      return count || 0;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Record count query failed for ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-query',
        'record-count-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate foreign key relationships
   */
  async validateForeignKeys(
    supabase: SupabaseClient,
    tableName: string,
    foreignKeyField: string,
    referencedTable: string
  ): Promise<{ valid: boolean; invalidCount: number }> {
    const startTime = Date.now();

    try {
      // Get records with foreign key values that don't exist in referenced table
      const { data, error } = await supabase
        .from(tableName)
        .select(`${foreignKeyField}`)
        .not(foreignKeyField, 'is', null)
        .not(foreignKeyField, 'in', 
          `(SELECT id FROM ${referencedTable})`
        );

      if (error) {
        throw new MigrationError(
          `Failed to validate foreign keys: ${error.message}`,
          'supabase-validation',
          'foreign-key-check',
          undefined,
          error
        );
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(duration, false);

      const invalidCount = data?.length || 0;
      
      this.logger.info('Foreign key validation completed', {
        tableName,
        foreignKeyField,
        referencedTable,
        invalidCount,
        valid: invalidCount === 0
      });

      return {
        valid: invalidCount === 0,
        invalidCount
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      throw new MigrationError(
        `Foreign key validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'supabase-validation',
        'foreign-key-validation-operation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update query metrics
   */
  private updateMetrics(duration: number, hasError: boolean): void {
    this.queryMetrics.queryCount++;
    this.queryMetrics.totalDuration += duration;
    this.queryMetrics.averageDuration = this.queryMetrics.totalDuration / this.queryMetrics.queryCount;
    
    if (hasError) {
      this.queryMetrics.errorCount++;
    }
  }

  /**
   * Get query performance metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.queryMetrics };
  }

  /**
   * Reset query metrics
   */
  resetMetrics(): void {
    this.queryMetrics = {
      queryCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0
    };
  }
}