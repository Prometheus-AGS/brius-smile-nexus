/**
 * Mock Data Generator
 * Generates realistic test data for all entity types with healthcare-specific patterns
 */

import { MockDataConfig, MockDataGenerator, TestDataSet, TestDataMetadata } from '../../types/testing';

// Data constants for realistic generation
const MALE_FIRST_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher'];
const FEMALE_FIRST_NAMES = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const MEDICAL_SPECIALTIES = [
  'Internal Medicine', 'Family Medicine', 'Cardiology', 'Dermatology', 'Emergency Medicine',
  'Gastroenterology', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry',
  'Radiology', 'Surgery', 'Urology', 'Anesthesiology'
];

const DEPARTMENTS = [
  'Emergency Department', 'Internal Medicine', 'Surgery', 'Pediatrics', 'Cardiology',
  'Neurology', 'Orthopedics', 'Radiology', 'Laboratory', 'Pharmacy'
];

const ENCOUNTER_TYPES = [
  'Office Visit', 'Emergency Visit', 'Inpatient', 'Outpatient', 'Consultation',
  'Follow-up', 'Annual Physical', 'Urgent Care', 'Telemedicine'
];

const CHIEF_COMPLAINTS = [
  'Chest pain', 'Shortness of breath', 'Abdominal pain', 'Headache', 'Fever',
  'Cough', 'Back pain', 'Fatigue', 'Dizziness', 'Nausea'
];

const DIAGNOSIS_DESCRIPTIONS = [
  'Essential hypertension', 'Type 2 diabetes mellitus', 'Acute upper respiratory infection',
  'Gastroesophageal reflux disease', 'Osteoarthritis', 'Depression', 'Anxiety disorder',
  'Chronic kidney disease', 'Hyperlipidemia', 'Asthma'
];

const PROCEDURE_DESCRIPTIONS = [
  'Colonoscopy', 'Endoscopy', 'Cardiac catheterization', 'Appendectomy',
  'Cholecystectomy', 'Knee arthroscopy', 'Cataract surgery', 'Skin biopsy',
  'CT scan', 'MRI scan'
];

const COMPLICATIONS = [
  'Bleeding', 'Infection', 'Allergic reaction', 'Respiratory distress',
  'Cardiac arrhythmia', 'Hypotension', 'Wound dehiscence'
];

interface MedicationInfo {
  name: string;
  generic: string;
  dosage: string;
}

const MEDICATIONS: MedicationInfo[] = [
  { name: 'Lisinopril', generic: 'lisinopril', dosage: '10mg' },
  { name: 'Metformin', generic: 'metformin', dosage: '500mg' },
  { name: 'Atorvastatin', generic: 'atorvastatin', dosage: '20mg' },
  { name: 'Amlodipine', generic: 'amlodipine', dosage: '5mg' },
  { name: 'Omeprazole', generic: 'omeprazole', dosage: '20mg' }
];

interface LabTestInfo {
  name: string;
  code: string;
  referenceRange: string;
  units: string;
}

const LAB_TESTS: LabTestInfo[] = [
  { name: 'Glucose', code: 'GLU', referenceRange: '70-100', units: 'mg/dL' },
  { name: 'Hemoglobin', code: 'HGB', referenceRange: '12-16', units: 'g/dL' },
  { name: 'White Blood Cell Count', code: 'WBC', referenceRange: '4-11', units: 'K/uL' },
  { name: 'Cholesterol', code: 'CHOL', referenceRange: '<200', units: 'mg/dL' },
  { name: 'Creatinine', code: 'CREAT', referenceRange: '0.6-1.2', units: 'mg/dL' }
];

interface ImagingStudyInfo {
  type: string;
  bodyPart: string;
  modality: string;
}

const IMAGING_STUDIES: ImagingStudyInfo[] = [
  { type: 'Chest X-ray', bodyPart: 'Chest', modality: 'XR' },
  { type: 'CT Head', bodyPart: 'Head', modality: 'CT' },
  { type: 'MRI Brain', bodyPart: 'Brain', modality: 'MR' },
  { type: 'Ultrasound Abdomen', bodyPart: 'Abdomen', modality: 'US' },
  { type: 'Mammography', bodyPart: 'Breast', modality: 'MG' }
];

