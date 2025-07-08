import { getSupabaseClient } from './db.service';
import { createComponentLogger } from '../utils/logger';


const logger = createComponentLogger('migration-service');

/**
 * Migration Service
 *
 * Orchestrates the data migration from the legacy database to the new Supabase schema.
 * This service is stateless. All migration state is managed in the database
 * to allow for an interactive UI experience.
 */
export class MigrationService {
  private supabase = getSupabaseClient();
  

  constructor() {
    // Constructor intentionally left empty - using new configuration system
  }

  /**
   * Runs a full migration, transferring all data from the legacy system.
   */
  async runFullMigration(): Promise<void> {
    logger.info('Starting full data migration...');
    const runId = await this.startMigrationRun('full');

    try {
      // TODO: Implement full migration logic for all tables.
      // Example: await this.migrateTable('users');
      // For now, we will just simulate a delay.

      await this.updateMigrationProgress(
        'Migrating users...',
        10
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.updateMigrationProgress(
        'Migrating cases...',
        50
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.updateMigrationProgress(
        'Finalizing...',
        90
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await this.finishMigrationRun(runId, 'completed');
      logger.info('Full data migration completed successfully.');
    } catch (error) {
      const err = error as Error;
      await this.finishMigrationRun(runId, 'failed', {
        error: err.message,
      });
      logger.error('Full data migration failed.', err);
    }
  }

  /**
   * Runs an incremental migration to sync new records since the last run.
   */
  async runIncrementalMigration(): Promise<void> {
    logger.info('Starting incremental data migration...');
    const runId = await this.startMigrationRun('incremental');

    try {
      // TODO: Implement incremental migration logic.
      // This will involve checking the `migration_runs` table for the last successful run time.
      const lastRunTime = await this.getLastSuccessfulRunTime();
      logger.info(`Syncing records since: ${lastRunTime?.toISOString()}`);

      await this.updateMigrationProgress(
        'Checking for new records...',
        25
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.updateMigrationProgress(
        'Syncing new data...',
        75
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await this.finishMigrationRun(runId, 'completed');
      logger.info('Incremental data migration completed successfully.');
    } catch (error) {
      const err = error as Error;
      await this.finishMigrationRun(runId, 'failed', {
        error: err.message,
      });
      logger.error('Incremental data migration failed.', err);
    }
  }

  // --- Private Helper Methods ---

  private async startMigrationRun(
    type: 'full' | 'incremental'
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('migration_runs')
      .insert({
        type,
        status: 'running',
        start_time: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create migration run record.', error);
      throw error;
    }

    // Reset live status for the new run
    await this.updateMigrationProgress('Starting migration...', 0);
    return data.id;
  }

  private async finishMigrationRun(
    runId: string,
    status: 'completed' | 'failed',
    log?: object
  ) {
    const { error } = await this.supabase
      .from('migration_runs')
      .update({
        status,
        end_time: new Date().toISOString(),
        log: log || {},
      })
      .eq('id', runId);

    if (error) {
      logger.error(`Failed to update migration run ${runId}.`, error);
    }

    // Update live status to final state
    await this.updateMigrationProgress(
      `Migration ${status}.`,
      status === 'completed' ? 100 : -1 // Use -1 to indicate error
    );
  }

  private async updateMigrationProgress(
    current_step: string,
    progress_percentage: number
  ) {
    const { error } = await this.supabase
      .from('migration_status')
      .update({
        current_step,
        progress_percentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1); // eq(id, 1) is to target the single row in the table

    if (error) {
      logger.error('Failed to update migration progress.', error);
    }
  }

  private async getLastSuccessfulRunTime(): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('migration_runs')
      .select('end_time')
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
      logger.error('Failed to get last successful migration run time.', error);
      return null;
    }

    return data ? new Date(data.end_time) : null;
  }
}