import { getSupabaseClient } from './db.service';
import { createComponentLogger } from '../utils/logger';
import { UuidValidator } from '../utils/uuid-validator';
import { aiEmbeddingsService } from './ai-embeddings.service';
import {
  TargetPractice,
  TargetProfile,
  TargetPatient,
  TargetCase,
  TargetPatientFlag,
  TargetPatientNote,
  TargetCaseFlag,
  TargetCaseNote,
  TargetCaseAction,
  TargetPractitioner,
  TargetPracticeMember,
  TargetOrder
} from '../types/legacy-migration-types';
import { chunk } from '../../$node_modules/@types/lodash/index.js';

const logger = createComponentLogger('legacy-migration-data-loader');

export interface DataLoaderConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  skipDuplicates: boolean;
  enableEmbeddings: boolean;
  embeddingsBatchSize: number;
  embeddingsMaxRetries: number;
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  errors: number;
  embeddingsGenerated: number;
  embeddingErrors: number;
}

export interface EmbeddableContent {
  id: string;
  content: string;
  contentType: 'case_description' | 'case_note' | 'patient_note' | 'case_action_description';
  sourceTable: string;
  metadata: Record<string, unknown>;
}

export class LegacyMigrationDataLoader {
  private supabase = getSupabaseClient();
  private config: DataLoaderConfig;
  private progressCallback: (progress: LoadingProgress) => void;

