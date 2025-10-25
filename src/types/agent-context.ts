/**
 * Agent Context Types
 * 
 * Unified context structure aligned with Mastra framework's AgentInputContext pattern
 * Provides standardized authentication, authorization, and user context for all agents
 * 
 * Reference: docs/mastra-integration-patterns.md (Section 2: Agent Context System)
 */

// ============================================================================
// Permission Matrix Types
// ============================================================================

/**
 * Permission actions that can be performed on resources
 */
export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'execute' 
  | 'query' 
  | 'export' 
  | 'admin';

/**
 * Resource categories for permission management
 */
export type PermissionResource =
  | 'analytics'
  | 'reports'
  | 'dashboards'
  | 'data_sources'
  | 'workflows'
  | 'settings'
  | 'users'
  | 'clinical'
  | 'business'
  | 'system';

/**
 * Permission matrix defining what actions a user can perform on each resource
 */
export interface PermissionMatrix {
  [resource: string]: {
    [action: string]: boolean;
  };
}

/**
 * Helper to create a permission matrix entry
 */
export type ResourcePermissions = {
  [K in PermissionAction]?: boolean;
};

// ============================================================================
// User Preferences Types
// ============================================================================

/**
 * User preferences for personalized agent interactions
 */
export interface UserPreferences {
  // UI Preferences
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  
  // Analytics Preferences
  analyticalPreferences?: {
    focusAreas: string[];
    defaultTimeRange: string;
    preferredChartTypes: string[];
    reportingStyle: 'summary' | 'detailed' | 'executive';
  };
  
  // Business Context
  businessContext?: {
    industry?: string;
    keyMetrics: string[];
    reportingFrequency: string;
    complianceRequirements: string[];
  };
  
  // Notification Preferences
  notifications?: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  
  // Data Preferences
  dataPreferences?: {
    defaultDataSources: string[];
    cacheEnabled: boolean;
    autoRefresh: boolean;
  };
}

// ============================================================================
// Agent Input Context (Mastra Pattern)
// ============================================================================

/**
 * Standardized agent input context aligned with Mastra framework
 * 
 * This interface is the single source of truth for all agent context data.
 * It supports both authenticated and anonymous users with proper fallbacks.
 * 
 * @see docs/mastra-integration-patterns.md for implementation details
 */
export interface AgentInputContext {
  // ===== User Identification =====
  /**
   * Unique user identifier
   * - For authenticated users: Supabase user ID
   * - For anonymous users: 'anonymous'
   */
  userId: string;
  
  /**
   * Session identifier for tracking conversation continuity
   * Generated per session, persists across requests
   */
  sessionId: string;
  
  /**
   * Optional conversation identifier for multi-turn conversations
   * Groups related messages within a session
   */
  conversationId?: string;
  
  // ===== Authentication =====
  /**
   * JWT token if provided (from Supabase auth)
   * Used for extracting user info, roles, and permissions
   */
  jwt?: string;
  
  /**
   * Whether the user is authenticated
   * Derived from JWT validation or explicit auth check
   */
  isAuthenticated: boolean;
  
  /**
   * Whether the user is anonymous (inverse of isAuthenticated)
   * Used for applying appropriate access restrictions
   */
  isAnonymous: boolean;
  
  // ===== Authorization =====
  /**
   * User roles for role-based access control
   * Can be merged from JWT claims and custom headers (X-Context-Roles)
   * Examples: ['user', 'analyst', 'admin', 'viewer']
   */
  roles: string[];
  
  /**
   * Fine-grained permission matrix
   * Defines what actions the user can perform on each resource
   */
  permissions: PermissionMatrix;
  
  /**
   * Department or organizational scope
   * Restricts data access to specific departments or teams
   */
  departmentScope: string[];
  
  // ===== Application Context =====
  /**
   * Application name or identifier
   * Can be set via X-Context-App header
   * Examples: 'brius-dashboard', 'mobile-app', 'anonymous'
   */
  applicationName: string;
  
  /**
   * Streaming preference
   * Whether the client expects streaming responses
   * Can be set via X-Context-Stream header
   */
  streaming?: boolean;
  
  // ===== Metadata =====
  /**
   * Request timestamp for auditing and time-based operations
   */
  timestamp: Date;
  
  /**
   * Additional metadata for custom context data
   * Can include request IDs, client info, feature flags, etc.
   */
  metadata?: Record<string, unknown>;
  
  // ===== User Preferences =====
  /**
   * User preferences for personalized interactions
   * Optional, loaded from user profile or session data
   */
  preferences?: UserPreferences;
}

// ============================================================================
// Context Processing Types
// ============================================================================

/**
 * Raw context data extracted from HTTP headers and JWT
 * Used internally for context processing
 */
export interface RawContextData {
  authorization?: string;
  contextUser?: string;
  contextRoles?: string;
  contextStream?: string;
  contextApp?: string;
}

