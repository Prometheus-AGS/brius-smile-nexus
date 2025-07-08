#!/usr/bin/env ts-node

/**
 * Profiles Migration Execution Script
 * 
 * This script executes the complete profiles migration from the legacy Django database
 * to the Supabase profiles table, handling all 9,101 user records with proper
 * constraint handling and data cleansing.
 */

import { Command } from './$node_modules/commander/typings/esm.d.mts';
import chalk from './$node_modules/chalk/source/index.js';
import ora from './$node_modules/ora/index.js';
import { config } from './$node_modules/dotenv/lib/main.js';
import { ProfilesMigrationService } from './src/services/profiles-migration-service';
import { createComponentLogger } from './src/utils/logger';

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: Array<{
    legacyId: number;
    error: string;
    severity: 'warning' | 'error';
  }>;
  duplicateEmails: number;
  emailConflictsResolved: number;
}

// Load environment variables
config();

const logger = createComponentLogger('profiles-migration-executor');

interface ExecutionOptions {
  dryRun: boolean;
  batchSize: number;
  maxRetries: number;
  skipValidation: boolean;
  generateFallbackEmails: boolean;
  handleEmailConflicts: boolean;
  verbose: boolean;
}

class ProfilesMigrationExecutor {
  private migrationService: ProfilesMigrationService;
  private options: ExecutionOptions;

