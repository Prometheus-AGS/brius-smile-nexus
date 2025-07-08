# Migration Implementation Plan

## Executive Summary

This document outlines the comprehensive migration strategy from the legacy Django ContentTypes-based orthodontic system to the finalized AI-ready Supabase architecture. The plan addresses all discovered architectural issues while maintaining legacy compatibility and enabling advanced AI capabilities through AWS Bedrock Titan v2 embeddings and Dify integration.

### Key Migration Objectives

1. **Data Integrity**: Preserve all critical business data with comprehensive validation
2. **Legacy Compatibility**: Maintain legacy_id mappings for parallel system operation
3. **ContentTypes Normalization**: Convert generic relationships to explicit foreign keys
4. **AI-Ready Architecture**: Enable post-migration embedding processing with AWS Bedrock Titan v2
5. **Zero Downtime**: Support incremental migration with rollback capabilities
6. **Data Quality**: Implement cleanup and validation during transformation

## Migration Strategy Overview

### Core Principles

- **Phased Approach**: Core data first, AI processing last
- **Legacy Preservation**: All legacy IDs maintained for backward compatibility
- **Data-Driven**: Based on actual legacy database analysis from `LEGACY_DATABASE_STRUCTURE.md`
- **Validation-First**: Comprehensive data quality checks at each phase
- **Rollback-Ready**: Complete rollback procedures for each phase

### Technology Stack

- **Migration Runtime**: Node.js with TypeScript
- **Legacy Database**: PostgreSQL connection via `pg` module
- **Target Database**: Supabase via `@supabase/supabase-js`
- **AI Processing**: AWS Bedrock Titan v2 (post-migration only)
- **Monitoring**: Structured logging and progress tracking
- **Error Handling**: Comprehensive error recovery and reporting

## Phase-by-Phase Implementation

### Phase 1: Core Data Migration (No Embeddings)

**Duration**: 2-4 hours depending on data volume
**Rollback Window**: 24 hours

#### 1.1 Foundation Setup
- Create Supabase schema with all tables and indexes
- Disable embedding triggers (enabled post-migration)
- Initialize migration tracking tables
- Validate legacy database connectivity

#### 1.2 Core Entity Migration
1. **Profiles Migration**
   - Migrate `auth_user` → `profiles` with profile type detection
   - Handle `dispatch_patient` → patient profiles with missing field defaults
   - Create doctor, technician, and other professional profiles
   - Preserve both `legacy_user_id` and `legacy_patient_id` mappings

2. **Offices Migration**
   - Migrate `dispatch_office` → `offices`
   - Preserve `legacy_office_id` mapping
   - Handle missing address/contact information with defaults

3. **Order Types Migration**
   - Migrate `dispatch_course` → `order_types`
   - Create standard order types (Main, Refinement, Replacement, Retainer, Emergency)
   - Preserve `legacy_course_id` mapping

#### 1.3 Data Quality Validation
- Verify all legacy IDs are preserved
- Check referential integrity
- Validate profile type assignments
- Generate migration report

### Phase 2: Relationship Migration

**Duration**: 1-2 hours
**Dependencies**: Phase 1 completion

#### 2.1 Complex Relationships
1. **Doctor-Office Relationships**
   - Create `doctor_offices` associations
   - Detect primary office relationships
   - Handle multi-office doctors

2. **Orders Migration**
   - Migrate `dispatch_instruction` → `orders`
   - Resolve patient/doctor/office relationships via legacy IDs
   - Handle missing order states with defaults
   - Preserve `legacy_instruction_id` mapping

#### 2.2 Project Management
1. **Projects Migration**
   - Migrate `dispatch_project` → `projects`
   - Handle file storage migration to Supabase Storage
   - Map project types and statuses
   - Preserve `legacy_project_id` and `legacy_uid` mappings

### Phase 3: Communication Normalization

**Duration**: 2-3 hours
**Dependencies**: Phase 2 completion

#### 3.1 ContentTypes Elimination
1. **Messages Migration**
   - Migrate `dispatch_record` → `messages`
   - **Critical**: Resolve ContentTypes generic relationships to explicit foreign keys
   - Map message types and categories
   - Handle attachments and metadata
   - Preserve `legacy_record_id` mapping

