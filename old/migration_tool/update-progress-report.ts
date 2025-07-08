import { getSupabaseClient } from './src/services/db.service';
import { LegacyMigrationConnectionManager } from './src/services/legacy-migration-connection-manager';
import { createComponentLogger } from './src/utils/logger';
import { DatabaseConfig } from './src/types/legacy-migration-types';
import { Pool } from './$node_modules/@types/pg/index.d.mts';
import * as fs from 'fs';
import * as path from 'path';

const logger = createComponentLogger('progress-tracker');

interface EntityProgress {
  entityType: string;
  expectedCount: number;
  currentCount: number;
  remaining: number;
  progressPercentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completedAt?: string;
  errors?: string[];
}

interface MigrationProgress {
  lastUpdated: string;
  overallProgress: number;
  phases: EntityProgress[];
  totalRecords: {
    expected: number;
    migrated: number;
    remaining: number;
  };
}

/**
 * Migration Progress Tracker
 *
 * This script queries the current database state and updates the migration
 * progress report with accurate counts and status for each entity type.
 */
class MigrationProgressTracker {
  private supabase = getSupabaseClient();
  private connectionManager: LegacyMigrationConnectionManager | null = null;

  async initialize(): Promise<void> {
    // Initialize connection manager with environment variables
    const legacyConfig: DatabaseConfig = {
      host: process.env.LEGACY_DB_HOST || 'localhost',
      port: parseInt(process.env.LEGACY_DB_PORT || '5432'),
      database: process.env.LEGACY_DB_NAME || 'legacy_db',
      username: process.env.LEGACY_DB_USER || 'postgres',
      password: process.env.LEGACY_DB_PASSWORD || '',
      ssl: process.env.LEGACY_DB_SSL === 'true'
    };

    const supabaseConfig: DatabaseConfig = {
      host: process.env.SUPABASE_DB_HOST || 'localhost',
      port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      username: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || '',
      ssl: process.env.SUPABASE_DB_SSL !== 'false'
    };

    this.connectionManager = new LegacyMigrationConnectionManager(
      legacyConfig,
      supabaseConfig,
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    await this.connectionManager.initialize();
    logger.info('Migration Progress Tracker initialized');
  }

  async cleanup(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.cleanup();
    }
  }

