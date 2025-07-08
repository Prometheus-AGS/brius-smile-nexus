#!/usr/bin/env ts-node

/**
 * Migration Execution Script
 * Command-line interface for healthcare data migration execution
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { MigrationEngine } from '../src/lib/migration-engine';
import { MigrationRegistry, ExtendedMigrationScript } from '../src/lib/migrations/migration-registry';
import {
  MigrationConfig,
  MigrationStatus,
  MigrationResult,
  MigrationBatch,
  MigrationError
} from '../src/types/migration';

interface ExecutionOptions {
  environment: string;
  config?: string;
  dryRun: boolean;
  interactive: boolean;
  batchSize?: number;
  maxRetries?: number;
  timeoutMs?: number;
  parallelWorkers?: number;
  skipValidation: boolean;
  continueOnError: boolean;
  rollbackOnFailure: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  outputFormat: 'console' | 'json' | 'csv';
  reportFile?: string;
}

interface MigrationPlan {
  scripts: string[];
  estimatedDuration: number;
  estimatedRecords: number;
  dependencies: Record<string, string[]>;
  risks: string[];
}

class MigrationExecutor {
  private migrationEngine: MigrationEngine;
  private migrationRegistry: MigrationRegistry;
  private options: ExecutionOptions;
  private logStream?: NodeJS.WritableStream;
  private startTime: Date;
  private results: Map<string, MigrationResult> = new Map();

  constructor(options: ExecutionOptions) {
    this.options = options;
    this.migrationEngine = new MigrationEngine();
    this.migrationRegistry = new MigrationRegistry();
    this.startTime = new Date();
    
    this.setupLogging();
  }

  private setupLogging(): void {
    if (this.options.reportFile) {
      const logDir = join(process.cwd(), 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
      
      this.logStream = createWriteStream(this.options.reportFile, { flags: 'a' });
    }
  }

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };

    // Console output
    if (this.shouldLog(level)) {
      const coloredMessage = this.colorizeMessage(level, message);
      console.log(`[${timestamp}] ${coloredMessage}`);
      
      if (data && this.options.logLevel === 'debug') {
        console.log(JSON.stringify(data, null, 2));
      }
    }

    // File output
    if (this.logStream) {
      this.logStream.write(JSON.stringify(logEntry) + '\n');
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.options.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private colorizeMessage(level: string, message: string): string {
    switch (level) {
      case 'error':
        return chalk.red(message);
      case 'warn':
        return chalk.yellow(message);
      case 'info':
        return chalk.blue(message);
      case 'debug':
        return chalk.gray(message);
      default:
        return message;
    }
  }

  async generateMigrationPlan(): Promise<MigrationPlan> {
    this.log('info', 'Generating migration plan...');
    
    const availableScripts = this.migrationRegistry.getScripts();
    const scriptIds = availableScripts.map(script => script.id);
    const dependencies: Record<string, string[]> = {};
    
    // Build dependencies map
    for (const script of availableScripts) {
      dependencies[script.id] = script.dependencies;
    }
    
    // Sort scripts by dependencies
    const sortedScripts = this.topologicalSort(scriptIds, dependencies);
    
    // Estimate duration and records
    let estimatedDuration = 0;
    let estimatedRecords = 0;
    const risks: string[] = [];
    
    for (const scriptId of sortedScripts) {
      const script = this.migrationRegistry.getScript(scriptId);
      if (script) {
        estimatedDuration += script.timeoutMs || 300000; // Default 5 minutes
        // Estimate records based on script type
        const recordEstimate = script.estimatedRecords || 10000;
        estimatedRecords += recordEstimate;
        
        // Identify risks
        if (recordEstimate > 100000) {
          risks.push(`Large dataset in ${script.name}: ${recordEstimate} records`);
        }
      }
    }
    
    return {
      scripts: sortedScripts,
      estimatedDuration,
      estimatedRecords,
      dependencies,
      risks
    };
  }

  private topologicalSort(scripts: string[], dependencies: Record<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (script: string): void => {
      if (visiting.has(script)) {
        throw new Error(`Circular dependency detected involving ${script}`);
      }
      
      if (visited.has(script)) {
        return;
      }
      
      visiting.add(script);
      
      const deps = dependencies[script] || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      visiting.delete(script);
      visited.add(script);
      result.push(script);
    };
    
    for (const script of scripts) {
      visit(script);
    }
    
    return result;
  }


  async validateMigrationPlan(plan: MigrationPlan): Promise<boolean> {
    this.log('info', 'Validating migration plan...');
    
    const spinner = ora('Running validation checks...').start();
    
    try {
      // Check script availability
      for (const scriptId of plan.scripts) {
        const script = this.migrationRegistry.getScript(scriptId);
        if (!script) {
          spinner.fail(`Script not found: ${scriptId}`);
          return false;
        }
      }
      
      // Validate dependencies using registry
      const validation = this.migrationRegistry.validateDependencies(plan.scripts);
      if (!validation.valid) {
        spinner.fail(`Dependency validation failed: ${validation.errors.join(', ')}`);
        return false;
      }
      
      // Check resource requirements
      if (plan.estimatedRecords > 1000000) {
        this.log('warn', `Large migration detected: ${plan.estimatedRecords} records`);
      }
      
      if (plan.estimatedDuration > 3600000) { // 1 hour
        this.log('warn', `Long migration detected: ${plan.estimatedDuration}ms estimated`);
      }
      
      spinner.succeed('Migration plan validation completed');
      return true;
    } catch (error) {
      spinner.fail(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async executeMigration(plan: MigrationPlan): Promise<boolean> {
    this.log('info', 'Starting migration execution...');
    
    const config: MigrationConfig = {
      batchSize: this.options.batchSize || 1000,
      maxRetries: this.options.maxRetries || 3,
      timeoutMs: this.options.timeoutMs || 300000,
      parallelWorkers: this.options.parallelWorkers || 1,
      dryRun: this.options.dryRun,
      skipValidation: this.options.skipValidation
    };
    
    let overallSuccess = true;
    const progressBar = ora('Initializing migration...').start();
    
    try {
      for (let i = 0; i < plan.scripts.length; i++) {
        const scriptId = plan.scripts[i];
        const script = this.migrationRegistry.getScript(scriptId);
        if (!script) {
          this.log('error', `Script not found: ${scriptId}`);
          overallSuccess = false;
          continue;
        }
        
        const progress = `(${i + 1}/${plan.scripts.length})`;
        
        progressBar.text = `Executing ${script.name} ${progress}`;
        
        try {
          const result = await this.executeScript(scriptId, config);
          this.results.set(scriptId, result);
          
          if (result.recordsFailed > 0) {
            this.log('warn', `Script ${script.name} completed with ${result.recordsFailed} failures`);
            
            if (!this.options.continueOnError) {
              progressBar.fail(`Migration stopped due to failures in ${script.name}`);
              overallSuccess = false;
              break;
            }
          } else {
            this.log('info', `Script ${script.name} completed successfully`);
          }
          
        } catch (error) {
          this.log('error', `Script ${script.name} failed`, { error: error instanceof Error ? error.message : 'Unknown error' });
          overallSuccess = false;
          
          if (this.options.rollbackOnFailure) {
            await this.rollbackScript(scriptId);
          }
          
          if (!this.options.continueOnError) {
            progressBar.fail(`Migration stopped due to error in ${script.name}`);
            break;
          }
        }
      }
      
      if (overallSuccess) {
        progressBar.succeed('Migration completed successfully');
      } else {
        progressBar.fail('Migration completed with errors');
      }
      
    } catch (error) {
      progressBar.fail(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      overallSuccess = false;
    }
    
    return overallSuccess;
  }

  private async executeScript(scriptId: string, config: MigrationConfig): Promise<MigrationResult> {
    const script = this.migrationRegistry.getScript(scriptId);
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }
    
    this.log('debug', `Executing script: ${script.name}`, { config });
    
    const startTime = Date.now();
    const result = await script.execute(config);
    const duration = Date.now() - startTime;
    
    this.log('info', `Script ${script.name} execution completed`, {
      duration,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed
    });
    
    return result;
  }

  private async rollbackScript(scriptId: string): Promise<void> {
    this.log('info', `Rolling back script: ${scriptId}`);
    
    const script = this.migrationRegistry.getScript(scriptId);
    if (!script) {
      this.log('error', `Cannot rollback: script not found: ${scriptId}`);
      return;
    }
    
    const result = this.results.get(scriptId);
    if (!result) {
      this.log('error', `Cannot rollback: no execution result for ${scriptId}`);
      return;
    }
    
    try {
      await script.rollback(result.batchId);
      this.log('info', `Rollback completed for script: ${script.name}`);
    } catch (error) {
      this.log('error', `Rollback failed for script: ${script.name}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateReport(): Promise<void> {
    this.log('info', 'Generating migration report...');
    
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();
    
    const report = {
      executionSummary: {
        startTime: this.startTime,
        endTime,
        totalDuration,
        scriptsExecuted: this.results.size,
        overallSuccess: Array.from(this.results.values()).every(r => r.recordsFailed === 0)
      },
      scriptResults: Array.from(this.results.entries()).map(([scriptId, result]) => {
        const script = this.migrationRegistry.getScript(scriptId);
        return {
          scriptId,
          scriptName: script?.name || scriptId,
          ...result
        };
      }),
      errors: Array.from(this.results.values()).flatMap(r => r.errors),
      performance: {
        totalRecordsProcessed: Array.from(this.results.values()).reduce((sum, r) => sum + r.recordsProcessed, 0),
        totalRecordsFailed: Array.from(this.results.values()).reduce((sum, r) => sum + r.recordsFailed, 0),
        averageRecordsPerSecond: this.calculateAverageRecordsPerSecond()
      }
    };
    
    switch (this.options.outputFormat) {
      case 'json':
        console.log(JSON.stringify(report, null, 2));
        break;
      case 'csv':
        this.outputCsvReport(report);
        break;
      default:
        this.outputConsoleReport(report);
        break;
    }
  }

  private calculateAverageRecordsPerSecond(): number {
    const totalRecords = Array.from(this.results.values()).reduce((sum, r) => sum + r.recordsProcessed, 0);
    const totalDurationSeconds = (new Date().getTime() - this.startTime.getTime()) / 1000;
    return totalDurationSeconds > 0 ? totalRecords / totalDurationSeconds : 0;
  }

  private outputConsoleReport(report: {
    executionSummary: {
      startTime: Date;
      endTime: Date;
      totalDuration: number;
      scriptsExecuted: number;
      overallSuccess: boolean;
    };
    scriptResults: Array<{
      scriptId: string;
      scriptName: string;
      recordsProcessed: number;
      recordsFailed: number;
      duration: number;
    }>;
    errors: MigrationError[];
    performance: {
      totalRecordsProcessed: number;
      totalRecordsFailed: number;
      averageRecordsPerSecond: number;
    };
  }): void {
    console.log('\n' + chalk.bold('=== Migration Execution Report ==='));
    console.log(`Start Time: ${report.executionSummary.startTime}`);
    console.log(`End Time: ${report.executionSummary.endTime}`);
    console.log(`Total Duration: ${report.executionSummary.totalDuration}ms`);
    console.log(`Scripts Executed: ${report.executionSummary.scriptsExecuted}`);
    console.log(`Overall Success: ${report.executionSummary.overallSuccess ? chalk.green('Yes') : chalk.red('No')}`);
    
    console.log('\n' + chalk.bold('Performance Metrics:'));
    console.log(`Total Records Processed: ${report.performance.totalRecordsProcessed}`);
    console.log(`Total Records Failed: ${report.performance.totalRecordsFailed}`);
    console.log(`Average Records/Second: ${report.performance.averageRecordsPerSecond.toFixed(2)}`);
    
    if (report.errors && Array.isArray(report.errors) && report.errors.length > 0) {
      console.log('\n' + chalk.bold.red('Errors:'));
      report.errors.forEach((error: MigrationError, index: number) => {
        console.log(`${index + 1}. ${error.message} (${error.severity})`);
      });
    }
  }

  private outputCsvReport(report: {
    scriptResults: Array<{
      scriptName: string;
      recordsProcessed: number;
      recordsFailed: number;
      duration: number;
    }>;
  }): void {
    // CSV output implementation
    console.log('Script,Records Processed,Records Failed,Duration,Status');
    report.scriptResults.forEach((result) => {
      console.log(`${result.scriptName},${result.recordsProcessed},${result.recordsFailed},${result.duration},${result.recordsFailed === 0 ? 'Success' : 'Failed'}`);
    });
  }

  async cleanup(): Promise<void> {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

async function promptForConfirmation(plan: MigrationPlan): Promise<boolean> {
  console.log('\n' + chalk.bold('Migration Plan Summary:'));
  console.log(`Scripts to execute: ${plan.scripts.length}`);
  console.log(`Estimated records: ${plan.estimatedRecords.toLocaleString()}`);
  console.log(`Estimated duration: ${Math.round(plan.estimatedDuration / 60000)} minutes`);
  
  if (plan.risks.length > 0) {
    console.log('\n' + chalk.bold.yellow('Risks identified:'));
    plan.risks.forEach(risk => console.log(`- ${risk}`));
  }
  
  // Simple readline-based confirmation instead of inquirer
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Do you want to proceed with this migration? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('execute-migration')
    .description('Execute healthcare data migration')
    .version('1.0.0')
    .requiredOption('-e, --environment <env>', 'Target environment (development|staging|production)')
    .option('-c, --config <file>', 'Configuration file path')
    .option('-d, --dry-run', 'Perform dry run without actual migration', false)
    .option('-i, --interactive', 'Interactive mode with confirmations', true)
    .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
    .option('-r, --max-retries <retries>', 'Maximum retry attempts', '3')
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', '300000')
    .option('-w, --parallel-workers <workers>', 'Number of parallel workers', '1')
    .option('--skip-validation', 'Skip pre-migration validation', false)
    .option('--continue-on-error', 'Continue execution on script errors', false)
    .option('--rollback-on-failure', 'Rollback on script failure', true)
    .option('--log-level <level>', 'Log level (debug|info|warn|error)', 'info')
    .option('--output-format <format>', 'Output format (console|json|csv)', 'console')
    .option('--report-file <file>', 'Report output file path');

  program.parse(process.argv);
  
  const options = program.opts() as ExecutionOptions;
  
  // Validate environment
  if (!['development', 'staging', 'production'].includes(options.environment)) {
    console.error(chalk.red('Invalid environment. Must be one of: development, staging, production'));
    process.exit(1);
  }
  
  // Set report file if not provided
  if (!options.reportFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.reportFile = `logs/migration-execution-${timestamp}.log`;
  }
  
  const executor = new MigrationExecutor(options);
  
  try {
    // Generate migration plan
    const plan = await executor.generateMigrationPlan();
    
    // Validate plan
    const isValid = await executor.validateMigrationPlan(plan);
    if (!isValid) {
      console.error(chalk.red('Migration plan validation failed'));
      process.exit(1);
    }
    
    // Interactive confirmation
    if (options.interactive && !options.dryRun) {
      const confirmed = await promptForConfirmation(plan);
      if (!confirmed) {
        console.log(chalk.yellow('Migration cancelled by user'));
        process.exit(0);
      }
    }
    
    // Execute migration
    const success = await executor.executeMigration(plan);
    
    // Generate report
    await executor.generateReport();
    
    // Cleanup
    await executor.cleanup();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error(chalk.red(`Migration execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    await executor.cleanup();
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nReceived SIGINT. Cleaning up...'));
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nReceived SIGTERM. Cleaning up...'));
  process.exit(1);
});

// Run main function if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  });
}

export { MigrationExecutor, ExecutionOptions, MigrationPlan };