/**
 * JWT payload structure from Supabase
 */
export interface JWTPayload {
  sub: string; // Subject (user ID)
  email?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  exp?: number;
  iat?: number;
}

/**
 * Context processing result
 */
export interface ContextProcessingResult {
  success: boolean;
  context: AgentInputContext;
  errors?: string[];
  warnings?: string[];
}

/**
 * Context validation options
 */
export interface ContextValidationOptions {
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: Array<{
    resource: PermissionResource;
    action: PermissionAction;
  }>;
  customValidator?: (context: AgentInputContext) => boolean;
}

// ============================================================================
// Anonymous Context Defaults
// ============================================================================

/**
 * Default permissions for anonymous users
 * Very restricted - only basic read access
 */
export const DEFAULT_ANONYMOUS_PERMISSIONS: PermissionMatrix = {
  analytics: {
    read: true,
    query: false,
    export: false,
  },
  reports: {
    read: true,
    create: false,
  },
  dashboards: {
    read: true,
    create: false,
  },
  data_sources: {
    read: false,
  },
  workflows: {
    read: false,
    execute: false,
  },
  settings: {
    read: false,
  },
  users: {
    read: false,
  },
  clinical: {
    read: false,
  },
  business: {
    read: false,
  },
  system: {
    read: false,
  },
};

/**
 * Default permissions for authenticated users
 * Basic access with read capabilities
 */
export const DEFAULT_USER_PERMISSIONS: PermissionMatrix = {
  analytics: {
    read: true,
    query: true,
    export: false,
  },
  reports: {
    read: true,
    create: true,
    update: true,
    delete: false,
  },
  dashboards: {
    read: true,
    create: true,
    update: true,
    delete: false,
  },
  data_sources: {
    read: true,
    query: true,
  },
  workflows: {
    read: true,
    execute: false,
  },
  settings: {
    read: true,
    update: false,
  },
  users: {
    read: true,
  },
  clinical: {
    read: true,
    query: true,
  },
  business: {
    read: true,
    query: true,
  },
  system: {
    read: false,
  },
};

// ============================================================================
// Context Builder Helpers
// ============================================================================

/**
 * Create an anonymous agent context
 */
export function createAnonymousContext(
  sessionId: string,
  applicationName: string = 'anonymous'
): AgentInputContext {
  return {
    userId: 'anonymous',
    sessionId,
    isAuthenticated: false,
    isAnonymous: true,
    roles: ['anonymous'],
    permissions: DEFAULT_ANONYMOUS_PERMISSIONS,
    departmentScope: [],
    applicationName,
    timestamp: new Date(),
  };
}

/**
 * Create a base authenticated context
 * Additional fields should be populated from JWT and user profile
 */
export function createAuthenticatedContext(
  userId: string,
  sessionId: string,
  roles: string[],
  permissions: PermissionMatrix,
  applicationName: string = 'brius-dashboard'
): AgentInputContext {
  return {
    userId,
    sessionId,
    isAuthenticated: true,
    isAnonymous: false,
    roles,
    permissions,
    departmentScope: [],
    applicationName,
    timestamp: new Date(),
  };
}

/**
 * Merge custom header overrides into agent context
 * Used for testing and development scenarios
 */
export function mergeContextOverrides(
  baseContext: AgentInputContext,
  overrides: Partial<AgentInputContext>
): AgentInputContext {
  return {
    ...baseContext,
    ...overrides,
    // Ensure critical fields aren't overridden to invalid values
    isAuthenticated: overrides.isAuthenticated ?? baseContext.isAuthenticated,
    isAnonymous: overrides.isAnonymous ?? baseContext.isAnonymous,
    timestamp: new Date(),
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if context represents an authenticated user
 */
export function isAuthenticatedContext(context: AgentInputContext): boolean {
  return context.isAuthenticated && !context.isAnonymous && context.userId !== 'anonymous';
}

/**
 * Check if context represents an anonymous user
 */
export function isAnonymousContext(context: AgentInputContext): boolean {
  return context.isAnonymous && context.userId === 'anonymous';
}

/**
 * Check if user has specific role
 */
export function hasRole(context: AgentInputContext, role: string): boolean {
  return context.roles.includes(role);
}

/**
 * Check if user has admin role
 */
export function isAdmin(context: AgentInputContext): boolean {
  return hasRole(context, 'admin') || hasRole(context, 'system_admin');
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  context: AgentInputContext,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  return context.permissions[resource]?.[action] === true;
}

/**
 * Validate context has required permissions
 */
export function validatePermissions(
  context: AgentInputContext,
  required: Array<{ resource: PermissionResource; action: PermissionAction }>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const { resource, action } of required) {
    if (!hasPermission(context, resource, action)) {
      missing.push(`${resource}.${action}`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}