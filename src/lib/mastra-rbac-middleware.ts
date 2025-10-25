/**
 * Role-Based Access Control (RBAC) Middleware for Mastra Agent Communications
 * 
 * Provides permission validation and access control for Mastra agent operations
 * based on user roles and the permission matrix defined in role-types.ts
 * 
 * Key Features:
 * - Role-based permission validation
 * - Agent-specific access control
 * - Operation-level granularity
 * - Integration with AgentInputContext
 * - Comprehensive error handling with detailed messages
 */

import type {
  AgentInputContext,
  SystemRoleName,
  PermissionMatrix,
  PermissionCategory,
} from '@/types/role-types';
import { isAgentInputContext, hasPermission } from '@/types/role-types';

// ============================================================================
// RBAC Error Classes
// ============================================================================

/**
 * Base error class for RBAC-related errors
 */
export class RBACError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

/**
 * Error thrown when user lacks required permissions
 */
export class PermissionDeniedError extends RBACError {
  constructor(
    public readonly requiredPermission: string,
    public readonly userRoles: SystemRoleName[],
    details?: Record<string, unknown>
  ) {
    super(
      `Permission denied: ${requiredPermission} required. User roles: ${userRoles.join(', ')}`,
      'PERMISSION_DENIED',
      details
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when context is invalid or missing
 */
export class InvalidContextError extends RBACError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_CONTEXT', details);
    this.name = 'InvalidContextError';
  }
}

// ============================================================================
// Permission Requirements Configuration
// ============================================================================

/**
 * Defines permission requirements for different agent operations
 */
export interface OperationPermission {
  category: PermissionCategory;
  action: string;
  description: string;
  requiredRoles?: SystemRoleName[]; // Optional role-based restriction
}

/**
 * Permission requirements for Mastra agent operations
 */
export const AGENT_PERMISSIONS: Record<string, OperationPermission> = {
  // Orchestrator Agent Permissions
  ORCHESTRATOR_EXECUTE: {
    category: 'mastra',
    action: 'orchestrator:execute',
    description: 'Execute orchestrator agent queries',
  },
  ORCHESTRATOR_ROUTE: {
    category: 'mastra',
    action: 'orchestrator:route',
    description: 'Route requests through orchestrator',
  },

  // Business Intelligence Agent Permissions
  BI_QUERY: {
    category: 'mastra',
    action: 'bi:query',
    description: 'Execute business intelligence queries',
  },
  BI_DASHBOARD: {
    category: 'mastra',
    action: 'bi:dashboard',
    description: 'Access BI dashboards',
  },
  BI_REPORT: {
    category: 'mastra',
    action: 'bi:report',
    description: 'Generate BI reports',
  },

  // Default Agent Permissions
  DEFAULT_QUERY: {
    category: 'mastra',
    action: 'default:query',
    description: 'Execute default agent queries',
  },
  DEFAULT_HELP: {
    category: 'mastra',
    action: 'default:help',
    description: 'Access help system',
  },

  // Data Access Permissions
  DATA_READ: {
    category: 'data',
    action: 'data:read',
    description: 'Read access to data',
  },
  DATA_WRITE: {
    category: 'data',
    action: 'data:write',
    description: 'Write access to data',
    requiredRoles: ['admin'], // Admin only
  },
  DATA_DELETE: {
    category: 'data',
    action: 'data:delete',
    description: 'Delete access to data',
    requiredRoles: ['admin'], // Admin only
  },

  // API Access Permissions
  API_ACCESS: {
    category: 'api',
    action: 'api:access',
    description: 'Access API endpoints',
  },
  API_RATE_LIMIT_EXEMPT: {
    category: 'api',
    action: 'api:rate_limit_exempt',
    description: 'Exempt from rate limiting',
    requiredRoles: ['admin', 'service_role'],
  },
};

// ============================================================================
// RBAC Middleware Core Functions
// ============================================================================

/**
 * Validates if a context has the required permission
 * 
 * @param context - Agent input context with role information
 * @param permission - Permission requirement to validate
 * @returns True if permission is granted
 * @throws PermissionDeniedError if permission is denied
 * @throws InvalidContextError if context is invalid
 */
export function validatePermission(
  context: AgentInputContext,
  permission: OperationPermission
): boolean {
  // Validate context structure
  if (!isAgentInputContext(context)) {
    throw new InvalidContextError('Invalid agent input context structure', {
      providedContext: context,
    });
  }

  // Check if user is authenticated (unless it's a public operation)
  if (!context.isAuthenticated && permission.category !== 'system') {
    throw new PermissionDeniedError(permission.action, context.roles, {
      reason: 'User must be authenticated',
    });
  }

  // Check role-based restrictions first (most restrictive)
  if (permission.requiredRoles && permission.requiredRoles.length > 0) {
    const hasRequiredRole = permission.requiredRoles.some(role =>
      context.roles.includes(role)
    );

    if (!hasRequiredRole) {
      throw new PermissionDeniedError(permission.action, context.roles, {
        requiredRoles: permission.requiredRoles,
        reason: `Operation requires one of: ${permission.requiredRoles.join(', ')}`,
      });
    }
  }

  // Check permission matrix
  const permitted = hasPermission(
    context.permissions,
    permission.category,
    permission.action
  );

  if (!permitted) {
    throw new PermissionDeniedError(permission.action, context.roles, {
      category: permission.category,
      reason: 'Permission not granted in user permission matrix',
    });
  }

  return true;
}

/**
 * Validates multiple permissions (requires all to be granted)
 * 
 * @param context - Agent input context
 * @param permissions - Array of permission requirements
 * @returns True if all permissions are granted
 */
export function validateMultiplePermissions(
  context: AgentInputContext,
  permissions: OperationPermission[]
): boolean {
  for (const permission of permissions) {
    validatePermission(context, permission);
  }
  return true;
}

/**
 * Checks if context has permission without throwing errors
 * 
 * @param context - Agent input context
 * @param permission - Permission requirement
 * @returns True if permitted, false otherwise
 */
export function checkPermission(
  context: AgentInputContext | Record<string, unknown>,
  permission: OperationPermission
): boolean {
  try {
    if (!isAgentInputContext(context)) {
      return false;
    }
    return validatePermission(context, permission);
  } catch {
    return false;
  }
}

// ============================================================================
// Agent-Specific Middleware Functions
// ============================================================================

/**
 * Validates orchestrator agent access
 */
export function validateOrchestratorAccess(context: AgentInputContext): boolean {
  return validatePermission(context, AGENT_PERMISSIONS.ORCHESTRATOR_EXECUTE);
}

/**
 * Validates business intelligence agent access
 */
export function validateBIAccess(context: AgentInputContext, operation: 'query' | 'dashboard' | 'report'): boolean {
  const permissionMap = {
    query: AGENT_PERMISSIONS.BI_QUERY,
    dashboard: AGENT_PERMISSIONS.BI_DASHBOARD,
    report: AGENT_PERMISSIONS.BI_REPORT,
  };

  return validatePermission(context, permissionMap[operation]);
}

/**
 * Validates default agent access
 */
export function validateDefaultAccess(context: AgentInputContext, operation: 'query' | 'help'): boolean {
  const permissionMap = {
    query: AGENT_PERMISSIONS.DEFAULT_QUERY,
    help: AGENT_PERMISSIONS.DEFAULT_HELP,
  };

  return validatePermission(context, permissionMap[operation]);
}

/**
 * Validates data access operations
 */
export function validateDataAccess(
  context: AgentInputContext,
  operation: 'read' | 'write' | 'delete'
): boolean {
  const permissionMap = {
    read: AGENT_PERMISSIONS.DATA_READ,
    write: AGENT_PERMISSIONS.DATA_WRITE,
    delete: AGENT_PERMISSIONS.DATA_DELETE,
  };

  return validatePermission(context, permissionMap[operation]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets list of permissions a context has
 * 
 * @param context - Agent input context
 * @returns Array of permission actions the user has
 */
export function getContextPermissions(context: AgentInputContext): string[] {
  if (!isAgentInputContext(context)) {
    return [];
  }

  const permissions: string[] = [];

  // Check each defined permission
  for (const [, permission] of Object.entries(AGENT_PERMISSIONS)) {
    if (checkPermission(context, permission)) {
      permissions.push(permission.action);
    }
  }

  return permissions;
}

/**
 * Generates a permission summary for a context
 * 
 * @param context - Agent input context
 * @returns Object with permission details
 */
export function generatePermissionSummary(context: AgentInputContext): {
  userId: string;
  roles: SystemRoleName[];
  primaryRole: SystemRoleName;
  isAuthenticated: boolean;
  permissions: string[];
  restrictions: string[];
} {
  const permissions = getContextPermissions(context);
  const restrictions: string[] = [];

  // Identify restrictions (permissions user doesn't have)
  for (const [, permission] of Object.entries(AGENT_PERMISSIONS)) {
    if (!checkPermission(context, permission)) {
      restrictions.push(permission.action);
    }
  }

  return {
    userId: context.userId,
    roles: context.roles,
    primaryRole: context.primaryRole,
    isAuthenticated: context.isAuthenticated,
    permissions,
    restrictions,
  };
}

/**
 * Creates a middleware wrapper for async operations
 * 
 * @param operation - The operation to execute
 * @param permission - Required permission
 * @returns Wrapped operation with permission validation
 */
export function withPermission<T extends unknown[], R>(
  operation: (context: AgentInputContext, ...args: T) => Promise<R>,
  permission: OperationPermission
): (context: AgentInputContext, ...args: T) => Promise<R> {
  return async (context: AgentInputContext, ...args: T): Promise<R> => {
    validatePermission(context, permission);
    return operation(context, ...args);
  };
}

/**
 * Rate limiting configuration based on role
 */
export function getRateLimitForContext(context: AgentInputContext): {
  requestsPerMinute: number;
  requestsPerHour: number;
} {
  // Admin and service roles get higher limits
  if (context.primaryRole === 'admin' || context.primaryRole === 'service_role') {
    return {
      requestsPerMinute: 120,
      requestsPerHour: 5000,
    };
  }

  // Regular users
  return {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  };
}