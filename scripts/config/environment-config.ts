/**
 * Environment Configuration for Migration System
 * Manages environment-specific settings for database connections,
 * migration parameters, security, and monitoring
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment validation schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Legacy Database Configuration
  LEGACY_DB_HOST: z.string().default('localhost'),
  LEGACY_DB_PORT: z.string().regex(/^\d+$/, 'Port must be a number').default('5432'),
  LEGACY_DB_NAME: z.string().min(1, 'Database name is required'),
  LEGACY_DB_USER: z.string().min(1, 'Database user is required'),
  LEGACY_DB_PASSWORD: z.string().min(1, 'Database password is required'),
  LEGACY_DB_SSL: z.string().optional(),
  
  // Migration Configuration
  MIGRATION_BATCH_SIZE: z.string().regex(/^\d+$/, 'Batch size must be a number').default('1000'),
  MIGRATION_MAX_RETRIES: z.string().regex(/^\d+$/, 'Max retries must be a number').default('3'),
  MIGRATION_TIMEOUT_MS: z.string().regex(/^\d+$/, 'Timeout must be a number').default('300000'),
  MIGRATION_PARALLEL_WORKERS: z.string().regex(/^\d+$/, 'Parallel workers must be a number').default('1'),
  
  // Security Configuration
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // Monitoring Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_METRICS: z.string().regex(/^(true|false)$/, 'Must be true or false').default('true'),
  METRICS_PORT: z.string().regex(/^\d+$/, 'Port must be a number').default('9090'),
  
  // Storage Configuration
  BACKUP_STORAGE_PATH: z.string().default('./backups'),
  LOG_STORAGE_PATH: z.string().default('./logs'),
  TEMP_STORAGE_PATH: z.string().default('./temp'),
  
  // External Services
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, 'Port must be a number').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  NOTIFICATION_EMAIL: z.string().email().optional(),
  
  // Performance Tuning
  MAX_MEMORY_USAGE_MB: z.string().regex(/^\d+$/, 'Memory limit must be a number').default('2048'),
  CONNECTION_POOL_SIZE: z.string().regex(/^\d+$/, 'Pool size must be a number').default('10'),
  QUERY_TIMEOUT_MS: z.string().regex(/^\d+$/, 'Query timeout must be a number').default('30000'),
});

// Environment-specific configurations
export interface DatabaseConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  legacy: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    connectionPoolSize: number;
    queryTimeout: number;
  };
}

export interface MigrationParameters {
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  parallelWorkers: number;
  maxMemoryUsageMb: number;
}

export interface SecurityConfig {
  encryptionKey: string;
  jwtSecret: string;
  enableAuditLogging: boolean;
  requireTwoFactorAuth: boolean;
}

export interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  metricsPort: number;
  enableAlerts: boolean;
  notificationEmail?: string;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
}

export interface StorageConfig {
  backupPath: string;
  logPath: string;
  tempPath: string;
  retentionDays: number;
  compressionEnabled: boolean;
}

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  migration: MigrationParameters;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  storage: StorageConfig;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    const env = EnvironmentSchema.parse(process.env);
    
    const config: EnvironmentConfig = {
      environment: env.NODE_ENV,
      
      database: {
        supabase: {
          url: env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
        legacy: {
          host: env.LEGACY_DB_HOST,
          port: parseInt(env.LEGACY_DB_PORT),
          database: env.LEGACY_DB_NAME,
          username: env.LEGACY_DB_USER,
          password: env.LEGACY_DB_PASSWORD,
          ssl: env.LEGACY_DB_SSL === 'true',
          connectionPoolSize: parseInt(env.CONNECTION_POOL_SIZE),
          queryTimeout: parseInt(env.QUERY_TIMEOUT_MS),
        },
      },
      
      migration: {
        batchSize: parseInt(env.MIGRATION_BATCH_SIZE),
        maxRetries: parseInt(env.MIGRATION_MAX_RETRIES),
        timeoutMs: parseInt(env.MIGRATION_TIMEOUT_MS),
        parallelWorkers: parseInt(env.MIGRATION_PARALLEL_WORKERS),
        maxMemoryUsageMb: parseInt(env.MAX_MEMORY_USAGE_MB),
      },
      
      security: {
        encryptionKey: env.ENCRYPTION_KEY,
        jwtSecret: env.JWT_SECRET,
        enableAuditLogging: env.NODE_ENV === 'production',
        requireTwoFactorAuth: env.NODE_ENV === 'production',
      },
      
      monitoring: {
        logLevel: env.LOG_LEVEL,
        enableMetrics: env.ENABLE_METRICS === 'true',
        metricsPort: parseInt(env.METRICS_PORT),
        enableAlerts: env.NODE_ENV === 'production',
        notificationEmail: env.NOTIFICATION_EMAIL,
        smtpConfig: env.SMTP_HOST ? {
          host: env.SMTP_HOST,
          port: parseInt(env.SMTP_PORT || '587'),
          user: env.SMTP_USER || '',
          password: env.SMTP_PASSWORD || '',
        } : undefined,
      },
      
      storage: {
        backupPath: env.BACKUP_STORAGE_PATH,
        logPath: env.LOG_STORAGE_PATH,
        tempPath: env.TEMP_STORAGE_PATH,
        retentionDays: env.NODE_ENV === 'production' ? 90 : 30,
        compressionEnabled: env.NODE_ENV === 'production',
      },
    };
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get environment-specific database connection string
 */
