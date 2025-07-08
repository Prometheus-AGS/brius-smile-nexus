import { getSupabaseClient } from './services/db.service';
import { createComponentLogger } from './utils/logger';
import { config } from './utils/config';
import { v4 as uuidv4 } from '../$node_modules/uuid/dist/esm/index.js';
import { Pool } from '../$node_modules/@types/pg/index.d.mts';

const logger = createComponentLogger('profiles-debug-migration');

interface LegacyUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
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

async function testSupabaseConnection(): Promise<void> {
  const supabase = getSupabaseClient();
  logger.info('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('practices')
      .select('count')
      .limit(1);
    
    if (testError) {
      logger.error('Supabase connection test failed:', testError);
      throw testError;
    }
    
    logger.info('✅ Supabase connection successful');
    
    // Check if profiles table exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profileError) {
      logger.error('Profiles table access failed:', profileError);
      logger.info('This might mean the profiles table does not exist or has permission issues');
      throw profileError;
    }
    
    logger.info('✅ Profiles table accessible');
    
  } catch (error) {
    logger.error('Supabase test failed with detailed error:', {
      message: (error as Error).message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      stack: (error as Error).stack
    });
    throw error;
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
      logger.error('Failed to fetch existing profiles with detailed error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    const emails = new Set(data?.map(p => p.email.toLowerCase()) || []);
    logger.info(`Found ${emails.size} existing profiles`);
    return emails;
  } catch (error) {
    logger.error('getExistingProfileEmails failed:', error);
    throw error;
  }
}

async function migrateProfilesDebug(): Promise<void> {
  const legacyPool = await createLegacyConnection();

  try {
    logger.info('Testing legacy database connection...');
    const testResult = await legacyPool.query('SELECT NOW() as current_time, version()');
    logger.info('✅ Legacy DB connection successful:', testResult.rows[0]);
    
    // Test Supabase connection thoroughly
    await testSupabaseConnection();
    
    logger.info('Starting profiles migration...');
    
    // Get existing profiles to avoid duplicates
    const existingEmails = await getExistingProfileEmails();
    
    // Fetch a small sample of legacy users first
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
      LIMIT 10
    `;
    
    const usersResult = await legacyPool.query(usersQuery);
    const legacyUsers = usersResult.rows as LegacyUser[];
    
    logger.info(`Found ${legacyUsers.length} legacy users (sample)`);
    logger.info('Sample user:', legacyUsers[0]);
    
    // Filter out existing profiles
    const usersToMigrate = legacyUsers.filter(user => 
      !existingEmails.has(user.email.toLowerCase())
    );
    
    logger.info(`${usersToMigrate.length} new profiles to migrate (sample)`);
    
    if (usersToMigrate.length === 0) {
      logger.info('No new profiles to migrate in sample');
      return;
    }
    
    // Try to insert just one profile as a test
    const testUser = usersToMigrate[0];
    const supabase = getSupabaseClient();
    
    const profileRecord = {
      id: uuidv4(),
      email: testUser.email.toLowerCase(),
      first_name: testUser.first_name || '',
      last_name: testUser.last_name || '',
      role: 'doctor',
      metadata: {
        legacy_id: testUser.id,
        is_active: testUser.is_active,
        date_joined: testUser.date_joined,
        last_login: testUser.last_login || null
      },
      created_at: testUser.date_joined,
      updated_at: new Date().toISOString(),
      practice_id: null
    };
    
    logger.info('Attempting to insert test profile:', {
      email: profileRecord.email,
      legacy_id: profileRecord.metadata.legacy_id
    });
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileRecord])
      .select('id');
    
    if (error) {
      logger.error('Test profile insertion failed with detailed error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    logger.info('✅ Test profile inserted successfully:', data);
    
    // Final validation
    const { count: finalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    logger.info(`Final profile count: ${finalCount || 0}`);
    
  } catch (error) {
    logger.error('Migration failed with detailed error:', {
      message: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint
    });
    throw error;
  } finally {
    await legacyPool.end();
  }
}

// Run migration
migrateProfilesDebug()
  .then(() => {
    logger.info('Debug migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Debug migration failed:', error);
    process.exit(1);
  });