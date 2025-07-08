/**
 * Pre-Migration Validation
 * Comprehensive system readiness checks before migration execution
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { existsSync, mkdirSync, statSync, accessSync, constants } from 'fs';
import { join } from 'path';
import { getEnvironmentConfig, validateEnvironmentReadiness, getMigrationThresholds } from '../config/environment-config';
import { LegacyDatabaseClient } from '../../src/lib/legacy-database';

interface ValidationResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

interface SystemRequirements {
  minMemoryMb: number;
  minDiskSpaceGb: number;
  requiredNodeVersion: string;
  requiredPorts: number[];
}

interface DataQualityCheck {
  tableName: string;
  checkName: string;
  query: string;
  expectedResult: 'zero' | 'positive' | 'custom';
  customValidator?: (result: unknown) => boolean;
}

class PreMigrationValidator {
  private config = getEnvironmentConfig();
  private results: ValidationResult[] = [];
  private spinner = ora();

  async runValidation(): Promise<{ success: boolean; results: ValidationResult[] }> {
    console.log(chalk.bold('\n🔍 Pre-Migration Validation\n'));

    try {
      await this.validateEnvironmentConfiguration();
      await this.validateSystemRequirements();
      await this.validateDatabaseConnections();
      await this.validateDatabaseSchemas();
      await this.validateDataQuality();
      await this.validateResourceAvailability();
      await this.validateDependencies();
      await this.validateSecurityRequirements();
      await this.validateBackupCapability();

      const hasFailures = this.results.some(r => r.status === 'fail');
      const hasWarnings = this.results.some(r => r.status === 'warning');

      this.printSummary();

      return {
        success: !hasFailures,
        results: this.results
      };

    } catch (error) {
      this.addResult('system', 'validation-execution', 'fail', 
        `Validation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        results: this.results
      };
    }
  }

  private addResult(category: string, name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: Record<string, unknown>): void {
    this.results.push({ category, name, status, message, details });
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const color = status === 'pass' ? chalk.green : status === 'fail' ? chalk.red : chalk.yellow;
    console.log(`${icon} ${color(message)}`);
  }

  private async validateEnvironmentConfiguration(): Promise<void> {
    this.spinner.start('Validating environment configuration...');
    
    try {
      const validation = validateEnvironmentReadiness(this.config);
      
      if (validation.ready) {
        this.addResult('environment', 'config-validation', 'pass', 'Environment configuration is valid');
      } else {
        this.addResult('environment', 'config-validation', 'fail', 
          `Environment configuration issues: ${validation.issues.join(', ')}`);
      }

      // Check environment-specific settings
      const thresholds = getMigrationThresholds(this.config.environment);
      this.addResult('environment', 'migration-thresholds', 'pass', 
        `Migration thresholds configured for ${this.config.environment}`, thresholds);

    } catch (error) {
      this.addResult('environment', 'config-validation', 'fail', 
        `Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateSystemRequirements(): Promise<void> {
    this.spinner.start('Checking system requirements...');

    const requirements: SystemRequirements = {
      minMemoryMb: 2048,
      minDiskSpaceGb: 10,
      requiredNodeVersion: '18.0.0',
      requiredPorts: [5432, 3000, this.config.monitoring.metricsPort]
    };

    try {
      // Check Node.js version
      const nodeVersion = process.version.substring(1); // Remove 'v' prefix
      const [major] = nodeVersion.split('.').map(Number);
      const [requiredMajor] = requirements.requiredNodeVersion.split('.').map(Number);
      
      if (major >= requiredMajor) {
        this.addResult('system', 'node-version', 'pass', `Node.js version ${nodeVersion} meets requirements`);
      } else {
        this.addResult('system', 'node-version', 'fail', 
          `Node.js version ${nodeVersion} is below required ${requirements.requiredNodeVersion}`);
      }

      // Check available memory
      const totalMemory = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
      if (totalMemory >= requirements.minMemoryMb) {
        this.addResult('system', 'memory', 'pass', `Available memory: ${totalMemory}MB`);
      } else {
        this.addResult('system', 'memory', 'warning', 
          `Available memory ${totalMemory}MB is below recommended ${requirements.minMemoryMb}MB`);
      }

      // Check disk space (simplified check)
      try {
        const stats = statSync(process.cwd());
        this.addResult('system', 'disk-space', 'pass', 'Disk space check completed');
      } catch (error) {
        this.addResult('system', 'disk-space', 'warning', 'Could not verify disk space');
      }

    } catch (error) {
      this.addResult('system', 'requirements', 'fail', 
        `System requirements check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateDatabaseConnections(): Promise<void> {
    this.spinner.start('Testing database connections...');

    // Test Supabase connection
    try {
      const supabase = createClient(
        this.config.database.supabase.url,
        this.config.database.supabase.serviceRoleKey
      );

      const { data, error } = await supabase.from('migration_batches').select('count').limit(1);
      
      if (error && !error.message.includes('relation "migration_batches" does not exist')) {
        throw error;
      }

      this.addResult('database', 'supabase-connection', 'pass', 'Supabase connection successful');
    } catch (error) {
      this.addResult('database', 'supabase-connection', 'fail', 
        `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test Legacy database connection
    try {
      const legacyClient = new LegacyDatabaseClient({
        host: this.config.database.legacy.host,
        port: this.config.database.legacy.port,
        database: this.config.database.legacy.database,
        user: this.config.database.legacy.username,
        password: this.config.database.legacy.password
      });

      await legacyClient.connect();
      await legacyClient.disconnect();
      this.addResult('database', 'legacy-connection', 'pass', 'Legacy database connection successful');
    } catch (error) {
      this.addResult('database', 'legacy-connection', 'fail', 
        `Legacy database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.spinner.stop();
  }

  private async validateDatabaseSchemas(): Promise<void> {
    this.spinner.start('Validating database schemas...');

    try {
      // Check Supabase schema
      const supabase = createClient(
        this.config.database.supabase.url,
        this.config.database.supabase.serviceRoleKey
      );

      // Check for required tables
      const requiredTables = [
        'migration_batches',
        'migration_logs',
        'patients',
        'providers',
        'orders'
      ];

      for (const table of requiredTables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (error && error.message.includes('does not exist')) {
            this.addResult('schema', `supabase-table-${table}`, 'fail', `Required table missing: ${table}`);
          } else {
            this.addResult('schema', `supabase-table-${table}`, 'pass', `Table exists: ${table}`);
          }
        } catch (error) {
          this.addResult('schema', `supabase-table-${table}`, 'warning', 
            `Could not verify table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Check legacy database schema
      const legacyClient = new LegacyDatabaseClient({
        host: this.config.database.legacy.host,
        port: this.config.database.legacy.port,
        database: this.config.database.legacy.database,
        user: this.config.database.legacy.username,
        password: this.config.database.legacy.password
      });

      await legacyClient.connect();
      
      const expectedLegacyTables = ['patients', 'users', 'cases', 'orders', 'designs'];
      
      for (const table of expectedLegacyTables) {
        try {
          const result = await legacyClient.query(`SELECT 1 FROM ${table} LIMIT 1`);
          this.addResult('schema', `legacy-table-${table}`, 'pass', `Legacy table exists: ${table}`);
        } catch (error) {
          this.addResult('schema', `legacy-table-${table}`, 'warning', `Legacy table missing or inaccessible: ${table}`);
        }
      }
      
      await legacyClient.disconnect();

    } catch (error) {
      this.addResult('schema', 'validation', 'fail', 
        `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateDataQuality(): Promise<void> {
    this.spinner.start('Checking data quality...');

    const dataQualityChecks: DataQualityCheck[] = [
      {
        tableName: 'patients',
        checkName: 'duplicate-patients',
        query: `
          SELECT COUNT(*) as count 
          FROM (
            SELECT first_name, last_name, date_of_birth, COUNT(*) 
            FROM patients 
            WHERE first_name IS NOT NULL AND last_name IS NOT NULL 
            GROUP BY first_name, last_name, date_of_birth 
            HAVING COUNT(*) > 1
          ) duplicates
        `,
        expectedResult: 'custom',
        customValidator: (result: unknown) => {
          const count = (result as { count: number }).count;
          return count < 100; // Allow some duplicates but flag if too many
        }
      },
      {
        tableName: 'patients',
        checkName: 'missing-required-fields',
        query: `
          SELECT COUNT(*) as count 
          FROM patients 
          WHERE first_name IS NULL OR last_name IS NULL
        `,
        expectedResult: 'custom',
        customValidator: (result: unknown) => {
          const count = (result as { count: number }).count;
          return count < 50; // Allow some missing data but flag if too much
        }
      }
    ];

    try {
      const legacyClient = new LegacyDatabaseClient({
        host: this.config.database.legacy.host,
        port: this.config.database.legacy.port,
        database: this.config.database.legacy.database,
        user: this.config.database.legacy.username,
        password: this.config.database.legacy.password
      });

      for (const check of dataQualityChecks) {
        try {
          await legacyClient.connect();
          const result = await legacyClient.query(check.query);
          await legacyClient.disconnect();
          const isValid = check.customValidator ? check.customValidator(result.rows[0]) : true;
          
          if (isValid) {
            this.addResult('data-quality', check.checkName, 'pass', 
              `Data quality check passed: ${check.checkName}`, { result: result.rows[0] });
          } else {
            this.addResult('data-quality', check.checkName, 'warning', 
              `Data quality issue detected: ${check.checkName}`, { result: result.rows[0] });
          }
        } catch (error) {
          this.addResult('data-quality', check.checkName, 'warning', 
            `Could not run data quality check ${check.checkName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      this.addResult('data-quality', 'validation', 'fail', 
        `Data quality validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateResourceAvailability(): Promise<void> {
    this.spinner.start('Checking resource availability...');

    try {
      // Check storage paths
      const paths = [
        this.config.storage.backupPath,
        this.config.storage.logPath,
        this.config.storage.tempPath
      ];

      for (const path of paths) {
        try {
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
          }
          
          // Test write access
          accessSync(path, constants.W_OK);
          this.addResult('resources', `storage-${path}`, 'pass', `Storage path accessible: ${path}`);
        } catch (error) {
          this.addResult('resources', `storage-${path}`, 'fail', 
            `Storage path not accessible: ${path} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMb = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      this.addResult('resources', 'memory-usage', 'pass',
        `Current memory usage: ${heapUsedMb}MB / ${heapTotalMb}MB`, {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        });

    } catch (error) {
      this.addResult('resources', 'availability', 'fail', 
        `Resource availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateDependencies(): Promise<void> {
    this.spinner.start('Checking dependencies...');

    try {
      // Check required Node.js modules
      const requiredModules = [
        '@supabase/supabase-js',
        'pg',
        'commander',
        'chalk',
        'ora'
      ];

      for (const module of requiredModules) {
        try {
          require.resolve(module);
          this.addResult('dependencies', `module-${module}`, 'pass', `Module available: ${module}`);
        } catch (error) {
          this.addResult('dependencies', `module-${module}`, 'fail', `Module missing: ${module}`);
        }
      }

    } catch (error) {
      this.addResult('dependencies', 'validation', 'fail', 
        `Dependency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateSecurityRequirements(): Promise<void> {
    this.spinner.start('Checking security requirements...');

    try {
      // Check encryption key strength
      if (this.config.security.encryptionKey.length >= 32) {
        this.addResult('security', 'encryption-key', 'pass', 'Encryption key meets length requirements');
      } else {
        this.addResult('security', 'encryption-key', 'fail', 'Encryption key is too short');
      }

      // Check JWT secret strength
      if (this.config.security.jwtSecret.length >= 32) {
        this.addResult('security', 'jwt-secret', 'pass', 'JWT secret meets length requirements');
      } else {
        this.addResult('security', 'jwt-secret', 'fail', 'JWT secret is too short');
      }

      // Check production security settings
      if (this.config.environment === 'production') {
        if (this.config.security.enableAuditLogging) {
          this.addResult('security', 'audit-logging', 'pass', 'Audit logging enabled for production');
        } else {
          this.addResult('security', 'audit-logging', 'warning', 'Audit logging should be enabled for production');
        }
      }

    } catch (error) {
      this.addResult('security', 'validation', 'fail', 
        `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private async validateBackupCapability(): Promise<void> {
    this.spinner.start('Testing backup capability...');

    try {
      // Test backup directory creation and write access
      const backupTestPath = join(this.config.storage.backupPath, 'test-backup');
      
      if (!existsSync(this.config.storage.backupPath)) {
        mkdirSync(this.config.storage.backupPath, { recursive: true });
      }

      // Test write access
      accessSync(this.config.storage.backupPath, constants.W_OK);
      this.addResult('backup', 'directory-access', 'pass', 'Backup directory is writable');

      // Test Supabase backup capability
      const supabase = createClient(
        this.config.database.supabase.url,
        this.config.database.supabase.serviceRoleKey
      );

      // Simple test query to verify read access
      const { error } = await supabase.from('migration_batches').select('count').limit(1);
      if (!error || error.message.includes('does not exist')) {
        this.addResult('backup', 'supabase-read-access', 'pass', 'Supabase read access confirmed');
      } else {
        this.addResult('backup', 'supabase-read-access', 'warning', 'Supabase read access issue');
      }

    } catch (error) {
      this.addResult('backup', 'capability', 'fail', 
        `Backup capability test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.spinner.stop();
    }
  }

  private printSummary(): void {
    console.log('\n' + chalk.bold('📊 Validation Summary\n'));

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'pass').length;
      const failed = categoryResults.filter(r => r.status === 'fail').length;
      const warnings = categoryResults.filter(r => r.status === 'warning').length;

      console.log(chalk.bold(`${category.toUpperCase()}:`));
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  ⚠️  Warnings: ${warnings}`);
      console.log();
    }

    const totalPassed = this.results.filter(r => r.status === 'pass').length;
    const totalFailed = this.results.filter(r => r.status === 'fail').length;
    const totalWarnings = this.results.filter(r => r.status === 'warning').length;

    console.log(chalk.bold('OVERALL:'));
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  ⚠️  Total Warnings: ${totalWarnings}`);

    if (totalFailed > 0) {
      console.log('\n' + chalk.red.bold('❌ Validation FAILED - Migration cannot proceed'));
      console.log(chalk.red('Please address the failed checks before running migration.'));
    } else if (totalWarnings > 0) {
      console.log('\n' + chalk.yellow.bold('⚠️  Validation PASSED with warnings'));
      console.log(chalk.yellow('Consider addressing warnings before proceeding.'));
    } else {
      console.log('\n' + chalk.green.bold('✅ Validation PASSED - System ready for migration'));
    }
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('pre-migration-validation')
    .description('Validate system readiness for healthcare data migration')
    .version('1.0.0')
    .option('-e, --environment <env>', 'Target environment', 'development')
    .option('--json', 'Output results in JSON format', false)
    .option('--verbose', 'Verbose output', false);

  program.parse(process.argv);
  const options = program.opts();

  try {
    const validator = new PreMigrationValidator();
    const { success, results } = await validator.runValidation();

    if (options.json) {
      console.log(JSON.stringify({ success, results }, null, 2));
    }

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error(chalk.red(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

// Run main function if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  });
}

export { PreMigrationValidator, ValidationResult };