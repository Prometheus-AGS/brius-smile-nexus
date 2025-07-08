import { getSupabaseClient } from './db.service';
import { LegacyMigrationConnectionManager } from './legacy-migration-connection-manager';
import { createComponentLogger } from '../utils/logger';
import { DatabaseConfig } from '../types/legacy-migration-types';
import { v4 as uuidv4 } from '../../$node_modules/uuid/dist/esm/index.js';

const logger = createComponentLogger('incremental-migration');

interface ExistingRecordIds {
  profiles: Set<string | number>;
  patients: Set<string | number>;
  cases: Set<string | number>;
  projects: Set<string | number>;
  practice_members: Set<string | number>;
  case_states: Set<string | number>;
  workflow_templates: Set<string | number>;
  ai_embeddings: Set<string | number>;
}

// Note: MigrationBatch interface reserved for future batch processing enhancements
// interface MigrationBatch<T> {
//   records: T[];
//   batchNumber: number;
//   totalBatches: number;
// }

interface MigrationResult {
  entityType: string;
  totalRecords: number;
  newRecords: number;
  skippedRecords: number;
  errors: number;
  duration: number;
}

/**
 * Incremental Migration Service
 * 
 * Handles resumable migrations with ON CONFLICT DO NOTHING logic
 * and duplicate detection for all entity types.
 */
export class IncrementalMigrationService {
  private supabase = getSupabaseClient();
  private connectionManager: LegacyMigrationConnectionManager | null = null;

  constructor() {
    logger.info('Incremental Migration Service initialized');
  }

