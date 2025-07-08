import { Command } from '../../$node_modules/commander/typings/esm.d.mts';
import chalk from '../../$node_modules/chalk/source/index.js';
import { createComponentLogger } from './logger';

const logger = createComponentLogger('cli-parser');

/**
 * CLI command options interface
 */
export interface CliOptions {
  type: 'full' | 'incremental' | 'test';
  dryRun: boolean;
  limit?: number;
  verbose: boolean;
  logLevel: string;
  skipValidation: boolean;
  skipAiEmbeddings: boolean;
  skipDeduplication: boolean;
  skipDifyPopulation: boolean;
  batchSize?: number;
  continueOnError: boolean;
  // Granular entity skip flags
  skipPractices: boolean;
  skipProfiles: boolean;
  skipPatients: boolean;
  skipCases: boolean;
  skipPractitioners: boolean;
  skipPracticeMembers: boolean;
  skipOrders: boolean;
  skipPatientFlags: boolean;
  skipCaseFlags: boolean;
}

/**
 * Default CLI options
 */
const defaultOptions: CliOptions = {
  type: 'full',
  dryRun: false,
  verbose: false,
  logLevel: 'info',
  skipValidation: false,
  skipAiEmbeddings: false,
  skipDeduplication: false,
  skipDifyPopulation: false,
  continueOnError: false,
  // Granular entity skip flags - default to false (load all entities)
  skipPractices: false,
  skipProfiles: false,
  skipPatients: false,
  skipCases: false,
  skipPractitioners: false,
  skipPracticeMembers: false,
  skipOrders: false,
  skipPatientFlags: false,
  skipCaseFlags: false
};

/**
 * Creates and configures the CLI command parser
 */
export function createCliParser(): Command {
  const program = new Command();

  program
    .name('migration-tool')
    .description('Legacy Django MDW to Supabase migration tool')
    .version('1.0.0');

  program
    .option(
      '-t, --type <type>',
      'Migration type: full, incremental, or test',
      'full'
    )
    .option(
      '--dry-run',
      'Run migration in dry-run mode (no actual data changes)',
      false
    )
    .option(
      '-l, --limit <number>',
      'Limit number of records to migrate (useful for testing)',
      parseInt
    )
    .option(
      '-v, --verbose',
      'Enable verbose logging output',
      false
    )
    .option(
      '--log-level <level>',
      'Set logging level (error, warn, info, debug)',
      'info'
    )
    .option(
      '--skip-validation',
      'Skip data validation steps',
      false
    )
    .option(
      '--skip-ai-embeddings',
      'Skip AI embeddings generation',
      false
    )
    .option(
      '--skip-deduplication',
      'Skip patient deduplication process',
      false
    )
    .option(
       '--skip-dify-population',
       'Skip populating Dify knowledge bases',
       false
     )
    .option(
      '--batch-size <number>',
      'Override default batch size for processing',
      parseInt
    )
    .option(
      '--continue-on-error',
      'Continue migration even if individual records fail',
      false
    )
    // Granular entity skip flags for step-by-step loading
    .option(
      '--skip-practices',
      'Skip loading practices (foundation table)',
      false
    )
    .option(
      '--skip-profiles',
      'Skip loading profiles/users (foundation table)',
      false
    )
    .option(
      '--skip-patients',
      'Skip loading patients (primary entity table)',
      false
    )
    .option(
      '--skip-cases',
      'Skip loading cases (secondary entity table)',
      false
    )
    .option(
      '--skip-practitioners',
      'Skip loading practitioners (cross-reference table)',
      false
    )
    .option(
      '--skip-practice-members',
      'Skip loading practice members (cross-reference table)',
      false
    )
    .option(
      '--skip-orders',
      'Skip loading orders (tertiary entity table)',
      false
    )
    .option(
      '--skip-patient-flags',
      'Skip loading patient flags (secondary entity table)',
      false
    )
    .option(
      '--skip-case-flags',
      'Skip loading case flags (tertiary entity table)',
      false
    );

  return program;
}

