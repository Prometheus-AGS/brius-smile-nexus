import { v4 as uuidv4 } from '../../$node_modules/uuid/dist/esm/index.js';
import { logger } from '../utils/logger.js';
import { UuidValidator } from '../utils/uuid-validator.js';
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
  TargetProfile,
  TargetPractice,
  TargetPatient,
  TargetCase,
  TargetCaseMessage,
  TargetProject,
  TargetWorkflowTemplateTask,
  TargetInstructionState,
  MigrationProgress,
  MigrationError,
  WorkflowReconstruction
} from '../types/legacy-migration-types.js';

/**
 * Configuration for data transformation
 */
export interface TransformationConfig {
  generateUUIDs: boolean;
  preserveTimestamps: boolean;
  defaultCurrency: string;
  defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
  enableStateReconstruction: boolean;
  skipInvalidRecords: boolean;
}

/**
 * Transformation result with statistics
 */
export interface TransformationResult {
  profiles: TargetProfile[];
  practices: TargetPractice[];
  patients: TargetPatient[];
  cases: TargetCase[];
  caseMessages: TargetCaseMessage[];
  projects: TargetProject[];
  workflowTemplateTasks: TargetWorkflowTemplateTask[];
  instructionStates: TargetInstructionState[];
  workflowReconstructions: WorkflowReconstruction[];
  stats: {
    totalTransformed: number;
    skippedRecords: number;
    errors: MigrationError[];
    transformationTimeMs: number;
  };
}

/**
 * Data transformation service for legacy to Supabase schema conversion
 * Handles schema mapping, data normalization, and workflow reconstruction
 */
export class LegacyMigrationDataTransformer {
  private config: TransformationConfig;
  private progressCallback: ((progress: MigrationProgress) => void) | undefined;
  private contentTypeMap: Map<number, LegacyContentType> = new Map();
  private userMap: Map<number, LegacyUser> = new Map();
  private practiceMap: Map<number, LegacyPractice> = new Map();
  private patientMap: Map<number, LegacyPatient> = new Map();
  private errors: MigrationError[] = [];