  constructor(
    config: DataLoaderConfig, 
    progressCallback: (progress: LoadingProgress) => void
  ) {
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Load practices data
   */
  public async loadPractices(practices: TargetPractice[]): Promise<void> {
    await this.loadData(practices as unknown as Record<string, unknown>[], 'practices');
  }

  /**
   * Load user profiles data
   */
  public async loadUsers(profiles: TargetProfile[]): Promise<void> {
    await this.loadData(profiles as unknown as Record<string, unknown>[], 'profiles');
  }

  /**
   * Load patients data
   */
  public async loadPatients(patients: TargetPatient[]): Promise<void> {
    await this.loadData(patients as unknown as Record<string, unknown>[], 'patients');
  }

  /**
   * Load cases data with AI embeddings for descriptions
   */
  public async loadCases(cases: TargetCase[]): Promise<void> {
    await this.loadDataWithEmbeddings(cases, 'cases', this.extractCaseEmbeddableContent.bind(this));
  }

  /**
   * Load patient flags data
   */
  public async loadPatientFlags(flags: TargetPatientFlag[]): Promise<void> {
    await this.loadData(flags as unknown as Record<string, unknown>[], 'patient_flags');
  }

  /**
   * Load patient notes data with AI embeddings
   */
  public async loadPatientNotes(notes: TargetPatientNote[]): Promise<void> {
    await this.loadDataWithEmbeddings(notes, 'patient_notes', this.extractPatientNoteEmbeddableContent.bind(this));
  }

  /**
   * Load case flags data
   */
  public async loadCaseFlags(flags: TargetCaseFlag[]): Promise<void> {
    await this.loadData(flags as unknown as Record<string, unknown>[], 'case_flags');
  }

  /**
   * Load case notes data with AI embeddings
   */
  public async loadCaseNotes(notes: TargetCaseNote[]): Promise<void> {
    await this.loadDataWithEmbeddings(notes, 'case_notes', this.extractCaseNoteEmbeddableContent.bind(this));
  }

  /**
   * Load case actions data with AI embeddings for descriptions
   */
  public async loadCaseActions(actions: TargetCaseAction[]): Promise<void> {
    await this.loadDataWithEmbeddings(actions, 'case_actions', this.extractCaseActionEmbeddableContent.bind(this));
  }

  /**
   * Load practitioners data (Phase 2)
   */
  public async loadPractitioners(practitioners: TargetPractitioner[]): Promise<void> {
    await this.loadData(practitioners as unknown as Record<string, unknown>[], 'practitioners');
  }

  /**
   * Load practice members data (Phase 2)
   */
  public async loadPracticeMembers(practiceMembers: TargetPracticeMember[]): Promise<void> {
    await this.loadData(practiceMembers as unknown as Record<string, unknown>[], 'practice_members');
  }

  /**
   * Load orders data (Phase 5)
   */
  public async loadOrders(orders: TargetOrder[]): Promise<void> {
    await this.loadData(orders as unknown as Record<string, unknown>[], 'orders');
  }

  /**
   * Validate and fix UUIDs in a data record
   */
  private validateAndFixUUIDs<T extends Record<string, unknown>>(record: T, tableName: string): T {
    const fixedRecord = { ...record };
    
    // Common UUID fields that need validation
    const uuidFields = ['id', 'practice_id', 'patient_id', 'case_id', 'user_id', 'profile_id'];
    
    for (const field of uuidFields) {
      if (fixedRecord[field] && typeof fixedRecord[field] === 'string') {
        const originalValue = fixedRecord[field] as string;
        
        if (!UuidValidator.isValid(originalValue)) {
          // Generate a new UUID if the current value is invalid
          const newUuid = UuidValidator.generate();
          (fixedRecord as Record<string, unknown>)[field] = newUuid;
          
          logger.warn(`🔧 Fixed invalid UUID in ${tableName}.${field}: "${originalValue}" → "${newUuid}"`);
        }
      }
    }
    
    return fixedRecord;
  }

  /**
   * Generic data loading method without embeddings
   */
  private async loadData<T extends Record<string, unknown>>(data: T[], tableName: string): Promise<void> {
    if (!data || data.length === 0) {
      logger.info(`No data to load for table: ${tableName}`);
      return;
    }

    logger.info(`🔄 Loading ${data.length} records into ${tableName}...`);
    
    // First, get existing record IDs to skip duplicates
    const existingIds = await this.getExistingRecordIds(tableName);
    logger.info(`📋 Found ${existingIds.size} existing records in ${tableName}, will skip duplicates`);
    
    // Filter out existing records - safely access id property
    const newRecords = data.filter((record) => {
      const recordId = (record as unknown as { id?: string }).id;
      return recordId && !existingIds.has(recordId);
    });
    
    if (newRecords.length === 0) {
      logger.info(`✅ All ${data.length} records already exist in ${tableName}, skipping`);
      return;
    }
    
    logger.info(`🆕 Loading ${newRecords.length} new records (${data.length - newRecords.length} already exist)`);
    
    // Validate and fix UUIDs in all records before insertion
    const validatedData = newRecords.map(record => this.validateAndFixUUIDs(record, tableName));
    
    // Log first few records for debugging
    if (validatedData.length > 0) {
      logger.debug(`📝 Sample ${tableName} record for UUID validation:`, {
        original: newRecords[0],
        validated: validatedData[0],
        tableName
      });
    }
    
    const batches = chunk(validatedData, this.config.batchSize);
    let loaded = 0;
    let errors = 0;

    for (const batch of batches) {
      try {
        const { error } = await this.supabase.from(tableName).upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: this.config.skipDuplicates,
        });

        if (error) {
          // Enhanced error logging for debugging
          const errorDetails = {
            message: error.message || error,
            code: error.code,
            details: error.details,
            hint: error.hint,
            batchSize: batch.length,
            tableName,
            sampleRecord: batch[0] // Log first record in failed batch
          };
          
          logger.error(`❌ Database error loading data into ${tableName}:`, errorDetails);
          
          // Also log to console for immediate visibility
          console.error(`\n🚨 CRITICAL DATABASE ERROR - ${tableName.toUpperCase()}:`);
          console.error(`   Message: ${error.message || 'Unknown error'}`);
          console.error(`   Code: ${error.code || 'No code'}`);
          console.error(`   Details: ${error.details || 'No details'}`);
          console.error(`   Hint: ${error.hint || 'No hint'}`);
          console.error(`   Batch Size: ${batch.length}`);
          console.error(`   Sample Record:`, JSON.stringify(batch[0], null, 2));
          console.error('');
          
          errors += batch.length;
        } else {
          loaded += batch.length;
          logger.debug(`✅ Successfully loaded batch of ${batch.length} records into ${tableName}`);
        }
      } catch (error) {
        logger.error(`💥 Unexpected error loading batch into ${tableName}:`, {
          error: error instanceof Error ? error.message : error,
          batchSize: batch.length,
          tableName,
          sampleRecord: batch[0]
        });
        errors += batch.length;
      }

      this.progressCallback({
        loaded,
        total: newRecords.length,
        errors,
        embeddingsGenerated: 0,
        embeddingErrors: 0
      });
    }

    logger.info(`📊 Completed loading ${tableName}: ${loaded} successful, ${errors} errors`);
    
