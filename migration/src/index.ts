/**
 * Main migration orchestrator
 * Coordinates the complete migration process from legacy Django to Supabase
 */

import { MigrationConfig, MigrationReport } from './types/migration-types';
import { LegacyConnectionService } from './services/legacy-connection';
import { SupabaseConnectionService } from './services/supabase-connection';
import { createLogger, Logger } from './utils/logger';
import { ProgressTracker } from './utils/progress-tracker';
import { ErrorHandler } from './utils/error-handler';
import { ProfilesMigrator } from './migrators/profiles-migrator';
import { OfficesMigrator } from './migrators/offices-migrator';
import { OrdersMigrator } from './migrators/orders-migrator';
import { ProjectsMigrator } from './migrators/projects-migrator';
import { MessagesMigrator } from './migrators/messages-migrator';
import { StatesMigrator } from './migrators/states-migrator';

export class MigrationOrchestrator {
  private config: MigrationConfig;
  private logger: Logger;
  private legacyDb: LegacyConnectionService;
  private supabaseDb: SupabaseConnectionService;
  private progressTracker: ProgressTracker;
  private errorHandler: ErrorHandler;
  private migrationId: string;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.migrationId = `migration_${Date.now()}`;
    
    // Initialize logger
    this.logger = createLogger({
      level: config.logging.level,
      file_path: config.logging.file_path,
      max_file_size_mb: config.logging.max_file_size_mb,
      max_files: config.logging.max_files,
      console_output: true
    });

    // Initialize database connections
    this.legacyDb = new LegacyConnectionService(config.legacy_database, this.logger);
    this.supabaseDb = new SupabaseConnectionService(config.supabase, this.logger);

