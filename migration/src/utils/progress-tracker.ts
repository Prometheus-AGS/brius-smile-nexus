/**
 * Progress tracking utility for migration operations
 * Provides real-time progress monitoring and reporting
 */

import { MigrationProgress, MigrationPhase, MigrationSubstep } from '../types/migration-types';
import { Logger } from './logger';

export class ProgressTracker {
  private migrationId: string;
  private logger: Logger;
  private progress: MigrationProgress;

  constructor(migrationId: string, logger: Logger) {
    this.migrationId = migrationId;
    this.logger = logger;
    this.progress = {
      migration_id: migrationId,
      started_at: new Date(),
      completed_at: null,
      status: 'running',
      current_phase: 0,
      total_phases: 7,
      phases: [],
      overall_progress: 0,
      error_message: null,
      rollback_available: true
    };
  }

  /**
   * Initialize progress tracking
   */
  async initializeProgress(): Promise<void> {
    await this.logger.info('Initializing migration progress tracking', {
      migration_id: this.migrationId,
      total_phases: this.progress.total_phases
    });
  }

  /**
   * Start a new migration phase
   */
  async startPhase(phaseNumber: number, name: string, description: string): Promise<MigrationPhase> {
    const phase: MigrationPhase = {
      phase: phaseNumber,
      name,
      description,
      status: 'running',
      started_at: new Date(),
      completed_at: null,
      error_message: null,
      records_processed: 0,
      records_total: 0,
      substeps: []
    };

    this.progress.phases.push(phase);
    this.progress.current_phase = phaseNumber;
    this.updateOverallProgress();

    await this.logger.info(`Starting Phase ${phaseNumber}: ${name}`, {
      migration_id: this.migrationId,
      phase: phaseNumber,
      description
    });

    return phase;
  }

  /**
   * Complete a migration phase
   */
  async completePhase(phase: MigrationPhase): Promise<void> {
    phase.status = 'completed';
    phase.completed_at = new Date();
    this.updateOverallProgress();

    await this.logger.info(`Completed Phase ${phase.phase}: ${phase.name}`, {
      migration_id: this.migrationId,
      phase: phase.phase,
      duration_ms: phase.completed_at.getTime() - phase.started_at!.getTime(),
      records_processed: phase.records_processed
    });
  }

  /**
   * Mark a phase as failed
   */
  async failPhase(phase: MigrationPhase, error: Error): Promise<void> {
    phase.status = 'failed';
    phase.completed_at = new Date();
    phase.error_message = error.message;
    
    this.progress.status = 'failed';
    this.progress.error_message = error.message;
    this.updateOverallProgress();

    await this.logger.error(`Failed Phase ${phase.phase}: ${phase.name}`, {
      migration_id: this.migrationId,
      phase: phase.phase,
      error: error.message,
      duration_ms: phase.completed_at.getTime() - phase.started_at!.getTime()
    });
  }

  /**
   * Start a substep within a phase
   */
  async startSubstep(phase: MigrationPhase, name: string, description: string): Promise<MigrationSubstep> {
    const substep: MigrationSubstep = {
      name,
      description,
      status: 'running',
      started_at: new Date(),
      completed_at: null,
      error_message: null,
      records_processed: 0,
      records_total: 0
    };

    phase.substeps.push(substep);

    await this.logger.debug(`Starting substep: ${name}`, {
      migration_id: this.migrationId,
      phase: phase.phase,
      substep: name,
      description
    });

    return substep;
  }

  /**
   * Complete a substep
   */
  async completeSubstep(phase: MigrationPhase, substepName: string, recordsProcessed: number = 0): Promise<void> {
    const substep = phase.substeps.find(s => s.name === substepName);
    if (!substep) {
      await this.logger.warn(`Substep not found: ${substepName}`, {
        migration_id: this.migrationId,
        phase: phase.phase
      });
      return;
    }

    substep.status = 'completed';
    substep.completed_at = new Date();
    substep.records_processed = recordsProcessed;
    
    phase.records_processed += recordsProcessed;

    await this.logger.debug(`Completed substep: ${substepName}`, {
      migration_id: this.migrationId,
      phase: phase.phase,
      substep: substepName,
      records_processed: recordsProcessed,
      duration_ms: substep.completed_at.getTime() - substep.started_at!.getTime()
    });
  }

