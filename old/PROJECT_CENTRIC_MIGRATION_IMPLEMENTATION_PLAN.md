# Project-Centric Migration Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for refactoring the Healthcare Data Migration Tool from an incorrect "order-centric" model to the correct "project-centric" model. This plan is based on thorough analysis of the legacy database structure and represents a complete architectural pivot to ensure successful data migration.

## Background & Context

### The Critical Discovery
- **Original Assumption**: Migration centered around `dispatch_order` table
- **Reality**: `dispatch_order` table is empty and unused in legacy system
- **Root Cause**: Insufficient initial database analysis led to incorrect architectural assumptions
- **Impact**: Migration tool failing with SQL errors, complete workflow breakdown

### Corrected Understanding
The legacy system is built around three core entities:
1. **`dispatch_project`**: 3D modeling files and digital assets (the real "orders")
2. **`dispatch_state`**: Granular workflow state tracking with audit trail
3. **`dispatch_template`**: Workflow automation and standardized processes

## Implementation Phases

### Phase 1: Code Cleanup & Removal ⚡ HIGH PRIORITY
**Estimated Time**: 1 hour  
**Dependencies**: None  
**Risk Level**: Low

#### Tasks
- [ ] **Remove `extractOrders()` method** from `migration_tool/src/services/legacy-migration-data-extractor.ts`
- [ ] **Remove `transformOrder()` method** from `migration_tool/src/services/legacy-migration-data-transformer.ts`
- [ ] **Clean up order-related types** from `migration_tool/src/types/persistent-migration-types.ts`
- [ ] **Remove order references** from main orchestrator `migration_tool/src/index.ts`

#### Success Criteria
- [ ] No compilation errors after removal
- [ ] No references to "order" entities in codebase
- [ ] Clean slate for new project-centric implementation

---

### Phase 2: Target Schema Updates ⚡ HIGH PRIORITY
**Estimated Time**: 2 hours  
**Dependencies**: Phase 1 complete  
**Risk Level**: Medium

#### Database Schema Changes
Update `migration_tool/migrations/001_persistent_migration_schema.sql`:

```sql
-- Add Cases table (maps from legacy projects)
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_project_id INTEGER UNIQUE, -- For mapping dispatch_project.id
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL DEFAULT 'treatment_planning',
  priority priority_level DEFAULT 'medium',
  current_state case_state_enum NOT NULL DEFAULT 'submitted',
  workflow_template_id UUID REFERENCES workflow_templates(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, case_number)
);

-- Add Projects table (enhanced from legacy)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INTEGER UNIQUE, -- For mapping dispatch_project.id
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  project_type project_type_enum NOT NULL,
  status project_status_enum NOT NULL DEFAULT 'draft',
  file_size BIGINT DEFAULT 0,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'projects',
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  parent_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Case States audit trail
CREATE TABLE case_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_state case_state_enum,
  to_state case_state_enum NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Workflow Templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INTEGER UNIQUE, -- For mapping dispatch_template.id
  name TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Workflow Steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state case_state_enum NOT NULL,
  auto_transition BOOLEAN DEFAULT false,
  estimated_duration INTERVAL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(workflow_template_id, step_order)
);

-- Add required ENUMs
CREATE TYPE case_type_enum AS ENUM (
  'initial_consultation', 'treatment_planning', 'active_treatment', 
  'refinement', 'retention', 'emergency', 'follow_up'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE case_state_enum AS ENUM (
  'submitted', 'under_review', 'planning', 'approved', 'in_production',
  'quality_check', 'shipped', 'delivered', 'completed', 'on_hold', 'cancelled'
);

CREATE TYPE project_type_enum AS ENUM (
  'scan', 'model', 'simulation', 'treatment_plan', 'aligner_design',
  'impression', 'xray', 'photo', 'document', 'other'
);

CREATE TYPE project_status_enum AS ENUM (
  'draft', 'in_progress', 'review', 'approved', 'archived', 'deleted'
);
```

#### Success Criteria
- [ ] All new tables created successfully
- [ ] Foreign key relationships established
- [ ] ENUMs defined and functional
- [ ] Migration script runs without errors

---

### Phase 3: New Data Extraction Logic ⚡ HIGH PRIORITY
**Estimated Time**: 4 hours  
**Dependencies**: Phase 2 complete  
**Risk Level**: High

#### New Extraction Methods
Update `migration_tool/src/services/legacy-migration-data-extractor.ts`:

