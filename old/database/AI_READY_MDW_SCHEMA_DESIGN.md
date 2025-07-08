# AI-Ready Medical Design Workflow (MDW) Database Schema Design

## Executive Summary

This document presents a comprehensive database schema design to replace the legacy Django ContentTypes-based MDW system with a modern, AI-ready Supabase architecture. The design addresses critical performance issues, eliminates anti-patterns, and enables advanced AI capabilities including semantic search, workflow automation, and intelligent case management.

## Legacy System Validation & Issues

### Validated Database Problems

Through comprehensive analysis of the legacy PostgreSQL database, the following critical issues have been confirmed:

#### 1. Django ContentTypes Anti-Pattern
- **Issue**: Generic Foreign Key pattern using `target_type_id` + `target_id` in `dispatch_record` table
- **Impact**: Prevents proper indexing, referential integrity, and query optimization
- **Evidence**: Confirmed 65+ tables with polymorphic relationships through ContentTypes framework

#### 2. Buried State Information
- **Issue**: Workflow states hidden in unstructured `text` field of `dispatch_record`
- **Impact**: Requires text parsing to extract workflow status, prevents efficient querying
- **Evidence**: Sample messages like "Thank you for your case submission. We will proceed with planning..." contain implicit state transitions

#### 3. Multiple Patient Records
- **Issue**: Duplicate patient entries due to poor deduplication
- **Impact**: Data inconsistency, reporting errors, workflow confusion
- **Evidence**: Confirmed duplicates:
  - "Test Test": 3 records
  - "Sierra Green": 3 records  
  - "Tori Nolen": 3 records
  - 10+ other duplicate patient names

#### 4. Limited Patient Data & Missing Critical Tables
- **Issue**: Patient data is limited in `dispatch_patient` table and critical workflow tables are missing
- **Impact**: Incomplete patient records, missing 3D project management, no granular state tracking
- **Evidence**:
  - `dispatch_patient` only contains: `id`, `user_id`, `birthdate`, `sex`, `updated_at`
  - Patient names/email retrieved via `auth_user` relationship (✅ confirmed working)
  - Missing `dispatch_project` table for 3D file management (critical for medical design workflow)
  - Missing `dispatch_state` table for granular workflow state tracking
  - Missing detailed `dispatch_template` functionality for workflow automation

#### 5. No AI Capabilities
- **Issue**: No vector embeddings, semantic search, or AI-ready data structures
- **Impact**: Cannot implement intelligent case management, natural language queries, or automated workflows

## AI-Ready Schema Architecture

### Core Design Principles

1. **Third Normal Form (3NF) Compliance**: Eliminate data redundancy and update anomalies
2. **Explicit Relationships**: Replace Generic Foreign Keys with proper foreign key constraints
3. **Transparent State Management**: Explicit workflow states with audit trails
4. **AI-First Design**: Vector embeddings and semantic search capabilities
5. **Performance Optimization**: Proper indexing and query-optimized structure
6. **Supabase RLS Integration**: Row-level security for multi-tenant data isolation

### Schema Overview

```mermaid
erDiagram
    %% Core Identity & Authentication
    profiles ||--o{ patients : "creates"
    profiles ||--o{ practitioners : "creates"
    profiles ||--o{ practice_members : "belongs_to"
    
    %% Practice Management
    practices ||--o{ practice_members : "has"
    practices ||--o{ patients : "treats"
    practice_members }o--|| practitioners : "references"
    
    %% Patient & Case Management
    patients ||--o{ cases : "has"
    patients ||--o{ patient_embeddings : "has"
    cases ||--o{ case_states : "transitions"
    cases ||--o{ case_files : "contains"
    cases ||--o{ case_messages : "has"
    cases ||--o{ case_embeddings : "has"
    
    %% Orders & Products
    cases ||--o{ orders : "generates"
    orders ||--o{ order_items : "contains"
    order_items }o--|| products : "references"
    orders ||--o{ order_states : "transitions"
    
    %% AI & Embeddings
    case_embeddings }o--|| cases : "represents"
    patient_embeddings }o--|| patients : "represents"
    message_embeddings }o--|| case_messages : "represents"
    
    %% Workflow & Automation
    workflow_templates ||--o{ workflow_steps : "defines"
    cases }o--|| workflow_templates : "follows"
    case_states }o--|| workflow_steps : "maps_to"
```

