/**
 * Agent Context Processor
 * 
 * Handles transformation of Supabase authentication data into standardized
 * AgentInputContext format aligned with Mastra framework patterns.
 * 
 * Supports JWT processing, role extraction, permission mapping, and
 * anonymous user fallback.
 * 
 * Reference: docs/mastra-integration-patterns.md (Section 2: Agent Context System)
 */

import { User, Session } from '@supabase/supabase-js';
import {
  AgentInputContext,
  PermissionMatrix,
  UserPreferences,
  JWTPayload,
  ContextProcessingResult,
  createAnonymousContext,
  createAuthenticatedContext,
  DEFAULT_ANONYMOUS_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  PermissionResource,
  PermissionAction,
} from '@/types/agent-context';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Agent context processor configuration
 */
interface ProcessorConfig {
  /**
   * Allow role overrides from custom headers
   * Default: false (for security)
   */
  allowRoleOverride: boolean;
  
  /**
   * Maximum number of roles allowed
   * Default: 10
   */
  maxRoles: number;
  
  /**
   * Session timeout in milliseconds
   * Default: 86400000 (24 hours)
   */
  sessionTimeout: number;
  
  /**
   * Default application name for anonymous users
   * Default: 'anonymous'
   */
  defaultAppName: string;
  
  /**
   * Enable debug logging
   * Default: false
   */
  debug: boolean;
}

/**
 * Default processor configuration
 */
const DEFAULT_CONFIG: ProcessorConfig = {
  allowRoleOverride: false,
  maxRoles: 10,
  sessionTimeout: 86400000, // 24 hours
  defaultAppName: 'anonymous',
  debug: false,
};

// ============================================================================
// Main Processor Class
// ============================================================================

/**
 * Agent Context Processor
 * 
 * Transforms Supabase authentication data into AgentInputContext format
 */
export class AgentContextProcessor {
  private readonly config: ProcessorConfig;
  