2. **Message Type Creation**
   - Create standard message types (General, Status Update, Question, Instruction, etc.)
   - Map legacy message patterns to new types

### Phase 4: Workflow Migration

**Duration**: 1-2 hours
**Dependencies**: Phase 3 completion

#### 4.1 State Management
1. **Order States Migration**
   - Migrate `dispatch_state` → `order_states` and `instruction_states`
   - Create standard workflow states
   - Preserve granular state history
   - Map status codes to new state system

2. **Workflow Templates**
   - Migrate `dispatch_template` → `workflow_templates` and `workflow_tasks`
   - Map task functions and durations
   - Handle predefined vs custom templates

#### 4.2 Audit Trail Preservation
- Migrate all state change history
- Preserve actor tracking and timestamps
- Create comprehensive audit trails

### Phase 5: AI Processing (Post-Migration)

**Duration**: 4-8 hours depending on data volume
**Dependencies**: Phases 1-4 completion and validation

#### 5.1 Embedding Generation
1. **AWS Bedrock Titan v2 Setup**
   - Configure AWS Bedrock Titan v2 model (1024 dimensions)
   - Initialize embedding processing queue
   - Enable embedding triggers

2. **Content Processing**
   - Generate embeddings for all profiles (medical history, treatment notes)
   - Process order descriptions and instructions
   - Create message content embeddings
   - Index project descriptions and metadata

#### 5.2 Dify Integration
1. **Knowledgebase Creation**
   - Create hybrid knowledgebases for each entity type
   - Configure Titan embeddings with Cohere reranking
   - Populate initial document sets

2. **Semantic Search Activation**
   - Enable semantic search functions
   - Test AI-powered queries
   - Validate embedding quality and relevance

## Data Transformation Requirements

### ContentTypes Normalization Strategy

The legacy system uses Django's ContentTypes framework for generic relationships. Our migration converts these to explicit foreign keys:

```sql
-- Legacy ContentTypes Pattern
dispatch_record (
  content_type_id → django_content_type.id,
  object_id → generic foreign key
)

-- New Explicit Relationships
messages (
  order_id → orders.id,
  project_id → projects.id,
  -- Explicit foreign keys instead of generic
)
```

### Profile Type Detection Logic

```typescript
function detectProfileType(user: LegacyUser, patient?: LegacyPatient): ProfileType {
  // Patient detection
  if (patient) return 'patient';
  
  // Professional type detection based on user groups, permissions, or related tables
  if (user.is_staff) return 'technician';
  if (user.is_superuser) return 'master';
  
  // Default fallback
  return 'client';
}
```

### Missing Field Handling

Based on `LEGACY_DATABASE_STRUCTURE.md` analysis, many expected fields don't exist:

```typescript
const DEFAULT_PATIENT_FIELDS = {
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  insurance_provider: '',
  insurance_id: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_history: '',
  allergies: '',
  medications: ''
};
```

## Risk Mitigation and Rollback Procedures

### Pre-Migration Validation
1. **Legacy Database Health Check**
   - Verify all expected tables exist
   - Check data integrity and relationships
   - Validate user-patient associations
   - Confirm project file accessibility

2. **Supabase Environment Preparation**
   - Create complete schema with all tables
   - Verify RLS policies are properly configured
   - Test connection and permissions
   - Prepare rollback scripts

### Migration Monitoring
1. **Real-Time Progress Tracking**
   - Entity-level progress reporting
   - Error rate monitoring
   - Performance metrics collection
   - Automatic failure detection

2. **Data Validation Checkpoints**
   - Record count verification at each phase
   - Referential integrity validation
   - Legacy ID mapping verification
   - Business logic validation

### Rollback Procedures

#### Phase 1-4 Rollback (Core Data)
```sql
-- Complete data rollback
TRUNCATE TABLE profiles, offices, orders, projects, messages CASCADE;
-- Reset sequences and constraints
-- Restore from backup if necessary
```