  /**
   * Fail a substep
   */
  async failSubstep(phase: MigrationPhase, substepName: string, error: Error): Promise<void> {
    const substep = phase.substeps.find(s => s.name === substepName);
    if (!substep) {
      await this.logger.warn(`Substep not found: ${substepName}`, {
        migration_id: this.migrationId,
        phase: phase.phase
      });
      return;
    }

    substep.status = 'failed';
    substep.completed_at = new Date();
    substep.error_message = error.message;

    await this.logger.error(`Failed substep: ${substepName}`, {
      migration_id: this.migrationId,
      phase: phase.phase,
      substep: substepName,
      error: error.message,
      duration_ms: substep.completed_at.getTime() - substep.started_at!.getTime()
    });
  }

  /**
   * Update substep progress
   */
  async updateSubstepProgress(phase: MigrationPhase, substepName: string, processed: number, total: number): Promise<void> {
    const substep = phase.substeps.find(s => s.name === substepName);
    if (!substep) {
      return;
    }

    substep.records_processed = processed;
    substep.records_total = total;
    
    // Update phase totals
    phase.records_processed = phase.substeps.reduce((sum, s) => sum + s.records_processed, 0);
    phase.records_total = phase.substeps.reduce((sum, s) => sum + s.records_total, 0);

    this.updateOverallProgress();

    // Log progress every 100 records or at completion
    if (processed % 100 === 0 || processed === total) {
      await this.logger.debug(`Substep progress: ${substepName}`, {
        migration_id: this.migrationId,
        phase: phase.phase,
        substep: substepName,
        processed,
        total,
        percentage: total > 0 ? Math.round((processed / total) * 100) : 0
      });
    }
  }

  /**
   * Complete the entire migration
   */
  async completeMigration(): Promise<void> {
    this.progress.status = 'completed';
    this.progress.completed_at = new Date();
    this.progress.overall_progress = 100;

    await this.logger.info('Migration completed successfully', {
      migration_id: this.migrationId,
      total_duration_ms: this.progress.completed_at.getTime() - this.progress.started_at.getTime(),
      phases_completed: this.progress.phases.filter(p => p.status === 'completed').length,
      total_phases: this.progress.total_phases
    });
  }

  /**
   * Mark migration as failed
   */
  async failMigration(error: Error): Promise<void> {
    this.progress.status = 'failed';
    this.progress.completed_at = new Date();
    this.progress.error_message = error.message;

    await this.logger.error('Migration failed', {
      migration_id: this.migrationId,
      error: error.message,
      phases_completed: this.progress.phases.filter(p => p.status === 'completed').length,
      current_phase: this.progress.current_phase,
      total_duration_ms: this.progress.completed_at.getTime() - this.progress.started_at.getTime()
    });
  }

  /**
   * Get current progress
   */
  async getProgress(): Promise<MigrationProgress> {
    return { ...this.progress };
  }

  /**
   * Update overall progress percentage
   */
  private updateOverallProgress(): void {
    const completedPhases = this.progress.phases.filter(p => p.status === 'completed').length;
    const runningPhases = this.progress.phases.filter(p => p.status === 'running').length;
    
    // Calculate progress based on completed phases plus partial progress of running phases
    let progress = (completedPhases / this.progress.total_phases) * 100;
    
    // Add partial progress for running phases
    if (runningPhases > 0) {
      const runningPhase = this.progress.phases.find(p => p.status === 'running');
      if (runningPhase && runningPhase.records_total > 0) {
        const phaseProgress = (runningPhase.records_processed / runningPhase.records_total) * (100 / this.progress.total_phases);
        progress += phaseProgress;
      } else {
        // If no record counts available, assume 50% progress for running phase
        progress += (50 / this.progress.total_phases);
      }
    }

    this.progress.overall_progress = Math.min(Math.round(progress), 100);
  }

  /**
   * Generate progress summary
   */
  async getProgressSummary(): Promise<string> {
    const completedPhases = this.progress.phases.filter(p => p.status === 'completed').length;
    const failedPhases = this.progress.phases.filter(p => p.status === 'failed').length;
    const totalRecords = this.progress.phases.reduce((sum, p) => sum + p.records_processed, 0);
    
    const duration = this.progress.completed_at 
      ? this.progress.completed_at.getTime() - this.progress.started_at.getTime()
      : Date.now() - this.progress.started_at.getTime();

    return `Migration ${this.migrationId}: ${this.progress.overall_progress}% complete
Status: ${this.progress.status}
Phases: ${completedPhases}/${this.progress.total_phases} completed${failedPhases > 0 ? `, ${failedPhases} failed` : ''}
Records: ${totalRecords.toLocaleString()} processed
Duration: ${Math.round(duration / 1000)}s`;
  }

  /**
   * Export progress data for external monitoring
   */
  async exportProgress(): Promise<string> {
    return JSON.stringify(this.progress, null, 2);
  }
}