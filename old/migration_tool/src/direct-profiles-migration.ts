import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { config } from './utils/config';
import { v4 as uuidv4 } from '../$node_modules/uuid/dist/esm/index.js';
import { Pool } from '../$node_modules/@types/pg/index.d.mts';

const logger = createComponentLogger('direct-profiles-migration');

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

async function directProfilesMigration(): Promise<void> {
  logger.info('🚀 DIRECT PROFILES MIGRATION - Phase 1 Execution');
  logger.info('==================================================');
  logger.info('Strategy: Direct migration without existing profile checks');
  logger.info('Target: All 9,101 profiles from legacy auth_user table');
  
  const legacyPool = await createLegacyConnection();

  try {
    // Test legacy connection
    logger.info('Testing legacy database connection...');
    const testResult = await legacyPool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM auth_user');
    logger.info('✅ Legacy DB connection successful:', testResult.rows[0]);
    
    // Fetch all legacy users
    logger.info('Fetching ALL legacy users from auth_user table...');
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
    
    logger.info(`📊 Found ${legacyUsers.length} legacy users to migrate`);
    
    if (legacyUsers.length === 0) {
      logger.error('❌ No legacy users found - cannot proceed');
      return;
    }
    
    // Get practice mapping (optional - if it fails, we continue without it)
    const practiceMapping = new Map<number, string>();
    try {
      logger.info('Attempting to build practice mapping...');
      const practiceQuery = `
        SELECT DISTINCT 
          od.doctor_id,
          p.id as practice_uuid
        FROM dispatch_office_doctors od
        JOIN practices p ON p.legacy_id = od.office_id
      `;
      
      const practiceResult = await legacyPool.query(practiceQuery);
      for (const row of practiceResult.rows) {
        practiceMapping.set(row.doctor_id, row.practice_uuid);
      }
      logger.info(`✅ Built practice mapping for ${practiceMapping.size} users`);
    } catch (error) {
      logger.warn('⚠️  Practice mapping failed, continuing without it:', error);
    }
    
    // Batch insert profiles
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let errors = 0;
    
    const supabase = getSupabaseClient();
    
    logger.info(`🔄 Starting batch migration with batch size: ${batchSize}`);
    
    for (let i = 0; i < legacyUsers.length; i += batchSize) {
      const batch = legacyUsers.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(legacyUsers.length / batchSize);
      
      logger.info(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} profiles)`);
      
      const profileRecords: ProfileRecord[] = batch.map(user => ({
        id: uuidv4(),
        email: user.email.toLowerCase(),
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: 'doctor', // Default role
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
      
      try {
        // Insert batch with upsert to handle any potential duplicates
        const { data, error } = await supabase
          .from('profiles')
          .upsert(profileRecords, { 
            onConflict: 'email',
            ignoreDuplicates: false 
          })
          .select('id');
        
        if (error) {
          logger.error(`❌ Batch ${batchNumber} failed:`, error);
          errors += batch.length;
        } else {
          const insertedCount = data?.length || 0;
          successful += insertedCount;
          logger.info(`✅ Batch ${batchNumber}: ${insertedCount}/${batch.length} profiles processed`);
        }
      } catch (batchError) {
        logger.error(`❌ Batch ${batchNumber} exception:`, batchError);
        errors += batch.length;
      }
      
      processed += batch.length;
      
      // Progress update
      const progress = Math.round((processed / legacyUsers.length) * 100);
      logger.info(`📈 Progress: ${processed}/${legacyUsers.length} (${progress}%)`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    logger.info('🏁 Migration batch processing completed');
    logger.info(`📊 Processing Results: ${successful} successful, ${errors} errors`);
    
    // Final validation
    logger.info('🔍 Performing final validation...');
    try {
      const { count: finalCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        logger.error('❌ Failed to get final count:', countError);
      } else {
        logger.info(`📈 Final profile count: ${finalCount || 0}`);
        
        const expectedTotal = legacyUsers.length;
        const successRate = Math.round(((finalCount || 0) / expectedTotal) * 100);
        
        if ((finalCount || 0) >= expectedTotal) {
          logger.info('🎉 SUCCESS: All profiles migrated successfully!');
          logger.info(`🎯 Target achieved: ${finalCount}/${expectedTotal} profiles (${successRate}%)`);
        } else {
          logger.warn(`⚠️  Partial migration: Expected ${expectedTotal} profiles, got ${finalCount || 0} (${successRate}%)`);
        }
        
        // Summary report
        logger.info('📋 PHASE 1 MIGRATION SUMMARY:');
        logger.info('===============================');
        logger.info(`   Phase: 1 - Profiles Migration`);
        logger.info(`   Status: ${(finalCount || 0) >= expectedTotal ? '✅ COMPLETED' : '⚠️  PARTIAL'}`);
        logger.info(`   Total Legacy Users: ${legacyUsers.length}`);
        logger.info(`   Final Profile Count: ${finalCount || 0}`);
        logger.info(`   Success Rate: ${successRate}%`);
        logger.info(`   Practice Associations: ${practiceMapping.size}`);
        
        if ((finalCount || 0) >= expectedTotal) {
          logger.info('🚀 Ready to proceed to Phase 2: Practices Migration');
        }
      }
    } catch (validationError) {
      logger.error('❌ Final validation failed:', validationError);
    }
    
  } catch (error) {
    logger.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await legacyPool.end();
  }
}

// Execute migration
if (require.main === module) {
  directProfilesMigration()
    .then(() => {
      logger.info('🎉 Direct profiles migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Direct migration failed:', error);
      process.exit(1);
    });
}

export { directProfilesMigration };