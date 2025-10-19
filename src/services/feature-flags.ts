/**
 * Feature Flags Service
 *
 * Manages feature flags for Mastra BI integration
 * Provides environment-based and runtime configuration for feature toggles
 */

import React from 'react';
import { z } from 'zod';
import type { BIFeatureFlags } from '@/types/ai-agent';

// ============================================================================
// Environment Schema
// ============================================================================

/**
 * Environment variables schema for feature flags
 */
const FeatureFlagsEnvSchema = z.object({
  VITE_MASTRA_ENABLED: z.string().optional().default('true'),
  VITE_MASTRA_FALLBACK_ENABLED: z.string().optional().default('true'),
  VITE_MASTRA_DEBUG: z.string().optional().default('false'),
  VITE_MASTRA_USER_CONTEXT_ENABLED: z.string().optional().default('true'),
  VITE_MASTRA_MEMORY_PERSISTENCE_ENABLED: z.string().optional().default('true'),
});

// ============================================================================
// Feature Flags Manager
// ============================================================================

export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;
  private flags: BIFeatureFlags;
  private listeners: Set<(flags: BIFeatureFlags) => void> = new Set();

  private constructor() {
    this.flags = this.loadFromEnvironment();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }

  /**
   * Load feature flags from environment variables
   */
  private loadFromEnvironment(): BIFeatureFlags {
    try {
      const env = FeatureFlagsEnvSchema.parse(import.meta.env);
      
      return {
        useMastra: env.VITE_MASTRA_ENABLED === 'true',
        enableUserContext: env.VITE_MASTRA_USER_CONTEXT_ENABLED === 'true',
        enableMemoryPersistence: env.VITE_MASTRA_MEMORY_PERSISTENCE_ENABLED === 'true',
        fallbackToLegacy: env.VITE_MASTRA_FALLBACK_ENABLED === 'true',
        debugMode: env.VITE_MASTRA_DEBUG === 'true' || import.meta.env.DEV,
      };
    } catch (error) {
      console.warn('Failed to load feature flags from environment, using defaults:', error);
      return this.getDefaultFlags();
    }
  }

  /**
   * Get default feature flags
   */
  private getDefaultFlags(): BIFeatureFlags {
    return {
      useMastra: true, // Production: Enable Mastra for all users
      enableUserContext: true,
      enableMemoryPersistence: true,
      fallbackToLegacy: true, // Keep fallback enabled for safety
      debugMode: import.meta.env.DEV,
    };
  }

  /**
   * Get current feature flags
   */
  getFlags(): BIFeatureFlags {
    return { ...this.flags };
  }

  /**
   * Update feature flags
   */
  updateFlags(updates: Partial<BIFeatureFlags>): void {
    const previousFlags = { ...this.flags };
    this.flags = { ...this.flags, ...updates };
    
    // Persist to localStorage for runtime changes
    this.persistToStorage();
    
    // Notify listeners
    this.notifyListeners(previousFlags);
  }

  /**
   * Check if a specific feature is enabled
   */
  isEnabled(feature: keyof BIFeatureFlags): boolean {
    return this.flags[feature];
  }

  /**
   * Enable Mastra with safety checks
   */
  enableMastra(): void {
    this.updateFlags({
      useMastra: true,
      fallbackToLegacy: true, // Keep fallback enabled for safety
    });
  }

  /**
   * Disable Mastra (fallback to legacy)
   */
  disableMastra(): void {
    this.updateFlags({
      useMastra: false,
    });
  }

  /**
   * Enable debug mode
   */
  enableDebugMode(): void {
    this.updateFlags({ debugMode: true });
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.updateFlags({ debugMode: false });
  }

  /**
   * Reset to default flags
   */
  resetToDefaults(): void {
    this.flags = this.getDefaultFlags();
    this.persistToStorage();
    this.notifyListeners(this.flags);
  }

  /**
   * Reset to environment-based flags
   */
  resetToEnvironment(): void {
    this.flags = this.loadFromEnvironment();
    this.persistToStorage();
    this.notifyListeners(this.flags);
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: BIFeatureFlags) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(previousFlags: BIFeatureFlags): void {
    // Only notify if flags actually changed
    if (JSON.stringify(previousFlags) !== JSON.stringify(this.flags)) {
      this.listeners.forEach(listener => {
        try {
          listener(this.flags);
        } catch (error) {
          console.error('Error in feature flag listener:', error);
        }
      });
    }
  }

  /**
   * Persist flags to localStorage
   */
  private persistToStorage(): void {
    try {
      localStorage.setItem('mastra_feature_flags', JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to persist feature flags to localStorage:', error);
    }
  }

  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): BIFeatureFlags | null {
    try {
      const stored = localStorage.getItem('mastra_feature_flags');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
    }
    return null;
  }

  /**
   * Initialize flags with priority: localStorage > environment > defaults
   */
  initialize(): void {
    const storedFlags = this.loadFromStorage();
    if (storedFlags) {
      // Merge stored flags with current flags (environment takes precedence for new flags)
      this.flags = { ...this.flags, ...storedFlags };
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    currentFlags: BIFeatureFlags;
    environmentFlags: BIFeatureFlags;
    defaultFlags: BIFeatureFlags;
    source: 'environment' | 'localStorage' | 'default';
  } {
    return {
      currentFlags: this.getFlags(),
      environmentFlags: this.loadFromEnvironment(),
      defaultFlags: this.getDefaultFlags(),
      source: this.loadFromStorage() ? 'localStorage' : 'environment',
    };
  }
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for feature flags management
 */
export function useFeatureFlags() {
  const manager = FeatureFlagsManager.getInstance();
  const [flags, setFlags] = React.useState<BIFeatureFlags>(manager.getFlags());

  // Subscribe to flag changes
  React.useEffect(() => {
    const unsubscribe = manager.subscribe(setFlags);
    return unsubscribe;
  }, [manager]);

  const updateFlags = React.useCallback((updates: Partial<BIFeatureFlags>) => {
    manager.updateFlags(updates);
  }, [manager]);

  const enableMastra = React.useCallback(() => {
    manager.enableMastra();
  }, [manager]);

  const disableMastra = React.useCallback(() => {
    manager.disableMastra();
  }, [manager]);

  const resetToDefaults = React.useCallback(() => {
    manager.resetToDefaults();
  }, [manager]);

  const resetToEnvironment = React.useCallback(() => {
    manager.resetToEnvironment();
  }, [manager]);

  return {
    flags,
    updateFlags,
    enableMastra,
    disableMastra,
    resetToDefaults,
    resetToEnvironment,
    isEnabled: (feature: keyof BIFeatureFlags) => manager.isEnabled(feature),
    getDebugInfo: () => manager.getDebugInfo(),
  };
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Default feature flags manager instance
 */
export const featureFlagsManager = FeatureFlagsManager.getInstance();

/**
 * Initialize feature flags on app startup
 */
export function initializeFeatureFlags(): void {
  featureFlagsManager.initialize();
}

/**
 * Get current feature flags (non-reactive)
 */
export function getCurrentFeatureFlags(): BIFeatureFlags {
  return featureFlagsManager.getFlags();
}

/**
 * Check if a feature is enabled (non-reactive)
 */
export function isFeatureEnabled(feature: keyof BIFeatureFlags): boolean {
  return featureFlagsManager.isEnabled(feature);
}