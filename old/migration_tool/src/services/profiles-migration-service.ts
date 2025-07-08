import { createClient } from '../../$node_modules/@supabase/supabase-js/dist/module/index.js';
import { Client } from '../../$node_modules/@types/pg/index.d.mts';
import { createComponentLogger } from '../utils/logger';
import { v4 as uuidv4 } from '../../$node_modules/uuid/dist/esm/index.js';

const logger = createComponentLogger('profiles-migration-service');

interface LegacyUserData {
  id: number;
  email: string | null;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

interface LegacyPatientData {
  id: number;
  user_id: number;
  birthdate: string | null;
  sex: string | null;
  updated_at: string;
}

interface LegacyUserWithPatient extends LegacyUserData {
  patient?: LegacyPatientData;
}

interface ProfileRecord {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'doctor' | 'technician' | 'admin' | 'support';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    legacy_user_id: number;
    legacy_patient_id?: number | undefined;
    date_of_birth?: string | null | undefined;
    gender?: string | null | undefined;
    original_email?: string | null | undefined;
    migration_notes?: string[] | undefined;
  };
}

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: Array<{
    legacyId: number;
    error: string;
    severity: 'warning' | 'error';
  }>;
  duplicateEmails: number;
  emailConflictsResolved: number;
}

interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  handleEmailConflicts: boolean;
  generateFallbackEmails: boolean;
  skipInvalidRecords: boolean;
  dryRun: boolean;
}

