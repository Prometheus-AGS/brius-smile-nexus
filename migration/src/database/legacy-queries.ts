/**
 * Legacy database query utilities
 * Provides standardized queries for the legacy PostgreSQL database
 */

import { Client, PoolClient } from 'pg';
import { Logger } from '../utils/logger';
import { 
  LegacyUser, 
  LegacyPatient, 
  LegacyOffice, 
  LegacyInstruction, 
  LegacyCourse,
  LegacyProject,
  LegacyRecord,
  LegacyState
} from '../types/migration-types';

export class LegacyQueries {
  private client: Client | PoolClient;
  private logger: Logger;

  constructor(client: Client | PoolClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Get record counts for all major tables
   */
  async getRecordCounts(): Promise<Record<string, number>> {
    const timer = this.logger.timer('getRecordCounts');
    
    try {
      const queries = [
        { name: 'users', query: 'SELECT COUNT(*) as count FROM auth_user' },
        { name: 'patients', query: 'SELECT COUNT(*) as count FROM dispatch_patient' },
        { name: 'offices', query: 'SELECT COUNT(*) as count FROM dispatch_office' },
        { name: 'instructions', query: 'SELECT COUNT(*) as count FROM dispatch_instruction' },
        { name: 'courses', query: 'SELECT COUNT(*) as count FROM dispatch_course' },
        { name: 'projects', query: 'SELECT COUNT(*) as count FROM dispatch_project' },
        { name: 'records', query: 'SELECT COUNT(*) as count FROM dispatch_record' },
        { name: 'states', query: 'SELECT COUNT(*) as count FROM dispatch_state' }
      ];

      const results: Record<string, number> = {};
      
      for (const { name, query } of queries) {
        const result = await this.client.query(query);
        results[name] = parseInt(result.rows[0].count, 10);
      }

      await timer.end('Record counts retrieved successfully', { counts: results });
      return results;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get record counts');
      throw error;
    }
  }

  /**
   * Validate patient-user relationships
   */
  async validatePatientUserRelationships(): Promise<{
    patients_with_users: number;
    orphaned_patients: number;
  }> {
    const timer = this.logger.timer('validatePatientUserRelationships');
    
    try {
      const patientsWithUsersQuery = `
        SELECT COUNT(*) as count 
        FROM dispatch_patient p 
        INNER JOIN auth_user u ON p.user_id = u.id
      `;
      
      const orphanedPatientsQuery = `
        SELECT COUNT(*) as count 
        FROM dispatch_patient p 
        LEFT JOIN auth_user u ON p.user_id = u.id 
        WHERE u.id IS NULL
      `;

      const [patientsWithUsersResult, orphanedPatientsResult] = await Promise.all([
        this.client.query(patientsWithUsersQuery),
        this.client.query(orphanedPatientsQuery)
      ]);

      const result = {
        patients_with_users: parseInt(patientsWithUsersResult.rows[0].count, 10),
        orphaned_patients: parseInt(orphanedPatientsResult.rows[0].count, 10)
      };

      await timer.end('Patient-user relationships validated', result);
      return result;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to validate patient-user relationships');
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(limit?: number, offset?: number): Promise<LegacyUser[]> {
    const timer = this.logger.timer('getAllUsers');
    
    try {
      let query = `
        SELECT 
          id, username, first_name, last_name, email, 
          is_staff, is_active, is_superuser, date_joined, last_login
        FROM auth_user 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Users retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyUser[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all users');
      throw error;
    }
  }

  /**
   * Get all patients with pagination
   */
  async getAllPatients(limit?: number, offset?: number): Promise<LegacyPatient[]> {
    const timer = this.logger.timer('getAllPatients');
    
    try {
      let query = `
        SELECT 
          id, user_id, doctor_id, birthdate, sex, status, archived, 
          created_at, updated_at
        FROM dispatch_patient 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Patients retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyPatient[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all patients');
      throw error;
    }
  }

  /**
   * Get all offices with pagination
   */
  async getAllOffices(limit?: number, offset?: number): Promise<LegacyOffice[]> {
    const timer = this.logger.timer('getAllOffices');
    
    try {
      let query = `
        SELECT 
          id, name, address, apt, city, state, zip, phone, emails, 
          sq_customer_id, created_at, updated_at
        FROM dispatch_office 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Offices retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyOffice[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all offices');
      throw error;
    }
  }

  /**
   * Get all instructions with pagination
   */
  async getAllInstructions(limit?: number, offset?: number): Promise<LegacyInstruction[]> {
    const timer = this.logger.timer('getAllInstructions');
    
    try {
      let query = `
        SELECT 
          id, patient_id, course_id, doctor_id, office_id, description, 
          price, status, archived, created_at, updated_at
        FROM dispatch_instruction 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Instructions retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyInstruction[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all instructions');
      throw error;
    }
  }

  /**
   * Get all courses
   */
  async getAllCourses(): Promise<LegacyCourse[]> {
    const timer = this.logger.timer('getAllCourses');
    
    try {
      const query = `
        SELECT 
          id, name, description, price, duration, category, 
          is_active, created_at, updated_at
        FROM dispatch_course 
        ORDER BY id
      `;

      const result = await this.client.query(query);
      
      await timer.end('Courses retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyCourse[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all courses');
      throw error;
    }
  }

  /**
   * Get all projects with pagination
   */
  async getAllProjects(limit?: number, offset?: number): Promise<LegacyProject[]> {
    const timer = this.logger.timer('getAllProjects');
    
    try {
      let query = `
        SELECT 
          id, name, description, type, status, creator_id, 
          file_path, file_size, mime_type, created_at, updated_at
        FROM dispatch_project 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Projects retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyProject[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all projects');
      throw error;
    }
  }

  /**
   * Get all records (messages) with pagination
   */
  async getAllRecords(limit?: number, offset?: number): Promise<LegacyRecord[]> {
    const timer = this.logger.timer('getAllRecords');
    
    try {
      let query = `
        SELECT 
          id, content_type_id, object_id, sender_id, recipient_id, 
          subject, body, message_type, is_read, created_at, updated_at
        FROM dispatch_record 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Records retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyRecord[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all records');
      throw error;
    }
  }

  /**
   * Get all states with pagination
   */
  async getAllStates(limit?: number, offset?: number): Promise<LegacyState[]> {
    const timer = this.logger.timer('getAllStates');
    
    try {
      let query = `
        SELECT 
          id, content_type_id, object_id, state, previous_state, 
          changed_by_id, reason, created_at, updated_at
        FROM dispatch_state 
        ORDER BY id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('States retrieved successfully', { count: result.rows.length });
      return result.rows as LegacyState[];
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get all states');
      throw error;
    }
  }

  /**
   * Get ContentType mappings
   */
  async getContentTypes(): Promise<Map<number, string>> {
    const timer = this.logger.timer('getContentTypes');
    
    try {
      const query = `
        SELECT id, model 
        FROM django_content_type 
        ORDER BY id
      `;

      const result = await this.client.query(query);
      const contentTypeMap = new Map<number, string>();
      
      for (const row of result.rows) {
        contentTypeMap.set(row.id, row.model);
      }
      
      await timer.end('ContentTypes retrieved successfully', { count: contentTypeMap.size });
      return contentTypeMap;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get ContentTypes');
      throw error;
    }
  }

  /**
   * Get doctor-office relationships
   */
  async getDoctorOfficeRelationships(): Promise<Array<{ doctor_id: number; office_id: number }>> {
    const timer = this.logger.timer('getDoctorOfficeRelationships');
    
    try {
      const query = `
        SELECT DISTINCT doctor_id, office_id 
        FROM dispatch_instruction 
        WHERE doctor_id IS NOT NULL AND office_id IS NOT NULL
        ORDER BY doctor_id, office_id
      `;

      const result = await this.client.query(query);
      
      await timer.end('Doctor-office relationships retrieved', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get doctor-office relationships');
      throw error;
    }
  }

  /**
   * Get enhanced records with content type information
   */
  async getEnhancedRecords(limit?: number, offset?: number): Promise<Array<LegacyRecord & { content_type_model: string }>> {
    const timer = this.logger.timer('getEnhancedRecords');
    
    try {
      let query = `
        SELECT 
          r.id, r.content_type_id, r.object_id, r.sender_id, r.recipient_id, 
          r.subject, r.body, r.message_type, r.is_read, r.created_at, r.updated_at,
          ct.model as content_type_model
        FROM dispatch_record r
        LEFT JOIN django_content_type ct ON r.content_type_id = ct.id
        ORDER BY r.id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Enhanced records retrieved successfully', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get enhanced records');
      throw error;
    }
  }

  /**
   * Get enhanced states with content type information
   */
  async getEnhancedStates(limit?: number, offset?: number): Promise<Array<LegacyState & { content_type_model: string }>> {
    const timer = this.logger.timer('getEnhancedStates');
    
    try {
      let query = `
        SELECT 
          s.id, s.content_type_id, s.object_id, s.state, s.previous_state, 
          s.changed_by_id, s.reason, s.created_at, s.updated_at,
          ct.model as content_type_model
        FROM dispatch_state s
        LEFT JOIN django_content_type ct ON s.content_type_id = ct.id
        ORDER BY s.id
      `;
      
      const params: unknown[] = [];
      if (limit !== undefined) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      if (offset !== undefined) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      const result = await this.client.query(query, params);
      
      await timer.end('Enhanced states retrieved successfully', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to get enhanced states');
      throw error;
    }
  }
}