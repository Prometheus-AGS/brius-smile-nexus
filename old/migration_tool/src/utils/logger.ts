import pino from '../../$node_modules/pino/pino.js';
import { config } from './config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Logger configuration based on migration settings
 */
const createLoggerConfig = () => {
  const baseConfig = {
    level: config.logging.level
  };

  if (config.logging.enableConsole) {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    };
  }

  return baseConfig;
};

/**
 * Base logger instance
 */
export const logger = pino(createLoggerConfig());

/**
 * Creates a component-specific logger with consistent formatting
 */
export function createComponentLogger(component: string): pino.Logger {
  return logger.child({ component });
}

/**
 * Creates a file logger for persistent logging
 */
export function createFileLogger(filename: string): pino.Logger {
  if (!config.logging.enableFile) {
    return logger;
  }

  const logPath = `${config.logging.logDir}/${filename}`;
  
  // Ensure log directory exists
  try {
    mkdirSync(dirname(logPath), { recursive: true });
  } catch (error) {
    logger.warn(`Failed to create log directory: ${error}`);
  }

  return pino({
    level: config.logging.level,
    transport: {
      target: 'pino/file',
      options: {
        destination: logPath
      }
    }
  });
}

/**
 * Migration-specific logger with structured context
 */
export function createMigrationLogger(migrationId: string, phase: string): pino.Logger {
  return logger.child({
    migrationId,
    phase,
    component: 'migration'
  });
}

/**
 * Error logger with enhanced error context
 */
export function logError(error: Error, context: Record<string, unknown> = {}): void {
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  }, 'Migration error occurred');
}

/**
 * Progress logger for migration phases
 */
export function logProgress(
  phase: string,
  current: number,
  total: number,
  context: Record<string, unknown> = {}
): void {
  const percentage = Math.round((current / total) * 100);
  logger.info({
    phase,
    current,
    total,
    percentage,
    ...context
  }, `Migration progress: ${phase} ${percentage}%`);
}