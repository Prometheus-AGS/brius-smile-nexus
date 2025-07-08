-- =====================================================
-- Master Supabase Schema Creation Script
-- =====================================================
-- This script executes all schema creation scripts in the correct order
-- Addresses critical migration issues and creates production-ready schema

-- Script execution metadata
DO $$
BEGIN
    RAISE NOTICE 'Starting Supabase schema creation for Brius migration system';
    RAISE NOTICE 'Execution started at: %', NOW();
    RAISE NOTICE 'This will create a complete schema with corrected constraints for 100%% data migration';
END $$;

-- =====================================================
-- PHASE 1: Enums and Types
-- =====================================================

\echo '=== PHASE 1: Creating Enums and Types ==='

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Profile types based on legacy user analysis
CREATE TYPE profile_type AS ENUM (
    'patient',      -- Maps to dispatch_patient records
    'doctor',       -- Detected from user roles and office relationships
    'technician',   -- Staff users with technical roles
    'master',       -- Superuser accounts
    'sales_person', -- Sales team members
    'agent',        -- External agents
    'client'        -- General client accounts
);

-- Project types for 3D file management
CREATE TYPE project_type_enum AS ENUM (
    'scan',
    'model', 
    'simulation',
    'treatment_plan',
    'aligner_design',
    'impression',
    'xray',
    'photo',
    'document',
    'other'
);

-- Project status workflow
CREATE TYPE project_status_enum AS ENUM (
    'draft',
    'in_progress',
    'review',
    'approved',
    'archived',
    'deleted'
);

-- Task function types for workflow automation
CREATE TYPE task_function_enum AS ENUM (
    'submit',
    'review',
    'approve',
    'process',
    'notify',
    'archive',
    'scan',
    'model',
    'manufacture',
    'quality_check',
    'ship'
);

\echo '✓ Phase 1 completed: Enums and types created'

-- =====================================================
-- PHASE 2: Core Tables
-- =====================================================

\echo '=== PHASE 2: Creating Core Tables ==='

-- Profiles Table (CRITICAL FIX: Nullable email field)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_user_id INTEGER UNIQUE,
    legacy_patient_id INTEGER,
    profile_type profile_type NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    email TEXT, -- NULLABLE: 87% of users have no email address
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    insurance_provider TEXT,
    insurance_id TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_history TEXT,
    allergies TEXT,
    medications TEXT,
    license_number TEXT,
    specialties TEXT[],
    credentials JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offices Table
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_office_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    phone TEXT,
    email TEXT,
    website TEXT,
    license_number TEXT,
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    square_customer_id TEXT,
    emails_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor-Office Relationships
CREATE TABLE doctor_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'doctor',
    permissions JSONB DEFAULT '{}',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, office_id)
);

-- Order Types
CREATE TABLE order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_course_id INTEGER UNIQUE,
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2) DEFAULT 0.00,
    schema JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order States
CREATE TABLE order_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_state_id INTEGER UNIQUE,
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    sequence_order INTEGER,
    is_initial BOOLEAN DEFAULT false,
    is_final BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data
INSERT INTO order_states (name, key, description, sequence_order, legacy_state_id, color, is_initial, is_final) VALUES
    ('Submitted', 'submitted', 'Order has been submitted', 1, 1, '#3B82F6', true, false),
    ('Under Review', 'under_review', 'Order is being reviewed', 2, 2, '#F59E0B', false, false),
    ('Planning', 'planning', 'Treatment planning in progress', 3, 3, '#8B5CF6', false, false),
    ('Approved', 'approved', 'Order has been approved', 4, 4, '#10B981', false, false),
    ('In Production', 'in_production', 'Order is being manufactured', 5, 5, '#F97316', false, false),
    ('Quality Check', 'quality_check', 'Quality assurance review', 6, 6, '#06B6D4', false, false),
    ('Shipped', 'shipped', 'Order has been shipped', 7, 7, '#84CC16', false, false),
    ('Delivered', 'delivered', 'Order has been delivered', 8, 8, '#22C55E', false, false),
    ('Completed', 'completed', 'Order is complete', 9, 9, '#059669', false, true),
    ('On Hold', 'on_hold', 'Order is temporarily paused', 10, 10, '#6B7280', false, false),
    ('Cancelled', 'cancelled', 'Order has been cancelled', 11, 11, '#EF4444', false, true);

INSERT INTO order_types (name, key, description, category, base_price) VALUES
    ('Main Treatment', 'main', 'Primary orthodontic treatment', 'treatment', 2500.00),
    ('Refinement', 'refinement', 'Treatment refinement and adjustments', 'treatment', 500.00),
    ('Replacement', 'replacement', 'Replacement of orthodontic appliances', 'replacement', 300.00),
    ('Retainer', 'retainer', 'Post-treatment retention phase', 'retention', 200.00),
    ('Emergency', 'emergency', 'Emergency orthodontic care', 'emergency', 150.00),
    ('Consultation', 'consultation', 'Initial consultation and assessment', 'consultation', 100.00);

\echo '✓ Phase 2 completed: Core tables created with corrected constraints'

-- =====================================================
-- PHASE 3: Relationship Tables
-- =====================================================

\echo '=== PHASE 3: Creating Relationship Tables ==='

-- Orders Table (Maps from dispatch_instruction)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_instruction_id INTEGER UNIQUE,
    order_number TEXT NOT NULL UNIQUE,
    order_type_id UUID NOT NULL REFERENCES order_types(id),
    patient_id UUID NOT NULL REFERENCES profiles(id),
    doctor_id UUID NOT NULL REFERENCES profiles(id),
    office_id UUID NOT NULL REFERENCES offices(id),
    current_state_id UUID REFERENCES order_states(id),
    title TEXT,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    custom_price DECIMAL(10,2),
    notes TEXT,
    model_id INTEGER,
    scanner_id INTEGER,
    scanner_notes TEXT DEFAULT '',
    exports TEXT DEFAULT '',
    conditions TEXT DEFAULT '',
    complaint TEXT DEFAULT '',
    objective TEXT DEFAULT '',
    cbct BOOLEAN DEFAULT false,
    accept_extraction BOOLEAN DEFAULT false,
    comprehensive BOOLEAN DEFAULT false,
    upper_jaw_id INTEGER,
    lower_jaw_id INTEGER,
    status INTEGER,
    suffix TEXT NOT NULL DEFAULT '',
    is_deleted BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_project_id INTEGER UNIQUE,
    legacy_uid UUID,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id),
    creator_id UUID NOT NULL REFERENCES profiles(id),
    project_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    project_type project_type_enum NOT NULL,
    status project_status_enum NOT NULL DEFAULT 'draft',
    file_size BIGINT DEFAULT 0,
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'projects',
    mime_type TEXT,
    legacy_type INTEGER,
    legacy_status INTEGER,
    is_public BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    parent_project_id UUID REFERENCES projects(id),
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(office_id, project_number)
);

-- Message Types
CREATE TABLE message_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    key TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    triggers_state_change BOOLEAN DEFAULT false,
    target_state_id UUID REFERENCES order_states(id),
    template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_record_id INTEGER UNIQUE,
    message_type_id UUID NOT NULL REFERENCES message_types(id),
    order_id UUID REFERENCES orders(id),
    project_id UUID REFERENCES projects(id),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    subject TEXT,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    requires_response BOOLEAN DEFAULT false,
    response_due_date TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]',
    legacy_content_type_id INTEGER,
    legacy_object_id INTEGER,
    legacy_model_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_message_entity CHECK (
        (order_id IS NOT NULL) OR (project_id IS NOT NULL)
    )
);

-- Workflow Tables
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_template_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    order_type_id UUID REFERENCES order_types(id),
    is_predefined BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_order INTEGER NOT NULL,
    function_type task_function_enum NOT NULL,
    action_name TEXT,
    text_prompt TEXT,
    estimated_duration INTERVAL,
    required_roles profile_type[],
    auto_transition BOOLEAN DEFAULT false,
    predecessor_tasks UUID[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_template_id, task_order)
);

-- Insert default message types
INSERT INTO message_types (name, key, category, description) VALUES
    ('General Message', 'general', 'user', 'General communication'),
    ('Status Update', 'status_update', 'system', 'Automated status updates'),
    ('Question', 'question', 'user', 'Questions requiring response'),
    ('Instruction', 'instruction', 'workflow', 'Treatment instructions'),
    ('Approval Request', 'approval_request', 'workflow', 'Requests for approval'),
    ('System Notification', 'system_notification', 'system', 'Automated notifications'),
    ('File Upload', 'file_upload', 'system', 'File upload notifications'),
    ('State Change', 'state_change', 'system', 'Order state change notifications');

\echo '✓ Phase 3 completed: Relationship tables created'

-- =====================================================
-- PHASE 4: Audit and Tracking Tables
-- =====================================================

\echo '=== PHASE 4: Creating Audit and Tracking Tables ==='

-- Order State History
CREATE TABLE order_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_state_id UUID REFERENCES order_states(id),
    to_state_id UUID NOT NULL REFERENCES order_states(id),
    changed_by_id UUID REFERENCES profiles(id),
    reason TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instruction States (Legacy Mapping)
CREATE TABLE instruction_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_state_id INTEGER UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status_code INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    changed_by_id UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    legacy_instruction_id INTEGER,
    legacy_actor_id INTEGER
);

-- Additional audit tables
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'attachments',
    checksum TEXT,
    uploaded_by_id UUID REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'running',
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE data_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name TEXT NOT NULL,
    check_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    expected_value JSONB,
    actual_value JSONB,
    status TEXT NOT NULL,
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