export class ProfilesMigrationService {
  private supabase: ReturnType<typeof createClient>;
  private legacyDb: Client;
  private config: MigrationConfig;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    legacyDbConfig: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    },
    config: Partial<MigrationConfig> = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.legacyDb = new Client(legacyDbConfig);
    
    this.config = {
      batchSize: 100,
      maxRetries: 3,
      handleEmailConflicts: true,
      generateFallbackEmails: true,
      skipInvalidRecords: true,
      dryRun: false,
      ...config
    };
  }

  /**
   * Main migration method to migrate all profiles from legacy to Supabase
   */
  async migrateAllProfiles(): Promise<MigrationResult> {
    logger.info('Starting comprehensive profiles migration...');
    
    const result: MigrationResult = {
      success: false,
      totalProcessed: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: [],
      duplicateEmails: 0,
      emailConflictsResolved: 0
    };

    try {
      // Connect to legacy database
      await this.legacyDb.connect();
      logger.info('Connected to legacy database');

      // Get all legacy user and patient data
      const legacyData = await this.extractLegacyData();
      result.totalProcessed = legacyData.length;
      
      logger.info(`Found ${legacyData.length} profiles to migrate`);

      // Process in batches
      const batches = this.createBatches(legacyData, this.config.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;
        
        logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} profiles)`);
        
        const batchResult = await this.processBatch(batch);
        
        // Aggregate results
        result.successfulMigrations += batchResult.successfulMigrations;
        result.failedMigrations += batchResult.failedMigrations;
        result.errors.push(...batchResult.errors);
        result.duplicateEmails += batchResult.duplicateEmails;
        result.emailConflictsResolved += batchResult.emailConflictsResolved;
        
        // Log batch progress
        logger.info(`Batch ${i + 1} completed: ${batchResult.successfulMigrations} success, ${batchResult.failedMigrations} failed`);
      }

      result.success = result.failedMigrations === 0;
      
      logger.info('Migration completed', {
        totalProcessed: result.totalProcessed,
        successful: result.successfulMigrations,
        failed: result.failedMigrations,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Migration failed with critical error', error);
      result.success = false;
      result.errors.push({
        legacyId: -1,
        error: error instanceof Error ? error.message : 'Unknown critical error',
        severity: 'error'
      });
      return result;
    } finally {
      await this.legacyDb.end();
      logger.info('Legacy database connection closed');
    }
  }

  /**
   * Extract all user and patient data from legacy database
   */
  private async extractLegacyData(): Promise<LegacyUserWithPatient[]> {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.date_joined,
        u.last_login,
        p.id as patient_id,
        p.birthdate,
        p.sex,
        p.updated_at as patient_updated_at
      FROM auth_user u
      LEFT JOIN dispatch_patient p ON u.id = p.user_id
      ORDER BY u.id
    `;

    const result = await this.legacyDb.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      is_active: row.is_active,
      date_joined: row.date_joined,
      last_login: row.last_login,
      patient: row.patient_id ? {
        id: row.patient_id,
        user_id: row.id,
        birthdate: row.birthdate,
        sex: row.sex,
        updated_at: row.patient_updated_at
      } : undefined
    } as LegacyUserWithPatient));
  }

  /**
   * Create batches for processing
   */
  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of profiles
   */
  private async processBatch(
    batch: LegacyUserWithPatient[]
  ): Promise<Omit<MigrationResult, 'totalProcessed' | 'success'>> {
    const result = {
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: [] as Array<{ legacyId: number; error: string; severity: 'warning' | 'error' }>,
      duplicateEmails: 0,
      emailConflictsResolved: 0
    };

    // Transform legacy data to profile records
    const profiles: ProfileRecord[] = [];
    const emailTracker = new Map<string, number>();

    for (const legacyRecord of batch) {
      try {
        const profile = await this.transformLegacyRecord(legacyRecord, emailTracker);
        profiles.push(profile);
      } catch (error) {
        result.failedMigrations++;
        result.errors.push({
          legacyId: legacyRecord.id,
          error: error instanceof Error ? error.message : 'Transformation failed',
          severity: 'error'
        });
      }
    }

    // Insert profiles into Supabase
    if (!this.config.dryRun && profiles.length > 0) {
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .upsert(profiles as unknown as Record<string, unknown>[], {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select('id');

        if (error) {
          logger.error('Batch upsert failed', error);
          result.failedMigrations += profiles.length;
          result.errors.push({
            legacyId: -1,
            error: `Batch upsert failed: ${error.message}`,
            severity: 'error'
          });
        } else {
          result.successfulMigrations += data?.length || profiles.length;
          logger.debug(`Successfully inserted ${data?.length || profiles.length} profiles`);
        }
      } catch (error) {
        logger.error('Batch processing failed', error);
        result.failedMigrations += profiles.length;
        result.errors.push({
          legacyId: -1,
          error: error instanceof Error ? error.message : 'Batch processing failed',
          severity: 'error'
        });
      }
    } else if (this.config.dryRun) {
      result.successfulMigrations += profiles.length;
      logger.info(`DRY RUN: Would have inserted ${profiles.length} profiles`);
    }

    return result;
  }

  /**
   * Transform legacy record to profile record
   */
  private async transformLegacyRecord(
    legacyRecord: LegacyUserWithPatient,
    emailTracker: Map<string, number>
  ): Promise<ProfileRecord> {
    const migrationNotes: string[] = [];
    
    // Handle email conflicts and validation
    let email = this.cleanEmail(legacyRecord.email);
    
    if (!email) {
      if (this.config.generateFallbackEmails) {
        email = this.generateFallbackEmail(legacyRecord);
        migrationNotes.push('Generated fallback email due to missing original email');
      } else {
        email = null;
      }
    } else {
      // Check for duplicate emails
      const emailCount = emailTracker.get(email) || 0;
      if (emailCount > 0) {
        if (this.config.handleEmailConflicts) {
          const originalEmail = email;
          email = this.resolveEmailConflict(email, emailCount);
          migrationNotes.push(`Resolved email conflict: ${originalEmail} -> ${email}`);
        }
      }
      emailTracker.set(email, emailCount + 1);
    }

    // Validate required fields
    if (!legacyRecord.first_name || !legacyRecord.last_name) {
      if (this.config.skipInvalidRecords) {
        throw new Error('Missing required fields: first_name or last_name');
      }
    }

    // Determine role based on legacy data patterns
    const role = this.determineUserRole(legacyRecord);

    const profile: ProfileRecord = {
      id: uuidv4(),
      email,
      first_name: legacyRecord.first_name || 'Unknown',
      last_name: legacyRecord.last_name || 'User',
      phone: null, // Not available in legacy data
      avatar_url: null, // Not available in legacy data
      role,
      is_active: legacyRecord.is_active,
      created_at: legacyRecord.date_joined,
      updated_at: legacyRecord.patient?.updated_at || legacyRecord.date_joined,
      metadata: {
        legacy_user_id: legacyRecord.id,
        legacy_patient_id: legacyRecord.patient?.id || undefined,
        date_of_birth: legacyRecord.patient?.birthdate || undefined,
        gender: legacyRecord.patient?.sex || undefined,
        original_email: legacyRecord.email || undefined,
        migration_notes: migrationNotes.length > 0 ? migrationNotes : undefined
      }
    };

    return profile;
  }

  /**
   * Clean and validate email address
   */
  private cleanEmail(email: string | null): string | null {
    if (!email || email.trim() === '') {
      return null;
    }
    
    const cleaned = email.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Generate fallback email for users without valid emails
   */
  private generateFallbackEmail(legacyRecord: LegacyUserData): string {
    const firstName = legacyRecord.first_name?.toLowerCase().replace(/\s+/g, '') || 'user';
    const lastName = legacyRecord.last_name?.toLowerCase().replace(/\s+/g, '') || 'unknown';
    const legacyId = legacyRecord.id;
    
    return `${firstName}.${lastName}.${legacyId}@migrated.local`;
  }

  /**
   * Resolve email conflicts by appending a suffix
   */
  private resolveEmailConflict(email: string, conflictCount: number): string {
    const [localPart, domain] = email.split('@');
    return `${localPart}.${conflictCount}@${domain}`;
  }

  /**
   * Determine user role based on legacy data patterns
   */
  private determineUserRole(legacyRecord: LegacyUserWithPatient): 'doctor' | 'technician' | 'admin' | 'support' {
    // Default role assignment logic - can be enhanced based on business rules
    if (legacyRecord.patient) {
      return 'doctor'; // Users with patient records are likely doctors
    }
    
    // Check email patterns for role hints
    const email = legacyRecord.email?.toLowerCase();
    if (email) {
      if (email.includes('admin') || email.includes('support')) {
        return 'admin';
      }
      if (email.includes('tech') || email.includes('lab')) {
        return 'technician';
      }
    }
    
    return 'technician'; // Default role
  }

  /**
   * Get migration progress and statistics
   */
  async getMigrationStatus(): Promise<{
    legacyCount: number;
    supabaseCount: number;
    migrationGap: number;
    lastMigrationDate?: string;
  }> {
    try {
      // Get legacy count
      const legacyResult = await this.legacyDb.query('SELECT COUNT(*) as count FROM auth_user');
      const legacyCount = parseInt(legacyResult.rows[0].count);

      // Get Supabase count
      const { count: supabaseCount, error } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      // Get last migration date from metadata
      const { data: lastMigrated } = await this.supabase
        .from('profiles')
        .select('updated_at')
        .not('metadata->legacy_user_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);

      const lastMigrationDate = lastMigrated?.[0]?.updated_at as string | undefined;
      
      return {
        legacyCount,
        supabaseCount: supabaseCount || 0,
        migrationGap: legacyCount - (supabaseCount || 0),
        ...(lastMigrationDate && { lastMigrationDate })
      };
    } catch (error) {
      logger.error('Failed to get migration status', error);
      throw error;
    }
  }

  /**
   * Validate migrated data integrity
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      totalProfiles: number;
      profilesWithEmails: number;
      profilesWithFallbackEmails: number;
      duplicateEmails: number;
      missingRequiredFields: number;
    };
  }> {
    const issues: string[] = [];
    
    try {
      // Get all profiles
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('*');

      if (error) {
        throw error;
      }

      const statistics = {
        totalProfiles: profiles?.length || 0,
        profilesWithEmails: 0,
        profilesWithFallbackEmails: 0,
        duplicateEmails: 0,
        missingRequiredFields: 0
      };

      const emailCounts = new Map<string, number>();

      for (const profile of profiles || []) {
        // Check emails
        const email = profile['email'] as string | null;
        if (email) {
          statistics.profilesWithEmails++;
          
          if (email.includes('@migrated.local')) {
            statistics.profilesWithFallbackEmails++;
          }
          
          const count = emailCounts.get(email) || 0;
          emailCounts.set(email, count + 1);
        }

        // Check required fields
        const firstName = profile['first_name'] as string | null;
        const lastName = profile['last_name'] as string | null;
        if (!firstName || !lastName) {
          statistics.missingRequiredFields++;
        }
      }

      // Count duplicate emails
      for (const [email, count] of emailCounts) {
        if (count > 1) {
          statistics.duplicateEmails += count - 1;
          issues.push(`Duplicate email found: ${email} (${count} occurrences)`);
        }
      }

      // Validation checks
      if (statistics.missingRequiredFields > 0) {
        issues.push(`${statistics.missingRequiredFields} profiles missing required fields`);
      }

      if (statistics.duplicateEmails > 0) {
        issues.push(`${statistics.duplicateEmails} duplicate email addresses found`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        statistics
      };
    } catch (error) {
      logger.error('Migration validation failed', error);
      return {
        isValid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        statistics: {
          totalProfiles: 0,
          profilesWithEmails: 0,
          profilesWithFallbackEmails: 0,
          duplicateEmails: 0,
          missingRequiredFields: 0
        }
      };
    }
  }
}