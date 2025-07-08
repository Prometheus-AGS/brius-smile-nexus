-- =====================================================
-- Supabase Schema Creation: Audit and State Tracking Tables
-- =====================================================
-- This script creates audit trail and state tracking tables
-- Based on legacy dispatch_state analysis and workflow requirements

-- =====================================================
-- Order State History (Audit Trail)
-- =====================================================

CREATE TABLE order_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_state_id UUID REFERENCES order_states(id),
    to_state_id UUID NOT NULL REFERENCES order_states(id),
    changed_by_id UUID REFERENCES profiles(id),
    reason TEXT,
    duration_minutes INTEGER, -- Time spent in previous state
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order State History indexes
CREATE INDEX idx_order_state_history_order ON order_state_history(order_id);
CREATE INDEX idx_order_state_history_created ON order_state_history(created_at);
CREATE INDEX idx_order_state_history_changed_by ON order_state_history(changed_by_id);
CREATE INDEX idx_order_state_history_from_state ON order_state_history(from_state_id);
CREATE INDEX idx_order_state_history_to_state ON order_state_history(to_state_id);

-- =====================================================
-- Instruction States (Legacy Mapping)
-- =====================================================
-- Direct mapping from dispatch_state for backward compatibility

CREATE TABLE instruction_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_state_id INTEGER UNIQUE, -- Maps to dispatch_state.id
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status_code INTEGER NOT NULL, -- Maps to dispatch_state.status
    is_active BOOLEAN NOT NULL, -- Maps to dispatch_state.on
    changed_by_id UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(), -- Maps to dispatch_state.changed_at
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Legacy mapping fields for complete data preservation
    legacy_instruction_id INTEGER, -- Maps to dispatch_state.instruction_id
    legacy_actor_id INTEGER -- Maps to dispatch_state.actor_id
);

-- Instruction States indexes
CREATE INDEX idx_instruction_states_legacy_id ON instruction_states(legacy_state_id);
CREATE INDEX idx_instruction_states_order ON instruction_states(order_id);
CREATE INDEX idx_instruction_states_legacy_instruction ON instruction_states(legacy_instruction_id);
CREATE INDEX idx_instruction_states_status ON instruction_states(status_code);
CREATE INDEX idx_instruction_states_active ON instruction_states(is_active);
CREATE INDEX idx_instruction_states_changed_at ON instruction_states(changed_at);
CREATE INDEX idx_instruction_states_changed_by ON instruction_states(changed_by_id);

-- =====================================================
-- Activity Log (General Audit Trail)
-- =====================================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'order', 'project', 'profile', etc.
    entity_id UUID NOT NULL,
    action_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'state_changed'
    actor_id UUID REFERENCES profiles(id),
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log indexes
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_log_action ON activity_log(action_type);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- =====================================================
-- File Attachments (For Orders and Messages)
-- =====================================================

CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'order', 'message', 'project'
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    storage_bucket TEXT DEFAULT 'attachments',
    checksum TEXT, -- File integrity verification
    uploaded_by_id UUID REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Attachments indexes
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by_id);
CREATE INDEX idx_file_attachments_created ON file_attachments(created_at);
CREATE INDEX idx_file_attachments_public ON file_attachments(is_public);

-- =====================================================
-- System Configuration
-- =====================================================

CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Whether config is accessible to clients
    updated_by_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Config indexes
CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_public ON system_config(is_public);

-- =====================================================
-- Migration Tracking
-- =====================================================

CREATE TABLE migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_id TEXT NOT NULL,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'profiles', 'orders', 'projects', etc.
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
    metadata JSONB DEFAULT '{}'
);

-- Migration Log indexes
CREATE INDEX idx_migration_log_migration_id ON migration_log(migration_id);
CREATE INDEX idx_migration_log_phase ON migration_log(phase_number);
CREATE INDEX idx_migration_log_entity ON migration_log(entity_type);
CREATE INDEX idx_migration_log_status ON migration_log(status);
CREATE INDEX idx_migration_log_started ON migration_log(started_at);

-- =====================================================
-- Data Quality Checks
-- =====================================================

CREATE TABLE data_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name TEXT NOT NULL,
    check_type TEXT NOT NULL, -- 'count', 'integrity', 'consistency'
    entity_type TEXT NOT NULL,
    expected_value JSONB,
    actual_value JSONB,
    status TEXT NOT NULL, -- 'pass', 'fail', 'warning'
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Data Quality Checks indexes
CREATE INDEX idx_data_quality_checks_name ON data_quality_checks(check_name);
CREATE INDEX idx_data_quality_checks_type ON data_quality_checks(check_type);
CREATE INDEX idx_data_quality_checks_entity ON data_quality_checks(entity_type);
CREATE INDEX idx_data_quality_checks_status ON data_quality_checks(status);
CREATE INDEX idx_data_quality_checks_checked ON data_quality_checks(checked_at);

-- =====================================================
-- Insert Default System Configuration
-- =====================================================

INSERT INTO system_config (config_key, config_value, description, is_public) VALUES
    ('migration.batch_size', '100', 'Default batch size for data migration operations', false),
    ('migration.enable_embeddings', 'false', 'Whether to generate AI embeddings during migration', false),
    ('migration.validate_data', 'true', 'Whether to perform data validation during migration', false),
    ('workflow.auto_transitions', 'false', 'Enable automatic workflow state transitions', false),
    ('notifications.email_enabled', 'true', 'Enable email notifications', true),
    ('files.max_upload_size_mb', '50', 'Maximum file upload size in MB', true),
    ('files.allowed_types', '["pdf", "jpg", "jpeg", "png", "doc", "docx", "stl", "ply"]', 'Allowed file types for uploads', true);

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE order_state_history IS 'Complete audit trail of order state changes with timing and actors';
COMMENT ON TABLE instruction_states IS 'Direct mapping from dispatch_state for legacy compatibility';
COMMENT ON TABLE activity_log IS 'General purpose audit log for all entity changes';
COMMENT ON TABLE file_attachments IS 'File attachment management with Supabase Storage integration';
COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON TABLE migration_log IS 'Migration process tracking and monitoring';
COMMENT ON TABLE data_quality_checks IS 'Data quality validation results';

COMMENT ON COLUMN instruction_states.legacy_state_id IS 'Maps to dispatch_state.id for exact legacy compatibility';
COMMENT ON COLUMN instruction_states.status_code IS 'Maps to dispatch_state.status for workflow state tracking';
COMMENT ON COLUMN instruction_states.is_active IS 'Maps to dispatch_state.on for active state indication';
COMMENT ON COLUMN file_attachments.storage_path IS 'Supabase Storage path for file retrieval';
COMMENT ON COLUMN migration_log.migration_id IS 'Unique identifier for migration batch tracking';