  /**
   * Get expected counts from legacy database
   */
  async getLegacyCounts(): Promise<Record<string, number>> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized');
    }

    logger.info('Fetching legacy database counts...');

    const queries = {
      practices: 'SELECT COUNT(*) as count FROM dispatch_office',
      profiles: 'SELECT COUNT(*) as count FROM auth_user',
      patients: 'SELECT COUNT(*) as count FROM dispatch_patient',
      cases: 'SELECT COUNT(*) as count FROM dispatch_project', // Project-centric
      projects: 'SELECT COUNT(*) as count FROM dispatch_project', // Same source, different target
      practice_members: 'SELECT COUNT(*) as count FROM dispatch_office_doctors',
      case_states: 'SELECT COUNT(*) as count FROM dispatch_state',
      workflow_templates: 'SELECT COUNT(*) as count FROM dispatch_template'
    };

    const counts: Record<string, number> = {};

    for (const [entity, query] of Object.entries(queries)) {
      try {
        const result = await this.connectionManager.queryLegacy<{ count: string }>(query);
        counts[entity] = parseInt(result.rows[0]?.count || '0');
        logger.info(`Legacy ${entity}: ${counts[entity]}`);
      } catch (error) {
        logger.error(`Failed to get legacy count for ${entity}:`, error);
        counts[entity] = 0;
      }
    }

    return counts;
  }

  /**
   * Get current counts from Supabase database
   */
  async getCurrentCounts(): Promise<Record<string, number>> {
    logger.info('Fetching current database counts...');

    const tables = [
      'practices',
      'profiles', 
      'patients',
      'cases',
      'projects',
      'practice_members',
      'case_states',
      'workflow_templates',
      'ai_embeddings'
    ];

    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          logger.error(`Failed to count ${table}:`, error);
          counts[table] = 0;
        } else {
          counts[table] = count || 0;
          logger.info(`Current ${table}: ${counts[table]}`);
        }
      } catch (error) {
        logger.error(`Failed to query ${table}:`, error);
        counts[table] = 0;
      }
    }

    return counts;
  }

  /**
   * Validate data integrity for each entity type
   */
  async validateDataIntegrity(): Promise<Record<string, string[]>> {
    logger.info('Validating data integrity...');

    const validationErrors: Record<string, string[]> = {};

    // Validate profiles
    try {
      const { data: duplicateEmails } = await this.supabase
        .from('profiles')
        .select('email')
        .then(({ data }) => {
          if (!data) return { data: [] };
          const emails = data.map(p => p.email);
          const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
          return { data: [...new Set(duplicates)] };
        });

      if (duplicateEmails && duplicateEmails.length > 0) {
        validationErrors.profiles = [`${duplicateEmails.length} duplicate emails found`];
      }
    } catch (error) {
      logger.error('Profile validation failed:', error);
      validationErrors.profiles = ['Validation query failed'];
    }

    // Validate foreign key relationships
    const relationshipChecks = [
      {
        entity: 'patients',
        check: 'practice_id IS NULL',
        error: 'Patients without practice association'
      },
      {
        entity: 'cases', 
        check: 'patient_id IS NULL',
        error: 'Cases without patient association'
      },
      {
        entity: 'projects',
        check: 'case_id IS NULL', 
        error: 'Projects without case association'
      },
      {
        entity: 'practice_members',
        check: 'practice_id IS NULL OR profile_id IS NULL',
        error: 'Practice members with missing associations'
      }
    ];

    for (const { entity, check, error } of relationshipChecks) {
      try {
        const { count } = await this.supabase
          .from(entity)
          .select('*', { count: 'exact', head: true })
          .or(check);

        if (count && count > 0) {
          if (!validationErrors[entity]) validationErrors[entity] = [];
          validationErrors[entity].push(`${count} records: ${error}`);
        }
      } catch (validationError) {
        logger.error(`Validation failed for ${entity}:`, validationError);
        if (!validationErrors[entity]) validationErrors[entity] = [];
        validationErrors[entity].push('Validation query failed');
      }
    }

    return validationErrors;
  }

  /**
   * Determine status for each entity based on counts and validation
   */
  determineStatus(expected: number, current: number, errors: string[]): EntityProgress['status'] {
    if (errors && errors.length > 0) return 'failed';
    if (current === 0) return 'not_started';
    if (current >= expected) return 'completed';
    return 'in_progress';
  }

  /**
   * Generate migration progress data
   */
  async generateProgressData(): Promise<MigrationProgress> {
    const legacyCounts = await this.getLegacyCounts();
    const currentCounts = await this.getCurrentCounts();
    const validationErrors = await this.validateDataIntegrity();

    // AI embeddings expected count (estimated)
    const totalContentRecords = currentCounts.cases + currentCounts.projects + currentCounts.patients;
    const expectedAiEmbeddings = totalContentRecords * 2; // Rough estimate

    const entityConfigs = [
      { key: 'practices', name: 'Practices', expected: legacyCounts.practices },
      { key: 'profiles', name: 'Profiles', expected: legacyCounts.profiles },
      { key: 'patients', name: 'Patients', expected: legacyCounts.patients },
      { key: 'cases', name: 'Cases', expected: legacyCounts.cases },
      { key: 'projects', name: 'Projects', expected: legacyCounts.projects },
      { key: 'practice_members', name: 'Practice Members', expected: legacyCounts.practice_members },
      { key: 'case_states', name: 'Case States', expected: legacyCounts.case_states },
      { key: 'workflow_templates', name: 'Workflow Templates', expected: legacyCounts.workflow_templates },
      { key: 'ai_embeddings', name: 'AI Embeddings', expected: expectedAiEmbeddings }
    ];

    const phases: EntityProgress[] = entityConfigs.map(config => {
      const current = currentCounts[config.key] || 0;
      const expected = config.expected;
      const remaining = Math.max(0, expected - current);
      const progressPercentage = expected > 0 ? Math.round((current / expected) * 100) : 0;
      const errors = validationErrors[config.key] || [];
      const status = this.determineStatus(expected, current, errors);

      return {
        entityType: config.name,
        expectedCount: expected,
        currentCount: current,
        remaining,
        progressPercentage,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        errors: errors.length > 0 ? errors : undefined
      };
    });

    const totalExpected = phases.reduce((sum, phase) => sum + phase.expectedCount, 0);
    const totalMigrated = phases.reduce((sum, phase) => sum + phase.currentCount, 0);
    const totalRemaining = totalExpected - totalMigrated;
    const overallProgress = totalExpected > 0 ? Math.round((totalMigrated / totalExpected) * 100) : 0;

    return {
      lastUpdated: new Date().toISOString(),
      overallProgress,
      phases,
      totalRecords: {
        expected: totalExpected,
        migrated: totalMigrated,
        remaining: totalRemaining
      }
    };
  }

  /**
   * Generate markdown table for progress report
   */
  generateMarkdownTable(progress: MigrationProgress): string {
    const getStatusEmoji = (status: EntityProgress['status']): string => {
      switch (status) {
        case 'completed': return '✅';
        case 'in_progress': return '🟡';
        case 'failed': return '❌';
        case 'not_started': return '⏸️';
        default: return '❓';
      }
    };

    const getStatusText = (status: EntityProgress['status']): string => {
      switch (status) {
        case 'completed': return 'Complete';
        case 'in_progress': return 'Partial';
        case 'failed': return 'Failed';
        case 'not_started': return 'Not Started';
        default: return 'Unknown';
      }
    };

    let table = '| Entity Type | Expected Count | Current Count | Remaining | Progress | Status | Errors/Issues |\n';
    table += '|-------------|----------------|---------------|-----------|----------|---------|---------------|\n';

    for (const phase of progress.phases) {
      const statusEmoji = getStatusEmoji(phase.status);
      const statusText = getStatusText(phase.status);
      const errorsText = phase.errors ? phase.errors.join(', ') : 'None';
      
      table += `| **${phase.entityType}** | ${phase.expectedCount.toLocaleString()} | ${phase.currentCount.toLocaleString()} | ${phase.remaining.toLocaleString()} | ${phase.progressPercentage}% | ${statusEmoji} ${statusText} | ${errorsText} |\n`;
    }

    return table;
  }

  /**
   * Update the migration progress report file
   */
  async updateProgressReport(progress: MigrationProgress): Promise<void> {
    const reportPath = path.join(__dirname, '..', 'docs', 'progress', 'migration-progress-report.md');
    
    try {
      // Read existing report
      let reportContent = '';
      if (fs.existsSync(reportPath)) {
        reportContent = fs.readFileSync(reportPath, 'utf8');
      }

      // Find and replace the progress table section
      const tableStartMarker = '| Entity Type | Expected Count | Current Count | Remaining | Progress | Status | Errors/Issues |';
      const tableEndMarker = '\n### Key Discoveries';
      
      const startIndex = reportContent.indexOf(tableStartMarker);
      const endIndex = reportContent.indexOf(tableEndMarker);

      if (startIndex !== -1 && endIndex !== -1) {
        // Replace existing table
        const beforeTable = reportContent.substring(0, startIndex);
        const afterTable = reportContent.substring(endIndex);
        const newTable = this.generateMarkdownTable(progress);
        
        reportContent = beforeTable + newTable + '\n' + afterTable;
      } else {
        logger.warn('Could not find progress table markers in existing report');
        // Create new table section
        const newTable = this.generateMarkdownTable(progress);
        reportContent += '\n\n## Updated Migration Progress\n\n' + newTable + '\n';
      }

      // Update the overall progress percentage in the executive summary
      const summaryRegex = /currently \*\*[\d.]+% complete\*\*/;
      reportContent = reportContent.replace(summaryRegex, `currently **${progress.overallProgress}% complete**`);

      // Update the date
      const dateRegex = /\*Date: [^*]+\*/;
      reportContent = reportContent.replace(dateRegex, `*Date: ${new Date().toLocaleDateString()}*`);

      // Write updated report
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      logger.info(`Progress report updated: ${reportPath}`);

    } catch (error) {
      logger.error('Failed to update progress report:', error);
      
      // Create a new report file with current progress
      const newReportContent = `# Healthcare Data Migration Progress Report - Updated
**Date**: ${new Date().toLocaleDateString()}
**Overall Progress**: ${progress.overallProgress}%

## Current Migration State

${this.generateMarkdownTable(progress)}

## Summary

- **Total Expected Records**: ${progress.totalRecords.expected.toLocaleString()}
- **Total Migrated Records**: ${progress.totalRecords.migrated.toLocaleString()}
- **Remaining Records**: ${progress.totalRecords.remaining.toLocaleString()}
- **Overall Progress**: ${progress.overallProgress}%

*Report generated automatically by Migration Progress Tracker*
`;

      const backupPath = path.join(__dirname, 'migration-progress-backup.md');
      fs.writeFileSync(backupPath, newReportContent, 'utf8');
      logger.info(`Backup progress report created: ${backupPath}`);
    }
  }

  /**
   * Generate detailed phase recommendations
   */
  generatePhaseRecommendations(progress: MigrationProgress): string[] {
    const recommendations: string[] = [];

    for (const phase of progress.phases) {
      if (phase.status === 'not_started' && phase.expectedCount > 0) {
        recommendations.push(`🔄 Start ${phase.entityType} migration (${phase.expectedCount.toLocaleString()} records)`);
      } else if (phase.status === 'in_progress') {
        recommendations.push(`⚡ Complete ${phase.entityType} migration (${phase.remaining.toLocaleString()} remaining)`);
      } else if (phase.status === 'failed' && phase.errors) {
        recommendations.push(`🔧 Fix ${phase.entityType} issues: ${phase.errors.join(', ')}`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 All migration phases completed successfully!');
    }

    return recommendations;
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    try {
      await this.initialize();
      
      logger.info('Generating migration progress data...');
      const progress = await this.generateProgressData();
      
      logger.info('Updating progress report...');
      await this.updateProgressReport(progress);
      
      const recommendations = this.generatePhaseRecommendations(progress);
      
      // Output summary to console
      console.log('\n=== MIGRATION PROGRESS SUMMARY ===');
      console.log(`Overall Progress: ${progress.overallProgress}%`);
      console.log(`Total Records: ${progress.totalRecords.migrated.toLocaleString()}/${progress.totalRecords.expected.toLocaleString()}`);
      console.log(`Remaining: ${progress.totalRecords.remaining.toLocaleString()}`);
      
      console.log('\n=== PHASE STATUS ===');
      for (const phase of progress.phases) {
        const status = phase.status === 'completed' ? '✅' : 
                      phase.status === 'in_progress' ? '🟡' : 
                      phase.status === 'failed' ? '❌' : '⏸️';
        console.log(`${status} ${phase.entityType}: ${phase.currentCount.toLocaleString()}/${phase.expectedCount.toLocaleString()} (${phase.progressPercentage}%)`);
      }
      
      console.log('\n=== RECOMMENDATIONS ===');
      for (const recommendation of recommendations) {
        console.log(recommendation);
      }
      
      console.log('\n=== NEXT STEPS ===');
      const nextPhase = progress.phases.find(p => p.status === 'not_started' || p.status === 'in_progress');
      if (nextPhase) {
        console.log(`Priority: Complete ${nextPhase.entityType} migration`);
        if (nextPhase.entityType === 'Profiles') {
          console.log('Command: cd migration_tool && ./phase-1-profiles-only.sh');
        } else {
          console.log(`Command: yarn tsx src/migrate-${nextPhase.entityType.toLowerCase().replace(' ', '-')}-only.ts`);
        }
      } else {
        console.log('🎉 All phases completed! Ready for production deployment.');
      }
      
      logger.info('Progress report update completed successfully');
      
    } catch (error) {
      logger.error('Progress tracking failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute the progress tracker
const tracker = new MigrationProgressTracker();
tracker.run()
  .then(() => {
    console.log('\n✅ Migration progress report updated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Progress tracking failed:', error);
    process.exit(1);
  });