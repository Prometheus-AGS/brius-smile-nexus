import { MastraClient } from "@mastra/client-js";
import type { User } from '@/types/auth';

/**
 * User context interface for Mastra operations
 */
export interface MastraUserContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  companyId: string;
  permissions: string[];
  timezone: string;
  defaultDashboard?: string;
  refreshInterval: number;
}

/**
 * Enhanced Mastra client with user context
 */
export class MastraClientWithContext {
  public readonly client: MastraClient;
  public readonly userContext: MastraUserContext | null;

  constructor(client: MastraClient, userContext: MastraUserContext | null = null) {
    this.client = client;
    this.userContext = userContext;
  }

  /**
   * Get user context for operations that need it
   */
  getUserContext(): MastraUserContext | null {
    return this.userContext;
  }

  /**
   * Get user context as metadata object for API calls
   */
  getUserMetadata(): Record<string, string | number | string[] | undefined> {
    if (!this.userContext) return {};
    
    return {
      userId: this.userContext.userId,
      userName: this.userContext.userName,
      userEmail: this.userContext.userEmail,
      userRole: this.userContext.userRole,
      companyId: this.userContext.companyId,
      permissions: this.userContext.permissions,
      timezone: this.userContext.timezone,
      defaultDashboard: this.userContext.defaultDashboard,
      refreshInterval: this.userContext.refreshInterval,
    };
  }

  // Proxy all MastraClient methods
  getAgent(agentId: string) {
    return this.client.getAgent(agentId);
  }

  getAgents() {
    return this.client.getAgents();
  }

  getWorkflow(workflowId: string) {
    return this.client.getWorkflow(workflowId);
  }

  // Add other methods as needed...
}

/**
 * Create a Mastra client with user context
 */
export const createMastraClient = (user?: User | null): MastraClientWithContext => {
  const baseConfig = {
    baseUrl: import.meta.env.VITE_MASTRA_API_URL || "http://localhost:4111",
    retries: 3,
    backoffMs: 300,
    maxBackoffMs: 5000,
  };

  const client = new MastraClient(baseConfig);

  // Create user context if user is provided
  if (user) {
    // Extract user name from various possible sources
    const userName = user.name || 
                    user.user_metadata?.name || 
                    user.user_metadata?.full_name || 
                    user.user_metadata?.display_name ||
                    user.email?.split('@')[0] || 
                    'Unknown User';

    const userContext: MastraUserContext = {
      userId: user.id,
      userName,
      userEmail: user.email,
      userRole: user.role || user.user_metadata?.role || 'user',
      companyId: user.user_metadata?.company_id || 'default',
      permissions: user.permissions || user.user_metadata?.permissions || [],
      timezone: user.user_metadata?.timezone || 'UTC',
      defaultDashboard: user.user_metadata?.default_dashboard,
      refreshInterval: user.user_metadata?.refresh_interval || 30000,
    };

    return new MastraClientWithContext(client, userContext);
  }

  return new MastraClientWithContext(client, null);
};

// Default client for backward compatibility
export const mastraClient = createMastraClient();