/**
 * Parses and validates CLI arguments
 */
export function parseCliArguments(args: string[]): CliOptions {
  const program = createCliParser();
  
  try {
    program.parse(args);
    const options = program.opts();
    
    // Validate migration type
    if (!['full', 'incremental', 'test'].includes(options['type'])) {
      throw new Error(`Invalid migration type: ${options['type']}. Must be 'full', 'incremental', or 'test'.`);
    }
    
    // Validate log level
    if (!['error', 'warn', 'info', 'debug'].includes(options['logLevel'])) {
      throw new Error(`Invalid log level: ${options['logLevel']}. Must be 'error', 'warn', 'info', or 'debug'.`);
    }
    
    // Validate limit if provided
    if (options['limit'] !== undefined && (options['limit'] <= 0 || !Number.isInteger(options['limit']))) {
      throw new Error(`Invalid limit: ${options['limit']}. Must be a positive integer.`);
    }
    
    // Validate batch size if provided
    if (options['batchSize'] !== undefined && (options['batchSize'] <= 0 || !Number.isInteger(options['batchSize']))) {
      throw new Error(`Invalid batch size: ${options['batchSize']}. Must be a positive integer.`);
    }
    
    const parsedOptions: CliOptions = {
      ...defaultOptions,
      ...options
    };
    
    logger.info('CLI arguments parsed successfully', { options: parsedOptions });
    return parsedOptions;
    
  } catch (error) {
    logger.error('Failed to parse CLI arguments', { error });
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    program.help();
    process.exit(1);
  }
}

/**
 * Displays help information for the CLI
 */
export function displayHelp(): void {
  const program = createCliParser();
  program.help();
}

/**
 * Displays usage examples
 */
export function displayExamples(): void {
  console.log(chalk.blue('\nUsage Examples:\n'));
  
  console.log(chalk.green('Full migration:'));
  console.log('  yarn migrate:full');
  console.log('  tsx src/index.ts --type=full\n');
  
  console.log(chalk.green('Dry run (no actual changes):'));
  console.log('  yarn migrate:dry-run');
  console.log('  tsx src/index.ts --type=full --dry-run\n');
  
  console.log(chalk.green('Test migration with limited records:'));
  console.log('  yarn migrate:test');
  console.log('  tsx src/index.ts --type=test --limit=10\n');
  
  console.log(chalk.green('Incremental migration with custom batch size:'));
  console.log('  tsx src/index.ts --type=incremental --batch-size=50\n');
  
  console.log(chalk.green('Migration with verbose logging:'));
  console.log('  tsx src/index.ts --type=full --verbose --log-level=debug\n');
  
  console.log(chalk.green('Skip AI embeddings and deduplication:'));
  console.log('  tsx src/index.ts --type=full --skip-ai-embeddings --skip-deduplication\n');
  
  console.log(chalk.green('Step-by-step loading - Load only practices:'));
  console.log('  tsx src/index.ts --type=full --skip-profiles --skip-patients --skip-cases\n');
  
  console.log(chalk.green('Step-by-step loading - Load practices and profiles only:'));
  console.log('  tsx src/index.ts --type=full --skip-patients --skip-cases --skip-practitioners\n');
  
  console.log(chalk.green('Focus on completing profiles migration:'));
  console.log('  tsx src/index.ts --type=full --skip-practices --skip-patients --skip-cases\n');
}

/**
 * Validates environment and configuration before migration
 */
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'LEGACY_DB_HOST',
    'LEGACY_DB_PORT',
    'LEGACY_DB_NAME',
    'LEGACY_DB_USER',
    'LEGACY_DB_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(chalk.red('Error: Missing required environment variables:'));
    missingVars.forEach(varName => {
      console.error(chalk.red(`  - ${varName}`));
    });
    console.error(chalk.yellow('\nPlease check your .env file and ensure all required variables are set.'));
    process.exit(1);
  }
  
  logger.info('Environment validation passed');
}