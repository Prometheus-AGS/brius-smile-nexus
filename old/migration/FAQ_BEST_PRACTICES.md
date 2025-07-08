# Healthcare Data Migration System - FAQ and Best Practices

## Table of Contents

1. [Frequently Asked Questions](#frequently-asked-questions)
2. [Migration Best Practices](#migration-best-practices)
3. [Performance Optimization](#performance-optimization)
4. [Security Best Practices](#security-best-practices)
5. [Data Quality Best Practices](#data-quality-best-practices)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Healthcare Compliance Guidelines](#healthcare-compliance-guidelines)
8. [Integration Best Practices](#integration-best-practices)
9. [Monitoring and Alerting](#monitoring-and-alerting)
10. [Disaster Recovery Planning](#disaster-recovery-planning)
11. [Team Training and Knowledge Transfer](#team-training-and-knowledge-transfer)
12. [Continuous Improvement](#continuous-improvement)

## Frequently Asked Questions

### General Questions

#### Q: What types of healthcare data can be migrated using this system?

**A:** The migration system supports a wide range of healthcare data types including:

- **Patient Demographics**: Names, addresses, contact information, insurance details
- **Clinical Data**: Diagnoses, procedures, medications, allergies, vital signs
- **Administrative Data**: Appointments, billing information, provider details
- **Laboratory Results**: Test results, reference ranges, specimen information
- **Imaging Data**: DICOM metadata, study information, report data
- **Documentation**: Clinical notes, discharge summaries, care plans

The system is designed to handle HL7 FHIR, HL7 v2, CDA, and custom healthcare data formats.

#### Q: How long does a typical migration take?

**A:** Migration duration depends on several factors:

- **Data Volume**: 
  - Small practice (< 10,000 patients): 2-4 weeks
  - Medium practice (10,000-100,000 patients): 4-8 weeks
  - Large health system (> 100,000 patients): 8-16 weeks

- **Data Complexity**: Complex transformations and validations add time
- **System Integration**: Legacy system connectivity affects timeline
- **Testing Requirements**: Thorough testing is essential for healthcare data

**Typical Timeline Breakdown:**
- Planning and Setup: 20%
- Data Extraction and Transformation: 40%
- Validation and Testing: 25%
- Go-Live and Support: 15%

#### Q: What are the system requirements for running the migration?

**A:** Minimum requirements vary by deployment size:

**Small Deployment (< 10,000 patients):**
- 4 CPU cores, 16GB RAM, 500GB storage
- PostgreSQL 13+, Redis 6+, Node.js 18+

**Medium Deployment (10,000-100,000 patients):**
- 8 CPU cores, 32GB RAM, 2TB storage
- Load balancer, database clustering recommended

**Large Deployment (> 100,000 patients):**
- 16+ CPU cores, 64GB+ RAM, 10TB+ storage
- Kubernetes cluster, distributed architecture required

See the [System Requirements and Setup](SYSTEM_REQUIREMENTS_SETUP.md) guide for detailed specifications.

#### Q: Is the system HIPAA compliant?

**A:** Yes, the system is designed with HIPAA compliance as a core requirement:

- **Encryption**: All data encrypted at rest and in transit (AES-256)
- **Access Controls**: Role-based access with multi-factor authentication
- **Audit Logging**: Comprehensive audit trails for all data access
- **Data Minimization**: Only necessary data is processed and stored
- **Business Associate Agreements**: Required for all third-party services

Regular compliance audits and penetration testing ensure ongoing compliance.

#### Q: Can the system handle real-time data synchronization?

**A:** Yes, the system supports multiple synchronization modes:

- **Batch Migration**: Full data migration in scheduled batches
- **Real-time Sync**: Continuous synchronization using CDC (Change Data Capture)
- **Hybrid Mode**: Initial batch migration followed by real-time updates
- **On-Demand Sync**: Manual synchronization triggers

Real-time synchronization requires proper database triggers and network connectivity.

### Technical Questions

#### Q: What databases are supported as source systems?

**A:** The system supports major healthcare databases:

**Relational Databases:**
- Microsoft SQL Server (2012+)
- Oracle Database (11g+)
- MySQL/MariaDB (5.7+)
- PostgreSQL (10+)

**Healthcare-Specific Systems:**
- Epic (via Chronicles database)
- Cerner (via Millennium database)
- AllScripts
- eClinicalWorks
- NextGen

**File-Based Sources:**
- HL7 v2 messages
- HL7 FHIR resources
- CSV/Excel files
- XML/JSON exports

#### Q: How are data transformations configured?

**A:** Data transformations are configured through multiple methods:

**1. Configuration Files:**
```typescript
// Field mapping configuration
const fieldMappings = {
  sourceTable: 'legacy_patients',
  targetTable: 'patients',
  mappings: [
    {
      sourceField: 'pat_id',
      targetField: 'patient_id',
      transformation: 'direct'
    },
    {
      sourceField: 'pat_fname',
      targetField: 'first_name',
      transformation: 'trim_uppercase'
    }
  ]
};
```

**2. Web Interface:**
- Drag-and-drop field mapping
- Visual transformation builder
- Real-time preview of transformations

**3. API Configuration:**
```typescript
await transformationPipeline.addRule({
  id: 'patient-name-transform',
  sourceField: 'full_name',
  targetField: ['first_name', 'last_name'],
  transformation: 'split_name'
});
```

#### Q: How is data validation performed?

**A:** The system implements multi-layer validation:

**1. Schema Validation:**
- Data type checking
- Required field validation
- Format validation (dates, phone numbers, etc.)

**2. Business Rule Validation:**
- Medical code validation (ICD-10, CPT, SNOMED)
- Referential integrity checks
- Clinical logic validation

**3. Custom Validation:**
```typescript
// Custom validation rule
const customValidator = {
  name: 'age_consistency',
  validate: (patient) => {
    const birthDate = new Date(patient.birth_date);
    const age = calculateAge(birthDate);
    return age >= 0 && age <= 150;
  },
  errorMessage: 'Patient age must be between 0 and 150'
};
```

#### Q: How are errors handled during migration?

**A:** The system provides comprehensive error handling:

**Error Classification:**
- **Critical Errors**: Stop migration immediately
- **Data Errors**: Skip record, log for review
- **Warning Errors**: Process with notification

**Error Recovery:**
- Automatic retry with exponential backoff
- Manual error resolution interface
- Bulk error correction tools

**Error Reporting:**
- Real-time error dashboards
- Detailed error logs with context
- Error trend analysis and reporting

### Security Questions

#### Q: How is sensitive data protected during migration?

**A:** Multiple security layers protect sensitive data:

**Encryption:**
- AES-256 encryption for data at rest
- TLS 1.3 for data in transit
- Field-level encryption for PII/PHI

**Access Controls:**
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Just-in-time access provisioning

**Data Masking:**
- Automatic PII/PHI detection
- Configurable masking rules
- Test data generation for non-production

**Audit Logging:**
- Complete audit trail of all access
- Immutable log storage
- Real-time security monitoring

#### Q: What authentication methods are supported?

**A:** The system supports multiple authentication methods:

**Primary Authentication:**
- Username/password with complexity requirements
- Single Sign-On (SSO) via SAML 2.0/OAuth 2.0
- Active Directory/LDAP integration

**Multi-Factor Authentication:**
- SMS/Email verification codes
- TOTP authenticator apps (Google Authenticator, Authy)
- Hardware security keys (FIDO2/WebAuthn)
- Biometric authentication (where supported)

**Session Management:**
- Configurable session timeouts
- Concurrent session limits
- Automatic session termination

## Migration Best Practices

### Planning and Preparation

#### 1. Comprehensive Data Assessment

**Inventory Source Systems:**
```bash
# Data discovery script
#!/bin/bash

echo "=== Healthcare Data Migration Assessment ==="

# Identify source databases
echo "Source Databases:"
echo "- Primary EHR System: [System Name]"
echo "- Laboratory System: [System Name]"
echo "- Imaging System: [System Name]"
echo "- Billing System: [System Name]"

# Assess data volume
echo "Data Volume Assessment:"
echo "- Total Patients: $(sql_query 'SELECT COUNT(*) FROM patients')"
echo "- Total Encounters: $(sql_query 'SELECT COUNT(*) FROM encounters')"
echo "- Total Documents: $(sql_query 'SELECT COUNT(*) FROM documents')"

# Identify data quality issues
echo "Data Quality Issues:"
echo "- Duplicate Patients: $(sql_query 'SELECT COUNT(*) FROM duplicate_patients')"
echo "- Missing Required Fields: $(sql_query 'SELECT COUNT(*) FROM validation_errors')"
echo "- Invalid Codes: $(sql_query 'SELECT COUNT(*) FROM invalid_codes')"
```

**Create Data Mapping Matrix:**
| Source System | Source Table | Source Field | Target Table | Target Field | Transformation | Validation |
|---------------|--------------|--------------|--------------|--------------|----------------|------------|
| Legacy EHR | PATIENTS | PAT_ID | patients | patient_id | Direct | Required |
| Legacy EHR | PATIENTS | PAT_FNAME | patients | first_name | Trim, Title Case | Required |
| Legacy EHR | PATIENTS | PAT_DOB | patients | birth_date | Date Format | Date Range |

#### 2. Risk Assessment and Mitigation

**Identify Migration Risks:**
- Data loss or corruption
- System downtime during migration
- Compliance violations
- Performance degradation
- Integration failures

**Mitigation Strategies:**
```typescript
// Risk mitigation configuration
const migrationRisks = {
  dataLoss: {
    probability: 'low',
    impact: 'critical',
    mitigation: [
      'Complete data backup before migration',
      'Incremental backup during migration',
      'Data validation at each step',
      'Rollback procedures documented'
    ]
  },
  systemDowntime: {
    probability: 'medium',
    impact: 'high',
    mitigation: [
      'Phased migration approach',
      'Parallel system operation',
      'Maintenance window scheduling',
      'Rapid rollback capability'
    ]
  }
};
```

#### 3. Testing Strategy

**Multi-Phase Testing Approach:**

**Phase 1: Unit Testing**
```typescript
// Example unit test for data transformation
describe('Patient Data Transformation', () => {
  test('should transform legacy patient data correctly', () => {
    const legacyData = {
      PAT_ID: '12345',
      PAT_FNAME: '  john  ',
      PAT_LNAME: 'DOE',
      PAT_DOB: '19900115'
    };

    const result = transformPatientData(legacyData);

    expect(result).toEqual({
      patient_id: '12345',
      first_name: 'John',
      last_name: 'Doe',
      birth_date: '1990-01-15'
    });
  });
});
```

**Phase 2: Integration Testing**
- End-to-end data flow testing
- System integration validation
- Performance testing under load

**Phase 3: User Acceptance Testing**
- Clinical workflow validation
- User interface testing
- Business process verification

### Data Migration Execution

#### 1. Phased Migration Approach

**Phase 1: Reference Data**
- Medical codes (ICD-10, CPT, SNOMED)
- Provider information
- Location and facility data
- Insurance plans and payers

**Phase 2: Patient Demographics**
- Patient registration data
- Contact information
- Insurance information
- Emergency contacts

**Phase 3: Clinical Data**
- Medical history
- Diagnoses and procedures
- Medications and allergies
- Laboratory results

**Phase 4: Administrative Data**
- Appointments and scheduling
- Billing and claims data
- Financial information

#### 2. Data Validation Checkpoints

**Pre-Migration Validation:**
```sql
-- Validate source data completeness
SELECT 
  table_name,
  column_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN column_value IS NULL THEN 1 END) as null_count,
  ROUND(COUNT(CASE WHEN column_value IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM information_schema.columns
WHERE table_schema = 'legacy_schema'
GROUP BY table_name, column_name
HAVING null_percentage > 5;
```

**Post-Migration Validation:**
```sql
-- Validate migration completeness
SELECT 
  'patients' as table_name,
  source_count,
  target_count,
  CASE 
    WHEN source_count = target_count THEN 'PASS'
    ELSE 'FAIL'
  END as validation_status
FROM (
  SELECT 
    (SELECT COUNT(*) FROM legacy.patients) as source_count,
    (SELECT COUNT(*) FROM public.patients) as target_count
) counts;
```

#### 3. Performance Optimization

**Batch Size Optimization:**
```typescript
// Dynamic batch size adjustment
class BatchSizeOptimizer {
  private currentBatchSize = 1000;
  private performanceHistory: number[] = [];

  adjustBatchSize(processingTime: number, errorRate: number): number {
    this.performanceHistory.push(processingTime);
    
    // Increase batch size if performance is good
    if (processingTime < 30000 && errorRate < 0.01) {
      this.currentBatchSize = Math.min(this.currentBatchSize * 1.2, 10000);
    }
    
    // Decrease batch size if performance is poor
    if (processingTime > 60000 || errorRate > 0.05) {
      this.currentBatchSize = Math.max(this.currentBatchSize * 0.8, 100);
    }
    
    return Math.floor(this.currentBatchSize);
  }
}
```

**Parallel Processing:**
```typescript
// Parallel migration processing
async function processMigrationBatches(batches: DataBatch[]): Promise<void> {
  const concurrency = Math.min(batches.length, 5); // Max 5 concurrent batches
  const semaphore = new Semaphore(concurrency);
  
  const promises = batches.map(async (batch) => {
    await semaphore.acquire();
    try {
      await processBatch(batch);
    } finally {
      semaphore.release();
    }
  });
  
  await Promise.all(promises);
}
```

## Performance Optimization

### Database Performance

#### 1. Index Optimization

**Pre-Migration Index Creation:**
```sql
-- Create indexes for migration performance
CREATE INDEX CONCURRENTLY idx_legacy_patients_id ON legacy_patients(patient_id);
CREATE INDEX CONCURRENTLY idx_legacy_patients_modified ON legacy_patients(last_modified);
CREATE INDEX CONCURRENTLY idx_legacy_encounters_patient ON legacy_encounters(patient_id);
CREATE INDEX CONCURRENTLY idx_legacy_encounters_date ON legacy_encounters(encounter_date);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_patients_org_status ON patients(organization_id, status) 
WHERE status = 'active';
```

**Post-Migration Index Optimization:**
```sql
-- Analyze table statistics
ANALYZE patients;
ANALYZE encounters;
ANALYZE diagnoses;

-- Identify unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;
```

#### 2. Query Optimization

**Efficient Data Extraction:**
```sql
-- Use cursor-based pagination for large datasets
DECLARE patient_cursor CURSOR FOR
SELECT patient_id, first_name, last_name, birth_date
FROM legacy_patients
WHERE last_modified >= :last_sync_time
ORDER BY patient_id;

-- Batch processing with LIMIT and OFFSET
SELECT *
FROM legacy_patients
ORDER BY patient_id
LIMIT 1000 OFFSET :offset;
```

**Optimized Transformation Queries:**
```sql
-- Use CTEs for complex transformations
WITH patient_data AS (
  SELECT 
    patient_id,
    TRIM(UPPER(first_name)) as first_name,
    TRIM(UPPER(last_name)) as last_name,
    TO_DATE(birth_date, 'YYYYMMDD') as birth_date
  FROM legacy_patients
),
validated_data AS (
  SELECT *
  FROM patient_data
  WHERE birth_date IS NOT NULL
    AND first_name IS NOT NULL
    AND last_name IS NOT NULL
)
INSERT INTO patients (patient_id, first_name, last_name, birth_date)
SELECT * FROM validated_data;
```

### Application Performance

#### 1. Memory Management

**Memory Pool Configuration:**
```typescript
// Configure memory pools for large datasets
const memoryConfig = {
  maxOldSpaceSize: 4096, // 4GB heap
  maxSemiSpaceSize: 256, // 256MB young generation
  gcInterval: 300000, // Force GC every 5 minutes
  memoryThreshold: 0.8 // Trigger cleanup at 80% usage
};

// Memory monitoring
class MemoryMonitor {
  private checkInterval: NodeJS.Timeout;

  start(): void {
    this.checkInterval = setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      
      if (heapUsedMB / heapTotalMB > memoryConfig.memoryThreshold) {
        this.triggerCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  private triggerCleanup(): void {
    // Clear caches
    transformationCache.clear();
    validationCache.clear();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}
```

#### 2. Caching Strategy

**Multi-Level Caching:**
```typescript
// Implement tiered caching
class TieredCache {
  private l1Cache = new Map<string, any>(); // In-memory cache
  private l2Cache: Redis; // Redis cache
  private l3Cache: Database; // Database cache

  async get<T>(key: string): Promise<T | null> {
    // Check L1 cache first
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // Check L2 cache
    const l2Value = await this.l2Cache.get(key);
    if (l2Value) {
      this.l1Cache.set(key, l2Value);
      return JSON.parse(l2Value);
    }

    // Check L3 cache
    const l3Value = await this.l3Cache.getCachedValue(key);
    if (l3Value) {
      await this.l2Cache.setex(key, 3600, JSON.stringify(l3Value));
      this.l1Cache.set(key, l3Value);
      return l3Value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.l1Cache.set(key, value);
    await this.l2Cache.setex(key, ttl, JSON.stringify(value));
    await this.l3Cache.setCachedValue(key, value, ttl);
  }
}
```

**Cache Warming Strategy:**
```typescript
// Pre-populate caches with frequently accessed data
async function warmCaches(): Promise<void> {
  const commonQueries = [
    'SELECT * FROM medical_codes WHERE active = true',
    'SELECT * FROM providers WHERE status = "active"',
    'SELECT * FROM facilities ORDER BY name'
  ];

  for (const query of commonQueries) {
    const results = await database.query(query);
    const cacheKey = generateCacheKey(query);
    await cache.set(cacheKey, results, 7200); // 2 hour TTL
  }
}
```

## Security Best Practices

### Data Protection

#### 1. Encryption Standards

**Encryption at Rest:**
```typescript
// AES-256 encryption for sensitive fields
import crypto from 'crypto';

class FieldEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('healthcare-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('healthcare-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

**Encryption in Transit:**
```typescript
// TLS configuration for secure communication
const tlsConfig = {
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  honorCipherOrder: true,
  secureProtocol: 'TLSv1_3_method'
};
```

#### 2. Access Control Implementation

**Role-Based Access Control:**
```typescript
// RBAC implementation
interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

class AccessControl {
  private roles: Map<string, Role> = new Map();

  defineRole(role: Role): void {
    this.roles.set(role.name, role);
  }

  async checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context?: Record<string, any>
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    for (const roleName of userRoles) {
      const role = this.roles.get(roleName);
      if (!role) continue;

      const hasPermission = this.evaluateRolePermissions(
        role, 
        resource, 
        action, 
        context
      );
      
      if (hasPermission) return true;
    }

    return false;
  }

  private evaluateRolePermissions(
    role: Role, 
    resource: string, 
    action: string, 
    context?: Record<string, any>
  ): boolean {
    // Check direct permissions
    for (const permission of role.permissions) {
      if (permission.resource === resource && permission.action === action) {
        if (!permission.conditions) return true;
        
        // Evaluate conditions
        return this.evaluateConditions(permission.conditions, context);
      }
    }

    // Check inherited permissions
    if (role.inherits) {
      for (const inheritedRoleName of role.inherits) {
        const inheritedRole = this.roles.get(inheritedRoleName);
        if (inheritedRole) {
          const hasPermission = this.evaluateRolePermissions(
            inheritedRole, 
            resource, 
            action, 
            context
          );
          if (hasPermission) return true;
        }
      }
    }

    return false;
  }
}
```

#### 3. Audit Logging

**Comprehensive Audit Trail:**
```typescript
// Audit logging implementation
interface AuditEvent {
  eventId: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, any>;
  riskScore?: number;
}

class AuditLogger {
  private auditQueue: AuditEvent[] = [];
  private batchSize = 100;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    setInterval(() => this.flushAuditEvents(), this.flushInterval);
  }

  async logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };

    // Calculate risk score
    auditEvent.riskScore = this.calculateRiskScore(auditEvent);

    this.auditQueue.push(auditEvent);

    // Immediate flush for high-risk events
    if (auditEvent.riskScore > 8) {
      await this.flushAuditEvents();
    }

    // Flush when batch size reached
    if (this.auditQueue.length >= this.batchSize) {
      await this.flushAuditEvents();
    }
  }

  private calculateRiskScore(event: AuditEvent): number {
    let score = 0;

    // Failed actions increase risk
    if (!event.success) score += 3;

    // Administrative actions increase risk
    if (event.action.includes('delete') || event.action.includes('admin')) {
      score += 2;
    }

    // Off-hours access increases risk
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 22) score += 1;

    // Multiple failed attempts from same IP
    // (This would require checking recent events)

    return Math.min(score, 10);
  }

  private async flushAuditEvents(): Promise<void> {
    if (this.auditQueue.length === 0) return;

    const events = this.auditQueue.splice(0);
    
    try {
      await database.insertAuditEvents(events);
      
      // Send high-risk events to security monitoring
      const highRiskEvents = events.filter(e => e.riskScore > 7);
      if (highRiskEvents.length > 0) {
        await securityMonitoring.alertHighRiskEvents(highRiskEvents);
      }
    } catch (error) {
      // Re-queue events if database write fails
      this.auditQueue.unshift(...events);
      logger.error('Failed to flush audit events', error);
    }
  }
}
```

## Data Quality Best Practices

### Data Validation Framework

#### 1. Multi-Layer Validation

**Schema Validation:**
```typescript
// JSON Schema validation for healthcare data
const patientSchema = {
  type: 'object',
  required: ['patient_id', 'first_name', 'last_name', 'birth_date'],
  properties: {
    patient_id: {
      type: 'string',
      pattern: '^[A-Z0-9]{6,12}$'
    },
    first_name: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[A-Za-z\\s\\-\']+$'
    },
    last_name: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[A-Za-z\\s\\-\']+$'
    },
    birth_date: {
      type: 'string',
      format: 'date'
    },
    ssn: {
      type: 'string',
      pattern: '^\\d{3}-\\d{2}-\\d{4}$'
    },
    phone: {
      type: 'string',
      pattern: '^\\+?1?[2-9]\\d{2}[2-9]\\d{2}\\d{4}$'
    },
    email: {
      type: 'string',
      format: 'email'
    }
  },
  additionalProperties: false
};
```

**Business Rule Validation:**
```typescript
// Healthcare-specific business rules
class HealthcareValidator {
  async validatePatient(patient: Patient): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Age validation
    const age = this.calculateAge(patient.birth_date);
    if (age < 0 || age > 150) {
      errors.push({
        field: 'birth_date',
        message: 'Patient age must be between 0 and 150 years',
        code: 'INVALID_AGE'
      });
    }

    // Gender validation
    if (patient.gender && !['M', 'F', 'O', 'U'].includes(patient.gender)) {
      errors.push({
        field: 'gender',
        message: 'Gender must be M, F, O, or U',
        code: 'INVALID_GENDER'
      });
    }

    // Deceased date validation
    if (patient.deceased_date && patient.deceased_date < patient.birth_date) {
      errors.push({
        field: 'deceased_date',
        message: 'Deceased date cannot be before birth date',
        code: 'INVALID_DECEASED_DATE'
      });
    }

    // Insurance validation
    if (patient.insurance_number && !this.validateInsuranceNumber(patient.insurance_number)) {
      warnings.push({
        field: 'insurance_number',
        message: 'Insurance number format may be invalid',
        code: 'SUSPICIOUS_INSURANCE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private validateInsuranceNumber(insuranceNumber: string): boolean {
    // Implement insurance number validation logic
    // This would vary by insurance provider
    return /^[A-Z0-9]{8,15}$/.test(insuranceNumber);
  }
}
```

#### 2. Data Quality Metrics

**Quality Score Calculation:**
```typescript