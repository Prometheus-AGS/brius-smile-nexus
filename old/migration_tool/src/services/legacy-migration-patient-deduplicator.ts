import { v4 as uuidv4 } from '../../$node_modules/uuid/dist/esm/index.js';
import {
  LegacyPatient,
  TargetPatient,
  DeduplicationCandidate,
  DeduplicationResult,
  MigrationError,
  MigrationProgress
} from '../types/legacy-migration-types';

/**
 * Patient Deduplication Engine
 * 
 * Implements fuzzy matching algorithms to identify and resolve duplicate patient records
 * from the legacy Django system. Uses multiple similarity factors including name matching,
 * email comparison, phone number analysis, and date of birth verification.
 */
export class LegacyMigrationPatientDeduplicator {
  private errors: MigrationError[] = [];
  private progressCallback: ((progress: MigrationProgress) => void) | undefined;
  
  // Similarity thresholds for automatic vs manual review
  private readonly AUTOMATIC_MERGE_THRESHOLD = 0.95;
  private readonly MANUAL_REVIEW_THRESHOLD = 0.75;
  
  // Individual factor weights
  private readonly WEIGHTS = {
    name: 0.4,
    email: 0.3,
    phone: 0.2,
    dateOfBirth: 0.1
  };

  constructor(progressCallback?: (progress: MigrationProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Main deduplication method
   * Analyzes all patients and identifies potential duplicates
   */
  async deduplicatePatients(patients: LegacyPatient[]): Promise<DeduplicationResult> {
    this.updateProgress('Starting patient deduplication analysis', 0);
    
    try {
      // Step 1: Build similarity matrix
      const candidates = await this.findDuplicationCandidates(patients);
      
      // Step 2: Process candidates based on confidence scores
      const result = await this.processCandidates(candidates, patients);
      
      this.updateProgress('Patient deduplication completed', 100);
      
      return result;
    } catch (error) {
      this.addError('deduplication', 'deduplicate_patients', 'all', 'validation',
        `Deduplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return empty result on failure
      return {
        totalCandidates: 0,
        automaticMerges: 0,
        manualReviewRequired: 0,
        skipped: 0,
        mergedRecords: [],
        reviewQueue: []
      };
    }
  }

  /**
   * Find potential duplicate candidates using fuzzy matching
   */
  private async findDuplicationCandidates(patients: LegacyPatient[]): Promise<DeduplicationCandidate[]> {
    const candidates: DeduplicationCandidate[] = [];
    const processed = new Set<number>();
    
    this.updateProgress('Analyzing patient similarities', 25);
    
    for (let i = 0; i < patients.length; i++) {
      const primaryPatient = patients[i];
      if (!primaryPatient || processed.has(primaryPatient.id)) continue;
      
      const duplicates: LegacyPatient[] = [];
      
      // Compare with all subsequent patients
      for (let j = i + 1; j < patients.length; j++) {
        const comparePatient = patients[j];
        if (!comparePatient || processed.has(comparePatient.id)) continue;
        
        const similarity = this.calculateSimilarity(primaryPatient, comparePatient);
        
        // If similarity is above manual review threshold, consider as duplicate
        if (similarity.confidenceScore >= this.MANUAL_REVIEW_THRESHOLD) {
          duplicates.push(comparePatient);
          processed.add(comparePatient.id);
        }
      }
      
      // If duplicates found, create candidate
      if (duplicates.length > 0) {
        const similarity = this.calculateBestSimilarity(primaryPatient, duplicates);
        const mergeStrategy = this.determineMergeStrategy(similarity.confidenceScore);
        
        const candidate: DeduplicationCandidate = {
          primaryRecord: primaryPatient,
          duplicateRecords: duplicates,
          confidenceScore: similarity.confidenceScore,
          similarityFactors: similarity.similarityFactors,
          mergeStrategy
        };
        
        // Only add mergedData if it's automatic merge
        if (mergeStrategy === 'automatic') {
          candidate.mergedData = this.mergePatientData(primaryPatient, duplicates);
        }
        
        candidates.push(candidate);
        processed.add(primaryPatient.id);
      }
    }
    
    return candidates;
  }

  /**
   * Calculate similarity between two patients
   */
  private calculateSimilarity(patient1: LegacyPatient, patient2: LegacyPatient): {
    confidenceScore: number;
    similarityFactors: {
      nameScore: number;
      emailScore: number;
      phoneScore: number;
      dobScore: number;
    };
  } {
    const nameScore = this.calculateNameSimilarity(patient1, patient2);
    const emailScore = this.calculateEmailSimilarity(patient1, patient2);
    const phoneScore = this.calculatePhoneSimilarity(patient1, patient2);
    const dobScore = this.calculateDateOfBirthSimilarity(patient1, patient2);
    
    const confidenceScore = 
      (nameScore * this.WEIGHTS.name) +
      (emailScore * this.WEIGHTS.email) +
      (phoneScore * this.WEIGHTS.phone) +
      (dobScore * this.WEIGHTS.dateOfBirth);
    
    return {
      confidenceScore,
      similarityFactors: {
        nameScore,
        emailScore,
        phoneScore,
        dobScore
      }
    };
  }

  /**
   * Calculate name similarity using Levenshtein distance and phonetic matching
   */
  private calculateNameSimilarity(patient1: LegacyPatient, patient2: LegacyPatient): number {
    const name1 = this.normalizeName(patient1.first_name, patient1.last_name);
    const name2 = this.normalizeName(patient2.first_name, patient2.last_name);
    
    if (!name1 || !name2) return 0;
    
    // Exact match
    if (name1 === name2) return 1.0;
    
    // Levenshtein distance similarity
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    const similarity = 1 - (distance / maxLength);
    
    // Boost score for matching first or last names
    const firstNameMatch = this.normalizeString(patient1.first_name || '') === 
                          this.normalizeString(patient2.first_name || '');
    const lastNameMatch = this.normalizeString(patient1.last_name || '') === 
                         this.normalizeString(patient2.last_name || '');
    
    let boost = 0;
    if (firstNameMatch) boost += 0.2;
    if (lastNameMatch) boost += 0.3;
    
    return Math.min(1.0, similarity + boost);
  }

  /**
   * Calculate email similarity
   */
  private calculateEmailSimilarity(patient1: LegacyPatient, patient2: LegacyPatient): number {
    const email1 = this.normalizeString(patient1.email || '');
    const email2 = this.normalizeString(patient2.email || '');
    
    if (!email1 || !email2) return 0;
    
    // Exact match
    if (email1 === email2) return 1.0;
    
    // Check if one email is a variation of the other (e.g., with dots or plus signs)
    const cleanEmail1 = email1.replace(/[.+]/g, '');
    const cleanEmail2 = email2.replace(/[.+]/g, '');
    
    if (cleanEmail1 === cleanEmail2) return 0.9;
    
    // Levenshtein similarity for typos
    const distance = this.levenshteinDistance(email1, email2);
    const maxLength = Math.max(email1.length, email2.length);
    const similarity = 1 - (distance / maxLength);
    
    // Only consider high similarity for emails (typos are rare)
    return similarity > 0.8 ? similarity : 0;
  }

  /**
   * Calculate phone number similarity
   */
  private calculatePhoneSimilarity(patient1: LegacyPatient, patient2: LegacyPatient): number {
    const phone1 = this.normalizePhoneNumber(patient1.phone || '');
    const phone2 = this.normalizePhoneNumber(patient2.phone || '');
    
    if (!phone1 || !phone2) return 0;
    
    // Exact match
    if (phone1 === phone2) return 1.0;
    
    // Check if one is a subset of the other (different formatting)
    if (phone1.includes(phone2) || phone2.includes(phone1)) return 0.8;
    
    return 0;
  }

  /**
   * Calculate date of birth similarity
   */
  private calculateDateOfBirthSimilarity(patient1: LegacyPatient, patient2: LegacyPatient): number {
    if (!patient1.date_of_birth || !patient2.date_of_birth) return 0;
    
    const date1 = new Date(patient1.date_of_birth);
    const date2 = new Date(patient2.date_of_birth);
    
    // Exact match
    if (date1.getTime() === date2.getTime()) return 1.0;
    
    // Check for common data entry errors (day/month swap, year off by 1)
    const dayMonthSwap = new Date(date1.getFullYear(), date1.getDate() - 1, date1.getMonth() + 1);
    if (dayMonthSwap.getTime() === date2.getTime()) return 0.8;
    
    const yearOffBy1 = new Date(date1.getFullYear() + 1, date1.getMonth(), date1.getDate());
    const yearOffBy1Neg = new Date(date1.getFullYear() - 1, date1.getMonth(), date1.getDate());
    if (yearOffBy1.getTime() === date2.getTime() || yearOffBy1Neg.getTime() === date2.getTime()) {
      return 0.7;
    }
    
    return 0;
  }

  /**
   * Calculate best similarity among multiple duplicates
   */
  private calculateBestSimilarity(primary: LegacyPatient, duplicates: LegacyPatient[]): {
    confidenceScore: number;
    similarityFactors: {
      nameScore: number;
      emailScore: number;
      phoneScore: number;
      dobScore: number;
    };
  } {
    let bestSimilarity = { confidenceScore: 0, similarityFactors: { nameScore: 0, emailScore: 0, phoneScore: 0, dobScore: 0 } };
    
    for (const duplicate of duplicates) {
      const similarity = this.calculateSimilarity(primary, duplicate);
      if (similarity.confidenceScore > bestSimilarity.confidenceScore) {
        bestSimilarity = similarity;
      }
    }
    
    return bestSimilarity;
  }

  /**
   * Determine merge strategy based on confidence score
   */
  private determineMergeStrategy(confidenceScore: number): 'automatic' | 'manual_review' | 'skip' {
    if (confidenceScore >= this.AUTOMATIC_MERGE_THRESHOLD) {
      return 'automatic';
    } else if (confidenceScore >= this.MANUAL_REVIEW_THRESHOLD) {
      return 'manual_review';
    } else {
      return 'skip';
    }
  }

  /**
   * Merge patient data from primary and duplicate records
   */
  private mergePatientData(primary: LegacyPatient, duplicates: LegacyPatient[]): TargetPatient {
    // Start with primary record
    const merged: TargetPatient = {
      id: uuidv4(),
      practice_id: '1', // Will be set properly during transformation
      patient_number: this.generatePatientNumber(primary),
      first_name: primary.first_name || '',
      last_name: primary.last_name || '',
      medical_history: {},
      preferences: {},
      created_at: primary.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Merge data from duplicates, preferring non-empty values
    const allRecords = [primary, ...duplicates];
    
    // Find best email (prefer non-empty, most recent)
    const emailRecord = allRecords
      .filter(r => r.email)
      .sort((a, b) => new Date(b.updated_at || new Date().toISOString()).getTime() - new Date(a.updated_at || new Date().toISOString()).getTime())[0];
    if (emailRecord?.email) {
      merged.email = emailRecord.email;
    }

    // Find best date of birth
    const dobRecord = allRecords.find(r => r.date_of_birth);
    if (dobRecord?.date_of_birth) {
      merged.date_of_birth = dobRecord.date_of_birth;
    }

    // Find best gender
    const genderRecord = allRecords.find(r => r.gender);
    if (genderRecord?.gender) {
      const normalizedGender = this.normalizeGender(genderRecord.gender);
      if (normalizedGender) {
        merged.gender = normalizedGender;
      }
    }

    // Use earliest created date
    const earliestCreated = allRecords
      .map(r => new Date(r.created_at || new Date().toISOString()))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (earliestCreated) {
      merged.created_at = earliestCreated.toISOString();
    }

    // Build medical history from all records
    merged.medical_history = {
      merged_from_records: allRecords.map(r => r.id),
      merge_timestamp: new Date().toISOString(),
      primary_record_id: primary.id
    };

    return merged;
  }

  /**
   * Process all candidates and generate final result
   */
  private async processCandidates(
    candidates: DeduplicationCandidate[], 
    originalPatients: LegacyPatient[]
  ): Promise<DeduplicationResult> {
    this.updateProgress('Processing deduplication candidates', 75);
    
    const result: DeduplicationResult = {
      totalCandidates: candidates.length,
      automaticMerges: 0,
      manualReviewRequired: 0,
      skipped: 0,
      mergedRecords: [],
      reviewQueue: []
    };

    for (const candidate of candidates) {
      switch (candidate.mergeStrategy) {
        case 'automatic':
          if (candidate.mergedData) {
            result.mergedRecords.push(candidate.mergedData);
            result.automaticMerges++;
          }
          break;
        case 'manual_review':
          result.reviewQueue.push(candidate);
          result.manualReviewRequired++;
          break;
        case 'skip':
          result.skipped++;
          break;
      }
    }

    // Add non-duplicate patients to merged records
    const duplicateIds = new Set<number>();
    candidates.forEach(candidate => {
      duplicateIds.add(candidate.primaryRecord.id);
      candidate.duplicateRecords.forEach(dup => duplicateIds.add(dup.id));
    });

    const nonDuplicates = originalPatients.filter(p => !duplicateIds.has(p.id));
    for (const patient of nonDuplicates) {
      const targetPatient = this.convertToTargetPatient(patient);
      result.mergedRecords.push(targetPatient);
    }

    return result;
  }

  /**
   * Convert legacy patient to target patient format
   */
  private convertToTargetPatient(patient: LegacyPatient): TargetPatient {
    const targetPatient: TargetPatient = {
      id: uuidv4(),
      practice_id: '1', // Will be set properly during transformation
      patient_number: this.generatePatientNumber(patient),
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      medical_history: { legacy_patient_id: patient.id },
      preferences: {},
      created_at: patient.created_at || new Date().toISOString(),
      updated_at: patient.updated_at || new Date().toISOString()
    };

    // Add optional fields if they exist
    if (patient.email) {
      targetPatient.email = patient.email;
    }
    if (patient.date_of_birth) {
      targetPatient.date_of_birth = patient.date_of_birth;
    }
    if (patient.gender) {
      const normalizedGender = this.normalizeGender(patient.gender);
      if (normalizedGender) {
        targetPatient.gender = normalizedGender;
      }
    }

    return targetPatient;
  }

  /**
   * Utility methods
   */
  private normalizeName(firstName?: string, lastName?: string): string {
    const first = this.normalizeString(firstName || '');
    const last = this.normalizeString(lastName || '');
    return `${first} ${last}`.trim();
  }

  private normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  private normalizeGender(gender?: string): 'male' | 'female' | 'other' | 'prefer_not_to_say' | undefined {
    if (!gender) return undefined;
    
    const normalized = gender.toLowerCase().trim();
    switch (normalized) {
      case 'male':
      case 'm':
        return 'male';
      case 'female':
      case 'f':
        return 'female';
      case 'other':
      case 'o':
        return 'other';
      case 'prefer_not_to_say':
      case 'prefer not to say':
      case 'n/a':
        return 'prefer_not_to_say';
      default:
        return 'other';
    }
  }

  private generatePatientNumber(patient: LegacyPatient): string {
    // Generate patient number based on legacy ID and name
    const namePrefix = (patient.last_name || 'UNK').substring(0, 3).toUpperCase();
    return `${namePrefix}${patient.id.toString().padStart(6, '0')}`;
  }

  /**
   * Levenshtein distance algorithm for string similarity
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const rows = str2.length + 1;
    const cols = str1.length + 1;
    const matrix: number[][] = [];
    
    // Initialize matrix with proper dimensions
    for (let i = 0; i < rows; i++) {
      matrix[i] = new Array(cols).fill(0);
    }
    
    // Initialize first row and column
    for (let i = 0; i < rows; i++) {
      matrix[i]![0] = i;
    }
    
    for (let j = 0; j < cols; j++) {
      matrix[0]![j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const currentRow = matrix[i]!;
        const prevRow = matrix[i - 1]!;
        
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          currentRow[j] = prevRow[j - 1]!;
        } else {
          currentRow[j] = Math.min(
            prevRow[j - 1]! + 1, // substitution
            currentRow[j - 1]! + 1, // insertion
            prevRow[j]! + 1 // deletion
          );
        }
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Error handling
   */
  private addError(
    phase: string,
    step: string,
    recordId: string | number,
    errorType: 'validation' | 'transformation' | 'database' | 'api' | 'network',
    message: string
  ): void {
    this.errors.push({
      id: uuidv4(),
      phase,
      step,
      recordId,
      errorType,
      message,
      timestamp: new Date(),
      retryCount: 0
    });
  }

  /**
   * Progress tracking
   */
  private updateProgress(message: string, _percentage: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase: 'deduplication',
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

  /**
   * Get accumulated errors
   */
  getErrors(): MigrationError[] {
    return [...this.errors];
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}