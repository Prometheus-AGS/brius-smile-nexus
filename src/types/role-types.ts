/**
 * Role Management Types
 * 
 * Comprehensive type definitions for role-based access control (RBAC)
 * Based on reference project AgentInputContext patterns
 * Integrates with system_roles and user_system_roles database tables
 */

import { Database } from '@/integrations/supabase/types';

// ============================================================================
// Database Table Types (from Supabase)
// ============================================================================

export type SystemRole = Database['public']['Tables']['system_roles']['Row'];
export type SystemRoleInsert = Database['public']['Tables']['system_roles']['Insert'];
export type SystemRoleUpdate = Database['public']['Tables']['system_roles']['Update'];

export type UserSystemRole = Database['public']['Tables']['user_system_roles']['Row'];
export type UserSystemRoleInsert = Database['public']['Tables']['user_system_roles']['Insert'];
export type UserSystemRoleUpdate = Database['public']['Tables']['user_system_roles']['Update'];

// ============================================================================
// System Role Enumeration
// ============================================================================

/**
 * System role names matching database enum
 * Default role hierarchy: admin > user > service_role
 */
export type SystemRoleName = 'admin' | 'user' | 'service_role';

/**
 * Default system role for fallback scenarios
 */
export const DEFAULT_ROLE: SystemRoleName = 'user';

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission categories for granular access control
 */
export type PermissionCategory = 
  | 'system'
  | 'mastra'
  | 'data'
  | 'ui'
  | 'api';

/**
 * System-level permissions
 */
export type SystemPermission =
  | 'read'
  | 'write'
  | 'delete'
  | 'manage_users'
  | 'manage_roles';

/**
 * Mastra agent permissions
 */
export type MastraPermission =
  | 'orchestrator'
  | 'business_intelligence'
  | 'default'
  | 'all_agents';

/**
 * Data access permissions
 */
export type DataPermission =
  | 'read'
  | 'write'
  | 'delete'
  | 'export'
  | 'import';

/**
 * UI access permissions
 */
export type UIPermission =
  | 'all_pages'
  | 'admin_panel'
  | 'assistant';

/**
 * API access permissions
 */
export type APIPermission =
  | 'full_access'
  | 'read_only'
  | 'write_only';

/**
 * Comprehensive permission matrix
 * Structured to support granular role-based access control
 */
export interface PermissionMatrix {
  system?: SystemPermission[];
  mastra?: MastraPermission[];
  data?: DataPermission[];
  ui?: UIPermission[];
  api?: APIPermission[];
  [key: string]: string[] | undefined;
}

// ============================================================================
// Role Context Types
// ============================================================================

/**
 * User role assignment with metadata
 * Includes expiration and assignment tracking
 */
export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleName: SystemRoleName;
  roleId: string;
  permissions: PermissionMatrix;
  assignedBy: string | null;
  assignedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role enrichment result
 * Contains resolved roles and permissions for a user
 */
export interface RoleEnrichmentResult {
  userId: string;
  roles: SystemRoleName[];
  primaryRole: SystemRoleName;
  permissions: PermissionMatrix;
  assignments: UserRoleAssignment[];
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

// ============================================================================
// Agent Input Context Types (Mastra Integration)
// ============================================================================

/**
 * Department scope for role context
 * Used for filtering and access control based on organizational structure
 */
export interface DepartmentScope {
  departmentId: string;
  departmentName: string;
  parentDepartmentId: string | null;
  accessLevel: 'full' | 'read' | 'limited';
}

/**
 * Comprehensive agent input context
 * Based on reference project patterns for Mastra v0.21.1
 * Includes role-based authentication and authorization
 */
export interface AgentInputContext {
  // User identification
  userId: string;
  sessionId: string;
  
  // Role-based access control (MANDATORY)
  roles: SystemRoleName[];
  primaryRole: SystemRoleName;
  permissions: PermissionMatrix;
  
  // Authentication state
  isAuthenticated: boolean;
  isAnonymous: boolean;
  
  // Organizational context
  departmentScope?: DepartmentScope;
  organizationId?: string;
  
  // User metadata
  userName?: string;
  userEmail?: string;
  userTimezone?: string;
  userLocale?: string;
  
  // Request metadata
  requestId?: string;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
  
  // Feature flags and capabilities
  capabilities?: string[];
  featureFlags?: Record<string, boolean>;
  
  // Additional context (extensible)
  metadata?: Record<string, unknown>;
  
