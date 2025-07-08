import { createClient } from '../../$node_modules/@supabase/supabase-js/dist/module/index.js';
import { logger } from '../utils/logger.js';
import { LegacyUser } from '../types/legacy-migration-types.js';

/**
 * Manages Supabase auth.users entries for migration
 * Creates auth.users records to satisfy foreign key constraints
 */
export class SupabaseAuthManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Create auth.users entries for legacy users to satisfy profiles foreign key constraint
   */
  async createAuthUsersForProfiles(users: LegacyUser[]): Promise<Map<string, string>> {
    logger.info(`🔐 Creating ${users.length} auth.users entries for profiles...`);
    
    const userIdMap = new Map<string, string>(); // legacy_user_id -> auth_user_id
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Generate a consistent UUID for this user
        const authUserId = user.uuid || `legacy-${user.id}`;
        
        // Create auth.users entry using admin API
        const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
          user_id: authUserId,
          email: user.email,
          email_confirm: true, // Skip email confirmation for migration
          user_metadata: {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            legacy_user_id: user.id,
            migrated_at: new Date().toISOString()
          }
        });

        if (authError) {
          // If user already exists, that's okay - just map the ID
          if (authError.message.includes('already registered')) {
            logger.debug(`✅ Auth user already exists for ${user.email}`);
            userIdMap.set(user.id.toString(), authUserId);
          } else {
            logger.error(`❌ Failed to create auth user for ${user.email}:`, authError.message);
            errors.push(`User ${user.id}: ${authError.message}`);
          }
        } else {
          logger.debug(`✅ Created auth user for ${user.email}`);
          userIdMap.set(user.id.toString(), authUser.user.id);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ Exception creating auth user for user ${user.id}:`, errorMsg);
        errors.push(`User ${user.id}: ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`⚠️  ${errors.length} auth user creation errors:`, errors.slice(0, 5));
    }

    logger.info(`✅ Successfully created/mapped ${userIdMap.size}/${users.length} auth users`);
    return userIdMap;
  }

  /**
   * Clean up auth.users entries created during migration (for testing)
   */
  async cleanupMigrationAuthUsers(userIds: string[]): Promise<void> {
    logger.info(`🧹 Cleaning up ${userIds.length} migration auth users...`);
    
    for (const userId of userIds) {
      try {
        const { error } = await this.supabase.auth.admin.deleteUser(userId);
        if (error) {
          logger.error(`❌ Failed to delete auth user ${userId}:`, error.message);
        }
      } catch (error) {
        logger.error(`❌ Exception deleting auth user ${userId}:`, error);
      }
    }
  }
}