#### Phase 5 Rollback (AI Processing)
```sql
-- Disable embedding triggers
ALTER TABLE profiles DISABLE TRIGGER queue_profile_embeddings;
-- Clear embedding tables
TRUNCATE TABLE profile_embeddings, order_embeddings, message_embeddings CASCADE;
-- Reset embedding queue
TRUNCATE TABLE embedding_queue;
```

### Failure Recovery
1. **Automatic Retry Logic**
   - Exponential backoff for transient failures
   - Dead letter queue for persistent failures
   - Manual intervention triggers

2. **Data Consistency Checks**
   - Foreign key constraint validation
   - Orphaned record detection
   - Duplicate prevention

## AI Embedding Processing Plan (Post-Migration)

### AWS Bedrock Titan v2 Configuration

```typescript
const BEDROCK_CONFIG = {
  model: 'amazon.titan-embed-text-v2:0',
  dimensions: 1024,
  region: 'us-east-1',
  batchSize: 100,
  maxRetries: 3
};
```

### Content Processing Strategy

1. **Profile Embeddings**
   - Medical history and treatment notes
   - Professional credentials and specialties
   - Patient demographic summaries

2. **Order Embeddings**
   - Treatment descriptions and instructions
   - Progress notes and updates
   - Clinical observations

3. **Message Embeddings**
   - Communication content
   - Questions and responses
   - Status updates and notifications

4. **Project Embeddings**
   - 3D model descriptions
   - Technical specifications
   - Project metadata and notes

### Dify Knowledgebase Strategy

1. **Hybrid Knowledgebases**
   - Vector search with Titan embeddings
   - Full-text search for exact matches
   - Cohere reranking for relevance optimization

2. **Entity-Specific Knowledge Bases**
   - Patient profiles and medical history
   - Treatment protocols and procedures
   - Project documentation and specifications
   - Communication history and context

## Success Criteria and Validation

### Data Migration Success Metrics
- **100% Legacy ID Preservation**: All records maintain legacy mappings
- **Zero Data Loss**: All critical business data successfully migrated
- **Referential Integrity**: All foreign key relationships properly established
- **Performance Baseline**: Query performance meets or exceeds legacy system

### AI Processing Success Metrics
- **Embedding Coverage**: 95%+ of eligible content has embeddings
- **Search Relevance**: Semantic search returns contextually appropriate results
- **Dify Integration**: Knowledgebases successfully populated and queryable
- **Performance**: Embedding generation completes within target timeframes

### Business Continuity Validation
- **Legacy System Compatibility**: Legacy system can continue operating alongside new system
- **User Access**: All users can access their data in the new system
- **Workflow Continuity**: All business processes function correctly
- **Data Accuracy**: Spot checks confirm data accuracy and completeness

## Timeline and Resource Requirements

### Estimated Timeline
- **Phase 1 (Core Data)**: 2-4 hours
- **Phase 2 (Relationships)**: 1-2 hours  
- **Phase 3 (Communication)**: 2-3 hours
- **Phase 4 (Workflow)**: 1-2 hours
- **Phase 5 (AI Processing)**: 4-8 hours
- **Total**: 10-19 hours depending on data volume

### Resource Requirements
- **Development**: 1 senior TypeScript developer
- **Database**: PostgreSQL and Supabase access
- **AWS**: Bedrock Titan v2 access with appropriate quotas
- **Monitoring**: Logging and alerting infrastructure
- **Backup**: Full database backup capabilities

### Critical Dependencies
- Legacy database read access
- Supabase project with appropriate permissions
- AWS Bedrock access and quotas
- Dify API access and configuration
- File storage migration capabilities

## Conclusion

This migration implementation plan provides a comprehensive, phased approach to migrating from the legacy Django ContentTypes-based system to the AI-ready Supabase architecture. The plan prioritizes data integrity, maintains legacy compatibility, and enables advanced AI capabilities while providing robust rollback procedures and risk mitigation strategies.

The separation of core data migration (Phases 1-4) from AI processing (Phase 5) ensures that business-critical functionality is preserved even if AI features encounter issues. The comprehensive validation and monitoring approach ensures migration success while maintaining the ability to rollback if necessary.