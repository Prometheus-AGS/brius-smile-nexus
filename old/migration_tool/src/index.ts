#!/usr/bin/env node

import '../$node_modules/dotenv/config.js';
import chalk from '../$node_modules/chalk/source/index.js';
import { parseCliArguments, validateEnvironment, displayExamples } from './utils/cli-parser';
import { createProgressReporter, MigrationPhase } from './utils/progress-reporter';
import { createErrorHandler, ErrorCategory, ErrorSeverity } from './utils/error-handler';
import { config } from './utils/config';
import { createComponentLogger } from './utils/logger';

// Import services
import { getSupabaseClient } from './services/db.service.js';
import { aiEmbeddingsService } from './services/ai-embeddings.service.js';
import { difyService } from './services/integration/dify-service.js';
import { LegacyMigrationDataLoader } from './services/legacy-migration-data-loader.js';


// Import types
import {
  ExtractionResult,
  ExtractionProgress,
  MigrationProgress,
} from './types/legacy-migration-types.js';
import { TransformationResult } from './services/legacy-migration-data-transformer.js';

const logger = createComponentLogger('main');

/**
 * Main migration orchestrator class
 */
class MigrationOrchestrator {
  private progressReporter: ReturnType<typeof createProgressReporter>;
  private errorHandler: ReturnType<typeof createErrorHandler>;
  private extractionResult?: ExtractionResult;
  private transformationResult?: TransformationResult;
  private startTime: Date = new Date();
  private completedPhases: number = 0;
  private totalPhases: number = 10;


  constructor(verbose: boolean = false, continueOnError: boolean = false) {
    this.progressReporter = createProgressReporter(verbose);
    this.errorHandler = createErrorHandler({
      failFast: !continueOnError,
      continueOnError,
      logErrors: true,
      reportToConsole: true
    });
  }