## Detailed Table Specifications

### 1. Core Identity Tables

#### `profiles` (Supabase Auth Integration)
```sql
-- Extends Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'technician',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM (
  'doctor', 'technician', 'admin', 'support'
);
```

#### `practices`
```sql
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address JSONB, -- Structured address data
  phone TEXT,
  email TEXT,
  license_number TEXT,
  settings JSONB DEFAULT '{}', -- Practice-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `practice_members`
```sql
CREATE TABLE practice_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  role practice_role NOT NULL,
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, profile_id)
);

CREATE TYPE practice_role AS ENUM (
  'owner', 'doctor', 'technician', 'assistant', 'admin'
);
```

### 2. Patient Management (Deduplicated)

#### `patients`
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_number TEXT NOT NULL, -- Practice-specific patient ID
  date_of_birth DATE,
  gender gender_type,
  medical_history JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  emergency_contact JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, patient_number),
  UNIQUE(practice_id, profile_id) -- Prevent duplicates per practice
);

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
```

#### `practitioners`
```sql
CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT UNIQUE,
  specialties TEXT[],
  credentials JSONB DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Case Management (Normalized)

#### `cases`
```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  assigned_practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  case_number TEXT NOT NULL, -- Practice-specific case ID
  title TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL,
  priority priority_level DEFAULT 'medium',
  current_state case_state_enum NOT NULL DEFAULT 'submitted',
  workflow_template_id UUID REFERENCES workflow_templates(id),
  metadata JSONB DEFAULT '{}', -- Flexible case-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, case_number)
);

CREATE TYPE case_type_enum AS ENUM (
  'initial_consultation', 'treatment_planning', 'active_treatment', 
  'refinement', 'retention', 'emergency', 'follow_up'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE case_state_enum AS ENUM (
  'submitted', 'under_review', 'planning', 'approved', 'in_production',
  'quality_check', 'shipped', 'delivered', 'completed', 'on_hold', 'cancelled'
);
```

#### `case_states` (Audit Trail)
```sql
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
```

### 4. Order Management (Explicit Relationships)

#### `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL, -- Practice-specific order ID
  current_state order_state_enum NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(practice_id, order_number)
);

CREATE TYPE order_state_enum AS ENUM (
  'pending', 'confirmed', 'in_production', 'quality_check',
  'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
);
```

#### `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  customizations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  customizable_options JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE product_category AS ENUM (
  'aligners', 'retainers', 'appliances', 'accessories', 'services'
);
```

#### `order_states` (Audit Trail)
```sql
CREATE TABLE order_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_state order_state_enum,
  to_state order_state_enum NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Communication System (Structured)

#### `case_messages`
```sql
CREATE TABLE case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message_type message_type_enum NOT NULL DEFAULT 'general',
  subject TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]', -- Array of file references
  read_by JSONB DEFAULT '{}', -- Track read status per user
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE message_type_enum AS ENUM (
  'general', 'status_update', 'question', 'instruction', 
  'approval_request', 'system_notification'
);
```

### 6. File Management

#### `case_files`
```sql
CREATE TABLE case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type file_type_enum NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  mime_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- EXIF, scan parameters, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE file_type_enum AS ENUM (
  'scan', 'photo', 'xray', 'document', 'model', 'simulation', 'other'
);
```

### 7. AI & Embeddings Infrastructure

