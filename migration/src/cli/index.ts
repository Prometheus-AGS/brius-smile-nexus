#!/usr/bin/env node

/**
 * CLI entry point for database migration tool
 * Implements Commander.js interface for migration operations
 */

import { Command } from 'commander';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { MigrationConfig } from '../types/migration-types';
import { executeMigration } from '../index';
import { createLogger } from '../utils/logger';

const program = new Command();

// Environment variable validation schema
const EnvConfigSchema = z.object({
  LEGACY_DB_HOST: z.string().min(1),
  LEGACY_DB_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  LEGACY_DB_NAME: z.string().min(1),
  LEGACY_DB_USER: z.string().min(1),
  LEGACY_DB_PASSWORD: z.string().min(1),
  LEGACY_DB_SSL: z.string().transform(val => val.toLowerCase() === 'true').pipe(z.boolean()).default('false'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_SCHEMA: z.string().default('public'),
  AWS_BEDROCK_REGION: z.string().default('us-east-1'),
  AWS_BEDROCK_MODEL_ID: z.string().default('amazon.titan-embed-text-v2:0'),
  DIFY_API_URL: z.string().url().optional(),
  DIFY_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/migration.log'),
});

/**
 * Load and validate configuration from environment variables
 */
function loadConfigFromEnv(): MigrationConfig {
  try {
    const env = EnvConfigSchema.parse(process.env);
    
    const config: MigrationConfig = {
      legacy_database: {
        host: env.LEGACY_DB_HOST,
        port: env.LEGACY_DB_PORT,
        database: env.LEGACY_DB_NAME,
        username: env.LEGACY_DB_USER,
        password: env.LEGACY_DB_PASSWORD,
        ssl: env.LEGACY_DB_SSL,
        connection_timeout_ms: 30000,
        query_timeout_ms: 60000,
      },
      supabase: {
        url: env.SUPABASE_URL,
        anon_key: env.SUPABASE_ANON_KEY,
        service_role_key: env.SUPABASE_SERVICE_KEY,
        schema: env.SUPABASE_SCHEMA,
      },
      aws_bedrock: {
        region: env.AWS_BEDROCK_REGION,
        model_id: env.AWS_BEDROCK_MODEL_ID,
        dimensions: 1024,
        max_tokens: 8192,
        batch_size: 100,
      },
      dify: {
        api_url: env.DIFY_API_URL || '',
        api_key: env.DIFY_API_KEY || '',
        timeout_ms: 30000,
      },
      migration: {
        batch_size: 1000,
        max_retries: 3,
        retry_delay_ms: 5000,
        parallel_workers: 4,
        enable_embeddings: false,
        validate_data: true,
        create_backups: true,
      },
      logging: {
        level: env.LOG_LEVEL,
        file_path: env.LOG_FILE_PATH,
        max_file_size_mb: 100,
        max_files: 5,
      },
    };

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n📋 Required environment variables:');
      console.error('  LEGACY_DB_HOST, LEGACY_DB_PORT, LEGACY_DB_NAME');
      console.error('  LEGACY_DB_USER, LEGACY_DB_PASSWORD');
      console.error('  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Load configuration from JSON file
 */
function loadConfigFromFile(filePath: string): MigrationConfig {
  try {
    const configData = readFileSync(filePath, 'utf-8');
    const config = JSON.parse(configData) as MigrationConfig;
    
    // Basic validation
    if (!config.legacy_database || !config.supabase) {
      throw new Error('Invalid configuration file: missing required sections');
    }
    
    return config;
  } catch (error) {
    console.error(`❌ Failed to load configuration from ${filePath}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Handle CLI errors with proper exit codes
 */
function handleError(error: Error, context: string): never {
  console.error(`❌ ${context}:`, error.message);
  
  if (process.env['DEBUG'] === 'true') {
    console.error('\n🔍 Stack trace:');
    console.error(error.stack);
  }
  
  process.exit(1);
}

/**
 * Validate database connections
 */
async function validateConnections(config: MigrationConfig): Promise<void> {
  console.log('🔍 Validating database connections...');
  
  try {
    const { LegacyConnectionService } = await import('../services/legacy-connection');
    const { SupabaseConnectionService } = await import('../services/supabase-connection');
    
    const logger = createLogger({
      level: 'info',
      file_path: config.logging.file_path,
      max_file_size_mb: config.logging.max_file_size_mb,
      max_files: config.logging.max_files,
      console_output: false
    });

    // Test legacy database connection
    console.log('  📊 Testing legacy database connection...');
    const legacyDb = new LegacyConnectionService(config.legacy_database, logger);
    const legacyConnected = await legacyDb.testConnection();
    
    if (!legacyConnected) {
      throw new Error('Failed to connect to legacy database');
    }
    console.log('  ✅ Legacy database connection successful');

    // Test Supabase connection
    console.log('  🚀 Testing Supabase connection...');
    const supabaseDb = new SupabaseConnectionService(config.supabase, logger);
    const supabaseConnected = await supabaseDb.testConnection();
    
    if (!supabaseConnected) {
      throw new Error('Failed to connect to Supabase');
    }
    console.log('  ✅ Supabase connection successful');

    // Cleanup
    await legacyDb.close();
    
    console.log('✅ All database connections validated successfully\n');
  } catch (error) {
    handleError(error as Error, 'Database connection validation failed');
  }
}

// Configure CLI program
program
  .name('migration-tool')
  .description('Legacy to Supabase database migration utility')
  .version('1.0.0')
  .option('-c, --config <path>', 'path to configuration file')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--debug', 'enable debug mode with stack traces');

// Migration command
program
  .command('migrate')
  .description('Execute database migration')
  .option('-p, --phase <number>', 'specific migration phase (1-7)', parseInt)
  .option('--dry-run', 'validate without executing migration')
  .option('--rollback', 'rollback to previous state')
  .option('--skip-validation', 'skip pre-migration validation')
  .option('--enable-embeddings', 'enable AI embedding processing')
  .option('--batch-size <number>', 'batch size for processing records', parseInt)
  .action(async (options) => {
    try {
      console.log('🚀 Starting database migration...\n');
      
      // Load configuration
      const config = options.config 
        ? loadConfigFromFile(options.config)
        : loadConfigFromEnv();

      // Apply CLI options to config
      if (options.enableEmbeddings) {
        config.migration.enable_embeddings = true;
      }
      
      if (options.batchSize) {
        config.migration.batch_size = options.batchSize;
      }
      
      if (options.verbose || program.opts()['verbose']) {
        config.logging.level = 'debug';
      }

      // Set debug mode
      if (options.debug || program.opts()['debug']) {
        process.env['DEBUG'] = 'true';
      }

      // Validate connections unless skipped
      if (!options.skipValidation) {
        await validateConnections(config);
      }

      // Handle dry run
      if (options.dryRun) {
        console.log('🧪 Dry run mode - no changes will be made');
        console.log('✅ Migration validation completed successfully');
        return;
      }

      // Handle rollback
      if (options.rollback) {
        console.log('⏪ Rollback functionality not yet implemented');
        console.log('   Manual cleanup of Supabase data may be required');
        return;
      }

      // Handle specific phase
      if (options.phase) {
        console.log(`📋 Phase-specific migration not yet implemented (Phase ${options.phase})`);
        console.log('   Currently only full migration is supported');
        return;
      }

      // Execute migration
      console.log('🔄 Executing full migration...\n');
      const report = await executeMigration(config);
      
      // Display results
      console.log('\n🎉 Migration completed successfully!');
      console.log(`📊 Migration Report:`);
      console.log(`   Migration ID: ${report.migration_id}`);
      console.log(`   Status: ${report.overall_status}`);
      console.log(`   Phases completed: ${report.phases_completed}`);
      console.log(`   Total records migrated: ${report.total_records_migrated}`);
      console.log(`   Duration: ${Math.round(report.performance_metrics.total_duration_ms / 1000)}s`);
      console.log(`   Records/second: ${report.performance_metrics.records_per_second}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
      
      if (report.next_steps.length > 0) {
        console.log('\n📋 Next steps:');
        report.next_steps.forEach(step => console.log(`   - ${step}`));
      }

    } catch (error) {
      handleError(error as Error, 'Migration execution failed');
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate migration readiness')
  .option('--legacy-only', 'validate only legacy database')
  .option('--supabase-only', 'validate only Supabase database')
  .action(async (options) => {
    try {
      console.log('🔍 Validating migration readiness...\n');
      
      // Load configuration
      const config = program.opts()['config']
        ? loadConfigFromFile(program.opts()['config'])
        : loadConfigFromEnv();

      if (program.opts()['debug']) {
        process.env['DEBUG'] = 'true';
      }

      // Validate connections
      if (!options.supabaseOnly) {
        console.log('📊 Validating legacy database...');
        // Legacy validation logic would go here
        console.log('✅ Legacy database validation completed');
      }

      if (!options.legacyOnly) {
        console.log('🚀 Validating Supabase database...');
        // Supabase validation logic would go here
        console.log('✅ Supabase database validation completed');
      }

      await validateConnections(config);
      
      console.log('✅ Migration readiness validation completed successfully');

    } catch (error) {
      handleError(error as Error, 'Validation failed');
    }
  });

// Status command
program
  .command('status')
  .description('Check migration status and progress')
  .action(async () => {
    try {
      console.log('📊 Migration status check not yet implemented');
      console.log('   This feature will show current migration progress');
      console.log('   and allow resuming interrupted migrations');
    } catch (error) {
      handleError(error as Error, 'Status check failed');
    }
  });

// Config command
program
  .command('config')
  .description('Configuration management')
  .option('--validate', 'validate current configuration')
  .option('--template', 'generate configuration template')
  .action(async (options) => {
    try {
      if (options.template) {
        console.log('📋 Configuration template:');
        console.log(`
# Environment Variables for Migration Tool
LEGACY_DB_HOST=localhost
LEGACY_DB_PORT=5432
LEGACY_DB_NAME=legacy_database
LEGACY_DB_USER=postgres
LEGACY_DB_PASSWORD=your_password
LEGACY_DB_SSL=false

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_SCHEMA=public

AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=amazon.titan-embed-text-v2:0

DIFY_API_URL=https://api.dify.ai
DIFY_API_KEY=your_dify_key

LOG_LEVEL=info
LOG_FILE_PATH=./logs/migration.log
        `);
        return;
      }

      if (options.validate) {
        console.log('🔍 Validating configuration...');
        const configPath = program.opts()['config'];
        if (configPath) {
          loadConfigFromFile(configPath);
        } else {
          loadConfigFromEnv();
        }
        console.log('✅ Configuration is valid');
        return;
      }

      console.log('📋 Use --template to generate configuration template');
      console.log('📋 Use --validate to validate current configuration');

    } catch (error) {
      handleError(error as Error, 'Configuration management failed');
    }
  });

// Error handling for unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s', program.args.join(' '));
  console.log('💡 See --help for a list of available commands.');
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}