# Healthcare Data Migration System - Error Handling and Troubleshooting

## Table of Contents

1. [Overview](#overview)
2. [Error Classification System](#error-classification-system)
3. [Common Errors and Resolutions](#common-errors-and-resolutions)
4. [Error Code Reference](#error-code-reference)
5. [Diagnostic Procedures](#diagnostic-procedures)
6. [Log Analysis and Debugging](#log-analysis-and-debugging)
7. [Emergency Procedures](#emergency-procedures)
8. [Escalation Procedures](#escalation-procedures)
9. [Performance Troubleshooting](#performance-troubleshooting)
10. [Data Quality Issues](#data-quality-issues)
11. [System Integration Issues](#system-integration-issues)
12. [Recovery Procedures](#recovery-procedures)

## Overview

This document provides comprehensive guidance for identifying, diagnosing, and resolving errors in the healthcare data migration system. It includes detailed troubleshooting procedures, error code references, and escalation protocols to ensure rapid resolution of issues while maintaining system integrity and compliance.

### Error Handling Philosophy

The migration system follows a multi-layered error handling approach:

1. **Prevention**: Proactive validation and configuration checks
2. **Detection**: Real-time error monitoring and alerting
3. **Containment**: Immediate error isolation and impact limitation
4. **Resolution**: Systematic troubleshooting and correction
5. **Recovery**: Safe system restoration and continuation
6. **Learning**: Error analysis and prevention improvement

### Support Levels

- **Level 1**: User self-service and basic troubleshooting
- **Level 2**: Technical support and system administration
- **Level 3**: Development team and advanced diagnostics
- **Level 4**: Vendor support and emergency escalation

## Error Classification System

### Error Severity Levels

#### 🔴 Critical (Severity 1)
- **Impact**: System down, data corruption, security breach
- **Response Time**: Immediate (< 15 minutes)
- **Escalation**: Automatic to Level 3
- **Examples**: Database corruption, authentication failure, data breach

#### 🟠 High (Severity 2)
- **Impact**: Major functionality impaired, significant performance degradation
- **Response Time**: 1 hour
- **Escalation**: Level 2 support
- **Examples**: Migration failure, connection timeouts, validation errors

#### 🟡 Medium (Severity 3)
- **Impact**: Minor functionality affected, workaround available
- **Response Time**: 4 hours
- **Escalation**: Level 1 support
- **Examples**: UI glitches, minor data inconsistencies, warning messages

#### 🟢 Low (Severity 4)
- **Impact**: Cosmetic issues, enhancement requests
- **Response Time**: 24 hours
- **Escalation**: Standard support queue
- **Examples**: Display issues, feature requests, documentation updates

### Error Categories

#### Connection Errors (CONN)
- Database connectivity issues
- Network timeouts and failures
- Authentication and authorization problems
- SSL/TLS certificate issues

#### Data Errors (DATA)
- Data validation failures
- Data type conversion errors
- Referential integrity violations
- Data quality issues

#### Transformation Errors (TRANS)
- Field mapping failures
- Code system translation errors
- Business rule violations
- Schema compatibility issues

#### System Errors (SYS)
- Application crashes and exceptions
- Resource exhaustion
- Configuration errors
- Performance degradation

#### User Errors (USER)
- Invalid user input
- Permission denied
- Workflow violations
- Interface errors

## Common Errors and Resolutions

### Connection Errors

#### CONN-001: Database Connection Timeout

**Symptoms:**
- Connection timeout messages in logs
- Unable to connect to source/target database
- Migration fails during initialization

**Diagnostic Steps:**
```bash
# Test network connectivity
ping database-server.com

# Test port connectivity
telnet database-server.com 5432

# Check DNS resolution
nslookup database-server.com

# Test database connection
psql -h database-server.com -U username -d database -c "SELECT 1;"
```

**Common Causes:**
1. Network connectivity issues
2. Firewall blocking connections
3. Database server overloaded
4. Incorrect connection parameters

**Resolution Steps:**
1. **Verify Network Connectivity**
   ```bash
   # Check network interface
   ip addr show
   
   # Check routing table
   ip route show
   
   # Test connectivity to database server
   traceroute database-server.com
   ```

2. **Check Firewall Settings**
   ```bash
   # Check local firewall rules
   sudo iptables -L
   
   # Check if port is open
   sudo netstat -tlnp | grep :5432
   ```

3. **Verify Database Server Status**
   ```sql
   -- Check database server status
   SELECT version();
   
   -- Check active connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check database locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

4. **Update Connection Configuration**
   ```typescript
   // Update connection timeout settings
   const connectionConfig = {
     host: 'database-server.com',
     port: 5432,
     database: 'healthcare_db',
     username: 'migration_user',
     password: process.env.DB_PASSWORD,
     connectionTimeoutMillis: 30000,
     idleTimeoutMillis: 10000,
     max: 20
   };
   ```

#### CONN-002: Authentication Failure

**Symptoms:**
- "Authentication failed" error messages
- "Password authentication failed" errors
- "User does not exist" errors

**Diagnostic Steps:**
```sql
-- Check user exists
SELECT usename FROM pg_user WHERE usename = 'migration_user';

-- Check user permissions
SELECT 
  r.rolname,
  r.rolsuper,
  r.rolinherit,
  r.rolcreaterole,
  r.rolcreatedb,
  r.rolcanlogin
FROM pg_roles r
WHERE r.rolname = 'migration_user';

-- Check database permissions
SELECT 
  datname,
  datacl
FROM pg_database
WHERE datname = 'healthcare_db';
```

**Resolution Steps:**
1. **Verify Credentials**
   - Check username and password
   - Verify account is not locked
   - Confirm password hasn't expired

2. **Check User Permissions**
   ```sql
   -- Grant necessary permissions
   GRANT CONNECT ON DATABASE healthcare_db TO migration_user;
   GRANT USAGE ON SCHEMA public TO migration_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO migration_user;
   ```

3. **Update Authentication Configuration**
   ```bash
   # Check pg_hba.conf for authentication rules
   sudo cat /etc/postgresql/13/main/pg_hba.conf
   
   # Add or modify authentication rule
   host healthcare_db migration_user 0.0.0.0/0 md5
   ```

#### CONN-003: SSL/TLS Certificate Issues

**Symptoms:**
- SSL certificate verification failures
- "Certificate has expired" errors
- "Hostname verification failed" errors

**Resolution Steps:**
1. **Check Certificate Validity**
   ```bash
   # Check certificate expiration
   openssl s_client -connect database-server.com:5432 -servername database-server.com
   
   # Verify certificate chain
   openssl verify -CAfile ca-certificate.crt server-certificate.crt
   ```

2. **Update SSL Configuration**
   ```typescript
   // Update SSL configuration
   const sslConfig = {
     rejectUnauthorized: true,
     ca: fs.readFileSync('ca-certificate.crt'),
     cert: fs.readFileSync('client-certificate.crt'),
     key: fs.readFileSync('client-key.key')
   };
   ```

### Data Errors

#### DATA-001: Data Validation Failure

**Symptoms:**
- "Validation failed" error messages
- Records rejected during processing
- Data quality warnings

**Diagnostic Steps:**
```sql
-- Check for null values in required fields
SELECT 
  table_name,
  column_name,
  COUNT(*) as null_count
FROM information_schema.columns c
LEFT JOIN (
  SELECT 
    'patients' as table_name,
    'patient_id' as column_name,
    COUNT(*) as null_count
  FROM patients
  WHERE patient_id IS NULL
) n ON c.table_name = n.table_name AND c.column_name = n.column_name
WHERE c.is_nullable = 'NO';

-- Check data type mismatches
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

**Resolution Steps:**
1. **Identify Validation Rules**
   ```typescript
   // Review validation configuration
   const validationRules = await validationEngine.getActiveRules();
   
   // Check specific rule that failed
   const failedRule = validationRules.find(rule => rule.id === 'PATIENT_ID_REQUIRED');
   ```

2. **Analyze Failed Records**
   ```sql
   -- Query failed records
   SELECT *
   FROM migration_errors
   WHERE error_type = 'VALIDATION_FAILURE'
   AND error_code = 'DATA-001'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Fix Data Quality Issues**
   ```sql
   -- Update null values with defaults
   UPDATE patients 
   SET patient_id = CONCAT('PAT_', LPAD(id::text, 8, '0'))
   WHERE patient_id IS NULL;
   
   -- Fix data type issues
   ALTER TABLE patients 
   ALTER COLUMN birth_date TYPE DATE 
   USING birth_date::DATE;
   ```

#### DATA-002: Referential Integrity Violation

**Symptoms:**
- Foreign key constraint violations
- "Referenced record does not exist" errors
- Orphaned records detected

**Diagnostic Steps:**
```sql
-- Check for orphaned records
SELECT p.*
FROM patient_visits p
LEFT JOIN patients pt ON p.patient_id = pt.patient_id
WHERE pt.patient_id IS NULL;

-- Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

**Resolution Steps:**
1. **Identify Missing References**
   ```sql
   -- Find missing parent records
   SELECT DISTINCT p.patient_id
   FROM patient_visits p
   WHERE p.patient_id NOT IN (SELECT patient_id FROM patients);
   ```

2. **Create Missing Parent Records**
   ```sql
   -- Insert missing patient records
   INSERT INTO patients (patient_id, first_name, last_name, created_at)
   SELECT DISTINCT 
     pv.patient_id,
     'Unknown',
     'Patient',
     NOW()
   FROM patient_visits pv
   WHERE pv.patient_id NOT IN (SELECT patient_id FROM patients);
   ```

3. **Update Referential Integrity**
   ```sql
   -- Temporarily disable foreign key checks (if necessary)
   SET foreign_key_checks = 0;
   
   -- Perform data corrections
   -- ... correction queries ...
   
   -- Re-enable foreign key checks
   SET foreign_key_checks = 1;
   ```

### Transformation Errors

#### TRANS-001: Field Mapping Failure

**Symptoms:**
- "Field mapping not found" errors
- Data transformation failures
- Incorrect data in target fields

**Diagnostic Steps:**
```typescript
// Check field mapping configuration
const fieldMappings = await fieldMappingRegistry.getMappings('patients');

// Verify source field exists
const sourceSchema = await legacyDatabase.getTableSchema('legacy_patients');

// Check target field compatibility
const targetSchema = await supabaseClient.getTableSchema('patients');
```

**Resolution Steps:**
1. **Review Field Mappings**
   ```typescript
   // Update field mapping configuration
   await fieldMappingRegistry.updateMapping({
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
   });
   ```

2. **Test Field Transformations**
   ```typescript
   // Test transformation logic
   const testData = { pat_fname: '  john  ' };
   const result = await transformationPipeline.transform(testData, 'trim_uppercase');
   console.log(result); // Should output: 'JOHN'
   ```

#### TRANS-002: Code System Mapping Error

**Symptoms:**
- "Code system mapping not found" errors
- Invalid medical codes in target system
- Code translation failures

**Resolution Steps:**
1. **Check Code System Mappings**
   ```typescript
   // Review code system mappings
   const codeMappings = await codeSystemMappers.getMappings('ICD10');
   
   // Add missing code mappings
   await codeSystemMappers.addMapping({
     sourceSystem: 'ICD9',
     targetSystem: 'ICD10',
     sourceCode: '250.00',
     targetCode: 'E11.9',
     description: 'Diabetes mellitus'
   });
   ```

2. **Validate Code Mappings**
   ```sql
   -- Check for unmapped codes
   SELECT DISTINCT diagnosis_code
   FROM legacy_diagnoses
   WHERE diagnosis_code NOT IN (
     SELECT source_code FROM code_mappings WHERE source_system = 'ICD9'
   );
   ```

### System Errors

#### SYS-001: Memory Exhaustion

**Symptoms:**
- "Out of memory" errors
- Application crashes
- Slow performance

**Diagnostic Steps:**
```bash
# Check memory usage
free -h

# Check process memory usage
ps aux --sort=-%mem | head -10

# Check swap usage
swapon --show

# Monitor memory usage in real-time
top -o %MEM
```

**Resolution Steps:**
1. **Optimize Memory Usage**
   ```typescript
   // Reduce batch size
   const migrationConfig = {
     batchSize: 1000, // Reduce from 5000
     maxConcurrency: 2, // Reduce from 5
     memoryLimit: '2GB'
   };
   
   // Implement memory monitoring
   const memoryUsage = process.memoryUsage();
   if (memoryUsage.heapUsed > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
     await migrationEngine.pauseMigration();
     global.gc(); // Force garbage collection
     await migrationEngine.resumeMigration();
   }
   ```

2. **Increase System Memory**
   ```bash
   # Add swap space (temporary solution)
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

#### SYS-002: Performance Degradation

**Symptoms:**
- Slow migration processing
- High CPU usage
- Database query timeouts

**Diagnostic Steps:**
```sql
-- Check slow queries
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check database locks
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Resolution Steps:**
1. **Optimize Database Performance**
   ```sql
   -- Update table statistics
   ANALYZE;
   
   -- Rebuild indexes
   REINDEX INDEX CONCURRENTLY idx_patients_patient_id;
   
   -- Optimize queries
   CREATE INDEX CONCURRENTLY idx_patients_created_at ON patients(created_at);
   ```

2. **Tune Migration Parameters**
   ```typescript
   // Optimize migration configuration
   const optimizedConfig = {
     batchSize: 2000,
     maxConcurrency: 3,
     queryTimeout: 60000,
     connectionPoolSize: 10,
     retryAttempts: 3,
     retryDelay: 5000
   };
   ```

## Error Code Reference

### Connection Error Codes

| Code | Description | Severity | Common Causes |
|------|-------------|----------|---------------|
| CONN-001 | Database Connection Timeout | High | Network issues, server overload |
| CONN-002 | Authentication Failure | High | Invalid credentials, permissions |
| CONN-003 | SSL Certificate Error | Medium | Expired/invalid certificates |
| CONN-004 | Network Unreachable | High | Network configuration, firewall |
| CONN-005 | Connection Pool Exhausted | Medium | High load, configuration |

### Data Error Codes

| Code | Description | Severity | Common Causes |
|------|-------------|----------|---------------|
| DATA-001 | Data Validation Failure | Medium | Invalid data, missing fields |
| DATA-002 | Referential Integrity Violation | High | Missing parent records |
| DATA-003 | Data Type Conversion Error | Medium | Incompatible data types |
| DATA-004 | Duplicate Key Violation | Medium | Duplicate records |
| DATA-005 | Data Quality Issue | Low | Inconsistent data formats |

### Transformation Error Codes

| Code | Description | Severity | Common Causes |
|------|-------------|----------|---------------|
| TRANS-001 | Field Mapping Failure | Medium | Missing/incorrect mappings |
| TRANS-002 | Code System Mapping Error | Medium | Unmapped medical codes |
| TRANS-003 | Business Rule Violation | Medium | Invalid business logic |
| TRANS-004 | Schema Compatibility Issue | High | Incompatible schemas |
| TRANS-005 | Transformation Logic Error | Medium | Faulty transformation rules |

### System Error Codes

| Code | Description | Severity | Common Causes |
|------|-------------|----------|---------------|
| SYS-001 | Memory Exhaustion | Critical | Insufficient memory |
| SYS-002 | Performance Degradation | Medium | Resource constraints |
| SYS-003 | Application Crash | Critical | Unhandled exceptions |
| SYS-004 | Configuration Error | High | Invalid configuration |
| SYS-005 | Resource Unavailable | High | System overload |

## Diagnostic Procedures

### System Health Check

**Procedure**: Comprehensive system health assessment

```bash
#!/bin/bash
# System Health Check Script

echo "=== System Health Check ==="
echo "Timestamp: $(date)"
echo

# Check system resources
echo "--- System Resources ---"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

echo "Memory Usage:"
free -h

echo "Disk Usage:"
df -h

echo "Network Connectivity:"
ping -c 3 google.com

# Check database connectivity
echo "--- Database Connectivity ---"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Database connection: OK"
else
    echo "Database connection: FAILED"
fi

# Check application status
echo "--- Application Status ---"
curl -f http://localhost:3000/health 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Application health: OK"
else
    echo "Application health: FAILED"
fi

# Check log files for errors
echo "--- Recent Errors ---"
tail -n 50 /var/log/migration/error.log | grep -i error | tail -n 10

echo "=== Health Check Complete ==="
```

### Performance Diagnostic

**Procedure**: Identify performance bottlenecks

```typescript
// Performance Diagnostic Tool
class PerformanceDiagnostic {
  async runDiagnostic(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: new Date(),
      systemMetrics: await this.getSystemMetrics(),
      databaseMetrics: await this.getDatabaseMetrics(),
      applicationMetrics: await this.getApplicationMetrics(),
      recommendations: []
    };

    // Analyze metrics and generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    return report;
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    return {
      cpuUsage: await this.getCpuUsage(),
      memoryUsage: await this.getMemoryUsage(),
      diskUsage: await this.getDiskUsage(),
      networkStats: await this.getNetworkStats()
    };
  }

  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const client = await this.getDatabaseClient();
    
    const slowQueries = await client.query(`
      SELECT query, mean_time, calls, total_time
      FROM pg_stat_statements
      ORDER BY mean_time DESC
      LIMIT 10
    `);

    const connectionStats = await client.query(`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `);

    return {
      slowQueries: slowQueries.rows,
      activeConnections: connectionStats.rows[0].active_connections,
      cacheHitRatio: await this.getCacheHitRatio()
    };
  }

  private generateRecommendations(report: DiagnosticReport): string[] {
    const recommendations: string[] = [];

    if (report.systemMetrics.cpuUsage > 80) {
      recommendations.push('High CPU usage detected. Consider reducing batch size or concurrency.');
    }

    if (report.systemMetrics.memoryUsage > 85) {
      recommendations.push('High memory usage detected. Consider increasing system memory or optimizing queries.');
    }

    if (report.databaseMetrics.cacheHitRatio < 95) {
      recommendations.push('Low database cache hit ratio. Consider increasing shared_buffers.');
    }

    return recommendations;
  }
}
```

## Log Analysis and Debugging

### Log File Locations

```bash
# Application logs
/var/log/migration/application.log
/var/log/migration/error.log
/var/log/migration/performance.log

# Database logs
/var/log/postgresql/postgresql-13-main.log

# System logs
/var/log/syslog
/var/log/auth.log
```

### Log Analysis Commands

```bash
# Search for errors in the last hour
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')" /var/log/migration/error.log

# Count error types
grep -o 'ERROR.*' /var/log/migration/error.log | sort | uniq -c | sort -nr

# Monitor logs in real-time
tail -f /var/log/migration/application.log

# Search for specific error codes
grep "CONN-001" /var/log/migration/error.log

# Analyze performance patterns
awk '/PERFORMANCE/ {print $1, $2, $NF}' /var/log/migration/performance.log | sort
```

### Debug Mode Activation

```typescript
// Enable debug logging
const migrationEngine = new MigrationEngine({
  logLevel: 'debug',
  enablePerformanceLogging: true,
  enableQueryLogging: true,
  debugMode: true
});

// Add custom debug logging
logger.debug('Migration batch processing', {
  batchId: batch.id,
  recordCount: batch.records.length,
  processingTime: Date.now() - startTime
});
```

## Emergency Procedures

### Emergency Response Checklist

#### Immediate Actions (0-15 minutes)

1. **Assess Situation**
   - Determine error severity
   - Identify affected systems
   - Estimate impact scope

2. **Contain Issue**
   ```typescript
   // Emergency stop migration
   await migrationEngine.emergencyStop();
   
   // Isolate affected systems
   await systemManager.isolateSystem('migration-worker-1');
   
   // Activate backup systems
   await systemManager.activateBackup();
   ```

3. **Notify Stakeholders**
   ```typescript
   // Send emergency notification
   await notificationService.sendEmergencyAlert({
     severity: 'critical',
     message: 'Migration system emergency stop activated',
     affectedSystems: ['migration-engine', 'database'],
     estimatedImpact: 'High',
     responseTeam: 'on-call-engineer'
   });
   ```

#### Short-term Actions (15-60 minutes)

1. **Investigate Root Cause**
   ```bash
   # Collect system information
   ./scripts/collect-diagnostic-info.sh
   
   # Analyze recent changes
   git log --since="2 hours ago" --oneline
   
   # Check system events
   journalctl --since="2 hours ago" --priority=err
   ```

2. **Implement Workaround**
   - Apply temporary fixes
   - Reroute traffic if necessary
   - Activate manual processes

3. **Monitor System Recovery**
   - Track error rates
   - Monitor performance metrics
   - Verify system stability

### Data Corruption Response

```typescript
// Data corruption detection and response
class DataCorruptionHandler {
  async detectCorruption(): Promise<CorruptionReport> {
    const report: CorruptionReport = {
      corruptedTables: [],
      affectedRecords: 0,
      integrityViolations: [],
      recommendedActions: []
    };

    // Check data integrity
    const integrityChecks = await this.runIntegrityChecks();
    report.integrityViolations = integrityChecks.violations;

    // Identify corrupted data
    const corruptionScan = await this.scanForCorruption();
    report.corruptedTables = corruptionScan.tables;
    report.affectedRecords = corruptionScan.recordCount;

    // Generate recovery recommendations
    report.recommendedActions = this.generateRecoveryPlan(report);

    return report;
  }

  async executeRecovery(plan: RecoveryPlan): Promise<void> {
    // Stop all migration activities
    await migrationEngine.emergencyStop();

    // Isolate corrupted data
    await this.isolateCorruptedData(plan.corruptedTables);

    // Restore from backup
    await this.restoreFromBackup(plan.backupTimestamp);

    // Verify data integrity
    const verificationResult = await this.verifyDataIntegrity();
    
    if (!verificationResult.isValid) {
      throw new Error('Data recovery failed verification');
    }

    // Resume operations
    await migrationEngine.resumeOperations();
  }
}
```

## Escalation Procedures

### Escalation Matrix

| Issue Type | Level 1 | Level 2 | Level 3 | Level 4 |
|------------|---------|---------|---------|---------|
| Connection Issues | User Support | System Admin | Network Team | Vendor Support |
| Data Quality | Data Analyst | Database Admin | Development Team | Business SME |
| Performance | System Admin | Database Admin | Development Team | Infrastructure Team |
| Security | Security Team | CISO | Legal Team | External Auditor |
| Compliance | Compliance Officer | Legal Team | Executive Team | Regulatory Body |

### Escalation Triggers

#### Automatic Escalation
- Critical errors (Severity 1)
- System downtime > 30 minutes
- Data corruption detected
- Security breach indicators
- Compliance violations

#### Manual Escalation
- Unable to resolve within SLA
- Requires specialized expertise
- Business impact assessment needed
- Stakeholder decision required

### Escalation Communication Template

```
ESCALATION NOTICE

Incident ID: [INC-YYYYMMDD-NNNN]
Escalation Level: [1/2/3/4]
Severity: [Critical/High/Medium/Low]
System: Healthcare Data Migration System

Issue Summary:
[Brief description of the issue]

Business Impact:
[Description of business impact]

Actions Taken:
- [Action 1]
- [Action 2]
- [Action 3]

Current Status:
[Current status and next steps]

Escalation Reason:
[Why escalation is needed]

Required Expertise:
[Specific skills or knowledge needed]

Timeline:
- Issue Detected: [Timestamp]
- Initial Response: [Timestamp]
- Escalation Time: [Timestamp]
- Expected Resolution: [Timestamp]

Contact Information:
- Primary Contact: [Name/Phone/Email]
- Backup Contact: [Name/Phone/Email]
- On-Call Manager: [Name/Phone/Email]

Additional Information:
[Any additional relevant information]
```

## Performance Troubleshooting

### Performance Monitoring

```typescript
// Performance monitoring implementation
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    throughput: 0,
    latency: 0,
    errorRate: 0,
    resourceUtilization: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    }
  };

  async startMonitoring(): Promise<void> {
    setInterval(async () => {
      await this.collectMetrics();
      await this.analyzePerformance();
      await this.checkThresholds();
    }, 30000); // Every 30 seconds
  }

  private async collectMetrics(): Promise<void> {
    this.metrics.throughput = await this.calculateThroughput();
    this.metrics.latency = await this.calculateLatency();
    this.metrics.errorRate = await this.calculateErrorRate();
    this.metrics.resourceUtilization = await this.getResourceUtilization();
  }

  private async analyzePerformance(): Promise<void> {
    // Detect performance degradation
    if (this.metrics.throughput < this.baselineThroughput * 0.7) {
      await this.triggerPerformanceAlert('Throughput degradation detected');
    }

    if (this.metrics.latency > this.baselineLatency * 1.5) {
      await this.triggerPerformanceAlert('High latency detected');
    }

    if (this.metrics.errorRate > 0.05) { // 5% error rate
      await this.triggerPerformanceAlert('High error rate detected');
    }
  }

  private async checkThresholds(): Promise<void> {
    const thresholds = {
      cpu: 80,
      memory: 85,
      disk: 90,
      network: 75
    };

    Object.entries(thresholds).forEach(([resource, threshold]) => {
      if (this.metrics.resourceUtilization[resource] > threshold) {
        this.triggerResourceAlert(resource, this.metrics.resourceUtilization[resource]);
      }
    });
  }
}
```

### Performance Optimization

```sql
-- Database performance optimization queries

-- Identify slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  