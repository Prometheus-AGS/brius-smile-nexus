/**
 * Orders migrator - Complete implementation
 * Handles migration of dispatch_instruction to orders table with full data transformation
 * 
 * This migrator processes 23,265+ instructions from the legacy Django database
 * and transforms them into the new Supabase orders structure with proper ID resolution,
 * batch processing, and comprehensive error handling.
 */

import { LegacyConnectionService } from '../services/legacy-connection';
import { SupabaseConnectionService } from '../services/supabase-connection';
import { Logger } from '../utils/logger';
import { ProgressTracker } from '../utils/progress-tracker';
import { 
  LegacyInstruction,
  LegacyCourse,
  SupabaseOrder,
  SupabaseOrderType,
  LegacyIdLookup,
  MigrationError,
  MigrationPhase,
  BatchProcessingResult
} from '../types/migration-types';

/**
 * Configuration interface for OrdersMigrator
 */
interface OrdersMigratorConfig {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  validateData: boolean;
  generateOrderNumbers: boolean;
}

/**
 * Statistics interface for migration tracking
 */
interface OrdersMigrationStats {
  totalInstructions: number;
  ordersCreated: number;
  ordersFailed: number;
  orderTypesCreated: number;
  orderStatesCreated: number;
  missingPatientIds: number;
  missingDoctorIds: number;
  missingOfficeIds: number;
  missingCourseIds: number;
  processingTimeMs: number;
}

/**
 * Enhanced instruction data with related information
 */
interface EnhancedInstruction extends LegacyInstruction {
  order_data?: Record<string, unknown>;
  course_name?: string;
  office_name?: string;
}

/**
 * Order mapping result for batch processing
 */
interface OrderMappingResult {
  instruction: EnhancedInstruction;
  order: Partial<SupabaseOrder>;
  errors: string[];
  warnings: string[];
}

/**
 * Batch processing result with enhanced error details
 */
interface OrderBatchResult {
  successful: SupabaseOrder[];
  failed: Array<{
    mapping: OrderMappingResult;
    error: string;
    retryCount: number;
  }>;
  batchNumber: number;
  processingTimeMs: number;
}

export class OrdersMigrator {
  private legacyDb: LegacyConnectionService;
  private supabaseDb: SupabaseConnectionService;
  private logger: Logger;
  private progressTracker: ProgressTracker;
  private config: OrdersMigratorConfig;
  private stats: OrdersMigrationStats;
  private idLookup: LegacyIdLookup;

  constructor(
    legacyDb: LegacyConnectionService,
    supabaseDb: SupabaseConnectionService,
    logger: Logger,
    progressTracker?: ProgressTracker,
    config?: Partial<OrdersMigratorConfig>
  ) {
    this.legacyDb = legacyDb;
    this.supabaseDb = supabaseDb;
    this.logger = logger;
    this.progressTracker = progressTracker || new ProgressTracker('orders-migration', logger);
    
    // Default configuration
    this.config = {
      batchSize: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      validateData: true,
      generateOrderNumbers: true,
      ...config
    };

    // Initialize statistics
    this.stats = {
      totalInstructions: 0,
      ordersCreated: 0,
      ordersFailed: 0,
      orderTypesCreated: 0,
      orderStatesCreated: 0,
      missingPatientIds: 0,
      missingDoctorIds: 0,
      missingOfficeIds: 0,
      missingCourseIds: 0,
      processingTimeMs: 0
    };

    // Initialize ID lookup maps
    this.idLookup = {
      profiles: new Map(),
      patients: new Map(),
      offices: new Map(),
      orders: new Map(),
      projects: new Map(),
      order_types: new Map(),
      states: new Map(),
      templates: new Map()
    };
  }

