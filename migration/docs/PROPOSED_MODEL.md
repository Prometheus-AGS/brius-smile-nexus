# Supabase Target Data Model for Brius Migration

## Overview

This document outlines a normalized, well-designed data model for migrating from a Django contenttypes-based legacy system to a modern Supabase database optimized for AI/RAG use cases and general reporting.

## Design Principles

1. **Normalization**: Eliminate redundancy and ensure data integrity
2. **Clear Relationships**: Use proper foreign key constraints instead of generic relations
3. **AI-Ready**: Include vector embedding tables and metadata structures
4. **Audit Trail**: Maintain history and tracking capabilities
5. **Extensibility**: Support for JSONB fields where appropriate
6. **Performance**: Optimized for both transactional and analytical queries

## Core Tables

### 1. Offices (Customer Organizations)

```sql
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id INTEGER UNIQUE, -- backlink to dispatch_office.id
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    phone TEXT,
    email TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offices_legacy_id ON offices(legacy_id);
CREATE INDEX idx_offices_is_active ON offices(is_active);
```

### 2. Profiles (Unified Profile Table)

This table consolidates all profile types (doctors, patients, technicians, etc.) into a single table with a discriminator field.

```sql
CREATE TYPE profile_type AS ENUM (
    'doctor',
    'patient',
    'technician',
    'master',
    'sales_person',
    'staff'
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id INTEGER UNIQUE, -- backlink to auth_user.id
    profile_type profile_type NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_legacy_user_id ON profiles(legacy_user_id);
CREATE INDEX idx_profiles_profile_type ON profiles(profile_type);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_name_search ON profiles USING gin(
    (first_name || ' ' || last_name) gin_trgm_ops
);
```

### 3. Doctor-Office Relationships

```sql
CREATE TABLE doctor_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id),
    office_id UUID NOT NULL REFERENCES offices(id),
    is_primary BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, office_id)
);

CREATE INDEX idx_doctor_offices_doctor ON doctor_offices(doctor_id);
CREATE INDEX idx_doctor_offices_office ON doctor_offices(office_id);
```

### 4. Order Types

```sql
CREATE TABLE order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE, -- kebab-case identifier
    description TEXT,
    schema JSONB, -- JSON schema for data validation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default order types
INSERT INTO order_types (name, key) VALUES
    ('Main', 'main'),
    ('Refinement', 'refinement'),
    ('Replacement', 'replacement');
```

### 5. Order States

```sql
CREATE TABLE order_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT, -- for UI representation
    sequence_order INTEGER, -- for workflow ordering
    is_final BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_states_sequence ON order_states(sequence_order);
```

### 6. Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_instruction_id INTEGER UNIQUE, -- backlink to dispatch_instruction.id
    order_number TEXT NOT NULL UNIQUE,
    order_type_id UUID NOT NULL REFERENCES order_types(id),
    patient_id UUID NOT NULL REFERENCES profiles(id),
    doctor_id UUID NOT NULL REFERENCES profiles(id),
    office_id UUID NOT NULL REFERENCES offices(id),
    current_state_id UUID REFERENCES order_states(id),
    description TEXT,
    priority TEXT DEFAULT 'normal',
    data JSONB DEFAULT '{}', -- extensible data validated by order_type.schema
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_legacy_id ON orders(legacy_instruction_id);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_doctor ON orders(doctor_id);
CREATE INDEX idx_orders_office ON orders(office_id);
CREATE INDEX idx_orders_state ON orders(current_state_id);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_order_type ON orders(order_type_id);
```

### 7. Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
```

### 8. Projects

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_project_id INTEGER UNIQUE, -- backlink to dispatch_project.id
    order_id UUID NOT NULL REFERENCES orders(id),
    project_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_legacy_id ON projects(legacy_project_id);