```typescript
/**
 * Extract projects from legacy dispatch_project table
 * Joins with auth_user to get creator information
 */
async extractProjects(): Promise<LegacyProject[]> {
  const query = `
    SELECT 
      p.id,
      p.uid,
      p.name,
      p.size,
      p.type,
      p.status,
      p.creator_id,
      p.created_at,
      p.public,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      u.email as creator_email
    FROM dispatch_project p
    LEFT JOIN auth_user u ON p.creator_id = u.id
    ORDER BY p.id
  `;
  
  const result = await this.legacyDb.query(query);
  return result.rows.map(row => ({
    id: row.id,
    uid: row.uid,
    name: row.name || `Project ${row.id}`,
    size: row.size || 0,
    type: row.type,
    status: row.status,
    creator_id: row.creator_id,
    created_at: row.created_at,
    is_public: row.public || false,
    creator: {
      first_name: row.creator_first_name,
      last_name: row.creator_last_name,
      email: row.creator_email
    }
  }));
}

/**
 * Extract workflow states from legacy dispatch_state table
 * Provides complete audit trail for state transitions
 */
async extractProjectStates(): Promise<LegacyState[]> {
  const query = `
    SELECT 
      s.id,
      s.status,
      s.on,
      s.changed_at,
      s.actor_id,
      s.instruction_id,
      u.first_name as actor_first_name,
      u.last_name as actor_last_name,
      u.email as actor_email
    FROM dispatch_state s
    LEFT JOIN auth_user u ON s.actor_id = u.id
    ORDER BY s.changed_at
  `;
  
  const result = await this.legacyDb.query(query);
  return result.rows.map(row => ({
    id: row.id,
    status: row.status,
    is_active: row.on,
    changed_at: row.changed_at,
    actor_id: row.actor_id,
    instruction_id: row.instruction_id,
    actor: {
      first_name: row.actor_first_name,
      last_name: row.actor_last_name,
      email: row.actor_email
    }
  }));
}

/**
 * Extract workflow templates from legacy dispatch_template table
 * Defines standardized processes and automation rules
 */
async extractWorkflowTemplates(): Promise<LegacyTemplate[]> {
  const query = `
    SELECT 
      t.id,
      t.task_name,
      t.function,
      t.predefined,
      t.status,
      t.action_name,
      t.text_name,
      t.duration,
      t.category_id,
      t.course_id
    FROM dispatch_template t
    ORDER BY t.id
  `;
  
  const result = await this.legacyDb.query(query);
  return result.rows.map(row => ({
    id: row.id,
    task_name: row.task_name,
    function_type: row.function,
    is_predefined: row.predefined || false,
    status: row.status,
    action_name: row.action_name,
    text_prompt: row.text_name,
    estimated_duration: row.duration,
    category_id: row.category_id,
    course_id: row.course_id
  }));
}
```

#### Error Handling Strategy
```typescript
// Implement graceful degradation for missing data
private handleMissingProjectData(project: LegacyProject): LegacyProject {
  return {
    ...project,
    name: project.name || `Untitled Project ${project.id}`,
    size: project.size || 0,
    type: project.type || 0, // Default to 'scan' type
    status: project.status || 0, // Default to 'draft' status
    creator: project.creator || {
      first_name: 'Unknown',
      last_name: 'User',
      email: 'unknown@system.local'
    }
  };
}
```

#### Success Criteria
- [ ] All extraction methods implemented and tested
- [ ] Proper error handling for missing/invalid data
- [ ] Batch processing for large datasets
- [ ] Progress tracking and logging

---

### Phase 4: Data Transformation Logic ⚡ HIGH PRIORITY
**Estimated Time**: 4 hours  
**Dependencies**: Phase 3 complete  
**Risk Level**: High

#### New Transformation Methods
Update `migration_tool/src/services/legacy-migration-data-transformer.ts`:

