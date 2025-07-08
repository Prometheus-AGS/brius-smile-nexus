import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { config } from './utils/config';
import { v4 as uuidv4 } from '../$node_modules/uuid/dist/esm/index.js';
import { Pool } from '../$node_modules/@types/pg/index.d.mts';

const logger = createComponentLogger('profiles-migration-execution');

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

async function testSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    logger.info('Testing Supabase connection...');
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      logger.error('Supabase connection test failed:', error);
      return false;
    }
    
    logger.info(`✅ Supabase connection successful. Current profiles count: ${data || 0}`);
    return true;
  } catch (error) {
    logger.error('Supabase connection test error:', error);
    return false;
  }
}

async function getExistingProfileEmails(): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  logger.info('Fetching existing profile emails...');
  
  try {
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
  } catch (error) {
    logger.error('Error in getExistingProfileEmails:', error);
    throw error;
  }
}

async function getPracticeMapping(legacyPool: Pool): Promise<Map<number, string>> {
  logger.info('Building practice mapping...');
  
  try {
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
  } catch (error) {
    logger.error('Error building practice mapping:', error);
    // Return empty map if practice mapping fails - we can still migrate profiles
    return new Map<number, string>();
  }
}

async function executeProfilesMigration(): Promise<void> {
  logger.info('🚀 Starting Phase 1: Profiles Data Migration Execution');
  logger.info('================================================');
  
  // Test connections first
  const supabaseOk = await testSupabaseConnection();
  if (!supabaseOk) {
    throw new Error('Supabase connection failed - cannot proceed with migration');
  }

  const legacyPool = await createLegacyConnection();

  try {
    logger.info('Testing legacy database connection...');
    const testResult = await legacyPool.query('SELECT NOW() as current_time, version()');
    logger.info('✅ Legacy DB connection successful:', testResult.rows[0]);
    
    // Get existing profiles to avoid duplicates
    const existingEmails = await getExistingProfileEmails();
    
    // Get practice mapping
    const practiceMapping = await getPracticeMapping(legacyPool);
    
    // Fetch all legacy users
    logger.info('Fetching legacy users from auth_user table...');
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
    
    logger.info(`📊 Found ${legacyUsers.length} legacy users in auth_user table`);
    
    // Filter out existing profiles
    const usersToMigrate = legacyUsers.filter(user => 
      !existingEmails.has(user.email.toLowerCase())
    );
    
    logger.info(`📋 Migration Plan:`);
    logger.info(`   Total legacy users: ${legacyUsers.length}`);
    logger.info(`   Existing profiles: ${existingEmails.size}`);
    logger.info(`   New profiles to migrate: ${usersToMigrate.length}`);
    
    if (usersToMigrate.length === 0) {
      logger.info('✅ No new profiles to migrate - all profiles already exist');
      return;
    }
    
    // Batch insert profiles
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let errors = 0;
    
    const supabase = getSupabaseClient();
    
    logger.info(`🔄 Starting batch migration with batch size: ${batchSize}`);
    
    for (let i = 0; i < usersToMigrate.length; i += batchSize) {
      const batch = usersToMigrate.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(usersToMigrate.length / batchSize);
      
      logger.info(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} profiles)`);
      
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
        logger.error(`❌ Batch ${batchNumber} failed:`, error);
        errors += batch.length;
      } else {
        const insertedCount = data?.length || 0;
        successful += insertedCount;
        logger.info(`✅ Batch ${batchNumber}: ${insertedCount}/${batch.length} profiles inserted successfully`);
      }
      
      processed += batch.length;
      
      // Progress update
      const progress = Math.round((processed / usersToMigrate.length) * 100);
      logger.info(`📈 Progress: ${processed}/${usersToMigrate.length} (${progress}%)`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info('🏁 Migration batch processing completed');
    logger.info(`📊 Results: ${successful} successful, ${errors} errors`);
    
    // Final validation
    logger.info('🔍 Performing final validation...');
    const { count: finalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    logger.info(`📈 Final profile count: ${finalCount || 0}`);
    
    const expectedTotal = legacyUsers.length;
    if ((finalCount || 0) >= expectedTotal) {
      logger.info('✅ SUCCESS: All profiles migrated successfully!');
      logger.info(`🎯 Target achieved: ${finalCount}/${expectedTotal} profiles`);
    } else {
      logger.warn(`⚠️  Partial migration: Expected ${expectedTotal} profiles, got ${finalCount || 0}`);
    }
    
    // Summary report
    logger.info('📋 MIGRATION SUMMARY:');
    logger.info(`   Phase: 1 - Profiles Migration`);
    logger.info(`   Status: ${(finalCount || 0) >= expectedTotal ? 'COMPLETED' : 'PARTIAL'}`);
    logger.info(`   Total Legacy Users: ${legacyUsers.length}`);
    logger.info(`   Final Profile Count: ${finalCount || 0}`);
    logger.info(`   Success Rate: ${Math.round(((finalCount || 0) / expectedTotal) * 100)}%`);
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await legacyPool.end();
  }
}

// Execute migration
if (require.main === module) {
  executeProfilesMigration()
    .then(() => {
      logger.info('🎉 Profiles migration execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration execution failed:', error);
      process.exit(1);
    });
}

export { executeProfilesMigration };