CREATE INDEX idx_projects_order ON projects(order_id);
CREATE INDEX idx_projects_status ON projects(status);
```

### 9. Tasks

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    assigned_to_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### 10. Message Types

```sql
CREATE TABLE message_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    category TEXT, -- 'system', 'user', 'notification', etc.
    description TEXT,
    triggers_state_change BOOLEAN DEFAULT false,
    target_state_id UUID REFERENCES order_states(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_types_category ON message_types(category);
```

### 11. Messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_record_id INTEGER UNIQUE, -- backlink to dispatch_records.id
    message_type_id UUID NOT NULL REFERENCES message_types(id),
    order_id UUID REFERENCES orders(id),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    subject TEXT,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_legacy_id ON messages(legacy_record_id);
CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_type ON messages(message_type_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### 12. Comments

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES tasks(id),
    author_id UUID NOT NULL REFERENCES profiles(id),
    body TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure comment is attached to at least one entity
    CONSTRAINT check_comment_entity CHECK (
        (order_id IS NOT NULL) OR 
        (project_id IS NOT NULL) OR 
        (task_id IS NOT NULL)
    )
);

CREATE INDEX idx_comments_order ON comments(order_id);
CREATE INDEX idx_comments_project ON comments(project_id);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_author ON comments(author_id);
```

### 13. Instructions

```sql
CREATE TABLE instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    instruction_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by_id UUID REFERENCES profiles(id),
    approved_by_id UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructions_order ON instructions(order_id);
CREATE INDEX idx_instructions_type ON instructions(instruction_type);
```

## AI/RAG Support Tables

### 14. Embeddings

```sql
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    content TEXT NOT NULL, -- original text that was embedded
    embedding vector(1536), -- adjust dimension based on your model
    model_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_source ON embeddings(source_table, source_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 15. Embedding Queue (for async processing)

```sql
CREATE TABLE embedding_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embedding_queue_status ON embedding_queue(status, priority);
```

## Audit and History Tables

### 16. Audit Log

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'insert', 'update', 'delete'
    old_data JSONB,
    new_data JSONB,
    changed_by_id UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_by ON audit_log(changed_by_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);
```

### 17. Order State History

```sql
CREATE TABLE order_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    from_state_id UUID REFERENCES order_states(id),
    to_state_id UUID NOT NULL REFERENCES order_states(id),
    changed_by_id UUID REFERENCES profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_state_history_order ON order_state_history(order_id);
CREATE INDEX idx_order_state_history_created ON order_state_history(created_at);
```

## Views for Common Queries

### Order Summary View

```sql
CREATE VIEW v_order_summary AS
SELECT 
    o.id,
    o.order_number,
    ot.name as order_type,
    p.first_name || ' ' || p.last_name as patient_name,
    d.first_name || ' ' || d.last_name as doctor_name,
    off.name as office_name,
    os.name as current_state,
    o.created_at,
    o.updated_at
FROM orders o
JOIN order_types ot ON o.order_type_id = ot.id
JOIN people p ON o.patient_id = p.id
JOIN people d ON o.doctor_id = d.id
JOIN offices off ON o.office_id = off.id
LEFT JOIN order_states os ON o.current_state_id = os.id;
```

### Active Projects View

```sql
CREATE VIEW v_active_projects AS
SELECT 
    p.*,
    o.order_number,
    pat.first_name || ' ' || pat.last_name as patient_name,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
FROM projects p
JOIN orders o ON p.order_id = o.id
JOIN people pat ON o.patient_id = pat.id
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.status != 'completed'
GROUP BY p.id, o.order_number, pat.first_name, pat.last_name;
```

## Database Functions and Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Repeat for all tables...
```

### Audit logging trigger

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD));
        RETURN OLD;
    END IF;
END;
$$ language 'plpgsql';
```

### Embedding queue trigger

```sql
CREATE OR REPLACE FUNCTION queue_embedding_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue embedding generation for relevant content changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO embedding_queue(source_table, source_id, operation)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO embedding_queue(source_table, source_id, operation)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP);
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply to tables that need embeddings
CREATE TRIGGER queue_order_embeddings AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_update();
-- Repeat for messages, comments, etc.
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on sensitive tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example policy: Doctors can only see their own patients' orders
CREATE POLICY doctor_order_access ON orders
    FOR SELECT
    USING (
        doctor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM doctor_offices do
            WHERE do.doctor_id = auth.uid()
            AND do.office_id = orders.office_id
            AND do.is_active = true
        )
    );
```

## Migration Considerations

1. **Legacy ID Preservation**: All tables include legacy_id fields to maintain references back to the original Django database.

2. **Data Validation**: Use the schema JSONB field in order_types to validate data fields for specific order types.

3. **Incremental Migration**: The schema supports incremental migration - you can migrate one entity type at a time.

4. **Embedding Generation**: Set up a background job to process the embedding_queue table and generate vector embeddings for searchable content.

5. **State Tracking**: The order_state_history table maintains a complete audit trail of state changes.

## Performance Optimizations

1. **Partial Indexes**: Create partial indexes for commonly filtered queries:
   ```sql
   CREATE INDEX idx_orders_active ON orders(created_at) WHERE cancelled_at IS NULL;
   ```

2. **Materialized Views**: For complex reporting queries, consider materialized views:
   ```sql
   CREATE MATERIALIZED VIEW mv_monthly_order_stats AS
   SELECT 
       date_trunc('month', created_at) as month,
       office_id,
       order_type_id,
       COUNT(*) as order_count
   FROM orders
   GROUP BY 1, 2, 3;
   
   CREATE UNIQUE INDEX ON mv_monthly_order_stats(month, office_id, order_type_id);
   ```

3. **Partitioning**: For high-volume tables like messages and audit_log, consider partitioning by date:
   ```sql
   CREATE TABLE messages_2024_01 PARTITION OF messages
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

## Next Steps

1. Review and adjust the schema based on specific business requirements
2. Create migration scripts to extract data from Django tables
3. Set up embedding generation pipeline
4. Implement API endpoints using Supabase's auto-generated APIs
5. Configure RLS policies based on your security requirements
6. Set up monitoring and performance tracking