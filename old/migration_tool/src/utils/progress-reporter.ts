import cliProgress from '../../$node_modules/@types/cli-progress/index.js';
import chalk from '../../$node_modules/chalk/source/index.js';
import { createComponentLogger } from './logger';

const logger = createComponentLogger('progress-reporter');

/**
 * Progress tracking interface
 */
export interface ProgressData {
  phase: string;
  current: number;
  total: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Extended progress bar interface to access internal properties safely
 */
interface ProgressBarWithValue extends cliProgress.SingleBar {
  value?: number;
  total?: number;
}

/**
 * Migration phase definitions
 */
export enum MigrationPhase {
  INITIALIZATION = 'Initialization',
  PREPARATION = 'Preparation',
  EXTRACTION = 'Data Extraction',
  TRANSFORMATION = 'Data Transformation',
  DEDUPLICATION = 'Patient Deduplication',
  AI_EMBEDDINGS = 'AI Embeddings Generation',
  DIFY_POPULATION = 'Dify Knowledge Base Population',
  VALIDATION = 'Data Validation',
  LOADING = 'Data Loading',
  COMPLETION = 'Migration Completion'
}

/**
 * Progress reporter class for CLI migration tool
 */
export class ProgressReporter {
  private progressBar: cliProgress.SingleBar | null = null;
  private currentPhase: string = '';
  private startTime: Date = new Date();
  private phaseStartTime: Date = new Date();
  private totalPhases: number = 0;
  private completedPhases: number = 0;
  private verbose: boolean = false;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
    this.totalPhases = Object.keys(MigrationPhase).length;
  }

  /**
   * Initialize the progress reporter
   */
  public initialize(): void {
    this.startTime = new Date();
    this.phaseStartTime = new Date();
    
    console.log(chalk.blue('🚀 Starting Migration Process'));
    console.log(chalk.gray(`Started at: ${this.startTime.toLocaleString()}`));
    console.log('');
    
    logger.info('Progress reporter initialized', {
      startTime: this.startTime.toISOString(),
      totalPhases: this.totalPhases,
      verbose: this.verbose
    });
  }

  /**
   * Start a new migration phase
   */
  public startPhase(phase: MigrationPhase, total: number = 100): void {
    this.endCurrentPhase();
    
    this.currentPhase = phase;
    this.phaseStartTime = new Date();
    this.completedPhases++;
    
    console.log(chalk.cyan(`\n📋 Phase ${this.completedPhases}/${this.totalPhases}: ${phase}`));
    
    // Create new progress bar for this phase
    this.progressBar = new cliProgress.SingleBar({
      format: `${chalk.green('Progress')} |{bar}| {percentage}% | {value}/{total} | {message}`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true
    });
    
    this.progressBar.start(total, 0, { message: 'Starting...' });
    
    logger.info('Phase started', {
      phase,
      phaseNumber: this.completedPhases,
      totalPhases: this.totalPhases,
      total,
      startTime: this.phaseStartTime.toISOString()
    });
  }

  /**
   * Update progress within current phase
   */
  public updateProgress(current: number, message?: string, details?: Record<string, unknown>): void {
    if (!this.progressBar) {
      logger.warn('Progress update called without active progress bar');
      return;
    }
    
    const payload: Record<string, unknown> = { message: message || 'Processing...' };
    
    this.progressBar.update(current, payload);
    
    if (this.verbose && message) {
      logger.info('Progress update', {
        phase: this.currentPhase,
        current,
        message,
        details
      });
    }
  }

  /**
   * Increment progress by 1
   */
  public incrementProgress(message?: string, details?: Record<string, unknown>): void {
    if (!this.progressBar) {
      logger.warn('Progress increment called without active progress bar');
      return;
    }
    
    const payload: Record<string, unknown> = { message: message || 'Processing...' };
    
    this.progressBar.increment(payload);
    
    if (this.verbose && message) {
      logger.info('Progress incremented', {
        phase: this.currentPhase,
        message,
        details
      });
    }
  }

  /**
   * Complete current phase
   */
  public completePhase(message?: string): void {
    if (!this.progressBar) {
      return;
    }
    
    this.progressBar.update(this.progressBar.getTotal(), { 
      message: message || 'Completed' 
    });
    
    this.endCurrentPhase();
    
    const duration = Date.now() - this.phaseStartTime.getTime();
    console.log(chalk.green(`✅ ${this.currentPhase} completed in ${this.formatDuration(duration)}`));
    
    logger.info('Phase completed', {
      phase: this.currentPhase,
      duration,
      message
    });
  }

  /**
   * Report an error in current phase
   */
  public reportError(error: Error, context?: Record<string, unknown>): void {
    this.endCurrentPhase();
    
    console.log(chalk.red(`❌ Error in ${this.currentPhase}: ${error.message}`));
    
    if (this.verbose && error.stack) {
      console.log(chalk.gray(error.stack));
    }
    
    logger.error('Phase error', {
      phase: this.currentPhase,
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Report a warning
   */
  public reportWarning(message: string, details?: Record<string, unknown>): void {
    console.log(chalk.yellow(`⚠️  Warning: ${message}`));
    
    logger.warn('Warning reported', {
      phase: this.currentPhase,
      message,
      details
    });
  }

  /**
   * Report general information
   */
  public reportInfo(message: string, details?: Record<string, unknown>): void {
    if (this.verbose) {
      console.log(chalk.blue(`ℹ️  ${message}`));
    }
    
    logger.info('Info reported', {
      phase: this.currentPhase,
      message,
      details
    });
  }

  /**
   * Complete the entire migration process
   */
  public complete(summary?: Record<string, unknown>): void {
    this.endCurrentPhase();
    
    const totalDuration = Date.now() - this.startTime.getTime();
    
    console.log(chalk.green('\n🎉 Migration Process Completed Successfully!'));
    console.log(chalk.gray(`Total duration: ${this.formatDuration(totalDuration)}`));
    console.log(chalk.gray(`Completed at: ${new Date().toLocaleString()}`));
    
    if (summary && this.verbose) {
      console.log(chalk.blue('\n📊 Migration Summary:'));
      Object.entries(summary).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}: ${value}`));
      });
    }
    
    logger.info('Migration completed', {
      totalDuration,
      completedPhases: this.completedPhases,
      totalPhases: this.totalPhases,
      summary
    });
  }

  /**
   * Handle migration failure
   */
  public fail(error: Error, context?: Record<string, unknown>): void {
    this.endCurrentPhase();
    
    const totalDuration = Date.now() - this.startTime.getTime();
    
    console.log(chalk.red('\n💥 Migration Process Failed!'));
    console.log(chalk.red(`Error: ${error.message}`));
    console.log(chalk.gray(`Failed after: ${this.formatDuration(totalDuration)}`));
    console.log(chalk.gray(`Failed at: ${new Date().toLocaleString()}`));
    
    if (this.verbose && error.stack) {
      console.log(chalk.gray('\nStack trace:'));
      console.log(chalk.gray(error.stack));
    }
    
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack,
      totalDuration,
      completedPhases: this.completedPhases,
      totalPhases: this.totalPhases,
      failedPhase: this.currentPhase,
      context
    });
  }

  /**
   * End current phase and cleanup progress bar
   */
  private endCurrentPhase(): void {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get current progress data
   */
  public getCurrentProgress(): ProgressData | null {
    if (!this.progressBar) {
      return null;
    }
    
    const progressBarWithValue = this.progressBar as ProgressBarWithValue;
    
    return {
      phase: this.currentPhase,
      current: progressBarWithValue.value || 0,
      total: progressBarWithValue.total || 100,
      details: {
        completedPhases: this.completedPhases,
        totalPhases: this.totalPhases,
        startTime: this.startTime.toISOString(),
        phaseStartTime: this.phaseStartTime.toISOString()
      }
    };
  }
}

/**
 * Create a new progress reporter instance
 */
export function createProgressReporter(verbose: boolean = false): ProgressReporter {
  return new ProgressReporter(verbose);
}