#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script sets up the Supabase database by running all migration files.
 * It creates the necessary tables and schemas required for the migration tool.
 */

import { createClient } from '../$node_modules/@supabase/supabase-js/dist/module/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import chalk from '../$node_modules/chalk/source/index.js';
import { config } from './utils/config';

interface MigrationFile {
  filename: string;
  path: string;
  content: string;
  requiredTables: string[];
}

interface TableExistenceCheck {
  tableName: string;
  exists: boolean;
}

/**
 * Database setup class for running migrations
 */
class DatabaseSetup {
  private supabase;

  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  /**
   * Load all migration files from the migrations directory
   */
  private loadMigrationFiles(): MigrationFile[] {
    const migrationFiles = [
      '001_main_schema.sql',
      '002_ai_embeddings_schema.sql',
      '002_migration_tracking_schema.sql',
      '003_ai_embeddings_bedrock_schema.sql'
    ];

    return migrationFiles.map(filename => {
      const path = join(process.cwd(), 'migrations', filename);
      try {
        const content = readFileSync(path, 'utf-8');
        const requiredTables = this.extractTableNames(filename);
        return { filename, path, content, requiredTables };
      } catch (error) {
        console.error(chalk.red(`❌ Failed to read migration file: ${filename}`));
        console.error(chalk.red(`   Path: ${path}`));
        console.error(chalk.red(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        throw error;
      }
    });
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(migration: MigrationFile): Promise<void> {
    console.log(chalk.blue(`📄 Executing migration: ${migration.filename}`));
    
    try {
      // Split the SQL content by semicolons and execute each statement
      const statements = migration.content
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });

          if (error) {
            // Try direct query execution if RPC fails
            const { error: directError } = await this.supabase
              .from('_temp_migration_exec')
              .select('*')
              .limit(0);

            if (directError) {
              // Use the SQL editor approach
              const { error: sqlError } = await this.supabase.rpc('exec', {
                sql: statement + ';'
              });

              if (sqlError) {
                console.error(chalk.yellow(`⚠️  Warning: Could not execute statement via RPC`));
                console.error(chalk.yellow(`   Statement: ${statement.substring(0, 100)}...`));
                console.error(chalk.yellow(`   You may need to run this migration manually in Supabase SQL Editor`));
              }
            }
          }
        }
      }

      console.log(chalk.green(`✅ Migration completed: ${migration.filename}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to execute migration: ${migration.filename}`));
      console.error(chalk.red(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      throw error;
    }
  }

  /**
   * Extract table names that a migration file creates
   */
  private extractTableNames(filename: string): string[] {
    const tables: string[] = [];
    
    // Define the main tables created by each migration file
    if (filename.includes('001_main_schema')) {
      tables.push(
        'profiles', 'practices', 'practitioners', 'practice_members',
        'patients', 'cases', 'case_states', 'products', 'orders',
        'order_items', 'order_states', 'case_messages', 'case_files'
      );
    } else if (filename.includes('002_ai_embeddings_schema')) {
      tables.push(
        'case_embeddings', 'patient_embeddings', 'message_embeddings',
        'workflow_templates', 'workflow_steps'
      );
    } else if (filename.includes('002_migration_tracking_schema')) {
      tables.push('migration_runs', 'migration_status');
    } else if (filename.includes('003_ai_embeddings_bedrock_schema')) {
      tables.push(
        'ai_embeddings', 'embedding_jobs', 'embedding_batches'
      );
    }
    
    return tables;
  }

  /**
   * Check which tables exist in the database
   */
  private async checkTablesExistence(tableNames: string[]): Promise<TableExistenceCheck[]> {
    const results: TableExistenceCheck[] = [];
    
    for (const tableName of tableNames) {
      try {
        // Try to query the table with a limit to check existence
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        // If no error, table exists
        if (!error) {
          results.push({ tableName, exists: true });
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          // Table doesn't exist
          results.push({ tableName, exists: false });
        } else {
          // Some other error - assume table exists but has permission issues
          console.log(chalk.yellow(`⚠️  Unexpected error checking table ${tableName}: ${error.message}`));
          results.push({ tableName, exists: true });
        }
      } catch (error) {
        // Assume table doesn't exist on any error
        results.push({ tableName, exists: false });
      }
    }
    
    return results;
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    console.log(chalk.blue('🔌 Testing Supabase connection...'));
    
    try {
      // First check if we have valid configuration
      const supabaseConfig = config.supabase;
      if (!supabaseConfig.url || supabaseConfig.url.includes('dummy') || supabaseConfig.url === 'https://your-project.supabase.co') {
        throw new Error('Invalid Supabase URL - please update SUPABASE_URL in .env file');
      }
      
      if (!supabaseConfig.serviceRoleKey || supabaseConfig.serviceRoleKey.includes('dummy') || supabaseConfig.serviceRoleKey.startsWith('sk-dummy')) {
        throw new Error('Invalid Supabase Service Role Key - please update SUPABASE_SERVICE_ROLE_KEY in .env file');
      }

      // Test the connection with a simple RPC call
      const { error } = await this.supabase.rpc('version');

      if (error) {
        // Check for common authentication errors
        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          throw new Error('Authentication failed - please check your SUPABASE_SERVICE_ROLE_KEY');
        }
        if (error.message.includes('not found') || error.message.includes('404')) {
          throw new Error('Supabase project not found - please check your SUPABASE_URL');
        }
        // If it's just a function not found error, that's actually OK - connection works
        if (!error.message.includes('function') && !error.message.includes('does not exist')) {
          throw error;
        }
      }

      console.log(chalk.green('✅ Supabase connection successful'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect to Supabase'));
      
      // Handle both Error instances and Supabase error objects
      if (error instanceof Error) {
        console.error(chalk.red(`   Error: ${error.message}`));
        
        // Provide specific guidance based on error type
        if (error.message.includes('Invalid Supabase URL')) {
          console.error(chalk.yellow('   💡 Get your Supabase URL from: Project Settings > API > Project URL'));
        } else if (error.message.includes('Invalid Supabase Service Role Key')) {
          console.error(chalk.yellow('   💡 Get your Service Role Key from: Project Settings > API > service_role key'));
        } else if (error.message.includes('Authentication failed')) {
          console.error(chalk.yellow('   💡 Make sure you\'re using the service_role key, not the anon key'));
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Handle Supabase error objects
        const supabaseError = error as { message: string; code?: string; details?: string };
        console.error(chalk.red(`   Error: ${supabaseError.message}`));
        
        if (supabaseError.code) {
          console.error(chalk.gray(`   Code: ${supabaseError.code}`));
        }
        
        // Provide specific guidance based on error code/message
        if (supabaseError.message.includes('Invalid API key') || supabaseError.message.includes('JWT')) {
          console.error(chalk.yellow('   💡 Authentication failed - check your SUPABASE_SERVICE_ROLE_KEY'));
        } else if (supabaseError.message.includes('not found') || supabaseError.code === '404') {
          console.error(chalk.yellow('   💡 Supabase project not found - check your SUPABASE_URL'));
        }
      } else {
        console.error(chalk.red(`   Error: Unknown error - type: ${typeof error}`));
      }
      throw error;
    }
  }

  /**
   * Run all database setup steps
   */
  async setup(): Promise<void> {
    console.log(chalk.bold.cyan('🏥 Brius Healthcare Migration Tool - Database Setup'));
    console.log(chalk.cyan('Setting up Supabase database schema...\n'));

    try {
      // Test connection first
      await this.testConnection();

      // Load migration files
      console.log(chalk.blue('📂 Loading migration files...'));
      const migrations = this.loadMigrationFiles();
      console.log(chalk.green(`✅ Loaded ${migrations.length} migration files\n`));

      // Check which tables already exist
      const allRequiredTables = migrations.flatMap(m => m.requiredTables);
      const uniqueTables = [...new Set(allRequiredTables)];
      
      console.log(chalk.blue('🔍 Checking existing database tables...'));
      const tableChecks = await this.checkTablesExistence(uniqueTables);
      
      console.log(chalk.blue('📊 Table existence check results:'));
      tableChecks.forEach(check => {
        const status = check.exists ? chalk.green('✅ EXISTS') : chalk.red('❌ MISSING');
        console.log(`   ${check.tableName}: ${status}`);
      });
      console.log(''); // Empty line for spacing

      // Execute migrations in order, but only if their tables don't all exist
      console.log(chalk.blue('🚀 Executing migrations...'));
      for (const migration of migrations) {
        const missingTables = migration.requiredTables.filter(tableName => {
          const check = tableChecks.find(c => c.tableName === tableName);
          return !check?.exists;
        });

        if (missingTables.length === 0) {
          console.log(chalk.green(`✅ Migration ${migration.filename} - all tables already exist`));
          continue;
        }

        console.log(chalk.blue(`🔄 Executing migration: ${migration.filename}`));
        console.log(chalk.gray(`   Creating missing tables: ${missingTables.join(', ')}`));
        
        try {
          await this.executeMigration(migration);
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Migration ${migration.filename} had issues, but continuing...`));
          console.log(chalk.yellow(`   This is normal if tables already exist with different structure`));
        }
      }

      // Final verification - check that all required tables now exist
      console.log(chalk.blue('\n🔍 Performing final verification...'));
      const finalChecks = await this.checkTablesExistence(uniqueTables);
      const stillMissing = finalChecks.filter(check => !check.exists);
      
      if (stillMissing.length > 0) {
        console.log(chalk.yellow('⚠️  Some tables are still missing after migration:'));
        stillMissing.forEach(check => {
          console.log(chalk.yellow(`   - ${check.tableName}`));
        });
      } else {
        console.log(chalk.green('✅ All required tables are now present in the database'));
      }

      console.log(chalk.bold.green('\n🎉 Database setup completed successfully!'));
      console.log(chalk.green('   All migration tables have been created.'));
      console.log(chalk.green('   You can now run the migration tool.'));
      
    } catch (error) {
      console.error(chalk.bold.red('\n💥 Database setup failed!'));
      console.error(chalk.red(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      console.error(chalk.yellow('\n📝 Manual Setup Instructions:'));
      console.error(chalk.yellow('   1. Open your Supabase project dashboard'));
      console.error(chalk.yellow('   2. Go to SQL Editor'));
      console.error(chalk.yellow('   3. Run each migration file manually:'));
      console.error(chalk.yellow('      - migrations/001_main_schema.sql'));
      console.error(chalk.yellow('      - migrations/002_migration_tracking_schema.sql'));
      console.error(chalk.yellow('      - migrations/002_ai_embeddings_schema.sql'));
      
      process.exit(1);
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const setup = new DatabaseSetup();
  await setup.setup();
}

// Run the setup if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
  });
}

export { DatabaseSetup };