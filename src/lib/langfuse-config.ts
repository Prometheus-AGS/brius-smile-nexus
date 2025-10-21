/**
 * Langfuse Configuration Service
 * 
 * Handles environment variable validation and configuration management
 * for Vite-compatible Langfuse integration with comprehensive error handling.
 */

import { z } from 'zod';
import { 
  LangfuseEnvSchema, 
  type LangfuseEnvConfig, 
  type LangfuseConfig 
} from '../types/langfuse';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default configuration values for Langfuse
 */
const DEFAULT_CONFIG: Partial<LangfuseConfig> = {
  enabled: true,
  debug: false,
  flushInterval: 1000,
  batchSize: 10,
};

/**
 * Environment variable keys for Vite compatibility
 */
const ENV_KEYS = {
  BASE_URL: 'VITE_LANGFUSE_BASE_URL',
  PUBLIC_KEY: 'VITE_LANGFUSE_PUBLIC_KEY',
  SECRET_KEY: 'VITE_LANGFUSE_SECRET_KEY',
  HOST: 'VITE_LANGFUSE_HOST',
  ENABLED: 'VITE_LANGFUSE_ENABLED',
  DEBUG: 'VITE_LANGFUSE_DEBUG',
  FLUSH_INTERVAL: 'VITE_LANGFUSE_FLUSH_INTERVAL',
  BATCH_SIZE: 'VITE_LANGFUSE_BATCH_SIZE',
} as const;

// ============================================================================
// Configuration Error Classes
// ============================================================================

/**
 * Base error class for Langfuse configuration errors
 */
export class LangfuseConfigError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'LangfuseConfigError';
  }
}

/**
 * Error thrown when required environment variables are missing
 */
export class MissingEnvironmentVariableError extends LangfuseConfigError {
  constructor(variableName: string) {
    super(`Missing required environment variable: ${variableName}`);
    this.name = 'MissingEnvironmentVariableError';
  }
}

/**
 * Error thrown when environment variables have invalid values
 */
export class InvalidEnvironmentVariableError extends LangfuseConfigError {
  constructor(variableName: string, value: string, expectedFormat: string) {
    super(`Invalid value for environment variable ${variableName}: "${value}". Expected: ${expectedFormat}`);
    this.name = 'InvalidEnvironmentVariableError';
  }
}

// ============================================================================
// Environment Variable Utilities
// ============================================================================

/**
 * Safely gets an environment variable with optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  try {
    // In Vite, environment variables are available on import.meta.env
    const value = import.meta.env[key];
    return value !== undefined ? String(value) : defaultValue;
  } catch (error) {
    console.warn(`Failed to access environment variable ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Gets a required environment variable, throwing an error if missing
 */
function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (!value) {
    throw new MissingEnvironmentVariableError(key);
  }
  return value;
}

/**
 * Converts string environment variable to boolean
 */
function envVarToBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  
  const normalizedValue = value.toLowerCase().trim();
  
  if (['true', '1', 'yes', 'on', 'enabled'].includes(normalizedValue)) {
    return true;
  }
  
  if (['false', '0', 'no', 'off', 'disabled'].includes(normalizedValue)) {
    return false;
  }
  
  return defaultValue;
}

/**
 * Converts string environment variable to number
 */
function envVarToNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return defaultValue;
  }
  
  return numValue;
}

/**
 * Validates URL format
 */
function validateUrl(url: string, variableName: string): string {
  try {
    new URL(url);
    return url;
  } catch (error) {
    throw new InvalidEnvironmentVariableError(
      variableName,
      url,
      'a valid URL (e.g., https://example.com)'
    );
  }
}

/**
 * Validates Langfuse key format
 */
function validateLangfuseKey(key: string, variableName: string, expectedPrefix: string): string {
  if (!key.startsWith(expectedPrefix)) {
    throw new InvalidEnvironmentVariableError(
      variableName,
      key,
      `a key starting with "${expectedPrefix}"`
    );
  }
  
  if (key.length < expectedPrefix.length + 10) {
    throw new InvalidEnvironmentVariableError(
      variableName,
      key,
      `a key with at least 10 characters after the "${expectedPrefix}" prefix`
    );
  }
  
  return key;
}

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Loads and validates environment variables for Langfuse configuration
 */