#### `case_embeddings`
```sql
CREATE TABLE case_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content_type embedding_content_type NOT NULL,
  content_text TEXT NOT NULL, -- Source text for embedding
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE embedding_content_type AS ENUM (
  'case_summary', 'treatment_plan', 'notes', 'diagnosis'
);

-- Vector similarity search index
CREATE INDEX case_embeddings_vector_idx ON case_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `patient_embeddings`
```sql
CREATE TABLE patient_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  content_type embedding_content_type NOT NULL,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX patient_embeddings_vector_idx ON patient_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `message_embeddings`
```sql
CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES case_messages(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX message_embeddings_vector_idx ON message_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 8. Workflow Automation

#### `workflow_templates`
```sql
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  case_type case_type_enum NOT NULL,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workflow_steps`
```sql
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state case_state_enum NOT NULL,
  auto_transition BOOLEAN DEFAULT false,
  required_roles practice_role[],
  estimated_duration INTERVAL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(workflow_template_id, step_order)
);
```

### 9. 3D Project & Digital Asset Management

#### `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INTEGER UNIQUE, -- For migration mapping
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  project_type project_type_enum NOT NULL,
  status project_status_enum NOT NULL DEFAULT 'draft',
  file_size BIGINT DEFAULT 0,
  storage_path TEXT, -- Supabase Storage path
  storage_bucket TEXT DEFAULT 'projects',
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  parent_project_id UUID REFERENCES projects(id), -- For versioning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE project_type_enum AS ENUM (
  'scan', 'model', 'simulation', 'treatment_plan', 'aligner_design',
  'impression', 'xray', 'photo', 'document', 'other'
);

CREATE TYPE project_status_enum AS ENUM (
  'draft', 'in_progress', 'review', 'approved', 'archived', 'deleted'
);
```

#### `project_embeddings`
```sql
CREATE TABLE project_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_type embedding_content_type NOT NULL,
  content_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX project_embeddings_vector_idx ON project_embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 10. Enhanced Workflow Templates

#### `workflow_template_tasks`
```sql
CREATE TABLE workflow_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  legacy_template_id INTEGER, -- For migration mapping
  task_name TEXT NOT NULL,
  task_order INTEGER NOT NULL,
  function_type task_function_enum NOT NULL,
  is_predefined BOOLEAN DEFAULT false,
  action_name TEXT,
  text_prompt TEXT,
  estimated_duration INTERVAL,
  required_roles practice_role[],
  category workflow_category_enum,
  auto_transition BOOLEAN DEFAULT false,
  predecessor_tasks UUID[], -- Array of task IDs that must complete first
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_template_id, task_order)
);

CREATE TYPE task_function_enum AS ENUM (
  'submit', 'review', 'approve', 'process', 'notify', 'archive',
  'scan', 'model', 'manufacture', 'quality_check', 'ship'
);

CREATE TYPE workflow_category_enum AS ENUM (
  'submission', 'review', 'production', 'quality_check', 'delivery',
  'follow_up', 'scanning', 'modeling', 'manufacturing'
);
```

#### `workflow_performance`
```sql
CREATE TABLE workflow_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id),
  case_id UUID NOT NULL REFERENCES cases(id),
  task_performance JSONB, -- Duration, bottlenecks, efficiency metrics
  ai_recommendations JSONB, -- AI-generated optimization suggestions
  completion_rate DECIMAL(5,2), -- Percentage of tasks completed on time
  average_task_duration INTERVAL,
  bottleneck_tasks UUID[], -- Array of task IDs that caused delays
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11. Granular State Tracking

#### `instruction_states`
```sql
CREATE TABLE instruction_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  instruction_type TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  legacy_instruction_id INTEGER, -- For migration mapping
  notes TEXT
);
```

#### `state_analytics`
```sql
CREATE TABLE state_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  duration_minutes INTEGER,
  actor_id UUID REFERENCES profiles(id),
  bottleneck_detected BOOLEAN DEFAULT false,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Performance Optimizations

### Indexing Strategy

