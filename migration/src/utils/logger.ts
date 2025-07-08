/**
 * Structured logging utility for migration operations
 * Provides consistent logging with different levels and structured data
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  file_path: string;
  max_file_size_mb: number;
  max_files: number;
  console_output: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(config: LoggerConfig) {
    this.config = config;
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.config.file_path);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  /**
   * Format log entry
   */
  private formatLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (error) {
      entry.error = error.message;
      if (error.stack) {
        entry.stack = error.stack;
      }
    }

    return entry;
  }

  /**
   * Write log entry to file
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      
      // Check file size and rotate if necessary
      await this.rotateLogFileIfNeeded();
      
      // Append to log file
      fs.appendFileSync(this.config.file_path, logLine, 'utf8');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateLogFileIfNeeded(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.file_path)) {
        return;
      }

      const stats = fs.statSync(this.config.file_path);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > this.config.max_file_size_mb) {
        // Rotate existing files
        for (let i = this.config.max_files - 1; i > 0; i--) {
          const oldFile = `${this.config.file_path}.${i}`;
          const newFile = `${this.config.file_path}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === this.config.max_files - 1) {
              // Delete oldest file
              fs.unlinkSync(oldFile);
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }

        // Move current file to .1
        fs.renameSync(this.config.file_path, `${this.config.file_path}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Output to console if enabled
   */
  private outputToConsole(entry: LogEntry): void {
    if (!this.config.console_output) {
      return;
    }

    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    
    let output = `[${timestamp}] ${level} ${message}`;
    
    if (entry.data) {
      output += ` ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      output += ` ERROR: ${entry.error}`;
    }

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Log a message
   */
  private async log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLogEntry(level, message, data, error);
    
    // Output to console
    this.outputToConsole(entry);
    
    // Write to file
    await this.writeToFile(entry);
  }

  /**
   * Log debug message
   */
  async debug(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  async info(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  async warn(message: string, data?: Record<string, unknown>, error?: Error): Promise<void> {
    await this.log('warn', message, data, error);
  }

  /**
   * Log error message
   */
  async error(message: string, data?: Record<string, unknown>, error?: Error): Promise<void> {
    await this.log('error', message, data, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    
    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error) => {
      const mergedData = { ...context, ...data };
      return originalLog(level, message, mergedData, error);
    };

    return childLogger;
  }

  /**
   * Flush any pending log writes
   */
  async flush(): Promise<void> {
    // For file-based logging, this is a no-op since we write synchronously
    // But this method provides a consistent interface for other logger implementations
    return Promise.resolve();
  }

  /**
   * Create a timer for measuring operation duration
   */
  timer(operation: string): LogTimer {
    return new LogTimer(this, operation);
  }
}

/**
 * Timer utility for measuring operation duration
 */
export class LogTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * End the timer and log the duration
   */
  async end(message?: string, data?: Record<string, unknown>): Promise<void> {
    const duration = Date.now() - this.startTime;
    const logMessage = message || `${this.operation} completed`;
    const logData = {
      operation: this.operation,
      duration_ms: duration,
      ...data
    };

    await this.logger.info(logMessage, logData);
  }

  /**
   * End the timer with an error
   */
  async endWithError(error: Error, message?: string, data?: Record<string, unknown>): Promise<void> {
    const duration = Date.now() - this.startTime;
    const logMessage = message || `${this.operation} failed`;
    const logData = {
      operation: this.operation,
      duration_ms: duration,
      ...data
    };

    await this.logger.error(logMessage, logData, error);
  }
}

/**
 * Create a logger instance with default configuration
 */
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const defaultConfig: LoggerConfig = {
    level: 'info',
    file_path: './logs/migration.log',
    max_file_size_mb: 10,
    max_files: 5,
    console_output: true
  };

  return new Logger({ ...defaultConfig, ...config });
}