function loadEnvironmentConfig(): LangfuseEnvConfig {
  const envConfig = {
    VITE_LANGFUSE_BASE_URL: getEnvVar(ENV_KEYS.BASE_URL),
    VITE_LANGFUSE_PUBLIC_KEY: getEnvVar(ENV_KEYS.PUBLIC_KEY),
    VITE_LANGFUSE_SECRET_KEY: getEnvVar(ENV_KEYS.SECRET_KEY),
    VITE_LANGFUSE_HOST: getEnvVar(ENV_KEYS.HOST),
    VITE_LANGFUSE_ENABLED: getEnvVar(ENV_KEYS.ENABLED),
    VITE_LANGFUSE_DEBUG: getEnvVar(ENV_KEYS.DEBUG),
    VITE_LANGFUSE_FLUSH_INTERVAL: getEnvVar(ENV_KEYS.FLUSH_INTERVAL),
    VITE_LANGFUSE_BATCH_SIZE: getEnvVar(ENV_KEYS.BATCH_SIZE),
  };

  try {
    return LangfuseEnvSchema.parse(envConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as { issues?: Array<{ code: string; received?: string; path: string[]; message: string }> };
      const issues = zodError.issues || [];
      
      const missingFields = issues
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));
      
      if (missingFields.length > 0) {
        throw new MissingEnvironmentVariableError(missingFields.join(', '));
      }
      
      const invalidFields = issues
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      
      throw new LangfuseConfigError(`Invalid environment configuration: ${invalidFields}`);
    }
    
    throw new LangfuseConfigError('Failed to validate environment configuration', error as Error);
  }
}

/**
 * Processes and validates environment configuration into typed config
 */
function processEnvironmentConfig(envConfig: LangfuseEnvConfig): LangfuseConfig {
  try {
    const baseUrl = validateUrl(envConfig.VITE_LANGFUSE_BASE_URL, ENV_KEYS.BASE_URL);
    const host = validateUrl(envConfig.VITE_LANGFUSE_HOST, ENV_KEYS.HOST);
    const publicKey = validateLangfuseKey(envConfig.VITE_LANGFUSE_PUBLIC_KEY, ENV_KEYS.PUBLIC_KEY, 'pk-lf-');
    const secretKey = validateLangfuseKey(envConfig.VITE_LANGFUSE_SECRET_KEY, ENV_KEYS.SECRET_KEY, 'sk-lf-');
    
    const enabled = envVarToBoolean(envConfig.VITE_LANGFUSE_ENABLED, DEFAULT_CONFIG.enabled!);
    const debug = envVarToBoolean(envConfig.VITE_LANGFUSE_DEBUG, DEFAULT_CONFIG.debug!);
    const flushInterval = envVarToNumber(envConfig.VITE_LANGFUSE_FLUSH_INTERVAL, DEFAULT_CONFIG.flushInterval!);
    const batchSize = envVarToNumber(envConfig.VITE_LANGFUSE_BATCH_SIZE, DEFAULT_CONFIG.batchSize!);
    
    // Validate numeric ranges
    if (flushInterval < 100 || flushInterval > 60000) {
      throw new InvalidEnvironmentVariableError(
        ENV_KEYS.FLUSH_INTERVAL,
        String(flushInterval),
        'a number between 100 and 60000 (milliseconds)'
      );
    }
    
    if (batchSize < 1 || batchSize > 100) {
      throw new InvalidEnvironmentVariableError(
        ENV_KEYS.BATCH_SIZE,
        String(batchSize),
        'a number between 1 and 100'
      );
    }
    
    return {
      baseUrl,
      publicKey,
      secretKey,
      host,
      enabled,
      debug,
      flushInterval,
      batchSize,
    };
  } catch (error) {
    if (error instanceof LangfuseConfigError) {
      throw error;
    }
    
    throw new LangfuseConfigError('Failed to process environment configuration', error as Error);
  }
}

// ============================================================================
// Configuration Service
// ============================================================================

/**
 * Langfuse configuration service for managing environment-based configuration
 */