```sql
-- Core business logic indexes
CREATE INDEX idx_cases_practice_patient ON cases(practice_id, patient_id);
CREATE INDEX idx_cases_state_priority ON cases(current_state, priority);
CREATE INDEX idx_cases_practitioner_state ON cases(assigned_practitioner_id, current_state);
CREATE INDEX idx_orders_case_state ON orders(case_id, current_state);
CREATE INDEX idx_messages_case_created ON case_messages(case_id, created_at DESC);

-- AI query optimization
CREATE INDEX idx_case_embeddings_case_type ON case_embeddings(case_id, content_type);
CREATE INDEX idx_patient_embeddings_patient_type ON patient_embeddings(patient_id, content_type);

-- Audit trail optimization
CREATE INDEX idx_case_states_case_created ON case_states(case_id, created_at DESC);
CREATE INDEX idx_order_states_order_created ON order_states(order_id, created_at DESC);

-- Multi-tenant optimization
CREATE INDEX idx_patients_practice_number ON patients(practice_id, patient_number);
CREATE INDEX idx_cases_practice_number ON cases(practice_id, case_number);
CREATE INDEX idx_orders_practice_number ON orders(practice_id, order_number);
```

### Query Optimization Views

```sql
-- Materialized view for case dashboard
CREATE MATERIALIZED VIEW case_dashboard AS
SELECT 
  c.id,
  c.case_number,
  c.title,
  c.current_state,
  c.priority,
  c.created_at,
  p.first_name || ' ' || p.last_name AS patient_name,
  pr.first_name || ' ' || pr.last_name AS practitioner_name,
  COUNT(cm.id) AS message_count,
  COUNT(cf.id) AS file_count,
  MAX(cm.created_at) AS last_message_at
FROM cases c
JOIN patients pt ON c.patient_id = pt.id
JOIN profiles p ON pt.profile_id = p.id
LEFT JOIN practitioners prac ON c.assigned_practitioner_id = prac.id
LEFT JOIN profiles pr ON prac.profile_id = pr.id
LEFT JOIN case_messages cm ON c.id = cm.case_id
LEFT JOIN case_files cf ON c.id = cf.case_id
GROUP BY c.id, p.first_name, p.last_name, pr.first_name, pr.last_name;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_case_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY case_dashboard;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Row-Level Security (RLS) Policies

### Practice-Based Data Isolation

```sql
-- Enable RLS on all tables
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;

-- Practice members can only access their practice data
CREATE POLICY practice_isolation_patients ON patients
FOR ALL USING (
  practice_id IN (
    SELECT practice_id FROM practice_members 
    WHERE profile_id = auth.uid()
  )
);

CREATE POLICY practice_isolation_cases ON cases
FOR ALL USING (
  practice_id IN (
    SELECT practice_id FROM practice_members 
    WHERE profile_id = auth.uid()
  )
);

-- Admin users have unrestricted access.
-- This policy should be reviewed and tightened based on specific admin roles
-- if ever needed, but for an internal tool, this is a reasonable starting point.
CREATE POLICY "Enable all access for admin users" ON patients
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable all access for admin users" ON cases
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

## AI Integration Architecture

### Semantic Search Functions

