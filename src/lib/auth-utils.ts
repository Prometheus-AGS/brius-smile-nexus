import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import type { User, AuthErrorInfo, AuthErrorType, UserTransformer } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  SystemRoleName,
  DEFAULT_ROLE,
  PermissionMatrix,
  RoleEnrichmentResult,
  UserRoleAssignment,
  JWTPayload,
  AgentInputContext,
  DEFAULT_PERMISSIONS,
  isSystemRoleName,
} from '@/types/role-types';
import { roleErrorHandler, retryWithBackoff } from '@/lib/role-error-handler';

/**
 * Maps Supabase auth errors to user-friendly error messages
 */
export const mapAuthError = (error: AuthError): AuthErrorInfo => {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
    return {
      type: 'invalid_credentials',
      message: 'Invalid email or password. Please check your credentials and try again.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email address not confirmed')) {
    return {
      type: 'email_not_confirmed',
      message: 'Please check your email and click the verification link before signing in.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('user not found')) {
    return {
      type: 'user_not_found',
      message: 'No account found with this email address.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('short'))) {
    return {
      type: 'weak_password',
      message: 'Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('already registered') || errorMessage.includes('email already exists')) {
    return {
      type: 'email_already_exists',
      message: 'An account with this email address already exists.',
      originalError: error
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      type: 'network_error',
      message: 'Network error. Please check your connection and try again.',
      originalError: error
    };
  }
  
  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error
  };
};

// ============================================================================
// Role Enrichment Functions
// ============================================================================

/**
 * Queries user roles from database with proper error handling
 * Returns roles with permissions and metadata
 */
export const getUserRoles = async (userId: string): Promise<UserRoleAssignment[]> => {
  try {
    const { data, error } = await supabase
      .from('user_system_roles')
      .select(`
        id,
        user_id,
        role_id,
        assigned_by,
        assigned_at,
        expires_at,
        is_active,
        created_at,
        updated_at,
        system_roles!inner (
          id,
          name,
          description,
          permissions,
          is_active
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform database response to UserRoleAssignment
    return data.map((row) => {
      const systemRole = Array.isArray(row.system_roles) 
        ? row.system_roles[0] 
        : row.system_roles;
      
      return {
        id: row.id,
        userId: row.user_id,
        roleName: systemRole.name as SystemRoleName,
        roleId: row.role_id,
        permissions: (systemRole.permissions as PermissionMatrix) || {},
        assignedBy: row.assigned_by,
        assignedAt: new Date(row.assigned_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    });
  } catch (error) {
    console.error('Exception fetching user roles:', error);
    return [];
  }
};

/**
 * Enriches user session with role information from database
 * Implements fallback to DEFAULT_ROLE ('user') if no roles found
 */
export const enrichUserWithRoles = async (userId: string): Promise<RoleEnrichmentResult> => {
  // Check circuit breaker before attempting
  if (roleErrorHandler.isCircuitBreakerOpen()) {
    console.warn('Circuit breaker is open, using default role');
    return {
      userId,
      roles: [DEFAULT_ROLE],
      primaryRole: DEFAULT_ROLE,
      permissions: DEFAULT_PERMISSIONS[DEFAULT_ROLE],
      assignments: [],
      isAuthenticated: true,
      isAnonymous: false,
    };
  }

  try {
    // Attempt with retry logic for transient failures
    const assignments = await retryWithBackoff(
      () => getUserRoles(userId),
      { maxAttempts: 2, initialDelay: 500, maxDelay: 2000 }
    );

    // If no roles found, use default role
    if (assignments.length === 0) {
      console.info(`No roles found for user ${userId}, applying default role: ${DEFAULT_ROLE}`);
      
      return {
        userId,
        roles: [DEFAULT_ROLE],
        primaryRole: DEFAULT_ROLE,
        permissions: DEFAULT_PERMISSIONS[DEFAULT_ROLE],
        assignments: [],
        isAuthenticated: true,
        isAnonymous: false,
      };
    }

    // Extract role names
    const roles = assignments.map(a => a.roleName);
    
    // Primary role is the first active role (highest priority based on assignment date)
    const primaryRole = assignments[0].roleName;
    
    // Merge all permissions from all roles
    const mergedPermissions: PermissionMatrix = assignments.reduce((acc, assignment) => {
      const rolePerms = assignment.permissions;
      
      // Merge each permission category
      Object.keys(rolePerms).forEach((category) => {
        const perms = rolePerms[category];
        if (Array.isArray(perms)) {
          if (!acc[category]) {
            acc[category] = [];
          }
          // Merge and deduplicate permissions
          acc[category] = Array.from(new Set([...acc[category]!, ...perms]));
        }
      });
      
      return acc;
    }, {} as PermissionMatrix);

    // Success - record in error handler to reset circuit breaker
    roleErrorHandler.handleRoleResolutionSuccess();

    return {
      userId,
      roles,
      primaryRole,
      permissions: mergedPermissions,
      assignments,
      isAuthenticated: true,
      isAnonymous: false,
    };
  } catch (error) {
    // Enhanced error handling with categorization and circuit breaker
    const result = roleErrorHandler.handleRoleResolutionError(
      error,
      userId,
      'enrichUserWithRoles'
    );
    
    console.warn('Role enrichment failed, using graceful degradation:', {
      userId,
      errorType: result.error.type,
      severity: result.error.severity,
      degraded: result.degraded,
      circuitBreaker: roleErrorHandler.getCircuitBreakerStatus(),
    });
    
    return {
      userId,
      roles: result.roles,
      primaryRole: result.primaryRole,
      permissions: result.permissions,
      assignments: [],
      isAuthenticated: true,
      isAnonymous: false,
    };
  }
};

/**
 * Creates enriched JWT payload with role information
 * Used for passing to Mastra agents and other services
 */
export const createEnrichedJWTPayload = async (
  user: SupabaseUser,
  session: Session
): Promise<JWTPayload> => {
  const roleEnrichment = await enrichUserWithRoles(user.id);
  
  return {
    sub: user.id,
    email: user.email,
    roles: roleEnrichment.roles,
    primaryRole: roleEnrichment.primaryRole,
    permissions: roleEnrichment.permissions,
    sessionId: session.access_token.substring(0, 16), // Use part of access token as session ID
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(new Date(session.expires_at!).getTime() / 1000),
    iss: 'brius-smile-nexus',
    aud: 'mastra-agents',
  };
};

/**
 * Creates comprehensive agent input context from session
 * Includes role-based authentication and authorization
 * Compatible with Mastra v0.21.1 server expectations
 */
export const createAgentInputContext = async (
  user: SupabaseUser,
  session: Session
): Promise<AgentInputContext> => {
  const roleEnrichment = await enrichUserWithRoles(user.id);
  const userMetadata = user.user_metadata || {};
  
  return {
    // User identification
    userId: user.id,
    sessionId: session.access_token.substring(0, 16),
    
    // Role-based access control (MANDATORY)
    roles: roleEnrichment.roles,
    primaryRole: roleEnrichment.primaryRole,
    permissions: roleEnrichment.permissions,
    
    // Authentication state
    isAuthenticated: true,
    isAnonymous: false,
    
    // User metadata
    userName: userMetadata.full_name || userMetadata.name || user.email?.split('@')[0],
    userEmail: user.email,
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userLocale: navigator.language,
    
    // Request metadata
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    
    // Feature flags and capabilities
    capabilities: ['chat', 'analysis'],
    featureFlags: {
      useMastra: true,
      enableUserContext: true,
      enableMemoryPersistence: true,
    },
    
    // Additional context
    metadata: {
      roleAssignments: roleEnrichment.assignments.length,
      sessionExpiresAt: session.expires_at,
    },
  };
};

/**
 * Checks if user has a specific role
 */
export const userHasRole = (roles: SystemRoleName[], requiredRole: SystemRoleName): boolean => {
  return roles.includes(requiredRole);
};

/**
 * Checks if user has any of the required roles
 */
export const userHasAnyRole = (roles: SystemRoleName[], requiredRoles: SystemRoleName[]): boolean => {
  return requiredRoles.some(role => roles.includes(role));
};

/**
 * Checks if user has all of the required roles
 */
export const userHasAllRoles = (roles: SystemRoleName[], requiredRoles: SystemRoleName[]): boolean => {
  return requiredRoles.every(role => roles.includes(role));
};

/**
 * Checks if user has a specific permission in a category
 */
export const userHasPermission = (
  permissions: PermissionMatrix,
  category: string,
  permission: string
): boolean => {
  const categoryPermissions = permissions[category];
  return Array.isArray(categoryPermissions) && categoryPermissions.includes(permission);
};

/**
 * Validates if roles array is valid
 */
export const validateRoles = (roles: unknown): roles is SystemRoleName[] => {
  return Array.isArray(roles) && roles.every(isSystemRoleName);
};

/**
 * Gets the highest priority role from roles array
 * Based on ROLE_HIERARCHY: admin > user > service_role
 */
export const getPrimaryRole = (roles: SystemRoleName[]): SystemRoleName => {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('user')) return 'user';
  if (roles.includes('service_role')) return 'service_role';
  return DEFAULT_ROLE;
};

// ============================================================================
// Existing User Transformation (Updated with Role Support)
// ============================================================================

/**
 * Transforms a Supabase user to our application user format
 * Now includes role enrichment from database
 */
export const transformSupabaseUser: UserTransformer = (supabaseUser: SupabaseUser, session?: Session): User => {
  // Extract user metadata or use defaults
  const userMetadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0] || 'User',
    role: appMetadata.role || 'Operations Manager',
    permissions: appMetadata.permissions || ['home', 'assistant', 'orders'],
    avatar: userMetadata.avatar_url || undefined,
    email_verified: supabaseUser.email_confirmed_at ? true : false,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at
  };
};

// ============================================================================
// Validation Functions (Existing)
// ============================================================================

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  return { isValid: true };
};

// ============================================================================
// Redirect and URL Utilities (Existing)
// ============================================================================

/**
 * Generates a secure redirect URL for auth flows
 */
export const getAuthRedirectUrl = (path: string = '/portal'): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path}`;
};

/**
 * Extracts redirect path from URL parameters
 */
export const getRedirectPath = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirectTo');
  
  // Validate redirect path to prevent open redirects
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo;
  }
  
  return '/portal';
};

// ============================================================================
// Permission Checking (Existing - Updated to support new permission system)
// ============================================================================

/**
 * Checks if user has required permissions
 */
export const hasPermission = (user: User | null, requiredPermissions: string[]): boolean => {
  if (!user || !requiredPermissions.length) {
    return true;
  }
  
  return requiredPermissions.every(permission => 
    user.permissions.includes(permission)
  );
};

// ============================================================================
// Input Sanitization (Existing)
// ============================================================================

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

// ============================================================================
// Utility Functions (Existing)
// ============================================================================

/**
 * Debounce function for form validation
 */
export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Storage keys for auth-related data
 */
export const AUTH_STORAGE_KEYS = {
  REMEMBER_EMAIL: 'brius-remember-email',
  LAST_LOGIN_EMAIL: 'brius-last-login-email',
  AUTH_REDIRECT: 'brius-auth-redirect',
  ROLE_CACHE: 'brius-role-cache', // Cache for role information
} as const;

/**
 * Safely stores data in localStorage
 */
export const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to store item in localStorage:', error);
  }
};