  constructor(options: ExecutionOptions) {
    this.options = options;
    
    // Validate required environment variables
    this.validateEnvironment();
    
    // Initialize migration service
    this.migrationService = new ProfilesMigrationService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        host: process.env.LEGACY_DB_HOST!,
        port: parseInt(process.env.LEGACY_DB_PORT || '5432'),
        database: process.env.LEGACY_DB_NAME!,
        user: process.env.LEGACY_DB_USER!,
        password: process.env.LEGACY_DB_PASSWORD!,
      },
      {
        batchSize: options.batchSize,
        maxRetries: options.maxRetries,
        handleEmailConflicts: options.handleEmailConflicts,
        generateFallbackEmails: options.generateFallbackEmails,
        skipInvalidRecords: true,
        dryRun: options.dryRun
      }
    );
  }

  private validateEnvironment(): void {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'LEGACY_DB_HOST',
      'LEGACY_DB_NAME',
      'LEGACY_DB_USER',
      'LEGACY_DB_PASSWORD'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error(chalk.red('❌ Missing required environment variables:'));
      missing.forEach(varName => console.error(chalk.red(`   - ${varName}`)));
      console.error(chalk.yellow('\n💡 Please check your .env file or environment configuration.'));
      process.exit(1);
    }
  }

  async execute(): Promise<void> {
    console.log(chalk.bold.blue('🚀 Profiles Migration Execution'));
    console.log(chalk.gray('=====================================\n'));

    try {
      // Pre-migration status check
      await this.showPreMigrationStatus();
      
      if (!this.options.dryRun) {
        const confirmed = await this.confirmExecution();
        if (!confirmed) {
          console.log(chalk.yellow('Migration cancelled by user.'));
          return;
        }
      }

      // Execute migration
      const spinner = ora('Starting profiles migration...').start();
      
      try {
        const result = await this.migrationService.migrateAllProfiles();
        
        if (result.success) {
          spinner.succeed('Migration completed successfully!');
        } else {
          spinner.fail('Migration completed with errors');
        }
        
        // Display results
        await this.displayResults(result);
        
        // Post-migration validation
        if (!this.options.skipValidation && !this.options.dryRun) {
          await this.performPostMigrationValidation();
        }
        
        // Show final status
        await this.showPostMigrationStatus();
        
      } catch (error) {
        spinner.fail('Migration failed with critical error');
        throw error;
      }
      
    } catch (error) {
      logger.error('Migration execution failed', error);
      console.error(chalk.red('\n❌ Migration failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  }

  private async showPreMigrationStatus(): Promise<void> {
    console.log(chalk.bold('📊 Pre-Migration Status'));
    console.log(chalk.gray('------------------------'));
    
    try {
      const status = await this.migrationService.getMigrationStatus();
      
      console.log(`Legacy Users: ${chalk.cyan(status.legacyCount.toLocaleString())}`);
      console.log(`Supabase Profiles: ${chalk.cyan(status.supabaseCount.toLocaleString())}`);
      console.log(`Migration Gap: ${chalk.yellow(status.migrationGap.toLocaleString())}`);
      
      if (status.lastMigrationDate) {
        console.log(`Last Migration: ${chalk.gray(new Date(status.lastMigrationDate).toLocaleString())}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(chalk.red('⚠️  Could not retrieve pre-migration status'));
      if (this.options.verbose) {
        console.log(chalk.gray(error instanceof Error ? error.message : 'Unknown error'));
      }
      console.log('');
    }
  }

  private async confirmExecution(): Promise<boolean> {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log(chalk.yellow('⚠️  This will migrate all profiles from the legacy database to Supabase.'));
      console.log(chalk.yellow('   This operation will modify the Supabase database.'));
      console.log('');
      
      rl.question(chalk.bold('Do you want to proceed? (y/N): '), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  private async displayResults(result: MigrationResult): Promise<void> {
    console.log(chalk.bold('\n📈 Migration Results'));
    console.log(chalk.gray('--------------------'));
    
    console.log(`Total Processed: ${chalk.cyan(result.totalProcessed.toLocaleString())}`);
    console.log(`Successful: ${chalk.green(result.successfulMigrations.toLocaleString())}`);
    console.log(`Failed: ${chalk.red(result.failedMigrations.toLocaleString())}`);
    
    if (result.duplicateEmails > 0) {
      console.log(`Duplicate Emails: ${chalk.yellow(result.duplicateEmails.toLocaleString())}`);
    }
    
    if (result.emailConflictsResolved > 0) {
      console.log(`Email Conflicts Resolved: ${chalk.blue(result.emailConflictsResolved.toLocaleString())}`);
    }
    
    const successRate = ((result.successfulMigrations / result.totalProcessed) * 100).toFixed(1);
    console.log(`Success Rate: ${chalk.bold(successRate)}%`);
    
    // Show errors if any
    if (result.errors && result.errors.length > 0) {
      console.log(chalk.bold('\n⚠️  Errors Encountered:'));
      
      const errorsByType = result.errors.reduce((acc: Record<string, number>, error: { legacyId: number; error: string; severity: 'warning' | 'error' }) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(errorsByType).forEach(([severity, count]) => {
        const color = severity === 'error' ? chalk.red : chalk.yellow;
        console.log(`   ${color(severity.toUpperCase())}: ${count}`);
      });
      
      if (this.options.verbose && result.errors.length <= 10) {
        console.log(chalk.gray('\nFirst few errors:'));
        result.errors.slice(0, 5).forEach((error: { legacyId: number; error: string; severity: 'warning' | 'error' }, index: number) => {
          console.log(chalk.gray(`   ${index + 1}. Legacy ID ${error.legacyId}: ${error.error}`));
        });
      }
    }
    
    console.log('');
  }

  private async performPostMigrationValidation(): Promise<void> {
    console.log(chalk.bold('🔍 Post-Migration Validation'));
    console.log(chalk.gray('-----------------------------'));
    
    const spinner = ora('Validating migrated data...').start();
    
    try {
      const validation = await this.migrationService.validateMigration();
      
      if (validation.isValid) {
        spinner.succeed('Validation passed - all data is consistent');
      } else {
        spinner.warn('Validation completed with issues');
      }
      
      // Display validation statistics
      const stats = validation.statistics;
      console.log(`Total Profiles: ${chalk.cyan(stats.totalProfiles.toLocaleString())}`);
      console.log(`Profiles with Emails: ${chalk.cyan(stats.profilesWithEmails.toLocaleString())}`);
      console.log(`Fallback Emails Generated: ${chalk.yellow(stats.profilesWithFallbackEmails.toLocaleString())}`);
      
      if (stats.duplicateEmails > 0) {
        console.log(`Duplicate Emails: ${chalk.red(stats.duplicateEmails.toLocaleString())}`);
      }
      
      if (stats.missingRequiredFields > 0) {
        console.log(`Missing Required Fields: ${chalk.red(stats.missingRequiredFields.toLocaleString())}`);
      }
      
      // Show validation issues
      if (validation.issues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Validation Issues:'));
        validation.issues.forEach((issue, index) => {
          console.log(chalk.yellow(`   ${index + 1}. ${issue}`));
        });
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail('Validation failed');
      console.log(chalk.red('Could not validate migration results'));
      if (this.options.verbose) {
        console.log(chalk.gray(error instanceof Error ? error.message : 'Unknown error'));
      }
      console.log('');
    }
  }

  private async showPostMigrationStatus(): Promise<void> {
    console.log(chalk.bold('📊 Post-Migration Status'));
    console.log(chalk.gray('-------------------------'));
    
    try {
      const status = await this.migrationService.getMigrationStatus();
      
      console.log(`Legacy Users: ${chalk.cyan(status.legacyCount.toLocaleString())}`);
      console.log(`Supabase Profiles: ${chalk.cyan(status.supabaseCount.toLocaleString())}`);
      
      if (status.migrationGap === 0) {
        console.log(chalk.green('✅ Migration Complete - All profiles migrated!'));
      } else {
        console.log(`Remaining Gap: ${chalk.yellow(status.migrationGap.toLocaleString())}`);
      }
      
      const completionRate = ((status.supabaseCount / status.legacyCount) * 100).toFixed(1);
      console.log(`Completion Rate: ${chalk.bold(completionRate)}%`);
      
      console.log('');
      
    } catch (error) {
      console.log(chalk.red('⚠️  Could not retrieve post-migration status'));
      if (this.options.verbose) {
        console.log(chalk.gray(error instanceof Error ? error.message : 'Unknown error'));
      }
      console.log('');
    }
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('execute-profiles-migration')
    .description('Execute comprehensive profiles migration from legacy database to Supabase')
    .version('1.0.0')
    .option('--dry-run', 'Run migration without making actual changes', false)
    .option('--batch-size <size>', 'Number of profiles to process per batch', '100')
    .option('--max-retries <retries>', 'Maximum number of retries for failed operations', '3')
    .option('--skip-validation', 'Skip post-migration validation', false)
    .option('--no-fallback-emails', 'Do not generate fallback emails for users without valid emails', false)
    .option('--no-email-conflicts', 'Do not handle email conflicts (may cause failures)', false)
    .option('--verbose', 'Show detailed output and error messages', false);

  program.parse();
  
  const options = program.opts();
  
  const executionOptions: ExecutionOptions = {
    dryRun: options.dryRun,
    batchSize: parseInt(options.batchSize),
    maxRetries: parseInt(options.maxRetries),
    skipValidation: options.skipValidation,
    generateFallbackEmails: !options.noFallbackEmails,
    handleEmailConflicts: !options.noEmailConflicts,
    verbose: options.verbose
  };
  
  // Show execution configuration
  if (executionOptions.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }
  
  if (executionOptions.verbose) {
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.gray(`  Batch Size: ${executionOptions.batchSize}`));
    console.log(chalk.gray(`  Max Retries: ${executionOptions.maxRetries}`));
    console.log(chalk.gray(`  Generate Fallback Emails: ${executionOptions.generateFallbackEmails}`));
    console.log(chalk.gray(`  Handle Email Conflicts: ${executionOptions.handleEmailConflicts}`));
    console.log('');
  }
  
  const executor = new ProfilesMigrationExecutor(executionOptions);
  await executor.execute();
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️  Migration interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⚠️  Migration terminated'));
  process.exit(0);
});

// Execute main function
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { ProfilesMigrationExecutor };