  // Index signature for additional properties
  [key: string]: unknown;
}

// ============================================================================
// JWT Token Types
// ============================================================================

/**
 * JWT payload with role information
 * Extended to include role-based claims
 */
export interface JWTPayload {
  sub: string; // user ID
  email?: string;
  roles: SystemRoleName[];
  primaryRole: SystemRoleName;
  permissions: PermissionMatrix;
  sessionId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

/**
 * JWT enrichment options
 */
export interface JWTEnrichmentOptions {
  includePermissions: boolean;
  includeExpiredRoles: boolean;
  fallbackToDefault: boolean;
  cacheTTL?: number;
}

// ============================================================================
// Role Validation Types
// ============================================================================

/**
 * Role validation result
 */
export interface RoleValidationResult {
  isValid: boolean;
  hasRole: boolean;
  hasPermission: boolean;
  missingRoles: SystemRoleName[];
  missingPermissions: string[];
  error?: RoleError;
}

/**
 * Role error types
 */
export type RoleErrorType =
  | 'ROLE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'ROLE_EXPIRED'
  | 'INVALID_ROLE'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Role error with context
 */
export interface RoleError {
  type: RoleErrorType;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: Date;
}

// ============================================================================
// Role Query Types
// ============================================================================

/**
 * Options for querying user roles
 */
export interface UserRoleQueryOptions {
  userId: string;
  includeExpired?: boolean;
  includeInactive?: boolean;
  includePermissions?: boolean;
}

/**
 * Role assignment filters
 */
export interface RoleAssignmentFilters {
  userId?: string;
  roleName?: SystemRoleName;
  isActive?: boolean;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Role comparison result
 */
export interface RoleComparison {
  hasAccess: boolean;
  requiredRole: SystemRoleName;
  userRoles: SystemRoleName[];
  meetsRequirement: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheck {
  hasPermission: boolean;
  category: PermissionCategory;
  permission: string;
  userPermissions: PermissionMatrix;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for SystemRoleName
 */
export function isSystemRoleName(value: unknown): value is SystemRoleName {
  return typeof value === 'string' && ['admin', 'user', 'service_role'].includes(value);
}

/**
 * Type guard for PermissionMatrix
 */
export function isPermissionMatrix(value: unknown): value is PermissionMatrix {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const matrix = value as Record<string, unknown>;
  return Object.values(matrix).every(v => Array.isArray(v) && v.every(item => typeof item === 'string'));
}

/**
 * Type guard for AgentInputContext
 */
export function isAgentInputContext(value: unknown): value is AgentInputContext {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const context = value as Partial<AgentInputContext>;
  return (
    typeof context.userId === 'string' &&
    typeof context.sessionId === 'string' &&
    Array.isArray(context.roles) &&
    context.roles.every(isSystemRoleName) &&
    typeof context.isAuthenticated === 'boolean' &&
    typeof context.isAnonymous === 'boolean'
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract role names from role assignments
 */
export type ExtractRoleName<T> = T extends { roleName: infer R } ? R : never;

/**
 * Partial role context for updates
 */
export type PartialRoleContext = Partial<Pick<AgentInputContext, 'roles' | 'permissions' | 'primaryRole'>>;

/**
 * Role-based feature access configuration
 */
export interface RoleBasedFeature {
  featureName: string;
  requiredRoles: SystemRoleName[];
  requiredPermissions: Array<{
    category: PermissionCategory;
    permission: string;
  }>;
  fallbackBehavior: 'deny' | 'readonly' | 'degraded';
}

// ============================================================================
// Export Collections
// ============================================================================

/**
 * All system role names for iteration
 */
export const SYSTEM_ROLE_NAMES: SystemRoleName[] = ['admin', 'user', 'service_role'];

/**
 * Role hierarchy (highest to lowest)
 */
export const ROLE_HIERARCHY: Record<SystemRoleName, number> = {
  admin: 3,
  user: 2,
  service_role: 1,
};
/**
 * Check if a permission matrix grants a specific permission
 * 
 * @param permissions - The permission matrix to check
 * @param category - Permission category (system, mastra, data, ui, api)
 * @param action - Specific action to check (e.g., 'orchestrator:execute', 'data:read')
 * @returns True if permission is granted
 */
export function hasPermission(
  permissions: PermissionMatrix,
  category: PermissionCategory,
  action: string
): boolean {
  const categoryPermissions = permissions[category];
  
  if (!categoryPermissions) {
    return false;
  }

  // Check if the action exists in the category and is set to true
  return categoryPermissions[action] === true;
}


/**
 * Default permissions by role
 */
export const DEFAULT_PERMISSIONS: Record<SystemRoleName, PermissionMatrix> = {
  admin: {
    system: ['read', 'write', 'delete', 'manage_users', 'manage_roles'],
    mastra: ['orchestrator', 'business_intelligence', 'default', 'all_agents'],
    data: ['read', 'write', 'delete', 'export', 'import'],
    ui: ['all_pages', 'admin_panel'],
    api: ['full_access'],
  },
  user: {
    system: ['read'],
    mastra: ['orchestrator', 'business_intelligence'],
    data: ['read'],
    ui: ['assistant'],
  },
  service_role: {
    system: ['read', 'write'],
    mastra: ['orchestrator', 'business_intelligence', 'default'],
    data: ['read', 'write'],
    api: ['full_access'],
  },
};