const INSURANCE_PLANS = [
  'Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare',
  'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid'
];

const APPOINTMENT_TYPES = [
  'New Patient', 'Follow-up', 'Annual Physical', 'Consultation',
  'Procedure', 'Lab Work', 'Imaging', 'Vaccination'
];

const APPOINTMENT_REASONS = [
  'Routine checkup', 'Follow-up care', 'New symptoms', 'Medication review',
  'Test results', 'Preventive care', 'Chronic disease management'
];

const STREET_NAMES = [
  'Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Park',
  'Hill', 'First', 'Second', 'Third', 'Fourth', 'Fifth'
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Ct'];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose'
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export class HealthcareMockDataGenerator implements MockDataGenerator {
  private static instance: HealthcareMockDataGenerator;
  private seedValue: number = Date.now();

  private constructor() {}

  public static getInstance(): HealthcareMockDataGenerator {
    if (!HealthcareMockDataGenerator.instance) {
      HealthcareMockDataGenerator.instance = new HealthcareMockDataGenerator();
    }
    return HealthcareMockDataGenerator.instance;
  }

  /**
   * Generates an array of mock data based on configuration
   */
  async generate<T>(config: MockDataConfig): Promise<T[]> {
    this.setSeed(config.seed);
    
    const generator = this.getGeneratorForEntity(config.entityType);
    const data: T[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const item = await generator(config) as T;
      data.push(config.anonymize ? this.anonymize(item) : item);
    }
    
    if (config.includeEdgeCases) {
      const edgeCases = await this.generateEdgeCases<T>(config.entityType);
      data.push(...edgeCases);
    }
    
    return data;
  }

  /**
   * Generates a single mock data item
   */
  async generateSingle<T>(config: Omit<MockDataConfig, 'count'>): Promise<T> {
    const fullConfig: MockDataConfig = { ...config, count: 1 };
    const result = await this.generate<T>(fullConfig);
    return result[0];
  }

  /**
   * Generates edge case data for testing boundary conditions
   */
  async generateEdgeCases<T>(entityType: string): Promise<T[]> {
    const generator = this.getEdgeCaseGenerator(entityType);
    return generator() as Promise<T[]>;
  }

  /**
   * Anonymizes sensitive data fields
   */
  anonymize<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const anonymized = { ...data } as Record<string, unknown>;
    const sensitiveFields = [
      'firstName', 'lastName', 'fullName', 'name',
      'ssn', 'socialSecurityNumber', 'social_security_number',
      'email', 'phone', 'phoneNumber', 'phone_number',
      'address', 'street', 'city', 'zipCode', 'zip_code',
      'creditCard', 'credit_card', 'bankAccount', 'bank_account'
    ];

    for (const field of sensitiveFields) {
      if (field in anonymized) {
        anonymized[field] = this.generateAnonymizedValue(field, anonymized[field]);
      }
    }

    return anonymized as T;
  }

  /**
   * Creates a complete test dataset with metadata
   */
  async createTestDataSet<T>(
    name: string,
    description: string,
    config: MockDataConfig
  ): Promise<TestDataSet<T>> {
    const data = await this.generate<T>(config);
    const metadata: TestDataMetadata = {
      createdAt: new Date(),
      size: data.length,
      checksum: this.calculateChecksum(data),
      schema: config.entityType,
      tags: ['mock', 'test', config.entityType],
      anonymized: config.anonymize,
    };

    return {
      id: this.generateId(),
      name,
      description,
      entityType: config.entityType,
      data,
      metadata,
    };
  }

  /**
   * Gets the appropriate generator function for an entity type
   */
  private getGeneratorForEntity(entityType: string): (config: MockDataConfig) => unknown {
    const generators: Record<string, (config: MockDataConfig) => unknown> = {
      patient: this.generatePatient.bind(this),
      provider: this.generateProvider.bind(this),
      encounter: this.generateEncounter.bind(this),
      diagnosis: this.generateDiagnosis.bind(this),
      procedure: this.generateProcedure.bind(this),
      medication: this.generateMedication.bind(this),
      laboratory: this.generateLaboratory.bind(this),
      imaging: this.generateImaging.bind(this),
      insurance: this.generateInsurance.bind(this),
      appointment: this.generateAppointment.bind(this),
    };

    return generators[entityType] || this.generateGenericEntity.bind(this);
  }

  /**
   * Gets edge case generator for entity type
   */
  private getEdgeCaseGenerator(entityType: string): () => Promise<unknown[]> {
    const generators: Record<string, () => Promise<unknown[]>> = {
      patient: this.generatePatientEdgeCases.bind(this),
      provider: this.generateProviderEdgeCases.bind(this),
      encounter: this.generateEncounterEdgeCases.bind(this),
      diagnosis: this.generateDiagnosisEdgeCases.bind(this),
      procedure: this.generateProcedureEdgeCases.bind(this),
      medication: this.generateMedicationEdgeCases.bind(this),
      laboratory: this.generateLaboratoryEdgeCases.bind(this),
      imaging: this.generateImagingEdgeCases.bind(this),
    };

    return generators[entityType] || this.generateGenericEdgeCases.bind(this);
  }

  /**
   * Patient data generator
   */
  private generatePatient(config: MockDataConfig): unknown {
    const gender = this.randomChoice(['M', 'F', 'O']);
    const firstName = this.randomChoice(
      gender === 'M' ? MALE_FIRST_NAMES : 
      gender === 'F' ? FEMALE_FIRST_NAMES : 
      [...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES]
    );
    const lastName = this.randomChoice(LAST_NAMES);
    const birthDate = this.randomDate(new Date('1920-01-01'), new Date('2020-12-31'));
    
    return {
      patientId: this.generatePatientId(),
      mrn: this.generateMRN(),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      dateOfBirth: birthDate.toISOString().split('T')[0],
      gender,
      ssn: this.generateSSN(),
      phone: this.generatePhoneNumber(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      address: this.generateAddress(),
      emergencyContact: this.generateEmergencyContact(),
      insuranceInfo: this.generateInsuranceInfo(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Provider data generator
   */
  private generateProvider(config: MockDataConfig): unknown {
    const firstName = this.randomChoice([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES]);
    const lastName = this.randomChoice(LAST_NAMES);
    const specialty = this.randomChoice(MEDICAL_SPECIALTIES);
    
    return {
      providerId: this.generateProviderId(),
      npi: this.generateNPI(),
      firstName,
      lastName,
      fullName: `Dr. ${firstName} ${lastName}`,
      specialty,
      department: this.randomChoice(DEPARTMENTS),
      credentials: this.randomChoice(['MD', 'DO', 'NP', 'PA', 'RN']),
      licenseNumber: this.generateLicenseNumber(),
      phone: this.generatePhoneNumber(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hospital.com`,
      isActive: this.randomBoolean(0.9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Encounter data generator
   */
  private generateEncounter(config: MockDataConfig): unknown {
    const encounterDate = this.randomDate(new Date('2020-01-01'), new Date());
    const encounterType = this.randomChoice(ENCOUNTER_TYPES);
    
    return {
      encounterId: this.generateEncounterId(),
      patientId: this.generatePatientId(),
      providerId: this.generateProviderId(),
      encounterDate: encounterDate.toISOString(),
      encounterType,
      status: this.randomChoice(['scheduled', 'in-progress', 'completed', 'cancelled']),
      chiefComplaint: this.randomChoice(CHIEF_COMPLAINTS),
      diagnosis: this.generateICD10Code(),
      procedures: this.generateArray(() => this.generateCPTCode(), this.randomInt(0, 3)),
      notes: this.generateClinicalNotes(),
      duration: this.randomInt(15, 120), // minutes
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Diagnosis data generator
   */
  private generateDiagnosis(config: MockDataConfig): unknown {
    return {
      diagnosisId: this.generateId(),
      patientId: this.generatePatientId(),
      encounterId: this.generateEncounterId(),
      icd10Code: this.generateICD10Code(),
      description: this.randomChoice(DIAGNOSIS_DESCRIPTIONS),
      type: this.randomChoice(['primary', 'secondary', 'admitting']),
      onsetDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString().split('T')[0],
      status: this.randomChoice(['active', 'resolved', 'inactive']),
      severity: this.randomChoice(['mild', 'moderate', 'severe']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Procedure data generator
   */
  private generateProcedure(config: MockDataConfig): unknown {
    return {
      procedureId: this.generateId(),
      patientId: this.generatePatientId(),
      encounterId: this.generateEncounterId(),
      providerId: this.generateProviderId(),
      cptCode: this.generateCPTCode(),
      description: this.randomChoice(PROCEDURE_DESCRIPTIONS),
      procedureDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      status: this.randomChoice(['scheduled', 'in-progress', 'completed', 'cancelled']),
      location: this.randomChoice(['OR1', 'OR2', 'Procedure Room A', 'Outpatient']),
      duration: this.randomInt(30, 240), // minutes
      complications: this.randomBoolean(0.1) ? this.randomChoice(COMPLICATIONS) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Medication data generator
   */
  private generateMedication(config: MockDataConfig): unknown {
    const medication = this.randomChoice(MEDICATIONS);
    
    return {
      medicationId: this.generateId(),
      patientId: this.generatePatientId(),
      encounterId: this.generateEncounterId(),
      providerId: this.generateProviderId(),
      medicationName: medication.name,
      genericName: medication.generic,
      dosage: medication.dosage,
      frequency: this.randomChoice(['once daily', 'twice daily', 'three times daily', 'as needed']),
      route: this.randomChoice(['oral', 'IV', 'IM', 'topical', 'inhalation']),
      startDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString().split('T')[0],
      endDate: this.randomBoolean(0.7) ? this.randomDate(new Date(), new Date('2025-12-31')).toISOString().split('T')[0] : null,
      status: this.randomChoice(['active', 'discontinued', 'completed']),
      prescribedBy: this.generateProviderId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Laboratory data generator
   */
  private generateLaboratory(config: MockDataConfig): unknown {
    const labTest = this.randomChoice(LAB_TESTS);
    
    return {
      labId: this.generateId(),
      patientId: this.generatePatientId(),
      encounterId: this.generateEncounterId(),
      providerId: this.generateProviderId(),
      testName: labTest.name,
      testCode: labTest.code,
      orderDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      collectionDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      resultDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      result: this.generateLabResult(labTest),
      referenceRange: labTest.referenceRange,
      units: labTest.units,
      status: this.randomChoice(['pending', 'completed', 'cancelled']),
      abnormalFlag: this.randomChoice(['normal', 'high', 'low', 'critical']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Imaging data generator
   */
  private generateImaging(config: MockDataConfig): unknown {
    const imagingStudy = this.randomChoice(IMAGING_STUDIES);
    
    return {
      imagingId: this.generateId(),
      patientId: this.generatePatientId(),
      encounterId: this.generateEncounterId(),
      providerId: this.generateProviderId(),
      studyType: imagingStudy.type,
      bodyPart: imagingStudy.bodyPart,
      orderDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      studyDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      modality: imagingStudy.modality,
      findings: this.generateImagingFindings(),
      impression: this.generateImagingImpression(),
      status: this.randomChoice(['scheduled', 'in-progress', 'completed', 'cancelled']),
      radiologist: this.generateProviderId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Insurance data generator
   */
  private generateInsurance(config: MockDataConfig): unknown {
    return {
      insuranceId: this.generateId(),
      patientId: this.generatePatientId(),
      planName: this.randomChoice(INSURANCE_PLANS),
      policyNumber: this.generatePolicyNumber(),
      groupNumber: this.generateGroupNumber(),
      subscriberId: this.generateSubscriberId(),
      relationship: this.randomChoice(['self', 'spouse', 'child', 'other']),
      effectiveDate: this.randomDate(new Date('2020-01-01'), new Date()).toISOString().split('T')[0],
      terminationDate: this.randomBoolean(0.2) ? this.randomDate(new Date(), new Date('2025-12-31')).toISOString().split('T')[0] : null,
      copay: this.randomInt(10, 50),
      deductible: this.randomInt(500, 5000),
      isActive: this.randomBoolean(0.9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Appointment data generator
   */
  private generateAppointment(config: MockDataConfig): unknown {
    const appointmentDate = this.randomDate(new Date(), new Date('2025-12-31'));
    
    return {
      appointmentId: this.generateId(),
      patientId: this.generatePatientId(),
      providerId: this.generateProviderId(),
      appointmentDate: appointmentDate.toISOString(),
      duration: this.randomInt(15, 60), // minutes
      type: this.randomChoice(APPOINTMENT_TYPES),
      status: this.randomChoice(['scheduled', 'confirmed', 'cancelled', 'no-show', 'completed']),
      reason: this.randomChoice(APPOINTMENT_REASONS),
      location: this.randomChoice(['Room 101', 'Room 102', 'Clinic A', 'Clinic B']),
      notes: this.randomBoolean(0.3) ? this.generateAppointmentNotes() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Generic entity generator for unknown types
   */
  private generateGenericEntity(config: MockDataConfig): unknown {
    return {
      id: this.generateId(),
      name: `Test ${config.entityType} ${this.randomInt(1, 1000)}`,
      description: `Generated test data for ${config.entityType}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config.customFields,
    };
  }

  /**
   * Edge case generators
   */
  private async generatePatientEdgeCases(): Promise<unknown[]> {
    return [
      // Very old patient
      {
        patientId: this.generatePatientId(),
        mrn: this.generateMRN(),
        firstName: 'Centenarian',
        lastName: 'Patient',
        dateOfBirth: '1920-01-01',
        gender: 'F',
        age: 104,
      },
      // Newborn patient
      {
        patientId: this.generatePatientId(),
        mrn: this.generateMRN(),
        firstName: 'Newborn',
        lastName: 'Patient',
        dateOfBirth: new Date().toISOString().split('T')[0],
        gender: 'M',
        age: 0,
      },
      // Patient with special characters in name
      {
        patientId: this.generatePatientId(),
        mrn: this.generateMRN(),
        firstName: "Mary-Jane O'Connor",
        lastName: 'Smith-Jones',
        dateOfBirth: '1990-01-01',
        gender: 'F',
      },
      // Patient with minimal data
      {
        patientId: this.generatePatientId(),
        mrn: this.generateMRN(),
        firstName: 'Unknown',
        lastName: 'Patient',
        dateOfBirth: null,
        gender: 'O',
      },
    ];
  }

  private async generateProviderEdgeCases(): Promise<unknown[]> {
    return [
      // Provider with very long name
      {
        providerId: this.generateProviderId(),
        firstName: 'VeryLongFirstNameThatExceedsNormalLimits',
        lastName: 'VeryLongLastNameThatExceedsNormalLimits',
        specialty: 'Internal Medicine',
      },
      // Inactive provider
      {
        providerId: this.generateProviderId(),
        firstName: 'Inactive',
        lastName: 'Provider',
        specialty: 'Emergency Medicine',
        isActive: false,
      },
    ];
  }

  private async generateEncounterEdgeCases(): Promise<unknown[]> {
    return [
      // Very long encounter
      {
        encounterId: this.generateEncounterId(),
        duration: 480, // 8 hours
        encounterType: 'Emergency',
        status: 'completed',
      },
      // Very short encounter
      {
        encounterId: this.generateEncounterId(),
        duration: 5, // 5 minutes
        encounterType: 'Quick Consultation',
        status: 'completed',
      },
    ];
  }

  private async generateDiagnosisEdgeCases(): Promise<unknown[]> {
    return [
      // Multiple diagnoses
      {
        diagnosisId: this.generateId(),
        icd10Code: 'Z00.00',
        description: 'Encounter for general adult medical examination without abnormal findings',
        type: 'primary',
      },
    ];
  }

  private async generateProcedureEdgeCases(): Promise<unknown[]> {
    return [
      // Emergency procedure
      {
        procedureId: this.generateId(),
        cptCode: '99291',
        description: 'Critical care, evaluation and management',
        status: 'emergency',
      },
    ];
  }

  private async generateMedicationEdgeCases(): Promise<unknown[]> {
    return [
      // High-risk medication
      {
        medicationId: this.generateId(),
        medicationName: 'Warfarin',
        dosage: '5mg',
        frequency: 'once daily',
        riskLevel: 'high',
      },
    ];
  }

  private async generateLaboratoryEdgeCases(): Promise<unknown[]> {
    return [
      // Critical lab result
      {
        labId: this.generateId(),
        testName: 'Glucose',
        result: '400',
        abnormalFlag: 'critical',
        units: 'mg/dL',
      },
    ];
  }

  private async generateImagingEdgeCases(): Promise<unknown[]> {
    return [
      // Urgent imaging study
      {
        imagingId: this.generateId(),
        studyType: 'CT Head',
        priority: 'STAT',
        findings: 'Acute findings requiring immediate attention',
      },
    ];
  }

  private async generateGenericEdgeCases(): Promise<unknown[]> {
    return [
      {
        id: this.generateId(),
        name: 'Edge Case Entity',
        description: 'Generic edge case for testing',
      },
    ];
  }

  /**
   * Utility methods for data generation
   */
  private setSeed(seed?: number): void {
    if (seed !== undefined) {
      this.seedValue = seed;
    }
  }

  private random(): number {
    // Simple seeded random number generator
    this.seedValue = (this.seedValue * 9301 + 49297) % 233280;
    return this.seedValue / 233280;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  private randomBoolean(probability = 0.5): boolean {
    return this.random() < probability;
  }

  private randomDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + this.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  private generateArray<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, generator);
  }

  private generateId(): string {
    return `${Date.now()}-${this.randomInt(1000, 9999)}`;
  }

  private generatePatientId(): string {
    return `PAT-${this.randomInt(10000000, 99999999)}-${this.generateAlphaNumeric(4)}`;
  }

  private generateProviderId(): string {
    return `PRV-${this.randomInt(10000, 99999)}`;
  }

  private generateEncounterId(): string {
    return `ENC-${this.randomInt(100000, 999999)}`;
  }

  private generateMRN(): string {
    return this.randomInt(1000000, 9999999).toString();
  }

  private generateNPI(): string {
    return this.randomInt(1000000000, 9999999999).toString();
  }

  private generateSSN(): string {
    return `${this.randomInt(100, 999)}-${this.randomInt(10, 99)}-${this.randomInt(1000, 9999)}`;
  }

  private generatePhoneNumber(): string {
    return `(${this.randomInt(200, 999)}) ${this.randomInt(200, 999)}-${this.randomInt(1000, 9999)}`;
  }

  private generateICD10Code(): string {
    const letter = String.fromCharCode(65 + this.randomInt(0, 25)); // A-Z
    const numbers = this.randomInt(10, 99);
    const decimal = this.randomBoolean(0.7) ? `.${this.randomInt(0, 9)}` : '';
    return `${letter}${numbers}${decimal}`;
  }

  private generateCPTCode(): string {
    return this.randomInt(10000, 99999).toString();
  }

  private generateLicenseNumber(): string {
    return `LIC-${this.randomInt(100000, 999999)}`;
  }

  private generatePolicyNumber(): string {
    return `POL-${this.generateAlphaNumeric(8)}`;
  }

  private generateGroupNumber(): string {
    return `GRP-${this.randomInt(10000, 99999)}`;
  }

  private generateSubscriberId(): string {
    return this.generateAlphaNumeric(12);
  }

  private generateAlphaNumeric(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(this.randomInt(0, chars.length - 1));
    }
    return result;
  }

  private generateAddress(): Record<string, string> {
    return {
      street: `${this.randomInt(1, 9999)} ${this.randomChoice(STREET_NAMES)} ${this.randomChoice(STREET_TYPES)}`,
      city: this.randomChoice(CITIES),
      state: this.randomChoice(STATES),
      zipCode: this.randomInt(10000, 99999).toString(),
    };
  }

  private generateEmergencyContact(): Record<string, string> {
    return {
      name: `${this.randomChoice([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES])} ${this.randomChoice(LAST_NAMES)}`,
      relationship: this.randomChoice(['spouse', 'parent', 'sibling', 'child', 'friend']),
      phone: this.generatePhoneNumber(),
    };
  }

  private generateInsuranceInfo(): Record<string, unknown> {
    return {
      planName: this.randomChoice(INSURANCE_PLANS),
      policyNumber: this.generatePolicyNumber(),
      groupNumber: this.generateGroupNumber(),
    };
  }

  private generateClinicalNotes(): string {
    const templates = [
      'Patient presents with chief complaint of {complaint}. Physical examination reveals {findings}. Plan: {plan}.',
      'Follow-up visit for {condition}. Patient reports {status}. Continue current treatment plan.',
      'Routine examination. No acute concerns. Patient counseled on {topic}.',
    ];
    
    const template = this.randomChoice(templates);
    return template
      .replace('{complaint}', this.randomChoice(CHIEF_COMPLAINTS))
      .replace('{findings}', this.randomChoice(['normal findings', 'mild abnormalities', 'significant findings']))
      .replace('{plan}', this.randomChoice(['continue current medications', 'order additional tests', 'refer to specialist']))
      .replace('{condition}', this.randomChoice(['hypertension', 'diabetes', 'arthritis']))
      .replace('{status}', this.randomChoice(['improvement', 'stable condition', 'worsening symptoms']))
      .replace('{topic}', this.randomChoice(['diet and exercise', 'medication compliance', 'lifestyle modifications']));
  }

  private generateLabResult(labTest: { name: string; referenceRange: string; units: string }): string {
    // Generate realistic lab results based on test type
    const testResultMap: Record<string, () => string> = {
      'Glucose': () => this.randomInt(70, 200).toString(),
      'Hemoglobin': () => (this.random() * 5 + 10).toFixed(1),
      'White Blood Cell Count': () => (this.random() * 10 + 4).toFixed(1),
      'Cholesterol': () => this.randomInt(150, 300).toString(),
    };
    
    const generator = testResultMap[labTest.name];
    return generator ? generator() : this.randomInt(1, 100).toString();
  }

  private generateImagingFindings(): string {
    return this.randomChoice([
      'No acute findings',
      'Mild degenerative changes',
      'Normal study',
      'Incidental findings noted',
      'Abnormal findings requiring follow-up',
    ]);
  }

  private generateImagingImpression(): string {
    return this.randomChoice([
      'Normal examination',
      'Mild abnormalities, clinical correlation recommended',
      'Significant findings, recommend follow-up',
      'Stable compared to prior study',
    ]);
  }

  private generateAppointmentNotes(): string {
    return this.randomChoice([
      'Patient confirmed appointment',
      'Reminder call completed',
      'Patient requested reschedule',
      'Insurance verification needed',
    ]);
  }

  private generateAnonymizedValue(field: string, originalValue: unknown): string {
    const anonymizationMap: Record<string, () => string> = {
      firstName: () => 'FirstName',
      lastName: () => 'LastName',
      fullName: () => 'Full Name',
      name: () => 'Name',
      ssn: () => 'XXX-XX-XXXX',
      email: () => 'user@example.com',
      phone: () => '(XXX) XXX-XXXX',
      address: () => 'XXXX Street Address',
      street: () => 'XXXX Street',
      city: () => 'City',
      zipCode: () => 'XXXXX',
    };
    
    const generator = anonymizationMap[field];
    return generator ? generator() : '[REDACTED]';
  }

  private calculateChecksum(data: unknown[]): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance
export const mockDataGenerator = HealthcareMockDataGenerator.getInstance();
export default HealthcareMockDataGenerator;