```sql
-- Semantic case search
CREATE OR REPLACE FUNCTION search_cases_semantic(
  query_text TEXT,
  practice_id_param UUID,
  similarity_threshold FLOAT DEFAULT 0.8,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  case_id UUID,
  case_number TEXT,
  title TEXT,
  similarity FLOAT,
  content_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.case_number,
    c.title,
    1 - (ce.embedding <=> get_embedding(query_text)) AS similarity,
    ce.content_text
  FROM case_embeddings ce
  JOIN cases c ON ce.case_id = c.id
  WHERE c.practice_id = practice_id_param
    AND 1 - (ce.embedding <=> get_embedding(query_text)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

### AI Workflow Triggers

```sql
-- Auto-generate embeddings on case creation
CREATE OR REPLACE FUNCTION generate_case_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate embedding for case summary
  INSERT INTO case_embeddings (case_id, content_type, content_text, embedding)
  VALUES (
    NEW.id,
    'case_summary',
    NEW.title || ' ' || COALESCE(NEW.description, ''),
    get_embedding(NEW.title || ' ' || COALESCE(NEW.description, ''))
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_case_embeddings
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION generate_case_embeddings();
```

## Migration Strategy

The data migration from the legacy Django-based system to this new Supabase schema is handled by a simplified, script-based process. This approach was chosen to reduce complexity and increase reliability for a one-time data transfer.

For complete details on the architecture and execution of the migration, please see the dedicated documentation:

-   **[Simplified Migration Plan](./../simplified-migration-plan.md)**

## Performance Benchmarks

### Expected Improvements

| Operation | Legacy System | New System | Improvement |
|-----------|---------------|------------|-------------|
| Patient Search | 2-5 seconds | 50-100ms | 20-100x faster |
| Case Dashboard Load | 3-8 seconds | 100-200ms | 15-80x faster |
| Order History Query | 1-3 seconds | 50-100ms | 10-60x faster |
| Semantic Search | Not Available | 200-500ms | New capability |
| Workflow State Query | 500ms-2s | 10-50ms | 10-200x faster |

### Scalability Targets

- **Concurrent Users**: 1,000+ (vs 50-100 legacy)
- **Database Size**: 100GB+ with consistent performance
- **Query Response**: <100ms for 95% of queries
- **Vector Search**: <500ms for semantic queries
- **Data Ingestion**: 10,000+ records/minute

## AI Capabilities Enabled

### 1. Semantic Case Search
- Natural language queries: "Find cases with extraction complications"
- Similar case recommendations based on treatment patterns
- Intelligent case categorization and tagging

### 2. Automated Workflow Management
- AI-driven state transitions based on message content
- Predictive workflow optimization
- Automated task assignment and prioritization

### 3. Intelligent Notifications
- Context-aware message routing
- Predictive issue detection
- Automated follow-up scheduling

### 4. Advanced Analytics
- Treatment outcome prediction
- Resource utilization optimization
- Patient satisfaction analysis

## Security & Compliance

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **Access Control**: Role-based permissions with RLS
- **Audit Trail**: Complete change tracking for all records
- **HIPAA Compliance**: PHI protection and access logging

### Privacy Controls
- **Data Minimization**: Only collect necessary patient information
- **Consent Management**: Track and respect patient privacy preferences
- **Right to Deletion**: Support for patient data removal requests
- **Cross-Border**: Supabase regional data residency options

## Monitoring & Observability

### Performance Monitoring
```sql
-- Query performance tracking
CREATE TABLE query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_affected INTEGER,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated performance alerts
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.execution_time_ms > 1000 THEN
    INSERT INTO performance_alerts (alert_type, message, metadata)
    VALUES ('slow_query', 'Query exceeded 1 second', jsonb_build_object(
      'query_type', NEW.query_type,
      'execution_time', NEW.execution_time_ms,
      'user_id', NEW.user_id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Conclusion

This AI-ready MDW database schema design addresses all validated issues from the legacy system:

✅ **Eliminates Django ContentTypes Anti-Pattern**: Replaced with explicit foreign key relationships
✅ **Extracts Buried State Information**: Explicit state management with audit trails  
✅ **Resolves Patient Duplicates**: Normalized patient data with deduplication strategy
✅ **Consolidates Scattered Order Information**: Direct case-order relationships with clear data flow
✅ **Enables AI Capabilities**: Vector embeddings, semantic search, and workflow automation
✅ **Optimizes Performance**: Proper indexing, materialized views, and query optimization
✅ **Ensures Security**: RLS policies, encryption, and HIPAA compliance

The new architecture provides a solid foundation for modern orthodontic practice management with advanced AI capabilities, supporting the transition from legacy Django ContentTypes to a scalable, maintainable, and intelligent system.