```typescript
/**
 * Transform legacy project into case and project entities
 * One legacy project becomes both a case and a project in new schema
 */
async transformProject(legacyProject: LegacyProject, patientId: string): Promise<{case: TargetCase, project: TargetProject}> {
  const caseId = uuidv4();
  const projectId = uuidv4();
  
  // Create case entity (business workflow container)
  const targetCase: TargetCase = {
    id: caseId,
    legacy_project_id: legacyProject.id,
    patient_id: patientId,
    case_number: `CASE-${legacyProject.id}`,
    title: legacyProject.name || `Case for Project ${legacyProject.id}`,
    description: `Migrated from legacy project ${legacyProject.id}`,
    case_type: this.mapProjectTypeToCase(legacyProject.type),
    priority: 'medium',
    current_state: 'submitted',
    metadata: {
      legacy_project_uid: legacyProject.uid,
      migration_date: new Date().toISOString(),
      original_type: legacyProject.type,
      original_status: legacyProject.status
    },
    created_at: legacyProject.created_at,
    updated_at: new Date()
  };
  
  // Create project entity (digital asset container)
  const targetProject: TargetProject = {
    id: projectId,
    legacy_id: legacyProject.id,
    case_id: caseId,
    creator_id: await this.mapUserId(legacyProject.creator_id),
    name: legacyProject.name || `Project ${legacyProject.id}`,
    project_type: this.mapProjectType(legacyProject.type),
    status: this.mapProjectStatus(legacyProject.status),
    file_size: legacyProject.size,
    storage_path: null, // Will be set during file migration
    storage_bucket: 'projects',
    is_public: legacyProject.is_public,
    metadata: {
      legacy_uid: legacyProject.uid,
      migration_date: new Date().toISOString()
    },
    version: 1,
    parent_project_id: null,
    created_at: legacyProject.created_at,
    updated_at: new Date()
  };
  
  return { case: targetCase, project: targetProject };
}

/**
 * Transform legacy state into case state audit entry
 */
async transformProjectState(legacyState: LegacyState, caseId: string): Promise<TargetCaseState> {
  return {
    id: uuidv4(),
    case_id: caseId,
    from_state: null, // Will be determined by previous state
    to_state: this.mapStatusToState(legacyState.status),
    changed_by: await this.mapUserId(legacyState.actor_id),
    reason: 'Legacy state migration',
    metadata: {
      legacy_state_id: legacyState.id,
      legacy_instruction_id: legacyState.instruction_id,
      was_active: legacyState.is_active,
      migration_date: new Date().toISOString()
    },
    created_at: legacyState.changed_at
  };
}

/**
 * Transform legacy template into workflow template and steps
 */
async transformWorkflowTemplate(legacyTemplate: LegacyTemplate): Promise<{template: TargetWorkflowTemplate, steps: TargetWorkflowStep[]}> {
  const templateId = uuidv4();
  
  const template: TargetWorkflowTemplate = {
    id: templateId,
    legacy_id: legacyTemplate.id,
    name: legacyTemplate.task_name || `Template ${legacyTemplate.id}`,
    description: legacyTemplate.text_prompt || 'Migrated from legacy template',
    case_type: this.mapTemplateToCase(legacyTemplate.function_type),
    active: true,
    metadata: {
      legacy_function: legacyTemplate.function_type,
      is_predefined: legacyTemplate.is_predefined,
      migration_date: new Date().toISOString()
    },
    created_at: new Date(),
    updated_at: new Date()
  };
  
  // Create workflow step from template
  const step: TargetWorkflowStep = {
    id: uuidv4(),
    workflow_template_id: templateId,
    step_order: 1,
    name: legacyTemplate.action_name || legacyTemplate.task_name,
    description: legacyTemplate.text_prompt,
    state: this.mapStatusToState(legacyTemplate.status),
    auto_transition: legacyTemplate.is_predefined,
    estimated_duration: legacyTemplate.estimated_duration ? 
      `${legacyTemplate.estimated_duration} hours` : null,
    metadata: {
      legacy_template_id: legacyTemplate.id,
      legacy_category_id: legacyTemplate.category_id,
      legacy_course_id: legacyTemplate.course_id
    }
  };
  
  return { template, steps: [step] };
}

// Mapping helper functions
private mapProjectType(legacyType: number): ProjectType {
  switch (legacyType) {
    case 0: return 'scan';
    case 3: return 'treatment_plan';
    default: return 'other';
  }
}

private mapProjectStatus(legacyStatus: number): ProjectStatus {
  switch (legacyStatus) {
    case 0: return 'draft';
    case 1: return 'in_progress';
    default: return 'draft';
  }
}

private mapStatusToState(legacyStatus: number): CaseState {
  switch (legacyStatus) {
    case 11: return 'under_review';
    case 1: return 'submitted';
    default: return 'submitted';
  }
}
```

#### Success Criteria
- [ ] All transformation methods implemented
- [ ] Proper mapping between legacy and target schemas
- [ ] Data validation and sanitization
- [ ] Comprehensive error handling

---

### Phase 5: Orchestration Updates 🔄 MEDIUM PRIORITY
**Estimated Time**: 2 hours  
**Dependencies**: Phase 4 complete  
**Risk Level**: Medium

#### Updated Migration Flow
Refactor `migration_tool/src/index.ts`:

