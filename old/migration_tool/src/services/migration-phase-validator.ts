import { createComponentLogger } from '../utils/logger.js';
import { getSupabaseClient } from './db.service.js';

const logger = createComponentLogger('migration-phase-validator');

/**
 * Phase validation result interface
 */
export interface PhaseValidationResult {
  isValid: boolean;
  phase: string;
  tables: string[];
  recordCounts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Migration phase validator service
 * Validates data integrity and dependencies between migration phases
 */
export class MigrationPhaseValidator {
  private supabase = getSupabaseClient();

  /**
   * Validate Phase 1: Foundation tables (practices, profiles)
   */
  async validatePhase1(): Promise<PhaseValidationResult> {
    logger.info('🔍 Validating Phase 1: Foundation tables (practices, profiles)');
    
    const result: PhaseValidationResult = {
      isValid: true,
      phase: 'Phase 1',
      tables: ['practices', 'profiles'],
      recordCounts: {},
      errors: [],
      warnings: []
    };

    try {
      // Check practices table
      const { count: practicesCount, error: practicesError } = await this.supabase
        .from('practices')
        .select('*', { count: 'exact', head: true });

      if (practicesError) {
        result.errors.push(`Failed to count practices: ${practicesError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['practices'] = practicesCount || 0;
        if (practicesCount === 0) {
          result.errors.push('No practices found - practices table is empty');
          result.isValid = false;
        }
      }

      // Check profiles table
      const { count: profilesCount, error: profilesError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) {
        result.errors.push(`Failed to count profiles: ${profilesError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['profiles'] = profilesCount || 0;
        if (profilesCount === 0) {
          result.errors.push('No profiles found - profiles table is empty');
          result.isValid = false;
        }
      }

      logger.info('Phase 1 validation completed', {
        isValid: result.isValid,
        recordCounts: result.recordCounts,
        errors: result.errors
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errors.push(`Phase 1 validation failed: ${errorMessage}`);
      result.isValid = false;
      logger.error('Phase 1 validation error', { error: errorMessage });
    }

    return result;
  }

  /**
   * Validate Phase 2: Cross-reference tables (practitioners, practice_members)
   */
  async validatePhase2(): Promise<PhaseValidationResult> {
    logger.info('🔍 Validating Phase 2: Cross-reference tables (practitioners, practice_members)');
    
    const result: PhaseValidationResult = {
      isValid: true,
      phase: 'Phase 2',
      tables: ['practitioners', 'practice_members'],
      recordCounts: {},
      errors: [],
      warnings: []
    };

    try {
      // First validate Phase 1 dependencies
      const phase1Result = await this.validatePhase1();
      if (!phase1Result.isValid) {
        result.errors.push('Phase 1 validation failed - cannot proceed with Phase 2');
        result.isValid = false;
        return result;
      }

      // Check practitioners table
      const { count: practitionersCount, error: practitionersError } = await this.supabase
        .from('practitioners')
        .select('*', { count: 'exact', head: true });

      if (practitionersError) {
        result.errors.push(`Failed to count practitioners: ${practitionersError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['practitioners'] = practitionersCount || 0;
      }

      // Check practice_members table
      const { count: practiceMembersCount, error: practiceMembersError } = await this.supabase
        .from('practice_members')
        .select('*', { count: 'exact', head: true });

      if (practiceMembersError) {
        result.errors.push(`Failed to count practice_members: ${practiceMembersError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['practice_members'] = practiceMembersCount || 0;
      }

      // Validate foreign key relationships for practitioners
      if ((result.recordCounts['practitioners'] || 0) > 0) {
        const { count: invalidPractitioners, error: fkError } = await this.supabase
          .from('practitioners')
          .select('id', { count: 'exact', head: true })
          .is('practice_id', null)
          .or('profile_id.is.null');

        if (fkError) {
          result.warnings.push(`Could not validate practitioners foreign keys: ${fkError.message}`);
        } else if (invalidPractitioners && invalidPractitioners > 0) {
          result.errors.push(`Found ${invalidPractitioners} practitioners with invalid foreign key references`);
          result.isValid = false;
        }
      }

      logger.info('Phase 2 validation completed', {
        isValid: result.isValid,
        recordCounts: result.recordCounts,
        errors: result.errors
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errors.push(`Phase 2 validation failed: ${errorMessage}`);
      result.isValid = false;
      logger.error('Phase 2 validation error', { error: errorMessage });
    }

    return result;
  }

  /**
   * Validate Phase 3: Primary entity tables (patients)
   */
  async validatePhase3(): Promise<PhaseValidationResult> {
    logger.info('🔍 Validating Phase 3: Primary entity tables (patients)');
    
    const result: PhaseValidationResult = {
      isValid: true,
      phase: 'Phase 3',
      tables: ['patients'],
      recordCounts: {},
      errors: [],
      warnings: []
    };

    try {
      // First validate Phase 1 dependencies
      const phase1Result = await this.validatePhase1();
      if (!phase1Result.isValid) {
        result.errors.push('Phase 1 validation failed - cannot proceed with Phase 3');
        result.isValid = false;
        return result;
      }

      // Check patients table
      const { count: patientsCount, error: patientsError } = await this.supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      if (patientsError) {
        result.errors.push(`Failed to count patients: ${patientsError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['patients'] = patientsCount || 0;
      }

      // Validate foreign key relationships for patients
      if ((result.recordCounts['patients'] || 0) > 0) {
        const { count: invalidPatients, error: fkError } = await this.supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .is('practice_id', null);

        if (fkError) {
          result.warnings.push(`Could not validate patients foreign keys: ${fkError.message}`);
        } else if (invalidPatients && invalidPatients > 0) {
          result.errors.push(`Found ${invalidPatients} patients with invalid practice_id references`);
          result.isValid = false;
        }
      }

      logger.info('Phase 3 validation completed', {
        isValid: result.isValid,
        recordCounts: result.recordCounts,
        errors: result.errors
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errors.push(`Phase 3 validation failed: ${errorMessage}`);
      result.isValid = false;
      logger.error('Phase 3 validation error', { error: errorMessage });
    }

    return result;
  }

  /**
   * Validate Phase 4: Secondary entity tables (cases, patient_flags, patient_notes)
   */
  async validatePhase4(): Promise<PhaseValidationResult> {
    logger.info('🔍 Validating Phase 4: Secondary entity tables (cases, patient_flags, patient_notes)');
    
    const result: PhaseValidationResult = {
      isValid: true,
      phase: 'Phase 4',
      tables: ['cases', 'patient_flags', 'patient_notes'],
      recordCounts: {},
      errors: [],
      warnings: []
    };

    try {
      // First validate Phase 3 dependencies
      const phase3Result = await this.validatePhase3();
      if (!phase3Result.isValid) {
        result.errors.push('Phase 3 validation failed - cannot proceed with Phase 4');
        result.isValid = false;
        return result;
      }

      // Check cases table
      const { count: casesCount, error: casesError } = await this.supabase
        .from('cases')
        .select('*', { count: 'exact', head: true });

      if (casesError) {
        result.errors.push(`Failed to count cases: ${casesError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['cases'] = casesCount || 0;
      }

      // Check patient_flags table
      const { count: patientFlagsCount, error: patientFlagsError } = await this.supabase
        .from('patient_flags')
        .select('*', { count: 'exact', head: true });

      if (patientFlagsError) {
        result.errors.push(`Failed to count patient_flags: ${patientFlagsError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['patient_flags'] = patientFlagsCount || 0;
      }

      // Check patient_notes table
      const { count: patientNotesCount, error: patientNotesError } = await this.supabase
        .from('patient_notes')
        .select('*', { count: 'exact', head: true });

      if (patientNotesError) {
        result.errors.push(`Failed to count patient_notes: ${patientNotesError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['patient_notes'] = patientNotesCount || 0;
      }

      // Validate foreign key relationships for cases
      if ((result.recordCounts['cases'] || 0) > 0) {
        const { count: invalidCases, error: fkError } = await this.supabase
          .from('cases')
          .select('id', { count: 'exact', head: true })
          .or('patient_id.is.null,practice_id.is.null');

        if (fkError) {
          result.warnings.push(`Could not validate cases foreign keys: ${fkError.message}`);
        } else if (invalidCases && invalidCases > 0) {
          result.errors.push(`Found ${invalidCases} cases with invalid foreign key references`);
          result.isValid = false;
        }
      }

      logger.info('Phase 4 validation completed', {
        isValid: result.isValid,
        recordCounts: result.recordCounts,
        errors: result.errors
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errors.push(`Phase 4 validation failed: ${errorMessage}`);
      result.isValid = false;
      logger.error('Phase 4 validation error', { error: errorMessage });
    }

    return result;
  }

  /**
   * Validate Phase 5: Tertiary entity tables (orders, case_flags, case_notes, case_actions)
   */
  async validatePhase5(): Promise<PhaseValidationResult> {
    logger.info('🔍 Validating Phase 5: Tertiary entity tables (orders, case_flags, case_notes, case_actions)');
    
    const result: PhaseValidationResult = {
      isValid: true,
      phase: 'Phase 5',
      tables: ['orders', 'case_flags', 'case_notes', 'case_actions'],
      recordCounts: {},
      errors: [],
      warnings: []
    };

    try {
      // First validate Phase 4 dependencies
      const phase4Result = await this.validatePhase4();
      if (!phase4Result.isValid) {
        result.errors.push('Phase 4 validation failed - cannot proceed with Phase 5');
        result.isValid = false;
        return result;
      }

      // Check orders table
      const { count: ordersCount, error: ordersError } = await this.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (ordersError) {
        result.errors.push(`Failed to count orders: ${ordersError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['orders'] = ordersCount || 0;
      }

      // Check case_flags table
      const { count: caseFlagsCount, error: caseFlagsError } = await this.supabase
        .from('case_flags')
        .select('*', { count: 'exact', head: true });

      if (caseFlagsError) {
        result.errors.push(`Failed to count case_flags: ${caseFlagsError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['case_flags'] = caseFlagsCount || 0;
      }

      // Check case_notes table
      const { count: caseNotesCount, error: caseNotesError } = await this.supabase
        .from('case_notes')
        .select('*', { count: 'exact', head: true });

      if (caseNotesError) {
        result.errors.push(`Failed to count case_notes: ${caseNotesError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['case_notes'] = caseNotesCount || 0;
      }

      // Check case_actions table
      const { count: caseActionsCount, error: caseActionsError } = await this.supabase
        .from('case_actions')
        .select('*', { count: 'exact', head: true });

      if (caseActionsError) {
        result.errors.push(`Failed to count case_actions: ${caseActionsError.message}`);
        result.isValid = false;
      } else {
        result.recordCounts['case_actions'] = caseActionsCount || 0;
      }

      // Validate foreign key relationships for orders
      if ((result.recordCounts['orders'] || 0) > 0) {
        const { count: invalidOrders, error: fkError } = await this.supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .or('case_id.is.null,practice_id.is.null');

        if (fkError) {
          result.warnings.push(`Could not validate orders foreign keys: ${fkError.message}`);
        } else if (invalidOrders && invalidOrders > 0) {
          result.errors.push(`Found ${invalidOrders} orders with invalid foreign key references`);
          result.isValid = false;
        }
      }

      logger.info('Phase 5 validation completed', {
        isValid: result.isValid,
        recordCounts: result.recordCounts,
        errors: result.errors
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errors.push(`Phase 5 validation failed: ${errorMessage}`);
      result.isValid = false;
      logger.error('Phase 5 validation error', { error: errorMessage });
    }

    return result;
  }

  /**
   * Validate a specific phase by number
   */
  async validatePhase(phaseNumber: number): Promise<PhaseValidationResult> {
    switch (phaseNumber) {
      case 1:
        return this.validatePhase1();
      case 2:
        return this.validatePhase2();
      case 3:
        return this.validatePhase3();
      case 4:
        return this.validatePhase4();
      case 5:
        return this.validatePhase5();
      default:
        throw new Error(`Invalid phase number: ${phaseNumber}. Must be 1-5.`);
    }
  }

  /**
   * Get record count for a specific table
   */
  async getTableRecordCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        logger.error(`Failed to count records in ${tableName}`, { error: error.message });
        throw new Error(`Failed to count records in ${tableName}: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting record count for ${tableName}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Generate a comprehensive validation report
   */
  generateValidationReport(result: PhaseValidationResult): string {
    const lines: string[] = [];
    lines.push(`\n=== ${result.phase} Validation Report ===`);
    lines.push(`Status: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`Tables: ${result.tables.join(', ')}`);
    
    lines.push('\nRecord Counts:');
    Object.entries(result.recordCounts).forEach(([table, count]) => {
      lines.push(`  ${table}: ${count.toLocaleString()} records`);
    });

    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      result.errors.forEach(error => lines.push(`  ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      result.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
    }

    lines.push('');
    return lines.join('\n');
  }
}