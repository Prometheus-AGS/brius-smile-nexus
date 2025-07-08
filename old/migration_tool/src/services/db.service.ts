
import { createClient, SupabaseClient } from '../../$node_modules/@supabase/supabase-js/dist/module/index.js';
import { config } from '../utils/config';
import { createComponentLogger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';

const logger = createComponentLogger('db-service');

let supabase: SupabaseClient;


/**
 * Returns a singleton instance of the Supabase client.
 * @returns {SupabaseClient} The Supabase client.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const { url, serviceRoleKey } = config.supabase;
    if (!url || !serviceRoleKey) {
      logger.error('Supabase URL or service key is not configured.');
      throw new Error('Supabase URL or service key is not configured.');
    }
    supabase = createClient(url, serviceRoleKey);
  }
  return supabase;
}

/**
 * Executes a SQL script file against the Supabase database.
 * @param {string} scriptName - The name of the script file in `server/migrations`.
 */
async function executeSupabaseScript(scriptName: string) {
  const supabase = getSupabaseClient();
  const scriptPath = path.join(
    __dirname,
    '..',
    'migrations',
    scriptName
  );
  try {
    const script = await fs.readFile(scriptPath, 'utf8');
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: script,
    });
    if (error) {
      logger.error(`Error executing Supabase script ${scriptName}:`, error);
      throw error;
    }
    logger.info(`Supabase script ${scriptName} executed successfully.`);
  } catch (err) {
    logger.error(
      `Failed to read or execute Supabase script ${scriptName}`,
      err as Error
    );
    throw err;
  }
}

/**
 * Initializes the main application schema in the Supabase database.
 */
export async function initializeSchema(): Promise<void> {
  logger.info('Initializing database schema...');
  await executeSupabaseScript('001_main_schema.sql');
  logger.info('Main schema initialized.');
}

/**
 * Initializes the migration tracking schema in the Supabase database.
 */
export async function initializeMigrationTracking(): Promise<void> {
  logger.info('Initializing migration tracking schema...');
  await executeSupabaseScript('002_migration_tracking_schema.sql');
  logger.info('Migration tracking schema initialized.');
}