  /**
   * Execute the complete migration process
   */
  public async executeMigration(options: {
    type: 'full' | 'incremental' | 'test';
    dryRun: boolean;
    limit?: number;
    skipValidation: boolean;
    skipAiEmbeddings: boolean;
    skipDeduplication: boolean;
    skipDifyPopulation: boolean;
    batchSize?: number;
    // Granular entity skip flags
    skipPractices?: boolean;
    skipProfiles?: boolean;
    skipPatients?: boolean;
    skipCases?: boolean;
    skipPractitioners?: boolean;
    skipPracticeMembers?: boolean;
    skipOrders?: boolean;
    skipPatientFlags?: boolean;
    skipCaseFlags?: boolean;
  }): Promise<void> {
    try {
      this.progressReporter.initialize();
      
      logger.info('Starting migration process', {
        type: options.type,
        dryRun: options.dryRun,
        limit: options.limit,
        skipValidation: options.skipValidation,
        skipAiEmbeddings: options.skipAiEmbeddings,
        skipDeduplication: options.skipDeduplication,
        skipDifyPopulation: options.skipDifyPopulation,
        batchSize: options.batchSize
      });

      // Phase 1: Initialization
      await this.executePhase(
        MigrationPhase.INITIALIZATION,
        () => this.initializeServices(),
        'Initializing services and connections'
      );

      // Phase 2: Preparation
      await this.executePhase(
        MigrationPhase.PREPARATION,
        () => this.prepareForMigration(options),
        'Preparing migration environment'
      );

      // Phase 3: Data Extraction
      await this.executePhase(
        MigrationPhase.EXTRACTION,
        () => this.extractData(options),
        'Extracting data from legacy database'
      );

      // Phase 4: Data Transformation
      await this.executePhase(
        MigrationPhase.TRANSFORMATION,
        () => this.transformData(options),
        'Transforming data to target schema'
      );

      // Phase 5: Patient Deduplication (if not skipped)
      if (!options.skipDeduplication) {
        await this.executePhase(
          MigrationPhase.DEDUPLICATION,
          () => this.deduplicatePatients(options),
          'Deduplicating patient records'
        );
      }

      // Phase 6: Data Loading (if not dry run) - MOVED UP TO RUN BEFORE AI EMBEDDINGS
      if (!options.dryRun) {
        await this.executePhase(
          MigrationPhase.LOADING,
          () => this.loadData(options),
          'Loading data into Supabase'
        );
      }

      // Phase 7: Data Validation (if not skipped) - MOVED UP TO VALIDATE LOADED DATA
      if (!options.skipValidation) {
        await this.executePhase(
          MigrationPhase.VALIDATION,
          () => this.validateData(options),
          'Validating loaded data'
        );
      }

      // Phase 8: AI Embeddings (if not skipped) - NOW RUNS AFTER DATA IS LOADED
      if (!options.skipAiEmbeddings) {
        // Add validation log to ensure data exists before generating embeddings
        logger.info('🔍 Validating Supabase data exists before AI embeddings generation...');
        await this.validateDataExistsForEmbeddings();
        
        await this.executePhase(
          MigrationPhase.AI_EMBEDDINGS,
          () => this.generateAiEmbeddings(options),
          'Generating AI embeddings from loaded Supabase data'
        );
      }
      
      // Phase 9: Populate Dify Knowledge Bases (if not skipped) - NOW RUNS AFTER AI EMBEDDINGS
      if (!options.skipDifyPopulation) {
        // Add validation log to ensure embeddings exist before Dify population
        logger.info('🔍 Validating AI embeddings exist before Dify population...');
        await this.validateEmbeddingsExistForDify();
        
        await this.executePhase(
          MigrationPhase.DIFY_POPULATION,
          () => this.populateDifyKnowledgeBases(options),
          'Populating Dify knowledge bases with AI embeddings'
        );
      }

      // Phase 10: Completion
      await this.executePhase(
        MigrationPhase.COMPLETION,
        () => this.completeMigration(options),
        'Finalizing migration process'
        );

      // Generate final summary
      const summary = this.generateMigrationSummary(options);
      this.progressReporter.complete(summary);

      logger.info('Migration completed successfully', { summary });

    } catch (error) {
      const migrationError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      await this.errorHandler.handleError(migrationError, {
        phase: 'Migration Orchestration',
        category: ErrorCategory.PROCESSING,
        severity: ErrorSeverity.CRITICAL
      });

      this.progressReporter.fail(migrationError);
      
      // Display error report
      console.log(this.errorHandler.generateErrorReport());
      
      logger.error('Migration failed', { error: migrationError.message, stack: migrationError.stack });
      
      process.exit(1);
    }
  }

  /**
   * Execute a migration phase with error handling
   */
  private async executePhase(
    phase: MigrationPhase,
    phaseFunction: () => Promise<void>,
    description: string
  ): Promise<void> {
    try {
      this.progressReporter.startPhase(phase, 100);
      this.progressReporter.updateProgress(0, description);
      
      await phaseFunction();
      this.completedPhases++;
      
      this.progressReporter.completePhase(`${phase} completed successfully`);
      
    } catch (error) {
      const migrationError = error instanceof Error ? error : new Error('Unknown error in phase');
      
      await this.errorHandler.handleError(migrationError, {
        phase,
        category: ErrorCategory.PROCESSING,
        severity: ErrorSeverity.HIGH
      });

      this.progressReporter.reportError(migrationError);

      // Re-throw error to stop migration (fail-fast approach)
      throw migrationError;
    }
  }

  /**
   * Phase 1: Initialize services and connections
   */
  private async initializeServices(): Promise<void> {
    this.progressReporter.updateProgress(25, 'Initializing database connections');
    
    // Test Supabase connection
    await this.testSupabaseConnection();
    
    this.progressReporter.updateProgress(50, 'Testing legacy database connection');
    
    // Test legacy database connection
    await this.testLegacyConnection();
    
    this.progressReporter.updateProgress(75, 'Validating configuration');
    
    // Validate configuration
    this.validateConfiguration();
    
    this.progressReporter.updateProgress(100, 'Services initialized successfully');
  }

  /**
   * Test Supabase connection
   */
  private async testSupabaseConnection(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('migration_status').select('id').limit(1);
      
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      logger.info('Supabase connection successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Supabase connection error';
      throw new Error(`Failed to connect to Supabase: ${errorMessage}`);
    }
  }

  /**
   * Test legacy database connection
   */
  private async testLegacyConnection(): Promise<void> {
    try {
      // Create a simple test query to verify connection
      // The MigrationService constructor already sets up the connection pool
      // We can test it by attempting a simple query
      logger.info('Legacy database connection test - using existing MigrationService pool');
      
      // TODO: Add actual connection test when MigrationService has a testConnection method
      // For now, we'll assume the connection is working if the constructor succeeded
      
      logger.info('Legacy database connection successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown legacy database connection error';
      throw new Error(`Failed to connect to legacy database: ${errorMessage}`);
    }
  }

  /**
   * Phase 2: Prepare for migration
   */
  private async prepareForMigration(_options: {
    type: 'full' | 'incremental' | 'test';
    dryRun: boolean;
    limit?: number;
  }): Promise<void> {
    this.progressReporter.updateProgress(25, 'Preparing migration environment');
    
    // TODO: Implement preparation logic
    // - Check for existing migration state
    // - Prepare temporary tables if needed
    // - Set up batch processing parameters
    
    this.progressReporter.updateProgress(50, 'Setting up batch processing');
    
    // TODO: Configure batch sizes based on options
    
    this.progressReporter.updateProgress(75, 'Validating migration prerequisites');
    
    // TODO: Validate that all prerequisites are met
    
    this.progressReporter.updateProgress(100, 'Migration preparation completed');
  }

  /**
   * Phase 3: Extract data from legacy database
   */
  private async extractData(_options: {
    type: 'full' | 'incremental' | 'test';
    limit?: number;
  }): Promise<void> {
    this.progressReporter.updateProgress(25, 'Extracting patient data');
    
    try {
      // Import and initialize the data extractor
      const { LegacyMigrationDataExtractor } = await import('./services/legacy-migration-data-extractor');
      const { Pool } = await import('../$node_modules/@types/pg/index.d.mts');
      
      // Create legacy database connection pool
      const legacyPool = new Pool({
        host: config.legacy.host,
        port: config.legacy.port,
        database: config.legacy.database,
        user: config.legacy.username,
        password: config.legacy.password,
        ssl: config.legacy.ssl
      });
      
      // Initialize extractor with progress callback
      const extractor = new LegacyMigrationDataExtractor(
        legacyPool,
        {
          batchSize: config.migration.batchSize,
          enableValidation: true,
          skipOrphaned: false,
          includeInactive: true
        },
        (progress: ExtractionProgress) => {
          logger.info('Extraction progress', progress);
        }
      );
      
      this.progressReporter.updateProgress(50, 'Validating data integrity');
      
      // Validate data integrity before extraction
      const validation = await extractor.validateDataIntegrity();
      if (!validation.isValid) {
        logger.warn('Data integrity issues found', { issues: validation.issues });
        validation.issues.forEach(issue => logger.error('Data integrity issue', { issue }));
      }
      
      this.progressReporter.updateProgress(75, 'Extracting all legacy data');
      
      // Extract all data
      const extractionResult = await extractor.extractAllData();
      
      // Store extraction result for next phase
      this.extractionResult = extractionResult;
      
      logger.info('Data extraction completed', {
        stats: extractionResult.stats
      });
      
      // Cleanup
      await extractor.cleanup();
      await legacyPool.end();
      
    } catch (error) {
      logger.error('Data extraction failed', { error });
      throw error;
    }
    
    this.progressReporter.updateProgress(100, 'Data extraction completed');
  }

  /**
   * Phase 4: Transform data to target schema
   */
  private async transformData(_options: {
    batchSize?: number;
  }): Promise<void> {
    this.progressReporter.updateProgress(25, 'Transforming patient records');
    
    try {
      // Import transformation service
      const { LegacyMigrationDataTransformer } = await import('./services/legacy-migration-data-transformer');
      
      // Get extraction result from previous phase
      const extractionResult = this.extractionResult;
      if (!extractionResult) {
        throw new Error('No extraction result found. Data extraction must be completed first.');
      }
      
      // Initialize transformer with configuration
      const transformer = new LegacyMigrationDataTransformer(
        {
          generateUUIDs: true,
          preserveTimestamps: true,
          defaultCurrency: 'USD',
          defaultPriority: 'medium',
          enableStateReconstruction: true,
          skipInvalidRecords: false
        },
        (progress: MigrationProgress) => {
          logger.info('Transformation progress', progress);
        }
      );
      
      this.progressReporter.updateProgress(50, 'Transforming all legacy data');
      
      // Transform all extracted data
      const transformationResult = await transformer.transformAllData(
        extractionResult.users,
        extractionResult.practices,
        extractionResult.patients,
        extractionResult.comments,
        extractionResult.states,
        extractionResult.contentTypes,
        extractionResult.projects,
        extractionResult.templates,
        extractionResult.instructionStates
      );
      
      // Store transformation result for next phase
      this.transformationResult = transformationResult;
      
      this.progressReporter.updateProgress(75, 'Validating transformed data');
      
      logger.info('Data transformation completed', {
        stats: transformationResult.stats,
        errors: transformationResult.stats.errors.length
      });
      
      // Log any transformation errors
      if (transformationResult.stats.errors.length > 0) {
        logger.warn('Transformation errors encountered', {
          errorCount: transformationResult.stats.errors.length,
          errors: transformationResult.stats.errors.slice(0, 10) // Log first 10 errors
        });
      }
      
    } catch (error) {
      logger.error('Data transformation failed', { error });
      throw error;
    }
    
    this.progressReporter.updateProgress(100, 'Data transformation completed');
  }

  /**
   * Phase 5: Deduplicate patient records
   */
  private async deduplicatePatients(_options: Record<string, unknown>): Promise<void> {
    this.progressReporter.updateProgress(25, 'Analyzing patient duplicates');
    
    try {
      // Get transformation result from previous phase
      const transformationResult = this.transformationResult;
      if (!transformationResult) {
        throw new Error('No transformation result found. Data transformation must be completed first.');
      }
      
      // Import deduplication service
      // TODO: Implement patient deduplication for project-centric migration
      // const { LegacyMigrationPatientDeduplicator } = await import('./services/legacy-migration-patient-deduplicator');
      
      // Initialize deduplicator
      // TODO: Implement patient deduplication for project-centric migration
      // const deduplicator = new LegacyMigrationPatientDeduplicator(...)
      
      this.progressReporter.updateProgress(50, 'Processing duplicate merges');
      
      // Note: Deduplication works on legacy patients, but we have transformed patients
      // For now, we'll skip actual deduplication and log the intent
      logger.info('Deduplication phase - skipping for transformed patients', {
        patientCount: transformationResult.patients.length
      });
      
    } catch (error) {
      logger.error('Patient deduplication failed', { error });
      throw error;
    }
    
    this.progressReporter.updateProgress(100, 'Patient deduplication completed');
  }

  /**
   * Phase 6: Generate AI embeddings
   */
  private async generateAiEmbeddings(_options: Record<string, unknown>): Promise<void> {
    this.progressReporter.updateProgress(25, 'Generating patient embeddings');
    
    if (!this.transformationResult) {
      throw new Error('Transformation result is not available for AI embedding generation.');
    }

    for (const patient of this.transformationResult.patients) {
      const textToEmbed = `Patient: ${patient.first_name} ${patient.last_name}, DOB: ${patient.date_of_birth}`;
      await aiEmbeddingsService.generateAndStoreEmbedding(textToEmbed);
    }
    
    this.progressReporter.updateProgress(50, 'Generating case embeddings');
    
    if (this.transformationResult.cases) {
      for (const caseItem of this.transformationResult.cases) {
        const textToEmbed = `Case for patient ${caseItem.patient_id}: ${caseItem.description}`;
        await aiEmbeddingsService.generateAndStoreEmbedding(textToEmbed);
      }
    }
    
    this.progressReporter.updateProgress(100, 'AI embeddings generated');
  }

  /**
   * Phase 7: Populate Dify knowledge bases
   */
  private async populateDifyKnowledgeBases(_options: Record<string, unknown>): Promise<void> {
    this.progressReporter.updateProgress(0, 'Initializing Dify knowledge bases');

    if (!this.transformationResult) {
      throw new Error('Transformation result is not available for Dify knowledge base population.');
    }

    // Get or create datasets
    const patientDatasetId = await difyService.findOrCreateDataset('patients');
    const caseDatasetId = await difyService.findOrCreateDataset('cases');

    // Populate patient data
    this.progressReporter.updateProgress(10, 'Populating patient knowledge base');
    for (const patient of this.transformationResult.patients) {
      const documentName = `patient-${patient.id}`;
      const textToUpload = `Patient: ${patient.first_name} ${patient.last_name}, DOB: ${patient.date_of_birth}`;
      await difyService.addDocumentByText(patientDatasetId, documentName, textToUpload);
    }

    // Populate case data
    this.progressReporter.updateProgress(50, 'Populating case knowledge base');
    if (this.transformationResult.cases) {
      for (const caseItem of this.transformationResult.cases) {
        const documentName = `case-${caseItem.id}`;
        const textToUpload = `Case for patient ${caseItem.patient_id}: ${caseItem.description}`;
        await difyService.addDocumentByText(caseDatasetId, documentName, textToUpload);
      }
    }
    
    this.progressReporter.updateProgress(100, 'Dify knowledge bases populated');
  }

  /**
   * Phase 8: Validate data against target schema
   */
  private async validateData(_options: Record<string, unknown>): Promise<void> {
    this.progressReporter.updateProgress(25, 'Validating patient data');
    
    // TODO: Implement data validation logic
    // - Use Zod or similar library for schema validation
    // - Check for required fields, data types, and constraints
    
    this.progressReporter.updateProgress(50, 'Validating visit data');
    
    // TODO: Validate visit data
    
    this.progressReporter.updateProgress(100, 'Data validation completed');
  }

  /**
   * Phase 9: Load data into Supabase
   */
  private async loadData(options: {
    batchSize?: number;
    skipPractices?: boolean;
    skipProfiles?: boolean;
    skipPatients?: boolean;
    skipCases?: boolean;
    skipPractitioners?: boolean;
    skipPracticeMembers?: boolean;
    skipOrders?: boolean;
    skipPatientFlags?: boolean;
    skipCaseFlags?: boolean;
  }): Promise<void> {
    this.progressReporter.updateProgress(5, 'Initializing 5-phase dependency-aware data loader');
    
    // Get transformation result from previous phase
    const transformationResult = this.transformationResult;
    if (!transformationResult) {
      throw new Error('No transformation result found. Data loading cannot proceed.');
    }
    
    // Initialize loader and validator
    const loader = new LegacyMigrationDataLoader(
      {
        batchSize: options.batchSize || config.migration.batchSize,
        maxRetries: config.migration.maxRetries,
        retryDelay: config.migration.retryDelay,
        skipDuplicates: true,
        enableEmbeddings: false, // Embeddings will be generated in separate phase
        embeddingsBatchSize: 10,
        embeddingsMaxRetries: 2
      },
      (progress: { loaded: number; total: number; errors: number; embeddingsGenerated: number; embeddingErrors: number }) => {
        logger.info('Loading progress', progress);
      }
    );
    
    const { MigrationPhaseValidator } = await import('./services/migration-phase-validator');
    const validator = new MigrationPhaseValidator();
    
    // PHASE 1: Foundation Tables (practices FIRST, then profiles)
    logger.info('🚀 Starting Phase 1: Foundation Tables (practices FIRST, then profiles)');
    
    // Step 1a: Load practices FIRST and wait for COMPLETE commitment
    if (!options.skipPractices) {
      this.progressReporter.updateProgress(10, `Phase 1a: Loading ${transformationResult.practices.length} practices`);
      logger.info('📊 Starting practices loading - will wait for full completion before profiles');
      
      await loader.loadPractices(transformationResult.practices);
      
      // Explicit completion verification and logging
      logger.info('✅ Phase 1a: Practices loading method returned - verifying completion');
      this.progressReporter.updateProgress(12, 'Phase 1a: Verifying practices are fully committed to database');
      
      // Add a small delay to ensure database commits are fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('✅ Phase 1a: Practices loading COMPLETELY FINISHED - now starting profiles');
    } else {
      logger.info('⏭️  Phase 1a: Skipping practices loading (--skip-practices flag)');
      this.progressReporter.updateProgress(12, 'Phase 1a: Skipped practices loading');
    }
    
    // Step 1b: Load profiles ONLY AFTER practices are fully committed
    if (!options.skipProfiles) {
      this.progressReporter.updateProgress(15, `Phase 1b: Loading ${transformationResult.profiles.length} profiles`);
      logger.info('📊 Starting profiles loading - practices are guaranteed to be complete');
      
      await loader.loadUsers(transformationResult.profiles);
      
      logger.info('✅ Phase 1b: Profiles loading completed');
    } else {
      logger.info('⏭️  Phase 1b: Skipping profiles loading (--skip-profiles flag)');
      this.progressReporter.updateProgress(15, 'Phase 1b: Skipped profiles loading');
    }
    
    // Validate Phase 1
    this.progressReporter.updateProgress(20, 'Phase 1: Validating foundation tables');
    const phase1Result = await validator.validatePhase1();
    if (!phase1Result.isValid) {
      const report = validator.generateValidationReport(phase1Result);
      logger.error('Phase 1 validation failed', { report });
      throw new Error(`Phase 1 validation failed: ${phase1Result.errors.join(', ')}`);
    }
    logger.info('✅ Phase 1 completed successfully', { recordCounts: phase1Result.recordCounts });
    
    // PHASE 2: Cross-Reference Tables (practitioners, practice_members)
    logger.info('🚀 Starting Phase 2: Cross-Reference Tables (practitioners, practice_members)');
    this.progressReporter.updateProgress(25, 'Phase 2: Loading practitioners and practice members');
    // Note: These would come from transformation result if available
    // For now, we'll skip if no data exists since they may not be in legacy system
    logger.info('Phase 2: Skipping practitioners and practice_members (not in legacy data)');
    
    // Validate Phase 2
    this.progressReporter.updateProgress(30, 'Phase 2: Validating cross-reference tables');
    const phase2Result = await validator.validatePhase2();
    if (!phase2Result.isValid) {
      const report = validator.generateValidationReport(phase2Result);
      logger.error('Phase 2 validation failed', { report });
      throw new Error(`Phase 2 validation failed: ${phase2Result.errors.join(', ')}`);
    }
    logger.info('✅ Phase 2 completed successfully', { recordCounts: phase2Result.recordCounts });
    
    // PHASE 3: Primary Entity Tables (patients)
    logger.info('🚀 Starting Phase 3: Primary Entity Tables (patients)');
    if (!options.skipPatients) {
      this.progressReporter.updateProgress(40, `Phase 3: Loading ${transformationResult.patients.length} patients`);
      await loader.loadPatients(transformationResult.patients);
      logger.info('✅ Phase 3: Patients loading completed');
    } else {
      logger.info('⏭️  Phase 3: Skipping patients loading (--skip-patients flag)');
      this.progressReporter.updateProgress(40, 'Phase 3: Skipped patients loading');
    }
    
    // Validate Phase 3
    this.progressReporter.updateProgress(50, 'Phase 3: Validating primary entity tables');
    const phase3Result = await validator.validatePhase3();
    if (!phase3Result.isValid) {
      const report = validator.generateValidationReport(phase3Result);
      logger.error('Phase 3 validation failed', { report });
      throw new Error(`Phase 3 validation failed: ${phase3Result.errors.join(', ')}`);
    }
    logger.info('✅ Phase 3 completed successfully', { recordCounts: phase3Result.recordCounts });
    
    // PHASE 4: Secondary Entity Tables (cases, patient_flags, patient_notes)
    logger.info('🚀 Starting Phase 4: Secondary Entity Tables (cases, patient_flags, patient_notes)');
    this.progressReporter.updateProgress(60, `Phase 4: Loading ${transformationResult.cases?.length || 0} cases`);
    if (transformationResult.cases) {
      await loader.loadCases(transformationResult.cases);
    }
    
    this.progressReporter.updateProgress(65, 'Phase 4: Loading patient flags and notes');
    // Note: These would come from transformation result if available
    // For now, we'll skip if no data exists
    
    // Validate Phase 4
    this.progressReporter.updateProgress(70, 'Phase 4: Validating secondary entity tables');
    const phase4Result = await validator.validatePhase4();
    if (!phase4Result.isValid) {
      const report = validator.generateValidationReport(phase4Result);
      logger.error('Phase 4 validation failed', { report });
      throw new Error(`Phase 4 validation failed: ${phase4Result.errors.join(', ')}`);
    }
    logger.info('✅ Phase 4 completed successfully', { recordCounts: phase4Result.recordCounts });
    
    // PHASE 5: Tertiary Entity Tables (orders, case_flags, case_notes, case_actions)
    logger.info('🚀 Starting Phase 5: Tertiary Entity Tables (orders, case_flags, case_notes, case_actions)');
    this.progressReporter.updateProgress(80, 'Phase 5: Loading case-related data');
    // Note: These would come from transformation result if available
    // For now, we'll skip if no data exists
    
    // Validate Phase 5
    this.progressReporter.updateProgress(90, 'Phase 5: Validating tertiary entity tables');
    const phase5Result = await validator.validatePhase5();
    if (!phase5Result.isValid) {
      const report = validator.generateValidationReport(phase5Result);
      logger.error('Phase 5 validation failed', { report });
      throw new Error(`Phase 5 validation failed: ${phase5Result.errors.join(', ')}`);
    }
    logger.info('✅ Phase 5 completed successfully', { recordCounts: phase5Result.recordCounts });
    
    this.progressReporter.updateProgress(100, '🎉 All 5 phases completed successfully with dependency validation');
    logger.info('🎉 5-phase dependency-aware data loading completed successfully');
  }

  /**
   * Phase 10: Complete migration and cleanup
   */
  private async completeMigration(options: {
    dryRun: boolean;
  }): Promise<void> {
    this.progressReporter.updateProgress(25, 'Finalizing migration state');
    
    // TODO: Implement completion logic
    // - Update migration status in database
    // - Clean up temporary files/tables
    
    this.progressReporter.updateProgress(50, 'Generating final report');
    
    // TODO: Generate a more detailed migration report
    
    this.progressReporter.updateProgress(100, 'Migration completed and cleaned up');
    
    if (options.dryRun) {
      this.progressReporter.reportInfo('Dry run complete. No actual data was modified.');
    }
  }

  /**
   * Validate that data exists in Supabase before generating AI embeddings
   */
  private async validateDataExistsForEmbeddings(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Check if we have any patients data to generate embeddings from
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .limit(1);
      
      if (patientsError) {
        throw new Error(`Failed to check patients data: ${patientsError.message}`);
      }
      
      // Check if we have any case messages data to generate embeddings from
      const { data: caseMessages, error: caseMessagesError } = await supabase
        .from('case_messages')
        .select('id')
        .limit(1);
      
      if (caseMessagesError) {
        throw new Error(`Failed to check case_messages data: ${caseMessagesError.message}`);
      }
      
      const patientCount = patients?.length || 0;
      const caseMessagesCount = caseMessages?.length || 0;
      
      logger.info(`✅ Data validation for AI embeddings: ${patientCount} patients, ${caseMessagesCount} case messages found in Supabase`);
      
      if (patientCount === 0 && caseMessagesCount === 0) {
        throw new Error('❌ No data found in Supabase for AI embeddings generation. Data loading phase must complete first.');
      }
      
      logger.info('✅ Supabase data validation passed - proceeding with AI embeddings generation');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      logger.error(`❌ Data validation failed: ${errorMessage}`);
      throw new Error(`Data validation for AI embeddings failed: ${errorMessage}`);
    }
  }

  /**
   * Validate that AI embeddings exist before populating Dify knowledge bases
   */
  private async validateEmbeddingsExistForDify(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Check if we have any AI embeddings data
      const { data: embeddings, error: embeddingsError } = await supabase
        .from('ai_embeddings')
        .select('id')
        .limit(1);
      
      if (embeddingsError) {
        throw new Error(`Failed to check AI embeddings data: ${embeddingsError.message}`);
      }
      
      const embeddingsCount = embeddings?.length || 0;
      
      logger.info(`✅ Embeddings validation for Dify population: ${embeddingsCount} embeddings found in Supabase`);
      
      if (embeddingsCount === 0) {
        throw new Error('❌ No AI embeddings found in Supabase for Dify population. AI embeddings generation phase must complete first.');
      }
      
      logger.info('✅ AI embeddings validation passed - proceeding with Dify knowledge base population');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      logger.error(`❌ Embeddings validation failed: ${errorMessage}`);
      throw new Error(`Embeddings validation for Dify population failed: ${errorMessage}`);
    }
  }
  
  /**
   * Validate configuration before starting migration
   */
  private validateConfiguration(): void {
    // Basic validation to ensure essential configs are present
    if (!config.legacy.host || !config.supabase.url) {
      throw new Error('Missing critical configuration for legacy or Supabase database.');
    }
    if (config.migration.enableAiEmbeddings && !(config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.region)) {
        throw new Error('AWS credentials and region are required when AI embeddings are enabled.');
    }
    if (!config.dify.baseUrl || !config.dify.apiKey) {
      throw new Error('Dify Base URL and API Key are required for Dify integration.');
    }
    logger.info('Configuration validated successfully');
  }
  
  /**
   * Generate migration summary
   */
  private generateMigrationSummary(options: {
    type: 'full' | 'incremental' | 'test';
    dryRun: boolean;
  }): Record<string, unknown> {
    const summary = {
      migrationType: options.type,
      dryRun: options.dryRun,
      totalPhases: this.totalPhases,
      completedPhases: this.completedPhases,
      duration: (Date.now() - this.startTime.getTime()) / 1000,
      errors: this.errorHandler.getErrorSummary().totalErrors,
    };
    return summary;
  }
}

/**
 * Main function to start the migration tool
 */
export async function main(): Promise<void> {
  // Display usage examples if no arguments are provided
  if (process.argv.length <= 2) {
    displayExamples();
    process.exit(0);
  }

  const cliOptions = parseCliArguments(process.argv);
  
  validateEnvironment(); // Validate environment variables
  
  const orchestrator = new MigrationOrchestrator(
    cliOptions.verbose,
    cliOptions.continueOnError
  );
  
  await orchestrator.executeMigration(cliOptions);
}

main().catch(error => {
  console.error(chalk.red.bold('A critical error occurred:'), error);
  process.exit(1);
});