  constructor(
    config: TransformationConfig,
    progressCallback?: (progress: MigrationProgress) => void
  ) {
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Transform all legacy data to Supabase schema
   */
  async transformAllData(
    users: LegacyUser[],
    practices: LegacyPractice[],
    patients: LegacyPatient[],
    _comments: LegacyComment[],
    _states: LegacyState[],
    contentTypes: LegacyContentType[],
    _projects: LegacyProject[],
    _templates: LegacyTemplate[],
    _instructionStates: LegacyInstructionState[]
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    
    try {
      // Build lookup maps
      this.buildLookupMaps(users, practices, patients, contentTypes);
      
      // Transform data in dependency order
      this.updateProgress('Transforming user profiles...', 10);
      const profiles = this.transformUsers(users);
      
      this.updateProgress('Transforming practices...', 20);
      const transformedPractices = this.transformPractices(practices);
      
      this.updateProgress('Transforming patients...', 30);
      const transformedPatients = this.transformPatients(patients, profiles);
      
      // TODO: Implement project-centric transformation logic
      this.updateProgress('Project-centric transformation not yet implemented...', 50);
      
      // Placeholder empty arrays for now - will be implemented in Phase 3
      const cases: TargetCase[] = [];
      const caseMessages: TargetCaseMessage[] = [];
      const transformedProjects: TargetProject[] = [];
      const workflowTemplateTasks: TargetWorkflowTemplateTask[] = [];
      const transformedInstructionStates: TargetInstructionState[] = [];
      const workflowReconstructions: WorkflowReconstruction[] = [];
      
      const result: TransformationResult = {
        profiles,
        practices: transformedPractices,
        patients: transformedPatients,
        cases,
        caseMessages,
        projects: transformedProjects,
        workflowTemplateTasks,
        instructionStates: transformedInstructionStates,
        workflowReconstructions,
        stats: {
          totalTransformed: profiles.length + transformedPractices.length + transformedPatients.length,
          skippedRecords: 0,
          errors: this.errors,
          transformationTimeMs: Date.now() - startTime
        }
      };
      
      this.updateProgress('Transformation complete', 100);
      return result;
      
    } catch (error) {
      throw new Error(`Data transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build lookup maps for efficient data access
   */
  private buildLookupMaps(
    users: LegacyUser[],
    practices: LegacyPractice[],
    patients: LegacyPatient[],
    contentTypes: LegacyContentType[]
  ): void {
    // Build content type map
    contentTypes.forEach(ct => this.contentTypeMap.set(ct.id, ct));
    
    // Build user map
    users.forEach(user => this.userMap.set(user.id, user));
    
    // Build practice map
    practices.forEach(practice => this.practiceMap.set(practice.id, practice));
    
    // Build patient map
    patients.forEach(patient => this.patientMap.set(patient.id, patient));
  }

  /**
   * Transform legacy users to target profiles
   */
  private transformUsers(users: LegacyUser[]): TargetProfile[] {
    logger.info(`🔄 Transforming ${users.length} users to profiles...`);
    
    const profiles = users.map((user, index) => {
      try {
        const role = this.determineUserRole(user);
        
        // Generate UUID with validation and logging
        const userId = UuidValidator.convertLegacyId(user.id, this.config.generateUUIDs);
        const validatedUserId = UuidValidator.validateAndLog(userId, `user-${user.id}`);
        
        const profile: TargetProfile = {
          id: validatedUserId,
          email: user.email && user.email.trim() !== '' ? user.email.trim() : null,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          role,
          created_at: this.config.preserveTimestamps ? user.date_joined : new Date().toISOString(),
          updated_at: this.config.preserveTimestamps ? (user.last_login || user.date_joined) : new Date().toISOString()
        };
        
        // Log first few transformations for debugging
        if (index < 3) {
          logger.debug(`👤 User transformation sample ${index + 1}:`, {
            legacyId: user.id,
            generatedId: validatedUserId,
            email: user.email,
            role: role
          });
        }
        
        // Note: phone field not available in legacy user schema
        
        return profile;
      } catch (error) {
        logger.error(`❌ Failed to transform user ${user.id}:`, error);
        this.addError('transformation', 'transform_users', user.id, 'validation', `Failed to transform user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }).filter((profile): profile is TargetProfile => profile !== null);
    
    logger.info(`✅ Successfully transformed ${profiles.length}/${users.length} users to profiles`);
    return profiles;
  }

  /**
   * Transform legacy practices to target practices
   */
  private transformPractices(practices: LegacyPractice[]): TargetPractice[] {
    return practices.map(practice => {
      try {
        const address = this.buildAddressObject(practice);
        
        const targetPractice: TargetPractice = {
          id: this.config.generateUUIDs ? uuidv4() : practice.id.toString(),
          name: practice.name || 'Unknown Practice',
          settings: {},
          created_at: this.config.preserveTimestamps ? practice.created_at : new Date().toISOString(),
          updated_at: this.config.preserveTimestamps ? practice.updated_at : new Date().toISOString()
        };
        
        // Only add optional fields if they have values
        if (address) {
          targetPractice.address = address;
        }
        if (practice.phone) {
          targetPractice.phone = practice.phone;
        }
        if (practice.email) {
          targetPractice.email = practice.email;
        }
        
        return targetPractice;
      } catch (error) {
        this.addError('transformation', 'transform_practices', practice.id, 'validation', `Failed to transform practice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }).filter((practice): practice is TargetPractice => practice !== null);
  }

  /**
   * Transform legacy patients to target patients
   */
  private transformPatients(patients: LegacyPatient[], profiles: TargetProfile[]): TargetPatient[] {
    const profileMap = new Map(profiles.map(p => [p.email, p.id]));
    
    return patients.map(patient => {
      try {
        // Find corresponding profile by email or user relationship
        const profileId = patient.user_email ? profileMap.get(patient.user_email) : undefined;
        
        // Get user data for first_name and last_name (required fields)
        const correspondingUser = patient.user_id ? this.userMap.get(patient.user_id) : undefined;
        
        // Generate practice ID (would need to be mapped from legacy data)
        const practiceId = this.config.generateUUIDs ? uuidv4() : '1'; // Default practice
        
        const medicalHistory = this.buildMedicalHistoryObject(patient);
        const emergencyContact = this.buildEmergencyContactObject(patient);
        
        // Ensure required fields are populated from user data if patient data is missing
        const firstName = patient.first_name || correspondingUser?.first_name || 'Unknown';
        const lastName = patient.last_name || correspondingUser?.last_name || 'Patient';
        
        const targetPatient: TargetPatient = {
          id: this.config.generateUUIDs ? uuidv4() : patient.id.toString(),
          practice_id: practiceId,
          patient_number: this.generatePatientNumber(patient),
          first_name: firstName,
          last_name: lastName,
          medical_history: medicalHistory,
          preferences: {},
          created_at: this.config.preserveTimestamps ? (patient.created_at || new Date().toISOString()) : new Date().toISOString(),
          updated_at: this.config.preserveTimestamps ? (patient.updated_at || new Date().toISOString()) : new Date().toISOString()
        };
        
        // Only add optional fields if they have values
        if (profileId) {
          targetPatient.profile_id = profileId;
        }
        if (patient.email) {
          targetPatient.email = patient.email;
        }
        if (patient.date_of_birth) {
          targetPatient.date_of_birth = patient.date_of_birth;
        }
        const normalizedGender = this.normalizeGender(patient.gender);
        if (normalizedGender) {
          targetPatient.gender = normalizedGender;
        }
        if (emergencyContact && Object.keys(emergencyContact).length > 0) {
          targetPatient.emergency_contact = emergencyContact;
        }
        
        return targetPatient;
      } catch (error) {
        this.addError('transformation', 'transform_patients', patient.id, 'validation', `Failed to transform patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    }).filter((patient): patient is TargetPatient => patient !== null);
  }

  // TODO: Implement transformProjectsToCases method for project-centric migration

  /**
   * Transform legacy comments to target case messages
   */
  // TODO: Implement transformCommentsToCaseMessages for project-centric migration

  // TODO: Remove this method - orders are no longer part of project-centric migration

  /**
   * Reconstruct workflows from state transitions
   */
  // TODO: Implement reconstructWorkflows for project-centric migration

  // Helper methods

  private determineUserRole(user: LegacyUser): 'doctor' | 'technician' | 'admin' | 'support' {
    if (user.is_superuser) return 'admin';
    if (user.is_staff) return 'technician';
    return 'doctor'; // Default assumption
  }

  private buildAddressObject(practice: LegacyPractice): Record<string, unknown> | null {
    if (!practice.address && !practice.city && !practice.state && !practice.zip_code) {
      return null;
    }
    
    return {
      street: practice.address || '',
      city: practice.city || '',
      state: practice.state || '',
      zip_code: practice.zip_code || '',
      country: 'US' // Default assumption
    };
  }

  private buildMedicalHistoryObject(patient: LegacyPatient): Record<string, unknown> {
    return {
      conditions: patient.medical_history || '',
      allergies: patient.allergies || '',
      medications: patient.medications || '',
      insurance: {
        provider: patient.insurance_provider || '',
        id: patient.insurance_id || ''
      }
    };
  }

  private buildEmergencyContactObject(patient: LegacyPatient): Record<string, unknown> | null {
    if (!patient.emergency_contact_name && !patient.emergency_contact_phone) {
      return null;
    }
    
    return {
      name: patient.emergency_contact_name || '',
      phone: patient.emergency_contact_phone || '',
      relationship: 'Unknown' // Not available in legacy schema
    };
  }

  private generatePatientNumber(patient: LegacyPatient): string {
    return `P${patient.id.toString().padStart(6, '0')}`;
  }

  private normalizeGender(gender?: string): 'male' | 'female' | 'other' | 'prefer_not_to_say' | undefined {
    if (!gender) return undefined;
    
    const normalized = gender.toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'male';
    if (normalized === 'female' || normalized === 'f') return 'female';
    if (normalized === 'other') return 'other';
    return 'prefer_not_to_say';
  }

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove this method - no longer needed for project-centric migration

  // TODO: Remove these methods - no longer needed for project-centric migration

  // TODO: Remove these methods - no longer needed for project-centric migration

  private addError(phase: string, step: string, recordId: string | number, errorType: 'validation' | 'transformation' | 'database' | 'api' | 'network', message: string): void {
    this.errors.push({
      id: uuidv4(),
      phase,
      step,
      recordId: recordId.toString(),
      errorType,
      message,
      timestamp: new Date(),
      retryCount: 0
    });
  }

  private updateProgress(message: string, _percentage: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase: 'transformation',
        step: message,
        totalRecords: 0,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: this.errors.length,
        errors: this.errors,
        startTime: new Date()
      });
    }
  }
}