  /**
   * Initialize the service with database connections
   */
  async initialize(): Promise<void> {
    const legacyConfig: DatabaseConfig = {
      host: process.env['LEGACY_DB_HOST'] || 'localhost',
      port: parseInt(process.env['LEGACY_DB_PORT'] || '5432'),
      database: process.env['LEGACY_DB_NAME'] || 'legacy_db',
      username: process.env['LEGACY_DB_USER'] || 'postgres',
      password: process.env['LEGACY_DB_PASSWORD'] || '',
      ssl: process.env['LEGACY_DB_SSL'] === 'true'
    };

    const supabaseConfig: DatabaseConfig = {
      host: process.env['SUPABASE_DB_HOST'] || 'localhost',
      port: parseInt(process.env['SUPABASE_DB_PORT'] || '5432'),
      database: process.env['SUPABASE_DB_NAME'] || 'postgres',
      username: process.env['SUPABASE_DB_USER'] || 'postgres',
      password: process.env['SUPABASE_DB_PASSWORD'] || '',
      ssl: process.env['SUPABASE_DB_SSL'] !== 'false'
    };

    this.connectionManager = new LegacyMigrationConnectionManager(
      legacyConfig,
      supabaseConfig,
      process.env['SUPABASE_URL'] || '',
      process.env['SUPABASE_SERVICE_ROLE_KEY'] || ''
    );

    await this.connectionManager.initialize();
    logger.info('Connection manager initialized');
  }

  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.cleanup();
    }
  }

  /**
   * Get existing record IDs for duplicate detection
   */
  async getExistingRecordIds(): Promise<ExistingRecordIds> {
    logger.info('Fetching existing record IDs for duplicate detection...');

    const existingIds: ExistingRecordIds = {
      profiles: new Set(),
      patients: new Set(),
      cases: new Set(),
      projects: new Set(),
      practice_members: new Set(),
      case_states: new Set(),
      workflow_templates: new Set(),
      ai_embeddings: new Set()
    };

    try {
      // Profiles - use email as unique identifier
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('email');
      existingIds.profiles = new Set(profiles?.map(p => p.email.toLowerCase()) || []);

      // Patients - use legacy_id if available, otherwise use combination
      const { data: patients } = await this.supabase
        .from('patients')
        .select('id, first_name, last_name, date_of_birth');
      existingIds.patients = new Set(patients?.map(p => 
        `${p.first_name}_${p.last_name}_${p.date_of_birth}`.toLowerCase()
      ) || []);

      // Cases - use legacy_project_id
      const { data: cases } = await this.supabase
        .from('cases')
        .select('legacy_project_id')
        .not('legacy_project_id', 'is', null);
      existingIds.cases = new Set(cases?.map(c => c.legacy_project_id) || []);

      // Projects - use legacy_id
      const { data: projects } = await this.supabase
        .from('projects')
        .select('legacy_id')
        .not('legacy_id', 'is', null);
      existingIds.projects = new Set(projects?.map(p => p.legacy_id) || []);

      // Practice Members - use combination of practice_id and profile_id
      const { data: practiceMembers } = await this.supabase
        .from('practice_members')
        .select('practice_id, profile_id');
      existingIds.practice_members = new Set(practiceMembers?.map(pm => 
        `${pm.practice_id}_${pm.profile_id}`
      ) || []);

      // Case States - use combination of case_id and created_at
      const { data: caseStates } = await this.supabase
        .from('case_states')
        .select('case_id, created_at');
      existingIds.case_states = new Set(caseStates?.map(cs => 
        `${cs.case_id}_${cs.created_at}`
      ) || []);

      // Workflow Templates - use combination of practice_id and name
      const { data: workflowTemplates } = await this.supabase
        .from('workflow_templates')
        .select('practice_id, name');
      existingIds.workflow_templates = new Set(workflowTemplates?.map(wt => 
        `${wt.practice_id}_${wt.name}`.toLowerCase()
      ) || []);

      // AI Embeddings - use sha256_hash
      const { data: aiEmbeddings } = await this.supabase
        .from('ai_embeddings')
        .select('sha256_hash');
      existingIds.ai_embeddings = new Set(aiEmbeddings?.map(ae => ae.sha256_hash) || []);

      logger.info('Existing record counts:', {
        profiles: existingIds.profiles.size,
        patients: existingIds.patients.size,
        cases: existingIds.cases.size,
        projects: existingIds.projects.size,
        practice_members: existingIds.practice_members.size,
        case_states: existingIds.case_states.size,
        workflow_templates: existingIds.workflow_templates.size,
        ai_embeddings: existingIds.ai_embeddings.size
      });

    } catch (error) {
      logger.error('Failed to fetch existing record IDs:', error);
      throw error;
    }

    return existingIds;
  }

  /**
   * Migrate profiles with duplicate detection
   */
  async migrateProfiles(batchSize = 100): Promise<MigrationResult> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized');
    }

    const startTime = Date.now();
    logger.info('Starting profiles migration...');

    try {
      // Get existing profiles
      const existingIds = await this.getExistingRecordIds();
      const existingEmails = existingIds.profiles;

      // Get practice mapping
      const practiceMapping = await this.getPracticeMapping();

      // Fetch legacy users
      const legacyUsers = await this.connectionManager.queryLegacy<{
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
        date_joined: string;
        last_login?: string;
      }>(`
        SELECT 
          id, email, first_name, last_name, is_active, date_joined, last_login
        FROM auth_user 
        ORDER BY id
      `);

      // Filter out existing profiles
      const newUsers = legacyUsers.rows.filter(user => 
        !existingEmails.has(user.email.toLowerCase())
      );

      logger.info(`Found ${legacyUsers.rows.length} legacy users, ${newUsers.length} new to migrate`);

      let successful = 0;
      let errors = 0;

      // Process in batches
      for (let i = 0; i < newUsers.length; i += batchSize) {
        const batch = newUsers.slice(i, i + batchSize);
        
        const profileRecords = batch.map(user => ({
          id: uuidv4(),
          email: user.email.toLowerCase(),
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          role: 'doctor',
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

        try {
          const { data, error } = await this.supabase
            .from('profiles')
            .insert(profileRecords)
            .select('id');

          if (error) {
            logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
            errors += batch.length;
          } else {
            successful += data?.length || 0;
            logger.info(`Batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0}/${batch.length} profiles inserted`);
          }
        } catch (error) {
          logger.error(`Batch ${Math.floor(i/batchSize) + 1} exception:`, error);
          errors += batch.length;
        }

        // Progress update
        const progress = Math.round(((i + batchSize) / newUsers.length) * 100);
        logger.info(`Progress: ${Math.min(i + batchSize, newUsers.length)}/${newUsers.length} (${progress}%)`);
      }

      const duration = Date.now() - startTime;
      
      return {
        entityType: 'profiles',
        totalRecords: legacyUsers.rows.length,
        newRecords: successful,
        skippedRecords: legacyUsers.rows.length - newUsers.length,
        errors,
        duration
      };

    } catch (error) {
      logger.error('Profiles migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate patients with duplicate detection
   */
  async migratePatients(batchSize = 100): Promise<MigrationResult> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized');
    }

    const startTime = Date.now();
    logger.info('Starting patients migration...');

    try {
      // Get existing patients
      const existingIds = await this.getExistingRecordIds();
      const existingPatients = existingIds.patients;

      // Get practice mapping
      const practiceMapping = await this.getPracticeMapping();

      // Fetch legacy patients
      const legacyPatients = await this.connectionManager.queryLegacy<{
        id: number;
        first_name: string;
        last_name: string;
        date_of_birth: string;
        phone?: string;
        email?: string;
        created_at: string;
      }>(`
        SELECT 
          id, first_name, last_name, date_of_birth, phone, email, created_at
        FROM dispatch_patient 
        ORDER BY id
      `);

      // Filter out existing patients
      const newPatients = legacyPatients.rows.filter(patient => {
        const key = `${patient.first_name}_${patient.last_name}_${patient.date_of_birth}`.toLowerCase();
        return !existingPatients.has(key);
      });

      logger.info(`Found ${legacyPatients.rows.length} legacy patients, ${newPatients.length} new to migrate`);

      let successful = 0;
      let errors = 0;

      // Process in batches
      for (let i = 0; i < newPatients.length; i += batchSize) {
        const batch = newPatients.slice(i, i + batchSize);
        
        const patientRecords = batch.map(patient => ({
          id: uuidv4(),
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          date_of_birth: patient.date_of_birth,
          phone: patient.phone || null,
          email: patient.email || null,
          medical_history: {},
          created_at: patient.created_at,
          updated_at: new Date().toISOString(),
          practice_id: practiceMapping.get(patient.id) || null,
          profile_id: null // Will be set based on case relationships
        }));

        try {
          const { data, error } = await this.supabase
            .from('patients')
            .insert(patientRecords)
            .select('id');

          if (error) {
            logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
            errors += batch.length;
          } else {
            successful += data?.length || 0;
            logger.info(`Batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0}/${batch.length} patients inserted`);
          }
        } catch (error) {
          logger.error(`Batch ${Math.floor(i/batchSize) + 1} exception:`, error);
          errors += batch.length;
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        entityType: 'patients',
        totalRecords: legacyPatients.rows.length,
        newRecords: successful,
        skippedRecords: legacyPatients.rows.length - newPatients.length,
        errors,
        duration
      };

    } catch (error) {
      logger.error('Patients migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate cases (project-centric transformation)
   */
  async migrateCases(batchSize = 100): Promise<MigrationResult> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized');
    }

    const startTime = Date.now();
    logger.info('Starting cases migration (project-centric)...');

    try {
      // Get existing cases
      const existingIds = await this.getExistingRecordIds();
      const existingCases = existingIds.cases;

      // Fetch legacy projects (source for cases)
      const legacyProjects = await this.connectionManager.queryLegacy<{
        id: number;
        name: string;
        type: string;
        status: string;
        patient_id: number;
        office_id: number;
        created_at: string;
      }>(`
        SELECT 
          id, name, type, status, patient_id, office_id, created_at
        FROM dispatch_project 
        ORDER BY id
      `);

      // Filter out existing cases
      const newProjects = legacyProjects.rows.filter(project => 
        !existingCases.has(project.id)
      );

      logger.info(`Found ${legacyProjects.rows.length} legacy projects, ${newProjects.length} new cases to migrate`);

      let successful = 0;
      let errors = 0;

      // Get patient and practice mappings
      const patientMapping = await this.getPatientMapping();
      const practiceMapping = await this.getPracticeMapping();

      // Process in batches
      for (let i = 0; i < newProjects.length; i += batchSize) {
        const batch = newProjects.slice(i, i + batchSize);
        
        const caseRecords = batch.map(project => ({
          id: uuidv4(),
          legacy_project_id: project.id,
          case_number: `CASE-${project.id.toString().padStart(6, '0')}`,
          title: project.name || `Case ${project.id}`,
          case_type: this.mapCaseType(project.type),
          current_state: this.mapCaseState(project.status),
          metadata: {
            legacy_type: project.type,
            legacy_status: project.status
          },
          created_at: project.created_at,
          updated_at: new Date().toISOString(),
          patient_id: patientMapping.get(project.patient_id) || null,
          practice_id: practiceMapping.get(project.office_id) || null
        }));

        try {
          const { data, error } = await this.supabase
            .from('cases')
            .insert(caseRecords)
            .select('id');

          if (error) {
            logger.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
            errors += batch.length;
          } else {
            successful += data?.length || 0;
            logger.info(`Batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0}/${batch.length} cases inserted`);
          }
        } catch (error) {
          logger.error(`Batch ${Math.floor(i/batchSize) + 1} exception:`, error);
          errors += batch.length;
        }
      }

      const duration = Date.now() - startTime;
      
      return {
        entityType: 'cases',
        totalRecords: legacyProjects.rows.length,
        newRecords: successful,
        skippedRecords: legacyProjects.rows.length - newProjects.length,
        errors,
        duration
      };

    } catch (error) {
      logger.error('Cases migration failed:', error);
      throw error;
    }
  }

  /**
   * Get practice mapping from legacy office_doctors relationship
   */
  private async getPracticeMapping(): Promise<Map<number, string>> {
    if (!this.connectionManager) {
      throw new Error('Connection manager not initialized');
    }

    try {
      const practiceQuery = `
        SELECT DISTINCT 
          od.doctor_id,
          p.id as practice_uuid
        FROM dispatch_office_doctors od
        JOIN practices p ON p.legacy_id = od.office_id
      `;
      
      const practiceResult = await this.connectionManager.queryLegacy<{
        doctor_id: number;
        practice_uuid: string;
      }>(practiceQuery);
      
      const practiceMap = new Map<number, string>();
      for (const row of practiceResult.rows) {
        practiceMap.set(row.doctor_id, row.practice_uuid);
      }
      
      logger.info(`Built practice mapping for ${practiceMap.size} users`);
      return practiceMap;

    } catch (error) {
      logger.error('Failed to build practice mapping:', error);
      return new Map();
    }
  }

  /**
   * Get patient mapping from legacy to Supabase UUIDs
   */
  private async getPatientMapping(): Promise<Map<number, string>> {
    try {
      const { data: patients } = await this.supabase
        .from('patients')
        .select('id, first_name, last_name, date_of_birth');

      if (!this.connectionManager) {
        throw new Error('Connection manager not initialized');
      }

      const legacyPatients = await this.connectionManager.queryLegacy<{
        id: number;
        first_name: string;
        last_name: string;
        date_of_birth: string;
      }>(`
        SELECT id, first_name, last_name, date_of_birth
        FROM dispatch_patient
      `);

      const patientMap = new Map<number, string>();
      
      for (const legacyPatient of legacyPatients.rows) {
        const matchingPatient = patients?.find(p => 
          p.first_name === legacyPatient.first_name &&
          p.last_name === legacyPatient.last_name &&
          p.date_of_birth === legacyPatient.date_of_birth
        );
        
        if (matchingPatient) {
          patientMap.set(legacyPatient.id, matchingPatient.id);
        }
      }
      
      logger.info(`Built patient mapping for ${patientMap.size} patients`);
      return patientMap;

    } catch (error) {
      logger.error('Failed to build patient mapping:', error);
      return new Map();
    }
  }

  /**
   * Map legacy case types to new enum values
   */
  private mapCaseType(legacyType: string): string {
    const typeMapping: Record<string, string> = {
      'orthodontic': 'orthodontic',
      'implant': 'implant',
      'crown': 'restorative',
      'bridge': 'restorative',
      'cleaning': 'preventive',
      'extraction': 'surgical',
      'root_canal': 'endodontic'
    };

    return typeMapping[legacyType?.toLowerCase()] || 'general';
  }

  /**
   * Map legacy case states to new enum values
   */
  private mapCaseState(legacyStatus: string): string {
    const stateMapping: Record<string, string> = {
      'new': 'new',
      'in_progress': 'in_progress',
      'pending': 'pending_review',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'on_hold': 'on_hold'
    };

    return stateMapping[legacyStatus?.toLowerCase()] || 'new';
  }

  /**
   * Execute a complete incremental migration for a specific entity type
   */
  async migrateEntityType(
    entityType: 'profiles' | 'patients' | 'cases' | 'projects',
    batchSize = 100
  ): Promise<MigrationResult> {
    await this.initialize();

    try {
      let result: MigrationResult;

      switch (entityType) {
        case 'profiles':
          result = await this.migrateProfiles(batchSize);
          break;
        case 'patients':
          result = await this.migratePatients(batchSize);
          break;
        case 'cases':
          result = await this.migrateCases(batchSize);
          break;
        default:
          throw new Error(`Entity type ${entityType} not implemented yet`);
      }

      logger.info(`Migration completed for ${entityType}:`, result);
      return result;

    } finally {
      await this.cleanup();
    }
  }
}

/**
 * Utility function to create and run incremental migration
 */
export async function runIncrementalMigration(
  entityType: 'profiles' | 'patients' | 'cases' | 'projects',
  batchSize = 100
): Promise<MigrationResult> {
  const service = new IncrementalMigrationService();
  return await service.migrateEntityType(entityType, batchSize);
}

/**
 * Create a legacy connection for simple operations
 * This function is used by the phase-1 script
 */
export async function createLegacyConnection() {
  const legacyConfig: DatabaseConfig = {
    host: process.env['LEGACY_DB_HOST'] || 'localhost',
    port: parseInt(process.env['LEGACY_DB_PORT'] || '5432'),
    database: process.env['LEGACY_DB_NAME'] || 'legacy_db',
    username: process.env['LEGACY_DB_USER'] || 'postgres',
    password: process.env['LEGACY_DB_PASSWORD'] || '',
    ssl: process.env['LEGACY_DB_SSL'] === 'true'
  };

  const supabaseConfig: DatabaseConfig = {
    host: process.env['SUPABASE_DB_HOST'] || 'localhost',
    port: parseInt(process.env['SUPABASE_DB_PORT'] || '5432'),
    database: process.env['SUPABASE_DB_NAME'] || 'postgres',
    username: process.env['SUPABASE_DB_USER'] || 'postgres',
    password: process.env['SUPABASE_DB_PASSWORD'] || '',
    ssl: process.env['SUPABASE_DB_SSL'] !== 'false'
  };

  const connectionManager = new LegacyMigrationConnectionManager(
    legacyConfig,
    supabaseConfig,
    process.env['SUPABASE_URL'] || '',
    process.env['SUPABASE_SERVICE_ROLE_KEY'] || ''
  );

  await connectionManager.initialize();
  
  // Return a simplified interface for the phase-1 script
  return {
    query: async (sql: string) => {
      return await connectionManager.queryLegacy(sql);
    },
    end: async () => {
      await connectionManager.cleanup();
    }
  };
}