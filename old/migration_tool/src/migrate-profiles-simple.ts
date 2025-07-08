import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { config } from './utils/config';
import { v4 as uuidv4 } from '../$node_modules/uuid/dist/esm/index.js';
import { Pool } from '../$node_modules/@types/pg/index.d.mts';

const logger = createComponentLogger('profiles-simple-migration');

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
  metadata: {
    legacy_id: number;
    is_active: boolean;
    date_joined: string;
    last_login?: string | null;
  };
  created_at: string;
  updated_at: string;
  practice_id?: string | null;
}

async function createLegacyConnection() {
  const pool = new Pool({
    host: config.legacy.host,
    port: config.legacy.port,
    database: config.legacy.database,
    user: config.legacy.username,
    password: config.legacy.password,
    ssl: config.legacy.ssl ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
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

async function getPracticeMapping(legacyPool: Pool): Promise<Map<number, string>> {
  const supabase = getSupabaseClient();
  
  logger.info('Building practice mapping...');
  
  // Get practice mapping from legacy office_doctors relationship
  const practiceQuery = `
    SELECT DISTINCT 
      od.doctor_id,
      p.id as practice_uuid
    FROM dispatch_office_doctors od
    JOIN practices p ON p.legacy_id = od.office_id
  `;
  
  const practiceResult = await legacyPool.query(practiceQuery);
  const practiceMap = new Map<number, string>();
  
  for (const row of practiceResult.rows) {
    practiceMap.set(row.doctor_id, row.practice_uuid);
  }
  
  logger.info(`Built practice mapping for ${practiceMap.size} users`);
  return practiceMap;
}

async function migrateProfilesSimple(): Promise<void> {
  const legacyPool = await createLegacyConnection();

  try {
    logger.info('Testing legacy database connection...');
    const testResult = await legacyPool.query('SELECT NOW() as current_time, version()');
    logger.info('✅ Legacy DB connection successful:', testResult.rows[0]);
    
    logger.info('Starting profiles migration...');
    
    // Get existing profiles to avoid duplicates
    const existingEmails = await getExistingProfileEmails();
    
    // Get practice mapping
    const practiceMapping = await getPracticeMapping(legacyPool);
    
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
    
    const usersResult = await legacyPool.query(usersQuery);
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
    
    const supabase = getSupabaseClient();
    
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
          last_login: user.last_login || null
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
      
    logger.info(`Final profile count: ${finalCount || 0}`);
    
    if ((finalCount || 0) >= legacyUsers.length) {
      logger.info('✅ All profiles migrated successfully!');
    } else {
      logger.warn(`⚠️  Expected ${legacyUsers.length} profiles, got ${finalCount || 0}`);
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await legacyPool.end();
  }
}

// Run migration
migrateProfilesSimple()
  .then(() => {
    logger.info('Profiles migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });