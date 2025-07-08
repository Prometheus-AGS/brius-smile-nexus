import { 
  ValidationRule, 
  ValidationResult as TestingValidationResult, 
  TestResult, 
  ValidationCategory,
  ValidationSeverity,
  PerformanceMetrics,
  TestCase
} from '../../types/testing';
import { 
  ValidationResult as MigrationValidationResult
} from '../../types/migration';
import { Patient, Case, Practitioner } from '../../types/database';

// Define healthcare-specific interfaces for validation
interface HealthcareProvider {
  id: string;
  npi: string;
  first_name: string;
  last_name: string;
  specialties?: string[];
}

interface HealthcareDiagnosis {
  id: string;
  patient_id: string;
  encounter_id: string;
  icd10_code: string;
  description: string;
  date_diagnosed: string;
}

interface HealthcareProcedure {
  id: string;
  patient_id: string;
  encounter_id: string;
  cpt_code: string;
  description: string;
  date_performed: string;
}

interface HealthcareEncounter {
  id: string;
  patient_id: string;
  provider_id: string;
  encounter_date: string;
  encounter_type: string;
}

interface HealthcareMedication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribed_date: string;
}

// Extended Patient interface with MRN
interface PatientWithMRN extends Patient {
  mrn: string;
}

// Transformation result interface for post-migration validation
interface TransformationResult {
  success: boolean;
  recordId: string;
  sourceData: Record<string, unknown>;
  transformedData?: Record<string, unknown>;
  validationResult?: MigrationValidationResult;
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
}

/**
 * Data Validation Framework
 * 
 * Comprehensive framework for validating healthcare data integrity,
 * business rules compliance, and clinical safety requirements during
 * and after data migration processes.
 */
export class DataValidationFramework {
  private validationRules: Map<string, ValidationRule> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    executionTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    diskIO: 0,
    networkIO: 0,
    databaseConnections: 0,
    queriesExecuted: 0,
    recordsProcessed: 0
  };

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize all healthcare-specific validation rules
   */
  private initializeValidationRules(): void {
    // Patient Data Validation Rules
    this.addValidationRule({
      id: 'patient-001',
      name: 'Patient MRN Format Validation',
      description: 'Validates Medical Record Number format and uniqueness',
      category: 'data-integrity',
      severity: 'critical',
      applicableEntities: ['Patient'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const patients = data as PatientWithMRN[];
        const mrnPattern = /^MRN-\d{8}$/;
        const mrnSet = new Set<string>();
        const invalidRecords: string[] = [];
        const duplicateRecords: string[] = [];

        for (const patient of patients) {
          // Check MRN format
          if (!mrnPattern.test(patient.mrn)) {
            invalidRecords.push(`Patient ${patient.id}: Invalid MRN format '${patient.mrn}'`);
          }

          // Check for duplicates
          if (mrnSet.has(patient.mrn)) {
            duplicateRecords.push(`Patient ${patient.id}: Duplicate MRN '${patient.mrn}'`);
          } else {
            mrnSet.add(patient.mrn);
          }
        }

        const hasErrors = invalidRecords.length > 0 || duplicateRecords.length > 0;
        const allErrors = [...invalidRecords, ...duplicateRecords];

        return {
          ruleId: 'patient-001',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${allErrors.length} MRN validation errors`
            : 'All patient MRNs are valid and unique',
          details: hasErrors ? { errors: allErrors } : undefined,
          affectedRecords: hasErrors ? allErrors : [],
          suggestions: hasErrors ? [
            'Ensure MRN follows format: MRN-########',
            'Check for duplicate MRNs in source data',
            'Implement MRN generation logic if missing'
          ] : undefined
        };
      }
    });

    this.addValidationRule({
      id: 'patient-002',
      name: 'Patient Demographics Completeness',
      description: 'Validates required patient demographic fields are present',
      category: 'data-quality',
      severity: 'error',
      applicableEntities: ['Patient'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const patients = data as PatientWithMRN[];
        const incompleteRecords: string[] = [];
        const requiredFields = ['first_name', 'last_name', 'date_of_birth', 'gender'];

        for (const patient of patients) {
          const missingFields: string[] = [];
          
          for (const field of requiredFields) {
            const value = patient[field as keyof PatientWithMRN];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              missingFields.push(field);
            }
          }

          if (missingFields.length > 0) {
            incompleteRecords.push(
              `Patient ${patient.id} (${patient.mrn}): Missing ${missingFields.join(', ')}`
            );
          }
        }

        const hasErrors = incompleteRecords.length > 0;

        return {
          ruleId: 'patient-002',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${incompleteRecords.length} patients with incomplete demographics`
            : 'All patients have complete demographic information',
          details: hasErrors ? { incompleteRecords } : undefined,
          affectedRecords: hasErrors ? incompleteRecords : [],
          suggestions: hasErrors ? [
            'Review source data for missing demographic fields',
            'Implement data enrichment processes',
            'Consider marking incomplete records for manual review'
          ] : undefined
        };
      }
    });

    // Clinical Data Validation Rules
    this.addValidationRule({
      id: 'clinical-001',
      name: 'ICD-10 Code Validation',
      description: 'Validates ICD-10 diagnosis codes format and validity',
      category: 'clinical-safety',
      severity: 'critical',
      applicableEntities: ['Diagnosis'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const diagnoses = data as HealthcareDiagnosis[];
        const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;
        const invalidCodes: string[] = [];

        for (const diagnosis of diagnoses) {
          if (!icd10Pattern.test(diagnosis.icd10_code)) {
            invalidCodes.push(
              `Diagnosis ${diagnosis.id}: Invalid ICD-10 code '${diagnosis.icd10_code}'`
            );
          }
        }

        const hasErrors = invalidCodes.length > 0;

        return {
          ruleId: 'clinical-001',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${invalidCodes.length} invalid ICD-10 codes`
            : 'All ICD-10 codes are properly formatted',
          details: hasErrors ? { invalidCodes } : undefined,
          affectedRecords: hasErrors ? invalidCodes : [],
          suggestions: hasErrors ? [
            'Validate ICD-10 codes against official code sets',
            'Implement code mapping for legacy formats',
            'Review clinical coding practices'
          ] : undefined
        };
      }
    });

    this.addValidationRule({
      id: 'clinical-002',
      name: 'CPT Code Validation',
      description: 'Validates CPT procedure codes format and validity',
      category: 'clinical-safety',
      severity: 'critical',
      applicableEntities: ['Procedure'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const procedures = data as HealthcareProcedure[];
        const cptPattern = /^\d{5}$/;
        const invalidCodes: string[] = [];

        for (const procedure of procedures) {
          if (!cptPattern.test(procedure.cpt_code)) {
            invalidCodes.push(
              `Procedure ${procedure.id}: Invalid CPT code '${procedure.cpt_code}'`
            );
          }
        }

        const hasErrors = invalidCodes.length > 0;

        return {
          ruleId: 'clinical-002',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${invalidCodes.length} invalid CPT codes`
            : 'All CPT codes are properly formatted',
          details: hasErrors ? { invalidCodes } : undefined,
          affectedRecords: hasErrors ? invalidCodes : [],
          suggestions: hasErrors ? [
            'Validate CPT codes against current code sets',
            'Check for deprecated or obsolete codes',
            'Implement procedure code mapping'
          ] : undefined
        };
      }
    });

    // Referential Integrity Rules
    this.addValidationRule({
      id: 'referential-001',
      name: 'Patient-Encounter Referential Integrity',
      description: 'Validates all encounters reference valid patients',
      category: 'referential-integrity',
      severity: 'critical',
      applicableEntities: ['Encounter', 'Patient'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const allData = data as (HealthcareEncounter | PatientWithMRN)[];
        const patients = allData.filter((item): item is PatientWithMRN => 'mrn' in item);
        const encounters = allData.filter((item): item is HealthcareEncounter => 'patient_id' in item && 'encounter_date' in item);
        
        const patientIds = new Set(patients.map(p => p.id));
        const orphanedEncounters: string[] = [];

        for (const encounter of encounters) {
          if (!patientIds.has(encounter.patient_id)) {
            orphanedEncounters.push(
              `Encounter ${encounter.id}: References non-existent patient ${encounter.patient_id}`
            );
          }
        }

        const hasErrors = orphanedEncounters.length > 0;

        return {
          ruleId: 'referential-001',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${orphanedEncounters.length} orphaned encounters`
            : 'All encounters reference valid patients',
          details: hasErrors ? { orphanedEncounters } : undefined,
          affectedRecords: hasErrors ? orphanedEncounters : [],
          suggestions: hasErrors ? [
            'Check patient data migration completeness',
            'Verify patient ID mapping accuracy',
            'Consider creating placeholder patients for orphaned encounters'
          ] : undefined
        };
      }
    });

    // Business Rules Validation
    this.addValidationRule({
      id: 'business-001',
      name: 'Provider NPI Validation',
      description: 'Validates National Provider Identifier format and check digit',
      category: 'business-rule',
      severity: 'error',
      applicableEntities: ['Provider'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const providers = data as HealthcareProvider[];
        const invalidNPIs: string[] = [];

        for (const provider of providers) {
          if (!this.validateNPI(provider.npi)) {
            invalidNPIs.push(
              `Provider ${provider.id}: Invalid NPI '${provider.npi}'`
            );
          }
        }

        const hasErrors = invalidNPIs.length > 0;

        return {
          ruleId: 'business-001',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${invalidNPIs.length} invalid NPIs`
            : 'All provider NPIs are valid',
          details: hasErrors ? { invalidNPIs } : undefined,
          affectedRecords: hasErrors ? invalidNPIs : [],
          suggestions: hasErrors ? [
            'Verify NPI numbers with NPPES registry',
            'Implement NPI check digit validation',
            'Review provider data sources'
          ] : undefined
        };
      }
    });

    // Compliance Rules
    this.addValidationRule({
      id: 'compliance-001',
      name: 'HIPAA Date Precision Compliance',
      description: 'Validates date precision compliance for patients over 89',
      category: 'compliance',
      severity: 'error',
      applicableEntities: ['Patient'],
      validate: async (data: unknown): Promise<TestingValidationResult> => {
        const patients = data as PatientWithMRN[];
        const nonCompliantRecords: string[] = [];
        const currentDate = new Date();

        for (const patient of patients) {
          if (patient.date_of_birth) {
            const birthDate = new Date(patient.date_of_birth);
            const age = currentDate.getFullYear() - birthDate.getFullYear();

            // HIPAA requires dates to be generalized for patients over 89
            if (age > 89) {
              // Check if birth date is January 1st (indicating proper generalization)
              if (birthDate.getMonth() !== 0 || birthDate.getDate() !== 1) {
                nonCompliantRecords.push(
                  `Patient ${patient.id} (${patient.mrn}): Age ${age} requires date generalization`
                );
              }
            }
          }
        }

        const hasErrors = nonCompliantRecords.length > 0;

        return {
          ruleId: 'compliance-001',
          status: hasErrors ? 'failed' : 'passed',
          message: hasErrors 
            ? `Found ${nonCompliantRecords.length} HIPAA date precision violations`
            : 'All patient dates comply with HIPAA requirements',
          details: hasErrors ? { nonCompliantRecords } : undefined,
          affectedRecords: hasErrors ? nonCompliantRecords : [],
          suggestions: hasErrors ? [
            'Generalize birth dates for patients over 89 to January 1st',
            'Implement HIPAA compliance checks in data processing',
            'Review age calculation and date handling procedures'
          ] : undefined
        };
      }
    });
  }

  /**
   * Add a validation rule to the framework
   */
  private addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  /**
   * Validate NPI check digit using Luhn algorithm
   */
  private validateNPI(npi: string): boolean {
    // NPI must be exactly 10 digits
    if (!/^\d{10}$/.test(npi)) {
      return false;
    }

    // Apply Luhn algorithm for check digit validation
    const digits = npi.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[9];
  }

  /**
   * Run pre-migration validation
   */
  async validatePreMigration(sourceData: Record<string, unknown[]>): Promise<TestResult[]> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    try {
      for (const [ruleId, rule] of this.validationRules) {
        const applicableData = this.getApplicableData(sourceData, rule.applicableEntities);
        
        if (applicableData.length === 0) {
          continue;
        }

        const validationStart = Date.now();
        const validationResult = await rule.validate(applicableData);
        const validationDuration = Date.now() - validationStart;

        results.push({
          id: `pre-migration-${ruleId}`,
          name: `Pre-Migration: ${rule.name}`,
          status: validationResult.status === 'passed' ? 'passed' : 'failed',
          duration: validationDuration,
          timestamp: new Date(),
          metadata: {
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            recordsValidated: applicableData.length,
            affectedRecords: validationResult.affectedRecords?.length || 0,
            validationMessage: validationResult.message
          },
          error: validationResult.status === 'failed' ? {
            message: validationResult.message,
            details: validationResult.details
          } : undefined
        });
      }

      this.performanceMetrics.executionTime = Date.now() - startTime;
      this.performanceMetrics.recordsProcessed = results.length;

      return results;
    } catch (error) {
      return [{
        id: 'pre-migration-error',
        name: 'Pre-Migration Validation Error',
        status: 'failed',
        duration: Date.now() - startTime,
        timestamp: new Date(),
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during pre-migration validation',
          stack: error instanceof Error ? error.stack : undefined
        }
      }];
    }
  }

  /**
   * Run post-migration validation
   */
  async validatePostMigration(
    migratedData: Record<string, unknown[]>,
    transformationResults: TransformationResult[]
  ): Promise<TestResult[]> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    try {
      // Run standard validation rules on migrated data
      const standardResults = await this.validatePreMigration(migratedData);
      results.push(...standardResults.map(result => ({
        ...result,
        id: result.id.replace('pre-migration', 'post-migration'),
        name: result.name.replace('Pre-Migration', 'Post-Migration')
      })));

      // Additional post-migration specific validations
      const transformationValidation = await this.validateTransformationResults(transformationResults);
      results.push(transformationValidation);

      const dataIntegrityValidation = await this.validateDataIntegrity(migratedData);
      results.push(dataIntegrityValidation);

      this.performanceMetrics.executionTime = Date.now() - startTime;
      this.performanceMetrics.recordsProcessed = results.length;

      return results;
    } catch (error) {
      return [{
        id: 'post-migration-error',
        name: 'Post-Migration Validation Error',
        status: 'failed',
        duration: Date.now() - startTime,
        timestamp: new Date(),
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during post-migration validation',
          stack: error instanceof Error ? error.stack : undefined
        }
      }];
    }
  }

  /**
   * Validate transformation results
   */
  private async validateTransformationResults(results: TransformationResult[]): Promise<TestResult> {
    const startTime = Date.now();
    
    const totalRecords = results.length;
    const successfulTransformations = results.filter(r => r.success).length;
    const failedTransformations = results.filter(r => !r.success).length;
    const recordsWithWarnings = results.filter(r => r.warnings && r.warnings.length > 0).length;

    const successRate = totalRecords > 0 ? successfulTransformations / totalRecords : 0;
    const isValid = successRate >= 0.95; // 95% success rate threshold

    return {
      id: 'transformation-validation',
      name: 'Transformation Results Validation',
      status: isValid ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      timestamp: new Date(),
      metadata: {
        totalRecords,
        successfulTransformations,
        failedTransformations,
        recordsWithWarnings,
        successRate: Math.round(successRate * 100),
        threshold: 95
      },
      error: !isValid ? {
        message: `Transformation success rate ${Math.round(successRate * 100)}% below 95% threshold`,
        details: { failedCount: failedTransformations, totalCount: totalRecords }
      } : undefined
    };
  }

  /**
   * Validate overall data integrity
   */
  private async validateDataIntegrity(data: Record<string, unknown[]>): Promise<TestResult> {
    const startTime = Date.now();
    const issues: string[] = [];

    // Check for data completeness
    for (const [entityType, records] of Object.entries(data)) {
      if (records.length === 0) {
        issues.push(`No ${entityType} records found after migration`);
      }
    }

    // Check for reasonable data volumes
    const patients = data.Patient as PatientWithMRN[] || [];
    const encounters = data.Encounter as HealthcareEncounter[] || [];
    const diagnoses = data.Diagnosis as HealthcareDiagnosis[] || [];

    if (encounters.length > 0 && patients.length === 0) {
      issues.push('Encounters exist without corresponding patients');
    }

    if (diagnoses.length > 0 && encounters.length === 0) {
      issues.push('Diagnoses exist without corresponding encounters');
    }

    // Check encounter-to-patient ratio (should be reasonable)
    if (patients.length > 0 && encounters.length > 0) {
      const ratio = encounters.length / patients.length;
      if (ratio < 0.1 || ratio > 100) {
        issues.push(`Unusual encounter-to-patient ratio: ${ratio.toFixed(2)}`);
      }
    }

    const isValid = issues.length === 0;

    return {
      id: 'data-integrity-validation',
      name: 'Data Integrity Validation',
      status: isValid ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      timestamp: new Date(),
      metadata: {
        patientCount: patients.length,
        encounterCount: encounters.length,
        diagnosisCount: diagnoses.length,
        issuesFound: issues.length
      },
      error: !isValid ? {
        message: `Found ${issues.length} data integrity issues`,
        details: { issues }
      } : undefined
    };
  }

  /**
   * Get applicable data for validation rules
   */
  private getApplicableData(data: Record<string, unknown[]>, applicableEntities: string[]): unknown[] {
    const result: unknown[] = [];
    
    for (const entityType of applicableEntities) {
      if (data[entityType]) {
        result.push(...data[entityType]);
      }
    }
    
    return result;
  }

  /**
   * Get validation rules by category
   */
  getValidationRulesByCategory(category: ValidationCategory): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(rule => rule.category === category);
  }

  /**
   * Get validation rules by entity type
   */
  getValidationRulesByEntity(entityType: string): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(
      rule => rule.applicableEntities.includes(entityType)
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Generate validation report
   */
  generateValidationReport(results: TestResult[]): {
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      successRate: number;
      totalDuration: number;
    };
    categoryBreakdown: Record<ValidationCategory, { passed: number; failed: number }>;
    criticalIssues: TestResult[];
    recommendations: string[];
  } {
    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      successRate: 0,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    };
    
    summary.successRate = summary.totalTests > 0 ? summary.passed / summary.totalTests : 0;

    const categoryBreakdown: Record<ValidationCategory, { passed: number; failed: number }> = {
      'business-rule': { passed: 0, failed: 0 },
      'data-integrity': { passed: 0, failed: 0 },
      'referential-integrity': { passed: 0, failed: 0 },
      'compliance': { passed: 0, failed: 0 },
      'clinical-safety': { passed: 0, failed: 0 },
      'data-quality': { passed: 0, failed: 0 }
    };

    for (const result of results) {
      const category = result.metadata?.category as ValidationCategory;
      if (category && categoryBreakdown[category]) {
        if (result.status === 'passed') {
          categoryBreakdown[category].passed++;
        } else {
          categoryBreakdown[category].failed++;
        }
      }
    }

    const criticalIssues = results.filter(r => 
      r.status === 'failed' && 
      (r.metadata?.severity === 'critical' || r.metadata?.category === 'clinical-safety')
    );

    const recommendations: string[] = [];
    if (summary.successRate < 0.95) {
      recommendations.push('Overall validation success rate is below 95% - review failed tests');
    }
    if (criticalIssues.length > 0) {
      recommendations.push(`${criticalIssues.length} critical issues found - address immediately`);
    }
    if (categoryBreakdown['clinical-safety'].failed > 0) {
      recommendations.push('Clinical safety violations detected - review before production deployment');
    }
    if (categoryBreakdown['compliance'].failed > 0) {
      recommendations.push('Compliance violations found - ensure regulatory requirements are met');
    }

    return {
      summary,
      categoryBreakdown,
      criticalIssues,
      recommendations
    };
  }
}