```typescript
async run(): Promise<void> {
  try {
    this.logger.info('Starting Project-Centric Migration');
    
    // Phase 1: Extract Legacy Data
    this.logger.info('Phase 1: Extracting legacy data...');
    const patients = await this.extractor.extractPatients();
    const projects = await this.extractor.extractProjects();
    const states = await this.extractor.extractProjectStates();
    const templates = await this.extractor.extractWorkflowTemplates();
    
    this.logger.info(`Extracted: ${patients.length} patients, ${projects.length} projects, ${states.length} states, ${templates.length} templates`);
    
    // Phase 2: Transform Data
    this.logger.info('Phase 2: Transforming data...');
    const transformedPatients = await this.transformer.transformPatients(patients);
    
    // Transform projects to cases + projects
    const transformedCasesAndProjects = [];
    for (const project of projects) {
      const patientId = this.findPatientIdForProject(project, transformedPatients);
      const transformed = await this.transformer.transformProject(project, patientId);
      transformedCasesAndProjects.push(transformed);
    }
    
    // Transform states to case states
    const transformedStates = [];
    for (const state of states) {
      const caseId = this.findCaseIdForState(state, transformedCasesAndProjects);
      if (caseId) {
        const transformed = await this.transformer.transformProjectState(state, caseId);
        transformedStates.push(transformed);
      }
    }
    
    // Transform templates to workflows
    const transformedWorkflows = [];
    for (const template of templates) {
      const transformed = await this.transformer.transformWorkflowTemplate(template);
      transformedWorkflows.push(transformed);
    }
    
    // Phase 3: Load Data (maintain referential integrity)
    this.logger.info('Phase 3: Loading data into target database...');
    
    // Load patients first
    await this.loader.loadPatients(transformedPatients);
    
    // Load cases and projects
    for (const {case: targetCase, project} of transformedCasesAndProjects) {
      await this.loader.loadCase(targetCase);
      await this.loader.loadProject(project);
    }
    
    // Load workflow templates and steps
    for (const {template, steps} of transformedWorkflows) {
      await this.loader.loadWorkflowTemplate(template);
      for (const step of steps) {
        await this.loader.loadWorkflowStep(step);
      }
    }
    
    // Load case states (audit trail)
    await this.loader.loadCaseStates(transformedStates);
    
    // Phase 4: AI Enhancement
    this.logger.info('Phase 4: Generating AI embeddings...');
    await this.aiEmbeddingsService.generateEmbeddings();
    
    // Phase 5: Dify Integration
    this.logger.info('Phase 5: Populating Dify knowledge base...');
    await this.difyService.populateKnowledgeBase();
    
    this.logger.info('Project-Centric Migration completed successfully!');
    
  } catch (error) {
    this.logger.error('Migration failed:', error);
    throw error;
  }
}
```

#### Success Criteria
- [ ] Proper execution order maintained
- [ ] Referential integrity preserved
- [ ] Progress tracking and logging
- [ ] Error handling and rollback capability

---

### Phase 6: Testing & Validation 🧪 MEDIUM PRIORITY
**Estimated Time**: 3 hours  
**Dependencies**: Phase 5 complete  
**Risk Level**: Low

#### Unit Tests
```typescript
// Test extraction methods
describe('LegacyMigrationDataExtractor', () => {
  test('extractProjects returns valid project data', async () => {
    const projects = await extractor.extractProjects();
    expect(projects).toBeDefined();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toHaveProperty('id');
    expect(projects[0]).toHaveProperty('name');
  });
});

// Test transformation logic
describe('LegacyMigrationDataTransformer', () => {
  test('transformProject creates valid case and project', async () => {
    const legacyProject = mockLegacyProject();
    const result = await transformer.transformProject(legacyProject, 'patient-uuid');
    
    expect(result.case).toHaveProperty('id');
    expect(result.case.legacy_project_id).toBe(legacyProject.id);
    expect(result.project).toHaveProperty('id');
    expect(result.project.legacy_id).toBe(legacyProject.id);
  });
});
```

#### Integration Tests
```typescript
// Test full migration pipeline
describe('Migration Integration', () => {
  test('full migration pipeline completes successfully', async () => {
    const orchestrator = new MigrationOrchestrator();
    await expect(orchestrator.run()).resolves.not.toThrow();
    
    // Verify data integrity
    const cases = await targetDb.query('SELECT COUNT(*) FROM cases');
    const projects = await targetDb.query('SELECT COUNT(*) FROM projects');
    expect(cases.rows[0].count).toBeGreaterThan(0);
    expect(projects.rows[0].count).toBeGreaterThan(0);
  });
});
```