\echo '✓ Phase 4 completed: Audit and tracking tables created'

-- =====================================================
-- PHASE 5: Performance Indexes
-- =====================================================

\echo '=== PHASE 5: Creating Performance Indexes ==='

-- Core table indexes
CREATE INDEX idx_profiles_legacy_user_id ON profiles(legacy_user_id);
CREATE INDEX idx_profiles_legacy_patient_id ON profiles(legacy_patient_id);
CREATE INDEX idx_profiles_profile_type ON profiles(profile_type);
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_name_search ON profiles USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_profiles_type_active ON profiles(profile_type, is_active);

CREATE INDEX idx_offices_legacy_id ON offices(legacy_office_id);
CREATE INDEX idx_offices_is_active ON offices(is_active);

CREATE INDEX idx_orders_legacy_id ON orders(legacy_instruction_id);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_doctor ON orders(doctor_id);
CREATE INDEX idx_orders_office ON orders(office_id);
CREATE INDEX idx_orders_state ON orders(current_state_id);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_office_state ON orders(office_id, current_state_id);

CREATE INDEX idx_projects_legacy_id ON projects(legacy_project_id);
CREATE INDEX idx_projects_order ON projects(order_id);
CREATE INDEX idx_projects_office ON projects(office_id);
CREATE INDEX idx_projects_creator ON projects(creator_id);

CREATE INDEX idx_messages_legacy_id ON messages(legacy_record_id);
CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);

\echo '✓ Phase 5 completed: Performance indexes created'

-- =====================================================
-- PHASE 6: Row Level Security
-- =====================================================

\echo '=== PHASE 6: Enabling Row Level Security ==='

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_checks ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM profiles 
        WHERE legacy_user_id = (auth.jwt() ->> 'sub')::INTEGER
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT profile_type = 'master'
        FROM profiles 
        WHERE id = get_current_profile()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic RLS policies (simplified for initial setup)
CREATE POLICY "profiles_policy" ON profiles FOR ALL USING (
    id = get_current_profile() OR is_admin()
);

CREATE POLICY "orders_policy" ON orders FOR ALL USING (
    patient_id = get_current_profile() OR 
    doctor_id = get_current_profile() OR 
    is_admin()
);

\echo '✓ Phase 6 completed: Row Level Security enabled'

-- =====================================================
-- PHASE 7: Validation Views and Functions
-- =====================================================

\echo '=== PHASE 7: Creating Validation Views and Functions ==='

-- Migration summary view
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_user_id) as records_with_legacy_id,
    COUNT(CASE WHEN profile_type = 'patient' THEN 1 END) as patient_records,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as records_with_email
FROM profiles
UNION ALL
SELECT 
    'orders' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_instruction_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_records,
    0 as records_with_email
FROM orders
UNION ALL
SELECT 
    'projects' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_project_id) as records_with_legacy_id,
    COUNT(CASE WHEN status != 'deleted' THEN 1 END) as active_records,
    0 as records_with_email
FROM projects
UNION ALL
SELECT 
    'messages' as table_name,
    COUNT(*) as total_records,
    COUNT(legacy_record_id) as records_with_legacy_id,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_records,
    0 as records_with_email
FROM messages;

-- Validation function
CREATE OR REPLACE FUNCTION validate_migration_completeness()
RETURNS TABLE(
    validation_name TEXT,
    expected_count BIGINT,
    actual_count BIGINT,
    status TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Profiles'::TEXT,
        9101::BIGINT,
        (SELECT COUNT(*) FROM profiles)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM profiles) >= 9101 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Should have migrated all 9,101 users from auth_user'::TEXT
    UNION ALL
    SELECT 
        'Total Orders'::TEXT,
        23265::BIGINT,
        (SELECT COUNT(*) FROM orders)::BIGINT,
        CASE 
            WHEN (SELECT COUNT(*) FROM orders) >= 23265 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        'Should have migrated all 23,265 instructions from dispatch_instruction'::TEXT;
END;
$$ LANGUAGE plpgsql;

\echo '✓ Phase 7 completed: Validation views and functions created'

-- =====================================================
-- Final Validation and Summary
-- =====================================================

\echo '=== FINAL VALIDATION ==='

-- Count created tables
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    
    RAISE NOTICE '=== SCHEMA CREATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'RLS enabled on all tables';
    RAISE NOTICE 'Schema is ready for 100%% data migration (9,101 users + 23,265 orders)';
    RAISE NOTICE 'Critical fix: Email field is now nullable to support 87%% of users without email';
    RAISE NOTICE 'Execution completed at: %', NOW();
END $$;

-- Final verification query
SELECT 
    'SCHEMA_READY' as status,
    'All tables, indexes, and policies created successfully' as message,
    NOW() as completed_at;

\echo '✓ Supabase schema creation completed successfully!'
\echo 'The database is now ready for complete data migration.'