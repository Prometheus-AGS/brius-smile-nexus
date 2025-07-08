import { createLegacyConnection } from './services/legacy-migration-connection-manager';
import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createComponentLogger('profiles-only-migration');

interface LegacyUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

interface ProfileRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  practice_id?: string;
}

async function getExistingProfileEmails(): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  logger.info('Fetching existing profile emails...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('email');
    
  if (error) {
    logger.error('Failed to fetch existing profiles:', error);
    throw error;
  }
  
  const emails = new Set(data?.map(p => p.email.toLowerCase()) || []);
  logger.info(`Found ${emails.size} existing profiles`);
  return emails;
}

async function getPracticeMapping(): Promise<Map<number, string>> {
  const supabase = getSupabaseClient();
  const legacyConnection = await createLegacyConnection();
  
  logger.info('Building practice mapping...');
  
  // Get practice mapping from legacy office_doctors relationship
  const practiceQuery = `
    SELECT DISTINCT 
      od.doctor_id,
      p.id as practice_uuid
    FROM dispatch_office_doctors od
    JOIN practices p ON p.legacy_id = od.office_id
  `;
  
  const practiceResult = await legacyConnection.query(practiceQuery);
  const practiceMap = new Map<number, string>();
  
  for (const row of practiceResult.rows) {
    practiceMap.set(row.doctor_id, row.practice_uuid);
  }
  
  logger.info(`Built practice mapping for ${practiceMap.size} users`);
  return practiceMap;
}

async function migrateProfilesOnly(): Promise<void> {
  const legacyConnection = await createLegacyConnection();
  const supabase = getSupabaseClient();
  
  try {
    logger.info('Starting profiles-only migration...');
    
    // Get existing profiles to avoid duplicates
    const existingEmails = await getExistingProfileEmails();
    
    // Get practice mapping
    const practiceMapping = await getPracticeMapping();
    
    // Fetch all legacy users
    const usersQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        is_active,
        date_joined,
        last_login
      FROM auth_user 
      ORDER BY id
    `;
    
    const usersResult = await legacyConnection.query(usersQuery);
    const legacyUsers = usersResult.rows as LegacyUser[];
    
    logger.info(`Found ${legacyUsers.length} legacy users`);
    
    // Filter out existing profiles
    const usersToMigrate = legacyUsers.filter(user => 
      !existingEmails.has(user.email.toLowerCase())
    );
    
    logger.info(`${usersToMigrate.length} new profiles to migrate`);
    
    if (usersToMigrate.length === 0) {
      logger.info('No new profiles to migrate');
      return;
    }
    
    // Batch insert profiles
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let errors = 0;
    
    for (let i = 0; i < usersToMigrate.length; i += batchSize) {
      const batch = usersToMigrate.slice(i, i + batchSize);
      
      const profileRecords: ProfileRecord[] = batch.map(user => ({
        id: uuidv4(),
        email: user.email.toLowerCase(),
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: 'doctor', // Default role, can be updated later
        metadata: {
          legacy_id: user.id,
          is_active: user.is_active,
          date_joined: user.date_joined,
          last_login: user.last_login
        },
        created_at: user.date_joined,
        updated_at: new Date().toISOString(),
        practice_id: practiceMapping.get(user.id) || null
      }));
      
      // Insert batch with ON CONFLICT DO NOTHING
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileRecords)
        .select('id');
      
      if (error) {
        logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        errors += batch.length;
      } else {
        const insertedCount = data?.length || 0;
        successful += insertedCount;
        logger.info(`Batch ${Math.floor(i/batchSize) + 1}: ${insertedCount}/${batch.length} profiles inserted`);
      }
      
      processed += batch.length;
      
      // Progress update
      const progress = Math.round((processed / usersToMigrate.length) * 100);
      logger.info(`Progress: ${processed}/${usersToMigrate.length} (${progress}%)`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info(`Migration completed: ${successful} successful, ${errors} errors`);
    
    // Final validation
    const { count: finalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    logger.info(`Final profile count: ${finalCount}`);
    
    if (finalCount >= legacyUsers.length) {
      logger.info('✅ All profiles migrated successfully!');
    } else {
      logger.warn(`⚠️  Expected ${legacyUsers.length} profiles, got ${finalCount}`);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await legacyConnection.end();
  }
}

// Run migration
migrateProfilesOnly()
  .then(() => {
    logger.info('Profiles-only migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