export class LangfuseConfigService {
  private static instance: LangfuseConfigService | null = null;
  private config: LangfuseConfig | null = null;
  private initializationError: Error | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Gets the singleton instance of the configuration service
   */
  public static getInstance(): LangfuseConfigService {
    if (!LangfuseConfigService.instance) {
      LangfuseConfigService.instance = new LangfuseConfigService();
    }
    return LangfuseConfigService.instance;
  }

  /**
   * Initializes the configuration by loading and validating environment variables
   */
  public initialize(): void {
    try {
      const envConfig = loadEnvironmentConfig();
      this.config = processEnvironmentConfig(envConfig);
      this.initializationError = null;
      
      if (this.config.debug) {
        console.log('Langfuse configuration initialized successfully:', {
          baseUrl: this.config.baseUrl,
          host: this.config.host,
          enabled: this.config.enabled,
          flushInterval: this.config.flushInterval,
          batchSize: this.config.batchSize,
          // Don't log sensitive keys
        });
      }
    } catch (error) {
      this.initializationError = error as Error;
      this.config = null;
      
      console.error('Failed to initialize Langfuse configuration:', error);
      
      // In development, provide helpful error messages
      if (import.meta.env.DEV) {
        console.error('\nLangfuse Configuration Help:');
        console.error('1. Copy .env.example to .env');
        console.error('2. Set the following environment variables:');
        console.error(`   - ${ENV_KEYS.BASE_URL}=https://langfuse.brius.com`);
        console.error(`   - ${ENV_KEYS.PUBLIC_KEY}=pk-lf-your-public-key`);
        console.error(`   - ${ENV_KEYS.SECRET_KEY}=sk-lf-your-secret-key`);
        console.error(`   - ${ENV_KEYS.HOST}=https://langfuse.brius.com`);
        console.error('3. Restart the development server\n');
      }
    }
  }

  /**
   * Gets the current configuration, throwing an error if not initialized
   */
  public getConfig(): LangfuseConfig {
    if (this.initializationError) {
      throw this.initializationError;
    }
    
    if (!this.config) {
      throw new LangfuseConfigError('Configuration not initialized. Call initialize() first.');
    }
    
    return this.config;
  }

  /**
   * Checks if Langfuse is enabled and properly configured
   */
  public isEnabled(): boolean {
    try {
      const config = this.getConfig();
      return config.enabled;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if debug mode is enabled
   */
  public isDebugEnabled(): boolean {
    try {
      const config = this.getConfig();
      return config.debug;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the initialization error if any
   */
  public getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Validates the current configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const config = this.getConfig();
      
      // Validate URLs are accessible (basic format check)
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('Invalid base URL format');
      }
      
      try {
        new URL(config.host);
      } catch {
        errors.push('Invalid host URL format');
      }
      
      // Validate key formats
      if (!config.publicKey.startsWith('pk-lf-')) {
        errors.push('Invalid public key format (should start with pk-lf-)');
      }
      
      if (!config.secretKey.startsWith('sk-lf-')) {
        errors.push('Invalid secret key format (should start with sk-lf-)');
      }
      
      // Validate numeric ranges
      if (config.flushInterval < 100 || config.flushInterval > 60000) {
        errors.push('Flush interval must be between 100 and 60000 milliseconds');
      }
      
      if (config.batchSize < 1 || config.batchSize > 100) {
        errors.push('Batch size must be between 1 and 100');
      }
      
    } catch (error) {
      errors.push(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resets the configuration service (useful for testing)
   */
  public reset(): void {
    this.config = null;
    this.initializationError = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the singleton configuration service instance
 */
export function getLangfuseConfigService(): LangfuseConfigService {
  return LangfuseConfigService.getInstance();
}

/**
 * Gets the current Langfuse configuration
 */
export function getLangfuseConfig(): LangfuseConfig {
  return getLangfuseConfigService().getConfig();
}

/**
 * Checks if Langfuse is enabled
 */
export function isLangfuseEnabled(): boolean {
  return getLangfuseConfigService().isEnabled();
}

/**
 * Initializes Langfuse configuration
 */
export function initializeLangfuseConfig(): void {
  getLangfuseConfigService().initialize();
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Automatically initialize configuration when module is imported
try {
  initializeLangfuseConfig();
} catch (error) {
  // Initialization errors are handled by the service
  // This prevents module import failures
}