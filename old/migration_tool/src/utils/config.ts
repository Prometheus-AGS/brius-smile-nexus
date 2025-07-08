import { config as dotenvConfig } from '../../$node_modules/dotenv/lib/main.js';
import { resolve } from 'path';

// Load environment variables
dotenvConfig({ path: resolve(__dirname, '../../.env') });

/**
 * Configuration interface for the migration tool
 */
export interface MigrationConfig {
  // Database connections
  legacy: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  // OpenAI configuration
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  // Migration settings
  migration: {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    timeoutMs: number;
    enableAiEmbeddings: boolean;
    enableDeduplication: boolean;
  };
  // Logging configuration
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    logDir: string;
  };
  // AWS Configuration
  aws: {
     accessKeyId: string;
     secretAccessKey: string;
     region: string;
    bedrock: {
      region: string;
   };
 };
 dify: {
   baseUrl: string;
   apiKey: string;
   enabled: boolean;
   retryAttempts: number;
   timeoutMs: number;
   knowledgeBases: {
     cases: string;
     patients: string;
     notes: string;
   };
 };
}

/**
 * Validates required environment variables
 */
function validateEnvironment(): void {
  const required = [
    'LEGACY_DB_HOST',
    'LEGACY_DB_PORT',
    'LEGACY_DB_NAME',
    'LEGACY_DB_USER',
    'LEGACY_DB_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'AWS_BEDROCK_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'DIFY_BASE_URL',
    'DIFY_KNOWLEDGE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Creates and validates the migration configuration
 */
export function createConfig(): MigrationConfig {
  validateEnvironment();

  return {
    legacy: {
      host: process.env['LEGACY_DB_HOST']!,
      port: parseInt(process.env['LEGACY_DB_PORT'] || '5432', 10),
      database: process.env['LEGACY_DB_NAME']!,
      username: process.env['LEGACY_DB_USER']!,
      password: process.env['LEGACY_DB_PASSWORD']!,
      ssl: process.env['LEGACY_DB_SSL'] === 'true'
    },
    supabase: {
      url: process.env['SUPABASE_URL']!,
      anonKey: process.env['SUPABASE_ANON_KEY']!,
      serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY']!
    },
    openai: {
      apiKey: process.env['OPENAI_API_KEY']!,
      model: process.env['OPENAI_MODEL'] || 'text-embedding-ada-002',
      maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '8000', 10),
      temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] || '0.1')
    },
    migration: {
      batchSize: parseInt(process.env['MIGRATION_BATCH_SIZE'] || '100', 10),
      maxRetries: parseInt(process.env['MIGRATION_MAX_RETRIES'] || '3', 10),
      retryDelay: parseInt(process.env['MIGRATION_RETRY_DELAY'] || '1000', 10),
      timeoutMs: parseInt(process.env['MIGRATION_TIMEOUT_MS'] || '300000', 10),
      enableAiEmbeddings: process.env['MIGRATION_ENABLE_AI_EMBEDDINGS'] !== 'false',
      enableDeduplication: process.env['MIGRATION_ENABLE_DEDUPLICATION'] !== 'false'
    },
    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      enableConsole: process.env['LOG_ENABLE_CONSOLE'] !== 'false',
      enableFile: process.env['LOG_ENABLE_FILE'] !== 'false',
      logDir: process.env['LOG_DIR'] || './logs'
    },
    aws: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
        region: process.env['AWS_BEDROCK_REGION']!,
        bedrock: {
            region: process.env['AWS_BEDROCK_REGION']!,
        },
     },
    dify: {
      baseUrl: process.env['DIFY_BASE_URL']!,
      apiKey: process.env['DIFY_KNOWLEDGE_API_KEY']!,
      enabled: process.env['DIFY_ENABLED'] !== 'false',
      retryAttempts: parseInt(process.env['DIFY_RETRY_ATTEMPTS'] || '3', 10),
      timeoutMs: parseInt(process.env['DIFY_TIMEOUT_MS'] || '30000', 10),
      knowledgeBases: {
        cases: process.env['DIFY_KNOWLEDGE_BASE_CASES'] || 'cases_knowledge_base',
        patients: process.env['DIFY_KNOWLEDGE_BASE_PATIENTS'] || 'patients_knowledge_base',
        notes: process.env['DIFY_KNOWLEDGE_BASE_NOTES'] || 'notes_knowledge_base'
      }
    },
  };
}

/**
 * Global configuration instance
 */
export const config = createConfig();