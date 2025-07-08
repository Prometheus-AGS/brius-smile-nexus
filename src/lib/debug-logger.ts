/**
 * Debug logger utility for development environment
 * Provides enhanced logging capabilities during development
 */

// Only enable debug logging in development
const isDevelopment = import.meta.env.DEV;

/**
 * Enhanced console logger for development
 */
export const debugLogger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[DEBUG WARN]', ...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error('[DEBUG ERROR]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[DEBUG INFO]', ...args);
    }
  }
};

// Attach to window for global access in development
if (isDevelopment && typeof window !== 'undefined') {
  (window as typeof window & { debugLogger: typeof debugLogger }).debugLogger = debugLogger;
}

// Auto-initialize debug logging
if (isDevelopment) {
  debugLogger.info('Debug logger initialized');
}