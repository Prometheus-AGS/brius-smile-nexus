/**
 * Legacy PostgreSQL database connection service
 * Handles connections to the legacy Django database
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import { MigrationConfig, LegacyUser, LegacyPatient, LegacyOffice, LegacyCourse, LegacyInstruction, LegacyProject, LegacyState, LegacyTemplate, LegacyRecord, LegacyContentType } from '../types/migration-types';
import { Logger } from '../utils/logger';

export class LegacyConnectionService {
  private pool: Pool;
  private logger: Logger;

  constructor(config: MigrationConfig['legacy_database'], logger: Logger) {
    this.logger = logger;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      connectionTimeoutMillis: config.connection_timeout_ms,
      query_timeout: config.query_timeout_ms,
      max: 10, // Maximum number of connections
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      this.logger.error('Legacy database pool error', { error: err.message });
    });
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      this.logger.info('Legacy database connection successful', { 
        timestamp: result.rows[0].now 
      });
      return true;
    } catch (error) {
      this.logger.error('Legacy database connection failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Execute a query with proper error handling
   */
  private async executeQuery<T extends QueryResultRow>(query: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(query, params);
      return result;
    } catch (error) {
      this.logger.error('Legacy database query failed', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client for direct use
   * Note: Caller is responsible for releasing the client
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Get all users from auth_user table
   */
  async getAllUsers(): Promise<LegacyUser[]> {
    const query = `
      SELECT 
        id,
        username,
        first_name,
        last_name,
        email,
        is_staff,
        is_active,
        is_superuser,
        date_joined,
        last_login
      FROM auth_user
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyUser>(query);
    this.logger.info('Retrieved legacy users', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get all patients from dispatch_patient table
   */
  async getAllPatients(): Promise<LegacyPatient[]> {
    const query = `
      SELECT 
        id,
        user_id,
        birthdate,
        sex,
        updated_at
      FROM dispatch_patient
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyPatient>(query);
    this.logger.info('Retrieved legacy patients', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get patient by user_id
   */
  async getPatientByUserId(userId: number): Promise<LegacyPatient | null> {
    const query = `
      SELECT 
        id,
        user_id,
        birthdate,
        sex,
        updated_at
      FROM dispatch_patient
      WHERE user_id = $1
    `;

    const result = await this.executeQuery<LegacyPatient>(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get all offices from dispatch_office table
   */
  async getAllOffices(): Promise<LegacyOffice[]> {
    const query = `
      SELECT 
        id,
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        email,
        website,
        license_number,
        created_at,
        updated_at
      FROM dispatch_office
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyOffice>(query);
    this.logger.info('Retrieved legacy offices', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get all courses from dispatch_course table
   */
  async getAllCourses(): Promise<LegacyCourse[]> {
    const query = `
      SELECT 
        id,
        name,
        description,
        category,
        is_active,
        created_at,
        updated_at
      FROM dispatch_course
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyCourse>(query);
    this.logger.info('Retrieved legacy courses', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get all instructions from dispatch_instruction table
   */
  async getAllInstructions(): Promise<LegacyInstruction[]> {
    const query = `
      SELECT 
        id,
        patient_id,
        doctor_id,
        office_id,
        course_id,
        title,
        description,
        priority,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        data,
        notes,
        created_at,
        updated_at,
        completed_at,
        cancelled_at
      FROM dispatch_instruction
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyInstruction>(query);
    this.logger.info('Retrieved legacy instructions', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get instructions in batches for memory efficiency
   */
  async getInstructionsBatch(offset: number, limit: number): Promise<LegacyInstruction[]> {
    const query = `
      SELECT 
        id,
        patient_id,
        doctor_id,
        office_id,
        course_id,
        title,
        description,
        priority,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        data,
        notes,
        created_at,
        updated_at,
        completed_at,
        cancelled_at
      FROM dispatch_instruction
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    const result = await this.executeQuery<LegacyInstruction>(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get all projects from dispatch_project table
   */
  async getAllProjects(): Promise<LegacyProject[]> {
    const query = `
      SELECT 
        id,
        uid,
        name,
        size,
        type,
        status,
        creator_id,
        created_at,
        public
      FROM dispatch_project
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyProject>(query);
    this.logger.info('Retrieved legacy projects', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get all states from dispatch_state table
   */
  async getAllStates(): Promise<LegacyState[]> {
    const query = `
      SELECT 
        id,
        status,
        on,
        changed_at,
        actor_id,
        instruction_id
      FROM dispatch_state
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyState>(query);
    this.logger.info('Retrieved legacy states', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get states by instruction_id
   */
  async getStatesByInstructionId(instructionId: number): Promise<LegacyState[]> {
    const query = `
      SELECT 
        id,
        status,
        on,
        changed_at,
        actor_id,
        instruction_id
      FROM dispatch_state
      WHERE instruction_id = $1
      ORDER BY changed_at
    `;

    const result = await this.executeQuery<LegacyState>(query, [instructionId]);
    return result.rows;
  }

  /**
   * Get all templates from dispatch_template table
   */
  async getAllTemplates(): Promise<LegacyTemplate[]> {
    const query = `
      SELECT 
        id,
        task_name,
        function,
        predefined,
        status,
        action_name,
        text_name,
        duration,
        category_id,
        course_id
      FROM dispatch_template
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyTemplate>(query);
    this.logger.info('Retrieved legacy templates', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get all records from dispatch_record table
   */
  async getAllRecords(): Promise<LegacyRecord[]> {
    const query = `
      SELECT 
        id,
        content_type_id,
        object_id,
        subject,
        body,
        sender_id,
        recipient_id,
        is_read,
        read_at,
        requires_response,
        response_due_date,
        attachments,
        created_at,
        updated_at
      FROM dispatch_record
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyRecord>(query);
    this.logger.info('Retrieved legacy records', { count: result.rows.length });
    return result.rows;
  }

  /**
   * Get records in batches for memory efficiency
   */
  async getRecordsBatch(offset: number, limit: number): Promise<LegacyRecord[]> {
    const query = `
      SELECT 
        id,
        content_type_id,
        object_id,
        subject,
        body,
        sender_id,
        recipient_id,
        is_read,
        read_at,
        requires_response,
        response_due_date,
        attachments,
        created_at,
        updated_at
      FROM dispatch_record
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    const result = await this.executeQuery<LegacyRecord>(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Get all content types from django_content_type table
   */
  async getAllContentTypes(): Promise<LegacyContentType[]> {
    const query = `
      SELECT
        id,
        app_label,
        model
      FROM django_content_type
      ORDER BY id
    `;

    const result = await this.executeQuery<LegacyContentType>(query);
    this.logger.info('Retrieved legacy content types', { count: result.rows.length });
    return result.rows;
  }


  /**
   * Get content type by id
   */
  async getContentTypeById(contentTypeId: number): Promise<LegacyContentType | null> {
    const query = `
      SELECT 
        id,
        app_label,
        model
      FROM django_content_type
      WHERE id = $1
    `;

    const result = await this.executeQuery<LegacyContentType>(query, [contentTypeId]);
    return result.rows[0] || null;
  }

  /**
   * Get record counts for validation
   */
  async getRecordCounts(): Promise<Record<string, number>> {
    const queries = [
      { name: 'users', query: 'SELECT COUNT(*) as count FROM auth_user' },
      { name: 'patients', query: 'SELECT COUNT(*) as count FROM dispatch_patient' },
      { name: 'offices', query: 'SELECT COUNT(*) as count FROM dispatch_office' },
      { name: 'courses', query: 'SELECT COUNT(*) as count FROM dispatch_course' },
      { name: 'instructions', query: 'SELECT COUNT(*) as count FROM dispatch_instruction' },
      { name: 'projects', query: 'SELECT COUNT(*) as count FROM dispatch_project' },
      { name: 'states', query: 'SELECT COUNT(*) as count FROM dispatch_state' },
      { name: 'templates', query: 'SELECT COUNT(*) as count FROM dispatch_template' },
      { name: 'records', query: 'SELECT COUNT(*) as count FROM dispatch_record' },
      { name: 'content_types', query: 'SELECT COUNT(*) as count FROM django_content_type' }
    ];

    const counts: Record<string, number> = {};

    for (const { name, query } of queries) {
      try {
        const result = await this.executeQuery<{ count: string }>(query);
        counts[name] = parseInt(result.rows[0]?.count || '0', 10);
      } catch (error) {
        this.logger.warn(`Failed to get count for ${name}`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        counts[name] = 0;
      }
    }

    this.logger.info('Retrieved legacy record counts', counts);
    return counts;
  }

  /**
   * Validate patient-user relationships
   */
  async validatePatientUserRelationships(): Promise<{
    total_patients: number;
    patients_with_users: number;
    orphaned_patients: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_patients,
        COUNT(u.id) as patients_with_users,
        COUNT(*) - COUNT(u.id) as orphaned_patients
      FROM dispatch_patient p
      LEFT JOIN auth_user u ON p.user_id = u.id
    `;

    const result = await this.executeQuery<{
      total_patients: string;
      patients_with_users: string;
      orphaned_patients: string;
    }>(query);

    const row = result.rows[0];
    return {
      total_patients: parseInt(row?.total_patients || '0', 10),
      patients_with_users: parseInt(row?.patients_with_users || '0', 10),
      orphaned_patients: parseInt(row?.orphaned_patients || '0', 10)
    };
  }

  /**
   * Validate project data integrity
   */
  async validateProjectDataIntegrity(): Promise<{
    total_projects: number;
    unique_uids: number;
    named_projects: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(DISTINCT uid) as unique_uids,
        COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as named_projects
      FROM dispatch_project
    `;

    const result = await this.executeQuery<{
      total_projects: string;
      unique_uids: string;
      named_projects: string;
    }>(query);

    const row = result.rows[0];
    return {
      total_projects: parseInt(row?.total_projects || '0', 10),
      unique_uids: parseInt(row?.unique_uids || '0', 10),
      named_projects: parseInt(row?.named_projects || '0', 10)
    };
  }

  /**
   * Validate state transition integrity
   */
  async validateStateTransitionIntegrity(): Promise<{
    total_states: number;
    unique_instructions: number;
    earliest_state: Date | null;
    latest_state: Date | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_states,
        COUNT(DISTINCT instruction_id) as unique_instructions,
        MIN(changed_at) as earliest_state,
        MAX(changed_at) as latest_state
      FROM dispatch_state
    `;

    const result = await this.executeQuery<{
      total_states: string;
      unique_instructions: string;
      earliest_state: Date | null;
      latest_state: Date | null;
    }>(query);

    const row = result.rows[0];
    return {
      total_states: parseInt(row?.total_states || '0', 10),
      unique_instructions: parseInt(row?.unique_instructions || '0', 10),
      earliest_state: row?.earliest_state || null,
      latest_state: row?.latest_state || null
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Legacy database connections closed');
    } catch (error) {
      this.logger.error('Error closing legacy database connections', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}