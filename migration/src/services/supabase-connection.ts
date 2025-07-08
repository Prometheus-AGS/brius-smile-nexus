/**
 * Supabase database connection service
 * Handles connections to the target Supabase database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MigrationConfig, SupabaseProfile, SupabaseOffice, SupabaseOrderType, SupabaseOrderState, SupabaseOrder, SupabaseProject, SupabaseMessageType, SupabaseMessage, SupabaseWorkflowTemplate, SupabaseWorkflowTask, SupabaseInstructionState, MigrationResult, BatchProcessingResult } from '../types/migration-types';
import { Logger } from '../utils/logger';

export class SupabaseConnectionService {
  private client: SupabaseClient;
  private logger: Logger;

  constructor(config: MigrationConfig['supabase'], logger: Logger) {
    this.logger = logger;
    this.client = createClient(config.url, config.service_role_key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Test Supabase connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        this.logger.error('Supabase connection test failed', { error: error.message });
        return false;
      }

      this.logger.info('Supabase connection successful');
      return true;
    } catch (error) {
      this.logger.error('Supabase connection failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Get the Supabase client for direct use
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Insert profiles in batch
   */
  async insertProfiles(profiles: Partial<SupabaseProfile>[]): Promise<BatchProcessingResult<SupabaseProfile>> {
    const startTime = Date.now();
    const successful: SupabaseProfile[] = [];
    const failed: Array<{ item: Partial<SupabaseProfile>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('profiles')
        .insert(profiles)
        .select();

      if (error) {
        this.logger.error('Batch profile insert failed', { 
          error: error.message,
          count: profiles.length 
        });
        
        // Add all items to failed array
        profiles.forEach(profile => {
          failed.push({ item: profile, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseProfile[]);
        this.logger.info('Batch profile insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch profile insert exception', { error: errorMessage });
      
      profiles.forEach(profile => {
        failed.push({ item: profile, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: profiles.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert single profile
   */
  async insertProfile(profile: Partial<SupabaseProfile>): Promise<MigrationResult<SupabaseProfile>> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .insert(profile)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          details: { profile }
        };
      }

      return {
        success: true,
        data: data as SupabaseProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { profile }
      };
    }
  }

  /**
   * Insert offices in batch
   */
  async insertOffices(offices: Partial<SupabaseOffice>[]): Promise<BatchProcessingResult<SupabaseOffice>> {
    const startTime = Date.now();
    const successful: SupabaseOffice[] = [];
    const failed: Array<{ item: Partial<SupabaseOffice>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('offices')
        .insert(offices)
        .select();

      if (error) {
        this.logger.error('Batch office insert failed', { 
          error: error.message,
          count: offices.length 
        });
        
        offices.forEach(office => {
          failed.push({ item: office, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseOffice[]);
        this.logger.info('Batch office insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch office insert exception', { error: errorMessage });
      
      offices.forEach(office => {
        failed.push({ item: office, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: offices.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert order types in batch
   */
  async insertOrderTypes(orderTypes: Partial<SupabaseOrderType>[]): Promise<BatchProcessingResult<SupabaseOrderType>> {
    const startTime = Date.now();
    const successful: SupabaseOrderType[] = [];
    const failed: Array<{ item: Partial<SupabaseOrderType>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('order_types')
        .insert(orderTypes)
        .select();

      if (error) {
        this.logger.error('Batch order type insert failed', { 
          error: error.message,
          count: orderTypes.length 
        });
        
        orderTypes.forEach(orderType => {
          failed.push({ item: orderType, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseOrderType[]);
        this.logger.info('Batch order type insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch order type insert exception', { error: errorMessage });
      
      orderTypes.forEach(orderType => {
        failed.push({ item: orderType, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: orderTypes.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert order states in batch
   */
  async insertOrderStates(orderStates: Partial<SupabaseOrderState>[]): Promise<BatchProcessingResult<SupabaseOrderState>> {
    const startTime = Date.now();
    const successful: SupabaseOrderState[] = [];
    const failed: Array<{ item: Partial<SupabaseOrderState>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('order_states')
        .insert(orderStates)
        .select();

      if (error) {
        this.logger.error('Batch order state insert failed', { 
          error: error.message,
          count: orderStates.length 
        });
        
        orderStates.forEach(orderState => {
          failed.push({ item: orderState, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseOrderState[]);
        this.logger.info('Batch order state insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch order state insert exception', { error: errorMessage });
      
      orderStates.forEach(orderState => {
        failed.push({ item: orderState, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: orderStates.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert orders in batch
   */
  async insertOrders(orders: Partial<SupabaseOrder>[]): Promise<BatchProcessingResult<SupabaseOrder>> {
    const startTime = Date.now();
    const successful: SupabaseOrder[] = [];
    const failed: Array<{ item: Partial<SupabaseOrder>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('orders')
        .insert(orders)
        .select();

      if (error) {
        this.logger.error('Batch order insert failed', { 
          error: error.message,
          count: orders.length 
        });
        
        orders.forEach(order => {
          failed.push({ item: order, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseOrder[]);
        this.logger.info('Batch order insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch order insert exception', { error: errorMessage });
      
      orders.forEach(order => {
        failed.push({ item: order, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: orders.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert projects in batch
   */
  async insertProjects(projects: Partial<SupabaseProject>[]): Promise<BatchProcessingResult<SupabaseProject>> {
    const startTime = Date.now();
    const successful: SupabaseProject[] = [];
    const failed: Array<{ item: Partial<SupabaseProject>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('projects')
        .insert(projects)
        .select();

      if (error) {
        this.logger.error('Batch project insert failed', { 
          error: error.message,
          count: projects.length 
        });
        
        projects.forEach(project => {
          failed.push({ item: project, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseProject[]);
        this.logger.info('Batch project insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch project insert exception', { error: errorMessage });
      
      projects.forEach(project => {
        failed.push({ item: project, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: projects.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert message types in batch
   */
  async insertMessageTypes(messageTypes: Partial<SupabaseMessageType>[]): Promise<BatchProcessingResult<SupabaseMessageType>> {
    const startTime = Date.now();
    const successful: SupabaseMessageType[] = [];
    const failed: Array<{ item: Partial<SupabaseMessageType>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('message_types')
        .insert(messageTypes)
        .select();

      if (error) {
        this.logger.error('Batch message type insert failed', { 
          error: error.message,
          count: messageTypes.length 
        });
        
        messageTypes.forEach(messageType => {
          failed.push({ item: messageType, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseMessageType[]);
        this.logger.info('Batch message type insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch message type insert exception', { error: errorMessage });
      
      messageTypes.forEach(messageType => {
        failed.push({ item: messageType, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: messageTypes.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert messages in batch
   */
  async insertMessages(messages: Partial<SupabaseMessage>[]): Promise<BatchProcessingResult<SupabaseMessage>> {
    const startTime = Date.now();
    const successful: SupabaseMessage[] = [];
    const failed: Array<{ item: Partial<SupabaseMessage>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('messages')
        .insert(messages)
        .select();

      if (error) {
        this.logger.error('Batch message insert failed', { 
          error: error.message,
          count: messages.length 
        });
        
        messages.forEach(message => {
          failed.push({ item: message, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseMessage[]);
        this.logger.info('Batch message insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch message insert exception', { error: errorMessage });
      
      messages.forEach(message => {
        failed.push({ item: message, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: messages.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert workflow templates in batch
   */
  async insertWorkflowTemplates(templates: Partial<SupabaseWorkflowTemplate>[]): Promise<BatchProcessingResult<SupabaseWorkflowTemplate>> {
    const startTime = Date.now();
    const successful: SupabaseWorkflowTemplate[] = [];
    const failed: Array<{ item: Partial<SupabaseWorkflowTemplate>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('workflow_templates')
        .insert(templates)
        .select();

      if (error) {
        this.logger.error('Batch workflow template insert failed', { 
          error: error.message,
          count: templates.length 
        });
        
        templates.forEach(template => {
          failed.push({ item: template, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseWorkflowTemplate[]);
        this.logger.info('Batch workflow template insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch workflow template insert exception', { error: errorMessage });
      
      templates.forEach(template => {
        failed.push({ item: template, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: templates.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert workflow tasks in batch
   */
  async insertWorkflowTasks(tasks: Partial<SupabaseWorkflowTask>[]): Promise<BatchProcessingResult<SupabaseWorkflowTask>> {
    const startTime = Date.now();
    const successful: SupabaseWorkflowTask[] = [];
    const failed: Array<{ item: Partial<SupabaseWorkflowTask>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('workflow_tasks')
        .insert(tasks)
        .select();

      if (error) {
        this.logger.error('Batch workflow task insert failed', { 
          error: error.message,
          count: tasks.length 
        });
        
        tasks.forEach(task => {
          failed.push({ item: task, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseWorkflowTask[]);
        this.logger.info('Batch workflow task insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch workflow task insert exception', { error: errorMessage });
      
      tasks.forEach(task => {
        failed.push({ item: task, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: tasks.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Insert instruction states in batch
   */
  async insertInstructionStates(states: Partial<SupabaseInstructionState>[]): Promise<BatchProcessingResult<SupabaseInstructionState>> {
    const startTime = Date.now();
    const successful: SupabaseInstructionState[] = [];
    const failed: Array<{ item: Partial<SupabaseInstructionState>; error: string }> = [];

    try {
      const { data, error } = await this.client
        .from('instruction_states')
        .insert(states)
        .select();

      if (error) {
        this.logger.error('Batch instruction state insert failed', { 
          error: error.message,
          count: states.length 
        });
        
        states.forEach(state => {
          failed.push({ item: state, error: error.message });
        });
      } else if (data) {
        successful.push(...data as SupabaseInstructionState[]);
        this.logger.info('Batch instruction state insert successful', { count: data.length });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Batch instruction state insert exception', { error: errorMessage });
      
      states.forEach(state => {
        failed.push({ item: state, error: errorMessage });
      });
    }

    return {
      successful,
      failed,
      total_processed: states.length,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Get record counts for validation
   */
  async getRecordCounts(): Promise<Record<string, number>> {
    const tables = [
      'profiles',
      'offices', 
      'order_types',
      'order_states',
      'orders',
      'projects',
      'message_types',
      'messages',
      'workflow_templates',
      'workflow_tasks',
      'instruction_states'
    ];

    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { count, error } = await this.client
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          this.logger.warn(`Failed to get count for ${table}`, { error: error.message });
          counts[table] = 0;
        } else {
          counts[table] = count || 0;
        }
      } catch (error) {
        this.logger.warn(`Exception getting count for ${table}`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        counts[table] = 0;
      }
    }

    this.logger.info('Retrieved Supabase record counts', counts);
    return counts;
  }

  /**
   * Validate migration completeness
   */
  async validateMigration(): Promise<{
    profiles_with_legacy_ids: number;
    orders_with_legacy_ids: number;
    projects_with_legacy_ids: number;
    messages_with_legacy_ids: number;
    orphaned_records: number;
  }> {
    const results = {
      profiles_with_legacy_ids: 0,
      orders_with_legacy_ids: 0,
      projects_with_legacy_ids: 0,
      messages_with_legacy_ids: 0,
      orphaned_records: 0
    };

    try {
      // Count profiles with legacy IDs
      const { count: profileCount } = await this.client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('legacy_user_id', 'is', null);
      results.profiles_with_legacy_ids = profileCount || 0;

      // Count orders with legacy IDs
      const { count: orderCount } = await this.client
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('legacy_instruction_id', 'is', null);
      results.orders_with_legacy_ids = orderCount || 0;

      // Count projects with legacy IDs
      const { count: projectCount } = await this.client
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .not('legacy_project_id', 'is', null);
      results.projects_with_legacy_ids = projectCount || 0;

      // Count messages with legacy IDs
      const { count: messageCount } = await this.client
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .not('legacy_record_id', 'is', null);
      results.messages_with_legacy_ids = messageCount || 0;

      this.logger.info('Migration validation completed', results);
    } catch (error) {
      this.logger.error('Migration validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    return results;
  }

  /**
   * Clear all migration data (for rollback)
   */
  async clearAllData(): Promise<boolean> {
    const tables = [
      'instruction_states',
      'workflow_tasks',
      'workflow_templates',
      'messages',
      'message_types',
      'projects',
      'orders',
      'order_states',
      'order_types',
      'doctor_offices',
      'offices',
      'profiles'
    ];

    try {
      for (const table of tables) {
        const { error } = await this.client
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error) {
          this.logger.error(`Failed to clear table ${table}`, { error: error.message });
          return false;
        }

        this.logger.info(`Cleared table ${table}`);
      }

      this.logger.info('All migration data cleared successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear migration data', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Execute raw SQL query (for advanced operations)
   */
  async executeRawSQL(query: string): Promise<MigrationResult<unknown[]>> {
    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });

      if (error) {
        return {
          success: false,
          error: error.message,
          details: { query }
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { query }
      };
    }
  }
}