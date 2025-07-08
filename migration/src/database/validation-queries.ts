/**
 * Database Validation Query Utilities
 * Provides comprehensive validation queries for data integrity checks
 */

import { Client } from 'pg';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { MigrationError } from '../types/migration-types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'foreign_key' | 'data_integrity' | 'constraint' | 'schema';
  table: string;
  column?: string;
  message: string;
  count: number;
  sampleData?: Record<string, unknown>[];
}

export interface ValidationWarning {
  type: 'data_quality' | 'performance' | 'migration';
  table: string;
  column?: string;
  message: string;
  count: number;
  recommendation?: string;
}

export interface ValidationSummary {
  totalTables: number;
  validTables: number;
  errorCount: number;
  warningCount: number;
  duration: number;
}

export interface DataIntegrityCheck {
  checkName: string;
  query: string;
  expectedResult: 'zero' | 'positive' | 'match';
  description: string;
}

/**
 * Database Validation Manager
 * Provides comprehensive validation for both legacy and target databases
 */
export class DatabaseValidationManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'DatabaseValidationManager' });
  }

  /**
   * Validate legacy database integrity
   */
  async validateLegacyDatabase(client: Client): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.logger.info('Starting legacy database validation');

      // Check foreign key constraints
      const fkErrors = await this.validateLegacyForeignKeys(client);
      errors.push(...fkErrors);

      // Check data integrity
      const integrityErrors = await this.validateLegacyDataIntegrity(client);
      errors.push(...integrityErrors);

      // Check for data quality issues
      const qualityWarnings = await this.validateLegacyDataQuality(client);
      warnings.push(...qualityWarnings);

      // Get table count
      const tableCount = await this.getLegacyTableCount(client);

      const duration = Date.now() - startTime;
      const summary: ValidationSummary = {
        totalTables: tableCount,
        validTables: tableCount - errors.filter(e => e.type === 'schema').length,
        errorCount: errors.length,
        warningCount: warnings.length,
        duration
      };

      this.logger.info('Legacy database validation completed', {
        summary,
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      throw new MigrationError(
        `Legacy database validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'database-validation',
        'legacy-validation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate Supabase database integrity
   */
  async validateSupabaseDatabase(supabase: SupabaseClient): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.logger.info('Starting Supabase database validation');

      // Check foreign key constraints
      const fkErrors = await this.validateSupabaseForeignKeys(supabase);
      errors.push(...fkErrors);

      // Check data integrity
      const integrityErrors = await this.validateSupabaseDataIntegrity(supabase);
      errors.push(...integrityErrors);

      // Check migration completeness
      const migrationWarnings = await this.validateMigrationCompleteness(supabase);
      warnings.push(...migrationWarnings);

      // Get table count
      const tableCount = await this.getSupabaseTableCount(supabase);

      const duration = Date.now() - startTime;
      const summary: ValidationSummary = {
        totalTables: tableCount,
        validTables: tableCount - errors.filter(e => e.type === 'schema').length,
        errorCount: errors.length,
        warningCount: warnings.length,
        duration
      };

      this.logger.info('Supabase database validation completed', {
        summary,
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      throw new MigrationError(
        `Supabase database validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'database-validation',
        'supabase-validation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate legacy database foreign key constraints
   */
  private async validateLegacyForeignKeys(client: Client): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const foreignKeyChecks: DataIntegrityCheck[] = [
      {
        checkName: 'patient_user_references',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient p
          LEFT JOIN auth_user u ON p.user_id = u.id
          WHERE p.user_id IS NOT NULL AND u.id IS NULL
        `,
        expectedResult: 'zero',
        description: 'Patients with invalid user references'
      },
      {
        checkName: 'patient_doctor_references',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient p
          LEFT JOIN auth_user d ON p.doctor_id = d.id
          WHERE p.doctor_id IS NOT NULL AND d.id IS NULL
        `,
        expectedResult: 'zero',
        description: 'Patients with invalid doctor references'
      },
      {
        checkName: 'instruction_patient_references',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_instruction i
          LEFT JOIN dispatch_patient p ON i.patient_id = p.id
          WHERE i.patient_id IS NOT NULL AND p.id IS NULL
        `,
        expectedResult: 'zero',
        description: 'Instructions with invalid patient references'
      },
      {
        checkName: 'instruction_course_references',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_instruction i
          LEFT JOIN dispatch_course c ON i.course_id = c.id
          WHERE i.course_id IS NOT NULL AND c.id IS NULL
        `,
        expectedResult: 'zero',
        description: 'Instructions with invalid course references'
      },
      {
        checkName: 'record_content_type_references',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_record r
          LEFT JOIN django_content_type ct ON r.content_type_id = ct.id
          WHERE r.content_type_id IS NOT NULL AND ct.id IS NULL
        `,
        expectedResult: 'zero',
        description: 'Records with invalid content type references'
      }
    ];

    for (const check of foreignKeyChecks) {
      try {
        const result = await client.query(check.query);
        const count = parseInt(result.rows[0].count);

        if (count > 0) {
          errors.push({
            type: 'foreign_key',
            table: check.checkName.split('_')[0] || 'unknown',
            message: check.description,
            count
          });
        }

      } catch (error) {
        this.logger.error(`Foreign key check failed: ${check.checkName}`, {
          error: error instanceof Error ? error.message : String(error),
          checkName: check.checkName
        });
        errors.push({
          type: 'foreign_key',
          table: check.checkName.split('_')[0] || 'unknown',
          message: `Failed to validate: ${check.description}`,
          count: -1
        });
      }
    }

    return errors;
  }

  /**
   * Validate legacy database data integrity
   */
  private async validateLegacyDataIntegrity(client: Client): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const integrityChecks: DataIntegrityCheck[] = [
      {
        checkName: 'duplicate_users',
        query: `
          SELECT email, COUNT(*) as count
          FROM auth_user
          WHERE email IS NOT NULL AND email != ''
          GROUP BY email
          HAVING COUNT(*) > 1
        `,
        expectedResult: 'zero',
        description: 'Duplicate user email addresses'
      },
      {
        checkName: 'orphaned_patients',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient p
          WHERE NOT EXISTS (
            SELECT 1 FROM auth_user u WHERE u.id = p.user_id
          )
        `,
        expectedResult: 'zero',
        description: 'Patients without corresponding users'
      },
      {
        checkName: 'invalid_patient_status',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient
          WHERE status NOT BETWEEN 0 AND 10
        `,
        expectedResult: 'zero',
        description: 'Patients with invalid status values'
      },
      {
        checkName: 'future_birthdates',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient
          WHERE birthdate > CURRENT_DATE
        `,
        expectedResult: 'zero',
        description: 'Patients with future birth dates'
      }
    ];

    for (const check of integrityChecks) {
      try {
        const result = await client.query(check.query);
        
        if (check.checkName === 'duplicate_users') {
          const count = result.rows.length;
          if (count > 0) {
            errors.push({
              type: 'data_integrity',
              table: 'auth_user',
              column: 'email',
              message: check.description,
              count,
              sampleData: result.rows.slice(0, 5)
            });
          }
        } else {
          const count = parseInt(result.rows[0].count);
          if (count > 0) {
            errors.push({
              type: 'data_integrity',
              table: check.checkName.split('_')[1] || 'unknown',
              message: check.description,
              count
            });
          }
        }

      } catch (error) {
        this.logger.error(`Data integrity check failed: ${check.checkName}`, {
          error: error instanceof Error ? error.message : String(error),
          checkName: check.checkName
        });
        errors.push({
          type: 'data_integrity',
          table: check.checkName.split('_')[1] || 'unknown',
          message: `Failed to validate: ${check.description}`,
          count: -1
        });
      }
    }

    return errors;
  }

  /**
   * Validate legacy database data quality
   */
  private async validateLegacyDataQuality(client: Client): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    const qualityChecks = [
      {
        checkName: 'missing_user_emails',
        query: `
          SELECT COUNT(*) as count
          FROM auth_user
          WHERE email IS NULL OR email = ''
        `,
        description: 'Users without email addresses',
        recommendation: 'Consider data cleanup before migration'
      },
      {
        checkName: 'missing_patient_birthdates',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_patient
          WHERE birthdate IS NULL
        `,
        description: 'Patients without birth dates',
        recommendation: 'May affect age-based features'
      },
      {
        checkName: 'empty_instruction_descriptions',
        query: `
          SELECT COUNT(*) as count
          FROM dispatch_instruction
          WHERE description IS NULL OR TRIM(description) = ''
        `,
        description: 'Instructions without descriptions',
        recommendation: 'May impact AI embedding quality'
      }
    ];

    for (const check of qualityChecks) {
      try {
        const result = await client.query(check.query);
        const count = parseInt(result.rows[0].count);

        if (count > 0) {
          warnings.push({
            type: 'data_quality',
            table: check.checkName.split('_')[1] || 'unknown',
            message: check.description,
            count,
            recommendation: check.recommendation
          });
        }

      } catch (error) {
        this.logger.error(`Data quality check failed: ${check.checkName}`, {
          error: error instanceof Error ? error.message : String(error),
          checkName: check.checkName
        });
      }
    }

    return warnings;
  }

  /**
   * Validate Supabase database foreign key constraints
   */
  private async validateSupabaseForeignKeys(supabase: SupabaseClient): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check profiles foreign key integrity
    try {
      const { data: invalidProfiles, error } = await supabase
        .from('profiles')
        .select('id, legacy_user_id, legacy_patient_id')
        .or('legacy_user_id.is.null,legacy_patient_id.is.null');

      if (error) {
        errors.push({
          type: 'foreign_key',
          table: 'profiles',
          message: `Failed to validate profiles: ${error.message}`,
          count: -1
        });
      } else if (invalidProfiles && invalidProfiles.length > 0) {
        errors.push({
          type: 'foreign_key',
          table: 'profiles',
          message: 'Profiles missing legacy ID references',
          count: invalidProfiles.length,
          sampleData: invalidProfiles.slice(0, 5)
        });
      }
    } catch (error) {
      this.logger.error('Failed to validate profiles foreign keys', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Check orders foreign key integrity
    try {
      const { data: invalidOrders, error } = await supabase
        .from('orders')
        .select('id, profile_id, office_id, order_type_id')
        .or('profile_id.is.null,office_id.is.null,order_type_id.is.null');

      if (error) {
        errors.push({
          type: 'foreign_key',
          table: 'orders',
          message: `Failed to validate orders: ${error.message}`,
          count: -1
        });
      } else if (invalidOrders && invalidOrders.length > 0) {
        errors.push({
          type: 'foreign_key',
          table: 'orders',
          message: 'Orders with missing foreign key references',
          count: invalidOrders.length,
          sampleData: invalidOrders.slice(0, 5)
        });
      }
    } catch (error) {
      this.logger.error('Failed to validate orders foreign keys', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return errors;
  }

  /**
   * Validate Supabase database data integrity
   */
  private async validateSupabaseDataIntegrity(supabase: SupabaseClient): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for duplicate profiles
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);

      if (error) {
        errors.push({
          type: 'data_integrity',
          table: 'profiles',
          message: `Failed to check profile duplicates: ${error.message}`,
          count: -1
        });
      } else if (profiles) {
        const emailCounts = new Map<string, number>();
        profiles.forEach(p => {
          const count = emailCounts.get(p.email) || 0;
          emailCounts.set(p.email, count + 1);
        });

        const duplicates = Array.from(emailCounts.entries()).filter(([, count]) => count > 1);
        if (duplicates.length > 0) {
          errors.push({
            type: 'data_integrity',
            table: 'profiles',
            column: 'email',
            message: 'Duplicate profile email addresses',
            count: duplicates.length,
            sampleData: duplicates.slice(0, 5).map(([email, count]) => ({ email, count }))
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to validate profile duplicates', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return errors;
  }

  /**
   * Validate migration completeness
   */
  private async validateMigrationCompleteness(supabase: SupabaseClient): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Check for missing legacy ID mappings
    try {
      const { count: profilesWithoutLegacyIds, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('legacy_user_id.is.null,legacy_patient_id.is.null');

      if (error) {
        this.logger.error('Failed to check legacy ID mappings', {
          error: error.message,
          code: error.code
        });
      } else if (profilesWithoutLegacyIds && profilesWithoutLegacyIds > 0) {
        warnings.push({
          type: 'migration',
          table: 'profiles',
          message: 'Profiles without legacy ID mappings',
          count: profilesWithoutLegacyIds,
          recommendation: 'Verify migration completeness'
        });
      }
    } catch (error) {
      this.logger.error('Failed to validate migration completeness', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return warnings;
  }

  /**
   * Get legacy database table count
   */
  private async getLegacyTableCount(client: Client): Promise<number> {
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Failed to get legacy table count', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Get Supabase database table count
   */
  private async getSupabaseTableCount(supabase: SupabaseClient): Promise<number> {
    try {
      // This is a simplified count - in practice you'd query the information schema
      // For now, return expected table count based on our schema
      return 12; // profiles, offices, orders, order_types, order_states, messages, projects, workflow_templates, workflow_tasks, etc.
    } catch (error) {
      this.logger.error('Failed to get Supabase table count', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Cross-database validation - compare record counts
   */
  async validateMigrationCounts(
    legacyClient: Client,
    supabase: SupabaseClient
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.logger.info('Starting cross-database count validation');

      // Compare user/profile counts
      const legacyUserCount = await this.getLegacyRecordCount(legacyClient, 'auth_user');
      const supabaseProfileCount = await this.getSupabaseRecordCount(supabase, 'profiles');

      if (legacyUserCount !== supabaseProfileCount) {
        const difference = Math.abs(legacyUserCount - supabaseProfileCount);
        if (difference > legacyUserCount * 0.05) { // More than 5% difference
          errors.push({
            type: 'data_integrity',
            table: 'profiles',
            message: `Significant count mismatch: Legacy users (${legacyUserCount}) vs Profiles (${supabaseProfileCount})`,
            count: difference
          });
        } else {
          warnings.push({
            type: 'migration',
            table: 'profiles',
            message: `Minor count difference: Legacy users (${legacyUserCount}) vs Profiles (${supabaseProfileCount})`,
            count: difference,
            recommendation: 'Review migration logs for excluded records'
          });
        }
      }

      // Compare instruction/order counts
      const legacyInstructionCount = await this.getLegacyRecordCount(legacyClient, 'dispatch_instruction');
      const supabaseOrderCount = await this.getSupabaseRecordCount(supabase, 'orders');

      if (legacyInstructionCount !== supabaseOrderCount) {
        const difference = Math.abs(legacyInstructionCount - supabaseOrderCount);
        if (difference > legacyInstructionCount * 0.05) {
          errors.push({
            type: 'data_integrity',
            table: 'orders',
            message: `Significant count mismatch: Legacy instructions (${legacyInstructionCount}) vs Orders (${supabaseOrderCount})`,
            count: difference
          });
        } else {
          warnings.push({
            type: 'migration',
            table: 'orders',
            message: `Minor count difference: Legacy instructions (${legacyInstructionCount}) vs Orders (${supabaseOrderCount})`,
            count: difference,
            recommendation: 'Review migration logs for excluded records'
          });
        }
      }

      const duration = Date.now() - startTime;
      const summary: ValidationSummary = {
        totalTables: 2, // Checked 2 table pairs
        validTables: 2 - errors.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        duration
      };

      this.logger.info('Cross-database validation completed', {
        summary,
        legacyUserCount,
        supabaseProfileCount,
        legacyInstructionCount,
        supabaseOrderCount
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      throw new MigrationError(
        `Cross-database validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'database-validation',
        'cross-database-validation',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get record count from legacy database
   */
  private async getLegacyRecordCount(client: Client, tableName: string): Promise<number> {
    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error(`Failed to get legacy record count for ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        tableName
      });
      return 0;
    }
  }

  /**
   * Get record count from Supabase database
   */
  private async getSupabaseRecordCount(supabase: SupabaseClient, tableName: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.logger.error(`Failed to get Supabase record count for ${tableName}`, {
          error: error.message,
          code: error.code,
          tableName
        });
        return 0;
      }

      return count || 0;
    } catch (error) {
      this.logger.error(`Failed to get Supabase record count for ${tableName}`, {
        error: error instanceof Error ? error.message : String(error),
        tableName
      });
      return 0;
    }
  }
}