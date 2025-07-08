# Decision Log

## 2025-07-02: Phase 2 Migration Strategy - Sequential Execution

### Context
Phase 1 achieved substantial success with 5,506 profiles migrated (60.5% completion), but 3,595 profiles remain due to constraint violations. Phase 2 requires migrating 7,849 patients while addressing the remaining profiles gap.

### Problem
- 3,595 profiles (39.5%) failed in Phase 1 due to batch processing errors
- Patient migration depends on complete profile foundation
- Practice-profile associations failed (all profiles have `practice_id: null`)
- Need robust strategy for handling both remaining profiles and new patient data

### Decision
**Implement Sequential Migration Approach for Phase 2**

#### Architecture Strategy:
1. **Phase 2A**: Complete remaining 3,595 profiles with enhanced error handling
2. **Phase 2B**: Migrate 7,849 patients with practice-profile associations  
3. **Phase 2C**: Integration validation and relationship establishment
4. **Sequential Execution**: Safer dependency management over parallel processing

#### Rationale:
- Sequential execution ensures dependency integrity
- Enhanced error analysis prevents data corruption
- Comprehensive validation at each stage maintains quality
- Checkpoint-based recovery enables safe rollback procedures

### Implementation Plan
1. **Error Analysis**: Categorize and analyze 3,595 failed profiles
2. **Enhanced Infrastructure**: Implement detailed error tracking and cleansing
3. **Targeted Remediation**: Process remaining profiles with conflict resolution
4. **Patient Migration**: Sequential patient processing with practice associations
5. **Integration Validation**: Multi-level validation and relationship establishment

### Impact
- **Positive**: Robust, resumable migration with comprehensive error handling
- **Risk**: Sequential approach may take longer but ensures data integrity
- **Timeline**: 12-16 hours estimated (1.5-2 business days)

### Status
Approved for implementation - comprehensive strategy documented in `docs/progress/phase-2-migration-strategy.md`

---

## 2025-01-02: Migration Architecture Pivot - Project-Centric Model

### Context
During migration tool implementation, discovered that the initial assumption about `dispatch_order` being the core entity was incorrect. The `dispatch_order` table is empty and unused in the legacy system.

### Problem
- Migration tool was failing with SQL errors trying to extract from empty `dispatch_order` table
- Incorrect understanding of legacy data model led to flawed extraction logic
- Target schema mismatch with actual legacy data structure

### Investigation Findings
Through comprehensive analysis of legacy database documentation (`docs/database/LEGACY_DATABASE_STRUCTURE.md`):

1. **Core Entity is `dispatch_project`**: 3D modeling files and digital assets, not "orders"
2. **Workflow Tracking via `dispatch_state`**: Granular, event-sourced audit trail
3. **Template-Driven Workflows**: `dispatch_template` defines standardized processes
4. **Minimal Patient Data**: Most fields don't exist, require defaults
5. **Clear Mapping Guidance**: Documentation provides TypeScript interfaces

### Decision
**Pivot to Project-Centric Migration Model**

#### Architecture Changes:
1. **Remove Order Logic**: Eliminate all `extractOrders`, `transformOrder` methods
2. **Implement Project Extraction**: Focus on `dispatch_project`, `dispatch_state`, `dispatch_template`
3. **Update Target Schema**: Align with AI-ready MDW schema design
4. **Correct Data Mapping**: Use documented TypeScript interfaces

#### Rationale:
- Aligns with actual legacy data model
- Preserves critical 3D project management functionality
- Maintains workflow continuity through proper state tracking
- Enables AI-ready features with correct data structure

### Implementation Plan
1. **Phase 1**: Remove obsolete order-centric code
2. **Phase 2**: Implement project-centric extraction methods
3. **Phase 3**: Update target database schema
4. **Phase 4**: Create new transformation logic
5. **Phase 5**: Refactor migration orchestrator
6. **Phase 6**: Update all documentation

### Impact
- **Positive**: Correct migration logic, preserves business functionality
- **Risk**: Significant refactoring required, but necessary for success
- **Timeline**: Adds development time but prevents future failures

### Status
Approved for implementation - proceeding with documentation updates and code refactoring.

---

## Previous Decisions

### 2025-01-01: AI Embeddings Integration
- **Decision**: Use Amazon Bedrock Titan Text Embeddings v2 for vector generation
- **Rationale**: AWS integration, proven performance, cost-effective
- **Status**: Implemented

### 2025-01-01: Dify Integration
- **Decision**: Integrate with Dify platform for LLM knowledge base population
- **Rationale**: Third-party requirement, enhances AI capabilities
- **Status**: Implemented with Bedrock model configuration

### 2025-01-01: TypeScript Strict Mode
- **Decision**: Enforce strict TypeScript with no `any` types
- **Rationale**: Type safety, maintainability, error prevention
- **Status**: Ongoing enforcement


### 2025-01-03 - Finalized Supabase Data Model
- **Decision**: Created comprehensive finalized Supabase data model based on legacy database analysis
- **Rationale**: Replace theoretical model with data-driven design based on actual legacy system analysis
- **Impact**: Provides production-ready schema with proper relationships and AI capabilities

### 2025-01-03 - AWS Bedrock Titan v2 Integration
- **Decision**: Use AWS Bedrock Titan v2 embeddings with 1024 dimensions for all vector operations
- **Rationale**: More cost-effective and performant than OpenAI embeddings, better integration with AWS ecosystem
- **Impact**: All embedding tables use VECTOR(1024), semantic search functions updated accordingly

### 2025-01-03 - Dify Knowledgebase Architecture
- **Decision**: Implement dual embedding strategy with both pgvector and Dify knowledgebases
- **Rationale**: Leverage Dify 1.4.1 REST API for hybrid search with Titan embeddings and Cohere reranking
- **Impact**: Enhanced AI capabilities with natural language queries and improved search relevance

### 2025-01-03 - Migration Strategy with Legacy Compatibility
- **Decision**: Implement phased migration with embeddings processing AFTER data migration completion
- **Rationale**: Avoid performance impact during migration, ensure data integrity, maintain parallel system operation
- **Impact**: Legacy systems can continue operating alongside new system during transition

### 2025-01-03 - Database Normalization Approach
- **Decision**: Eliminate Django ContentTypes anti-pattern with explicit UUID-based foreign key relationships
- **Rationale**: Improve referential integrity, query performance, and maintainability
- **Impact**: Proper normalized database structure with comprehensive legacy_id mapping for backward compatibility