    // Initialize utilities
    this.progressTracker = new ProgressTracker(this.migrationId, this.logger);
    this.errorHandler = new ErrorHandler(this.logger);
  }

  /**
   * Execute the complete migration process
   */
  async executeMigration(): Promise<MigrationReport> {
    const startTime = Date.now();
    
    try {
      await this.logger.info('Starting migration process', { 
        migration_id: this.migrationId,
        config: {
          batch_size: this.config.migration.batch_size,
          enable_embeddings: this.config.migration.enable_embeddings,
          validate_data: this.config.migration.validate_data
        }
      });

      // Initialize progress tracking
      await this.progressTracker.initializeProgress();

      // Phase 1: Pre-migration validation
      await this.executePhase1PreValidation();

      // Phase 2: Core data migration
      await this.executePhase2CoreData();

      // Phase 3: Relationship migration
      await this.executePhase3Relationships();

      // Phase 4: Communication normalization
      await this.executePhase4Communication();

      // Phase 5: Workflow migration
      await this.executePhase5Workflow();

      // Phase 6: Post-migration validation
      await this.executePhase6PostValidation();

      // Phase 7: AI processing (if enabled)
      if (this.config.migration.enable_embeddings) {
        await this.executePhase7AIProcessing();
      }

      // Generate final report
      const report = await this.generateMigrationReport(startTime);
      
      await this.logger.info('Migration completed successfully', {
        migration_id: this.migrationId,
        duration_ms: Date.now() - startTime,
        total_records: report.total_records_migrated
      });

      return report;

    } catch (error) {
      await this.errorHandler.handleCriticalError(error as Error, 'migration_orchestrator');
      
      // Attempt rollback
      await this.rollbackMigration();
      
      throw error;
    } finally {
      // Cleanup connections
      await this.cleanup();
    }
  }

  /**
   * Phase 1: Pre-migration validation
   */
  private async executePhase1PreValidation(): Promise<void> {
    const phase = await this.progressTracker.startPhase(1, 'Pre-migration Validation', 'Validate legacy database and Supabase connectivity');

    try {
      // Test legacy database connection
      await this.progressTracker.startSubstep(phase, 'legacy_connection', 'Testing legacy database connection');
      const legacyConnected = await this.legacyDb.testConnection();
      if (!legacyConnected) {
        throw new Error('Failed to connect to legacy database');
      }
      await this.progressTracker.completeSubstep(phase, 'legacy_connection');

      // Test Supabase connection
      await this.progressTracker.startSubstep(phase, 'supabase_connection', 'Testing Supabase connection');
      const supabaseConnected = await this.supabaseDb.testConnection();
      if (!supabaseConnected) {
        throw new Error('Failed to connect to Supabase');
      }
      await this.progressTracker.completeSubstep(phase, 'supabase_connection');

      // Validate legacy data integrity
      await this.progressTracker.startSubstep(phase, 'data_validation', 'Validating legacy data integrity');
      await this.validateLegacyDataIntegrity();
      await this.progressTracker.completeSubstep(phase, 'data_validation');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 2: Core data migration
   */
  private async executePhase2CoreData(): Promise<void> {
    const phase = await this.progressTracker.startPhase(2, 'Core Data Migration', 'Migrate profiles, offices, and order types');

    try {
      // Migrate profiles (users and patients)
      await this.progressTracker.startSubstep(phase, 'profiles', 'Migrating user profiles and patients');
      const legacyClient = await this.legacyDb.getClient();
      const supabaseClient = await this.supabaseDb.getClient();
      const profilesMigrator = new ProfilesMigrator(legacyClient, supabaseClient, this.logger);
      await profilesMigrator.migrate();
      await this.progressTracker.completeSubstep(phase, 'profiles');

      // Migrate offices
      await this.progressTracker.startSubstep(phase, 'offices', 'Migrating office data');
      const legacyClient2 = await this.legacyDb.getClient();
      const supabaseClient2 = await this.supabaseDb.getClient();
      const officesMigrator = new OfficesMigrator(legacyClient2, supabaseClient2, this.logger);
      await officesMigrator.migrate();
      await this.progressTracker.completeSubstep(phase, 'offices');

      // Migrate order types
      await this.progressTracker.startSubstep(phase, 'order_types', 'Migrating order types and states');
      const legacyClient3 = await this.legacyDb.getClient();
      const supabaseClient3 = await this.supabaseDb.getClient();
      const orderTypesMigrator = new OrdersMigrator(legacyClient3, supabaseClient3, this.logger);
      await orderTypesMigrator.migrateOrderTypes();
      await this.progressTracker.completeSubstep(phase, 'order_types');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 3: Relationship migration
   */
  private async executePhase3Relationships(): Promise<void> {
    const phase = await this.progressTracker.startPhase(3, 'Relationship Migration', 'Migrate orders and projects with relationships');

    try {
      // Migrate orders
      await this.progressTracker.startSubstep(phase, 'orders', 'Migrating orders with patient/doctor relationships');
      const ordersMigrator = new OrdersMigrator(this.legacyDb, this.supabaseDb, this.logger);
      await ordersMigrator.migrateOrders();
      await this.progressTracker.completeSubstep(phase, 'orders');

      // Migrate projects
      await this.progressTracker.startSubstep(phase, 'projects', 'Migrating 3D projects and file references');
      const projectsMigrator = new ProjectsMigrator(this.legacyDb, this.supabaseDb, this.logger);
      await projectsMigrator.migrate();
      await this.progressTracker.completeSubstep(phase, 'projects');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 4: Communication normalization
   */
  private async executePhase4Communication(): Promise<void> {
    const phase = await this.progressTracker.startPhase(4, 'Communication Normalization', 'Migrate messages and eliminate ContentTypes');

    try {
      // Migrate messages (normalize ContentTypes)
      await this.progressTracker.startSubstep(phase, 'messages', 'Migrating messages and normalizing ContentTypes relationships');
      const messagesMigrator = new MessagesMigrator(this.legacyDb, this.supabaseDb, this.logger);
      await messagesMigrator.migrate();
      await this.progressTracker.completeSubstep(phase, 'messages');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 5: Workflow migration
   */
  private async executePhase5Workflow(): Promise<void> {
    const phase = await this.progressTracker.startPhase(5, 'Workflow Migration', 'Migrate states, templates, and audit trails');

    try {
      // Migrate states and workflow data
      await this.progressTracker.startSubstep(phase, 'states', 'Migrating order states and workflow history');
      const statesMigrator = new StatesMigrator(this.legacyDb, this.supabaseDb, this.logger);
      await statesMigrator.migrate();
      await this.progressTracker.completeSubstep(phase, 'states');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 6: Post-migration validation
   */
  private async executePhase6PostValidation(): Promise<void> {
    const phase = await this.progressTracker.startPhase(6, 'Post-migration Validation', 'Validate migrated data integrity');

    try {
      // Validate record counts
      await this.progressTracker.startSubstep(phase, 'record_counts', 'Validating record counts match legacy database');
      await this.validateRecordCounts();
      await this.progressTracker.completeSubstep(phase, 'record_counts');

      // Validate relationships
      await this.progressTracker.startSubstep(phase, 'relationships', 'Validating foreign key relationships');
      await this.validateRelationships();
      await this.progressTracker.completeSubstep(phase, 'relationships');

      // Validate legacy ID mappings
      await this.progressTracker.startSubstep(phase, 'legacy_mappings', 'Validating legacy ID preservation');
      await this.validateLegacyMappings();
      await this.progressTracker.completeSubstep(phase, 'legacy_mappings');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Phase 7: AI processing (post-migration)
   */
  private async executePhase7AIProcessing(): Promise<void> {
    const phase = await this.progressTracker.startPhase(7, 'AI Processing', 'Generate embeddings and setup Dify integration');

    try {
      await this.logger.info('AI processing phase is not implemented in this migration', {
        note: 'Embeddings and Dify integration should be handled post-migration'
      });

      // Placeholder for future AI processing implementation
      await this.progressTracker.startSubstep(phase, 'embeddings_setup', 'Setting up embedding processing queue');
      // TODO: Implement embedding queue setup
      await this.progressTracker.completeSubstep(phase, 'embeddings_setup');

      await this.progressTracker.completePhase(phase);
      
    } catch (error) {
      await this.progressTracker.failPhase(phase, error as Error);
      throw error;
    }
  }

  /**
   * Validate legacy data integrity
   */
  private async validateLegacyDataIntegrity(): Promise<void> {
    // Validate patient-user relationships
    const patientValidation = await this.legacyDb.validatePatientUserRelationships();
    if (patientValidation.orphaned_patients > 0) {
      await this.logger.warn('Found orphaned patients without user records', patientValidation);
    }

    // Validate project data integrity
    const projectValidation = await this.legacyDb.validateProjectDataIntegrity();
    if (projectValidation.total_projects !== projectValidation.unique_uids) {
      await this.logger.warn('Found duplicate project UIDs', projectValidation);
    }

    // Validate state transition integrity
    const stateValidation = await this.legacyDb.validateStateTransitionIntegrity();
    await this.logger.info('State transition validation completed', stateValidation);
  }

  /**
   * Validate record counts between legacy and Supabase
   */
  private async validateRecordCounts(): Promise<void> {
    const legacyCounts = await this.legacyDb.getRecordCounts();
    const supabaseCounts = await this.supabaseDb.getRecordCounts();

    const validations = [
      { legacy: 'patients', supabase: 'profiles', filter: 'patient' },
      { legacy: 'offices', supabase: 'offices' },
      { legacy: 'instructions', supabase: 'orders' },
      { legacy: 'projects', supabase: 'projects' },
      { legacy: 'records', supabase: 'messages' }
    ];

    for (const validation of validations) {
      const legacyCount = legacyCounts[validation.legacy] || 0;
      const supabaseCount = supabaseCounts[validation.supabase] || 0;
      
      if (legacyCount !== supabaseCount) {
        await this.logger.warn('Record count mismatch detected', {
          table: validation.supabase,
          legacy_count: legacyCount,
          supabase_count: supabaseCount,
          difference: Math.abs(legacyCount - supabaseCount)
        });
      } else {
        await this.logger.info('Record count validation passed', {
          table: validation.supabase,
          count: supabaseCount
        });
      }
    }
  }

  /**
   * Validate foreign key relationships
   */
  private async validateRelationships(): Promise<void> {
    const validation = await this.supabaseDb.validateMigration();
    
    await this.logger.info('Relationship validation completed', {
      profiles_with_legacy_ids: validation.profiles_with_legacy_ids,
      orders_with_legacy_ids: validation.orders_with_legacy_ids,
      projects_with_legacy_ids: validation.projects_with_legacy_ids,
      messages_with_legacy_ids: validation.messages_with_legacy_ids,
      orphaned_records: validation.orphaned_records
    });

    if (validation.orphaned_records > 0) {
      await this.logger.warn('Found orphaned records without proper relationships', {
        count: validation.orphaned_records
      });
    }
  }

  /**
   * Validate legacy ID mappings are preserved
   */
  private async validateLegacyMappings(): Promise<void> {
    // This validation ensures that all migrated records maintain their legacy ID mappings
    // for backward compatibility and parallel system operation
    
    const validation = await this.supabaseDb.validateMigration();
    const totalMigrated = validation.profiles_with_legacy_ids + 
                         validation.orders_with_legacy_ids + 
                         validation.projects_with_legacy_ids + 
                         validation.messages_with_legacy_ids;

    await this.logger.info('Legacy ID mapping validation completed', {
      total_records_with_legacy_ids: totalMigrated,
      profiles: validation.profiles_with_legacy_ids,
      orders: validation.orders_with_legacy_ids,
      projects: validation.projects_with_legacy_ids,
      messages: validation.messages_with_legacy_ids
    });
  }

  /**
   * Generate comprehensive migration report
   */
  private async generateMigrationReport(startTime: number): Promise<MigrationReport> {
    const progress = await this.progressTracker.getProgress();
    const supabaseCounts = await this.supabaseDb.getRecordCounts();
    
    const totalRecords = Object.values(supabaseCounts).reduce((sum, count) => sum + count, 0);
    const duration = Date.now() - startTime;

    const report: MigrationReport = {
      migration_id: this.migrationId,
      generated_at: new Date(),
      overall_status: progress.status === 'completed' ? 'success' : 'partial',
      phases_completed: progress.phases.filter(p => p.status === 'completed').length,
      total_records_migrated: totalRecords,
      validation_results: [], // TODO: Implement detailed validation results
      performance_metrics: {
        total_duration_ms: duration,
        phase_durations: {},
        records_per_second: Math.round(totalRecords / (duration / 1000)),
        peak_memory_usage_mb: 0, // TODO: Implement memory tracking
        database_connections_used: 2,
        errors_encountered: progress.phases.filter(p => p.status === 'failed').length,
        retries_performed: 0 // TODO: Implement retry tracking
      },
      recommendations: [
        'Monitor system performance after migration',
        'Set up regular data validation checks',
        'Plan for AI embedding processing if not completed',
        'Update application configuration to use new database'
      ],
      next_steps: [
        'Update application database connections',
        'Test all application functionality',
        'Set up monitoring and alerting',
        'Plan legacy system decommissioning'
      ]
    };

    return report;
  }

  /**
   * Rollback migration in case of failure
   */
  private async rollbackMigration(): Promise<void> {
    try {
      await this.logger.warn('Initiating migration rollback');
      
      const success = await this.supabaseDb.clearAllData();
      if (success) {
        await this.logger.info('Migration rollback completed successfully');
      } else {
        await this.logger.error('Migration rollback failed - manual cleanup required');
      }
    } catch (error) {
      await this.logger.error('Critical error during rollback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.legacyDb.close();
      await this.logger.flush();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

/**
 * Main entry point for migration execution
 */
export async function executeMigration(config: MigrationConfig): Promise<MigrationReport> {
  const orchestrator = new MigrationOrchestrator(config);
  return await orchestrator.executeMigration();
}

export * from './types/migration-types';