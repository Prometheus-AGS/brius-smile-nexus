import { Pool } from '../../$node_modules/@types/pg/index.d.mts';
import {
  LegacyPatient,
  LegacyComment,
  LegacyState,
  LegacyUser,
  LegacyPractice,
  LegacyContentType,
  LegacyProject,
  LegacyTemplate,
  LegacyInstructionState,
  ExtractionProgress,
  ExtractionConfig,
  ExtractionResult,
  ExtractionStats
} from '../types/legacy-migration-types.js';

/**
 * Data extraction service for legacy Django MDW system
 * Handles reading and preprocessing data from the legacy database
 */
export class LegacyMigrationDataExtractor {
  private legacyPool: Pool;
  
  private progressCallback: ((progress: ExtractionProgress) => void) | undefined;

  constructor(
    legacyPool: Pool,
    _config: ExtractionConfig,
    progressCallback?: (progress: ExtractionProgress) => void
  ) {
    this.legacyPool = legacyPool;
    
    this.progressCallback = progressCallback;
  }

  /**
   * Extract all data from legacy system
   */
  async extractAllData(): Promise<ExtractionResult> {
    const startTime = Date.now();
    const result: ExtractionResult = {
      patients: [],
      comments: [],
      states: [],
      users: [],
      practices: [],
      contentTypes: [],
      projects: [],
      templates: [],
      instructionStates: [],
      stats: {
        totalRecords: 0,
        extractedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0,
        extractionTimeMs: 0
      }
    };

    try {
      // Extract content types first (needed for Generic FK resolution)
      this.updateProgress('Extracting content types...', 0);
      result.contentTypes = await this.extractContentTypes();
      
      // Extract users and practices
      this.updateProgress('Extracting users...', 8);
      result.users = await this.extractUsers();
      
      this.updateProgress('Extracting practices...', 16);
      result.practices = await this.extractPractices();
      
      // Extract core business entities
      this.updateProgress('Extracting patients...', 24);
      result.patients = await this.extractPatients();
      
      this.updateProgress('Extracting comments...', 40);
      result.comments = await this.extractComments();
      
      this.updateProgress('Extracting states...', 48);
      result.states = await this.extractStates();
      
      // Phase 2A: 3D Project Data Extraction
      this.updateProgress('Extracting 3D projects...', 56);
      result.projects = await this.extractProjects();
      
      // Phase 2B: Enhanced Workflow Template Extraction
      this.updateProgress('Extracting workflow templates...', 64);
      result.templates = await this.extractTemplates();
      
      // Phase 2C: Granular State Tracking Extraction
      this.updateProgress('Extracting instruction states...', 72);
      result.instructionStates = await this.extractInstructionStates();
      
      // Calculate final stats
      result.stats = this.calculateStats(result, startTime);
      this.updateProgress('Extraction complete', 100);
      
      return result;
      
    } catch (error) {
      throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract Django content types for Generic FK resolution
   */
  private async extractContentTypes(): Promise<LegacyContentType[]> {
    const query = `
      SELECT 
        id,
        app_label,
        model
      FROM django_content_type
      ORDER BY id
    `;

    try {
      const result = await this.legacyPool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        app_label: row.app_label,
        model: row.model
      }));
    } catch (error) {
      throw new Error(`Failed to extract content types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract users from auth_user table
   */
  private async extractUsers(): Promise<LegacyUser[]> {
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
      WHERE is_active = true
      ORDER BY id
    `;

    try {
      const result = await this.legacyPool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        email: row.email || '',
        is_staff: row.is_staff || false,
        is_active: row.is_active || false,
        is_superuser: row.is_superuser || false,
        date_joined: row.date_joined,
        last_login: row.last_login
      }));
    } catch (error) {
      throw new Error(`Failed to extract users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract practices from dispatch_office table (mapped from dispatch_practice)
   */
  private async extractPractices(): Promise<LegacyPractice[]> {
    const query = `
      SELECT
        id,
        name,
        address,
        city,
        state,
        zip,
        phone,
        doctor_id,
        apt,
        country,
        tax_rate,
        valid,
        sq_customer_id,
        emails
      FROM dispatch_office
      ORDER BY id
    `;

    try {
      const result = await this.legacyPool.query(query);
      const currentTimestamp = new Date().toISOString();
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name || '',
        address: row.address || '',
        city: row.city || '',
        state: row.state || '',
        zip_code: row.zip || '', // mapped from 'zip' field
        phone: row.phone || '',
        email: row.emails ? 'office@practice.com' : '', // mapped from boolean 'emails' field
        created_at: currentTimestamp, // fallback since field doesn't exist
        updated_at: currentTimestamp, // fallback since field doesn't exist
        // Additional fields from dispatch_office
        doctor_id: row.doctor_id,
        apt: row.apt || '',
        country: row.country || '',
        tax_rate: row.tax_rate || 0,
        valid: row.valid || false,
        sq_customer_id: row.sq_customer_id || '',
        emails: row.emails || false
      }));
    } catch (error) {
      throw new Error(`Failed to extract practices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract patients from dispatch_patient table
   * Patient names are stored in auth_user table, not dispatch_patient
   */
  private async extractPatients(): Promise<LegacyPatient[]> {
    const query = `
      SELECT
        p.id,
        p.user_id,
        p.birthdate,
        p.sex,
        p.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.username
      FROM dispatch_patient p
      INNER JOIN auth_user u ON p.user_id = u.id
      WHERE u.is_active = true
      ORDER BY p.id
    `;

    try {
      const result = await this.legacyPool.query(query);
      const currentTimestamp = new Date().toISOString();
      
      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        date_of_birth: row.birthdate,
        gender: row.sex || '',
        // Provide default values for missing fields in dispatch_patient
        phone: '',
        email: row.email || '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        insurance_provider: '',
        insurance_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        medical_history: '',
        allergies: '',
        medications: '',
        created_at: row.updated_at || currentTimestamp, // Use updated_at or current timestamp
        updated_at: row.updated_at || currentTimestamp,
        user_username: row.username,
        user_email: row.email || ''
      }));
    } catch (error) {
      throw new Error(`Failed to extract patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Extract comments - First check table structure, then extract data
   */
  private async extractComments(): Promise<LegacyComment[]> {
    try {
      // First, let's check what columns actually exist in dispatch_comment table
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dispatch_comment'
        ORDER BY ordinal_position
      `;
      
      console.log('🔍 DEBUG: Checking dispatch_comment table structure...');
      const schemaResult = await this.legacyPool.query(schemaQuery);
      console.log('📋 DEBUG: dispatch_comment columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      // Check if content_type_id exists
      const hasContentTypeId = schemaResult.rows.some(row => row.column_name === 'content_type_id');
      const hasObjectId = schemaResult.rows.some(row => row.column_name === 'object_id');
      
      console.log('🔍 DEBUG: Has content_type_id:', hasContentTypeId);
      console.log('🔍 DEBUG: Has object_id:', hasObjectId);
      
      let query: string;
      
      if (hasContentTypeId && hasObjectId) {
        // Use Generic Foreign Key approach
        console.log('📝 DEBUG: Using Generic FK approach for comments');
        query = `
          SELECT
            c.id,
            c.content_type_id,
            c.object_id,
            c.comment,
            c.user_id,
            c.created_at,
            c.updated_at,
            ct.app_label,
            ct.model,
            u.username,
            u.first_name,
            u.last_name
          FROM dispatch_comment c
          LEFT JOIN django_content_type ct ON c.content_type_id = ct.id
          LEFT JOIN auth_user u ON c.user_id = u.id
          ORDER BY c.id
        `;
      } else {
        // Fallback to basic comment extraction without Generic FK
        console.log('📝 DEBUG: Using basic approach for comments (no Generic FK)');
        query = `
          SELECT
            c.id,
            c.text as comment,
            c.author_id as user_id,
            c.created_at,
            c.plan_id,
            u.username,
            u.first_name,
            u.last_name
          FROM dispatch_comment c
          LEFT JOIN auth_user u ON c.author_id = u.id
          ORDER BY c.id
        `;
      }

      console.log('🔍 DEBUG: Executing comment extraction query...');
      const result = await this.legacyPool.query(query);
      console.log('📊 DEBUG: Found', result.rows.length, 'comments');
      
      return result.rows.map(row => ({
        id: row.id,
        content_type_id: row.content_type_id || null,
        object_id: row.object_id || null,
        text: row.comment || '',
        comment: row.comment || '',
        user_id: row.user_id,
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at, // Fallback to created_at if updated_at doesn't exist
        content_type_app: row.app_label || null,
        content_type_model: row.model || null,
        user_username: row.username || null,
        user_first_name: row.first_name || null,
        user_last_name: row.last_name || null,
        // Additional fields from actual schema
        plan_id: row.plan_id || null
      }));
    } catch (error) {
      console.error('❌ DEBUG: Comment extraction error:', error);
      throw new Error(`Failed to extract comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract workflow states - First check table structure, then extract data
   */
  private async extractStates(): Promise<LegacyState[]> {
    try {
      // First, let's check what columns actually exist in dispatch_state table
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dispatch_state'
        ORDER BY ordinal_position
      `;
      
      console.log('🔍 DEBUG: Checking dispatch_state table structure...');
      const schemaResult = await this.legacyPool.query(schemaQuery);
      console.log('📋 DEBUG: dispatch_state columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      // Check if content_type_id exists
      const hasContentTypeId = schemaResult.rows.some(row => row.column_name === 'content_type_id');
      const hasObjectId = schemaResult.rows.some(row => row.column_name === 'object_id');
      
      console.log('🔍 DEBUG: Has content_type_id:', hasContentTypeId);
      console.log('🔍 DEBUG: Has object_id:', hasObjectId);
      
      let query: string;
      
      if (hasContentTypeId && hasObjectId) {
        // Use Generic Foreign Key approach
        console.log('📝 DEBUG: Using Generic FK approach for states');
        query = `
          SELECT
            s.id,
            s.content_type_id,
            s.object_id,
            s.state,
            s.metadata,
            s.created_at,
            s.updated_at,
            ct.app_label,
            ct.model
          FROM dispatch_state s
          LEFT JOIN django_content_type ct ON s.content_type_id = ct.id
          ORDER BY s.id
        `;
      } else {
        // Fallback to basic state extraction without Generic FK
        console.log('📝 DEBUG: Using basic approach for states (no Generic FK)');
        query = `
          SELECT
            s.id,
            s.status as state,
            s.on,
            s.changed_at as created_at,
            s.changed_at as updated_at,
            s.actor_id,
            s.instruction_id,
            u.username,
            u.first_name,
            u.last_name
          FROM dispatch_state s
          LEFT JOIN auth_user u ON s.actor_id = u.id
          ORDER BY s.id
        `;
      }

      console.log('🔍 DEBUG: Executing state extraction query...');
      const result = await this.legacyPool.query(query);
      console.log('📊 DEBUG: Found', result.rows.length, 'states');
      
      return result.rows.map(row => ({
        id: row.id,
        content_type_id: row.content_type_id || null,
        object_id: row.object_id || null,
        state: row.state || '',
        metadata: row.metadata || '{}',
        created_at: row.created_at,
        updated_at: row.updated_at,
        content_type_app: row.app_label || null,
        content_type_model: row.model || null,
        // Additional fields from actual schema
        on: row.on || false,
        actor_id: row.actor_id || null,
        instruction_id: row.instruction_id || null,
        user_username: row.username || null,
        user_first_name: row.first_name || null,
        user_last_name: row.last_name || null
      }));
    } catch (error) {
      console.error('❌ DEBUG: State extraction error:', error);
      throw new Error(`Failed to extract states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract 3D projects from dispatch_project table - First check table structure, then extract data
   */
  private async extractProjects(): Promise<LegacyProject[]> {
    try {
      // First, let's check what columns actually exist in dispatch_project table
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dispatch_project'
        ORDER BY ordinal_position
      `;
      
      console.log('🔍 DEBUG: Checking dispatch_project table structure...');
      const schemaResult = await this.legacyPool.query(schemaQuery);
      console.log('📋 DEBUG: dispatch_project columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      // Build query based on available columns
      const availableColumns = schemaResult.rows.map(row => row.column_name);
      const columnMappings: Record<string, string | null> = {};
      
      // Map expected columns to actual columns
      columnMappings['id'] = availableColumns.includes('id') ? 'id' : 'id';
      columnMappings['practice_id'] = availableColumns.includes('practice_id') ? 'practice_id' :
                                     availableColumns.includes('office_id') ? 'office_id' : null;
      columnMappings['case_id'] = availableColumns.includes('case_id') ? 'case_id' :
                                 availableColumns.includes('patient_id') ? 'patient_id' : null;
      columnMappings['creator_id'] = availableColumns.includes('creator_id') ? 'creator_id' :
                                    availableColumns.includes('user_id') ? 'user_id' : null;
      columnMappings['name'] = availableColumns.includes('name') ? 'name' :
                              availableColumns.includes('title') ? 'title' : null;
      columnMappings['project_type'] = availableColumns.includes('project_type') ? 'project_type' :
                                      availableColumns.includes('type') ? 'type' : null;
      columnMappings['status'] = availableColumns.includes('status') ? 'status' : null;
      columnMappings['file_size'] = availableColumns.includes('file_size') ? 'file_size' : null;
      columnMappings['storage_path'] = availableColumns.includes('storage_path') ? 'storage_path' :
                                      availableColumns.includes('path') ? 'path' : null;
      columnMappings['is_public'] = availableColumns.includes('is_public') ? 'is_public' : null;
      columnMappings['metadata'] = availableColumns.includes('metadata') ? 'metadata' : null;
      columnMappings['version'] = availableColumns.includes('version') ? 'version' : null;
      columnMappings['parent_project_id'] = availableColumns.includes('parent_project_id') ? 'parent_project_id' : null;
      columnMappings['created_at'] = availableColumns.includes('created_at') ? 'created_at' : null;
      columnMappings['updated_at'] = availableColumns.includes('updated_at') ? 'updated_at' : null;
      
      console.log('🔍 DEBUG: Column mappings:', columnMappings);
      
      // Build SELECT clause with available columns
      const selectColumns: string[] = [];
      Object.entries(columnMappings).forEach(([expected, actual]) => {
        if (actual) {
          selectColumns.push(actual === expected ? actual : `${actual} as ${expected}`);
        }
      });
      
      const query = `
        SELECT ${selectColumns.join(', ')}
        FROM dispatch_project
        ORDER BY id
      `;
      
      console.log('🔍 DEBUG: Executing project extraction query...');
      const result = await this.legacyPool.query(query);
      console.log('📊 DEBUG: Found', result.rows.length, 'projects');
      
      const currentTimestamp = new Date().toISOString();
      
      return result.rows.map(row => ({
        id: row.id,
        practice_id: row.practice_id || null,
        case_id: row.case_id || null,
        creator_id: row.creator_id || null,
        name: row.name || '',
        project_type: row.project_type || 'other',
        status: row.status || 'draft',
        file_size: row.file_size || 0,
        storage_path: row.storage_path || '',
        is_public: row.is_public || false,
        metadata: row.metadata || '{}',
        version: row.version || 1,
        parent_project_id: row.parent_project_id || null,
        created_at: row.created_at || currentTimestamp,
        updated_at: row.updated_at || currentTimestamp
      }));
    } catch (error) {
      console.error('❌ DEBUG: Project extraction error:', error);
      throw new Error(`Failed to extract projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract workflow templates from dispatch_template table - First check table structure, then extract data
   */
  private async extractTemplates(): Promise<LegacyTemplate[]> {
    try {
      // First, let's check what columns actually exist in dispatch_template table
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dispatch_template'
        ORDER BY ordinal_position
      `;
      
      console.log('🔍 DEBUG: Checking dispatch_template table structure...');
      const schemaResult = await this.legacyPool.query(schemaQuery);
      console.log('📋 DEBUG: dispatch_template columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      // Build query based on available columns
      const availableColumns = schemaResult.rows.map(row => row.column_name);
      const columnMappings: Record<string, string | null> = {};
      
      // Map expected columns to actual columns
      columnMappings['id'] = availableColumns.includes('id') ? 'id' : 'id';
      columnMappings['workflow_template_id'] = availableColumns.includes('workflow_template_id') ? 'workflow_template_id' :
                                              availableColumns.includes('template_id') ? 'template_id' :
                                              availableColumns.includes('workflow_id') ? 'workflow_id' : null;
      columnMappings['task_name'] = availableColumns.includes('task_name') ? 'task_name' :
                                   availableColumns.includes('name') ? 'name' :
                                   availableColumns.includes('title') ? 'title' : null;
      columnMappings['task_order'] = availableColumns.includes('task_order') ? 'task_order' :
                                    availableColumns.includes('order') ? 'order' :
                                    availableColumns.includes('sequence') ? 'sequence' : null;
      columnMappings['function_type'] = availableColumns.includes('function_type') ? 'function_type' :
                                       availableColumns.includes('type') ? 'type' : null;
      columnMappings['is_predefined'] = availableColumns.includes('is_predefined') ? 'is_predefined' :
                                       availableColumns.includes('predefined') ? 'predefined' : null;
      columnMappings['action_name'] = availableColumns.includes('action_name') ? 'action_name' :
                                     availableColumns.includes('action') ? 'action' : null;
      columnMappings['text_prompt'] = availableColumns.includes('text_prompt') ? 'text_prompt' :
                                     availableColumns.includes('prompt') ? 'prompt' :
                                     availableColumns.includes('description') ? 'description' : null;
      columnMappings['estimated_duration'] = availableColumns.includes('estimated_duration') ? 'estimated_duration' :
                                            availableColumns.includes('duration') ? 'duration' : null;
      columnMappings['required_roles'] = availableColumns.includes('required_roles') ? 'required_roles' :
                                        availableColumns.includes('roles') ? 'roles' : null;
      columnMappings['category'] = availableColumns.includes('category') ? 'category' : null;
      columnMappings['auto_transition'] = availableColumns.includes('auto_transition') ? 'auto_transition' :
                                         availableColumns.includes('auto_advance') ? 'auto_advance' : null;
      columnMappings['predecessor_tasks'] = availableColumns.includes('predecessor_tasks') ? 'predecessor_tasks' :
                                           availableColumns.includes('dependencies') ? 'dependencies' : null;
      columnMappings['metadata'] = availableColumns.includes('metadata') ? 'metadata' : null;
      columnMappings['created_at'] = availableColumns.includes('created_at') ? 'created_at' :
                                    availableColumns.includes('created') ? 'created' : null;
      columnMappings['updated_at'] = availableColumns.includes('updated_at') ? 'updated_at' :
                                    availableColumns.includes('updated') ? 'updated' :
                                    availableColumns.includes('modified_at') ? 'modified_at' : null;

      console.log('🔍 DEBUG: Column mappings:', columnMappings);

      // Build SELECT clause with available columns
      const selectColumns: string[] = [];
      
      // Always include id
      selectColumns.push('id');
      
      // Add other columns if they exist
      if (columnMappings['workflow_template_id']) {
        selectColumns.push(`${columnMappings['workflow_template_id']} as workflow_template_id`);
      }
      if (columnMappings['task_name']) {
        selectColumns.push(`${columnMappings['task_name']} as task_name`);
      }
      if (columnMappings['task_order']) {
        selectColumns.push(`${columnMappings['task_order']} as task_order`);
      }
      if (columnMappings['function_type']) {
        selectColumns.push(`${columnMappings['function_type']} as function_type`);
      }
      if (columnMappings['is_predefined']) {
        selectColumns.push(`${columnMappings['is_predefined']} as is_predefined`);
      }
      if (columnMappings['action_name']) {
        selectColumns.push(`${columnMappings['action_name']} as action_name`);
      }
      if (columnMappings['text_prompt']) {
        selectColumns.push(`${columnMappings['text_prompt']} as text_prompt`);
      }
      if (columnMappings['estimated_duration']) {
        selectColumns.push(`${columnMappings['estimated_duration']} as estimated_duration`);
      }
      if (columnMappings['required_roles']) {
        selectColumns.push(`${columnMappings['required_roles']} as required_roles`);
      }
      if (columnMappings['category']) {
        selectColumns.push(`${columnMappings['category']} as category`);
      }
      if (columnMappings['auto_transition']) {
        selectColumns.push(`${columnMappings['auto_transition']} as auto_transition`);
      }
      if (columnMappings['predecessor_tasks']) {
        selectColumns.push(`${columnMappings['predecessor_tasks']} as predecessor_tasks`);
      }
      if (columnMappings['metadata']) {
        selectColumns.push(`${columnMappings['metadata']} as metadata`);
      }
      if (columnMappings['created_at']) {
        selectColumns.push(`${columnMappings['created_at']} as created_at`);
      }
      if (columnMappings['updated_at']) {
        selectColumns.push(`${columnMappings['updated_at']} as updated_at`);
      }

      const query = `
        SELECT ${selectColumns.join(', ')}
        FROM dispatch_template
        ORDER BY ${columnMappings['workflow_template_id'] || 'id'}, ${columnMappings['task_order'] || 'id'}
      `;

      console.log('🔍 DEBUG: Executing template extraction query...');
      const result = await this.legacyPool.query(query);
      console.log('📊 DEBUG: Found', result.rows.length, 'templates');
      
      const currentTimestamp = new Date().toISOString();
      
      return result.rows.map(row => ({
        id: row.id,
        workflow_template_id: row.workflow_template_id || null,
        task_name: row.task_name || '',
        task_order: row.task_order || 0,
        function_type: row.function_type || 'process',
        is_predefined: row.is_predefined || false,
        action_name: row.action_name || '',
        text_prompt: row.text_prompt || '',
        estimated_duration: row.estimated_duration || '',
        required_roles: row.required_roles || '',
        category: row.category || '',
        auto_transition: row.auto_transition || false,
        predecessor_tasks: row.predecessor_tasks || '',
        metadata: row.metadata || '{}',
        created_at: row.created_at || currentTimestamp,
        updated_at: row.updated_at || currentTimestamp
      }));
    } catch (error) {
      console.error('❌ DEBUG: Template extraction error:', error);
      throw new Error(`Failed to extract templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract granular instruction states from dispatch_instruction_state table (if it exists)
   */
  private async extractInstructionStates(): Promise<LegacyInstructionState[]> {
    try {
      // First, check if the table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'dispatch_instruction_state'
        );
      `;
      
      console.log('🔍 DEBUG: Checking if dispatch_instruction_state table exists...');
      const existsResult = await this.legacyPool.query(tableExistsQuery);
      const tableExists = existsResult.rows[0]?.exists || false;
      
      if (!tableExists) {
        console.log('⚠️  DEBUG: dispatch_instruction_state table does not exist, skipping extraction');
        return [];
      }

      console.log('✅ DEBUG: dispatch_instruction_state table exists, proceeding with extraction');
      
      // Check table structure if it exists
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dispatch_instruction_state'
        ORDER BY ordinal_position
      `;
      
      const schemaResult = await this.legacyPool.query(schemaQuery);
      console.log('📋 DEBUG: dispatch_instruction_state columns:', schemaResult.rows.map(r => `${r.column_name} (${r.data_type})`));
      
      // Build query based on available columns
      const availableColumns = schemaResult.rows.map(row => row.column_name);
      const selectColumns: string[] = ['id']; // Always include id
      
      // Add other columns if they exist
      if (availableColumns.includes('case_id')) selectColumns.push('case_id');
      if (availableColumns.includes('instruction_type')) selectColumns.push('instruction_type');
      if (availableColumns.includes('status_code')) selectColumns.push('status_code');
      if (availableColumns.includes('is_active')) selectColumns.push('is_active');
      if (availableColumns.includes('changed_by')) selectColumns.push('changed_by');
      if (availableColumns.includes('changed_at')) selectColumns.push('changed_at');
      if (availableColumns.includes('metadata')) selectColumns.push('metadata');
      if (availableColumns.includes('notes')) selectColumns.push('notes');
      if (availableColumns.includes('created_at')) selectColumns.push('created_at');
      if (availableColumns.includes('updated_at')) selectColumns.push('updated_at');

      const query = `
        SELECT ${selectColumns.join(', ')}
        FROM dispatch_instruction_state
        ORDER BY ${availableColumns.includes('case_id') ? 'case_id' : 'id'}, ${availableColumns.includes('changed_at') ? 'changed_at' : 'id'}
      `;

      console.log('🔍 DEBUG: Executing instruction states extraction query...');
      const result = await this.legacyPool.query(query);
      console.log('📊 DEBUG: Found', result.rows.length, 'instruction states');
      
      const currentTimestamp = new Date().toISOString();
      
      return result.rows.map(row => ({
        id: row.id,
        case_id: row.case_id || null,
        instruction_type: row.instruction_type || '',
        status_code: row.status_code || 0,
        is_active: row.is_active || false,
        changed_by: row.changed_by || null,
        changed_at: row.changed_at || currentTimestamp,
        metadata: row.metadata || '{}',
        notes: row.notes || '',
        created_at: row.created_at || currentTimestamp,
        updated_at: row.updated_at || currentTimestamp
      }));
    } catch (error) {
      console.error('❌ DEBUG: Instruction states extraction error:', error);
      // Don't throw error if table doesn't exist, just return empty array
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.log('⚠️  DEBUG: Table does not exist, returning empty array');
        return [];
      }
      throw new Error(`Failed to extract instruction states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract data for a specific table with custom query
   */
  async extractCustomData<T>(
    tableName: string,
    customQuery?: string,
    params?: unknown[]
  ): Promise<T[]> {
    const query = customQuery || `SELECT * FROM ${tableName} ORDER BY id`;
    
    try {
      const result = await this.legacyPool.query(query, params);
      return result.rows as T[];
    } catch (error) {
      throw new Error(`Failed to extract data from ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get table row counts for validation
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const tables = [
      'auth_user',
      'dispatch_office',
      'dispatch_patient',
      'dispatch_order',
      'dispatch_comment',
      'dispatch_state',
      'django_content_type',
      'dispatch_project',
      'dispatch_template',
      'dispatch_instruction_state'
    ];

    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const result = await this.legacyPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0]?.count || '0');
      } catch (error) {
        console.warn(`Failed to get count for table ${table}:`, error);
        counts[table] = 0;
      }
    }

    return counts;
  }

  /**
   * Validate data integrity before extraction
   */
  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for orphaned patients
      const orphanedPatients = await this.legacyPool.query(`
        SELECT COUNT(*) as count 
        FROM dispatch_patient p 
        LEFT JOIN auth_user u ON p.user_id = u.id 
        WHERE u.id IS NULL
      `);
      
      if (parseInt(orphanedPatients.rows[0]?.count || '0') > 0) {
        warnings.push(`Found ${orphanedPatients.rows[0].count} patients with invalid user references`);
      }

      // Check for orphaned orders
      const orphanedOrders = await this.legacyPool.query(`
        SELECT COUNT(*) as count 
        FROM dispatch_order o 
        LEFT JOIN dispatch_patient p ON o.patient_id = p.id 
        WHERE p.id IS NULL
      `);
      
      if (parseInt(orphanedOrders.rows[0]?.count || '0') > 0) {
        warnings.push(`Found ${orphanedOrders.rows[0].count} orders with invalid patient references`);
      }

      // Check for invalid Generic FK references
      const invalidComments = await this.legacyPool.query(`
        SELECT COUNT(*) as count 
        FROM dispatch_comment c 
        LEFT JOIN django_content_type ct ON c.content_type_id = ct.id 
        WHERE ct.id IS NULL
      `);
      
      if (parseInt(invalidComments.rows[0]?.count || '0') > 0) {
        issues.push(`Found ${invalidComments.rows[0].count} comments with invalid content type references`);
      }

      // Check for duplicate patients (same user_id)
      const duplicatePatients = await this.legacyPool.query(`
        SELECT user_id, COUNT(*) as count 
        FROM dispatch_patient 
        WHERE user_id IS NOT NULL 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicatePatients.rows.length > 0) {
        warnings.push(`Found ${duplicatePatients.rows.length} users with multiple patient records`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      issues.push(`Data integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        issues,
        warnings
      };
    }
  }

  /**
   * Update extraction progress
   */
  private updateProgress(message: string, percentage: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage: 'extraction',
        message,
        percentage,
        timestamp: new Date()
      });
    }
  }

  /**
   * Calculate extraction statistics
   */
  private calculateStats(result: ExtractionResult, startTime: number): ExtractionStats {
    const totalRecords =
      result.patients.length +
      result.comments.length +
      result.states.length +
      result.users.length +
      result.practices.length +
      result.contentTypes.length +
      result.projects.length +
      result.templates.length +
      result.instructionStates.length;

    return {
      totalRecords,
      extractedRecords: totalRecords,
      skippedRecords: 0,
      errorRecords: 0,
      extractionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Connection cleanup is handled by the connection manager
    // This method is for any extractor-specific cleanup
  }
}