/**
 * Safely retrieves data from localStorage
 */
export const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to retrieve item from localStorage:', error);
    return null;
  }
};

/**
 * Safely removes data from localStorage
 */
export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove item from localStorage:', error);
  }
};

// ============================================================================
// Role Caching Functions (Performance Optimization)
// ============================================================================

interface RoleCacheEntry {
  enrichment: RoleEnrichmentResult;
  timestamp: number;
  expiresAt: number;
}

const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Caches role enrichment result in memory and localStorage
 */
export const cacheRoleEnrichment = (enrichment: RoleEnrichmentResult): void => {
  try {
    const cacheEntry: RoleCacheEntry = {
      enrichment,
      timestamp: Date.now(),
      expiresAt: Date.now() + ROLE_CACHE_TTL,
    };
    
    setStorageItem(
      `${AUTH_STORAGE_KEYS.ROLE_CACHE}_${enrichment.userId}`,
      JSON.stringify(cacheEntry)
    );
  } catch (error) {
    console.warn('Failed to cache role enrichment:', error);
  }
};

/**
 * Retrieves cached role enrichment if still valid
 */
export const getCachedRoleEnrichment = (userId: string): RoleEnrichmentResult | null => {
  try {
    const cached = getStorageItem(`${AUTH_STORAGE_KEYS.ROLE_CACHE}_${userId}`);
    if (!cached) return null;
    
    const cacheEntry: RoleCacheEntry = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() > cacheEntry.expiresAt) {
      removeStorageItem(`${AUTH_STORAGE_KEYS.ROLE_CACHE}_${userId}`);
      return null;
    }
    
    // Convert date strings back to Date objects
    const enrichment = cacheEntry.enrichment;
    enrichment.assignments = enrichment.assignments.map(a => ({
      ...a,
      assignedAt: new Date(a.assignedAt),
      expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }));
    
    return enrichment;
  } catch (error) {
    console.warn('Failed to retrieve cached role enrichment:', error);
    return null;
  }
};