export function getDatabaseConnectionString(config: DatabaseConfig): string {
  const { host, port, database, username, password, ssl } = config.legacy;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
}

/**
 * Validate environment readiness for migration
 */
export function validateEnvironmentReadiness(config: EnvironmentConfig): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check database configuration
  if (!config.database.supabase.url || !config.database.supabase.serviceRoleKey) {
    issues.push('Supabase configuration is incomplete');
  }
  
  if (!config.database.legacy.host || !config.database.legacy.database) {
    issues.push('Legacy database configuration is incomplete');
  }
  
  // Check security configuration for production
  if (config.environment === 'production') {
    if (config.security.encryptionKey.length < 32) {
      issues.push('Encryption key is too short for production');
    }
    
    if (config.security.jwtSecret.length < 32) {
      issues.push('JWT secret is too short for production');
    }
    
    if (!config.monitoring.notificationEmail) {
      issues.push('Notification email is required for production');
    }
  }
  
  // Check resource limits
  if (config.migration.maxMemoryUsageMb < 512) {
    issues.push('Memory limit is too low for migration operations');
  }
  
  if (config.migration.batchSize > 10000) {
    issues.push('Batch size is too large and may cause performance issues');
  }
  
  // Check storage paths
  const requiredPaths = [
    config.storage.backupPath,
    config.storage.logPath,
    config.storage.tempPath,
  ];
  
  for (const path of requiredPaths) {
    if (!path || path.trim() === '') {
      issues.push(`Storage path is not configured: ${path}`);
    }
  }
  
  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Get environment-specific migration thresholds
 */
export function getMigrationThresholds(environment: string): {
  maxRecordsPerBatch: number;
  maxConcurrentBatches: number;
  errorThresholdPercent: number;
  timeoutMultiplier: number;
} {
  switch (environment) {
    case 'production':
      return {
        maxRecordsPerBatch: 1000,
        maxConcurrentBatches: 2,
        errorThresholdPercent: 1,
        timeoutMultiplier: 2,
      };
    case 'staging':
      return {
        maxRecordsPerBatch: 2000,
        maxConcurrentBatches: 3,
        errorThresholdPercent: 5,
        timeoutMultiplier: 1.5,
      };
    default: // development
      return {
        maxRecordsPerBatch: 500,
        maxConcurrentBatches: 1,
        errorThresholdPercent: 10,
        timeoutMultiplier: 1,
      };
  }
}

/**
 * Create environment-specific logger configuration
 */
export function createLoggerConfig(config: MonitoringConfig): {
  level: string;
  format: string;
  transports: Array<{
    type: string;
    filename?: string;
    maxSize?: string;
    maxFiles?: number;
  }>;
} {
  const transports: Array<{
    type: string;
    filename?: string;
    maxSize?: string;
    maxFiles?: number;
  }> = [
    {
      type: 'console',
    },
  ];
  
  if (config.logLevel !== 'debug') {
    transports.push({
      type: 'file',
      filename: 'migration.log',
      maxSize: '10MB',
      maxFiles: 5,
    });
  }
  
  if (config.enableMetrics) {
    transports.push({
      type: 'file',
      filename: 'metrics.log',
      maxSize: '50MB',
      maxFiles: 10,
    });
  }
  
  return {
    level: config.logLevel,
    format: config.logLevel === 'debug' ? 'detailed' : 'simple',
    transports,
  };
}

// Export singleton instance
let environmentConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!environmentConfig) {
    environmentConfig = loadEnvironmentConfig();
  }
  return environmentConfig;
}

export function resetEnvironmentConfig(): void {
  environmentConfig = null;
}