  /**
   * Main migration method - migrates order types first, then orders
   */
  async migrateOrderTypes(): Promise<void> {
    const timer = this.logger.timer('order-types-migration');
    
    try {
      await this.logger.info('Starting order types migration');
      
      // Build ID lookup maps
      await this.buildIdLookupMaps();
      
      // Get all courses from legacy database
      const legacyCourses = await this.legacyDb.getAllCourses();
      await this.logger.info('Retrieved legacy courses', { count: legacyCourses.length });

      if (legacyCourses.length === 0) {
        await this.logger.warn('No legacy courses found to migrate');
        return;
      }

      // Transform courses to order types
      const orderTypes = await this.transformCoursesToOrderTypes(legacyCourses);
      
      // Insert order types in batches
      const batchResults = await this.insertOrderTypesInBatches(orderTypes);
      
      // Update statistics
      this.stats.orderTypesCreated = batchResults.reduce((sum, result) => sum + result.successful.length, 0);
      
      // Update ID lookup map with new order types
      await this.updateOrderTypesLookup(batchResults);
      
      await timer.end('Order types migration completed', {
        order_types_created: this.stats.orderTypesCreated,
        batches_processed: batchResults.length
      });

    } catch (error) {
      await timer.endWithError(error as Error, 'Order types migration failed');
      throw new MigrationError(
        'Order types migration failed',
        'order-types',
        'migration',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Main orders migration method
   */
  async migrateOrders(): Promise<void> {
    const timer = this.logger.timer('orders-migration');
    
    try {
      await this.logger.info('Starting orders migration');
      
      // Ensure ID lookup maps are built
      if (this.idLookup.profiles.size === 0) {
        await this.buildIdLookupMaps();
      }
      
      // Create default order states if they don't exist
      await this.createDefaultOrderStates();
      
      // Get total count of instructions
      const recordCounts = await this.legacyDb.getRecordCounts();
      this.stats.totalInstructions = recordCounts['instructions'] || 0;
      
      await this.logger.info('Starting orders batch processing', {
        total_instructions: this.stats.totalInstructions,
        batch_size: this.config.batchSize
      });

      if (this.stats.totalInstructions === 0) {
        await this.logger.warn('No legacy instructions found to migrate');
        return;
      }

      // Process instructions in batches
      const totalBatches = Math.ceil(this.stats.totalInstructions / this.config.batchSize);
      let currentBatch = 0;
      
      for (let offset = 0; offset < this.stats.totalInstructions; offset += this.config.batchSize) {
        currentBatch++;
        
        await this.logger.info(`Processing batch ${currentBatch}/${totalBatches}`, {
          offset,
          batch_size: this.config.batchSize
        });

        // Get batch of instructions with related data
        const instructionsBatch = await this.getEnhancedInstructionsBatch(offset, this.config.batchSize);
        
        if (instructionsBatch.length === 0) {
          await this.logger.warn(`No instructions found in batch ${currentBatch}`);
          continue;
        }

        // Transform instructions to orders
        const orderMappings = await this.transformInstructionsToOrders(instructionsBatch);
        
        // Insert orders batch
        const batchResult = await this.insertOrdersBatch(orderMappings, currentBatch);
        
        // Update statistics
        this.stats.ordersCreated += batchResult.successful.length;
        this.stats.ordersFailed += batchResult.failed.length;
        
        // Update progress
        await this.progressTracker.updateSubstepProgress(
          { name: 'orders-migration' } as MigrationPhase,
          'process-orders',
          offset + instructionsBatch.length,
          this.stats.totalInstructions
        );

        // Log batch completion
        await this.logger.info(`Completed batch ${currentBatch}/${totalBatches}`, {
          successful: batchResult.successful.length,
          failed: batchResult.failed.length,
          processing_time_ms: batchResult.processingTimeMs
        });

        // Brief pause between batches to avoid overwhelming the database
        if (currentBatch < totalBatches) {
          await this.sleep(100);
        }
      }
      
      await timer.end('Orders migration completed', {
        orders_created: this.stats.ordersCreated,
        orders_failed: this.stats.ordersFailed,
        total_batches: totalBatches
      });

    } catch (error) {
      await timer.endWithError(error as Error, 'Orders migration failed');
      throw new MigrationError(
        'Orders migration failed',
        'orders',
        'migration',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Build ID lookup maps from existing Supabase data
   */
  private async buildIdLookupMaps(): Promise<void> {
    const timer = this.logger.timer('build-id-lookup-maps');
    
    try {
      await this.logger.info('Building ID lookup maps');

      // Get profiles mapping (users and patients)
      const profilesResult = await this.supabaseDb.executeRawSQL(`
        SELECT id, legacy_user_id, legacy_patient_id
        FROM profiles
        WHERE legacy_user_id IS NOT NULL OR legacy_patient_id IS NOT NULL
      `);

      if (profilesResult.success && Array.isArray(profilesResult.data)) {
        for (const profile of profilesResult.data as Array<{id: string, legacy_user_id: number | null, legacy_patient_id: number | null}>) {
          if (profile.legacy_user_id) {
            this.idLookup.profiles.set(profile.legacy_user_id, profile.id);
          }
          if (profile.legacy_patient_id) {
            this.idLookup.patients.set(profile.legacy_patient_id, profile.id);
          }
        }
      }

      // Get offices mapping
      const officesResult = await this.supabaseDb.executeRawSQL(`
        SELECT id, legacy_office_id
        FROM offices
        WHERE legacy_office_id IS NOT NULL
      `);

      if (officesResult.success && Array.isArray(officesResult.data)) {
        for (const office of officesResult.data as Array<{id: string, legacy_office_id: number}>) {
          this.idLookup.offices.set(office.legacy_office_id, office.id);
        }
      }

      // Get order types mapping
      const orderTypesResult = await this.supabaseDb.executeRawSQL(`
        SELECT id, legacy_course_id
        FROM order_types
        WHERE legacy_course_id IS NOT NULL
      `);

      if (orderTypesResult.success && Array.isArray(orderTypesResult.data)) {
        for (const orderType of orderTypesResult.data as Array<{id: string, legacy_course_id: number}>) {
          this.idLookup.order_types.set(orderType.legacy_course_id, orderType.id);
        }
      }

      await timer.end('ID lookup maps built', {
        profiles_count: this.idLookup.profiles.size,
        patients_count: this.idLookup.patients.size,
        offices_count: this.idLookup.offices.size,
        order_types_count: this.idLookup.order_types.size
      });

    } catch (error) {
      await timer.endWithError(error as Error, 'Failed to build ID lookup maps');
      throw error;
    }
  }

  /**
   * Transform legacy courses to Supabase order types
   */
  private async transformCoursesToOrderTypes(courses: LegacyCourse[]): Promise<Partial<SupabaseOrderType>[]> {
    const orderTypes: Partial<SupabaseOrderType>[] = [];
    
    for (const course of courses) {
      const orderType: Partial<SupabaseOrderType> = {
        legacy_course_id: course.id,
        name: course.name,
        key: this.generateOrderTypeKey(course.name),
        description: course.description,
        category: course.category,
        schema: null,
        is_active: course.is_active,
        created_at: course.created_at,
        updated_at: course.updated_at
      };
      
      orderTypes.push(orderType);
    }
    
    return orderTypes;
  }

  /**
   * Generate a unique key for order type
   */
  private generateOrderTypeKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Insert order types in batches
   */
  private async insertOrderTypesInBatches(orderTypes: Partial<SupabaseOrderType>[]): Promise<BatchProcessingResult<SupabaseOrderType>[]> {
    const results: BatchProcessingResult<SupabaseOrderType>[] = [];
    const totalBatches = Math.ceil(orderTypes.length / this.config.batchSize);
    
    for (let i = 0; i < orderTypes.length; i += this.config.batchSize) {
      const batch = orderTypes.slice(i, i + this.config.batchSize);
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;
      
      await this.logger.info(`Inserting order types batch ${batchNumber}/${totalBatches}`, {
        batch_size: batch.length
      });

      const result = await this.supabaseDb.insertOrderTypes(batch);
      results.push(result);
      
      if (result.failed.length > 0) {
        await this.logger.warn(`Order types batch ${batchNumber} had failures`, {
          successful: result.successful.length,
          failed: result.failed.length
        });
      }
    }
    
    return results;
  }

  /**
   * Update order types lookup map with newly created order types
   */
  private async updateOrderTypesLookup(batchResults: BatchProcessingResult<SupabaseOrderType>[]): Promise<void> {
    for (const result of batchResults) {
      for (const orderType of result.successful) {
        if (orderType.legacy_course_id) {
          this.idLookup.order_types.set(orderType.legacy_course_id, orderType.id);
        }
      }
    }
  }

  /**
   * Create default order states if they don't exist
   */
  private async createDefaultOrderStates(): Promise<void> {
    const defaultStates = [
      {
        name: 'Submitted',
        key: 'submitted',
        description: 'Order has been submitted',
        color: '#3B82F6',
        sequence_order: 1,
        is_initial: true,
        is_final: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'In Progress',
        key: 'in_progress',
        description: 'Order is being processed',
        color: '#F59E0B',
        sequence_order: 2,
        is_initial: false,
        is_final: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Completed',
        key: 'completed',
        description: 'Order has been completed',
        color: '#10B981',
        sequence_order: 3,
        is_initial: false,
        is_final: true,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Cancelled',
        key: 'cancelled',
        description: 'Order has been cancelled',
        color: '#EF4444',
        sequence_order: 4,
        is_initial: false,
        is_final: true,
        is_active: true,
        metadata: {}
      }
    ];

    try {
      const result = await this.supabaseDb.insertOrderStates(defaultStates);
      this.stats.orderStatesCreated = result.successful.length;
      
      await this.logger.info('Created default order states', {
        created: result.successful.length,
        failed: result.failed.length
      });
    } catch (error) {
      await this.logger.warn('Failed to create default order states', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get enhanced instructions batch with related data
   */
  private async getEnhancedInstructionsBatch(offset: number, limit: number): Promise<EnhancedInstruction[]> {
    const instructions = await this.legacyDb.getInstructionsBatch(offset, limit);
    const enhanced: EnhancedInstruction[] = [];
    
    for (const instruction of instructions) {
      const enhancedInstruction: EnhancedInstruction = { ...instruction };
      
      // Add any additional data transformation here if needed
      // For now, we'll use the instruction as-is
      enhanced.push(enhancedInstruction);
    }
    
    return enhanced;
  }

  /**
   * Transform instructions to orders with proper ID resolution
   */
  private async transformInstructionsToOrders(instructions: EnhancedInstruction[]): Promise<OrderMappingResult[]> {
    const mappings: OrderMappingResult[] = [];
    
    for (const instruction of instructions) {
      const mapping: OrderMappingResult = {
        instruction,
        order: {},
        errors: [],
        warnings: []
      };

      try {
        // Resolve patient ID
        const patientId = this.idLookup.patients.get(instruction.patient_id) || 
                         this.idLookup.profiles.get(instruction.patient_id);
        if (!patientId) {
          mapping.errors.push(`Patient ID ${instruction.patient_id} not found in profiles`);
          this.stats.missingPatientIds++;
        }

        // Resolve doctor ID
        const doctorId = this.idLookup.profiles.get(instruction.doctor_id);
        if (!doctorId) {
          mapping.errors.push(`Doctor ID ${instruction.doctor_id} not found in profiles`);
          this.stats.missingDoctorIds++;
        }

        // Resolve office ID - need to get office from doctor relationship
        let officeId: string | undefined;
        if (instruction.office_id) {
          officeId = this.idLookup.offices.get(instruction.office_id);
          if (!officeId) {
            mapping.errors.push(`Office ID ${instruction.office_id} not found in offices`);
            this.stats.missingOfficeIds++;
          }
        }

        // Resolve order type ID
        const orderTypeId = this.idLookup.order_types.get(instruction.course_id);
        if (!orderTypeId) {
          mapping.errors.push(`Course ID ${instruction.course_id} not found in order types`);
          this.stats.missingCourseIds++;
        }

        // Generate order number
        const orderNumber = this.config.generateOrderNumbers 
          ? this.generateOrderNumber(instruction.id)
          : `ORD-${instruction.id}`;

        // Only build the order object if we have the required fields
        if (patientId && doctorId && orderTypeId && officeId) {
          // Build the order object
          mapping.order = {
            legacy_instruction_id: instruction.id,
            order_number: orderNumber,
            order_type_id: orderTypeId,
            patient_id: patientId,
            doctor_id: doctorId,
            office_id: officeId,
            current_state_id: null, // Will be set to initial state
            title: instruction.title,
            description: instruction.description,
            priority: instruction.priority || 'normal',
            subtotal: instruction.subtotal || 0,
            tax_amount: instruction.tax_amount || 0,
            total_amount: instruction.total_amount || 0,
            currency: instruction.currency || 'USD',
            data: instruction.data || {},
            notes: instruction.notes,
            metadata: {
              migrated_from: 'dispatch_instruction',
              migration_date: new Date().toISOString(),
              legacy_id: instruction.id
            },
            created_at: instruction.created_at,
            updated_at: instruction.updated_at,
            completed_at: instruction.completed_at,
            cancelled_at: instruction.cancelled_at
          };
        } else {
          mapping.errors.push('Missing required foreign key references');
        }

      } catch (error) {
        mapping.errors.push(`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      mappings.push(mapping);
    }
    
    return mappings;
  }

  /**
   * Generate a unique order number
   */
  private generateOrderNumber(instructionId: number): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const id = instructionId.toString().padStart(6, '0');
    return `ORD-${timestamp}-${id}`;
  }

  /**
   * Insert orders batch with retry logic
   */
  private async insertOrdersBatch(mappings: OrderMappingResult[], batchNumber: number): Promise<OrderBatchResult> {
    const startTime = Date.now();
    const result: OrderBatchResult = {
      successful: [],
      failed: [],
      batchNumber,
      processingTimeMs: 0
    };

    // Filter out mappings with errors
    const validMappings = mappings.filter(m => m.errors.length === 0);
    const invalidMappings = mappings.filter(m => m.errors.length > 0);

    // Log invalid mappings
    for (const mapping of invalidMappings) {
      result.failed.push({
        mapping,
        error: mapping.errors.join('; '),
        retryCount: 0
      });
    }

    if (validMappings.length === 0) {
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Extract orders for insertion
    const orders = validMappings.map(m => m.order);

    // Insert with retry logic
    let retryCount = 0;
    let insertResult: BatchProcessingResult<SupabaseOrder> | null = null;

    while (retryCount <= this.config.maxRetries) {
      try {
        insertResult = await this.supabaseDb.insertOrders(orders);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount > this.config.maxRetries) {
          await this.logger.error(`Orders batch ${batchNumber} failed after ${this.config.maxRetries} retries`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Mark all as failed
          for (const mapping of validMappings) {
            result.failed.push({
              mapping,
              error: `Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              retryCount
            });
          }
          break;
        }

        await this.logger.warn(`Orders batch ${batchNumber} failed, retrying (${retryCount}/${this.config.maxRetries})`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await this.sleep(this.config.retryDelayMs * retryCount);
      }
    }

    if (insertResult) {
      result.successful = insertResult.successful;
      
      // Handle individual failures
      for (const failure of insertResult.failed) {
        const mapping = validMappings.find(m => m.order === failure.item);
        if (mapping) {
          result.failed.push({
            mapping,
            error: failure.error,
            retryCount
          });
        }
      }
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Get migration statistics
   */
  async getStats(): Promise<OrdersMigrationStats> {
    return { ...this.stats };
  }

  /**
   * Validate migration results
   */
  async validateMigration(): Promise<{
    legacy_count: number;
    migrated_count: number;
    missing_count: number;
    validation_passed: boolean;
  }> {
    try {
      const legacyCounts = await this.legacyDb.getRecordCounts();
      const supabaseCounts = await this.supabaseDb.getRecordCounts();
      
      const legacyCount = legacyCounts['instructions'] || 0;
      const migratedCount = supabaseCounts['orders'] || 0;
      const missingCount = legacyCount - migratedCount;
      
      const validationPassed = missingCount <= (legacyCount * 0.05); // Allow 5% tolerance
      
      await this.logger.info('Orders migration validation completed', {
        legacy_count: legacyCount,
        migrated_count: migratedCount,
        missing_count: missingCount,
        validation_passed: validationPassed
      });
      
      return {
        legacy_count: legacyCount,
        migrated_count: migratedCount,
        missing_count: missingCount,
        validation_passed: validationPassed
      };
    } catch (error) {
      await this.logger.error('Migration validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Utility method to sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