/**
 * Clears role cache for a user
 */
export const clearRoleCache = (userId: string): void => {
  removeStorageItem(`${AUTH_STORAGE_KEYS.ROLE_CACHE}_${userId}`);
};

// ============================================================================
// Enhanced User Enrichment (With Caching)
// ============================================================================

/**
 * Enriches user with roles, using cache when available
 * Implements intelligent caching to reduce database queries
 */
export const enrichUserWithRolesCached = async (userId: string): Promise<RoleEnrichmentResult> => {
  // Try cache first
  const cached = getCachedRoleEnrichment(userId);
  if (cached) {
    console.debug(`Using cached roles for user ${userId}`);
    return cached;
  }
  
  // Fetch from database
  const enrichment = await enrichUserWithRoles(userId);
  
  // Cache the result
  cacheRoleEnrichment(enrichment);
  
  return enrichment;
};

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Checks if user has admin role
 */
export const isAdmin = (roles: SystemRoleName[]): boolean => {
  return roles.includes('admin');
};

/**
 * Checks if user is authenticated (has any role other than anonymous)
 */
export const isAuthenticated = (enrichment: RoleEnrichmentResult): boolean => {
  return enrichment.isAuthenticated && !enrichment.isAnonymous;
};

/**
 * Gets display name for role
 */
export const getRoleDisplayName = (role: SystemRoleName): string => {
  const displayNames: Record<SystemRoleName, string> = {
    admin: 'Administrator',
    user: 'User',
    service_role: 'Service Account',
  };
  return displayNames[role] || role;
};

/**
 * Formats role enrichment for logging
 */
export const formatRoleEnrichment = (enrichment: RoleEnrichmentResult): string => {
  return JSON.stringify({
    userId: enrichment.userId,
    roles: enrichment.roles,
    primaryRole: enrichment.primaryRole,
    assignmentCount: enrichment.assignments.length,
    isAuthenticated: enrichment.isAuthenticated,
  }, null, 2);
};