  constructor(config?: Partial<ProcessorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // ============================================================================
  // Public Processing Methods
  // ============================================================================
  
  /**
   * Process Supabase user and session into AgentInputContext
   * 
   * @param user - Supabase user object (null for anonymous)
   * @param session - Supabase session object (null for anonymous)
   * @param options - Additional processing options
   * @returns ContextProcessingResult with context or errors
   */
  async processSupabaseAuth(
    user: User | null,
    session: Session | null,
    options?: {
      sessionId?: string;
      conversationId?: string;
      applicationName?: string;
      roleOverrides?: string[];
      streaming?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ContextProcessingResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Generate or use provided session ID
      const sessionId = options?.sessionId || this.generateSessionId();
      
      // Handle anonymous users
      if (!user || !session) {
        if (this.config.debug) {
          console.log('Processing anonymous user context');
        }
        
        const context = createAnonymousContext(
          sessionId,
          options?.applicationName || this.config.defaultAppName
        );
        
        // Add optional fields
        if (options?.conversationId) {
          context.conversationId = options.conversationId;
        }
        if (options?.streaming !== undefined) {
          context.streaming = options.streaming;
        }
        if (options?.metadata) {
          context.metadata = options.metadata;
        }
        
        return {
          success: true,
          context,
          warnings: ['User is anonymous - restricted permissions applied'],
        };
      }
      
      // Process authenticated user
      const userId = user.id;
      
      // Extract JWT payload
      const jwtPayload = this.extractJWTPayload(session.access_token);
      
      // Extract and validate roles
      const roles = await this.extractRoles(
        user,
        jwtPayload,
        options?.roleOverrides
      );
      
      if (roles.length === 0) {
        warnings.push('No roles found - using default user role');
        roles.push('user');
      }
      
      // Build permission matrix
      const permissions = await this.buildPermissionMatrix(user, roles);
      
      // Extract user preferences
      const preferences = this.extractUserPreferences(user);
      
      // Create authenticated context
      const context = createAuthenticatedContext(
        userId,
        sessionId,
        roles,
        permissions,
        options?.applicationName || 'brius-dashboard'
      );
      
      // Add JWT token
      context.jwt = session.access_token;
      
      // Add optional fields
      if (options?.conversationId) {
        context.conversationId = options.conversationId;
      }
      if (options?.streaming !== undefined) {
        context.streaming = options.streaming;
      }
      if (options?.metadata) {
        context.metadata = options.metadata;
      }
      if (preferences) {
        context.preferences = preferences;
      }
      
      // Extract department scope from user metadata
      context.departmentScope = this.extractDepartmentScope(user);
      
      if (this.config.debug) {
        console.log('Processed authenticated user context:', {
          userId: context.userId,
          roles: context.roles,
          departmentScope: context.departmentScope,
          permissions: Object.keys(context.permissions),
        });
      }
      
      return {
        success: true,
        context,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Return anonymous context as fallback
      const fallbackContext = createAnonymousContext(
        options?.sessionId || this.generateSessionId(),
        options?.applicationName || this.config.defaultAppName
      );
      
      if (this.config.debug) {
        console.error('Context processing failed, using anonymous fallback:', error);
      }
      
      return {
        success: false,
        context: fallbackContext,
        errors,
        warnings: ['Context processing failed - using anonymous fallback'],
      };
    }
  }
  
  /**
   * Merge custom headers into existing context
   * Used for testing and development scenarios
   */
  mergeCustomHeaders(
    context: AgentInputContext,
    headers: {
      'X-Context-User'?: string;
      'X-Context-Roles'?: string;
      'X-Context-Stream'?: string;
      'X-Context-App'?: string;
    }
  ): AgentInputContext {
    const updated = { ...context };
    
    // Override user ID if provided and allowed
    if (headers['X-Context-User'] && this.config.allowRoleOverride) {
      updated.userId = headers['X-Context-User'];
    }
    
    // Merge roles if provided and allowed
    if (headers['X-Context-Roles'] && this.config.allowRoleOverride) {
      const headerRoles = headers['X-Context-Roles']
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0)
        .slice(0, this.config.maxRoles);
      
      updated.roles = [...new Set([...updated.roles, ...headerRoles])];
    }
    
    // Override streaming preference
    if (headers['X-Context-Stream']) {
      updated.streaming = headers['X-Context-Stream'].toLowerCase() === 'true';
    }
    
    // Override application name
    if (headers['X-Context-App']) {
      updated.applicationName = headers['X-Context-App'];
    }
    
    // Update timestamp
    updated.timestamp = new Date();
    
    return updated;
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Extract JWT payload from access token
   */
  private extractJWTPayload(accessToken: string): JWTPayload | null {
    try {
      // JWT structure: header.payload.signature
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      // Decode base64 payload
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as JWTPayload;
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to extract JWT payload:', error);
      }
      return null;
    }
  }
  
  /**
   * Extract roles from user and JWT
   */
  private async extractRoles(
    user: User,
    jwtPayload: JWTPayload | null,
    roleOverrides?: string[]
  ): Promise<string[]> {
    const roles = new Set<string>();
    
    // Add JWT role
    if (jwtPayload?.role) {
      roles.add(jwtPayload.role);
    }
    
    // Add roles from user metadata
    if (user.user_metadata?.roles) {
      const userRoles = Array.isArray(user.user_metadata.roles)
        ? user.user_metadata.roles
        : [user.user_metadata.roles];
      for (const role of userRoles) {
        roles.add(String(role));
      }
    }
    
    // Add roles from app metadata
    if (user.app_metadata?.roles) {
      const appRoles = Array.isArray(user.app_metadata.roles)
        ? user.app_metadata.roles
        : [user.app_metadata.roles];
      for (const role of appRoles) {
        roles.add(String(role));
      }
    }
    
    // Add role overrides if allowed
    if (this.config.allowRoleOverride && roleOverrides) {
      const overrides = roleOverrides.slice(0, this.config.maxRoles);
      for (const role of overrides) {
        roles.add(role);
      }
    }
    
    // Ensure at least 'user' role
    if (roles.size === 0) {
      roles.add('user');
    }
    
    return Array.from(roles);
  }
  
  /**
   * Build permission matrix based on user roles
   */
  private async buildPermissionMatrix(
    user: User,
    roles: string[]
  ): Promise<PermissionMatrix> {
    // Start with default user permissions
    const permissions: PermissionMatrix = JSON.parse(
      JSON.stringify(DEFAULT_USER_PERMISSIONS)
    );
    
    // Enhance permissions based on roles
    for (const role of roles) {
      switch (role) {
        case 'admin':
        case 'system_admin':
          this.applyAdminPermissions(permissions);
          break;
        
        case 'analyst':
        case 'business_analyst':
          this.applyAnalystPermissions(permissions);
          break;
        
        case 'clinical_user':
        case 'clinician':
          this.applyClinicalPermissions(permissions);
          break;
        
        case 'viewer':
        case 'read_only':
          this.applyViewerPermissions(permissions);
          break;
        
        default:
          // Keep default user permissions
          break;
      }
    }
    
    // Apply any user-specific permission overrides from metadata
    if (user.user_metadata?.permissions) {
      this.applyCustomPermissions(permissions, user.user_metadata.permissions);
    }
    
    return permissions;
  }
  
  /**
   * Apply admin permissions (full access)
   */
  private applyAdminPermissions(permissions: PermissionMatrix): void {
    const resources: PermissionResource[] = [
      'analytics', 'dashboards', 'data_sources',
      'workflows', 'settings', 'users', 'clinical', 'business', 'system'
    ];
    
    const actions: PermissionAction[] = [
      'create', 'read', 'update', 'delete', 'execute', 'query', 'export', 'admin'
    ];
    
    for (const resource of resources) {
      permissions[resource] = {};
      for (const action of actions) {
        permissions[resource][action] = true;
      }
    }
  }
  
  /**
   * Apply analyst permissions (analytics and reporting focus)
   */
  private applyAnalystPermissions(permissions: PermissionMatrix): void {
    // Full analytics access
    permissions.analytics = {
      read: true,
      query: true,
      export: true,
      create: true,
      update: true,
    };
    
    
    // Full dashboards access
    permissions.dashboards = {
      read: true,
      create: true,
      update: true,
      delete: true,
    };
    
    // Read-only business data
    permissions.business = {
      read: true,
      query: true,
    };
  }
  
  /**
   * Apply clinical permissions (clinical data access)
   */
  private applyClinicalPermissions(permissions: PermissionMatrix): void {
    permissions.clinical = {
      read: true,
      query: true,
      create: true,
      update: true,
    };
    
    permissions.analytics = {
      read: true,
      query: true,
    };
  }
  
  /**
   * Apply viewer permissions (read-only)
   */
  private applyViewerPermissions(permissions: PermissionMatrix): void {
    const resources: PermissionResource[] = [
      'analytics', 'dashboards', 'clinical', 'business'
    ];
    
    for (const resource of resources) {
      permissions[resource] = { read: true };
    }
  }
  
  /**
   * Apply custom permissions from user metadata
   */
  private applyCustomPermissions(
    permissions: PermissionMatrix,
    customPermissions: Record<string, unknown>
  ): void {
    try {
      // Validate and merge custom permissions
      for (const [resource, actions] of Object.entries(customPermissions)) {
        if (typeof actions === 'object' && actions !== null) {
          permissions[resource] = permissions[resource] || {};
          Object.assign(permissions[resource], actions);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to apply custom permissions:', error);
      }
    }
  }
  
  /**
   * Extract user preferences from Supabase user metadata
   */
  private extractUserPreferences(user: User): UserPreferences | undefined {
    try {
      const metadata = user.user_metadata;
      
      if (!metadata || typeof metadata !== 'object') {
        return undefined;
      }
      
      const preferences: UserPreferences = {};
      
      // Extract UI preferences
      if (metadata.theme) {
        preferences.theme = metadata.theme as 'light' | 'dark' | 'system';
      }
      if (metadata.language) {
        preferences.language = String(metadata.language);
      }
      if (metadata.timezone) {
        preferences.timezone = String(metadata.timezone);
      }
      
      // Extract analytical preferences
      if (metadata.analyticalPreferences) {
        preferences.analyticalPreferences = metadata.analyticalPreferences as UserPreferences['analyticalPreferences'];
      }
      
      // Extract business context
      if (metadata.businessContext) {
        preferences.businessContext = metadata.businessContext as UserPreferences['businessContext'];
      }
      
      // Extract notification preferences
      if (metadata.notifications) {
        preferences.notifications = metadata.notifications as UserPreferences['notifications'];
      }
      
      // Extract data preferences
      if (metadata.dataPreferences) {
        preferences.dataPreferences = metadata.dataPreferences as UserPreferences['dataPreferences'];
      }
      
      return Object.keys(preferences).length > 0 ? preferences : undefined;
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to extract user preferences:', error);
      }
      return undefined;
    }
  }
  
  /**
   * Extract department scope from user metadata
   */
  private extractDepartmentScope(user: User): string[] {
    try {
      const metadata = user.user_metadata;
      
      // Check various metadata locations for department info
      if (metadata?.departments && Array.isArray(metadata.departments)) {
        return metadata.departments.map(String);
      }
      
      if (metadata?.department) {
        return [String(metadata.department)];
      }
      
      if (user.app_metadata?.departments && Array.isArray(user.app_metadata.departments)) {
        return user.app_metadata.departments.map(String);
      }
      
      if (user.app_metadata?.department) {
        return [String(user.app_metadata.department)];
      }
      
      // Default to empty scope (access to all)
      return [];
    } catch (error) {
      if (this.config.debug) {
        console.warn('Failed to extract department scope:', error);
      }
      return [];
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${random}`;
  }
  
  /**
   * Validate session is not expired
   */
  validateSession(context: AgentInputContext): boolean {
    const now = Date.now();
    const sessionAge = now - context.timestamp.getTime();
    return sessionAge < this.config.sessionTimeout;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton processor instance with default configuration
 */
let processorInstance: AgentContextProcessor | null = null;

/**
 * Get or create the singleton processor instance
 */
export function getAgentContextProcessor(config?: Partial<ProcessorConfig>): AgentContextProcessor {
  if (!processorInstance || config) {
    processorInstance = new AgentContextProcessor(config);
  }
  return processorInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick process Supabase auth to AgentInputContext
 * Uses singleton processor with default configuration
 */
export async function processSupabaseAuth(
  user: User | null,
  session: Session | null,
  options?: {
    sessionId?: string;
    conversationId?: string;
    applicationName?: string;
    streaming?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<ContextProcessingResult> {
  const processor = getAgentContextProcessor();
  return processor.processSupabaseAuth(user, session, options);
}

/**
 * Extract AgentInputContext from Supabase user/session
 * Throws error if processing fails
 */
export async function extractAgentContext(
  user: User | null,
  session: Session | null,
  options?: {
    sessionId?: string;
    conversationId?: string;
    applicationName?: string;
    streaming?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<AgentInputContext> {
  const result = await processSupabaseAuth(user, session, options);
  
  if (!result.success && result.errors) {
    throw new Error(`Failed to extract agent context: ${result.errors.join(', ')}`);
  }
  
  return result.context;
}

/**
 * Create agent context for testing/development
 */
export function createTestContext(
  overrides?: Partial<AgentInputContext>
): AgentInputContext {
  const baseContext = createAuthenticatedContext(
    'test-user-id',
    'test-session-id',
    ['user'],
    DEFAULT_USER_PERMISSIONS,
    'test-app'
  );
  
  return {
    ...baseContext,
    ...overrides,
  };
}

// ============================================================================
// Role and Permission Utilities
// ============================================================================

/**
 * Check if user has admin role in context
 */
export function isAdminUser(context: AgentInputContext): boolean {
  return context.roles.includes('admin') || context.roles.includes('system_admin');
}

/**
 * Check if user has specific permission
 */
export function checkPermission(
  context: AgentInputContext,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  return context.permissions[resource]?.[action] === true;
}

/**
 * Get all permitted resources for a specific action
 */
export function getPermittedResources(
  context: AgentInputContext,
  action: PermissionAction
): PermissionResource[] {
  const permitted: PermissionResource[] = [];
  
  for (const [resource, actions] of Object.entries(context.permissions)) {
    if (actions[action] === true) {
      permitted.push(resource as PermissionResource);
    }
  }
  
  return permitted;
}

/**
 * Validate context has all required permissions
 */
export function validateRequiredPermissions(
  context: AgentInputContext,
  required: Array<{ resource: PermissionResource; action: PermissionAction }>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const { resource, action } of required) {
    if (!checkPermission(context, resource, action)) {
      missing.push(`${resource}.${action}`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}