    if (errors > 0) {
      logger.error(`⚠️  ${tableName} loading had ${errors} errors out of ${newRecords.length} total records`);
    }
  }

  /**
   * Get existing record IDs from a table to avoid duplicates
   */
  private async getExistingRecordIds(tableName: string): Promise<Set<string>> {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('id');

      if (error) {
        logger.warn(`⚠️  Could not fetch existing IDs from ${tableName}: ${error.message}`);
        return new Set();
      }

      return new Set(data?.map(record => record.id) || []);
    } catch (error) {
      logger.warn(`⚠️  Error fetching existing IDs from ${tableName}:`, error);
      return new Set();
    }
  }

  /**
   * Generic data loading method with AI embeddings support
   */
  private async loadDataWithEmbeddings<T>(
    data: T[], 
    tableName: string, 
    extractEmbeddableContent: (item: T) => EmbeddableContent | null
  ): Promise<void> {
    if (!data || data.length === 0) {
      logger.info(`No data to load for table: ${tableName}`);
      return;
    }

    logger.info(`Loading ${data.length} records into ${tableName} with AI embeddings...`);
    
    // First, load the main data
    await this.loadData(data as Record<string, unknown>[], tableName);

    // Then, generate embeddings if enabled
    if (this.config.enableEmbeddings) {
      await this.generateEmbeddingsForData(data, extractEmbeddableContent);
    } else {
      logger.info(`AI embeddings disabled, skipping embedding generation for ${tableName}`);
    }
  }

  /**
   * Generate embeddings for data items
   */
  private async generateEmbeddingsForData<T>(
    data: T[], 
    extractEmbeddableContent: (item: T) => EmbeddableContent | null
  ): Promise<void> {
    const embeddableItems: EmbeddableContent[] = [];
    
    // Extract embeddable content from data
    for (const item of data) {
      const embeddableContent = extractEmbeddableContent(item);
      if (embeddableContent && embeddableContent.content.trim().length > 0) {
        embeddableItems.push(embeddableContent);
      }
    }

    if (embeddableItems.length === 0) {
      logger.info('No embeddable content found in data');
      return;
    }

    logger.info(`Generating embeddings for ${embeddableItems.length} items...`);
    
    const batches = chunk(embeddableItems, this.config.embeddingsBatchSize);
    let embeddingsGenerated = 0;
    let embeddingErrors = 0;

    for (const batch of batches) {
      logger.debug(`Processing embedding batch of ${batch.length} items`);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => this.generateSingleEmbedding(item))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          embeddingsGenerated++;
        } else {
          embeddingErrors++;
          logger.error('Failed to generate embedding', { error: result.reason });
        }
      }

      // Update progress after each batch
      this.progressCallback({
        loaded: data.length, // Main data already loaded
        total: data.length,
        errors: 0, // Main data errors already reported
        embeddingsGenerated,
        embeddingErrors
      });

      // Add delay between batches to avoid overwhelming the AI service
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    logger.info(`Completed embedding generation: ${embeddingsGenerated} successful, ${embeddingErrors} errors`);
  }

  /**
   * Generate a single embedding with retry logic
   */
  private async generateSingleEmbedding(item: EmbeddableContent): Promise<void> {
    let retryCount = 0;
    
    while (retryCount <= this.config.embeddingsMaxRetries) {
      try {
        logger.debug(`Generating embedding for ${item.contentType} item: ${item.id}`);
        
        const dualPathResult = await aiEmbeddingsService.generateAndStoreEmbedding(
          item.content,
          item.contentType as 'cases' | 'patients' | 'notes',
          `${item.contentType}_${item.id}`
        );
        
        // Extract embedding from Bedrock result for database storage
        if (dualPathResult.bedrock?.success && dualPathResult.bedrock.embedding.length > 0) {
          await this.storeEmbedding(item, dualPathResult.bedrock.embedding);
        } else {
          throw new Error('Failed to generate embedding: No valid embedding returned from services');
        }
        
        logger.debug(`Successfully generated and stored embedding for ${item.id}`);
        return;
        
      } catch (error) {
        retryCount++;
        logger.warn(`Embedding generation failed for ${item.id} (attempt ${retryCount}/${this.config.embeddingsMaxRetries + 1})`, { error });
        
        if (retryCount <= this.config.embeddingsMaxRetries) {
          await this.delay(this.config.retryDelay * retryCount); // Exponential backoff
        } else {
          throw new Error(`Failed to generate embedding for ${item.id} after ${this.config.embeddingsMaxRetries + 1} attempts: ${error}`);
        }
      }
    }
  }

  /**
   * Store embedding in the database
   */
  private async storeEmbedding(item: EmbeddableContent, embedding: number[]): Promise<void> {
    const embeddingRecord = {
      id: `${item.sourceTable}_${item.id}`,
      entity_type: this.mapContentTypeToEntityType(item.contentType),
      entity_id: item.id,
      content: item.content,
      embedding: embedding,
      metadata: {
        ...item.metadata,
        content_type: item.contentType,
        source_table: item.sourceTable,
        created_at: new Date().toISOString()
      }
    };

    const { error } = await this.supabase
      .from('ai_embeddings')
      .upsert(embeddingRecord, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to store embedding in database: ${error.message}`);
    }
  }

  /**
   * Map content type to entity type for database storage
   */
  private mapContentTypeToEntityType(contentType: string): string {
    switch (contentType) {
      case 'case_description':
        return 'case';
      case 'case_note':
        return 'case_note';
      case 'patient_note':
        return 'patient_note';
      case 'case_action_description':
        return 'case_action';
      default:
        return 'unknown';
    }
  }

  /**
   * Extract embeddable content from TargetCase
   */
  private extractCaseEmbeddableContent(caseItem: TargetCase): EmbeddableContent | null {
    if (!caseItem.description || caseItem.description.trim().length === 0) {
      return null;
    }

    return {
      id: caseItem.id,
      content: caseItem.description,
      contentType: 'case_description',
      sourceTable: 'cases',
      metadata: {
        case_id: caseItem.id,
        patient_id: caseItem.patient_id,
        practice_id: caseItem.practice_id,
        case_type: caseItem.case_type,
        priority: caseItem.priority,
        current_state: caseItem.current_state,
        title: caseItem.title
      }
    };
  }

  /**
   * Extract embeddable content from TargetPatientNote
   */
  private extractPatientNoteEmbeddableContent(note: TargetPatientNote): EmbeddableContent | null {
    if (!note.note || note.note.trim().length === 0) {
      return null;
    }

    return {
      id: note.id,
      content: note.note,
      contentType: 'patient_note',
      sourceTable: 'patient_notes',
      metadata: {
        note_id: note.id,
        patient_id: note.patient_id,
        created_by: note.created_by,
        created_at: note.created_at
      }
    };
  }

  /**
   * Extract embeddable content from TargetCaseNote
   */
  private extractCaseNoteEmbeddableContent(note: TargetCaseNote): EmbeddableContent | null {
    if (!note.note || note.note.trim().length === 0) {
      return null;
    }

    return {
      id: note.id,
      content: note.note,
      contentType: 'case_note',
      sourceTable: 'case_notes',
      metadata: {
        note_id: note.id,
        case_id: note.case_id,
        created_by: note.created_by,
        created_at: note.created_at
      }
    };
  }

  /**
   * Extract embeddable content from TargetCaseAction
   */
  private extractCaseActionEmbeddableContent(action: TargetCaseAction): EmbeddableContent | null {
    if (!action.description || action.description.trim().length === 0) {
      return null;
    }

    return {
      id: action.id,
      content: action.description,
      contentType: 'case_action_description',
      sourceTable: 'case_actions',
      metadata: {
        action_id: action.id,
        case_id: action.case_id,
        action_type: action.action_type,
        performed_by: action.performed_by,
        performed_at: action.performed_at
      }
    };
  }

  /**
   * Utility method to add delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  public getConfig(): DataLoaderConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<DataLoaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Data loader configuration updated', { newConfig });
  }

  /**
   * Get embedding statistics for loaded data
   */
  public async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    embeddingsByType: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_embeddings')
        .select('entity_type');

      if (error) {
        logger.error('Failed to fetch embedding statistics', { error });
        return { totalEmbeddings: 0, embeddingsByType: {} };
      }

      const embeddingsByType: Record<string, number> = {};
      for (const embedding of data || []) {
        embeddingsByType[embedding.entity_type] = (embeddingsByType[embedding.entity_type] || 0) + 1;
      }

      return {
        totalEmbeddings: data?.length || 0,
        embeddingsByType
      };
    } catch (error) {
      logger.error('Error getting embedding statistics', { error });
      return { totalEmbeddings: 0, embeddingsByType: {} };
    }
  }
}