#### Data Validation Queries
```sql
-- Verify case-project relationships
SELECT 
  COUNT(*) as total_cases,
  COUNT(p.id) as cases_with_projects,
  COUNT(*) - COUNT(p.id) as orphaned_cases
FROM cases c
LEFT JOIN projects p ON c.id = p.case_id;

-- Verify state audit trail
SELECT 
  COUNT(*) as total_case_states,
  COUNT(DISTINCT case_id) as cases_with_states,
  MIN(created_at) as earliest_state,
  MAX(created_at) as latest_state
FROM case_states;

-- Verify workflow templates
SELECT 
  COUNT(*) as total_templates,
  COUNT(DISTINCT case_type) as case_types_covered,
  AVG(step_count.steps) as avg_steps_per_template
FROM workflow_templates wt
LEFT JOIN (
  SELECT workflow_template_id, COUNT(*) as steps
  FROM workflow_steps
  GROUP BY workflow_template_id
) step_count ON wt.id = step_count.workflow_template_id;
```

#### Success Criteria
- [ ] All unit tests pass
- [ ] Integration tests complete successfully
- [ ] Data validation queries show expected results
- [ ] Performance benchmarks met

---

## Risk Management

### High-Risk Areas
1. **Data Integrity**: Risk of data loss during transformation
2. **Performance**: Large dataset processing within memory constraints
3. **Referential Integrity**: Complex relationships between entities

### Mitigation Strategies
1. **Backup Strategy**: Full database snapshot before migration
2. **Batch Processing**: Process data in manageable chunks (100-500 records)
3. **Validation Checkpoints**: Verify data integrity at each phase
4. **Rollback Procedures**: Documented rollback for each phase

### Rollback Plan
```sql
-- Emergency rollback to pre-migration state
BEGIN;
  -- Remove migrated data in reverse dependency order
  DELETE FROM case_states WHERE created_at > '2025-01-02 00:00:00';
  DELETE FROM workflow_steps WHERE workflow_template_id IN (
    SELECT id FROM workflow_templates WHERE created_at > '2025-01-02 00:00:00'
  );
  DELETE FROM workflow_templates WHERE created_at > '2025-01-02 00:00:00';
  DELETE FROM projects WHERE created_at > '2025-01-02 00:00:00';
  DELETE FROM cases WHERE created_at > '2025-01-02 00:00:00';
COMMIT;
```

## Performance Targets

### Migration Performance
- **Total Migration Time**: < 2 hours for full dataset
- **Memory Usage**: < 2GB peak usage
- **Error Rate**: < 1% of total records
- **Data Integrity**: 100% referential integrity maintained

### Batch Processing Strategy
- **Projects**: 100 records per batch
- **States**: 500 records per batch (higher volume)
- **Templates**: Process all at once (lower volume)
- **Progress Tracking**: Report every 10% completion

## Success Metrics

### Data Migration Success
- [ ] **100%** of legacy projects migrated to cases + projects
- [ ] **100%** of workflow states preserved in audit trail
- [ ] **95%+** of workflow templates migrated successfully
- [ ] **Zero** data corruption or loss

### System Integration Success
- [ ] AI embeddings generated for all migrated content
- [ ] Dify knowledge base populated with Bedrock models
- [ ] Semantic search functional on migrated data
- [ ] All API endpoints responding correctly

### Business Continuity Success
- [ ] Zero downtime during migration
- [ ] All active workflows preserved
- [ ] User experience seamless post-migration
- [ ] Performance equal or better than legacy system

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Verify all data integrity checks pass
- [ ] Test critical user workflows
- [ ] Monitor system performance
- [ ] Address any urgent issues

### Short-term (Week 1)
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Training materials creation

### Long-term (Month 1)
- [ ] Legacy system decommissioning plan
- [ ] Advanced AI feature rollout
- [ ] User feedback integration
- [ ] System optimization based on usage patterns

## Conclusion

This implementation plan provides a comprehensive roadmap for successfully refactoring the migration tool from an incorrect order-centric model to the correct project-centric model. The plan addresses:

1. **Complete Architectural Correction**: Aligns with actual legacy database structure
2. **Comprehensive Data Preservation**: Maintains all critical business data and workflows
3. **Risk Mitigation**: Includes robust error handling, validation, and rollback procedures
4. **Performance Optimization**: Designed for efficient processing of large datasets
5. **Future-Proof Design**: Enables AI capabilities and system scalability

The estimated total implementation time is 16 hours across 6 phases, with the highest priority phases (1-4) requiring 11 hours. This represents a significant but necessary investment to ensure the migration tool functions correctly and preserves critical business functionality.

**Next Step**: Switch to Code mode to begin Phase 1 implementation.